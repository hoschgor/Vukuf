#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KELİME ANLAMI (lügat) EŞLEŞME DENETİMİ.

Neyi ölçer: mushaftaki her kelime, arapca-lugat.json'da karşılığını buluyor mu?

Önemli not — teşhis için: anlam KONUMA GÖRE değil, KELİMENİN KENDİSİNE göre
aranıyor. KuranOkuma.jsx'teki `lugat()` şunu yapıyor:

    normalize(kelime.arabic)  ->  arapcaLugat[anahtar]

Yani "bizim kelime sıralamamız API ile aynı olmayabilir" durumu bu eşleşmeyi
bozmaz; ortada konum eşleştirmesi (join) yok. Eşleşme kaçıyorsa sebep ya
normalize'ın anahtarı tam temizleyememesi ya da sözlükte o kelimenin hiç
olmamasıdır. Bu betik ikisini ayırır.

Kullanım:
    python3 lugat_denetim.py <kuran-mushaf.json> <arapca-lugat.json>
    (yollar bulunamazsa makul yerlerde aranır)

Seçenekler:
    --eksik 40     en sık kaçan kelimelerden kaç tanesi listelensin (varsayılan 25)
    --ornek        kaçan kelimeler için örnek âyet konumu da yazdır

Dosyaları DEĞİŞTİRMEZ.
"""

import json
import os
import re
import sys
from collections import Counter, defaultdict

# ── KuranOkuma.jsx'teki normalize'ın BİREBİR karşılığı ──────────────────────
MEVCUT_RE = re.compile(
    "[\u0610-\u061A\u064B-\u065F\u0640\u0670\u06D6-\u06DC\u06DF-\u06E4"
    "\u06E7\u06E8\u06EA-\u06ED\u08D1\u08D6]"
)
# ÖNERİLEN = mevcut + veride geçtiği hâlde temizlenmeyen DÖRT kod.
# DİKKAT — geniş bir aralık (06D6-06ED veya 08D0-08FF) YAZILAMAZ:
#   • U+06E5/U+06E6 (küçük vav/ya) sözlük ANAHTARLARINDA kullanılıyor
#     (ör. "ءاتىنۦ"); silinirse tutan eşleşmeler bozulur.
#   • U+08D1 mevcut listede zaten var ve veride geçiyor; aralık dışı bırakmak
#     yüzlerce eşleşmeyi kaybettiriyordu (ilk denemede net -111 vermişti).
# Bu yüzden ekleme CERRAHİ: yalnız 08D5, 08D7, 08D9, 08DE.
ONERILEN_RE = re.compile(
    "[\u0610-\u061A\u064B-\u065F\u0640\u0670\u06D6-\u06DC\u06DF-\u06E4"
    "\u06E7\u06E8\u06EA-\u06ED\u08D1\u08D5\u08D6\u08D7\u08D9\u08DE]"
)
ELIF_RE = re.compile("[ٱآأإ]")
# Anahtarda hâlâ işaret kaldı mı? (denetim için)
ISARET_RE = re.compile(
    "[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]"
)


def normalize(k, desen, son_kural=False):
    """son_kural=True → kelime sonundaki ي, ى yapılır.

    Bu kural ölçümle benimsendi (+3161 kelime, kayıp 0) ve artık
    KuranOkuma.jsx'teki normalize'da da var. Betiğin uygulamayla aynı
    davranması için ÖNERİLEN çalıştırmada açılır.
    """
    k = desen.sub("", k)
    k = ELIF_RE.sub("ا", k)
    k = re.sub("^ال", "ل", k)
    k = k.strip()
    if son_kural:
        k = re.sub("ي$", "ى", k)
    return k


def yol_coz(verilen, ipuclari=()):
    if os.path.isfile(verilen):
        return verilen
    adi = os.path.basename(verilen)
    adaylar = []
    for kok in (os.path.dirname(os.path.abspath(__file__)), os.path.abspath(os.getcwd())):
        for _ in range(5):
            adaylar += [os.path.join(kok, verilen), os.path.join(kok, adi),
                        os.path.join(kok, "data", adi),
                        os.path.join(kok, "src", "data", adi)]
            kok = os.path.dirname(kok)
    for a in adaylar:
        if os.path.isfile(a):
            return a
    print(f"HATA: '{verilen}' bulunamadı.")
    sys.exit(1)


def kelimeleri_topla(d, yol="", konum=None, out=None):
    """(kelime_id, arabic) çiftleri. Şekilden bağımsız: `arabic` alanlarını toplar."""
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
            kelimeleri_topla(v, yol, yeni, out)
    elif isinstance(d, list):
        for v in d:
            kelimeleri_topla(v, yol, konum, out)
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    kac = 25
    if "--eksik" in sys.argv:
        kac = int(sys.argv[sys.argv.index("--eksik") + 1])
    ornek_goster = "--ornek" in sys.argv

    mushaf_yolu = yol_coz(args[0])
    lugat_yolu = yol_coz(args[1])
    print(f"mushaf : {mushaf_yolu}")
    print(f"lügat  : {lugat_yolu}\n")

    mushaf = json.load(open(mushaf_yolu, encoding="utf-8"))
    lugat = json.load(open(lugat_yolu, encoding="utf-8"))

    # ── 1) Sözlük neye benziyor? ────────────────────────────────────────────
    print("=" * 74)
    print("1) SÖZLÜK YAPISI")
    print("=" * 74)
    print(f"  tip: {type(lugat).__name__}")
    if isinstance(lugat, dict):
        anahtarlar = list(lugat.keys())
        print(f"  kayıt sayısı: {len(anahtarlar)}")
        print(f"  ilk 5 anahtar: {anahtarlar[:5]}")
        ilk = lugat[anahtarlar[0]] if anahtarlar else None
        print(f"  bir kaydın şekli: {json.dumps(ilk, ensure_ascii=False)[:200]}")
        # KRİTİK: sözlük anahtarlarının kendisi işaret taşıyor mu?
        isaretli = [a for a in anahtarlar if ISARET_RE.search(a)]
        print(f"\n  İŞARET TAŞIYAN ANAHTAR: {len(isaretli)} / {len(anahtarlar)}")
        if isaretli:
            print("    örnek:", isaretli[:5])
            print("    → Sözlük harekeli/işaretli kurulmuş. Bu durumda normalize'ı")
            print("      DAHA ÇOK temizlemek eşleşmeyi BOZAR; sözlüğü yeniden anahtarlamak gerekir.")
        else:
            print("    → Sözlük TEMİZ anahtarlarla kurulmuş. Kelime tarafında kalan")
            print("      her işaret doğrudan kayba yol açar.")
    else:
        print("  (sözlük dict değil — eşleştirme mantığı farklı olabilir)")
        sys.exit(0)
    print()

    # ── 2) Kelimeler ────────────────────────────────────────────────────────
    kelimeler = kelimeleri_topla(mushaf)
    print("=" * 74)
    print("2) EŞLEŞME ORANI")
    print("=" * 74)
    print(f"  mushafta kelime: {len(kelimeler)}")

    sonuc = {}
    for etiket, desen, son in (("MEVCUT normalize (eski)", MEVCUT_RE, False),
                               ("ÖNERİLEN normalize (yeni)", ONERILEN_RE, True)):
        tut = 0
        kacan = Counter()
        kacan_ornek = {}
        kirli = 0
        for kid, kel in kelimeler:
            anahtar = normalize(kel, desen, son)
            if ISARET_RE.search(anahtar):
                kirli += 1
            if anahtar in lugat:
                tut += 1
            else:
                kacan[anahtar] += 1
                kacan_ornek.setdefault(anahtar, kid)
        oran = 100.0 * tut / max(1, len(kelimeler))
        print(f"\n  {etiket}")
        print(f"    eşleşen : {tut:>6}  (%{oran:.1f})")
        print(f"    kaçan   : {len(kelimeler)-tut:>6}")
        print(f"    anahtarında HÂLÂ işaret kalan kelime: {kirli}")
        sonuc[etiket] = (tut, kacan, kacan_ornek)

    fark = sonuc["ÖNERİLEN normalize (yeni)"][0] - sonuc["MEVCUT normalize (eski)"][0]
    print(f"\n  >> Sadece normalize düzeltilerek kazanılacak kelime: {fark}")

    # ── 3) En sık kaçanlar ──────────────────────────────────────────────────
    tut, kacan, kacan_ornek = sonuc["ÖNERİLEN normalize (yeni)"]
    print("\n" + "=" * 74)
    print(f"3) ÖNERİLEN normalize İLE HÂLÂ KAÇAN KELİMELER (ilk {kac})")
    print("=" * 74)
    print("  Bunlar sözlükte GERÇEKTEN yok demektir; normalize ile çözülmezler.")
    print(f"  farklı kaçan kelime sayısı: {len(kacan)}\n")
    for anahtar, adet in kacan.most_common(kac):
        yer = f"  (ör. {kacan_ornek[anahtar]})" if ornek_goster else ""
        print(f"    {adet:>5} kez   {anahtar}{yer}")

    # ── 4) Sadece 08Dx yüzünden kaçanlar ────────────────────────────────────
    print("\n" + "=" * 74)
    print("4) YALNIZCA EKSİK TEMİZLİK YÜZÜNDEN KAÇANLAR")
    print("=" * 74)
    ornekler = defaultdict(list)
    for kid, kel in kelimeler:
        a_eski = normalize(kel, MEVCUT_RE)
        a_yeni = normalize(kel, ONERILEN_RE, True)
        if a_eski != a_yeni and a_eski not in lugat and a_yeni in lugat:
            kalan = "".join(sorted({c for c in a_eski if ISARET_RE.match(c)}))
            for c in kalan:
                ornekler[f"U+{ord(c):04X}"].append((kid, kel, a_yeni))
    if not ornekler:
        print("  YOK — normalize bu veride tam temizliyor.")
    else:
        for kod, liste in sorted(ornekler.items(), key=lambda x: -len(x[1])):
            print(f"\n  {kod}: {len(liste)} kelime kurtarılıyor")
            for kid, kel, a in liste[:4]:
                print(f"      {kid:<12} {kel}   →  {a}")


    # ── 5) SÖZLÜK ANAHTARLARINDA GEÇEN İŞARETLER ────────────────────────────
    # Bunlar SİLİNMEMELİ; silinirse tutan eşleşmeler bozulur. (İlk denemede
    # geniş aralık yazıp U+06E5/06E6'yı silmek net -111 kayıp vermişti.)
    print("\n" + "=" * 74)
    print("5) SÖZLÜK ANAHTARLARINDA GEÇEN İŞARETLER — SİLİNMEMELİ")
    print("=" * 74)
    anahtar_isaret = Counter()
    for a2 in lugat:
        for c in a2:
            if ISARET_RE.match(c):
                anahtar_isaret[ord(c)] += 1
    if not anahtar_isaret:
        print("  yok")
    else:
        import unicodedata as _u
        for cp, n in anahtar_isaret.most_common():
            try:
                adi = _u.name(chr(cp))
            except ValueError:
                adi = "<isimsiz>"
            print(f"    U+{cp:04X}  {n:>5} anahtarda   {adi}")

    # ── 6) KURAL LABORATUVARI ───────────────────────────────────────────────
    # Kalan kaçakların büyük kısmı İMLÂ farkı gibi duruyor: sözlük "ءامنوا",
    # "فى" gibi Osmanî yazımı kullanıyor olabilir; mushaf "اٰمنوا", "في" yazıyor.
    # Tahmin etmek yerine her aday kuralı TEK TEK ölçüyoruz: kural kaç kelime
    # kazandırıyor, kaç kelime KAYBETTİRİYOR?
    print("\n" + "=" * 74)
    print("6) KURAL LABORATUVARI — aday imlâ kuralları tek tek ölçüldü")
    print("=" * 74)

    KURALLAR = [
        ("ءا → ا  (hemze+elif sadeleşsin)", lambda t: t.replace("ءا", "ا")),
        ("ا → ءا  (baştaki elif hemzelensin)", lambda t: re.sub("^ا", "ءا", t)),
        ("ي → ى  (kelime SONUNDA)", lambda t: re.sub("ي$", "ى", t)),
        ("ى → ي  (kelime SONUNDA)", lambda t: re.sub("ى$", "ي", t)),
        ("ي → ى  (her yerde)", lambda t: t.replace("ي", "ى")),
        ("ة → ه", lambda t: t.replace("ة", "ه")),
        ("و → ۇ yok / وا sonu sadeleş", lambda t: re.sub("وا$", "و", t)),
        ("baştaki ل → ال geri al", lambda t: re.sub("^ل", "ال", t)),
    ]

    taban_anahtar = [normalize(kel, ONERILEN_RE, True) for _, kel in kelimeler]
    taban_tut = sum(1 for a2 in taban_anahtar if a2 in lugat)
    print(f"  taban (ÖNERİLEN normalize): {taban_tut} eşleşme\n")
    print(f"  {'KURAL':<38}{'KAZANÇ':>8}{'KAYIP':>8}{'NET':>8}")
    print("  " + "-" * 62)
    puanlar = []
    for adi, fn in KURALLAR:
        kazanc = kayip = 0
        for a2 in taban_anahtar:
            y = fn(a2)
            if y == a2:
                continue
            eski_var, yeni_var = a2 in lugat, y in lugat
            if yeni_var and not eski_var:
                kazanc += 1
            elif eski_var and not yeni_var:
                kayip += 1
        puanlar.append((adi, kazanc, kayip, kazanc - kayip))
        print(f"  {adi:<38}{kazanc:>8}{kayip:>8}{kazanc-kayip:>8}")
    print("\n  NET'i pozitif olanlar uygulanmaya değer. Uygulamadan önce")
    print("  hepsini birlikte ölçmek gerekir; kurallar birbirini etkileyebilir.")

    # En iyi kuralları AÇGÖZLÜ biriktirip birlikte ölç
    secili = [(adi, fn) for (adi, fn), (_, k, ky, net) in zip(KURALLAR, puanlar) if net > 0]
    if secili:
        birlesik = 0
        for a2 in taban_anahtar:
            y = a2
            for _, fn in secili:
                if y not in lugat:
                    y = fn(y)
            if y in lugat:
                birlesik += 1
        print(f"\n  Pozitif kurallar BİRLİKTE: {birlesik} eşleşme "
              f"(taban {taban_tut}, kazanç +{birlesik - taban_tut})")
        print(f"  Toplam oran: %{100.0*birlesik/max(1,len(kelimeler)):.1f}")



    # ── 7) KELİME BÖLÜNMESİ — sözlük bitişik, mushaf ayrı yazmış olabilir ───
    # Gözlem (Bakara 2:40): mushaf "يَا" + "بَنِي" diye İKİ kelime tutuyor,
    # sözlük ise "يـبنى" gibi TEK kayıt. Bu yüzden iki kelime de anlamsız kalıyor.
    # Kaçan listesinde "يا" (160) ve "ياايها" (134) yan yana durması bunun izi.
    # Ölçüm: kaçan bir kelimeyi SONRAKİ kelimeyle birleştirince sözlükte bulunuyor mu?
    print("\n" + "=" * 74)
    print("7) KELİME BİRLEŞTİRME DENEMESİ (kaçan + sonraki kelime)")
    print("=" * 74)
    # Aynı âyetin kelimelerini sırayla topla: id "2:40:1" -> ("2:40", 1)
    def parcala(kid):
        p2 = kid.split(":")
        if len(p2) >= 3 and all(x.isdigit() for x in p2[:3]):
            return ":".join(p2[:2]), int(p2[2])
        return None, None

    sirali = []
    for kid, kel in kelimeler:
        ay, sira = parcala(kid)
        if ay:
            sirali.append((ay, sira, kid, kel))
    sirali.sort(key=lambda x: (x[0], x[1]))

    kazanc = 0
    ornek = []
    for i, (ay, sira, kid, kel) in enumerate(sirali):
        a1 = normalize(kel, ONERILEN_RE, True)
        if a1 in lugat:
            continue
        if i + 1 >= len(sirali) or sirali[i + 1][0] != ay:
            continue
        a2 = normalize(sirali[i + 1][3], ONERILEN_RE, True)
        birlesik = a1 + a2
        if birlesik in lugat:
            kazanc += 1
            if len(ornek) < 12:
                ornek.append((kid, kel, sirali[i + 1][3], birlesik))
    print(f"  Sonraki kelimeyle birleşince BULUNAN kelime sayısı: {kazanc}")
    if ornek:
        print("\n  örnekler (iki kelime → tek sözlük kaydı):")
        for kid, k1, k2, b in ornek:
            print(f"    {kid:<12} {k1} + {k2}   →  {b}")
    else:
        print("  (birleştirme bir şey kazandırmıyor — bölünme farkı bu değil)")

    # Ayrıca: kaçan kelime ÖNCEKİYLE birleşiyor mu?
    kazanc2 = 0
    for i, (ay, sira, kid, kel) in enumerate(sirali):
        a1 = normalize(kel, ONERILEN_RE, True)
        if a1 in lugat or i == 0 or sirali[i - 1][0] != ay:
            continue
        if normalize(sirali[i - 1][3], ONERILEN_RE, True) + a1 in lugat:
            kazanc2 += 1
    print(f"\n  ÖNCEKİ kelimeyle birleşince bulunan: {kazanc2}")
    print(f"  (ikisi birden uygulanırsa üst sınır ≈ {kazanc + kazanc2} kelime)")


    # ── 8) ELİF DÜŞÜRME YEDEĞİ ──────────────────────────────────────────────
    # Kalan kaçakların deseni tek bir farka işaret ediyor: sözlük OSMANÎ imlâda,
    # uzun â'yı elifsiz yazıyor (üstteki küçük elifle), mushaf ise tam elifle:
    #     لكتاب ↔ لكتب · لعالمين ↔ لعلمين · جنات ↔ جنت · خالدين ↔ خلدين
    # Bizim normalize üstteki küçük elifi (U+0670) sildiği için sözlük anahtarı
    # elifsiz kalıyor, bizimki elifli. Çözüm: TAM eşleşme tutmazsa elifsiz biçimle
    # bir kez daha ara. Ama bu kayıplı bir işlem — iki farklı kelime aynı elifsiz
    # biçime düşebilir. Bu yüzden ÖNCE ölçüyoruz: kaçı kurtuluyor, kaçı BELİRSİZ?
    print("\n" + "=" * 74)
    print("8) ELİF DÜŞÜRME YEDEĞİ (tam eşleşme tutmazsa son çare)")
    print("=" * 74)

    def elifsiz(t):
        # baştaki elif korunur (kelimenin kimliği), içerdekiler düşer
        return t[:1] + t[1:].replace("ا", "") if t else t

    # Sözlüğü elifsiz biçime göre indeksle; çakışanları işaretle
    yedek = defaultdict(set)
    for anah in lugat:
        yedek[elifsiz(anah)].add(anah)
    tekil = {k: next(iter(v)) for k, v in yedek.items() if len(v) == 1}
    cakisan = {k: v for k, v in yedek.items() if len(v) > 1}
    print(f"  sözlük: {len(yedek)} farklı elifsiz biçim "
          f"({len(tekil)} tekil, {len(cakisan)} çakışan)")

    kurtulan = belirsiz = 0
    ornek2 = []
    for kid, kel in kelimeler:
        a1 = normalize(kel, ONERILEN_RE, True)
        if a1 in lugat:
            continue
        e = elifsiz(a1)
        if e in tekil:
            kurtulan += 1
            if len(ornek2) < 10:
                ornek2.append((kid, a1, tekil[e]))
        elif e in cakisan:
            belirsiz += 1
    print(f"\n  TEKİL eşleşmeyle kurtulan kelime : {kurtulan}")
    print(f"  ÇAKIŞMA yüzünden atlanan          : {belirsiz}")
    yeni_oran = 100.0 * (tut + kurtulan) / max(1, len(kelimeler))
    print(f"  Uygulanırsa toplam oran: %{yeni_oran:.1f}  (şu an %{100.0*tut/len(kelimeler):.1f})")
    if ornek2:
        print("\n  örnekler (bizim anahtar → sözlükteki karşılık):")
        for kid, a1, hedef in ornek2:
            print(f"    {kid:<12} {a1}  →  {hedef}")


if __name__ == "__main__":
    main()
