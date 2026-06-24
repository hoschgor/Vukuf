# check_vakif.py
import json

with open('kuran-mushaf.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

vakif_sayisi = 0
vakif_ornekleri = []

for sure in data:
    for ayet in sure['ayetler']:
        for kelime in ayet.get('kelimeler', []):
            if kelime.get('vakif'):
                vakif_sayisi += 1
                if len(vakif_ornekleri) < 10:
                    vakif_ornekleri.append({
                        'sure': sure['id'],
                        'ayet': ayet['no'],
                        'kelime': kelime['arabic'],
                        'vakif': kelime['vakif']
                    })

print(f"🔍 Toplam vakıf sayısı: {vakif_sayisi}")
print("\n📝 Örnek vakıflar:")
for ornek in vakif_ornekleri:
    print(f"  Sure {ornek['sure']}, Ayet {ornek['ayet']}: {ornek['kelime']} → {ornek['vakif']}")