#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QURAN.COM KELİME KELİME (word-by-word) TÜRKÇE VERİSİ — çekme ve hizalama.

NEDEN: quran.com API'si kelime kelime çeviriyi TÜRKÇE veriyor (language=tr).
Yani çeviri işi YOK. Üstelik anlam KELİME KONUMUNA bağlı olduğu için, bizdeki
"من kelimesinin 710 anlamı var" sorunu da kendiliğinden çözülür: her geçtiği
yerde o yere ait anlam gösterilir.

SORUN: quran.com'un kelime bölümlemesi bizimkiyle aynı değil. Ölçülen örnek:
    quran.com  2:40:1 = يَـٰبَنِىٓ   ("ey oğulları")      → TEK kelime
    bizde      2:40:1 = يَا , 2:40:2 = بَنٖي              → İKİ kelime
Bu yüzden konumdan konuma eşleme yapılamaz; kayar. Çözüm: HİZALAMA tablosu.

İki kip:

  0) DENEME    python3 wbw.py --test
     Tek âyet çeker; erişim çalışıyor mu, Türkçe geliyor mu görürsün.

  1) ÇEKME     python3 wbw.py --cek
     114 sûreyi tek tek indirir, wbw_tr.json'a yazar. Yarıda kalırsa aynı
     komutla kaldığı yerden devam eder (indirilmiş sûreyi tekrar istemez).

  2) HİZALAMA  python3 wbw.py --hizala ../data/kuran-mushaf.json
     Bizim kelimelerle onlarınkini âyet âyet eşler, kelime_hizalama.json
     üretir ve nerelerde bölünme farkı olduğunu raporlar.

  3) BİRLEŞTİR python3 wbw.py --birlestir
     Hizalamayı uygulayıp BİZİM id'lerimize göre kelime-anlam.json üretir.

  7) KARŞILAŞTIR  python3 wbw.py --karsilastir A.json B.json
     İki mushaf kopyası aynı mı? (src/data ile public/ ayrışmış olabilir.)

  6) TEMİZLE   python3 wbw.py --temizle ../data/kuran-mushaf.json
     Mushaf verisindeki ÇİFT KAYITLI kelimeleri raporlar (yalnız rapor).
     --yaz eklenirse kuran-mushaf-temiz.json yazar; ORİJİNALE DOKUNMAZ.
     Gerçek tekrarlara (هَيْهَاتَ هَيْهَاتَ) dokunmaz — ölçüt quran.com.

  5) TEK ÂYET  python3 wbw.py ../data/kuran-mushaf.json --ayet 17:101
     Bir âyeti iki taraftan yan yana döker; şüpheli yerleri incelemek için.

  4) RAPOR     python3 wbw.py --rapor ../data/kuran-mushaf.json
     Nerelerde birleşme olduğunu tek tek listeler.
     python3 wbw.py --rapor ../data/kuran-mushaf.json --kelime يا
     Belirli bir kelimenin HER geçtiği yeri ve birleşip birleşmediğini gösterir.

Hiçbir mevcut dosyayı değiştirmez.
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from collections import Counter
from difflib import SequenceMatcher

API = ("https://api.quran.com/api/v4/verses/by_chapter/{sure}"
       "?words=true&language=tr&word_fields=text_uthmani,location"
       "&per_page=50&page={sayfa}")

# urllib'in varsayılan User-Agent'ı ("Python-urllib/3.x") CDN tarafından
# 403 ile reddediliyor. Aynı adres tarayıcı başlığıyla sorunsuz cevap veriyor,
# yani mesele yetki değil başlık. Normal bir UA ile istiyoruz.
BASLIK = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "tr,en;q=0.8",
}


def json_al(url, deneme=4):
    """GET + JSON. 429/5xx'te artan bekleme ile tekrar dener."""
    son = None
    for i in range(deneme):
        try:
            istek = urllib.request.Request(url, headers=BASLIK)
            with urllib.request.urlopen(istek, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            son = e
            govde = ""
            try:
                govde = e.read().decode("utf-8", "replace")[:300]
            except Exception:
                pass
            if e.code in (429, 500, 502, 503, 504):
                bekle = 2 ** i
                print(f"    {e.code} — {bekle} sn sonra tekrar…")
                time.sleep(bekle)
                continue
            raise RuntimeError(f"HTTP {e.code}\n    cevap: {govde}") from e
        except Exception as e:
            son = e
            time.sleep(2 ** i)
    raise RuntimeError(f"başarısız: {son}")

# ── İSKELET: iki kaynağın imlâsı farklı, karşılaştırma için sadeleştirilir ──
# İşaretler/harekeler atılır, elif ve ye biçimleri birleştirilir. Harf silinmez:
# kelime sınırını bulmak için gereken bilgi harflerde. İmlâ farkından doğan
# tek-iki harflik sapmalar (اِسْرَٓائٖلَ ↔ إِسْرَٰٓءِيلَ) benzerlik oranıyla soğurulur.
ISARET = re.compile("[ؐ-ًؚ-ٟـٰۖ-ۭ࢘-࢟࣊-ࣿ]")
DEGISIM = str.maketrans({
    "آ": "ا", "أ": "ا", "إ": "ا", "ٱ": "ا",
    "ى": "ي", "ة": "ه", "ؤ": "ء", "ئ": "ء",
})


def iskelet(t):
    t = ISARET.sub("", str(t or "")).translate(DEGISIM)
    return "".join(c for c in t if "ء" <= c <= "ي")


def yol_coz(verilen, sessiz=False):
    """Yol yoksa makul yerlerde arar.

    UYARI: bu arama SESSİZ olursa tehlikeli. Var olmayan bir yol verildiğinde
    aynı adlı BAŞKA bir dosyaya düşüp, iki farklı dosyayı karşılaştırdığını
    sanırken aynı dosyayı kendisiyle karşılaştırabilir. Bu yüzden her düşüş
    ekrana yazılır.
    """
    if os.path.isfile(verilen):
        return os.path.realpath(verilen)
    adi = os.path.basename(verilen)
    for kok in (os.path.dirname(os.path.abspath(__file__)), os.path.abspath(os.getcwd())):
        for _ in range(5):
            for a in (os.path.join(kok, verilen), os.path.join(kok, adi),
                      os.path.join(kok, "data", adi), os.path.join(kok, "src", "data", adi)):
                if os.path.isfile(a):
                    if not sessiz:
                        print(f"  ⚠ '{verilen}' yok — şuna düşüldü: {os.path.realpath(a)}")
                    return os.path.realpath(a)
            kok = os.path.dirname(kok)
    print(f"HATA: '{verilen}' bulunamadı.")
    sys.exit(1)


# ══════════════════════════════════════════════════════════════════════════
def cek(hedef="wbw_tr.json", bekleme=0.34):
    veri = {}
    if os.path.isfile(hedef):
        veri = json.load(open(hedef, encoding="utf-8"))
        print(f"mevcut dosya okundu: {len(veri)} kelime")
    bitmis = {k.split(":")[0] for k in veri}
    for sure in range(1, 115):
        if str(sure) in bitmis:
            continue
        sayfa, alinan = 1, 0
        while True:
            url = API.format(sure=sure, sayfa=sayfa)
            try:
                d = json_al(url)
            except Exception as e:                      # ağ hatası → kaydet ve çık
                json.dump(veri, open(hedef, "w", encoding="utf-8"), ensure_ascii=False)
                print(f"\nHATA (sûre {sure}, sayfa {sayfa}): {e}")
                print(f"{len(veri)} kelime kaydedildi. Aynı komutla devam edebilirsin.")
                if "403" in str(e):
                    print("\n403 sürerse quran.com yeni API'ye geçmiş olabilir;")
                    print("o zaman anahtar gerekir: https://api-docs.quran.foundation")
                sys.exit(1)
            for ayet in d.get("verses", []):
                for k in ayet.get("words", []):
                    yer = k.get("location")
                    if not yer:
                        continue
                    ceviri = (k.get("translation") or {})
                    veri[yer] = {
                        "ar": k.get("text_uthmani") or k.get("text") or "",
                        "tr": ceviri.get("text") or "",
                        "dil": ceviri.get("language_name") or "",
                        "tip": k.get("char_type_name") or "",
                    }
                    alinan += 1
            sf = d.get("pagination", {})
            if not sf.get("next_page"):
                break
            sayfa = sf["next_page"]
            time.sleep(bekleme)
        print(f"  sûre {sure:>3}: {alinan} kelime   (toplam {len(veri)})")
        json.dump(veri, open(hedef, "w", encoding="utf-8"), ensure_ascii=False)
        time.sleep(bekleme)
    print(f"\nBİTTİ → {hedef}  ({len(veri)} kelime)")


# ══════════════════════════════════════════════════════════════════════════
def bizim_kelimeler(d, konum=None, out=None):
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
            bizim_kelimeler(v, yeni, out)
    elif isinstance(d, list):
        for v in d:
            bizim_kelimeler(v, konum, out)
    return out


def benzerlik(x, y):
    """0..1. Tam eşitlik ARANMAZ — iki kaynağın imlâsı farklı:
         bizde  اِسْرَٓائٖلَ  (uzun î küçük işaretle)   → iskelet "سراءل"
         onlarda إِسْرَٰٓءِيلَ (uzun î tam ي ile)        → iskelet "سراءيل"
    Aynı kelime, tek harf fark. Eşitlik şartı koyunca âyetin tamamı
    hizalanamıyordu; onun için benzerlik oranıyla çalışılır."""
    if x == y:
        return 1.0
    return SequenceMatcher(None, x, y).ratio()


def ayet_hizala(bizde, onlarda, en_az=0.62, pencere=3, esik=0.5):
    """Dinamik programlama ile en iyi gruplamayı bulur.

    Bizim N kelimemizi onların M kelimesine, sırayı bozmadan, en yüksek
    toplam benzerliği verecek şekilde böler. Bir gruba en çok `pencere`
    kelime girebilir (1↔1, 2↔1, 1↔2 … hepsi mümkün).
    Dönüş: ([(bizim_idler, onlarin_idleri)], ortalama_benzerlik) ya da None.
    """
    n, m = len(bizde), len(onlarda)
    if not n or not m:
        return None
    NEG = float("-inf")
    puan = [[NEG] * (m + 1) for _ in range(n + 1)]
    geri = [[None] * (m + 1) for _ in range(n + 1)]
    puan[0][0] = 0.0
    bi = ["" ] + [iskelet(w[1]) for w in bizde]
    oi = ["" ] + [iskelet(w[1]) for w in onlarda]
    for i in range(n + 1):
        for j in range(m + 1):
            if puan[i][j] == NEG:
                continue
            for a in range(1, min(pencere, n - i) + 1):
                for b in range(1, min(pencere, m - j) + 1):
                    sol = "".join(bi[i + 1:i + a + 1])
                    sag = "".join(oi[j + 1:j + b + 1])
                    # PUANLAMA: benzerlikten bir EŞİK düşülür.
                    # Düşülmezse kötü bir eşleşme (ör. "يا" ↔ "يَـٰمُوسَىٰ",
                    # benzerlik ~0,4) hâlâ ARTI puan kazanıyor; âyette kelime
                    # sayıları denk geldiğinde DP, bir doğru birleşme yerine iki
                    # kötü 1↔1'i seçebiliyordu (17:101, 17:102, 39:16 böyle kaçtı).
                    # Eşik sonrası kötü eşleşme EKSİ puan olur, birleşme kazanır.
                    p = (puan[i][j] + benzerlik(sol, sag) - esik
                         - 0.05 * (a + b - 2))
                    if p > puan[i + a][j + b]:
                        puan[i + a][j + b] = p
                        geri[i + a][j + b] = (a, b)
    if puan[n][m] == NEG:
        return None
    yol = []
    i, j = n, m
    while i or j:
        adim = geri[i][j]
        if not adim:
            return None
        a, b = adim
        yol.append(([w[0] for w in bizde[i - a:i]], [w[0] for w in onlarda[j - b:j]]))
        i -= a
        j -= b
    yol.reverse()
    ort = puan[n][m] / max(1, len(yol)) + esik   # eşiği geri ekle → 0..1 ölçeği
    if ort < en_az:
        return None
    return yol, ort


def hizala(mushaf_yolu, wbw_yolu="wbw_tr.json", cikti="kelime_hizalama.json"):
    mushaf = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    if not os.path.isfile(wbw_yolu):
        print(f"HATA: {wbw_yolu} yok. Önce:  python3 wbw.py --cek")
        sys.exit(1)
    wbw = json.load(open(wbw_yolu, encoding="utf-8"))

    biz = {}
    for kid, ar in bizim_kelimeler(mushaf):
        p = kid.split(":")
        if len(p) >= 3 and all(x.isdigit() for x in p[:3]):
            biz.setdefault(f"{p[0]}:{p[1]}", []).append((kid, ar))

    onlar = {}
    for yer, v in wbw.items():
        # âyet numarası jetonu ("end" tipi) kelime değildir — dışarıda bırakılır
        if v.get("tip") == "end":
            continue
        p = yer.split(":")
        if len(p) >= 3:
            onlar.setdefault(f"{p[0]}:{p[1]}", []).append((yer, v["ar"]))
    for k in onlar:
        onlar[k].sort(key=lambda x: int(x[0].split(":")[2]))

    tam = bolunme = basarisiz = yok = 0
    harita, sorunlu = {}, []
    for ay, bl in biz.items():
        ol = onlar.get(ay)
        if not ol:
            yok += 1
            continue
        sonuc = ayet_hizala(bl, ol)
        c = sonuc[0] if sonuc else None
        if c is None:
            basarisiz += 1
            sorunlu.append({"ayet": ay, "bizde": len(bl), "onlarda": len(ol),
                            "bizim": [x[1] for x in bl], "onlarin": [y[1] for y in ol]})
            continue
        if all(len(a) == 1 and len(b) == 1 for a, b in c):
            tam += 1
        else:
            bolunme += 1
        for bizimler, onlarinkiler in c:
            for bid in bizimler:
                harita[bid] = onlarinkiler[0] if len(onlarinkiler) == 1 else onlarinkiler

    print("=" * 74)
    print("HİZALAMA SONUCU")
    print("=" * 74)
    print(f"  âyet: {len(biz)}")
    print(f"    birebir eşleşen        : {tam}")
    print(f"    BÖLÜNME farkı olan     : {bolunme}")
    print(f"    hizalanamayan          : {basarisiz}")
    print(f"    karşılığı bulunamayan  : {yok}")
    print(f"  eşlenen kelime: {len(harita)}")

    if sorunlu:
        print(f"\n  ── hizalanamayan ilk 10 âyet ──")
        for s in sorunlu[:10]:
            print(f"    {s['ayet']}  bizde {s['bizde']} / onlarda {s['onlarda']}")
            print(f"       biz : {' | '.join(s['bizim'][:10])}")
            print(f"       api : {' | '.join(s['onlarin'][:10])}")

    json.dump(harita, open(cikti, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(sorunlu, open("hizalama_sorunlu.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"\n  yazıldı: {cikti} ({os.path.getsize(cikti)//1024} KB)")
    print(f"  yazıldı: hizalama_sorunlu.json ({len(sorunlu)} âyet)")


def birlestir(wbw_yolu="wbw_tr.json", harita_yolu="kelime_hizalama.json",
              cikti="kelime-anlam.json", grup_cikti="kelime-grup.json"):
    """Hizalamayı kullanarak BİZİM kelime id'lerine göre anlam dosyası üretir.

    Uygulama artık sözlükte kelime aramak yerine doğrudan
        kelimeAnlam[kelime.id]
    diyebilir. Anlam KONUMA ait olduğu için "من kelimesinin 710 anlamı"
    sorunu ortadan kalkar: her yerde o yerin anlamı gösterilir.
    """
    for y in (wbw_yolu, harita_yolu):
        if not os.path.isfile(y):
            print(f"HATA: {y} yok. Önce --cek ve --hizala çalıştır.")
            sys.exit(1)
    wbw = json.load(open(wbw_yolu, encoding="utf-8"))
    harita = json.load(open(harita_yolu, encoding="utf-8"))

    anlamlar, gruplar = {}, {}
    bos = 0
    diller = Counter()
    # Bir quran.com kelimesine BİRDEN ÇOK kelimemiz düşüyorsa (يا + بني gibi),
    # o kelimelerin birleşik Arapça hâli ayrı dosyada tutulur ki açılan
    # baloncuk "hangi iki kelimenin anlamı" olduğunu gösterebilsin.
    ters = {}
    for bizim, onlarinki in harita.items():
        hedef = onlarinki[0] if isinstance(onlarinki, list) else onlarinki
        ters.setdefault(hedef, []).append(bizim)

    for bizim, onlarinki in harita.items():
        hedef = onlarinki[0] if isinstance(onlarinki, list) else onlarinki
        k = wbw.get(hedef)
        if not k or not k.get("tr"):
            bos += 1
            continue
        anlamlar[bizim] = k["tr"]
        diller[k.get("dil") or "?"] += 1
        kardes = ters.get(hedef, [])
        if len(kardes) > 1:
            # UI'ın bu kelimeleri TEK BİRİM gibi davranması için üye listesi de
            # verilir: baloncuk ikisini birden göstersin, kelime kelime ilerlerken
            # ikinci üyeye ayrıca durup aynı anlamı tekrar etmesin.
            gruplar[bizim] = {"ar": k.get("ar", ""), "uyeler": sorted(
                kardes, key=lambda x: [int(t) for t in x.split(":")])}

    json.dump(anlamlar, open(cikti, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(gruplar, open(grup_cikti, "w", encoding="utf-8"), ensure_ascii=False)

    print("=" * 74)
    print("BİRLEŞTİRME SONUCU")
    print("=" * 74)
    print(f"  haritadaki kelime : {len(harita)}")
    print(f"  anlamı olan       : {len(anlamlar)}  (%{100.0*len(anlamlar)/max(1,len(harita)):.1f})")
    print(f"  anlamı BOŞ        : {bos}")
    farkli = len({tuple(v["uyeler"]) for v in gruplar.values()})
    print(f"  birleşik gösterim : {len(gruplar)} kelime ({farkli} farklı grup)")
    print("\n  çeviri dili dağılımı:")
    for d, n in diller.most_common():
        print(f"    {d:<12} {n}")
    for f in (cikti, grup_cikti):
        print(f"\n  yazıldı: {f}  ({os.path.getsize(f)//1024} KB)")
    print("\n  Bu iki dosyayı src/data/ altına koy; KuranOkuma bunları okuyacak.")


def rapor(mushaf_yolu, wbw_yolu="wbw_tr.json", harita_yolu="kelime_hizalama.json",
          aranan=None):
    """Nerede birleşme oldu, nerede olmadı — tek tek göster.

    `--kelime يا` verilirse: bizde o kelime nerede geçiyorsa hepsini listeler ve
    her biri için BİRLEŞTİ mi yoksa tek başına mı eşlendi, onu yazar. Böylece
    "şurada birleşmemiş" şüphesi tek tek doğrulanabilir.
    """
    mushaf = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    wbw = json.load(open(wbw_yolu, encoding="utf-8"))
    harita = json.load(open(harita_yolu, encoding="utf-8"))

    biz = {kid: ar for kid, ar in bizim_kelimeler(mushaf)}
    ters = {}
    for bizim, o in harita.items():
        hedef = o[0] if isinstance(o, list) else o
        ters.setdefault(hedef, []).append(bizim)
    for v in ters.values():
        v.sort(key=lambda x: [int(t) for t in x.split(":")])

    if aranan:
        hedef_isk = iskelet(aranan)
        print("=" * 74)
        print(f"'{aranan}' BİZDE NEREDE GEÇİYOR ve BİRLEŞTİ Mİ?")
        print("=" * 74)
        birlesen = tekil = 0
        satirlar = []
        for kid, ar in biz.items():
            if iskelet(ar) != hedef_isk:
                continue
            o = harita.get(kid)
            hedef = (o[0] if isinstance(o, list) else o) if o else None
            kardes = ters.get(hedef, []) if hedef else []
            k = wbw.get(hedef) or {}
            if len(kardes) > 1:
                birlesen += 1
                durum = "BİRLEŞTİ → " + " + ".join(biz.get(x, "?") for x in kardes)
            else:
                tekil += 1
                durum = "tek başına"
            satirlar.append((kid, durum, k.get("ar", ""), k.get("tr", "")))
        satirlar.sort(key=lambda x: [int(t) for t in x[0].split(":")])
        for kid, durum, ar, tr in satirlar:
            print(f"  {kid:<12} {durum:<34} {ar:<18} {tr}")
        print(f"\n  toplam {len(satirlar)}   birleşen {birlesen}   tek başına {tekil}")
        return



    print("=" * 74)
    print("BÖLÜNME FARKI OLAN YERLER (bizde N kelime ↔ onlarda 1)")
    print("=" * 74)
    gruplar = [(h, v) for h, v in ters.items() if len(v) > 1]
    gruplar.sort(key=lambda x: [int(t) for t in x[0].split(":")])
    ayetler = sorted({":".join(h.split(":")[:2]) for h, _ in gruplar},
                     key=lambda a: [int(t) for t in a.split(":")])
    print(f"  etkilenen âyet: {len(ayetler)}   birleşen grup: {len(gruplar)}\n")
    for hedef, bizimler in gruplar:
        k = wbw.get(hedef) or {}
        sol = " + ".join(biz.get(x, "?") for x in bizimler)
        print(f"  {hedef:<12} {sol:<38} → {k.get('ar',''):<18} {k.get('tr','')}")

    # ── TEKRAR EDEN KELİME: birleşme değil, mushaf verisinde ÇİFT KAYIT ────
    # Belirti: gruba giren kelimelerimizin iskeletleri birbirinin AYNISI.
    # Yani aynı kelime iki kez yazılmış (biri farklı imlâda). Hizalama bunları
    # tek kelimeye bastırıp sorunu gizliyor; asıl çözüm veriden fazlayı silmek.
    print("\n" + "=" * 74)
    print("TEKRAR EDEN KELİME — aynı kelime iki kez yazılmış görünüyor")
    print("=" * 74)
    tekrar = []
    for hedef, bizimler in gruplar:
        isk = [iskelet(biz.get(x, "")) for x in bizimler]
        if len(set(isk)) == 1 and isk[0]:
            tekrar.append((hedef, bizimler, [biz.get(x, "") for x in bizimler]))
    print(f"  {len(tekrar)} yer\n")
    for hedef, ids, yazimlar in tekrar:
        print(f"  {hedef:<12} {' + '.join(ids)}")
        for i, y in zip(ids, yazimlar):
            kod = " ".join(f"U+{ord(c):04X}" for c in y if ord(c) > 0x64A)
            print(f"       {i:<12} {y}   {kod}")

    # ── ŞÜPHELİ: birleşmesi gerekirken 1↔1 kalmış olabilecekler ─────────────
    # Belirti: bizim kelime, karşısındaki quran.com kelimesinden ÇOK daha kısa.
    # Hizalama o âyette başka bir bölünmeyi seçmiş olabilir; elle bakmaya değer.
    print("\n" + "=" * 74)
    print("ŞÜPHELİ — tek başına eşleşmiş ama karşılığı belirgin şekilde UZUN")
    print("=" * 74)
    supheli = []
    for bizim, o in harita.items():
        hedef = o[0] if isinstance(o, list) else o
        if not hedef or len(ters.get(hedef, [])) > 1:
            continue
        bizimki = iskelet(biz.get(bizim, ""))
        onlarinki = iskelet((wbw.get(hedef) or {}).get("ar", ""))
        if len(bizimki) >= 2 and len(onlarinki) >= len(bizimki) * 2:
            supheli.append((bizim, biz.get(bizim, ""), hedef,
                            (wbw.get(hedef) or {}).get("ar", ""),
                            (wbw.get(hedef) or {}).get("tr", "")))
    supheli.sort(key=lambda x: [int(t) for t in x[0].split(":")])
    print(f"  {len(supheli)} kayıt\n")
    for bid, bar, hid, har, htr in supheli[:60]:
        print(f"  {bid:<12} {bar:<16} → {hid:<12} {har:<18} {htr}")
    if len(supheli) > 60:
        print(f"  … ve {len(supheli)-60} tane daha")


def ayet_bak(mushaf_yolu, ayet, wbw_yolu="wbw_tr.json", harita_yolu="kelime_hizalama.json"):
    """Tek âyeti İKİ TARAFTAN yan yana döker — hizalama neden öyle karar verdi,
    gözle görülsün. Şüpheli bir yer çıktığında ilk bakılacak yer burası."""
    mushaf = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    wbw = json.load(open(wbw_yolu, encoding="utf-8"))
    harita = json.load(open(harita_yolu, encoding="utf-8")) if os.path.isfile(harita_yolu) else {}

    bl = [(k, a) for k, a in bizim_kelimeler(mushaf)
          if ":".join(k.split(":")[:2]) == ayet]
    bl.sort(key=lambda x: int(x[0].split(":")[2]))
    ol = [(k, v["ar"]) for k, v in wbw.items()
          if ":".join(k.split(":")[:2]) == ayet and v.get("tip") != "end"]
    ol.sort(key=lambda x: int(x[0].split(":")[2]))

    print("=" * 74)
    print(f"{ayet}   bizde {len(bl)} kelime   |   quran.com {len(ol)} kelime")
    print("=" * 74)
    print("\n  BİZDE:")
    for k, a in bl:
        print(f"    {k:<12} {a:<22} iskelet={iskelet(a)}   → {harita.get(k)}")
    print("\n  QURAN.COM:")
    for k, a in ol:
        print(f"    {k:<12} {a:<22} iskelet={iskelet(a)}   {wbw[k].get('tr','')}")

    yeni = ayet_hizala(bl, ol)
    print("\n  ŞİMDİKİ AYARLARLA HİZALAMA:")
    if not yeni:
        print("    hizalanamadı")
    else:
        for a2, b2 in yeni[0]:
            sol = " + ".join(dict(bl).get(x, "?") for x in a2)
            sag = " + ".join(dict(ol).get(y, "?") for y in b2)
            print(f"    {sol:<28} → {sag}")
        print(f"    ortalama benzerlik: {yeni[1]:.3f}")


# Osmanî imlâya ait, mushafın geri kalanında kullanılmayan kodlar. Çift kayıttan
# hangisinin "yabancı" olduğunu bunlar ele veriyor (Bakara 72 ve Münâfikûn 10'da
# fazlalık olan nüsha bunları taşıyor).
YABANCI_IMLA = {0x0671, 0x06E1}
# Silinen nüshayla birlikte gitmesi NORMAL olan imlâ işaretleri. Uyarı yalnız
# gerçekten anlamlı bir işaret (vakıf/tecvid) kaybolursa çıksın diye ayrıldı.
IMLA_ARTIGI = YABANCI_IMLA | {0x0640, 0x0670, 0x0653, 0x0656}


def tekrar_temizle(mushaf_yolu, harita_yolu="kelime_hizalama.json",
                   cikti="kuran-mushaf-temiz.json", yaz=False):
    """Mushaf verisindeki ÇİFT KAYITLI kelimeleri bulur, istenirse temiz kopya yazar.

    NEDEN quran.com'a bakılıyor: Kur'an'da GERÇEK tekrarlar var —
    "هَيْهَاتَ هَيْهَاتَ" (23:36), "دَكًّا دَكًّا" (89:21) gibi. Kelime aynı diye
    silmek bunları bozar. Ölçüt şu: quran.com o yerde TEK kelime görüyor ama
    bizde AYNI iskelete sahip İKİ kelime var → bizdeki fazlalıktır. Gerçek
    tekrarlarda quran.com da iki kelime gösterir, o yüzden listeye girmezler.

    Hangisi silinecek: Osmanî imlâ kodu (ٱ / ۡ) taşıyan nüsha. Eşitse, ÜZERİNDE
    DAHA ÇOK İŞARET olan tutulur — vakıf/tecvid işareti kaybolmasın diye.
    """
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    if not os.path.isfile(harita_yolu):
        print(f"HATA: {harita_yolu} yok. Önce --cek ve --hizala çalıştır.")
        sys.exit(1)
    harita = json.load(open(harita_yolu, encoding="utf-8"))

    ters = {}
    for bizim, o in harita.items():
        hedef = o[0] if isinstance(o, list) else o
        ters.setdefault(hedef, []).append(bizim)

    metin = {kid: ar for kid, ar in bizim_kelimeler(ham)}
    isaret_say = lambda t: sum(1 for c in t if ISARET.match(c))
    yabanci_say = lambda t: sum(1 for c in t if ord(c) in YABANCI_IMLA)

    silinecek, supheli = {}, []
    for hedef, ids in ters.items():
        if len(ids) < 2:
            continue
        ids = sorted(ids, key=lambda x: [int(t) for t in x.split(":")])
        # ELİFE DUYARSIZ karşılaştırma. Çift kayıtta iki nüsha uzun â'yı farklı
        # yazıyor: biri tam elifle (الصَّالِحٖينَ), diğeri elif ÜSTÜ işaretle
        # (ٱلصَّـٰلِحِينَ). Düz iskelet bunları farklı sanıp Münâfikûn 10'u
        # kaçırıyordu. Elif düşürülünce ikisi de "لصلحين" oluyor.
        isk = [iskelet(metin.get(i, "")).replace("ا", "") for i in ids]
        if len(set(isk)) != 1 or not isk[0]:
            continue                      # farklı kelimeler → gerçek birleşme
        yb = [yabanci_say(metin[i]) for i in ids]
        if max(yb) > 0 and yb.count(max(yb)) == 1:
            at = ids[yb.index(max(yb))]   # yabancı imlâlı olan gider
        else:
            # imlâ ayırt etmiyor → üzerinde daha AZ işaret olan gider
            skor = [isaret_say(metin[i]) for i in ids]
            at = ids[skor.index(min(skor))]
            supheli.append((hedef, ids, at))
        kalan = [i for i in ids if i != at]
        # Kayıp işaret uyarısı: yabancı imlâ kodlarının gitmesi ZATEN İSTENEN,
        # onları uyarıya katma — asıl önemli olan vakıf/tecvid işareti kaybı.
        kayip = set(c for c in metin[at]
                    if ISARET.match(c) and ord(c) not in IMLA_ARTIGI) - set(
            c for i in kalan for c in metin[i] if ISARET.match(c))
        silinecek[at] = (kalan[0], kayip)

    print("=" * 74)
    print("ÇİFT KAYITLI KELİMELER")
    print("=" * 74)
    print(f"  {len(silinecek)} fazlalık bulundu\n")
    for at, (kalan, kayip) in sorted(silinecek.items(),
                                     key=lambda x: [int(t) for t in x[0].split(":")]):
        print(f"  SİL  {at:<12} {metin[at]}")
        print(f"  TUT  {kalan:<12} {metin[kalan]}")
        if kayip:
            kod = " ".join(f"U+{ord(c):04X}" for c in sorted(kayip))
            print(f"       ⚠ silinende olup kalanda OLMAYAN işaret: {kod}")
        print()
    if supheli:
        print(f"  ⚠ imlâdan ayırt EDİLEMEYEN {len(supheli)} yer (işaret sayısına bakıldı):")
        for hedef, ids, at in supheli:
            print(f"      {hedef}  {ids}  → silinen {at}")

    if not yaz:
        print("\n  (Sadece rapor. Temiz kopya için: --temizle --yaz)")
        return

    # ── Temiz kopya: fazlalık atılır, ÂYET İÇİNDEKİ SIRA YENİDEN NUMARALANIR ──
    atilan = toplam = 0
    beklenmeyen = []          # SİLME OLMAYAN âyette id değiştiyse → uyarı
    for sure in ham:
        for ayet in sure.get("ayetler", []) or []:
            kl = ayet.get("kelimeler")
            if not isinstance(kl, list):
                continue
            yeni = [k for k in kl if str(k.get("id")) not in silinecek]
            silindi_mi = len(yeni) != len(kl)
            atilan += len(kl) - len(yeni)
            for sira, k in enumerate(yeni, 1):
                eski = str(k.get("id", ""))
                p2 = eski.split(":")
                if len(p2) >= 3:
                    k["id"] = f"{p2[0]}:{p2[1]}:{sira}"
                # Numaralama HER âyette yapılıyor. Silme yapılmayan bir âyette
                # id değişiyorsa, o âyetin numaraları zaten 1..N sıralı DEĞİLMİŞ
                # demektir; bu sessizce kaymaya yol açar, mutlaka görülmeli.
                if not silindi_mi and k["id"] != eski:
                    beklenmeyen.append((eski, k["id"]))
                toplam += 1
            ayet["kelimeler"] = yeni

    if beklenmeyen:
        print(f"\n  ⚠ SİLME OLMAYAN âyetlerde {len(beklenmeyen)} id değişti —")
        print("    demek ki o âyetlerin kelime numaraları zaten 1..N sıralı değilmiş:")
        for eski, yeni_id in beklenmeyen[:20]:
            print(f"      {eski}  →  {yeni_id}")
        if len(beklenmeyen) > 20:
            print(f"      … ve {len(beklenmeyen)-20} tane daha")
    else:
        print("\n  ✓ Silme yapılmayan âyetlerde hiçbir id değişmedi.")
    json.dump(ham, open(cikti, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"\n  yazıldı: {cikti}   atılan {atilan} kelime, kalan {toplam}")
    print("  ÖNEMLİ: id'ler yeniden numaralandı → --hizala ve --birlestir'i")
    print("  bu yeni dosyayla TEKRAR çalıştır, yoksa anlam haritası kayar.")


def karsilastir(a_yolu, b_yolu):
    """İki mushaf kopyasını karşılaştırır.

    Uygulama mushafı `fetch("/kuran-mushaf.json")` ile WEB KÖKÜNDEN okuyor,
    yani Vite'ta `public/` klasöründen. `src/data/` altındaki kopya derlemeye
    girmiyor. İki kopya ayrışmışsa hem ekranda eski veri görünür hem de
    hizalama yanlış dosya üzerinden yapılmış olur.
    """
    ay, by = yol_coz(a_yolu), yol_coz(b_yolu)
    if os.path.realpath(ay) == os.path.realpath(by):
        print("=" * 74)
        print("HATA: İKİ YOL DA AYNI DOSYAYA ÇIKIYOR")
        print("=" * 74)
        print(f"  {a_yolu}\n  {b_yolu}\n  ikisi de → {os.path.realpath(ay)}")
        print("\n  Bu karşılaştırma anlamsız olurdu. Dosyalardan biri verdiğin")
        print("  yolda YOK ve arama onu aynı adlı başka bir dosyaya düşürdü.")
        print("  TAM YOL vererek tekrar dene.")
        sys.exit(1)
    A = json.load(open(ay, encoding="utf-8"))
    B = json.load(open(by, encoding="utf-8"))
    print(f"  (A gerçek yol: {ay})")
    print(f"  (B gerçek yol: {by})")
    ka = dict(bizim_kelimeler(A))
    kb = dict(bizim_kelimeler(B))
    print("=" * 74)
    print("İKİ KOPYA KARŞILAŞTIRMASI")
    print("=" * 74)
    print(f"  A: {a_yolu}   {len(ka)} kelime")
    print(f"  B: {b_yolu}   {len(kb)} kelime")
    if len(ka) != len(kb):
        print(f"  → KELİME SAYISI FARKLI ({len(ka) - len(kb):+d})")
    sadece_a = [k for k in ka if k not in kb]
    sadece_b = [k for k in kb if k not in ka]
    farkli = [k for k in ka if k in kb and ka[k] != kb[k]]
    print(f"\n  yalnız A'da olan id : {len(sadece_a)}")
    print(f"  yalnız B'de olan id : {len(sadece_b)}")
    print(f"  aynı id, FARKLI metin: {len(farkli)}")
    for baslik, liste in (("yalnız A", sadece_a), ("yalnız B", sadece_b)):
        for k in liste[:8]:
            kaynak = ka if baslik == "yalnız A" else kb
            print(f"    {baslik}: {k:<12} {kaynak[k]}")
    for k in farkli[:8]:
        print(f"    FARK: {k:<12} A={ka[k]}   B={kb[k]}")
    if not sadece_a and not sadece_b and not farkli:
        print("\n  ✓ İki kopya BİREBİR aynı.")
    else:
        print("\n  ⚠ Kopyalar ayrışmış. Uygulamanın okuduğu WEB KÖKÜNDEKİ dosyadır.")


def test():
    """Tek âyet çekip başlığın/erişimin çalıştığını gösterir."""
    url = ("https://api.quran.com/api/v4/verses/by_key/2:40"
           "?words=true&language=tr&word_fields=text_uthmani,location")
    print("deneniyor:", url)
    d = json_al(url)
    kelimeler = d.get("verse", {}).get("words", [])
    print(f"BAŞARILI — {len(kelimeler)} kelime döndü:\n")
    for k in kelimeler:
        c = k.get("translation") or {}
        print(f"  {str(k.get('location')):<10} {str(k.get('text_uthmani')):<16} "
              f"{c.get('text','')}   [{c.get('language_name','')}]")


if __name__ == "__main__":
    if "--test" in sys.argv:
        test()
    elif "--birlestir" in sys.argv:
        birlestir()
    elif "--karsilastir" in sys.argv:
        arg = [a for a in sys.argv[1:] if not a.startswith("--")]
        karsilastir(arg[0], arg[1])
    elif "--temizle" in sys.argv:
        arg = [a for a in sys.argv[1:] if not a.startswith("--")]
        tekrar_temizle(arg[0] if arg else "kuran-mushaf.json", yaz="--yaz" in sys.argv)
    elif "--ayet" in sys.argv:
        ay = sys.argv[sys.argv.index("--ayet") + 1]
        arg = [a for a in sys.argv[1:] if not a.startswith("--") and a != ay]
        ayet_bak(arg[0] if arg else "kuran-mushaf.json", ay)
    elif "--rapor" in sys.argv:
        arg = [a for a in sys.argv[1:] if not a.startswith("--")]
        kelime = None
        if "--kelime" in sys.argv:
            kelime = sys.argv[sys.argv.index("--kelime") + 1]
            arg = [a for a in arg if a != kelime]
        rapor(arg[0] if arg else "kuran-mushaf.json", aranan=kelime)
    elif "--cek" in sys.argv:
        cek()
    elif "--hizala" in sys.argv:
        arg = [a for a in sys.argv[1:] if not a.startswith("--")]
        hizala(arg[0] if arg else "kuran-mushaf.json")
    else:
        print(__doc__)
