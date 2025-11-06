DropSpot - Full Stack Değerlendirme Projesi
DropSpot, özel ürünlerin veya etkinliklerin sınırlı stokla yayımlandığı bir "drop" platformudur. Kullanıcılar bu platformda "bekleme listelerine" katılabilir ve "hak talebi penceresi" (claim window) açıldığında sırayla hak kazanırlar.

Bu proje, bir full stack mühendisinin planlama, mimari, kod kalitesi ve test disiplinlerini ölçmek için tasarlanmış uçtan uca bir değerlendirme görevidir.

1. Proje Özeti ve Mimari Açıklama
   Proje, modern ve yüksek performanslı bir teknoloji yığını üzerine kurulmuştur. Mimari, frontend ve backend'in tamamen ayrık (decoupled) çalışmasına olanak tanır.

Backend Mimarisi (FastAPI)

Framework: Python 3 (Async) tabanlı FastAPI.

Veritabanı & ORM: SQLite (geliştirme kolaylığı için) ve SQLAlchemy (ORM).

Kimlik Doğrulama: JWT (Access Token) tabanlı, OAuth2PasswordBearer ve passlib (bcrypt) ile.

Test: Pytest (1 Unit ve 2 Entegrasyon/Edge-case testi).

Neden FastAPI? Asenkron yapısı, otomatik Swagger/OpenAPI dokümantasyonu ve Pydantic ile gelen veri doğrulama özellikleri sayesinde hızlı ve hatasız bir API geliştirme süreci sunar.

Frontend Mimarisi (Next.js)

Framework: Next.js 14+ (App Router) ve React (TypeScript ile).

UI Kütüphanesi: Chakra UI (Hızlı, erişilebilir ve modüler bileşenler için).

Global State: Zustand (persist middleware'i ile) (Giriş/Çıkış durumunu ve token'ı yönetmek için).

API İstemcisi: Axios (Token'ı otomatik ekleyen bir interceptor ile yapılandırıldı).

Test: Cypress (Login → Drop Oluşturma → Claim Akışını kapsayan E2E Smoke Testi).

Neden Next.js? Sunucu Taraflı Render (SSR), dosya tabanlı rota yönetimi (App Router) ve modern React özellikleri için en iyi seçenektir.

2. Veri Modeli ve Endpoint Listesi
   Veri Modeli (models.py)

Proje, 4 ana SQL tablosu üzerine kuruludur:

User: Kullanıcıları (e-posta, parola hash, admin durumu) tutar.

Drop: Drop etkinliklerini (başlık, stok, claim penceresi) tutar.

Waitlist: Hangi User'ın hangi Drop'a katıldığını (Many-to-Many ilişki) tutar. (user_id, drop_id) üzerinde UniqueConstraint bulunur.

Claim: Hangi User'ın hangi Drop için hak talebinde bulunduğunu (Many-to-Many ilişki) tutar. (user_id, drop_id) üzerinde UniqueConstraint bulunur.

User ve Drop tabloları, cascade="all, delete-orphan" ile yapılandırılmıştır; bu sayede bir Drop silindiğinde, ona bağlı tüm Waitlist ve Claim kayıtları da otomatik olarak silinir (Veri Bütünlüğü).

API Endpoint Listesi

Tüm endpoint'ler http://127.0.0.1:8000 adresinden sunulur.

Auth (/auth)

POST /signup: Yeni kullanıcı kaydı oluşturur.

POST /login: JWT (Access Token) oluşturur (application/x-www-form-urlencoded formatında veri bekler).

Admin (/admin - Korumalı)

Bu endpoint'ler, JWT token'ı get_current_admin_user dependency'si ile doğrular ve sadece user.is_admin == True ise izin verir.

GET /drops: Tüm drop'ları listeler.

POST /drops: Yeni bir drop oluşturur.

PUT /drops/{id}: Belirli bir drop'u günceller.

DELETE /drops/{id}: Belirli bir drop'u siler.

Drops (/drops - Genel/Korumalı)

GET /: Herkese açık, aktif tüm drop'ları listeler.

POST /{id}/join (Korumalı): Kullanıcıyı bekleme listesine ekler (Idempotent).

POST /{id}/leave (Korumalı): Kullanıcıyı bekleme listesinden çıkarır (Idempotent).

POST /{id}/claim (Korumalı): Kullanıcı için hak talebi oluşturur (Atomik & Idempotent).

3. CRUD Modülü Açıklaması
   Proje, Admin rolüne sahip kullanıcılar için tam bir CRUD (Create, Read, Update, Delete) modülü sunar.

Kimlik Doğrulama: Tüm /admin endpoint'leri, Authorization: Bearer <token> başlığını bekler. Token çözümlenir ve kullanıcı veritabanından bulunur.

Yetkilendirme (Bonus): get_current_admin_user dependency'si, token'dan gelen kullanıcının is_admin flag'inin True olup olmadığını kontrol eder. Eğer değilse, 403 Forbidden hatası döndürür.

Arayüz (UI): Frontend'deki /admin rotası, bu CRUD endpoint'lerini kullanan tam fonksiyonel bir arayüz sağlar. Yeni drop oluşturma ve mevcut drop'ları düzenleme işlemleri için tek bir akıllı Modal (açılır pencere) formu kullanılır. Silme işlemi, yanlışlıkla tıklamaları önlemek için ek bir AlertDialog (onay kutusu) ile korunur.

4. Idempotency Yaklaşımı ve Transaction Yapısı
   Değerlendirmenin "Veri Bütünlüğü" (25 Puan) kriteri için bu iki konuya özel önem verilmiştir.

Idempotency (Tekrarlanabilirlik)

Kullanıcının bir butona art arda basmasının mükerrer kayıt oluşturması engellenmiştir.

POST /drops/{id}/join: Backend (crud.py), bir kullanıcıyı listeye eklemeden önce existing_entry = db.query(Waitlist)... sorgusuyla onu arar. Eğer kayıt varsa, yeni kayıt oluşturmak yerine "ALREADY_IN_WAITLIST" string'ini döndürür. Router (routers/drops.py), bu string'i yakalar ve frontend'e "Zaten bekleme listesindesiniz." JSON mesajını gönderir.

POST /drops/{id}/leave: Aynı mantık NOT_IN_WAITLIST kontrolü ile uygulanır.

POST /drops/{id}/claim: Idempotency, veritabanı seviyesinde UniqueConstraint(user_id, drop_id) ile sağlanır. İkinci bir claim denemesi IntegrityError fırlatır, try-except bloğu bunu yakalar ve 409 Conflict (ALREADY_CLAIMED) hatası döndürür.

Transaction ve "Race Condition" Kontrolü

Projenin en kritik işlemi, iki kullanıcının stokta kalan son 1 ürünü aynı anda (race condition) almaya çalışmasıdır.

Atomiklik: POST /drops/{id}/claim işlemi, crud.py içinde bir try-except bloğu ile yönetilir. Bu işlem iki adımlıdır: 1) Stoğu 1 azalt (UPDATE drops...), 2) Hak talebini kaydet (INSERT INTO claims...). Eğer INSERT işlemi (örn: UniqueConstraint hatası) başarısız olursa, db.rollback() çağrılır ve UPDATE (stok düşürme) işlemi de geri alınır. Bu, verinin atomik (ya hep ya hiç) olmasını sağlar.

Eşzamanlılık (SQLite): Bu projede kullanılan SQLite, varsayılan olarak yazma işlemlerini serileştirir (tüm veritabanı dosyasını kilitler). Bu, iki claim isteği milisaniyeler içinde gelse bile, birinin diğerini beklemesini ve stoğun -1'e düşmesini doğal olarak engeller.

Eşzamanlılık (PostgreSQL Yaklaşımı): Eğer bu proje PostgreSQL üzerinde çalışsaydı, crud.py içindeki sorgu db.query(models.Drop)...with_for_update().first() şeklinde (Pessimistic Locking) yazılacaktı. Bu, SELECT işlemi sırasında o Drop satırını UPDATE için kilitleyerek, başka hiçbir transaction'ın o satırı okuyup stoğu hatalı hesaplamamasını garantilerdi.

5. Kurulum Adımları (Backend ve Frontend)
   Projeyi çalıştırmak için backend ve frontend sunucularının aynı anda çalışması gerekir.

Backend Kurulumu

Proje klonlandıktan sonra, backend dizinine gidin ve sanal ortamı kurun:

Bash
cd backend
python -m venv venv
source venv/bin/activate # (Windows için: .\venv\Scripts\activate)
requirements.txt dosyasını oluşturun (eğer yoksa) ve kütüphaneleri kurun:

Bash
pip freeze > requirements.txt
pip install -r requirements.txt
.env dosyasını oluşturun. backend klasörü içine .env adında bir dosya açın ve içine şunu yapıştırın:

Kod snippet'i
SECRET_KEY=c0k-g1zl1-b1r-s1fr3-1l3-d3g1st1r
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
Sunucuyu başlatın (otomatik yeniden yükleme ile):

Bash
uvicorn app.main:app --reload
Sunucu http://127.0.0.1:8000 adresinde çalışacaktır.

Frontend Kurulumu

Ayrı bir terminalde frontend dizinine gidin:

Bash
cd frontend
Bağımlılıkları kurun:

Bash
npm install
Geliştirme sunucusunu başlatın:

Bash
npm run dev
Sunucu http://localhost:3000 adresinde çalışacaktır.

İlk Kullanım (Zorunlu)

Veritabanı (dropspot.db) boştur. Sistemi test etmek için:

http://localhost:3000/signup adresine gidin.

admin@test.com (şifre: admin123) kullanıcısını oluşturun (Bu, Admin yetkisine sahiptir).

user1@test.com (şifre: user123) adında normal bir test kullanıcısı oluşturun.

admin@test.com ile giriş yaparak /admin sayfasından yeni drop'lar oluşturabilirsiniz.

6. Pages

1. Admin Paneli (CRUD Arayüzü)

Açıklama: Admin paneli, mevcut tüm drop'ları listeler. "+ Yeni Drop Ekle" butonu, yeni drop oluşturmak için (veya "Düzenle" butonu, güncellemek için) bir modal form açar. "Sil" butonu, ek bir onay kutusu ile işlemi doğrular.

2. Drop Listesi (Kullanıcı Arayüzü)

Açıklama: /drops sayfası, tüm drop'ları kartlar halinde listeler. Her kartın sağ üst köşesinde, drop'un durumunu (AÇIK, KAPANDI, YAKINDA) gösteren bir etiket (Tag) bulunur.

3. Drop Detay ve Claim Sayfası

Açıklama: Bir drop'a tıklandığında açılan detay sayfası. Claim penceresi "AÇIK" ise "HAK TALEP ET" butonu, "YAKINDA" ise "Bekleme Listesine Katıl" / "Listeden Ayrıl" butonları görünür.

7. Teknik Tercihler ve Kişisel Katkılar
   Teknik Tercihler:

Chakra UI: Prototipleme hızı için Material UI veya Chakra UI arasında kalındı. Chakra'nın Box, Stack, Flex gibi stil-prop'ları (style-props) sayesinde styled-components ihtiyacını ortadan kaldırması ve hızı nedeniyle tercih edildi.

Zustand: Redux veya Context API yerine Zustand tercih edildi. Sebebi, Context gibi "prop-drilling" sorununu çözmesi ancak Redux gibi karmaşık "boilerplate" (hazırlık kodu) gerektirmemesidir. persist middleware'i ile localStorage entegrasyonu çok kolay olmuştur.

Cypress (E2E): React Testing Library (RTL) yerine E2E testi tercih edildi. Çünkü projenin asıl riski frontend ve backend'in birlikte çalışmasıdır. Yazılan E2E testi (Login -> Create Drop -> Login as User -> Claim Drop), tüm kritik akışı tek seferde doğrular.

Kişisel Katkılar (Kapsam Dışı İyileştirmeler):

Global Navbar: Tüm sayfaları saran, Zustand state'ine bağlı (user bilgisi) olarak dinamik (Login/Logout) değişen bir Navbar.tsx bileşeni eklendi.

Frontend Auth Guard: /admin rotası, useEffect içinde useAuthStore'u kontrol eden bir mekanizma ile korundu. Admin olmayan kullanıcılar bu adresi manuel yazsa bile ana sayfaya (/) yönlendirilir.

Hydration Hatası Çözümü: Zustand ve Next.js SSR'ın localStorage'da çakışmasını önlemek için Navbar'da [isClient, setIsClient] state'i kullanılarak "client-side-only" render garantilendi.

Gelişmiş Admin Formu: Admin panelindeki modal, hem "Create" hem de "Update" işlemleri için tek bir bileşen olarak (React state'i ile editingDrop) yönetildi.

Zaman Dilimi Düzeltmeleri: Hem backend'de (crud.py içinde replace(tzinfo=...)) hem de frontend'de (admin/page.tsx içinde toLocalISOString ve min tarih kontrolleri) zaman dilimi (timezone) kaynaklı hataları proaktif olarak çözen kodlar eklendi.

8. Seed Üretim Yöntemi ve Kullanımı
   Proje gereksinimleri, sıralama mekanizması için benzersiz bir seed (tohum) değeri üretilmesini istemiştir.

Proje Seed Değeri

Bu projenin benzersiz seed değeri, aşağıdaki komutlar ve girdiler kullanılarak SHA256 ile hesaplanmıştır:

1. GitHub Remote URL: "https://github.com/tufanozkan/dropSpot_full-stack.git"

2. İlk Commit (Epoch): "1762348733"

3. Proje Başlangıç Zamanı: "202511051200"

Hesaplanan Proje Seed'i: a1369a5275d8

Seed Kullanım Senaryosu

Bu seed değeri, Waitlist (Bekleme Listesi) sıralaması için gereken öncelik puanı katsayılarını türetmek için kullanılmıştır.

Türetilen Katsayılar:

A = 8

B = 18

C = 4

Kullanım Formülü (Hipotez): Bu katsayılar, bir kullanıcının Waitlist'teki önceliğini belirleyen bir formülde kullanılabilir. Bu, FIFO (İlk Giren İlk Çıkar) modeline göre daha adil veya rastgele bir dağılım sağlayabilir.

9. Bonus: AI Entegrasyonu
   Zaman kısıtlamaları nedeniyle bu bonus adım (Admin panelinde AI ile açıklama üretme) uygulanmamıştır.

Bir sonraki adım olarak, Admin Panel'deki "Yeni Drop Ekle" modal'ına bir "Açıklama Üret" butonu eklenmesi planlanmaktadır. Bu buton, OpenAI (gpt-3.5-turbo) API'sine drop'un title'ını göndererek, description alanı için otomatik olarak pazarlama odaklı bir metin üretecektir.
