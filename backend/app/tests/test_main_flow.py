from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

# Not: Test fonksiyonları 'client' ve 'db_session' parametrelerini alır.
# Bunlar conftest.py'da tanımladığımız 'fixture'lardır ve Pytest tarafından
# otomatik olarak sağlanır.

# --- Test Yardımcıları ---

def create_admin_and_login(client: TestClient):
    """Yardımcı fonksiyon: Admin oluşturur, login yapar ve token döner."""
    client.post("/auth/signup", json={"email": "admin@test.com", "password": "123"})
    login_res = client.post("/auth/login", data={"username": "admin@test.com", "password": "123"})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def create_user_and_login(client: TestClient, email: str):
    """Yardımcı fonksiyon: Kullanıcı oluşturur, login yapar ve token döner."""
    client.post("/auth/signup", json={"email": email, "password": "123"})
    login_res = client.post("/auth/login", data={"username": email, "password": "123"})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def create_open_drop(client: TestClient, admin_headers: dict, stock: int):
    """Yardımcı fonksiyon: Penceresi AÇIK, stoku 'stock' olan bir drop oluşturur."""
    start = datetime.now(timezone.utc) - timedelta(hours=1)
    end = datetime.now(timezone.utc) + timedelta(hours=1)
    
    drop_data = {
        "title": f"Test Drop Stok {stock}",
        "description": "...",
        "claim_window_start": start.isoformat(),
        "claim_window_end": end.isoformat(),
        "stock": stock
    }
    response = client.post("/admin/drops", json=drop_data, headers=admin_headers)
    assert response.status_code == 201
    return response.json()


# --- Entegrasyon Testleri ---

def test_full_claim_flow_and_edge_cases(client: TestClient, db_session: Session):
    """
    Integration Test: Tüm claim akışını ve planlanan tüm edge case'leri test eder.
    Bu, projenin istediği 'integration testi' ve 'edge-case' gereksinimini karşılar.
    """
    
    # 1. Hazırlık: Admin ve 3 kullanıcı oluştur
    admin_headers = create_admin_and_login(client)
    user1_headers = create_user_and_login(client, "user1@test.com")
    user2_headers = create_user_and_login(client, "user2@test.com")
    user3_headers = create_user_and_login(client, "user3@test.com")
    
    # 2. Hazırlık: Stoku 2 olan bir drop oluştur
    drop = create_open_drop(client, admin_headers, stock=2)
    drop_id = drop["id"]
    
    
    # 3. EDGE CASE: '2 kez join' (Idempotency)
    # Plan: 2 kez join → aynı sonuç
    join_res1 = client.post(f"/drops/{drop_id}/join", headers=user1_headers)
    join_res2 = client.post(f"/drops/{drop_id}/join", headers=user1_headers)
    assert join_res1.status_code == 200
    assert join_res2.status_code == 200 # Hata vermemeli
    assert join_res1.json()["detail"] == "Başarıyla bekleme listesine eklendiniz."
    
    
    # 4. AKIŞ: User 1 claim (Stok 2 -> 1)
    claim1_res = client.post(f"/drops/{drop_id}/claim", headers=user1_headers)
    assert claim1_res.status_code == 200
    assert "code" in claim1_res.json()
    
    
    # 5. EDGE CASE: 'aynı kullanıcı 2 kez claim' (Idempotency)
    # Plan: aynı kullanıcı 2 kez claim → 409
    claim1_again_res = client.post(f"/drops/{drop_id}/claim", headers=user1_headers)
    assert claim1_again_res.status_code == 409
    assert claim1_again_res.json()["detail"] == "Bu drop için zaten hak talebinde bulundunuz"

    
    # 6. AKIŞ: User 2 claim (Stok 1 -> 0)
    claim2_res = client.post(f"/drops/{drop_id}/claim", headers=user2_headers)
    assert claim2_res.status_code == 200
    assert "code" in claim2_res.json()
    
    
    # 7. EDGE CASE: 'stok bitince'
    # Plan: stok bitince kalanlara 409
    claim3_res = client.post(f"/drops/{drop_id}/claim", headers=user3_headers)
    assert claim3_res.status_code == 409
    assert claim3_res.json()["detail"] == "Stok tükendi"


def test_claim_edge_case_window_closed(client: TestClient, db_session: Session):
    """
    EDGE CASE: 'claim window dışında istek'
    Plan: claim window dışında istek → 403
    """
    admin_headers = create_admin_and_login(client)
    user_headers = create_user_and_login(client, "user_closed@test.com")
    
    # Penceresi GEÇMİŞTE olan bir drop oluştur
    start = datetime.now(timezone.utc) - timedelta(days=2)
    end = datetime.now(timezone.utc) - timedelta(days=1)
    
    drop_data = {
        "title": "Kapalı Drop", "description": "...",
        "claim_window_start": start.isoformat(),
        "claim_window_end": end.isoformat(),
        "stock": 10
    }
    drop_res = client.post("/admin/drops", json=drop_data, headers=admin_headers)
    drop_id = drop_res.json()["id"]

    # Claim yapmayı dene
    response = client.post(f"/drops/{drop_id}/claim", headers=user_headers)
    
    # 403 (Forbidden) almayı bekle
    assert response.status_code == 403
    assert response.json()["detail"] == "Hak talebi penceresi kapalı"