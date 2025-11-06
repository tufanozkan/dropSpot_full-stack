# calculate_seed.py
import hashlib

# --- BURAYI KENDİ DEĞERLERİNLE DOLDUR ---
remote = "https://github.com/tufanozkan/dropSpot_full-stack.git" # Adım 1.1'deki çıktın
epoch = "1762348733" # Adım 1.2'deki çıktın
start = "202511051200" # Adım 1.3'teki tarihin
# ----------------------------------------

raw = f"{remote}|{epoch}|{start}"
seed = hashlib.sha256(raw.encode()).hexdigest()[:12]

# Katsayıları da hesapla
A = 7 + (int(seed[0:2], 16) % 5)
B = 13 + (int(seed[2:4], 16) % 7)
C = 3 + (int(seed[4:6], 16) % 3)

print("--- README.md İÇİN KOPYALA ---")
print(f"PROJE SEED'İ: {seed}")
print(f"KATSAYILAR: A={A}, B={B}, C={C}")
print("---------------------------------")
print(f"Remote URL: {remote}")
print(f"İlk Commit Epoch: {epoch}")
print(f"Başlangıç Zamanı: {start}")