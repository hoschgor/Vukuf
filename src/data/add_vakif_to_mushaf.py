# add_vakif_to_mushaf.py
import json
import re

# ── Vakıf işaretleri ve anlamları ──
VAKIF_ISARETLERI = {
    'م': 'Vakf-ı Lazım',
    'ط': 'Vakf-ı Mutlak',
    'ج': 'Vakf-ı Câiz',
    'ص': 'Vakf-ı Mücevvez',
    'ق': 'Vakf-ı Murahhas',
    '۩': 'Secde',
}

# ── Vakıf işaretlerini tespit etme ──
def vakif_bul(kelime_metni):
    """Kelime içindeki vakıf işaretini bulur"""
    for isaret in VAKIF_ISARETLERI.keys():
        if isaret in kelime_metni:
            return isaret
    return None

def kelimelere_ayir(metin):
    """Metni kelimelere ayırır, vakıf işaretlerini tespit eder"""
    # Boşluklara göre ayır
    kelimeler = metin.split()
    sonuc = []
    
    for kelime in kelimeler:
        # Vakıf işareti var mı?
        vakif = vakif_bul(kelime)
        
        # Vakıf işaretini kelimeden temizle (isteğe bağlı)
        temiz_kelime = kelime
        if vakif:
            temiz_kelime = kelime.replace(vakif, '')
        
        sonuc.append({
            'arabic': temiz_kelime,
            'vakif': vakif,
            'secde': vakif == '۩'  # Secde işareti
        })
    
    return sonuc

def add_vakif_to_mushaf(girdi_dosyasi, cikti_dosyasi="kuran-mushaf.json"):
    print("=" * 60)
    print("📖 VAKIF VERİSİ EKLEME")
    print("=" * 60)
    
    # JSON'u oku
    with open(girdi_dosyasi, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"📂 {len(data)} sure yüklendi.")
    
    # İstatistikler
    istatistik = {
        'toplam_ayet': 0,
        'vakifli_kelime': 0,
        'secde_ayeti': 0,
        'vakif_dagilimi': {}
    }
    
    # Her sure ve ayeti işle
    for sure in data:
        for ayet in sure.get('ayetler', []):
            istatistik['toplam_ayet'] += 1
            
            # Eğer kelimeler yoksa veya eski formattaysa yeniden oluştur
            if 'kelimeler' not in ayet or not ayet['kelimeler']:
                # Arapça metni kelimelere ayır
                metin = ayet.get('arapca', '')
                ayet['kelimeler'] = kelimelere_ayir(metin)
            else:
                # Mevcut kelimelere vakıf ekle
                yeni_kelimeler = []
                for kelime in ayet['kelimeler']:
                    # Eğer vakif alanı yoksa veya null ise
                    if kelime.get('vakif') is None:
                        # Kelime metninde vakıf ara
                        metin = kelime.get('arabic', '')
                        vakif = vakif_bul(metin)
                        if vakif:
                            # Vakıf işaretini temizle
                            temiz_metin = metin.replace(vakif, '')
                            kelime['arabic'] = temiz_metin
                            kelime['vakif'] = vakif
                            if vakif == '۩':
                                kelime['secde'] = True
                                istatistik['secde_ayeti'] += 1
                            istatistik['vakifli_kelime'] += 1
                            istatistik['vakif_dagilimi'][vakif] = istatistik['vakif_dagilimi'].get(vakif, 0) + 1
                    
                    # Vakif alanı varsa kontrol et
                    if kelime.get('vakif'):
                        istatistik['vakif_dagilimi'][kelime['vakif']] = istatistik['vakif_dagilimi'].get(kelime['vakif'], 0) + 1
                    
                    yeni_kelimeler.append(kelime)
                
                ayet['kelimeler'] = yeni_kelimeler
    
    # JSON'u kaydet
    with open(cikti_dosyasi, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # Rapor
    print("\n" + "=" * 60)
    print("📊 VAKIF EKLEME RAPORU")
    print("=" * 60)
    print(f"📖 Toplam ayet: {istatistik['toplam_ayet']}")
    print(f"🔤 Vakıflı kelime: {istatistik['vakifli_kelime']}")
    print(f"🕌 Secde ayeti: {istatistik['secde_ayeti']}")
    
    print("\n📝 Vakıf dağılımı:")
    for isaret, sayi in sorted(istatistik['vakif_dagilimi'].items()):
        anlam = VAKIF_ISARETLERI.get(isaret, 'Bilinmiyor')
        print(f"  {isaret} ({anlam}): {sayi}")
    
    print(f"\n✅ Dosya kaydedildi: {cikti_dosyasi}")
    return istatistik

# ── Çalıştır ──
if __name__ == "__main__":
    add_vakif_to_mushaf('kuran-mushaf.json')