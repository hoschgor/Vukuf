#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SÖZLÜK KALİTE DENETİMİ + EKSİK KELİME ÇALIŞMA LİSTESİ.

İki iş yapar:

  A) arapca-lugat.json'ı DENETLER
       · İngilizce anlamlar (temizlenecek)
       · Aşırı anlam taşıyan kayıtlar (bazılarında 100+ anlam var)
       · Aynı anlamın tekrarı, boş anlam, gereksiz boşluk
  B) mushafta karşılığı OLMAYAN kelimeleri, sıklık ve geçtiği yerlerle
     birlikte DOLDURULABİLİR bir dosyaya yazar.

Hiçbir girdi dosyasını değiştirmez; yalnız ÇIKTI dosyası üretir.

Kullanım:
    python3 lugat_kalite.py <kuran-mushaf.json> <arapca-lugat.json>

Seçenekler:
    --cikti <klasör>   çıktı klasörü (varsayılan: ./lugat_cikti)
    --anlam-siniri 8   "aşırı" sayılacak anlam adedi eşiği (varsayılan 8)
    --liste 30         terminalde kaç örnek gösterilsin (varsayılan 20)
"""

import json
import os
import re
import sys
from collections import Counter, defaultdict

# lugat_denetim ile AYNI normalize — iki betik ayrışmasın diye buraya da kopyalandı.
MEVCUT_RE = re.compile(
    "[ؐ-ًؚ-ٟـٰۖ-ۜ۟-ۤ"
    "۪ۧۨ-ۭ࣑ࣕࣖࣗࣙࣞ]"
)
ELIF_RE = re.compile("[ٱآأإ]")
# İNGİLİZCE TESPİTİ — "Latin harfi var mı" diye BAKILAMAZ: Türkçe de Latin
# alfabesi kullanıyor, o test "âlemler"i de İngilizce sayıyordu. Bunun yerine
# İngilizceye ÖZGÜ işlev kelimeleri aranır; bunlar Türkçe anlam metninde geçmez.
EN_KELIME = {
    "the", "of", "and", "to", "in", "is", "was", "are", "were", "for", "with",
    "that", "this", "these", "those", "it", "its", "his", "her", "their", "them",
    "they", "he", "she", "you", "we", "us", "our", "from", "by", "as", "at", "on",
    "or", "but", "not", "be", "been", "being", "have", "has", "had", "will",
    "would", "shall", "should", "can", "could", "may", "might", "who", "whom",
    "which", "what", "when", "where", "why", "how", "all", "any", "some", "one",
    "more", "most", "other", "than", "then", "there", "such", "nor", "so", "if",
    "upon", "unto", "whoever", "indeed", "verily", "did", "does", "do", "made",
    "make", "said", "say", "says", "your", "my", "mine", "him", "himself",
    "a", "an", "about", "into", "over", "under", "before", "after", "against",
}
KELIME_AYIR = re.compile(r"[^A-Za-zÇĞİIÖŞÜçğıöşüÂÎÛâîû]+")
TR_HARF = re.compile(r"[çğıİöşüÇĞÖŞÜâîûÂÎÛ]")


def ingilizce_mi(metin):
    """Anlam metni İngilizce mi? Türkçe'ye özgü harf varsa asla İngilizce sayma."""
    if TR_HARF.search(metin):
        return False
    parcalar = [p.lower() for p in KELIME_AYIR.split(metin) if p]
    return any(p in EN_KELIME for p in parcalar)


def normalize(k):
    k = MEVCUT_RE.sub("", k)
    k = ELIF_RE.sub("ا", k)
    k = re.sub("^ال", "ل", k)
    k = k.strip()
    return re.sub("ي$", "ى", k)


def elifsiz(t):
    return t[:1] + t[1:].replace("ا", "") if t else t


def yol_coz(verilen):
    if os.path.isfile(verilen):
        return verilen
    adi = os.path.basename(verilen)
    for kok in (os.path.dirname(os.path.abspath(__file__)), os.path.abspath(os.getcwd())):
        for _ in range(5):
            for aday in (os.path.join(kok, verilen), os.path.join(kok, adi),
                         os.path.join(kok, "data", adi), os.path.join(kok, "src", "data", adi)):
                if os.path.isfile(aday):
                    return aday
            kok = os.path.dirname(kok)
    print(f"HATA: '{verilen}' bulunamadı.")
    sys.exit(1)


def kelimeleri_topla(d, konum=None, out=None):
    if out is None:
        out = []
    if konum is None:
        konum = {}
    if isinstance(d, dict):
        yeni = dict(konum)
        if isinstance(d.get("id"), (str, int)):
            yeni["id"] = d["id"]
        if isinstance(d.get("arabic"), str):
            out.append((str(yeni.get("id", "?")), d["arabic"]))
        for v in d.values():
            kelimeleri_topla(v, yeni, out)
    elif isinstance(d, list):
        for v in d:
            kelimeleri_topla(v, konum, out)
    return out


def anlam_listesi(kayit):
    """Kayıttan anlam listesini çıkar — şekil değişse de çalışsın."""
    if isinstance(kayit, dict):
        for alan in ("anlamlar", "anlam", "meanings", "meaning"):
            v = kayit.get(alan)
            if isinstance(v, list):
                return [str(x) for x in v]
            if isinstance(v, str):
                return [v]
    if isinstance(kayit, list):
        return [str(x) for x in kayit]
    if isinstance(kayit, str):
        return [kayit]
    return []


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    cikti_dir = "./lugat_cikti"
    if "--cikti" in sys.argv:
        cikti_dir = sys.argv[sys.argv.index("--cikti") + 1]
    siniri = 8
    if "--anlam-siniri" in sys.argv:
        siniri = int(sys.argv[sys.argv.index("--anlam-siniri") + 1])
    liste = 20
    if "--liste" in sys.argv:
        liste = int(sys.argv[sys.argv.index("--liste") + 1])

    mushaf = json.load(open(yol_coz(args[0]), encoding="utf-8"))
    lugat = json.load(open(yol_coz(args[1]), encoding="utf-8"))
    os.makedirs(cikti_dir, exist_ok=True)

    # ═══════════════════════════════════════════════════════════════════════
    print("=" * 74)
    print("A) SÖZLÜK KALİTESİ")
    print("=" * 74)
    print(f"  kayıt: {len(lugat)}")

    adetler = Counter()
    latinli, asiri, tekrarli, bos = [], [], [], []
    for anah, kayit in lugat.items():
        anlamlar = anlam_listesi(kayit)
        adetler[len(anlamlar)] += 1

        lat = [a for a in anlamlar if ingilizce_mi(a)]
        if lat:
            latinli.append((anah, len(anlamlar), lat))
        if len(anlamlar) > siniri:
            asiri.append((anah, len(anlamlar), anlamlar))
        sade = [a.strip().lower() for a in anlamlar if a.strip()]
        if len(sade) != len(set(sade)):
            tekrarli.append((anah, len(anlamlar), len(sade) - len(set(sade))))
        if not sade:
            bos.append(anah)

    print("\n  ── Anlam sayısı dağılımı ──")
    toplam_anlam = sum(k * v for k, v in adetler.items())
    print(f"     toplam anlam: {toplam_anlam}   ortalama: {toplam_anlam/max(1,len(lugat)):.1f}")
    for n in sorted(adetler):
        if n <= 10 or n % 25 == 0:
            print(f"     {n:>4} anlamlı: {adetler[n]:>6} kayıt")
    enb = max(adetler) if adetler else 0
    print(f"     EN ÇOK anlam: {enb}")

    print(f"\n  ── {siniri}'den ÇOK anlamlı kayıt: {len(asiri)} ──")
    for anah, n, anlamlar in sorted(asiri, key=lambda x: -x[1])[:liste]:
        print(f"     {n:>4} anlam   {anah}   ör: {', '.join(anlamlar[:4])} …")

    print(f"\n  ── İNGİLİZCE anlam taşıyan kayıt: {len(latinli)} ──")
    for anah, n, lat in latinli[:liste]:
        print(f"     {anah:<18} ({n} anlam)   {lat[:3]}")

    print(f"\n  ── Aynı anlamı TEKRAR eden kayıt: {len(tekrarli)} ──")
    for anah, n, fazla in sorted(tekrarli, key=lambda x: -x[2])[:liste]:
        print(f"     {anah:<18} {n} anlamın {fazla} tanesi tekrar")

    print(f"\n  ── Anlamı BOŞ kayıt: {len(bos)} ──")
    if bos:
        print(f"     {bos[:liste]}")

    # ═══════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 74)
    print("B) EKSİK KELİMELER (çalışma listesi)")
    print("=" * 74)
    kelimeler = kelimeleri_topla(mushaf)

    yedek_grup = defaultdict(set)
    for anah in lugat:
        yedek_grup[elifsiz(anah)].add(anah)
    yedek = {k: next(iter(v)) for k, v in yedek_grup.items() if len(v) == 1}

    eksik = defaultdict(lambda: {"adet": 0, "yerler": [], "ornek_yazim": ""})
    tut = 0
    for kid, kel in kelimeler:
        anah = normalize(kel)
        if anah in lugat or elifsiz(anah) in yedek:
            tut += 1
            continue
        k = eksik[anah]
        k["adet"] += 1
        if len(k["yerler"]) < 12:
            k["yerler"].append(kid)
        if not k["ornek_yazim"]:
            k["ornek_yazim"] = kel

    print(f"  kelime: {len(kelimeler)}   eşleşen: {tut} (%{100.0*tut/max(1,len(kelimeler)):.1f})")
    print(f"  EKSİK farklı kelime: {len(eksik)}   toplam geçiş: {sum(v['adet'] for v in eksik.values())}")

    sirali = sorted(eksik.items(), key=lambda x: -x[1]["adet"])
    print(f"\n  ── en sık {liste} eksik ──")
    for anah, v in sirali[:liste]:
        print(f"     {v['adet']:>5} kez   {anah:<16} ({v['ornek_yazim']})  ör. {v['yerler'][0]}")

    # ── Çıktı dosyaları ────────────────────────────────────────────────────
    p1 = os.path.join(cikti_dir, "eksik_kelimeler.json")
    with open(p1, "w", encoding="utf-8") as f:
        json.dump(
            [{"anahtar": a, "adet": v["adet"], "ornek_yazim": v["ornek_yazim"],
              "yerler": v["yerler"], "okunuş": "", "anlamlar": []} for a, v in sirali],
            f, ensure_ascii=False, indent=1)

    p2 = os.path.join(cikti_dir, "lugat_sorunlar.json")
    with open(p2, "w", encoding="utf-8") as f:
        json.dump({
            "asiri_anlamli": [{"anahtar": a, "adet": n, "anlamlar": m}
                              for a, n, m in sorted(asiri, key=lambda x: -x[1])],
            "ingilizce": [{"anahtar": a, "toplam": n, "ingilizce_anlamlar": l}
                             for a, n, l in latinli],
            "tekrarli": [{"anahtar": a, "toplam": n, "tekrar": t} for a, n, t in tekrarli],
            "bos": bos,
        }, f, ensure_ascii=False, indent=1)

    p3 = os.path.join(cikti_dir, "eksik_kelimeler.csv")
    with open(p3, "w", encoding="utf-8") as f:
        f.write("anahtar,adet,ornek_yazim,ilk_yer\n")
        for a, v in sirali:
            f.write(f'"{a}",{v["adet"]},"{v["ornek_yazim"]}","{v["yerler"][0] if v["yerler"] else ""}"\n')

    print("\n  ── yazılan dosyalar ──")
    for p in (p1, p2, p3):
        print(f"     {p}  ({os.path.getsize(p)//1024} KB)")
    print("\n  eksik_kelimeler.json'daki 'okunuş' ve 'anlamlar' alanları BOŞ bırakıldı;")
    print("  kaynaktan doldurulup sözlüğe eklenmek üzere hazır.")


if __name__ == "__main__":
    main()
