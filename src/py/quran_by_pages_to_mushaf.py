#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
quran_by_pages_to_mushaf.py
───────────────────────────
Konum: /home/hosgoer/Projeler/vukuf/src/data/
"""

import json
import os
import sys
from pathlib import Path

# ── Sure isimleri ve ID'leri ──
SURE_ISIMLERI = {
    "الفاتحة": 1, "البقرة": 2, "آل عمران": 3, "النساء": 4,
    "المائدة": 5, "الأنعام": 6, "الانعام": 6, "الأعراف": 7,
    "الاعراف": 7, "الأنفال": 8, "الانفال": 8, "التوبة": 9,
    "التوبه": 9, "يونس": 10, "هود": 11, "يوسف": 12,
    "الرعد": 13, "ابراهيم": 14, "إبراهيم": 14, "الحجر": 15,
    "النحل": 16, "الإسراء": 17, "الاسراء": 17, "الكهف": 18,
    "مريم": 19, "طه": 20, "الأنبياء": 21, "الانبياء": 21,
    "الحج": 22, "المؤمنون": 23, "المومنون": 23, "النور": 24,
    "الفرقان": 25, "الشعراء": 26, "النمل": 27, "القصص": 28,
    "العنكبوت": 29, "الروم": 30, "لقمان": 31, "السجدة": 32,
    "السجده": 32, "الأحزاب": 33, "الاحزاب": 33, "سبإ": 34,
    "سبا": 34, "فاطر": 35, "يس": 36, "الصافات": 37,
    "ص": 38, "الزمر": 39, "غافر": 40, "فصلت": 41,
    "الشورى": 42, "الزخرف": 43, "الدخان": 44, "الجاثية": 45,
    "الأحقاف": 46, "الاحقاف": 46, "محمد": 47, "الفتح": 48,
    "الحجرات": 49, "ق": 50, "الذاريات": 51, "الطور": 52,
    "النجم": 53, "القمر": 54, "الرحمن": 55, "الواقعة": 56,
    "الحديد": 57, "المجادلة": 58, "الحشر": 59, "الممتحنة": 60,
    "الصف": 61, "الجمعة": 62, "المنافقون": 63, "التغابن": 64,
    "الطلاق": 65, "التحريم": 66, "الملك": 67, "القلم": 68,
    "الحاقة": 69, "المعارج": 70, "نوح": 71, "الجن": 72,
    "المزمل": 73, "المدثر": 74, "القيامة": 75, "الانسان": 76,
    "الإنسان": 76, "المرسلات": 77, "النبإ": 78, "النباء": 78,
    "النازعات": 79, "عبس": 80, "التكوير": 81, "الإنفطار": 82,
    "الانفطار": 82, "المطففين": 83, "الإنشقاق": 84, "الانشقاق": 84,
    "البروج": 85, "الطارق": 86, "الأعلى": 87, "الاعلى": 87,
    "الغاشية": 88, "الفجر": 89, "البلد": 90, "الشمس": 91,
    "الليل": 92, "الضحى": 93, "الشرح": 94, "التين": 95,
    "العلق": 96, "القدر": 97, "البينة": 98, "الزلزلة": 99,
    "العاديات": 100, "القارعة": 101, "التكاثر": 102, "العصر": 103,
    "الهمزة": 104, "الفيل": 105, "قريش": 106, "الماعون": 107,
    "الكوثر": 108, "الكافرون": 109, "النصر": 110, "المسد": 111,
    "الإخلاص": 112, "الاخلاص": 112, "الفلق": 113, "الناس": 114
}

SURE_TURKCE = {
    1: "Fatiha", 2: "Bakara", 3: "Al-i İmran", 4: "Nisa",
    5: "Maide", 6: "En'am", 7: "A'raf", 8: "Enfal",
    9: "Tevbe", 10: "Yunus", 11: "Hud", 12: "Yusuf",
    13: "Ra'd", 14: "İbrahim", 15: "Hicr", 16: "Nahl",
    17: "İsra", 18: "Kehf", 19: "Meryem", 20: "Taha",
    21: "Enbiya", 22: "Hac", 23: "Mü'minun", 24: "Nur",
    25: "Furkan", 26: "Şu'ara", 27: "Neml", 28: "Kasas",
    29: "Ankebut", 30: "Rum", 31: "Lokman", 32: "Secde",
    33: "Ahzab", 34: "Sebe", 35: "Fatır", 36: "Yasin",
    37: "Saffat", 38: "Sad", 39: "Zümer", 40: "Mü'min",
    41: "Fussilet", 42: "Şura", 43: "Zuhruf", 44: "Duhan",
    45: "Casiye", 46: "Ahkaf", 47: "Muhammed", 48: "Fetih",
    49: "Hucurat", 50: "Kaf", 51: "Zariyat", 52: "Tur",
    53: "Necm", 54: "Kamer", 55: "Rahman", 56: "Vakıa",
    57: "Hadid", 58: "Mücadele", 59: "Haşr", 60: "Mümtehine",
    61: "Saff", 62: "Cuma", 63: "Münafikun", 64: "Teğabun",
    65: "Talâk", 66: "Tahrim", 67: "Mülk", 68: "Kalem",
    69: "Hakka", 70: "Meâric", 71: "Nuh", 72: "Cin",
    73: "Müzzemmil", 74: "Müddessir", 75: "Kıyâme", 76: "İnsan",
    77: "Mürselat", 78: "Nebe", 79: "Nâziât", 80: "Abese",
    81: "Tekvir", 82: "İnfitar", 83: "Mutaffifin", 84: "İnşikak",
    85: "Buruc", 86: "Tarık", 87: "A'lâ", 88: "Ğâşiye",
    89: "Fecr", 90: "Beled", 91: "Şems", 92: "Leyl",
    93: "Duhâ", 94: "İnşirah", 95: "Tin", 96: "Alak",
    97: "Kadr", 98: "Beyyine", 99: "Zilzâl", 100: "Âdiyât",
    101: "Kâria", 102: "Tekâsür", 103: "Asr", 104: "Hümeze",
    105: "Fil", 106: "Kureyş", 107: "Mâûn", 108: "Kevser",
    109: "Kâfirûn", 110: "Nasr", 111: "Mesed", 112: "İhlâs",
    113: "Felak", 114: "Nas"
}

# ── BESMELE İÇEREN SURELER (Tevbe hariç) ──
BESMELE_VAR = {sure_id for sure_id in range(1, 115) if sure_id != 9}

def sure_adi_bul(sure_adi):
    if sure_adi in SURE_ISIMLERI:
        return SURE_ISIMLERI[sure_adi]
    normalized = sure_adi.replace('إ', 'ا').replace('أ', 'ا').replace('آ', 'ا')
    if normalized in SURE_ISIMLERI:
        return SURE_ISIMLERI[normalized]
    return None

def kelimelere_ayir(sure_id, ayet_no, metin):
    """Arapça metni kelimelere ayırır ve ID oluşturur"""
    kelimeler = [k for k in metin.split() if k.strip()]
    result = []
    for idx, kelime in enumerate(kelimeler, 1):
        result.append({
            "id": f"{sure_id}:{ayet_no}:{idx}",
            "arabic": kelime,
            "vakif": None,
            "secde": None
        })
    return result

def ayet_ozel_mi(sure_id, ayet_no):
    """Bazı surelerde ayet numaraları özel durum içerir"""
    # Bakara Suresi: 1. ayet Besmele değil, Elif Lam Mim
    if sure_id == 2 and ayet_no == 1:
        return True
    # Fatiha: 1. ayet Besmele
    if sure_id == 1 and ayet_no == 1:
        return True
    return False

def convert_page_to_mushaf(girdi_dosyasi, cikti_dosyasi="kuran-mushaf.json"):
    print("=" * 60)
    print("📖 KURAN VERİ DÖNÜŞTÜRÜCÜ")
    print("=" * 60)
    
    if not os.path.exists(girdi_dosyasi):
        print(f"❌ HATA: {girdi_dosyasi} dosyası bulunamadı!")
        return False
    
    print(f"📂 Girdi dosyası: {girdi_dosyasi}")
    
    try:
        with open(girdi_dosyasi, 'r', encoding='utf-8') as f:
            page_data = json.load(f)
        print(f"✅ {len(page_data)} sayfa yüklendi.")
    except Exception as e:
        print(f"❌ JSON okuma hatası: {e}")
        return False
    
    sure_verisi = {}
    ayet_kontrol = set()
    sayfa_haritasi = []
    
    istatistik = {
        "toplam_sayfa": len(page_data),
        "sure_sayisi": 0,
        "ayet_sayisi": 0,
        "kelime_sayisi": 0,
        "bulunamayan_sure": set(),
        "tekrar_eden_ayet": 0,
        "besmele_sayisi": 0
    }
    
    print("\n🔄 Dönüşüm başlıyor...")
    
    for page in page_data:
        page_index = page["page_index"]
        
        for sure_adi, ayetler in page["verses_by_sura"].items():
            sure_id = sure_adi_bul(sure_adi)
            
            if not sure_id:
                istatistik["bulunamayan_sure"].add(sure_adi)
                continue
            
            if sure_id not in sure_verisi:
                sure_verisi[sure_id] = {
                    "id": sure_id,
                    "isim": SURE_TURKCE.get(sure_id, sure_adi),
                    "isimArapca": sure_adi,
                    "anlam": "",
                    "yer": "",
                    "ayetSayisi": 0,
                    "ayetler": []
                }
            
            for ayet in ayetler:
                ayet_no = ayet["index"]
                
                # ⬇️ BESMELE DÜZELTMESİ ⬇️
                # index: 0 -> Besmele
                # Bakara (sure 2) ve diğer surelerde Besmele ayrı bir ayet değil
                if ayet_no == 0:
                    # Besmele'yi sadece Fatiha ve Tevbe hariç surelerde ekle
                    if sure_id == 1:
                        # Fatiha'da Besmele 1. ayet olarak kabul edilir
                        ayet_no = 1
                        istatistik["besmele_sayisi"] += 1
                    elif sure_id in BESMELE_VAR and sure_id != 2:
                        # Diğer surelerde Besmele ayrı bir ayet olarak saklanır
                        # Ama ayet numarası olarak 0 kalır, sonra işlenir
                        # Besmele'yi atla, çünkü sure başlığında gösterilecek
                        istatistik["besmele_sayisi"] += 1
                        continue
                    else:
                        # Bakara'da Besmele yok, Elif Lam Mim var
                        continue
                else:
                    # Bakara Suresi'nde index: 1 -> Elif Lam Mim (1. ayet)
                    if sure_id == 2 and ayet_no == 1:
                        # Elif Lam Mim, 1. ayet olarak kalır
                        pass
                
                anahtar = (sure_id, ayet_no)
                
                if anahtar in ayet_kontrol:
                    istatistik["tekrar_eden_ayet"] += 1
                    continue
                
                ayet_kontrol.add(anahtar)
                
                # Kelimelere ayır
                kelimeler = kelimelere_ayir(sure_id, ayet_no, ayet["text"])
                istatistik["kelime_sayisi"] += len(kelimeler)
                
                sure_verisi[sure_id]["ayetler"].append({
                    "no": ayet_no,
                    "sayfa": page_index,
                    "arapca": ayet["text"],
                    "meal": "",
                    "kelimeler": kelimeler
                })
                istatistik["ayet_sayisi"] += 1
                
                sayfa_haritasi.append({
                    "sayfa": page_index,
                    "sure": sure_id,
                    "ayet": ayet_no
                })
    
    # Sureleri sırala
    mushaf_data = []
    for sure_id in sorted(sure_verisi.keys()):
        sure = sure_verisi[sure_id]
        sure["ayetler"] = sorted(sure["ayetler"], key=lambda x: x["no"])
        sure["ayetSayisi"] = len(sure["ayetler"])
        mushaf_data.append(sure)
    
    istatistik["sure_sayisi"] = len(mushaf_data)
    
    # Sayfa haritasını temizle
    sayfa_haritasi_benzersiz = []
    gorulen = set()
    for item in sayfa_haritasi:
        key = f"{item['sayfa']}:{item['sure']}:{item['ayet']}"
        if key not in gorulen:
            gorulen.add(key)
            sayfa_haritasi_benzersiz.append(item)
    
    sayfa_haritasi_benzersiz = sorted(sayfa_haritasi_benzersiz, key=lambda x: (x["sayfa"], x["sure"], x["ayet"]))
    
    # Kaydet
    print("\n💾 Dosyalar kaydediliyor...")
    
    try:
        with open(cikti_dosyasi, 'w', encoding='utf-8') as f:
            json.dump(mushaf_data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ {cikti_dosyasi} kaydedildi")
    except Exception as e:
        print(f"   ❌ {cikti_dosyasi} kaydedilemedi: {e}")
        return False
    
    try:
        with open('sayfa-harita.json', 'w', encoding='utf-8') as f:
            json.dump(sayfa_haritasi_benzersiz, f, ensure_ascii=False, indent=2)
        print(f"   ✅ sayfa-harita.json kaydedildi")
    except Exception as e:
        print(f"   ❌ sayfa-harita.json kaydedilemedi: {e}")
        return False
    
    # Rapor
    print("\n" + "=" * 60)
    print("📊 DÖNÜŞÜM RAPORU")
    print("=" * 60)
    print(f"📄 Toplam sayfa    : {istatistik['toplam_sayfa']}")
    print(f"📚 Sure sayısı     : {istatistik['sure_sayisi']}")
    print(f"📖 Toplam ayet     : {istatistik['ayet_sayisi']}")
    print(f"🔤 Toplam kelime   : {istatistik['kelime_sayisi']}")
    print(f"🗺️  Sayfa girişi    : {len(sayfa_haritasi_benzersiz)}")
    print(f"🔄 Tekrar eden ayet: {istatistik['tekrar_eden_ayet']} (atlandı)")
    print(f"📝 Besmele sayısı  : {istatistik['besmele_sayisi']}")
    
    if istatistik["bulunamayan_sure"]:
        print(f"\n⚠️  Bulunamayan sure adları ({len(istatistik['bulunamayan_sure'])} adet):")
        for sure in sorted(istatistik["bulunamayan_sure"]):
            print(f"   - {sure}")
    
    # Bakara 1. ayeti kontrol et
    if 2 in sure_verisi:
        bakara_ayetler = [a["no"] for a in sure_verisi[2]["ayetler"]]
        print(f"\n📖 Bakara sure ayetleri: {bakara_ayetler[:5]}...")
        if 1 in bakara_ayetler:
            print("   ✅ Bakara 1. ayet (Elif Lam Mim) mevcut!")
    
    print("\n" + "=" * 60)
    print("✅ Dönüşüm başarıyla tamamlandı!")
    print("=" * 60)
    
    return True

def main():
    script_dir = Path(__file__).parent
    girdi_dosyasi = script_dir / "quran_by_pages.json"
    cikti_dosyasi = script_dir / "kuran-mushaf.json"
    
    print("\n" + "=" * 60)
    print("🚀 KURAN VERİ DÖNÜŞTÜRÜCÜ")
    print("=" * 60)
    print(f"📂 Çalışma dizini: {script_dir}")
    
    success = convert_page_to_mushaf(str(girdi_dosyasi), str(cikti_dosyasi))
    
    if success:
        print("\n💡 Dosyalar artık React uygulamanızda kullanılabilir.")
        print("   public/ klasörüne kopyalamayı unutmayın!")
        print("   cp kuran-mushaf.json ../../public/")
        print("   cp sayfa-harita.json ../../public/")
    else:
        print("\n❌ Dönüşüm başarısız oldu.")
        sys.exit(1)

if __name__ == "__main__":
    main()