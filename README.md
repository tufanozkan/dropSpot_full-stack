# DropSpot — Full Stack Değerlendirme Projesi

DropSpot, özel ürünlerin veya etkinliklerin sınırlı stokla yayımlandığı bir “drop” platformudur. Kullanıcılar bekleme listelerine (waitlist) katılır ve “claim window” açıldığında sırayla hak kazanırlar.

Bu repo, bir full stack mühendisinin planlama, mimari, kod kalitesi ve test disiplinlerini ölçmek için hazırlanmış uçtan uca bir değerlendirme projesidir.

## İçindekiler

- Proje Özeti ve Mimari
  - Backend Mimarisi (FastAPI)
  - Frontend Mimarisi (Next.js)
- Veri Modeli ve Endpoint Listesi
  - Veri Modeli (models.py)
  - API Endpoint Listesi
- CRUD Modülü Açıklaması
- Idempotency ve Transaction Yapısı
- Kurulum (Backend & Frontend)
  - Backend Kurulumu
  - Frontend Kurulumu
  - İlk Kullanım
- Sayfalar
- Teknik Tercihler ve Kişisel Katkılar
- Seed Üretim Yöntemi ve Kullanımı
- Bonus: AI Entegrasyonu

---

## Proje Özeti ve Mimari

Modern ve yüksek performanslı bir teknoloji yığını üzerine inşa edilmiştir. Mimari, frontend ve backend’in tamamen ayrık (decoupled) çalışmasına olanak tanır.

### Backend Mimarisi (FastAPI)

- Framework: Python 3 (Async) + FastAPI
- Veritabanı & ORM: SQLite (geliştirme kolaylığı) + SQLAlchemy (ORM)
- Kimlik Doğrulama: JWT Access Token, OAuth2PasswordBearer, passlib (bcrypt)
- Test: Pytest (1 Unit + 2 Entegrasyon/Edge-case)

Neden FastAPI?

- Asenkron altyapı, otomatik Swagger/OpenAPI dokümantasyonu, Pydantic ile güçlü veri doğrulama ve yüksek hız.

### Frontend Mimarisi (Next.js)

- Framework: Next.js 14+ (App Router) + React (TypeScript)
- UI: Chakra UI (erişilebilir, hızlı, modüler)
- Global State: Zustand + persist middleware (login/logout ve token yönetimi)
- API İstemcisi: Axios (token’ı otomatik ekleyen interceptor)
- Test: Cypress (Login → Drop Oluşturma → Claim akışını kapsayan E2E smoke testi)

Neden Next.js?

- SSR, App Router ile dosya tabanlı rota, modern React özellikleri ve güçlü DX.

---

## Veri Modeli ve Endpoint Listesi

### Veri Modeli (models.py)

Sistem 4 ana SQL tablosu üzerine kuruludur:

- User: E-posta, parola hash, admin durumu
- Drop: Başlık, stok, claim penceresi
- Waitlist: User ↔ Drop (M:N). (user_id, drop_id) üzerinde UniqueConstraint
- Claim: User ↔ Drop (M:N). (user_id, drop_id) üzerinde UniqueConstraint

Not: User ve Drop ilişkileri cascade="all, delete-orphan" ile yapılandırılmıştır. Bir Drop silindiğinde ona bağlı Waitlist ve Claim kayıtları da otomatik silinir (veri bütünlüğü).

### API Endpoint Listesi

Tüm endpoint’ler: http://127.0.0.1:8000

Auth (/auth)

- POST `/signup`: Yeni kullanıcı kaydı
- POST `/login`: JWT Access Token üretir (body: `application/x-www-form-urlencoded`)

Admin (/admin — korumalı)

- Tüm istekler `get_current_admin_user` ile doğrulanır; yalnızca `user.is_admin == True` kabul edilir.
- GET `/admin/drops`: Tüm drop’ları listeler
- POST `/admin/drops`: Yeni drop oluşturur
- PUT `/admin/drops/{id}`: Drop günceller
- DELETE `/admin/drops/{id}`: Drop siler

Drops (/drops — genel/korumalı)

- GET `/drops/`: Herkese açık, aktif tüm drop’lar
- POST `/drops/{id}/join` (korumalı): Bekleme listesine ekler (idempotent)
- POST `/drops/{id}/leave` (korumalı): Bekleme listesinden çıkarır (idempotent)
- POST `/drops/{id}/claim` (korumalı): Hak talebi oluşturur (atomik & idempotent)

---

## CRUD Modülü Açıklaması

- Kimlik Doğrulama: Tüm `/admin` endpoint’leri `Authorization: Bearer <token>` bekler. Token çözümlenir, kullanıcı DB’den bulunur.
- Yetkilendirme: `get_current_admin_user`, token’daki kullanıcının `is_admin` değerini doğrular. Aksi durumda 403 Forbidden.
- Arayüz: Frontend’de `/admin` rotasında tam işlevli bir CRUD ekranı bulunur. Yeni drop oluşturma ve düzenleme tek bir akıllı modal form ile; silme ise onaylı (AlertDialog) ilerler.

---

## Idempotency ve Transaction Yapısı

Idempotency (Tekrarlanabilirlik)

- POST `/drops/{id}/join`: Kayıt öncesi `Waitlist`’te arama yapılır. Varsa “ALREADY_IN_WAITLIST” döner ve kullanıcı bilgilendirilir.
- POST `/drops/{id}/leave`: Benzer şekilde yoksa “NOT_IN_WAITLIST” ile idempotent davranır.
- POST `/drops/{id}/claim`: DB seviyesinde `UniqueConstraint(user_id, drop_id)` ile garanti edilir. İkinci denemede `IntegrityError` → 409 Conflict (ALREADY_CLAIMED).

Transaction ve Race Condition Kontrolü

- Atomiklik: Claim akışı iki adımlıdır: (1) stok–1, (2) claim insert. Insert başarısız olursa `db.rollback()` ile stok güncellemesi de geri alınır (ya hep ya hiç).
- Eşzamanlılık (SQLite): SQLite yazma işlemlerini serileştirir (dosya kilidi). İki eşzamanlı claim, stoğun −1’e düşmesine engel olur.
- Eşzamanlılık (PostgreSQL): `with_for_update()` (pessimistic locking) ile satır kilidi alınarak doğru stok yönetimi sağlanır.

---

## Kurulum (Backend & Frontend)

Projeyi çalıştırmak için backend ve frontend sunucularını aynı anda çalıştırın.

### Backend Kurulumu

1. Sanal ortamı oluşturun ve etkinleştirin:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
```

2. Bağımlılıkları kurun:

- requirements.txt varsa:

```bash
pip install -r requirements.txt
```

- requirements.txt yoksa (hızlı başlangıç):

```bash
pip install fastapi "uvicorn[standard]" sqlalchemy pydantic "python-jose[cryptography]" passlib[bcrypt] bcrypt python-dotenv pytest httpx
pip freeze > requirements.txt
```

3. `.env` dosyasını oluşturun (`backend` klasörüne):

```env
SECRET_KEY=c0k-g1zl1-b1r-s1fr3-1l3-d3g1st1r
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

4. Geliştirme sunucusunu başlatın:

```bash
uvicorn app.main:app --reload
```

Sunucu: http://127.0.0.1:8000

### Frontend Kurulumu

1. Bağımlılıkları kurun ve dev sunucuyu başlatın:

```bash
cd frontend
npm install
npm run dev
```

Sunucu: http://localhost:3000

### İlk Kullanım (Zorunlu)

Veritabanı (dropspot.db) başlangıçta boştur. Test için:

1. http://localhost:3000/signup adresine gidin.
2. `admin@test.com` (şifre: `admin123`) — admin yetkili kullanıcıyı oluşturun.
3. `user1@test.com` (şifre: `user123`) — normal test kullanıcısı oluşturun.
4. `admin@test.com` ile giriş yapın, `/admin` sayfasından yeni drop’lar oluşturun.

Opsiyonel testler:

- Backend (pytest):

```bash
cd backend
pytest -q
```

- Frontend (Cypress):

```bash
cd frontend
npm run cypress:open
```

---

## Sayfalar

1. Admin Paneli (CRUD Arayüzü)

- Mevcut tüm drop’ları listeler. “+ Yeni Drop Ekle” ile oluşturma; “Düzenle” ile güncelleme; “Sil” işlemi onay modali ile korunur.

2. Drop Listesi (Kullanıcı Arayüzü)

- `/drops` sayfası, tüm drop’ları kartlar halinde listeler. Kartlarda durum etiketi (AÇIK, KAPANDI, YAKINDA) görünür.

3. Drop Detay ve Claim

- Claim penceresi AÇIK ise “HAK TALEP ET”; YAKINDA ise “Bekleme Listesine Katıl / Listeden Ayrıl” eylemleri görünür.

---

## Teknik Tercihler ve Kişisel Katkılar

Teknik Tercihler

- Chakra UI: Box/Stack/Flex gibi stil prop’larıyla hızlı prototipleme ve erişilebilir bileşenler.
- Zustand: Context’in prop-drilling sorununu çözmesi, Redux kadar “boilerplate” gerektirmemesi nedeniyle tercih edildi. `persist` ile localStorage entegrasyonu kolay.
- Cypress (E2E): Projenin ana riski frontend–backend entegrasyonu olduğundan, kritik akışı tek seferde doğrulayan E2E testi benimsendi (Login → Create Drop → Claim).

Kişisel Katkılar (Kapsam Dışı İyileştirmeler)

- Global Navbar: Zustand state’ine bağlı dinamik (Login/Logout) davranış.
- Frontend Auth Guard: `/admin` rotası `useAuthStore` ile korunur; admin değilse `/`’a yönlendirilir.
- Hydration Problemi Çözümü: Navbar’da `isClient` ile client-only render garantisi.
- Gelişmiş Admin Formu: Create/Update için tek modal bileşeni (`editingDrop` state yönetimi).
- Zaman Dilimi Düzeltmeleri: Backend’de `replace(tzinfo=...)`, frontend’de `toLocalISOString` ve min tarih kontrolleri.

---

## Seed Üretim Yöntemi ve Kullanımı

Bu projede waitlist sıralaması için benzersiz bir seed (tohum) değeri hesaplanmıştır (SHA256):

Girdiler

1. GitHub Remote URL: `https://github.com/tufanozkan/dropSpot_full-stack.git`
2. İlk Commit (Epoch): `1762348733`
3. Proje Başlangıç Zamanı: `202511051200`

Hesaplanan Seed: `a1369a5275d8`

Katsayılar (türetilmiş):

- A = 8
- B = 18
- C = 4

Kullanım (Hipotez)

- Bu katsayılar, waitlist öncelik puanını belirleyen bir formülde kullanılabilir; klasik FIFO’ya göre daha adil veya rasgele bir dağılım elde edilebilir.

---

## Bonus: AI Entegrasyonu

Zaman kısıtları nedeniyle uygulanmadı. Bir sonraki adım olarak `/admin` modal’ına “Açıklama Üret” butonu eklenmesi planlanıyor. Bu buton, OpenAI (gpt-3.5-turbo) ile başlıktan pazarlama odaklı bir açıklama üretecek.
