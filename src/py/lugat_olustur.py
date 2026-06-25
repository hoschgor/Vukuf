import json
import urllib.request
import urllib.parse
import time
import re
import os

def tdk_ara(kelime):
    try:
        temiz = kelime.lower().strip()
        url = f"https://sozluk.gov.tr/gts?ara={urllib.parse.quote(temiz)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=5)
        data = json.loads(resp.read())
        
        if not data or not isinstance(data, list):
            return None
        
        anlamlar = data[0].get("anlamlarListe", [])
        if not anlamlar:
            return None
        
        # İlk anlamı al
        anlam = anlamlar[0].get("anlam", "")
        if anlam:
            return anlam.strip()
    except:
        pass
    return None

def metinden_kelimeleri_cikart(json_dosyasi):
    with open(json_dosyasi, encoding="utf-8") as f:
        sayfalar = json.load(f)
    
    kelimeler = set()
    temizle = re.compile(r'[^\w\sâîûçğışöüÂÎÛÇĞİŞÖÜ\'-]')
    
    for sayfa in sayfalar:
        metin = sayfa["metin"]
        # § ile başlayan satırları atla
        satirlar = [s for s in metin.split("\n") if not s.startswith("§")]
        temiz_metin = " ".join(satirlar)
        
        for kelime in temiz_metin.split():
            k = temizle.sub("", kelime).strip().lower()
            if len(k) > 3:
                kelimeler.add(k)
    
    return kelimeler

def lugat_olustur():
    # Mevcut lugat.json yükle
    lugat_yolu = "src/data/lugat.json"
    try:
        with open(lugat_yolu, encoding="utf-8") as f:
            mevcut_lugat = json.load(f)
    except:
        mevcut_lugat = {}
    
    print(f"Mevcut kelime sayısı: {len(mevcut_lugat)}")
    
    # Tüm kitap metinlerinden kelimeleri topla
    kitap_dosyalari = [
        "public/ayetul-kubra-metin.json",
        "public/munkiz-metin.json",
    ]
    
    tum_kelimeler = set()
    for dosya in kitap_dosyalari:
        if os.path.exists(dosya):
            kelimeler = metinden_kelimeleri_cikart(dosya)
            tum_kelimeler.update(kelimeler)
            print(f"{dosya}: {len(kelimeler)} kelime")
    
    print(f"Toplam benzersiz kelime: {len(tum_kelimeler)}")
    
    # Mevcut lugat'ta olmayan kelimeleri TDK'dan çek
    yeni_kelimeler = {}
    atla = set(mevcut_lugat.keys())
    
    aralinacak = [k for k in tum_kelimeler if k not in atla]
    print(f"TDK'dan aranacak: {len(aralinacak)} kelime")
    
    for i, kelime in enumerate(aralinacak):
        anlam = tdk_ara(kelime)
        if anlam:
            yeni_kelimeler[kelime] = anlam
        
        if (i + 1) % 50 == 0:
            print(f"İşlendi: {i+1}/{len(aralinacak)}, Bulunan: {len(yeni_kelimeler)}")
            # Ara kaydet
            mevcut_lugat.update(yeni_kelimeler)
            with open(lugat_yolu, "w", encoding="utf-8") as f:
                json.dump(dict(sorted(mevcut_lugat.items())), f, ensure_ascii=False, indent=2)
        
        time.sleep(0.1)  # API'yi yormamak için
    
    # Son kaydet
    mevcut_lugat.update(yeni_kelimeler)
    mevcut_lugat = dict(sorted(mevcut_lugat.items()))
    
    with open(lugat_yolu, "w", encoding="utf-8") as f:
        json.dump(mevcut_lugat, f, ensure_ascii=False, indent=2)
    
    print(f"\nToplam kelime: {len(mevcut_lugat)}")
    print(f"Yeni eklenen: {len(yeni_kelimeler)}")

if __name__ == "__main__":
    lugat_olustur()