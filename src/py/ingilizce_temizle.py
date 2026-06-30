"""
Lugattaki İngilizce anlamları temizler.

Kullanım:
    python3 ingilizce_temizle.py          # Sadece tespit
    python3 ingilizce_temizle.py --sil    # Tespit + sil
"""

import json, re, argparse, os

LUGAT_YOL = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "data", "arapca-lugat.json"
)

# Türkçe'ye özgü harf/hece kalıpları (özel karakter olmasa da Türkçe)
TURKCE_SONEKLER = re.compile(
    r"(mak|mek|lar|ler|dan|den|tan|ten|lar|nin|nun|nın|nün|"
    r"ını|ini|unu|ünü|lar|ler|yor|yip|miş|muş|müş|mış|"
    r"dık|dik|duk|dük|tık|tik|tuk|tük|"
    r"arak|erek|ınca|ince|unca|ünce|"
    r"sı|si|su|sü|ki|ku|"
    r"an|en|in|un|ün|ın|"
    r"ıp|ip|up|üp)$",
    re.IGNORECASE
)

# Kesinlikle Türkçe olan yaygın kelimeler (ASCII ama Türkçe)
TURKCE_KELIMELER = {
    "ve", "de", "da", "bir", "bu", "o", "ki", "ile", "ne", "ya",
    "al", "gel", "git", "ver", "ol", "et", "yap", "bil", "kal",
    "iman", "islam", "kuran", "sure", "ayet", "namaz", "dua",
    "allah", "resul", "nebi", "rabbi", "rab", "din", "hak",
    "onlar", "biz", "siz", "sen", "ben", "ona", "bana", "sana",
    "onu", "bunu", "sunu", "ise", "ama", "veya", "hem", "dahi",
    "gibi", "kadar", "icin", "ile", "gore", "diye", "dedi", "der",
    "eder", "olur", "oldu", "olan", "eden", "diye", "diyerek",
}

def ingilizce_mi(anlam: str) -> bool:
    temiz = anlam.strip()
    if not temiz:
        return False

    # Türkçe özel karakter varsa kesinlikle Türkçe
    if re.search(r"[çğışöüÇĞİŞÖÜâîûÂÎÛ]", temiz):
        return False

    # Sayı veya noktalama ağırlıklıysa Türkçe olabilir
    if re.search(r"[0-9\(\)\!\?\.\,]", temiz):
        return False

    # Tüm kelimeler Türkçe listedeyse Türkçe
    kelimeler = temiz.lower().split()
    if all(k in TURKCE_KELIMELER for k in kelimeler):
        return False

    # Herhangi bir kelime Türkçe sonekle bitiyorsa Türkçe
    for k in kelimeler:
        if TURKCE_SONEKLER.search(k):
            return False
        if k in TURKCE_KELIMELER:
            return False

    # Sadece ASCII harf ve boşluk/tire içeriyorsa İngilizce
    if re.match(r"^[a-zA-Z\s\-]+$", temiz):
        return True

    return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sil", action="store_true")
    parser.add_argument("--lugat", default=LUGAT_YOL)
    args = parser.parse_args()

    with open(args.lugat, encoding="utf-8") as f:
        d = json.load(f)

    tespitler = {}
    for k, v in d.items():
        ing = [a for a in v.get("anlamlar", []) if ingilizce_mi(a)]
        if ing:
            tespitler[k] = ing

    print(f"Toplam kelime: {len(d)}")
    print(f"İngilizce anlam içeren giriş: {len(tespitler)}\n")
    for k, ing in list(tespitler.items())[:40]:
        kalan = [a for a in d[k]["anlamlar"] if a not in ing]
        print(f"  {k:20s} silinecek: {ing}")
        print(f"  {'':20s} kalan:    {kalan}")

    if not args.sil:
        print("\nSilmek için: python3 ingilizce_temizle.py --sil")
        return

    temizlenen = 0
    silinen_giris = 0
    silinecek_giripler = []
    for k, ing in tespitler.items():
        d[k]["anlamlar"] = [a for a in d[k]["anlamlar"] if a not in ing]
        temizlenen += len(ing)
        if not d[k]["anlamlar"]:
            silinecek_giripler.append(k)
            silinen_giris += 1

    for k in silinecek_giripler:
        del d[k]

    with open(args.lugat, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(d.items())), f, ensure_ascii=False, indent=2)

    print(f"\n✓ {temizlenen} İngilizce anlam silindi")
    print(f"  {silinen_giris} giriş tamamen kaldırıldı")
    print(f"  Kalan kelime sayısı: {len(d)}")

if __name__ == "__main__":
    main()