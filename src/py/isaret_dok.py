#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kuran-mushaf.json içindeki İŞARET dökümü.

Amaç: hangi Arapça işaret kodunun bu veride GERÇEKTEN nasıl kullanıldığını
ölçmek. Unicode adına güvenmiyoruz — bu veride U+06DC "sekte" değil ط durağı,
U+06EA "durak" değil uzatma çıktı. Karar vermeden önce sayıya bakıyoruz.

Kullanım:
    python3 isaret_dok.py /home/hosgoer/Projeler/vukuf/src/data/kuran-mushaf.json

Ek olarak tek bir kodu didiklemek için:
    python3 isaret_dok.py <dosya> --kod 0617
    python3 isaret_dok.py <dosya> --ayet 2:41

Hiçbir bağımlılığı yok, dosyayı DEĞİŞTİRMEZ.
"""

import json
import sys
import unicodedata
from collections import Counter, defaultdict

# Arapça birleşen/işaret aralıkları (harf ve rakam DEĞİL)
ARALIK = [
    (0x0610, 0x061A), (0x064B, 0x065F), (0x0670, 0x0670),
    (0x06D6, 0x06ED), (0x08D3, 0x08FF), (0xFBB2, 0xFBC1),
]
isaret_mi = lambda cp: any(a <= cp <= b for a, b in ARALIK)

ORNEK_SAYISI = 6          # kod başına gösterilecek örnek kelime sayısı
KISALT = 90               # uzun satırları kırp


def ad(cp):
    try:
        return unicodedata.name(chr(cp))
    except ValueError:
        return "<isimsiz>"


def yol_coz(verilen):
    """Verilen yol yoksa makul yerlerde arar.

    Betik src/py/ içinde durup dosya src/data/ içinde olduğu için, proje
    kökünden yazılan yol (src/data/...) betiğin çalıştığı dizine göre
    tutmuyordu. Elle düzeltmek yerine kendisi bulsun.
    """
    import os
    if os.path.isfile(verilen):
        return verilen
    adi = os.path.basename(verilen)
    betik = os.path.dirname(os.path.abspath(__file__))
    adaylar = []
    # 1) betiğin yanı, 2) betikten yukarı 4 kademe (kök/src/data gibi yerler dahil)
    kok = betik
    for _ in range(5):
        adaylar += [
            os.path.join(kok, verilen),
            os.path.join(kok, adi),
            os.path.join(kok, "data", adi),
            os.path.join(kok, "src", "data", adi),
        ]
        kok = os.path.dirname(kok)
    # 3) çalışılan dizinden yukarı
    kok = os.path.abspath(os.getcwd())
    for _ in range(5):
        adaylar += [os.path.join(kok, verilen), os.path.join(kok, adi),
                    os.path.join(kok, "src", "data", adi)]
        kok = os.path.dirname(kok)
    for a in adaylar:
        if os.path.isfile(a):
            print(f"(yol bulunamadı, şuna çözüldü: {a})")
            return a
    print(f"HATA: '{verilen}' bulunamadı. Denenen yerler arasında şunlar vardı:")
    for a in dict.fromkeys(adaylar[:8]):
        print("   ", a)
    print("\nTam yol vererek dene, ör.:")
    print("   python3 isaret_dok.py ~/Projeler/vukuf/src/data/kuran-mushaf.json")
    sys.exit(1)


def yukle(yol):
    with open(yol, encoding="utf-8") as f:
        return json.load(f)


# ── 1) YAPI: veri neye benziyor? ────────────────────────────────────────────
def yapi(d, derinlik=0, yol="kök", cikti=None):
    """İlk birkaç kademeyi özetler ki alan adlarını görelim."""
    if cikti is None:
        cikti = []
    girinti = "  " * derinlik
    if isinstance(d, dict):
        anahtarlar = list(d.keys())
        cikti.append(f"{girinti}{yol}: dict ({len(anahtarlar)} anahtar) "
                     f"{anahtarlar[:12]}{' …' if len(anahtarlar) > 12 else ''}")
        if derinlik < 3:
            for k in anahtarlar[:3]:
                yapi(d[k], derinlik + 1, k, cikti)
    elif isinstance(d, list):
        cikti.append(f"{girinti}{yol}: list ({len(d)} öğe)")
        if d and derinlik < 3:
            yapi(d[0], derinlik + 1, f"{yol}[0]", cikti)
    else:
        s = repr(d)
        cikti.append(f"{girinti}{yol}: {type(d).__name__} = "
                     f"{s[:KISALT]}{'…' if len(s) > KISALT else ''}")
    return cikti


# ── 2) GEZİNTİ: her metin alanını konumuyla birlikte dolaş ──────────────────
KONUM_ANAHTAR = ("sure", "sureNo", "sure_no", "surah", "s",
                 "ayet", "ayetNo", "ayet_no", "ayah", "a", "no", "id")

def gez(d, konum=None, yol="", ciktilar=None):
    """(metin, konum_etiketi, alan_yolu) üretir. Şekilden bağımsız çalışır."""
    if konum is None:
        konum = {}
    if isinstance(d, dict):
        yeni = dict(konum)
        for k, v in d.items():
            if k in KONUM_ANAHTAR and isinstance(v, (str, int)):
                yeni[k] = v
        for k, v in d.items():
            yield from gez(v, yeni, f"{yol}.{k}" if yol else k)
    elif isinstance(d, list):
        for i, v in enumerate(d):
            yield from gez(v, konum, f"{yol}[{i}]")
    elif isinstance(d, str):
        yield d, konum, yol


import re as _re
def alan_adi(yol):
    """'sureler[0].ayetler[1].kelimeler[0].arabic' -> 'arabic'"""
    return _re.sub(r"\[\d+\]", "", yol).split(".")[-1] or "(kök)"


def etiket(konum):
    for a, b in (("sure", "ayet"), ("sureNo", "ayetNo"), ("surah", "ayah"), ("s", "a")):
        if a in konum:
            return f"{konum[a]}:{konum.get(b, '?')}"
    if "id" in konum:
        return str(konum["id"])
    return "?"


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    yol = sys.argv[1]
    tek_kod = None
    tek_ayet = None
    if "--kod" in sys.argv:
        tek_kod = int(sys.argv[sys.argv.index("--kod") + 1], 16)
    if "--ayet" in sys.argv:
        tek_ayet = sys.argv[sys.argv.index("--ayet") + 1]
    aranan = None
    if "--ara" in sys.argv:
        aranan = sys.argv[sys.argv.index("--ara") + 1]

    yol = yol_coz(yol)
    print(f"Dosya okunuyor: {yol}")
    d = yukle(yol)
    print("OK\n")

    print("=" * 74)
    print("1) VERİ YAPISI")
    print("=" * 74)
    for satir in yapi(d):
        print(satir)
    print()

    # Tüm metinleri bir kez topla
    kayitlar = list(gez(d))
    print(f"(taranan metin alanı: {len(kayitlar)})\n")

    # ── 3) İşaret sayımı ────────────────────────────────────────────────────
    sayac = Counter()
    ornek = defaultdict(list)
    alanlar = defaultdict(Counter)
    for metin, konum, alan in kayitlar:
        for ch in metin:
            cp = ord(ch)
            if not isaret_mi(cp):
                continue
            sayac[cp] += 1
            alanlar[cp][alan_adi(alan)] += 1
            if len(ornek[cp]) < ORNEK_SAYISI:
                ornek[cp].append((etiket(konum), metin.strip()[:40]))

    # Rutin harekeler (fetha/kesre/ötre/şedde/sükûn/med elifi) ayrı tutulur;
    # yoksa asıl merak ettiğimiz durak/tecvid işaretleri listede boğuluyor.
    HAREKE = set(range(0x064B, 0x0653)) | {0x0670, 0x0640, 0x0653, 0x0654, 0x0655, 0x0656}
    UYGULAMA = {  # MushafKelime/KuranOkuma'nın TANIDIĞI kodlar
        0x0615, 0x0617, 0x06D6, 0x06D7, 0x06D8, 0x06D9, 0x06DA, 0x06DB, 0x06DC,
        0x06DF, 0x06E0, 0x06E3, 0x06EA, 0x06EB, 0x06ED,
        0x08D1, 0x08D2, 0x08D5, 0x08D6, 0x08D7, 0x08D9, 0x08DE,
    }
    onemli = [(cp, n) for cp, n in sayac.most_common() if cp not in HAREKE]
    harekeler = [(cp, n) for cp, n in sayac.most_common() if cp in HAREKE]

    print("=" * 74)
    print("2) DURAK / TECVİD İŞARETLERİ  (harekeler hariç)")
    print("=" * 74)
    print(f"{'KOD':<9}{'ADET':>7}  {'ALAN':<10}{'UYGULAMA':<10} UNICODE ADI")
    print("-" * 74)
    for cp, n in onemli:
        alan = alanlar[cp].most_common(1)[0][0]
        bilir = "tanıyor" if cp in UYGULAMA else ">> BİLMİYOR"
        print(f"U+{cp:04X}{'':<3}{n:>7}  {alan:<10}{bilir:<10} {ad(cp)}")
    eksik = [f"U+{cp:04X}" for cp, _ in onemli if cp not in UYGULAMA]
    print("\n  Uygulamanın tanımadığı işaretler: " + (", ".join(eksik) if eksik else "YOK"))
    kullanilmayan = [f"U+{cp:04X}" for cp in sorted(UYGULAMA) if cp not in sayac]
    print("  Uygulamada tanımlı ama veride HİÇ geçmeyenler: "
          + (", ".join(kullanilmayan) if kullanilmayan else "YOK"))
    print("\n  (harekeler: " + ", ".join(f"U+{cp:04X}×{n}" for cp, n in harekeler) + ")")
    print()

    # ── 4) vakif alanı ──────────────────────────────────────────────────────
    vakif = Counter()
    for metin, konum, alan in kayitlar:
        if alan_adi(alan) == "vakif" and metin.strip():
            vakif[metin.strip()] += 1
    if vakif:
        print("=" * 74)
        print("3) `vakif` ALANINDAKİ DEĞERLER")
        print("=" * 74)
        for v, n in vakif.most_common():
            kod = " ".join(f"U+{ord(c):04X}" for c in v)
            print(f"  {v!r:<10} {n:>6}  ({kod})")
        print()

    # ── 5) Örnekler ─────────────────────────────────────────────────────────
    print("=" * 74)
    print("4) HER İŞARETİN GEÇTİĞİ YERLER (örnek)")
    print("=" * 74)
    # Harekeler hariç — onların nerede geçtiği zaten ilginç değil, çıktıyı şişiriyor.
    hedefler = [tek_kod] if tek_kod else [cp for cp, _ in onemli]
    for cp in hedefler:
        if cp not in sayac:
            print(f"U+{cp:04X}  — bu veride HİÇ GEÇMİYOR")
            continue
        print(f"\nU+{cp:04X}  ({sayac[cp]} kez)  {ad(cp)}")
        for yer, kelime in ornek[cp]:
            print(f"    {yer:<10} {kelime}")

    # ── 5b) Kelime araması: işaretleri atıp TABAN harflerle eşleştir
    if aranan:
        taban = lambda t: "".join(c for c in t if not isaret_mi(ord(c)))
        hedef = taban(aranan)
        print("\n" + "=" * 74)
        print(f"5) '{aranan}' GEÇEN KELİMELER (işaretler atılarak eşleştirildi)")
        print("=" * 74)
        n = 0
        for metin, konum, alan in kayitlar:
            if hedef and hedef in taban(metin):
                n += 1
                print(f"\n  {etiket(konum):<12} [{alan_adi(alan)}]  {metin}")
                for ch in metin:
                    cp = ord(ch)
                    if isaret_mi(cp):
                        print(f"      U+{cp:04X}  {ad(cp)}")
                if n >= 15:
                    print("\n  (… ilk 15 eşleşme)")
                    break
        if not n:
            print("  eşleşme yok")

    # ── 6) Tek âyet dökümü ──────────────────────────────────────────────────
    if tek_ayet:
        print("\n" + "=" * 74)
        print(f"5) {tek_ayet} DÖKÜMÜ")
        print("=" * 74)
        bulundu = 0
        for metin, konum, alan in kayitlar:
            e = etiket(konum)
            if not (e == tek_ayet or e.startswith(tek_ayet + ":")):
                continue
            if not any(isaret_mi(ord(c)) or 0x0620 <= ord(c) <= 0x064A for c in metin):
                continue
            bulundu += 1
            print(f"\n  [{alan}]  {metin}")
            for ch in metin:
                cp = ord(ch)
                im = "İŞARET" if isaret_mi(cp) else ""
                print(f"      U+{cp:04X} {im:<7} {ad(cp)}")
            if bulundu >= 25:
                print("\n  (… ilk 25 alan gösterildi)")
                break
        if not bulundu:
            print("  Bu etikete ait alan bulunamadı — yukarıdaki 1) YAPI çıktısını"
                  " gönder, konum anahtarlarını ona göre ayarlayayım.")


if __name__ == "__main__":
    main()
