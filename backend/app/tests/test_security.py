from app.security import get_password_hash, verify_password

def test_password_hashing():
    """
    Unit Test: Parola hash'leme ve doğrulama fonksiyonunun
    doğru çalışıp çalışmadığını test eder.
    """
    password = "supersecretpassword123"
    hashed_password = get_password_hash(password)
    
    # 1. Hash'in boş olmadığından emin ol
    assert hashed_password is not None
    
    # 2. Hash'in orijinal parolayla aynı olmadığından emin ol
    assert hashed_password != password
    
    # 3. Doğru parolayla doğrulamanın BAŞARILI olduğundan emin ol
    assert verify_password(password, hashed_password) == True
    
    # 4. Yanlış parolayla doğrulamanın BAŞARISIZ olduğundan emin ol
    assert verify_password("wrongpassword", hashed_password) == False