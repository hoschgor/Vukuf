"""
sayfa_harita_duzelt.py
──────────────────────
Mevcut sayfa-harita.json'u düzeltir.
Her sayfadan sadece İLK ayeti tutar (sayfa başı).

Çalıştır:
  cd ~/Projeler/vukuf/src/data
  python3 sayfa_harita_duzelt.py
"""
import json
from pathlib import Path

base = Path(__file__).parent

# Mevcut haritayı yükle
with open(base / "sayfa-harita.json", encoding="utf-8") as f:
    ham = json.load(f)

print(f"Ham kayıt sayısı: {len(ham)}")

# Her sayfadan sadece ilk kaydı tut
sayfa_ilk = {}
for kayit in ham:
    sayfa = kayit["sayfa"]
    if sayfa not in sayfa_ilk:
        sayfa_ilk[sayfa] = kayit

# Sırala ve kaydet
temiz = sorted(sayfa_ilk.values(), key=lambda x: x["sayfa"])

out = base / "sayfa-harita.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(temiz, f, ensure_ascii=False, indent=2)

print(f"Temiz kayıt sayısı: {len(temiz)}")
print(f"İlk 5: {temiz[:5]}")
print(f"Sayfa 2: {[s for s in temiz if s['sayfa'] == 2]}")
print(f"Sayfa 3: {[s for s in temiz if s['sayfa'] == 3]}")
print("✓ sayfa-harita.json güncellendi")