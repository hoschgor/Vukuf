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

  8) İNGİLİZCE python3 wbw.py --ingilizce
     quran.com'un Türkçe veremediği kelimeleri listeler, dosyaya yazar.

 22) METİN DENETİM python3 wbw.py --metin-denetle [--ayrinti 40]
     6236 âyetin METNİNİ quran.com'unkiyle karşılaştırır (kelime sayısına DEĞİL,
     metnin kendisine bakar). Fazladan/eksik kelimeyi ve tekrar şüphesini
     bulur. Yazmaz; metin_farklari.json üretir.

 23) HİZALAMA RÖNTGENİ python3 wbw.py --hizalama-bak 37:102
     Âyetin her kelimesini, eşlendiği quran.com kelimesini ve anlamını gösterir;
     grup oluşan ve hiç bağlanmayan yerleri işaretler. Yazmaz.

 20) ÂYET KODU python3 wbw.py --ayet-kod 37:130
     Bir âyetin kelimelerini kod noktalarıyla döker; aynı/kısmî tekrar eden
     kelimeleri işaretler. Yazmaz — kesmeden önce bakılacak yer.

 21) KELİME SİL python3 wbw.py --kelime-sil 37:130:4 [--yaz]
     Mushaftan tek kelime siler, sonrakileri yeniden numaralar. --yaz yoksa
     KURU ÇALIŞMA; yazarken .yedek alır ve hangi türetilmiş dosyaların
     yenilenmesi gerektiğini söyler.

 19) BÖLÜNME   python3 wbw.py --bolunme [--ayrinti 40]
     Bizim kelime bölünmemiz quran.com'unkiyle aynı mı? Âyet âyet karşılaştırır,
     birleştirilecek ve bölünecek yerleri listeler. Yazmaz.

 18) SARF       python3 wbw.py --sarf
     Fiillerin şahıs/cins/sayı/kip bilgisini kelime id'lerimize bağlar,
     kelime-sarf.json üretir. Tanımadığı etiketleri ayrıca listeler.

 17) SARF KEŞİF python3 wbw.py --sarf-kesif [dosya]
     Morfoloji dosyasını tanır, şahıs/cins/sayı etiketi var mı bakar ve
     BİZİM kelime id'lerimizle hizalamanın tutup tutmadığını ölçer. Yazmaz.

 16) UYGULA    python3 wbw.py --ing-uygula
     İngilizce kalanları sırayla Türkçeleştirir (oybirliği → meal → iskelet →
     çeviri), her kayda KAYNAĞINI yazar, wbw_tr_tam.json üretir. Kalanları
     ing_kalan_ifadeler.json'a iş listesi olarak çıkarır. Orijinale dokunmaz.

 15) QUL       python3 wbw.py --qul [turkish-wbw-translation.json]
     Tarteel QUL Türkçe kelime-kelime dosyası boşlukların kaçını kapatıyor?
     Ayrıca bizimkiyle aynı kaynak mı, bağımsız çeviri mi, onu da ölçer.

 14) MEAL KOPYALA python3 wbw.py --meal-kopyala 52:20=52:19 [--yaz]
     Birleşik verilmiş âyetin mealini komşusundan kopyalar + not düşer.

 13) ÖRNEKLEM  python3 wbw.py --meal-orneklem 120
     Kabul edilen kararlardan rastgele örnek basar (gözle tasnif için).

 12) MEAL BAK  python3 wbw.py --meal-bak 52:17-22
     Âyetlerin mealini tam olarak döker (eksik mi, birleşmiş mi görmek için).

 11) MEAL DENETİM python3 wbw.py --meal-denetle
     Meal dosyasında hangi âyet eksik/fazla/boş? Sûre bazında sayı karşılaştırır.

 10) MEAL SEÇİM python3 wbw.py --meal-secim
     Ayrışan adaylar arasından, âyetin MEALİNDE geçeni seçer. Ölçer, yazmaz.

  9) ANALİZ    python3 wbw.py --ing-analiz
     İngilizce kalanların ne kadarı KENDİ Türkçe kayıtlarımızdan doldurulabilir?
     Ölçer, güven derecesine ayırır, iş listesi çıkarır. Dosya DEĞİŞTİRMEZ.

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


# ── ANLAM METNİ İNGİLİZCE Mİ? (lugat_kalite.py ile aynı ölçüt) ────────────
# Sözlüğümüzde (arapca-lugat.json) İngilizce kalıntılar var. Onları "Türkçe
# karşılık" diye önermek, İngilizce'yi İngilizce ile doldurmak olur.
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
    """Türkçe'ye özgü harf varsa asla İngilizce sayma; yoksa işlev kelimesi ara."""
    if TR_HARF.search(metin):
        return False
    parcalar = [p.lower() for p in KELIME_AYIR.split(metin) if p]
    return any(p in EN_KELIME for p in parcalar)


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
                      os.path.join(kok, "data", adi), os.path.join(kok, "src", "data", adi),
                      os.path.join(kok, "public", adi)):
                if os.path.isfile(a):
                    if not sessiz:
                        print(f"  ⚠ '{verilen}' yok — şuna düşüldü: {os.path.realpath(a)}")
                    return os.path.realpath(a)
            kok = os.path.dirname(kok)
    print(f"HATA: '{verilen}' bulunamadı.")
    sys.exit(1)


# ── VERİ DOSYASI BULMA / ÇIKTI YERİ ───────────────────────────────────────
# ESKİ HATA: yalnız mushaf yolu yol_coz'dan geçiyordu; wbw_tr.json ve
# kelime_hizalama.json doğrudan açılıyordu. Bu yüzden betik ancak bu dosyaların
# BULUNDUĞU dizinden çalıştırılınca işliyordu:
#     cd ~/Projeler/vukuf && python3 src/py/wbw.py --ingilizce
#       → FileNotFoundError: 'wbw_tr.json'
# Artık bütün girdiler aynı aramadan geçiyor (betiğin dizini ve çalışma dizini,
# yukarı doğru 5 kat; her katta ./, ./data/, ./src/data/). Çıktılar da girdilerin
# bulunduğu dizine yazılır → dosyalar src/data dışına dağılmaz.
_VERI_DIZIN = [None]


def veri_ara(ad):
    """yol_coz ile aynı arama, ama sessiz ve bulamazsa None döner (çıkmaz)."""
    if os.path.isfile(ad):
        return os.path.realpath(ad)
    taban = os.path.basename(ad)
    for kok in (os.path.dirname(os.path.abspath(__file__)), os.path.abspath(os.getcwd())):
        for _ in range(5):
            for a in (os.path.join(kok, ad), os.path.join(kok, taban),
                      os.path.join(kok, "data", taban), os.path.join(kok, "src", "data", taban),
                      os.path.join(kok, "public", taban)):
                if os.path.isfile(a):
                    return os.path.realpath(a)
            kok = os.path.dirname(kok)
    return None


def girdi(ad, ipucu=""):
    """Var olması GEREKEN bir veri dosyası. Bulunduğu dizin çıktılar için hatırlanır."""
    y = veri_ara(ad)
    if not y:
        print(f"HATA: '{ad}' bulunamadı." + (f"\n      {ipucu}" if ipucu else ""))
        sys.exit(1)
    if _VERI_DIZIN[0] is None:
        _VERI_DIZIN[0] = os.path.dirname(y)
    if os.path.abspath(ad) != y:
        print(f"  · {ad} → {y}")
    return y


def cikti_yolu(ad):
    """Çıktı dosyasının tam yolu: girdilerin okunduğu dizin (yoksa çalışma dizini)."""
    if os.path.isabs(ad) or os.path.dirname(ad):
        return ad
    kok = _VERI_DIZIN[0]
    if kok is None:
        b = veri_ara("wbw_tr.json") or veri_ara("kuran-mushaf.json")
        kok = os.path.dirname(b) if b else os.path.abspath(os.getcwd())
    return os.path.join(kok, ad)


# ══════════════════════════════════════════════════════════════════════════
def cek(hedef="wbw_tr.json", bekleme=0.34):
    veri = {}
    # Yarım kalmış çekme HER YERDEN devam edebilsin: mevcut dosya aranır.
    # Yoksa veri dizinine (src/data) yazılır — çalışma dizinine dağılmaz.
    varolan = veri_ara(hedef)
    if varolan:
        _VERI_DIZIN[0] = os.path.dirname(varolan)
        hedef = varolan
        veri = json.load(open(hedef, encoding="utf-8"))
        print(f"mevcut dosya okundu: {hedef} — {len(veri)} kelime")
    else:
        hedef = cikti_yolu(hedef)
        print(f"yeni dosya: {hedef}")
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
    wbw_yolu = girdi(wbw_yolu, "Önce:  python3 src/py/wbw.py --cek")
    cikti = cikti_yolu(cikti)
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
    sorunlu_yolu = cikti_yolu("hizalama_sorunlu.json")
    json.dump(sorunlu, open(sorunlu_yolu, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"\n  yazıldı: {cikti} ({os.path.getsize(cikti)//1024} KB)")
    print(f"  yazıldı: {sorunlu_yolu} ({len(sorunlu)} âyet)")


def birlestir(wbw_yolu="wbw_tr.json", harita_yolu="kelime_hizalama.json",
              cikti="kelime-anlam.json", grup_cikti="kelime-grup.json",
              eslem_cikti="kelime-mapping.json"):
    """Hizalamayı kullanarak BİZİM kelime id'lerine göre anlam dosyası üretir.

    Uygulama artık sözlükte kelime aramak yerine doğrudan
        kelimeAnlam[kelime.id]
    diyebilir. Anlam KONUMA ait olduğu için "من kelimesinin 710 anlamı"
    sorunu ortadan kalkar: her yerde o yerin anlamı gösterilir.
    """
    wbw_yolu = girdi(wbw_yolu, "Önce --cek ve --hizala çalıştır.")
    harita_yolu = girdi(harita_yolu, "Önce --cek ve --hizala çalıştır.")
    cikti, grup_cikti = cikti_yolu(cikti), cikti_yolu(grup_cikti)
    wbw = json.load(open(wbw_yolu, encoding="utf-8"))
    harita = json.load(open(harita_yolu, encoding="utf-8"))

    anlamlar, gruplar, kaynaklar = {}, {}, {}
    bos = 0
    diller = Counter()
    kaynak_sayac = Counter()
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
        kyn = k.get("kaynak")
        if kyn:
            kaynak_sayac[kyn] += 1
            if kyn != "quran":          # quran.com aslı varsayılan; yalnız ötekiler yazılır
                kaynaklar[bizim] = kyn
        kardes = ters.get(hedef, [])
        if len(kardes) > 1:
            # UI'ın bu kelimeleri TEK BİRİM gibi davranması için üye listesi de
            # verilir: baloncuk ikisini birden göstersin, kelime kelime ilerlerken
            # ikinci üyeye ayrıca durup aynı anlamı tekrar etmesin.
            gruplar[bizim] = {"ar": k.get("ar", ""), "uyeler": sorted(
                kardes, key=lambda x: [int(t) for t in x.split(":")])}

    json.dump(anlamlar, open(cikti, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(gruplar, open(grup_cikti, "w", encoding="utf-8"), ensure_ascii=False)
    # ── kelime-mapping.json ───────────────────────────────────────────────
    # BU DOSYA BİR ARA ÜRETİLMİYORDU ve bayat kalıyordu. KelimePopup kelime
    # SESİNİ bununla buluyor (bizim id → quran.com sırası); mushafta kelime
    # numaraları kaydığında (bölme/silme sonrası) eski eşleme yanlış kelimeyi
    # çaldırıyor, kullanıcıya "kelime atlanıyor" gibi görünüyor. Artık
    # hizalamayla BİRLİKTE, aynı kaynaktan üretiliyor — ayrışması imkânsız.
    eslem_cikti = cikti_yolu(eslem_cikti)
    eslem = {}
    for bizim, onlarinki in harita.items():
        eslem[bizim] = onlarinki[0] if isinstance(onlarinki, list) else onlarinki
    json.dump(eslem, open(eslem_cikti, "w", encoding="utf-8"), ensure_ascii=False)
    kaynak_cikti = cikti_yolu("kelime-kaynak.json")
    if kaynaklar:
        json.dump(kaynaklar, open(kaynak_cikti, "w", encoding="utf-8"), ensure_ascii=False)

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
    if kaynak_sayac:
        print("\n  kaynak dağılımı:")
        for d, n in kaynak_sayac.most_common():
            print(f"    {d:<20} {n}")
    dosyalar = [cikti, grup_cikti] + ([kaynak_cikti] if kaynaklar else [])
    for f in dosyalar:
        print(f"\n  yazıldı: {f}  ({os.path.getsize(f)//1024} KB)")
    print(f"\n  yazıldı: {eslem_cikti}  ({len(eslem)} eşleme)")
    print("\n  KuranOkuma/KelimePopup bu ÜÇ dosyayı src/data/ altından import eder.")


def rapor(mushaf_yolu, wbw_yolu="wbw_tr.json", harita_yolu="kelime_hizalama.json",
          aranan=None):
    """Nerede birleşme oldu, nerede olmadı — tek tek göster.

    `--kelime يا` verilirse: bizde o kelime nerede geçiyorsa hepsini listeler ve
    her biri için BİRLEŞTİ mi yoksa tek başına mı eşlendi, onu yazar. Böylece
    "şurada birleşmemiş" şüphesi tek tek doğrulanabilir.
    """
    mushaf = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    wbw = json.load(open(girdi(wbw_yolu), encoding="utf-8"))
    harita = json.load(open(girdi(harita_yolu), encoding="utf-8"))

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
    wbw = json.load(open(girdi(wbw_yolu), encoding="utf-8"))
    hy = veri_ara(harita_yolu)
    harita = json.load(open(hy, encoding="utf-8")) if hy else {}

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
    mushaf_tam = yol_coz(mushaf_yolu)
    ham = json.load(open(mushaf_tam, encoding="utf-8"))
    harita_yolu = girdi(harita_yolu, "Önce --cek ve --hizala çalıştır.")
    # Temiz kopya HER ZAMAN kaynak mushafın yanına yazılır (yanlış dizine düşmesin).
    if not os.path.isabs(cikti) and not os.path.dirname(cikti):
        cikti = os.path.join(os.path.dirname(mushaf_tam), cikti)
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


def ingilizce_kalanlar(wbw_yolu="wbw_tr.json", harita_yolu="kelime_hizalama.json",
                       cikti="ingilizce_kalanlar.json"):
    """quran.com'un TÜRKÇE çeviri veremediği yerler.

    `language=tr` istememize rağmen bazı kelimelerde çeviri İngilizce dönüyor
    (ör. 18:94 "O Dhul-qarnain", 63:10 "the righteous"). Bunlar eksik kayıt;
    Türkçesi olmadığı için İngilizceye düşülmüş. Burada hepsi listelenir ki
    başka bir kaynaktan ya da elle doldurulabilsin.
    """
    wbw = json.load(open(girdi(wbw_yolu, "Önce:  python3 src/py/wbw.py --cek"), encoding="utf-8"))
    hy = veri_ara(harita_yolu)
    harita = json.load(open(hy, encoding="utf-8")) if hy else {}
    cikti = cikti_yolu(cikti)
    ters = {}
    for bizim, o in harita.items():
        hedef = o[0] if isinstance(o, list) else o
        ters.setdefault(hedef, []).append(bizim)

    diller = Counter()
    kalan = []
    for yer, v in wbw.items():
        if v.get("tip") == "end":
            continue
        d = (v.get("dil") or "?").lower()
        diller[d] += 1
        if d != "turkish":
            kalan.append({"quran_yeri": yer, "arapca": v.get("ar", ""),
                          "ceviri": v.get("tr", ""), "dil": v.get("dil", ""),
                          "bizim_yerlerimiz": sorted(ters.get(yer, []),
                                                     key=lambda x: [int(t) for t in x.split(":")]),
                          "turkce": ""})
    print("=" * 74)
    print("TÜRKÇE OLMAYAN ÇEVİRİLER")
    print("=" * 74)
    for d, n in diller.most_common():
        print(f"  {d:<12} {n}")
    print(f"\n  Türkçe olmayan: {len(kalan)} kelime\n")
    for k in sorted(kalan, key=lambda x: [int(t) for t in x["quran_yeri"].split(":")])[:40]:
        print(f"  {k['quran_yeri']:<12} {k['arapca']:<20} {k['ceviri']}")
    if len(kalan) > 40:
        print(f"  … ve {len(kalan)-40} tane daha")
    json.dump(kalan, open(cikti, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n  yazıldı: {cikti}  ('turkce' alanları BOŞ, doldurulmaya hazır)")


# ══════════════════════════════════════════════════════════════════════════
def ingilizce_analiz(wbw_yolu="wbw_tr.json", lugat_yolu="arapca-lugat.json",
                     cikti="ingilizce_is_listesi.json"):
    """İngilizce kalan kelimelerin ne kadarı KENDİ verimizden GÜVENLE doldurulur?

    ÖLÇÜLDÜ, İKİ KEZ DARALTILDI:
     1) İskelet eşleşmesi yetmedi: ٱلْأَرْضِ için 34 farklı Türkçe karşılık çıktı,
        en sıkı %20. Bunlar ayrı manalar değil, aynı mananın ÇEKİMLİ hâlleri
        ("yeri / yere / yerde…") — quran.com Türkçesi bağlama göre çekimli.
     2) Birebir Arapça eşleşme de tek başına yetmedi: aynı Arapça metnin Türkçe
        karşılığı da yerine göre değişiyor (TAM? kutusu, 3179 kayıt).
    KALAN TEK GÜVENLİ ÖLÇÜT — OYBİRLİĞİ: o Arapça metnin (ya da iskeletin) geçtiği
    BÜTÜN Türkçe kayıtlar TEK ve AYNI karşılığı veriyorsa, taşımak güvenlidir.
    Ayrışan her şey çeviriye gider; "en sık olanı seç" 4000+ yerde yanlış çekim
    üretirdi.

    LÜGAT KUTUSU KULLANILMIYOR: sözlüğümüzdeki İngilizce kalıntıları ayıklamak
    için kullandığımız süzgeç (işlev kelimesi + Türkçe harf vetosu) TEK KELİMELİK
    İngilizce'yi yakalayamıyor — "fruit → fruit", "mix → mix", "reach → reach"
    diye öneriler geldi. Bu kutu da çeviriye yönlendirilir.

    HİÇBİR DOSYAYI DEĞİŞTİRMEZ; ölçer ve iki iş listesi yazar.
    """
    wbw = json.load(open(girdi(wbw_yolu, "Önce:  python3 src/py/wbw.py --cek"), encoding="utf-8"))
    cikti = cikti_yolu(cikti)

    tr_tam, tr_iskelet = {}, {}
    ing_kayit = []
    for yer, v in wbw.items():
        if v.get("tip") == "end":
            continue
        metin = (v.get("tr") or "").strip()
        dil = (v.get("dil") or "").lower()
        ar = (v.get("ar") or "").strip()
        sk = iskelet(ar)
        if not sk:
            continue
        if dil == "turkish" and metin:
            tr_tam.setdefault(ar, Counter())[metin] += 1
            tr_iskelet.setdefault(sk, Counter())[metin] += 1
        elif dil != "turkish":
            ing_kayit.append((yer, ar, metin, sk))

    # ── Sınıflandırma ────────────────────────────────────────────────
    sayac = Counter()
    is_listesi = []
    ornek = {k: [] for k in ("tam-oybirligi", "iskelet-oybirligi", "ayrisiyor", "yok")}
    cevrilecek = {}                     # ingilizce → {adet, arapca, yerler}
    supheli_ve = []                     # "ve …" ile başlayan öneriler (komşu kelime sızmış)

    for yer, ar, ing, sk in ing_kayit:
        tam = tr_tam.get(ar)
        isk = tr_iskelet.get(sk)
        kayit = {"yer": yer, "arapca": ar, "ingilizce": ing, "iskelet": sk,
                 "oneri": "", "kaynak": "", "guven": "", "secenekler": []}
        if tam and len(tam) == 1:
            one, adet = tam.most_common(1)[0]
            kayit.update(oneri=one, kaynak="mushaf-tam", guven="tam-oybirligi")
            sayac["tam-oybirligi"] += 1
            if one.startswith("ve ") and "و" not in ar:
                supheli_ve.append((yer, ar, ing, one))
            if len(ornek["tam-oybirligi"]) < 10:
                ornek["tam-oybirligi"].append((yer, ar, ing, one, f"{adet} yerde"))
        elif isk and len(isk) == 1:
            one, adet = isk.most_common(1)[0]
            kayit.update(oneri=one, kaynak="mushaf-iskelet", guven="iskelet-oybirligi",
                         secenekler=[f"{one} ×{adet}"])
            sayac["iskelet-oybirligi"] += 1
            if one.startswith("ve ") and "و" not in ar:
                supheli_ve.append((yer, ar, ing, one))
            if len(ornek["iskelet-oybirligi"]) < 10:
                ornek["iskelet-oybirligi"].append((yer, ar, ing, one, f"{adet} yerde"))
        else:
            if tam or isk:
                kaynak = tam or isk
                kayit.update(guven="ayrisiyor", kaynak="cok-aday",
                             secenekler=[f"{a} ×{n}" for a, n in kaynak.most_common(5)])
                sayac["ayrisiyor"] += 1
                if len(ornek["ayrisiyor"]) < 10:
                    ornek["ayrisiyor"].append((yer, ar, ing, "—", f"{len(kaynak)} farklı aday"))
            else:
                kayit["guven"] = "yok"
                sayac["yok"] += 1
                if len(ornek["yok"]) < 10:
                    ornek["yok"].append((yer, ar, ing, "—", ""))
            d = cevrilecek.setdefault(ing, {"ingilizce": ing, "arapca": ar, "adet": 0,
                                            "ornek_yerler": [], "turkce": ""})
            d["adet"] += 1
            if len(d["ornek_yerler"]) < 3:
                d["ornek_yerler"].append(yer)
        is_listesi.append(kayit)

    toplam = len(ing_kayit)
    yuzde = lambda n: round(100 * n / toplam, 1) if toplam else 0
    guvenli = sayac["tam-oybirligi"] + sayac["iskelet-oybirligi"]
    print("=" * 74)
    print("İNGİLİZCE KALANLAR — OYBİRLİĞİ ÖLÇÜTÜ")
    print("=" * 74)
    print(f"  İngilizce kelime kaydı      : {toplam}")
    print(f"  farklı İngilizce ifade      : {len({k[2] for k in ing_kayit})}")
    print()
    print(f"  TAM OYBİRLİĞİ     (birebir Arapça, tek karşılık) {sayac['tam-oybirligi']:>6}  (%{yuzde(sayac['tam-oybirligi'])})")
    print(f"  İSKELET OYBİRLİĞİ (iskelet aynı, tek karşılık)   {sayac['iskelet-oybirligi']:>6}  (%{yuzde(sayac['iskelet-oybirligi'])})")
    print(f"  ─ güvenle doldurulabilir                         {guvenli:>6}  (%{yuzde(guvenli)})")
    print()
    print(f"  AYRIŞIYOR (aday var ama uyuşmuyor → çeviri)      {sayac['ayrisiyor']:>6}  (%{yuzde(sayac['ayrisiyor'])})")
    print(f"  YOK       (hiç aday yok → çeviri)                {sayac['yok']:>6}  (%{yuzde(sayac['yok'])})")
    print(f"  ─ çeviri gerekiyor                               {sayac['ayrisiyor']+sayac['yok']:>6}  (%{yuzde(sayac['ayrisiyor']+sayac['yok'])})")
    print()
    for ad, baslik in (("tam-oybirligi", "TAM OYBİRLİĞİ"), ("iskelet-oybirligi", "İSKELET OYBİRLİĞİ"),
                       ("ayrisiyor", "AYRIŞIYOR"), ("yok", "YOK")):
        if not ornek[ad]:
            continue
        print(f"  ── {baslik} örnekleri " + "─" * max(0, 50 - len(baslik)))
        for yer, ar, ing, one, not_ in ornek[ad]:
            print(f"    {yer:<11} {ar:<18} {ing:<26} → {one}  {not_}")
        print()

    # Komşu kelime sızması denetimi — öneri "ve " ile başlıyor ama Arapça'da و yok
    print(f"  ── DENETİM: 've …' ile başlayan öneri (Arapça'da و yok): {len(supheli_ve)}")
    for yer, ar, ing, one in supheli_ve[:10]:
        print(f"    {yer:<11} {ar:<18} {ing:<26} → {one}")
    if len(supheli_ve) > 10:
        print(f"    … ve {len(supheli_ve)-10} tane daha")
    print()

    json.dump(is_listesi, open(cikti, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  yazıldı: {cikti}")

    liste = sorted(cevrilecek.values(), key=lambda d: -d["adet"])
    sozluk_yolu = cikti_yolu("cevrilecek_ifadeler.json")
    json.dump(liste, open(sozluk_yolu, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  yazıldı: {sozluk_yolu}")
    print(f"           {len(liste)} farklı ifade  →  {sum(d['adet'] for d in liste)} kelime kaydını kapatır")
    print("  (hiçbir mevcut dosya değiştirilmedi — bu yalnız ölçüm)")


# ══════════════════════════════════════════════════════════════════════════
# ══════════════════════════════════════════════════════════════════════════
def meal_yukle(meal_yolu="ayet-meal.json", mushaf=None):
    """Âyet meallerini {"2:11": "metin"} biçiminde döndürür.

    Meal AYRI bir dosyada (src/data/ayet-meal.json) ve yapısını bilmiyoruz;
    o yüzden birkaç makul biçim denenir. Hiçbiri tutmazsa yapı ekrana dökülür —
    körlemesine varsayım yapıp yanlış alanı meal sanmaktansa görüp düzeltmek iyi.
    Dosya yoksa, mushafın İÇİNDE gömülü meal alanı aranır (eski davranış).
    """
    TRH = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
    AY_ANAH = re.compile(r"^(\d{1,3})\s*[:._-]\s*(\d{1,3})$")
    METIN_AD = ("meal", "metin", "turkce", "türkçe", "ceviri", "çeviri", "tr", "text", "aciklama")

    def metin_bul(d):
        """Sözlükten meal metnini çıkar: ada bakarak, olmazsa en uzun Türkçe metin."""
        if isinstance(d, str):
            return d
        if not isinstance(d, dict):
            return None
        for ad in METIN_AD:
            for k, v in d.items():
                if isinstance(v, str) and k.lower() == ad:
                    return v
        aday = [v for v in d.values() if isinstance(v, str) and len(v) > 15 and TRH.search(v)]
        return max(aday, key=len) if aday else None

    def sayi(d, *adlar):
        for a in adlar:
            v = d.get(a)
            if isinstance(v, int):
                return v
            if isinstance(v, str) and v.isdigit():
                return int(v)
        return None

    yol = veri_ara(meal_yolu)
    if yol:
        veri = json.load(open(yol, encoding="utf-8"))
        mealler = {}
        # A) {"2:11": "metin"} ya da {"2:11": {...}}
        if isinstance(veri, dict) and any(AY_ANAH.match(str(k)) for k in list(veri)[:50]):
            for k, v in veri.items():
                m = AY_ANAH.match(str(k))
                t = metin_bul(v)
                if m and t is not None:
                    mealler[f"{int(m.group(1))}:{int(m.group(2))}"] = t
        # B) {"2": {"11": "metin"}} ya da {"2": ["1. ayet", "2. ayet", …]}
        elif isinstance(veri, dict) and any(str(k).isdigit() for k in list(veri)[:50]):
            for sk, sv in veri.items():
                if not str(sk).isdigit():
                    continue
                if isinstance(sv, dict):
                    for ak, av in sv.items():
                        t = metin_bul(av)
                        if str(ak).isdigit() and t is not None:
                            mealler[f"{int(sk)}:{int(ak)}"] = t
                elif isinstance(sv, list):
                    for i, av in enumerate(sv, 1):
                        t = metin_bul(av)
                        if t is not None:
                            mealler[f"{int(sk)}:{i}"] = t
        # C) [{"sure":2,"ayet":11,"meal":"…"}, …]  (ya da dict içinde böyle bir liste)
        if not mealler:
            listeler = []
            if isinstance(veri, list):
                listeler.append(veri)
            elif isinstance(veri, dict):
                listeler.extend(v for v in veri.values() if isinstance(v, list))
            for lst in listeler:
                for o in lst:
                    if not isinstance(o, dict):
                        continue
                    sn = sayi(o, "sureNo", "sure", "surah", "s")
                    an = sayi(o, "ayetNo", "ayet", "verse", "a", "no")
                    t = metin_bul(o)
                    if sn and an and t is not None:
                        mealler[f"{sn}:{an}"] = t
        if mealler:
            print(f"  meal dosyası: {yol}  ({len(mealler)} âyet)")
            ilk = list(mealler.items())[:2]
            for k, v in ilk:
                print(f"    örnek {k}: {v[:70]}…")
            return mealler
        # Çözemedik → yapıyı dök
        print(f"  meal dosyası bulundu ama yapısı çözülemedi: {yol}")
        print(f"    en üst tür: {type(veri).__name__}")
        if isinstance(veri, dict):
            anahtarlar = list(veri)[:5]
            print(f"    ilk anahtarlar: {anahtarlar}")
            for k in anahtarlar[:2]:
                v = veri[k]
                print(f"    veri[{k!r}] türü {type(v).__name__}: {str(v)[:160]}")
        elif isinstance(veri, list) and veri:
            print(f"    uzunluk {len(veri)}, ilk öğe: {str(veri[0])[:200]}")
        print("    → bu çıktıyı bana gönderin, okuyucuyu buna göre yazayım.")
        return {}

    # Dosya yok → mushafın içinde gömülü meal ara
    if mushaf is None:
        print(f"  '{meal_yolu}' bulunamadı ve mushaf verilmedi.")
        return {}
    alan_sayac, ayet_alanlar = Counter(), {}

    def gez(d, sure=None, ayet=None):
        if isinstance(d, dict):
            s2 = d.get("sureNo", d.get("sure", sure))
            a2 = d.get("ayetNo", d.get("ayet", ayet))
            kelimeli = any(isinstance(v, list) and v and isinstance(v[0], dict)
                           and "arabic" in v[0] for v in d.values())
            if kelimeli:
                for k, v in d.items():
                    if isinstance(v, str) and len(v) > 25 and TRH.search(v):
                        alan_sayac[k] += 1
                        if s2 and a2:
                            ayet_alanlar.setdefault(f"{s2}:{a2}", {})[k] = v
            for v in d.values():
                gez(v, s2, a2)
        elif isinstance(d, list):
            for v in d:
                gez(v, sure, ayet)

    gez(mushaf)
    if not alan_sayac:
        print("  mushaf içinde de meal metni yok.")
        return {}
    alan = alan_sayac.most_common(1)[0][0]
    print(f"  meal, mushaf içinde '{alan}' alanından alındı ({alan_sayac[alan]} âyet)")
    return {y: d.get(alan, "") for y, d in ayet_alanlar.items()}


# ══════════════════════════════════════════════════════════════════════════
def meal_denetle(mushaf_yolu="kuran-mushaf.json", meal_yolu="ayet-meal.json"):
    """Meal dosyasında hangi âyetler EKSİK / FAZLA? Mushaf verisi ölçüt alınır.

    Sayı tutmuyorsa (6235 ↔ 6236) tahmin yürütmek yerine hangi âyet olduğunu
    görmek gerekir: gerçekten eksik mi, yoksa anahtarı bozuk da okunamadı mı.
    """
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    mealler = meal_yukle(meal_yolu, ham)
    if not mealler:
        return
    # Mushaftaki âyetler: kelime id'leri "sure:ayet:kelime" biçiminde
    mushaf_ayet = {}
    for kid, _ar in bizim_kelimeler(ham):
        p = str(kid).split(":")
        if len(p) >= 2 and p[0].isdigit() and p[1].isdigit():
            mushaf_ayet.setdefault(int(p[0]), set()).add(int(p[1]))
    mushaf_kume = {f"{s}:{a}" for s, ayetler in mushaf_ayet.items() for a in ayetler}
    meal_kume = set(mealler)
    sirala = lambda k: sorted(k, key=lambda x: [int(t) for t in x.split(":")])

    eksik = sirala(mushaf_kume - meal_kume)
    fazla = sirala(meal_kume - mushaf_kume)
    bos = sirala({k for k, v in mealler.items() if not str(v).strip()})

    print("=" * 74)
    print("MEAL DENETİMİ")
    print("=" * 74)
    print(f"  mushaftaki âyet : {len(mushaf_kume)}")
    print(f"  mealdeki âyet   : {len(meal_kume)}")
    print(f"  mealde EKSİK    : {len(eksik)}")
    print(f"  mealde FAZLA    : {len(fazla)}  (mushafta karşılığı yok)")
    print(f"  metni BOŞ       : {len(bos)}")
    for ad, kume in (("EKSİK", eksik), ("FAZLA", fazla), ("BOŞ", bos)):
        if not kume:
            continue
        print(f"\n  ── {ad} ({len(kume)}) " + "─" * 50)
        for k in kume[:40]:
            ek = ""
            if ad == "FAZLA":
                ek = f"   {str(mealler.get(k,''))[:50]}"
            print(f"    {k}{ek}")
        if len(kume) > 40:
            print(f"    … ve {len(kume)-40} tane daha")
    # Sûre bazında sayı karşılaştırması — toplu kayma varsa buradan görünür
    fark = []
    for sn in sorted(mushaf_ayet):
        m = len(mushaf_ayet[sn])
        e = sum(1 for k in meal_kume if k.startswith(f"{sn}:"))
        if m != e:
            fark.append((sn, m, e))
    if fark:
        print(f"\n  ── sûre bazında sayı farkı ({len(fark)} sûre) " + "─" * 30)
        for sn, m, e in fark[:30]:
            print(f"    sûre {sn:>3}: mushaf {m:>3}  meal {e:>3}  (fark {e-m:+d})")
    else:
        print("\n  ✓ sûre bazında bütün sayılar tutuyor.")
    print("\n  (hiçbir dosya değiştirilmedi)")



# ══════════════════════════════════════════════════════════════════════════
# MEALDEN KARŞILIK ÇEKME MOTORU — hem ölçüm hem örneklem hem uygulama kullanır.
# Tek yerde durması şart: eşik/edat kuralları iki kopyaya ayrılırsa, ölçtüğümüz
# şey ile uyguladığımız şey sessizce ayrışır.
# ══════════════════════════════════════════════════════════════════════════
_AYIR = re.compile(r"[^a-zçğıöşüâîû]+")

def _kucuk(t):
    return t.replace("İ", "i").replace("I", "ı").lower()

def _sade(t):
    return " ".join(p for p in _AYIR.split(_kucuk(t)) if p)

def _kelimeler(t):
    return [p for p in _AYIR.split(_kucuk(t)) if len(p) > 1]

def _benzer(a, b):
    if a == b:
        return 1.0
    u, v = len(a), len(b)
    if u and v and min(u, v) / max(u, v) < 0.55:
        return 0.0
    sm = SequenceMatcher(None, a, b)
    return sm.ratio() if sm.quick_ratio() >= 0.55 else 0.0

def _esik(n):
    """Uzunluğa göre benzerlik eşiği: kısa kelimede neredeyse birebir, uzunda gevşek."""
    return 1.0 if n <= 3 else 0.85 if n <= 5 else 0.78

# Tek başına anlam taşımayan bağlaç/edatlar SONUÇ olarak seçilmesin
_BOS = {"ve", "ile", "de", "da", "ki", "bir", "o", "bu", "şu", "için", "gibi",
        "ise", "ama", "fakat", "ya", "hem", "mi", "mı", "mu", "mü", "daha", "en"}

# ── EDAT / KISA GÖVDE SÜZGECİ ─────────────────────────────────────────────
# ÖLÇÜLDÜ: yöntemin hataları buraya toplanıyor (كُنَّا "idik" → "biz",
# مَا "şey den" → "ne"). Sebebi: Türkçe bu kelimeleri EKLE karşılıyor, mealde
# ayrı bir karşılıkları yok; çapa zayıf kalınca komşu kelimeyi kapıyorlar.
# Ölçümde bu grubun hata oranı %30 çıktı, içerik kelimelerinde ise çok daha az.
_EDAT_ISKELET = {
    # temel edat/bağlaç
    "ما", "لا", "ان", "الا", "من", "في", "علي", "عن", "الي", "مع", "قد", "لم",
    "لن", "بل", "ثم", "او", "ام", "اي", "كل", "غير", "بين", "عند", "لو", "اذا",
    "اذ", "حتي", "لما", "كما", "بما", "مما", "عما", "لدن", "لدنا", "بعض", "سوي",
    # كون fiilinin çekimleri — Türkçe bunları EKLE karşılıyor, mealde ayrı yok
    "كان", "كانت", "كانوا", "كنا", "كنت", "كنتم", "كنتن", "كونوا", "يكون",
    "تكون", "يكونوا", "تكونوا", "نكون", "ليس", "ليست", "لست", "لستم",
    # zamirler
    "هو", "هي", "هم", "هن", "انت", "انتم", "انتن", "انا", "نحن", "هما",
    "ذلك", "هذا", "هذه", "هولاء", "التي", "الذي", "الذين", "اللاتي", "ها", "يا",
    # edat + zamir birleşmeleri (ölçümde hata bunlarda yoğunlaştı)
    "به", "بها", "بهم", "بكم", "بك", "بنا", "بي",
    "له", "لها", "لهم", "لكم", "لك", "لنا", "لي", "لهن",
    "فيه", "فيها", "فيهم", "فيكم", "فينا",
    "منه", "منها", "منهم", "منكم", "منا", "مني",
    "عليه", "عليها", "عليهم", "عليكم", "علينا", "عليك",
    "اليه", "اليها", "اليهم", "اليكم", "الينا", "اليك",
    "عنه", "عنها", "عنهم", "عنكم", "عنا",
    "معه", "معها", "معهم", "معكم", "معنا",
    "دونه", "دونها", "دونهم", "دونكم",
}

def _edat_mi(sk):
    # DİKKAT: "3 harften kısa ise edattır" YANLIŞ olurdu — نوح (Nuh), يوم (gün),
    # نار (ateş) hep 3 harf ve içerik kelimesi. Ölçüldü, 2 harfe indirildi.
    if len(sk) <= 2 or sk in _EDAT_ISKELET:
        return True
    # 150 kararlık gözle tasnifte kalan İKİ hatanın ikisi de buradan sızmıştı:
    #   وَلَا  (ve+lâ)   "helal değildir" → "yoktur"
    #   فَلَهُمْ (fe+lehum) "onlar"        → "vardır"
    # Sebep: لا ve لهم listede, ama başlarındaki bağlaç (و/ف) yüzünden iskelet
    # listeye uymuyordu. Bağlaç soyulup bir kez daha bakılır.
    if len(sk) > 2 and sk[0] in "وف" and sk[1:] in _EDAT_ISKELET:
        return True
    if len(sk) > 3 and sk[0] in "وف" and sk[1] in "وف" and sk[2:] in _EDAT_ISKELET:
        return True
    return False

_JETON = re.compile(r"[A-Za-zÇĞİIÖŞÜçğıöşüÂÎÛâîû'\u2019]+")

def _meal_parcalari(meal):
    """Mealin 1 ve 2 kelimelik pencereleri: [(bas, bit, sade, HAM)]

    HAM = mealin KENDİ yazımı (büyük harf, kesme işareti dâhil). Karşılaştırma
    sadeleştirilmiş metinle yapılır ama SONUÇ ham metindir — yoksa "sûr'a" → "sûr a",
    "Allah'ın" → "allah ın" diye bozulur."""
    jeton = [(m.start(), m.end(), meal[m.start():m.end()]) for m in _JETON.finditer(meal)]
    jeton = [(a, b, t) for a, b, t in jeton if len(t) > 1 or _sade(t)]
    parca = []
    for i, (a, b, t) in enumerate(jeton):
        sade = _sade(t)
        if sade:
            parca.append((i, i + 1, sade, meal[a:b]))
        if i + 1 < len(jeton):
            a2, b2, t2 = jeton[i + 1]
            sade2 = _sade(t + " " + t2)
            if sade2:
                parca.append((i, i + 2, sade2, meal[a:b2]))
    return parca

def _puanla(adaylar_sade, parcalar, kullanilmis):
    """(puan, ikinci_puan, bas, bit, sade, HAM) | None.  adaylar_sade: sadeleştirilmiş.
    Eşikler ayrı uygulanır ki puanlar bir kez hesaplanıp farklı eşikler ucuza denensin."""
    en = None
    for bas, bit, sade, ham in parcalar:
        if any(i in kullanilmis for i in range(bas, bit)):
            continue
        if bit - bas == 1 and sade in _BOS:
            continue
        p = max(_benzer(a, sade) for a in adaylar_sade)
        if en is None or p > en[0]:
            en = (p, bas, bit, sade, ham)
    if en is None:
        return None
    ikinci = 0.0
    for bas, bit, sade, ham in parcalar:
        if bit <= en[1] or bas >= en[2]:                 # örtüşmüyor
            if bit - bas == 1 and sade in _BOS:
                continue
            ikinci = max(ikinci, max(_benzer(a, sade) for a in adaylar_sade))
    return (en[0], ikinci, en[1], en[2], en[3], en[4])

def _gecer(p, ek=0.0, fark=0.10):
    return p is not None and p[0] >= min(1.0, _esik(len(p[4])) + ek) and (p[0] - p[1]) >= fark

def _sec(adaylar_sade, parcalar, kullanilmis, ek=0.0, fark=0.10):
    """Döner: (puan, bas, bit, HAM_metin) — mealin kendi yazımıyla."""
    p = _puanla(adaylar_sade, parcalar, kullanilmis)
    return (p[0], p[2], p[3], p[5]) if _gecer(p, ek, fark) else None

def _govde_ortak(a, b):
    """İki karşılık 'aynı şeyi mi söylüyor'? tam | kismi | yanlis.
    DİKKAT: eşanlamı bilemez ('yetimler' ↔ 'öksüzler' yanlis çıkar). Bu yüzden
    'yanlis' sayısı gerçek hatadan YÜKSEKTİR; --meal-orneklem gözle tasnif içindir."""
    if _benzer(a, b) >= 0.80:
        return "tam"
    if a in b or b in a:
        return "kismi"
    for x in a.split():
        for y in b.split():
            n = 0
            for u, v in zip(x, y):
                if u != v:
                    break
                n += 1
            if n >= 4 or (n >= 3 and n == min(len(x), len(y))):
                return "kismi"
    return "yanlis"

def _havuzlar(wbw):
    """wbw verisinden aday dizinleri ve kayıt listesi."""
    tr_tam, tr_iskelet, tum = {}, {}, []
    for yer, v in wbw.items():
        if v.get("tip") == "end":
            continue
        metin = (v.get("tr") or "").strip()
        dil = (v.get("dil") or "").lower()
        ar = (v.get("ar") or "").strip()
        sk = iskelet(ar)
        if not sk:
            continue
        if dil == "turkish" and metin:
            # ÖZGÜN metin saklanır (büyük harf/kesme işareti korunsun); karşılaştırma
            # anında sadeleştirilir. Eskiden sadeleştirilmiş hâli saklanıyordu ve
            # taşınan karşılık "sûr'a" yerine "sûr a" oluyordu.
            tr_tam.setdefault(ar, Counter())[metin] += 1
            tr_iskelet.setdefault(sk, Counter())[metin] += 1
        tum.append((yer, ar, sk, metin, dil))
    return tr_tam, tr_iskelet, tum

def _havuz(tr_tam, tr_iskelet, ar, sk, kendi_sade=None, en_cok=8):
    """Aday karşılıklar — ÖZGÜN yazımlarıyla. kendi_sade: kendi cevabını havuzdan çıkar."""
    h = Counter(tr_tam.get(ar) or tr_iskelet.get(sk) or {})
    if kendi_sade is not None:
        for a in [a for a in h if _sade(a) == kendi_sade]:
            h[a] -= 1
            if h[a] <= 0:
                del h[a]
    return [a for a, _ in h.most_common(en_cok)]

def _tek_karsilik(sayac):
    """Havuzdaki BÜTÜN kayıtlar aynı karşılığı mı veriyor? Evetse özgün metni döner."""
    if not sayac:
        return None
    ayri = {_sade(a) for a in sayac}
    return sayac.most_common(1)[0][0] if len(ayri) == 1 else None

def _meal_kararlari(wbw_yolu, mealler, ek=0.05, fark=0.20, adet_sinir=None):
    """BİLİNEN Türkçe karşılıklı kelimelerde yöntemi çalıştır → kabul edilen kararlar.
    Döner: [(yer, arapca, gercek_karsilik, mealden_cekilen)]  (kelimenin kendi
    karşılığı aday havuzundan çıkarılır — kopya olmasın)."""
    import random
    wbw = json.load(open(girdi(wbw_yolu), encoding="utf-8"))
    tr_tam, tr_iskelet, tum = _havuzlar(wbw)
    tr_kayit = [t for t in tum if t[4] == "turkish" and t[3] and not _edat_mi(t[2])]
    random.seed(11)
    if adet_sinir:
        tr_kayit = random.sample(tr_kayit, min(adet_sinir, len(tr_kayit)))
    sonuc = []
    for yer, ar, sk, gercek, _d in tr_kayit:
        g = _sade(gercek)
        ad = _havuz(tr_tam, tr_iskelet, ar, sk, kendi_sade=g)
        if not ad:
            continue
        p = yer.split(":")
        meal = mealler.get(f"{p[0]}:{p[1]}", "")
        if not meal:
            continue
        r = _sec([_sade(a) for a in ad], _meal_parcalari(meal), set(), ek, fark)
        if r:
            sonuc.append((yer, ar, g, r[3]))
    return sonuc


# ══════════════════════════════════════════════════════════════════════════
def ing_uygula(mushaf_yolu="kuran-mushaf.json", wbw_yolu="wbw_tr.json",
               meal_yolu="ayet-meal.json", cikti="wbw_tr_tam.json",
               ek=0.05, fark=0.20):
    """İngilizce kalan kelimeleri, ölçülmüş SIRAYLA Türkçeleştirir.

    KAYNAK SIRASI — güveni yüksek olan önce, her kayda KAYNAĞI yazılır:
      1) oybirligi   : o Arapça metnin geçtiği BÜTÜN Türkçe kayıtlar tek ve aynı
                       karşılığı veriyor. Metin birebir aynı olduğu için çekim de
                       aynıdır → doğrudan taşınır. (Ölçüm: 935 kayıt.)
      2) meal        : karşılık O ÂYETİN MEALİNDEN çekilir; çekim bu âyete ait olur.
                       (Ölçüm: 2×150 karar gözle tasnif edildi, gerçek hata ~%1.3.
                       Edatlar ve 2 harflik gövdeler bu yola HİÇ sokulmaz.)
      3) oybirligi-iskelet : iskelet aynı ve bütün Türkçe kayıtlar hemfikir; ama
                       hareke/i'râb farkı olabildiği için mealden SONRA gelir.
      4) ceviri      : elle çevrilen ifade listesi (cevrilecek_ifadeler_DOLU.json
                       ve/veya ing_kalan_DOLU.json).
    Kalanlar İngilizce bırakılır ve ing_kalan_ifadeler.json'a iş listesi olarak yazılır.

    ORİJİNALE DOKUNMAZ: yeni dosya yazar (wbw_tr_tam.json). Sonra:
        python3 wbw.py --birlestir wbw_tr_tam.json
    """
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    mealler = meal_yukle(meal_yolu, ham)
    wbw_tam = girdi(wbw_yolu)
    wbw = json.load(open(wbw_tam, encoding="utf-8"))
    cikti = cikti_yolu(cikti)

    # ── Çeviri listeleri (varsa) ──
    ceviri = {}
    ceviri_dosya = []
    for ad in ("cevrilecek_ifadeler_DOLU.json", "ing_kalan_DOLU.json"):
        y = veri_ara(ad)
        if not y:
            continue
        try:
            for x in json.load(open(y, encoding="utf-8")):
                t = str(x.get("turkce") or "").strip()
                if t:
                    ceviri[str(x.get("ingilizce") or "")] = t
            ceviri_dosya.append(y)
        except Exception as e:
            print(f"  ⚠ çeviri dosyası okunamadı ({y}): {e}")
    if ceviri_dosya:
        for y in ceviri_dosya:
            print(f"  çeviri dosyası: {y}")
        print(f"  çeviri ifadesi : {len(ceviri)}")
    else:
        print("  ⚠ çeviri dosyası bulunamadı (cevrilecek_ifadeler_DOLU.json) — o adım atlanacak")

    tr_tam, tr_iskelet, tum = _havuzlar(wbw)
    ing = [t for t in tum if t[4] != "turkish"]

    # ── Âyet âyet: önce oybirliği, sonra meal (bir meal kelimesi tek Arapça kelimeye) ──
    sonuc = {}                      # yer -> (metin, kaynak)
    ayet_grup = {}
    for yer, ar, sk, metin, _d in ing:
        p = yer.split(":")
        ayet_grup.setdefault(f"{p[0]}:{p[1]}", []).append((yer, ar, sk, metin))

    sayac = Counter()
    for ay, kelimeler_ in ayet_grup.items():
        kalanlar = []
        for yer, ar, sk, ingm in kelimeler_:
            tek = _tek_karsilik(tr_tam.get(ar))
            if tek:                                       # 1) oybirliği (birebir)
                sonuc[yer] = (tek, "oybirligi")
                sayac["oybirligi"] += 1
            else:
                kalanlar.append((yer, ar, sk, ingm))
        meal = mealler.get(ay, "")
        if meal and kalanlar:
            parcalar = _meal_parcalari(meal)
            kullanilmis = set()
            puanli = []
            for yer, ar, sk, ingm in kalanlar:
                if _edat_mi(sk):
                    continue                              # edatlar mealden çekilmez
                ad = [_sade(a) for a in _havuz(tr_tam, tr_iskelet, ar, sk)]
                if not ad:
                    continue
                r = _sec(ad, parcalar, set(), ek, fark)
                puanli.append((r[0] if r else 0, yer, ar, sk, ingm, ad))
            puanli.sort(key=lambda x: -x[0])
            for _p, yer, ar, sk, ingm, ad in puanli:
                r = _sec(ad, parcalar, kullanilmis, ek, fark)
                if not r:
                    continue
                kullanilmis.update(range(r[1], r[2]))
                sonuc[yer] = (r[3], "meal")               # 2) mealden
                sayac["meal"] += 1
        for yer, ar, sk, ingm in kalanlar:
            if yer in sonuc:
                continue
            tek_i = _tek_karsilik(tr_iskelet.get(sk))
            if tek_i:                                     # 3) oybirliği (iskelet)
                sonuc[yer] = (tek_i, "oybirligi-iskelet")
                sayac["oybirligi-iskelet"] += 1
            elif ingm in ceviri:                          # 4) çeviri
                sonuc[yer] = (ceviri[ingm], "ceviri")
                sayac["ceviri"] += 1
            else:
                sayac["kalan"] += 1

    # ── Yeni dosyayı yaz ──
    yeni = {}
    for yer, v in wbw.items():
        k = dict(v)
        if yer in sonuc:
            metin, kaynak = sonuc[yer]
            k["ing"] = v.get("tr", "")                    # İngilizcesi izlenebilsin diye durur
            k["tr"] = metin
            k["dil"] = "turkish"
            k["kaynak"] = kaynak
        elif (v.get("dil") or "").lower() == "turkish":
            k["kaynak"] = "quran"
        yeni[yer] = k
    json.dump(yeni, open(cikti, "w", encoding="utf-8"), ensure_ascii=False)

    # ── Kalan iş listesi ──
    kalan = {}
    for yer, ar, sk, ingm, _d in ((t[0], t[1], t[2], t[3], t[4]) for t in ing):
        if yer in sonuc:
            continue
        d = kalan.setdefault(ingm, {"ingilizce": ingm, "arapca": ar, "adet": 0,
                                    "edat": _edat_mi(sk), "ornek_yerler": [], "turkce": ""})
        d["adet"] += 1
        if len(d["ornek_yerler"]) < 3:
            d["ornek_yerler"].append(yer)
    kalan_yolu = cikti_yolu("ing_kalan_ifadeler.json")
    json.dump(sorted(kalan.values(), key=lambda d: -d["adet"]),
              open(kalan_yolu, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    toplam = len(ing)
    yuz = lambda n: f"%{100*n/toplam:.1f}" if toplam else "%0"
    print()
    print("=" * 74)
    print("İNGİLİZCE KALANLARIN TÜRKÇELEŞTİRİLMESİ")
    print("=" * 74)
    print(f"  İngilizce kelime kaydı     : {toplam}")
    for ad, etiket in (("oybirligi", "1) oybirliği (birebir Arapça)"),
                       ("meal", "2) mealden çekilen"),
                       ("oybirligi-iskelet", "3) oybirliği (iskelet)"),
                       ("ceviri", "4) çeviri listesinden")):
        print(f"  {etiket:<32} {sayac[ad]:>6}  ({yuz(sayac[ad])})")
    kapanan = toplam - sayac["kalan"]
    print(f"  {'─ Türkçeleşen':<32} {kapanan:>6}  ({yuz(kapanan)})")
    print(f"  {'HÂLÂ İNGİLİZCE':<32} {sayac['kalan']:>6}  ({yuz(sayac['kalan'])})")
    print()
    ornekler = {}
    for yer, (metin, kaynak) in sonuc.items():
        ornekler.setdefault(kaynak, []).append((yer, wbw[yer].get("ar", ""),
                                                wbw[yer].get("tr", ""), metin))
    for kaynak in ("oybirligi", "meal", "oybirligi-iskelet", "ceviri"):
        liste = ornekler.get(kaynak, [])[:6]
        if not liste:
            continue
        print(f"  ── {kaynak} örnekleri " + "─" * (52 - len(kaynak)))
        for yer, ar, ingm, metin in liste:
            print(f"    {yer:<11} {ar:<18} {ingm:<26} → {metin}")
        print()
    print(f"  yazıldı: {cikti}")
    if sayac["kalan"]:
        edat_sayisi = sum(1 for d in kalan.values() if d["edat"])
        print(f"  yazıldı: {kalan_yolu}")
        print(f"           {len(kalan)} farklı ifade ({edat_sayisi} tanesi edat/kısa gövde),")
        print(f"           {sayac['kalan']} kelime kaydı — çevrilip ing_kalan_DOLU.json olarak")
        print("           src/data altına konursa bu kip onları da yerleştirir.")
    else:
        print("  ✓ İngilizce kalmadı.")
    print("\n  SIRADAKİ ADIM:  python3 src/py/wbw.py --birlestir wbw_tr_tam.json")
    print("  (kelime-anlam.json + kelime-grup.json + kelime-kaynak.json üretir)")


# ══════════════════════════════════════════════════════════════════════════
def sarf_kesif(sarf_yolu="quran-morphology.txt", mushaf_yolu="kuran-mushaf.json",
               harita_yolu="kelime_hizalama.json"):
    """Sarf (morfoloji) dosyasını TANI ve hizalamanın tutup tutmadığını ÖLÇ.

    NEDEN AYRI BİR DOSYA GEREKİYOR: fiilin şahıs/cins/sayı bilgisini kelimenin
    yazılışına bakarak çıkarmak GÜVENİLİR DEĞİL. İki sebep ölçülebilir:
      1) Fiil mi isim mi, yüzeyden bilinmiyor: تَقْوَىٰ (takvâ) isim ama تَ ile
         başlıyor; تَقْوِيم de öyle. Etiketsiz veriyle isimlere fiil etiketi basarız.
      2) تَ ön eki İKİ ANLAMLI: تَقُولُ hem "o (kadın) der" hem "sen dersin".
         Cümle dizimine bakmadan ayrılamaz.
    Bu yüzden etiketli bir kaynak şart. Quranic Arabic Corpus her kelimeye
    kelime türü + şahıs/cins/sayı (3MS, 2MP…) etiketi veriyor.

    Bu kip HİÇBİR ŞEY ÜRETMEZ; yalnız şunları söyler:
      • dosyanın biçimi ne (ayraç, sütunlar, örnek satırlar),
      • konum anahtarı var mı, kaç kelimeyi kapsıyor,
      • şahıs/cins/sayı etiketleri var mı, dağılımı ne,
      • BİZİM kelime id'lerimizle hizalama TUTUYOR MU (Arapça iskelet karşılaştırması).
    Son madde kritik: quran.com'un kelime numaralarının bu korpustan türediği
    söyleniyor ama VARSAYMAYALIM, ölçelim.
    """
    yol = veri_ara(sarf_yolu)
    if not yol:
        print(f"HATA: '{sarf_yolu}' bulunamadı. Dosyayı src/data altına koyun.")
        print("      (Quranic Arabic Corpus morfoloji dosyası ya da benzeri)")
        return
    print(f"  sarf dosyası: {yol}  ({os.path.getsize(yol)//1024} KB)")

    satirlar = []
    with open(yol, encoding="utf-8", errors="replace") as f:
        for i, satir in enumerate(f):
            satirlar.append(satir.rstrip("\n"))
            if i > 200000:
                break
    print(f"  satır sayısı : {len(satirlar)}")
    print("\n  ── İLK 12 SATIR (ham) " + "─" * 48)
    for satir in satirlar[:12]:
        print(f"    {satir[:150]}")

    # ── Ayraç tespiti ──
    ornek = [x for x in satirlar[:500] if x.strip() and not x.lstrip().startswith("#")]
    ayraclar = {"\t": "TAB", ",": "virgül", "|": "boru", ";": "noktalı virgül"}
    en_iyi, en_iyi_ad, en_iyi_n = None, None, 0
    for a, ad in ayraclar.items():
        n = sum(x.count(a) for x in ornek) / max(1, len(ornek))
        if n > en_iyi_n:
            en_iyi, en_iyi_ad, en_iyi_n = a, ad, n
    print(f"\n  ayraç tahmini: {en_iyi_ad}  (satır başına ~{en_iyi_n:.1f} adet)")

    # ── Konum anahtarı ──
    KONUM = re.compile(r"\(?(\d{1,3})[:\s]+(\d{1,3})[:\s]+(\d{1,3})(?:[:\s]+(\d{1,2}))?\)?")
    kayit = {}                      # "s:a:k" -> [ (segment, ham_satir) ]
    for satir in satirlar:
        if not satir.strip() or satir.lstrip().startswith("#"):
            continue
        ilk = satir.split(en_iyi)[0] if en_iyi else satir.split()[0]
        m = KONUM.match(ilk.strip())
        if not m:
            continue
        anah = f"{int(m.group(1))}:{int(m.group(2))}:{int(m.group(3))}"
        kayit.setdefault(anah, []).append(satir)
    print(f"  konum anahtarı olan kelime: {len(kayit)}")
    if not kayit:
        print("  → konum anahtarı çözülemedi; yukarıdaki ham satırları bana gönderin.")
        return

    # ── Şahıs/cins/sayı etiketleri ──
    PGN = re.compile(r"\b([123])(M|F)(S|D|P)\b")
    pgn_sayac, pos_sayac = Counter(), Counter()
    POS = re.compile(r"POS:([A-Z]+)")
    for satirlar_k in kayit.values():
        for satir in satirlar_k:
            for m in PGN.finditer(satir):
                pgn_sayac["".join(m.groups())] += 1
            for m in POS.finditer(satir):
                pos_sayac[m.group(1)] += 1
    print(f"\n  şahıs/cins/sayı etiketi (3MS gibi): {sum(pgn_sayac.values())}")
    if pgn_sayac:
        print("    " + ", ".join(f"{k}:{v}" for k, v in pgn_sayac.most_common(12)))
    else:
        print("    ⚠ bulunamadı — bu dosyada çekim bilgisi olmayabilir.")
    if pos_sayac:
        print(f"  kelime türü etiketi (POS:)         : {sum(pos_sayac.values())}")
        print("    " + ", ".join(f"{k}:{v}" for k, v in pos_sayac.most_common(10)))

    # ── HİZALAMA SINAMASI: bizim id → quran.com konumu → sarf konumu ──
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    hy = veri_ara(harita_yolu)
    if not hy:
        print("\n  ⚠ kelime_hizalama.json yok; hizalama sınanamadı.")
        return
    harita = json.load(open(hy, encoding="utf-8"))
    biz = {kid: ar for kid, ar in bizim_kelimeler(ham)}

    def sarf_arapca(satirlar_k, ayrac):
        """Kaydın FORM sütunlarını birleştir (bir kelime birkaç segmente bölünmüş olabilir).

        ESKİ HATA: satırdaki BÜTÜN Arapça toplanıyordu. Bu dosyada ROOT ve LEM
        alanları da Arapça yazılı (ROOT:حمد|LEM:حَمْد) → kelimeye kök ve sözlük
        biçimi de yapışıyordu ve hizalama tutmuyormuş gibi görünüyordu:
            ٱلْحَمْدُ  ->  ٱلْالحَمْدُحمدحَمْد
        Doğrusu YALNIZ ikinci sütunu (FORM) almak."""
        parca = []
        for satir in satirlar_k:
            alan = satir.split(ayrac) if ayrac else satir.split()
            if len(alan) > 1:
                parca.append(alan[1].strip())
        return "".join(parca)

    import random
    random.seed(4)
    ornekler = random.sample(list(harita.items()), min(1500, len(harita)))
    tam = yakin = farkli = yok = 0
    farkli_ornek = []
    for bizim_id, onlarinki in ornekler:
        hedef = onlarinki[0] if isinstance(onlarinki, list) else onlarinki
        satirlar_k = kayit.get(hedef)
        bizim_ar = biz.get(bizim_id)
        if not satirlar_k or not bizim_ar:
            yok += 1
            continue
        a, b = iskelet(bizim_ar), iskelet(sarf_arapca(satirlar_k, en_iyi))
        if not b:
            yok += 1
            continue
        if a == b:
            tam += 1
        elif benzerlik(a, b) >= 0.7:
            yakin += 1
        else:
            farkli += 1
            if len(farkli_ornek) < 10:
                farkli_ornek.append((bizim_id, hedef, bizim_ar, sarf_arapca(satirlar_k, en_iyi)))
    kar = tam + yakin + farkli
    print("\n  ── HİZALAMA SINAMASI (bizim id → sarf konumu) " + "─" * 22)
    print(f"    denenen        : {len(ornekler)}   (sarfta konum yok: {yok})")
    if kar:
        print(f"    iskelet AYNI   : {tam}  (%{round(100*tam/kar,1)})")
        print(f"    çok yakın      : {yakin}  (%{round(100*yakin/kar,1)})")
        print(f"    FARKLI         : {farkli}  (%{round(100*farkli/kar,1)})")
        if (tam + yakin) / kar > 0.95:
            print("    → HİZALAMA TUTUYOR. Mevcut kelime_hizalama.json doğrudan kullanılabilir.")
        else:
            print("    → hizalama tutmuyor; ayrı bir eşleme gerekir (yeni bir --hizala turu).")
    for bizim_id, hedef, a, b in farkli_ornek:
        print(f"      {bizim_id:<11} → {hedef:<11} bizde: {a:<18} sarfta: {b}")
    print("\n  (hiçbir dosya değiştirilmedi — bu yalnız keşif)")


# ══════════════════════════════════════════════════════════════════════════
# SARF ETİKETLERİNİN TÜRKÇESİ
# Korpus etiketleri kısa kodlar: 3MP = 3. şahıs / eril (Masculine) / çoğul (Plural).
# D = ikil (dual) — Arapça'da tesniye; Türkçe'de karşılığı olmadığı için "ikil" denir.
_SAHIS = {"1": "1.", "2": "2.", "3": "3."}
_CINS  = {"M": "eril", "F": "dişil"}
_SAYI  = {"S": "tekil", "D": "ikil", "P": "çoğul"}
# Kip/çatı etiketleri — dosyada hangi adlarla geçtiği ÖLÇÜLÜP raporlanır, körlemesine
# varsayılmaz; tanınmayan etiketler ayrıca listelenir.
_KIP = {
    "PERF": "geçmiş", "IMPF": "geniş", "IMPV": "emir",
    "PASS": "edilgen", "ACT": "etken",
}
_TUR = {
    "V": "fiil", "N": "isim", "PN": "özel isim", "ADJ": "sıfat", "PRON": "zamir",
    "P": "edat", "CONJ": "bağlaç", "DET": "harf-i tarif", "NEG": "olumsuzluk",
    "INTG": "soru", "PRP": "ta'lil", "ACC": "nasb", "COND": "şart",
}


def sarf_uret(sarf_yolu="quran-morphology.txt", mushaf_yolu="kuran-mushaf.json",
              harita_yolu="kelime_hizalama.json", cikti="kelime-sarf.json"):
    """Fiillerin ŞAHIS/CİNS/SAYI/KİP bilgisini bizim kelime id'lerimize bağlar.

    NEDEN ETİKETLİ KAYNAK: yazılıştan çıkarmak güvenilir değil — تَقْوَىٰ isim ama
    تَ ile başlıyor; تَقُولُ hem "o (kadın) der" hem "sen dersin" olabilir. Korpus
    bunları zaten etiketlemiş, biz yalnız BAĞLIYORUZ.

    ÖNCE ÖLÇER: fiil satırlarındaki etiket dağarcığını döker, tanıdıklarını eşler,
    TANIMADIKLARINI AYRICA LİSTELER — sessizce atlamaz.
    Çıktı: id -> {tur, kip, sahis, cins, sayi, etiket, zamir}  (yalnız bilgi olanlar)
    """
    yol = girdi(sarf_yolu, "Morfoloji dosyasını src/data altına koyun.")
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    harita = json.load(open(girdi(harita_yolu), encoding="utf-8"))
    cikti = cikti_yolu(cikti)

    # ── Oku: konum -> segment satırları ──
    kayit = {}
    KONUM = re.compile(r"^(\d{1,3}):(\d{1,3}):(\d{1,3}):(\d{1,3})$")
    with open(yol, encoding="utf-8", errors="replace") as f:
        for satir in f:
            alan = satir.rstrip("\n").split("\t")
            if len(alan) < 3:
                continue
            m = KONUM.match(alan[0].strip())
            if not m:
                continue
            anah = f"{int(m.group(1))}:{int(m.group(2))}:{int(m.group(3))}"
            kayit.setdefault(anah, []).append(
                (int(m.group(4)), alan[1].strip(), alan[2].strip(),
                 alan[3].strip() if len(alan) > 3 else ""))
    print(f"  sarf konumu: {len(kayit)}")

    # ── Etiket dağarcığı ölçümü (fiil satırları) ──
    PGN = re.compile(r"^([123])(M|F)(S|D|P)$")
    # CİNSİYETSİZ ÇEKİMLER — eksik veri DEĞİL, Arapça'nın kendi yapısı:
    #   1S / 1P → 1. şahısta (ben / biz) eril-dişil ayrımı YOKTUR
    #   2D      → 2. şahıs İKİLDE de ayrım yoktur (antumâ tek biçim)
    # Bunlar önce "tanınmayan etiket" diye raporlanıyor ve 2487 fiil çekimsiz
    # kalıyordu (1P:1860 + 1S:573 + 2D:54). Cinsiyet alanı BOŞ bırakılır;
    # uydurulmaz — "1. çoğul eril" demek yanlış olurdu.
    PGN_CINSSIZ = re.compile(r"^([123])(S|D|P)$")
    fiil_etiket, taninmayan = Counter(), Counter()
    for segler in kayit.values():
        for _sg, _form, tag, ozl in segler:
            if tag != "V":
                continue
            for t in re.split(r"[|]", ozl):
                t = t.strip()
                if not t or ":" in t:
                    continue
                fiil_etiket[t] += 1
                if (t not in _KIP and not PGN.match(t)
                        and not PGN_CINSSIZ.match(t) and t not in _TUR):
                    taninmayan[t] += 1
    print("\n  ── FİİL satırlarındaki etiketler (en sık 24) " + "─" * 24)
    print("    " + ", ".join(f"{k}:{v}" for k, v in fiil_etiket.most_common(24)))
    if taninmayan:
        print(f"\n  ⚠ TANINMAYAN etiket ({len(taninmayan)} çeşit) — eşlenmedi, gözden geçirin:")
        print("    " + ", ".join(f"{k}:{v}" for k, v in taninmayan.most_common(20)))

    # ── Bizim id'lere bağla ──
    biz = {kid: ar for kid, ar in bizim_kelimeler(ham)}
    sonuc, sayac = {}, Counter()
    for bizim_id, onlarinki in harita.items():
        hedef = onlarinki[0] if isinstance(onlarinki, list) else onlarinki
        segler = kayit.get(hedef)
        if not segler or bizim_id not in biz:
            sayac["konum-yok"] += 1
            continue
        segler = sorted(segler)
        bilgi = {}
        for _sg, _form, tag, ozl in segler:
            parca = [t.strip() for t in re.split(r"[|]", ozl) if t.strip()]
            if tag == "V":
                bilgi["tur"] = "fiil"
                for t in parca:
                    if t in _KIP:
                        if t in ("PASS", "ACT"):
                            bilgi["cati"] = _KIP[t]
                        else:
                            bilgi["kip"] = _KIP[t]
                    m = PGN.match(t)
                    if m:
                        bilgi["sahis"] = _SAHIS[m.group(1)]
                        bilgi["cins"] = _CINS[m.group(2)]
                        bilgi["sayi"] = _SAYI[m.group(3)]
                        continue
                    m = PGN_CINSSIZ.match(t)
                    if m:
                        # cins KONMAZ (1. şahısta / 2. ikilde Arapça'da yok)
                        bilgi["sahis"] = _SAHIS[m.group(1)]
                        bilgi["sayi"] = _SAYI[m.group(2)]
            elif tag == "PRON":
                for t in parca:
                    son = t.split(":")[-1]
                    m = PGN.match(son)
                    if m:
                        bilgi["zamir"] = f"{_SAHIS[m.group(1)]} {_SAYI[m.group(3)]} {_CINS[m.group(2)]}"
                        continue
                    m = PGN_CINSSIZ.match(son)
                    if m:
                        bilgi["zamir"] = f"{_SAHIS[m.group(1)]} {_SAYI[m.group(2)]}"
        if bilgi.get("tur") == "fiil" and "sahis" in bilgi:
            # Cinsiyet varsa eklenir, yoksa hiç yazılmaz: "1. çoğul", "2. ikil".
            cekim = [bilgi["sahis"], bilgi["sayi"]]
            if bilgi.get("cins"):
                cekim.append(bilgi["cins"])
            parcalar = [" ".join(cekim)]
            if bilgi.get("kip"):
                parcalar.append(bilgi["kip"])
            if bilgi.get("cati") == "edilgen":
                parcalar.append("edilgen")
            bilgi["etiket"] = " · ".join(parcalar)
            sayac["fiil-cekimli"] += 1
        elif bilgi.get("tur") == "fiil":
            sayac["fiil-cekimsiz"] += 1
        if bilgi:
            sonuc[bizim_id] = bilgi
    json.dump(sonuc, open(cikti, "w", encoding="utf-8"), ensure_ascii=False)

    print("\n" + "=" * 74)
    print("SARF BİLGİSİ")
    print("=" * 74)
    print(f"  haritadaki kelime      : {len(harita)}")
    print(f"  çekimi çıkarılan FİİL  : {sayac['fiil-cekimli']}")
    print(f"  fiil ama çekim yok     : {sayac['fiil-cekimsiz']}")
    print(f"  sarfta konum yok       : {sayac['konum-yok']}")
    print(f"  dosyaya yazılan kayıt  : {len(sonuc)}")
    ornek = [(k, v) for k, v in sonuc.items() if v.get("etiket")][:14]
    print("\n  ── örnekler " + "─" * 58)
    for k, v in ornek:
        print(f"    {k:<12} {biz.get(k,''):<18} {v['etiket']}")
    print(f"\n  yazıldı: {cikti}  ({os.path.getsize(cikti)//1024} KB)")
    print("  (mevcut hiçbir dosya değiştirilmedi)")


# ══════════════════════════════════════════════════════════════════════════
def bolunme_denetle(mushaf_yolu="kuran-mushaf.json", wbw_yolu="wbw_tr.json",
                    cikti="bolunme_farklari.json", ayrinti=25):
    """Bizim kelime bölünmemiz quran.com'unkiyle AYNI MI? Âyet âyet karşılaştırır.

    HEDEF: quran.com hangi kelimeyi bölmüşse biz de aynı yerde bölelim.
    Çünkü kelime kelime okuma, kelime sesi (WBW mp3) ve anlam eşlemesi hep
    o bölünmeye göre. Ayrışınca "يَٰبُنَىَّ" gibi kalıplar bizde iki kelime,
    onlarda tek oluyor; okuyucu aynı anlamı iki kez gösteriyor.

    İKİ YÖNLÜ FARK VAR, ikisi de raporlanır:
      • BİZDE FAZLA : biz bölmüşüz, onlar bölmemiş  (birleştirilmeli)
      • ONLARDA FAZLA: onlar bölmüş, biz bölmemişiz (bölünmeli)
    Ayrıca âyet metni İKİ TARAFTA AYNI MI diye iskelet karşılaştırması yapılır —
    sayı farkı bölünmeden mi geliyor yoksa metin gerçekten farklı mı, ayrılsın.

    HİÇBİR DOSYAYI DEĞİŞTİRMEZ; iş listesi yazar.
    """
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    wbw = json.load(open(girdi(wbw_yolu), encoding="utf-8"))
    cikti = cikti_yolu(cikti)

    # ── Bizim kelimeler: âyet -> [(id, arapca)] ──
    biz = {}
    for kid, ar in bizim_kelimeler(ham):
        p = str(kid).split(":")
        if len(p) >= 3 and all(x.isdigit() for x in p[:3]):
            biz.setdefault(f"{p[0]}:{p[1]}", []).append((int(p[2]), kid, ar))
    for v in biz.values():
        v.sort()

    # ── Onların kelimeleri: âyet -> [(sira, yer, arapca)] ("end" jetonu kelime değil) ──
    onlar = {}
    for yer, v in wbw.items():
        if v.get("tip") == "end":
            continue
        p = yer.split(":")
        if len(p) < 3 or not all(x.isdigit() for x in p):
            continue
        onlar.setdefault(f"{p[0]}:{p[1]}", []).append((int(p[2]), yer, v.get("ar", "")))
    for v in onlar.values():
        v.sort()

    ayni = bizde_fazla = onlarda_fazla = yok = 0
    metin_farkli = 0
    kayitlar = []
    for ay in sorted(set(biz) | set(onlar), key=lambda x: [int(t) for t in x.split(":")]):
        b, o = biz.get(ay), onlar.get(ay)
        if not b or not o:
            yok += 1
            continue
        if len(b) == len(o):
            ayni += 1
            continue
        # Metin gerçekten aynı mı? (bölünme farkı ↔ metin farkı ayrımı)
        #
        # SABİT ORAN KULLANILMIYOR, ÖLÇÜLDÜ: iki kaynağın imlâsı birebir aynı
        # değil (bizde "يَا"+dagger elif, onlarda "يَٰ"; إسرائيل'in ي'si vb.),
        # bu yüzden salt bölünme farkı olan âyetlerde bile 1-2 harf oynuyor.
        # Kısa âyette 1 harf oranı %96'ya düşürüyor — 0.97 gibi sabit bir eşik
        # o âyetleri yanlışlıkla "metin farklı" diye işaretliyordu. Onun için
        # izin UZUNLUĞA bağlı: kısa âyette 2 harf, uzunda %6.
        # Gerçek metin farkı bu bandın çok altında kalıyor (ölçüm: imlâ farkı
        # 0.96 · gerçekten başka âyet 0.33), yani ayrım güvenli.
        bi = iskelet("".join(x[2] for x in b))
        oi = iskelet("".join(x[2] for x in o))
        oran = benzerlik(bi, oi)
        uzun = max(1, len(bi), len(oi))
        metin_ayni = oran >= 1 - max(2.0, 0.06 * uzun) / uzun
        if not metin_ayni:
            metin_farkli += 1
        if len(b) > len(o):
            bizde_fazla += 1
            yon = "birlestir"     # biz bölmüşüz → birleştirilmeli
        else:
            onlarda_fazla += 1
            yon = "bol"           # onlar bölmüş → bölünmeli
        kayitlar.append({
            "ayet": ay, "yon": yon,
            "bizde": len(b), "onlarda": len(o), "fark": len(b) - len(o),
            "metin_ayni": metin_ayni,
            "benzerlik": round(oran, 3),
            "bizim_kelimeler": [x[2] for x in b],
            "onlarin_kelimeleri": [x[2] for x in o],
            "bizim_idler": [x[1] for x in b],
        })

    toplam = ayni + bizde_fazla + onlarda_fazla
    y = lambda n: f"%{100*n/toplam:.1f}" if toplam else "%0"
    print("=" * 74)
    print("KELİME BÖLÜNMESİ — BİZ ↔ QURAN.COM")
    print("=" * 74)
    print(f"  karşılaştırılan âyet    : {toplam}   (tek tarafta olan: {yok})")
    print(f"  kelime sayısı AYNI      : {ayni}  ({y(ayni)})")
    print(f"  BİZDE fazla (birleştir) : {bizde_fazla}  ({y(bizde_fazla)})")
    print(f"  ONLARDA fazla (böl)     : {onlarda_fazla}  ({y(onlarda_fazla)})")
    print(f"  ⚠ metni de farklı olan  : {metin_farkli}  (bölünme değil, METİN farkı — ayrı iş)")
    print(f"  toplam kelime  bizde {sum(len(v) for v in biz.values())}  ·  onlarda {sum(len(v) for v in onlar.values())}")
    print()

    def dok(baslik, yon, n):
        liste = [k for k in kayitlar if k["yon"] == yon]
        if not liste:
            return
        print(f"  ── {baslik} ({len(liste)} âyet) " + "─" * max(0, 40 - len(baslik)))
        for k in liste[:n]:
            im = "" if k["metin_ayni"] else f"  ⚠METİN FARKLI (benzerlik {k['benzerlik']})"
            print(f"    {k['ayet']:<9} bizde {k['bizde']} / onlarda {k['onlarda']}{im}")
            # yalnız ayrışan bölgeyi göster: baştan ve sondan ortak kısmı at
            b, o = k["bizim_kelimeler"], k["onlarin_kelimeleri"]
            i = 0
            while i < min(len(b), len(o)) and iskelet(b[i]) == iskelet(o[i]):
                i += 1
            j = 0
            while (j < min(len(b), len(o)) - i
                   and iskelet(b[len(b)-1-j]) == iskelet(o[len(o)-1-j])):
                j += 1
            print(f"      bizde  : {' | '.join(b[i:len(b)-j]) or '—'}")
            print(f"      onlarda: {' | '.join(o[i:len(o)-j]) or '—'}")
        if len(liste) > n:
            print(f"    … ve {len(liste)-n} âyet daha")
        print()

    dok("BİZDE FAZLA — birleştirilecek", "birlestir", ayrinti)
    dok("ONLARDA FAZLA — bölünecek", "bol", ayrinti)

    json.dump(kayitlar, open(cikti, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  yazıldı: {cikti}  ({len(kayitlar)} âyet)")
    print("  (hiçbir dosya değiştirilmedi — bu yalnız ölçüm)")
    print()
    print("  NOT: bu farkları düzeltmek kelime NUMARALARINI kaydırır. Düzeltme")
    print("  yapılırsa kelime-anlam / kelime-grup / kelime-sarf / kelime_hizalama")
    print("  dosyalarının HEPSİ yeniden üretilmelidir.")


# ══════════════════════════════════════════════════════════════════════════
def _kelime_listeleri(d, out=None):
    """Kelime nesnelerini TUTAN listeleri bulur.

    `bizim_kelimeler` kelimeleri okur ama silmek için onları BARINDIRAN listeye
    erişmek gerekiyor; bu yüzden ayrı bir gezinti. Bir liste, içinde `arabic`
    alanlı en az bir sözlük varsa "kelime listesi" sayılır.
    """
    if out is None:
        out = []
    if isinstance(d, list):
        if any(isinstance(x, dict) and isinstance(x.get("arabic"), str) for x in d):
            out.append(d)
        for x in d:
            _kelime_listeleri(x, out)
    elif isinstance(d, dict):
        for v in d.values():
            _kelime_listeleri(v, out)
    return out


def ayet_kod(yer, mushaf_yolu="kuran-mushaf.json"):
    """Bir âyetin kelimelerini KOD NOKTASI KOD NOKTASI döker. Hiçbir şey yazmaz.

    NEDEN: "şu kelime fazla" demek için gözle bakmak yetmiyor — iki kelime
    ekranda aynı görünüp farklı kodlardan oluşabiliyor (ör. uzun î: U+0656 alt
    elifle mi yazılmış yoksa tam ي ile mi). İmlâ farkı, o kelimenin BAŞKA BİR
    KAYNAKTAN sızdığının en sağlam delili. Kesmeden önce burası okunur.
    """
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    hedef = str(yer).strip()
    bulunan = [(kid, ar) for kid, ar in bizim_kelimeler(ham)
               if str(kid).startswith(hedef + ":")]
    if not bulunan:
        print(f"HATA: '{hedef}' âyetinde kelime bulunamadı.")
        return
    bulunan.sort(key=lambda x: int(str(x[0]).split(":")[2]))
    print("=" * 74)
    print(f"ÂYET {hedef} — {len(bulunan)} kelime")
    print("=" * 74)
    for kid, ar in bulunan:
        kodlar = " ".join(f"U+{ord(c):04X}" for c in ar)
        print(f"  {kid:<12} {ar}")
        print(f"               iskelet: {iskelet(ar)}")
        print(f"               {kodlar}")
        print()
    # Aynı iskelete sahip İKİ kelime varsa tekrar şüphesi doğar — söylenir.
    sayac = Counter(iskelet(ar) for _kid, ar in bulunan)
    tekrar = [sk for sk, n in sayac.items() if n > 1 and sk]
    if tekrar:
        print("  ⚠ AYNI İSKELETTE BİRDEN ÇOK KELİME (tekrar olabilir):")
        for sk in tekrar:
            esler = [kid for kid, ar in bulunan if iskelet(ar) == sk]
            print(f"    {sk} → {', '.join(esler)}")
    # Kısmî tekrar: bir kelimenin iskeleti diğerinin SONUNDA geçiyorsa
    # (ör. "الياسين" içinde "ياسين") o ikinci kelime fazladan yazılmış olabilir.
    for kid, ar in bulunan:
        sk = iskelet(ar)
        if not sk:
            continue
        for kid2, ar2 in bulunan:
            if kid2 == kid:
                continue
            sk2 = iskelet(ar2)
            if sk2 and sk2 != sk and sk.endswith(sk2) and len(sk2) >= 3:
                print(f"  ⚠ {kid2} ({ar2}) → {kid} ({ar}) kelimesinin SONUNDA zaten var.")


# ══════════════════════════════════════════════════════════════════════════
def kelime_sil(hedef_id, mushaf_yolu="kuran-mushaf.json", yaz=False):
    """Mushaftan TEK bir kelimeyi siler; kendinden sonrakileri yeniden numaralar.

    KUR'AN METNİNE DOKUNAN TEK KİP BU. Onun için:
      • varsayılan KURU ÇALIŞMA — `--yaz` verilmeden hiçbir dosya değişmez,
      • yazarken önce `.yedek` alınır,
      • türetilmiş dosyalardan hangilerinin elden geçmesi gerektiği söylenir.

    Silinen kelime âyetin SONUNDA değilse arkasındaki bütün kelimelerin id'si
    kayar; o zaman kelime-anlam / kelime-grup / kelime-sarf / kelime_hizalama /
    kelime-mapping dosyalarının O ÂYETE ait anahtarları da kaymış olur ve
    yeniden üretilmeleri gerekir. Sonuncuysa yalnız o anahtar düşer.
    """
    yol = yol_coz(mushaf_yolu)
    ham = json.load(open(yol, encoding="utf-8"))
    hedef_id = str(hedef_id).strip()
    p = hedef_id.split(":")
    if len(p) != 3 or not all(x.isdigit() for x in p):
        print("HATA: kelime id'si 'SURE:AYET:SIRA' biçiminde olmalı (ör. 37:130:4).")
        return
    ayet_on = f"{p[0]}:{p[1]}:"
    sira = int(p[2])

    liste = None
    indeks = None
    for lst in _kelime_listeleri(ham):
        for i, k in enumerate(lst):
            if isinstance(k, dict) and str(k.get("id")) == hedef_id:
                liste, indeks = lst, i
                break
        if liste is not None:
            break
    if liste is None:
        print(f"HATA: '{hedef_id}' mushafta bulunamadı.")
        return

    silinen = liste[indeks]
    # Aynı âyetin, silinenden SONRAKİ kelimeleri (numarası kayacak olanlar)
    sonrakiler = [k for k in liste
                  if isinstance(k, dict) and str(k.get("id", "")).startswith(ayet_on)
                  and int(str(k["id"]).split(":")[2]) > sira]

    print("=" * 74)
    print("KELİME SİLME" + ("" if yaz else "  —  KURU ÇALIŞMA (hiçbir dosya değişmiyor)"))
    print("=" * 74)
    print(f"  dosya      : {yol}")
    print(f"  silinecek  : {hedef_id}   {silinen.get('arabic','')}")
    print(f"               {' '.join(f'U+{ord(c):04X}' for c in silinen.get('arabic',''))}")
    print(f"  ardından kayacak kelime sayısı: {len(sonrakiler)}")
    print()
    if sonrakiler:
        print("  ⚠ SON KELİME DEĞİL → numaralar kayacak. Silme sonrası şu dosyaların")
        print("    bu âyete ait kayıtları GEÇERSİZ olur, yeniden üretilmeli:")
        print("      kelime-anlam.json · kelime-grup.json · kelime-sarf.json")
        print("      kelime_hizalama.json · kelime-mapping.json")
    else:
        print("  ✓ Âyetin SON kelimesi → başka hiçbir numara kaymıyor.")
        print("    Türetilmiş dosyalardan yalnız bu anahtar düşürülmeli:")
        print(f"      {hedef_id}")
    print()

    if not yaz:
        print("  Uygulamak için aynı komuta --yaz ekleyin.")
        return

    yedek = yol + ".yedek"
    shutil_kopya(yol, yedek)
    liste.pop(indeks)
    for k in sonrakiler:
        eski = str(k["id"])
        n = int(eski.split(":")[2]) - 1
        k["id"] = f"{ayet_on}{n}"
    json.dump(ham, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"  yedek alındı : {yedek}")
    print(f"  YAZILDI      : {yol}")
    if sonrakiler:
        print(f"  {len(sonrakiler)} kelimenin numarası bir geri kaydırıldı.")


# ══════════════════════════════════════════════════════════════════════════
# GEVŞEK İSKELET — YALNIZ BU DENETİM İÇİN
# `iskelet()` hizalama motorunun ölçü aleti; ona DOKUNULMUYOR. Burada ondan
# daha gevşek bir ölçü gerekiyor, çünkü iki kaynağın imlâsı iki yerde SİSTEMLİ
# ayrışıyor ve bu, gerçek kusurları 358 satırlık gürültünün altına gömüyordu:
#   • uzun â: bizde tam elif (اٰمَنُوا), onlarda hemze+elif (ءَامَنُوٓا۟)
#   • dagger elif: bizde tam elif (الْمُؤْمِنَاتُ), onlarda U+0670 (ٱلْمُؤْمِنَـٰتُ)
# İkisi de elif/hemze oynaması. Onun için karşılaştırmada ZAYIF HARFLER (ا ve ء)
# tamamen düşürülüyor; geriye iki kaynakta da aynı olan ünsüz iskeleti kalıyor.
# ÖLÇÜLDÜ: "امنوا"/"ءامنوا" → ikisi de "منو"; "المءمنات"/"المءمنت" → ikisi de "لممنت".
#
# İLK DENEMEDE YALNIZ ا ve ء düşürülmüştü; yetmedi. Kalan 164 "DİĞER" satırının
# tamamı da imlâ oynamasıydı ve hepsi و / ي üzerindeydi:
#   مُسْتَهْزِؤُ࣒نَ ↔ مُسْتَهْزِءُونَ   (bizde ؤ + medd işareti, onlarda ءُو)
#   اِبْرٰهٖيمَ    ↔ إِبْرَٰهِـۧمَ      (bizde tam ي, onlarda üst ي U+06E7)
# Onun için DÖRT zayıf harf de düşürülüyor; geriye salt ünsüz iskeleti kalıyor.
# BEDELİ VAR, saklamıyoruz: yalnız zayıf harften ibaret bir fazlalık/eksiklik
# artık görünmez. Karşılığında 164 sahte satır kapanıyor ve gerçek kusurlar
# (fazladan kelime, yapışık kelime) olduğu gibi duruyor — ölçüldü.
_ZAYIF = str.maketrans({"ء": "", "ا": "", "و": "", "ي": ""})
# Daha SIKI ölçü (yalnız ا/ء düşer): bir bulgunun delili ne kadar güçlü,
# onu söylemek için kullanılıyor.
_ZAYIF_SIKI = str.maketrans({"ء": "", "ا": ""})
# YABANCI İMLÂ: bizim mushafımız bu iki kodu KULLANMIYOR. Fazladan kelimelerin
# hepsi bunlarla yazılmış — yani başka bir kaynaktan sızdıklarının işareti.
#   U+06E1 (ۡ) sükûn varyantı · U+0671 (ٱ) vasl elifi
_YABANCI = ("\u06E1", "\u0671")


def gevsek(t):
    return iskelet(t).translate(_ZAYIF)


def gevsek_siki(t):
    return iskelet(t).translate(_ZAYIF_SIKI)


def elif_sayisi(t):
    """İskeletteki tam elif sayısı. YAPIŞIK testinin emniyet supabı:
    bizim imlâmız tam elif yazar, onlarınki aynı yerde dagger elif (U+0670)
    kullanır ve o iskelette DÜŞER. Dolayısıyla bizim elif sayımız onlarınkinden
    AZ OLAMAZ. Az çıkıyorsa eşleşme uydurmadır — ör. bizim `وَعَلَى` ("ve alâ")
    onların `أَوْ` + `عَلَىٰ` ("ev alâ") ikilisine denk sanılıyordu."""
    return iskelet(t).count("ا")


def yabanci_imla(t):
    return any(c in str(t or "") for c in _YABANCI)


def metin_denetle(mushaf_yolu="kuran-mushaf.json", wbw_yolu="wbw_tr.json",
                  cikti="metin_farklari.json", ayrinti=25):
    """Âyet metnini quran.com'unkiyle karşılaştırır ve kusurları SINIFLANDIRIR.

    Üç sınıf ayrı ayrı raporlanır, çünkü düzeltmeleri farklı:
      TEKRAR  : bizde fazladan kelime var, çoğu komşusunun tekrarı
                (37:130'daki `يَاسِينَ` ve `ذُوالْعَرْشِ` + `ٱلۡعَرۡشِ` ailesi).
                Düzeltmesi: fazladan kelimeyi SİL (--kelime-sil).
      YAPIŞIK : bizim TEK kelimemiz, onların ARDIŞIK 2+ kelimesine eşit
                (19:12 `الْحُكْمَصَبِيًّا`). Düzeltmesi: kelimeyi BÖL.
                Bu sınıf kelime SAYISINA bakan denetimlerden kaçıyor, çünkü
                aynı âyette başka bir yerde fazladan bölme varsa sayı tutuyor.
      DİĞER   : kalan metin farkları — elle bakılacak.

    Karşılaştırma `gevsek()` ile; hiçbir dosya değiştirilmez.
    """
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    wbw = json.load(open(girdi(wbw_yolu), encoding="utf-8"))
    cikti = cikti_yolu(cikti)

    biz = {}
    for kid, ar in bizim_kelimeler(ham):
        p = str(kid).split(":")
        if len(p) >= 3 and all(x.isdigit() for x in p[:3]):
            biz.setdefault(f"{p[0]}:{p[1]}", []).append((int(p[2]), kid, ar))
    for v in biz.values():
        v.sort()

    onlar = {}
    for yer, v in wbw.items():
        if v.get("tip") == "end":
            continue
        p = yer.split(":")
        if len(p) < 3 or not all(x.isdigit() for x in p):
            continue
        onlar.setdefault(f"{p[0]}:{p[1]}", []).append((int(p[2]), v.get("ar", "")))
    for v in onlar.values():
        v.sort()

    ortak = sorted(set(biz) & set(onlar), key=lambda x: [int(t) for t in x.split(":")])
    tam = 0
    kayitlar = []
    for ay in ortak:
        bkl = biz[ay]                       # [(sira, id, arapca)]
        okl = [x[1] for x in onlar[ay]]
        b_g = [gevsek(x[2]) for x in bkl]
        o_g = [gevsek(w) for w in okl]
        b_hep, o_hep = "".join(b_g), "".join(o_g)

        # ── YAPIŞIK — HER ÂYETTE aranır, metin toplamı tutsa bile ────────
        # ÖNEMLİ: yapışık kelime metnin TOPLAMINI değiştirmez ("الحكم"+"صبيا"
        # ile "الحكمصبيا" aynı harfler), bu yüzden ne kelime sayısı ne de
        # metin karşılaştırması onu yakalar. 19:12 böyle kaçıyordu. Tek yolu
        # kelime kelime bakmak.
        # YAPIŞIK testi SIKI ölçüyle (yalnız ا/ء düşer). Gevşek ölçüyle (و, ي de
        # düşünce) bir sürü sahte eşleşme çıkıyordu: `الْعَلٖيمُ` → `لَا`+`عِلْمَ`,
        # `النَّصَارٰى` → `وَلَا`+`نَصٖيرٍ` gibi. 18 etiketli vakada ölçüldü:
        # sıkı ölçü + en az 3 harf + elif kuralı → 9/9 gerçek tutuluyor, 9/9 sahte
        # eleniyor. Meşru Osmanlı kaynaşmaları da (مِمَّا = مِن+مَا) doğru biçimde
        # ELENİYOR, çünkü kaynaşmada harfler değişir, birebir birleşme olmaz.
        b_s2 = [gevsek_siki(x[2]) for x in bkl]
        o_s2 = [gevsek_siki(w) for w in okl]
        b_e = [elif_sayisi(x[2]) for x in bkl]
        o_e = [elif_sayisi(w) for w in okl]
        yapisik = []
        for i, sk in enumerate(b_s2):
            if len(sk) < 3:
                continue
            for j in range(len(o_s2)):
                birikim = ""
                for k in range(j, min(j + 5, len(o_s2))):
                    birikim += o_s2[k]
                    if k > j and birikim == sk and b_e[i] >= sum(o_e[j:k + 1]):
                        yapisik.append({"id": bkl[i][1], "bizim": bkl[i][2],
                                        "onlarin": " + ".join(okl[j:k + 1])})
                        break
                    if len(birikim) > len(sk):
                        break

        # ── TEKRAR — KESİN TEST ─────────────────────────────────────────
        # "Şu kelimeyi atınca metin onlarınkiyle BİREBİR tutuyor mu?" Tutuyorsa
        # o kelimenin fazla olduğu tartışmasızdır. Önceki deneme hizalayıcının
        # (SequenceMatcher) hangi kelimeyi fazla saydığına bakıyordu; 85:15'te
        # hizalayıcı `ذُوالْعَرْشِ`yi işaretledi, oysa fazla olan ikinci
        # `ٱلۡعَرۡشِ` idi — ikisi de sayıya uyduğu için ayırt edemiyordu.
        tekrar = []
        if b_hep != o_hep and len(b_hep) > len(o_hep):
            b_s = [gevsek_siki(x[2]) for x in bkl]
            o_s = "".join(gevsek_siki(w) for w in okl)
            for i in range(len(b_g)):
                if not b_g[i]:
                    continue
                if "".join(b_g[:i] + b_g[i + 1:]) != o_hep:
                    continue
                komsu = ""
                for k in (i - 1, i + 1):
                    if 0 <= k < len(b_g) and b_g[k] and b_g[k].endswith(b_g[i]):
                        komsu = bkl[k][2]
                # Delil gücü: sıkı ölçüde de tutuyorsa şüphe yok. Ayrıca kelime
                # bizim mushafın kullanmadığı imlâyla yazılmışsa (ٱ / ۡ) dışarıdan
                # sızdığı ayrıca belli olur. 55:27'de iki aday çıkıyor ve doğru
                # olanı ancak bu ayırt ediyor.
                tekrar.append({
                    "id": bkl[i][1], "ar": bkl[i][2], "komsu": komsu,
                    "yabanci_imla": yabanci_imla(bkl[i][2]),
                    "siki_de_tutuyor": "".join(b_s[:i] + b_s[i + 1:]) == o_s,
                })
            # DELİLSİZ ADAY ATILIR. Yalnız gevşek ölçüde tutuyorsa (ne yabancı
            # imlâsı var ne de sıkı ölçüde tutuyor) bu, zayıf harf elemesinin
            # ürettiği bir tesadüf olabilir — 72:16'daki `وَاَنْ` böyleydi.
            # Böyleleri "sil" denmeden DİĞER'e bırakılır.
            tekrar = [t for t in tekrar if t["yabanci_imla"] or t["siki_de_tutuyor"]]
            # Birden çok aday varsa yabancı imlâlı olan öne alınır.
            tekrar.sort(key=lambda t: (not t["yabanci_imla"], not t["siki_de_tutuyor"]))

        if b_hep == o_hep and not yapisik:
            tam += 1
            continue

        fazla, eksik = [], []
        for et, i1, i2, j1, j2 in SequenceMatcher(None, b_g, o_g).get_opcodes():
            if et in ("delete", "replace"):
                fazla.extend(x[2] for x in bkl[i1:i2])
            if et in ("insert", "replace"):
                eksik.extend(okl[j1:j2])

        sinif = "tekrar" if tekrar else ("yapisik" if yapisik else "diger")
        kayitlar.append({
            "ayet": ay, "sinif": sinif,
            "bizde_kelime": len(bkl), "onlarda_kelime": len(okl),
            "tekrar": tekrar, "yapisik": yapisik,
            "bizde_fazla": fazla,
            "onlarda_var": eksik,
            "bizim": " ".join(x[2] for x in bkl),
            "onlarin": " ".join(okl),
        })

    say = Counter(k["sinif"] for k in kayitlar)
    print("=" * 74)
    print("ÂYET METNİ — BİZ ↔ QURAN.COM  (zayıf harfler düşürülmüş iskelet)")
    print("=" * 74)
    print(f"  karşılaştırılan âyet : {len(ortak)}")
    print(f"  metni AYNI           : {tam}   (%{100*tam/max(1,len(ortak)):.1f})")
    print(f"  ⚠ farklı olan        : {len(kayitlar)}")
    print(f"      TEKRAR (sil)     : {say['tekrar']}")
    print(f"      YAPIŞIK (böl)    : {say['yapisik']}")
    print(f"      DİĞER (incele)   : {say['diger']}")
    print()

    def dok(baslik, sinif, n):
        liste = [k for k in kayitlar if k["sinif"] == sinif]
        if not liste:
            return
        print(f"  ── {baslik} ({len(liste)} âyet) " + "─" * max(0, 42 - len(baslik)))
        for k in liste[:n]:
            print(f"    {k['ayet']:<9} kelime {k['bizde_kelime']}/{k['onlarda_kelime']}")
            for n, t in enumerate(k["tekrar"]):
                etiket = "SİL" if n == 0 else " ya da"
                delil = []
                if t["yabanci_imla"]:
                    delil.append("yabancı imlâ")
                if t["siki_de_tutuyor"]:
                    delil.append("sıkı ölçüde de tutuyor")
                d = ("  [" + ", ".join(delil) + "]") if delil else ""
                print(f"      {etiket} {t['id']:<12} {t['ar']}      (komşusu: {t['komsu']}){d}")
            for y in k["yapisik"]:
                print(f"      BÖL {y['id']:<12} {y['bizim']}   →   {y['onlarin']}")
            if sinif == "diger":
                if k["bizde_fazla"]:
                    print(f"      BİZDE fazla : {' | '.join(k['bizde_fazla'][:5])}")
                if k["onlarda_var"]:
                    print(f"      ONLARDA var : {' | '.join(k['onlarda_var'][:5])}")
        if len(liste) > n:
            print(f"    … ve {len(liste)-n} âyet daha (tamamı dosyada)")
        print()

    dok("TEKRAR — fazladan kelime, SİLİNECEK", "tekrar", ayrinti)
    dok("YAPIŞIK — iki kelime bitişik yazılmış, BÖLÜNECEK", "yapisik", ayrinti)
    dok("DİĞER — elle incelenecek", "diger", ayrinti)

    json.dump(kayitlar, open(cikti, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  yazıldı: {cikti}  ({len(kayitlar)} âyet)")
    print("  (hiçbir dosya değiştirilmedi — bu yalnız ölçüm)")
    if say["tekrar"]:
        print()
        print("  Silme komutu (önce --yaz'sız çalıştırıp bakın):")
        print("    python3 src/py/wbw.py --kelime-sil <id> --yaz")


# ══════════════════════════════════════════════════════════════════════════
def _taban_mi(c):
    """Taban harf mi? (hareke/işaret değil.) iskelet() ile aynı ölçüt."""
    return "ء" <= c <= "ي"


def _harf_say(t):
    return sum(1 for c in str(t or "") if _taban_mi(c))


def _kelimeyi_bol(metin, onlarin):
    """Yapışık kelimeyi ONLARIN kelimelerine göre böler. Dönüş: parça listesi
    (birleştirince metnin AYNISI çıkar), bölünemezse None.

    NEDEN HARF SAYISI YETMEDİ: ilk deneme "onların ilk kelimesi kaç harf ise
    bizimkinden o kadar harf al" diyordu. İmlâ yüzünden tutmuyor — onlarda
    `ٱلْعَـٰلَمِينَ` 7 harf (dagger elif iskelette düşer), bizde
    `الْعَالَمٖينَ` 8 harf (tam elif). 9 vakanın 3'ü bu yüzden atlanıyordu.

    DOĞRU ÖLÇÜT: kesim, İKİ PARÇANIN DA karşılığını tutturduğu yer. Elif
    duyarsız (gevşek) iskelet üzerinden hem soldaki parça onların o kelimesine,
    hem de kalan bütün sağ taraf onların kalan kelimelerine uymalı.

    SINIRDAKİ ELİF iki tarafa da uyabiliyor, yani birden çok aday kesim çıkıyor.
    Yalnız "en erken"i almak YANLIŞ sonuç veriyordu: `لَايُؤْمِنُونَ` →
    `لَ | ايُؤْمِنُونَ`, `فَوْزًاعَظٖيمًا` → `فَوْزً | اعَظٖيمًا` (11 vakanın 4'ü).
    Ek kural: PARÇAMIZIN ELİF SAYISI onların o kelimesininkinden AZ OLAMAZ
    (biz tam elif yazarız, onlar dagger elif — bizimki hep ≥ olur). Bu kural
    elifi doğru tarafa bırakıyor: `لَا` kendi elifini alıyor, `عَلَى` almıyor
    çünkü oradaki elif zaten `ٱلْعَـٰلَمِينَ`e ait.

    İşaretler kesime katılmaz: kesim noktaları yalnız TABAN HARF başlarıdır,
    dolayısıyla bir harfin harekesi/sükûnu kendi harfiyle kalır.
    """
    hedef = [gevsek_siki(o) for o in onlarin]
    hedef_elif = [iskelet(o).count("ا") for o in onlarin]
    hedef_hemze = [iskelet(o).count("ء") for o in onlarin]
    n = len(hedef)
    parcalar = []
    bas = 0
    for t in range(n - 1):
        kalan_hedef = "".join(hedef[t + 1:])
        # Aday kesimler arasından, ELİF ve HEMZE sayıları onların kelimesine EN
        # ÇOK UYANI seçilir. Sert "en erken" kuralı üçünü yanlış bölüyordu —
        # hepsinde hemze sağa kaçmıştı: `نِسَٓا|ءِالْعَالَمٖينَ`,
        # `لَشَيْ|ءٌعَجٖيبٌ`, `مَٓا|ءًغَدَقًاۙ`. Elif ile hemze gevşek ölçüde
        # düştüğü için sınırda iki tarafa da uyuyorlar; hangisine ait olduklarını
        # ancak SAYILARI söylüyor. Eşitlikte en erken kesim alınır.
        secilen, en_iyi = None, None
        for i in range(bas + 1, len(metin) + 1):
            if i < len(metin) and not _taban_mi(metin[i]):
                continue                      # yalnız taban harf başlarında kes
            if gevsek_siki(metin[bas:i]) != hedef[t]:
                continue
            if gevsek_siki(metin[i:]) != kalan_hedef:
                continue
            sk = iskelet(metin[bas:i])
            ceza = abs(sk.count("ا") - hedef_elif[t]) + abs(sk.count("ء") - hedef_hemze[t])
            if en_iyi is None or ceza < en_iyi:
                secilen, en_iyi = i, ceza
                if ceza == 0:
                    break
        if secilen is None:
            return None
        parcalar.append(metin[bas:secilen])
        bas = secilen
    parcalar.append(metin[bas:])
    if "".join(parcalar) != metin or any(not x.strip() for x in parcalar):
        return None
    return parcalar


def kusur_gider(is_listesi="metin_farklari.json", mushaf_yolu="kuran-mushaf.json",
                yaz=False, ayrinti=20, kararsizi_bol=False):
    """`--metin-denetle` iş listesini uygular: fazladan kelimeyi SİLER, yapışık
    kelimeyi BÖLER, sonra her âyetin kelimelerini 1'den yeniden numaralar.

    KUR'AN METNİNE DOKUNAN KİP. Onun için:
      • varsayılan KURU ÇALIŞMA — `--yaz` yoksa hiçbir dosya değişmez,
      • yazmadan önce `.yedek` alınır,
      • YALNIZ DELİLLİ kayıt uygulanır: TEKRAR'da birden çok aday varsa
        (55:27 gibi) ve tam olarak biri yabancı imlâlı değilse O KAYIT ATLANIR.
        Hangi kelimenin fazla olduğu belirsizken silmek metni bozar.
      • BÖLMEDE harf sayısı tutmuyorsa o kayıt da atlanır — kesim noktası
        güvenilmez demektir.
      • sonunda hangi türetilmiş dosyaların yeniden üretileceği yazılır.
    """
    liste = json.load(open(girdi(is_listesi), encoding="utf-8"))
    yol = yol_coz(mushaf_yolu)
    ham = json.load(open(yol, encoding="utf-8"))

    def harita():
        h = {}
        for lst in _kelime_listeleri(ham):
            for i, k in enumerate(lst):
                if isinstance(k, dict) and isinstance(k.get("id"), str):
                    h.setdefault(k["id"], (lst, i))
        return h

    yer = harita()
    silinecek, bolunecek, atlanan, kararsiz = [], [], [], []
    for kayit in liste:
        sinif = kayit.get("sinif")
        if sinif == "tekrar":
            adaylar = kayit.get("tekrar") or []
            yabanci = [t for t in adaylar if t.get("yabanci_imla")]
            if len(adaylar) > 1 and len(yabanci) != 1:
                atlanan.append((kayit["ayet"], f"{len(adaylar)} silme adayı, hangisi belirsiz"))
                continue
            if not adaylar:
                continue
            sec = yabanci[0] if yabanci else adaylar[0]
            if sec["id"] in yer:
                silinecek.append((kayit["ayet"], sec["id"], sec["ar"]))
        elif sinif == "yapisik":
            for y in kayit.get("yapisik") or []:
                if y["id"] not in yer:
                    continue
                lst, i = yer[y["id"]]
                bizim = lst[i].get("arabic", "")
                onlar = [x.strip() for x in y["onlarin"].split("+")]
                parcalar = _kelimeyi_bol(bizim, onlar)
                if not parcalar:
                    atlanan.append((kayit["ayet"], f"{y['id']} kesim noktası bulunamadı"))
                    continue
                # OSMANLI KAYNAŞMASI ŞÜPHESİ — OTOMATİK BÖLÜNMEZ.
                # Bütün parçalar ÇOK KISAysa (≤3 taban harf) bu, iki edatın kaynaştığı
                # meşru bir yazım olabilir: `لَوْمَا`, `مَالِيَ`, `وَمَامِنَّٓا`…
                # Bizim mushaf bunları bitişik yazıyor, quran.com ayırıyor; ikisi de
                # kendi içinde tutarlı. Gerçek kusurlarda ikinci parça hep uzun
                # (`عَلَى`+`الْعَالَمٖينَ`, `لَا`+`يُؤْمِنُونَ`). Bunları ayrı
                # listeye koyup KARARI KULLANICIYA bırakıyoruz — yanlış bölmek
                # sayfada olmayan bir boşluk açar.
                # EŞİK ÖLÇÜLDÜ: 4 denendi, `حَظٍّ`+`عَظٖيمٍ` [2,4] gibi GERÇEK
                # yapışıklıkları da kararsıza atıyordu; 3'te şüpheliler (hepsi
                # edat çifti) kalıyor, içerik kelimeleri bölünmeye geçiyor.
                if all(len(iskelet(x)) <= 3 for x in parcalar) and not kararsizi_bol:
                    kararsiz.append((kayit["ayet"], y["id"], bizim, parcalar))
                    continue
                bolunecek.append((kayit["ayet"], y["id"], bizim, parcalar))

    print("=" * 74)
    print("KUSUR GİDERME" + ("" if yaz else "  —  KURU ÇALIŞMA (hiçbir dosya değişmiyor)"))
    print("=" * 74)
    print(f"  dosya            : {yol}")
    print(f"  silinecek kelime : {len(silinecek)}")
    print(f"  bölünecek kelime : {len(bolunecek)}")
    print(f"  atlanan kayıt    : {len(atlanan)}")
    if kararsizi_bol:
        print("  (--kararsizi-bol açık: kısa-parça şüphelileri de bölünüyor)")
    else:
        print(f"  KARARSIZ (elle)  : {len(kararsiz)}   — Osmanlı kaynaşması olabilir, bölünmüyor")
    print()
    if silinecek:
        print("  ── SİLİNECEK " + "─" * 55)
        for _ay, kid, ar in silinecek[:ayrinti]:
            print(f"    {kid:<12} {ar}")
        if len(silinecek) > ayrinti:
            print(f"    … ve {len(silinecek)-ayrinti} silme daha")
        print()
    if bolunecek:
        print("  ── BÖLÜNECEK " + "─" * 55)
        for _ay, kid, ar, parcalar in bolunecek[:ayrinti]:
            print(f"    {kid:<12} {ar}   →   {'  |  '.join(parcalar)}")
        if len(bolunecek) > ayrinti:
            print(f"    … ve {len(bolunecek)-ayrinti} bölme daha")
        print()
    if kararsiz:
        print("  ── KARARSIZ — BÖLÜNMEYECEK, kararı siz verin " + "─" * 23)
        print("     (iki parça da kısa: meşru kaynaşma da olabilir, veri kusuru da)")
        print("     Bölünmesini istiyorsanız: --kusur-gider --kararsizi-bol --yaz")
        for _ay, kid, ar, parcalar in kararsiz:
            print(f"    {kid:<12} {ar}   →   {'  |  '.join(parcalar)}")
        print()
    if atlanan:
        print("  ── ATLANAN (elle bakılacak) " + "─" * 40)
        for ay, sebep in atlanan[:ayrinti]:
            print(f"    {ay:<9} {sebep}")
        if len(atlanan) > ayrinti:
            print(f"    … ve {len(atlanan)-ayrinti} kayıt daha")
        print()

    if not yaz:
        print("  Uygulamak için aynı komuta --yaz ekleyin.")
        return

    shutil_kopya(yol, yol + ".yedek")
    # ÖNCE BÖLME, SONRA SİLME. İkisi aynı âyette olabiliyor (ذُو ailesinde hem
    # fazladan kelime var hem de ذُو bitişik). Numaralama en SONDA, topluca
    # yapılıyor — ara adımlarda id'lere güvenilmiyor, konum haritası her
    # değişiklikten sonra yenileniyor.
    for _ay, kid, _ar, parcalar in bolunecek:
        yer = harita()
        if kid not in yer:
            continue
        lst, i = yer[kid]
        temel = lst[i]
        yeniler = []
        for pz in parcalar:
            k = dict(temel)
            k["arabic"] = pz
            yeniler.append(k)
        lst[i:i + 1] = yeniler

    for _ay, kid, _ar in silinecek:
        yer = harita()
        if kid not in yer:
            continue
        lst, i = yer[kid]
        lst.pop(i)

    # ── Her âyeti 1'den yeniden numarala ──
    degisen = 0
    for lst in _kelime_listeleri(ham):
        say = Counter()
        for k in lst:
            if not (isinstance(k, dict) and isinstance(k.get("id"), str)):
                continue
            p = k["id"].split(":")
            if len(p) < 3:
                continue
            on = f"{p[0]}:{p[1]}"
            say[on] += 1
            yeni_id = f"{on}:{say[on]}"
            if yeni_id != k["id"]:
                degisen += 1
            k["id"] = yeni_id

    json.dump(ham, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"  yedek alındı : {yol}.yedek")
    print(f"  YAZILDI      : {yol}")
    print(f"  numarası değişen kelime: {degisen}")
    print()
    print("  ⚠ TÜRETİLMİŞ DOSYALARIN HEPSİ YENİDEN ÜRETİLMELİ (bu sırayla):")
    print("      python3 src/py/wbw.py --hizala public/kuran-mushaf.json")
    print("      python3 src/py/wbw.py --birlestir")
    print("      python3 src/py/wbw.py --sarf")
    print("  Sonra doğrulama: --metin-denetle ve --bolunme yeniden çalıştırılmalı.")


# ══════════════════════════════════════════════════════════════════════════
def hizalama_bak(yer, mushaf_yolu="kuran-mushaf.json", wbw_yolu="wbw_tr.json",
                 harita_yolu="kelime_hizalama.json"):
    """Bir âyetin kelime kelime RÖNTGENİ: bizim kelime → eşlendiği quran.com
    kelimesi → anlam → grup üyeliği. Hiçbir şey yazmaz.

    NEDEN: "şu kelime atlanıyor" şikâyetinin sebebi üç yerden biri olabilir —
    hizalama yanlış hedefe bağlamış, iki kelimemiz aynı hedefe düşüp grup
    olmuş, ya da eşleme dosyası bayat. Üçünü ayırt etmenin tek yolu âyeti
    olduğu gibi görmek. Tahmin yerine bakılacak yer burası.

    ⚠ işareti: aynı quran.com kelimesine birden çok kelimemiz düşmüş demektir
    (grup). Bu BAZEN doğrudur (يَا + بَنٖي), ama yanlış yerde oluşmuşsa o
    âyette bir kelime "atlanıyor" gibi görünür.
    """
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    wbw = json.load(open(girdi(wbw_yolu), encoding="utf-8"))
    harita = json.load(open(girdi(harita_yolu), encoding="utf-8"))
    hedef_ayet = str(yer).strip()

    bizim = [(int(str(kid).split(":")[2]), str(kid), ar)
             for kid, ar in bizim_kelimeler(ham)
             if str(kid).startswith(hedef_ayet + ":")]
    bizim.sort()
    onlarin = sorted(
        [(int(k.split(":")[2]), k, v.get("ar", ""), (v.get("tr") or ""))
         for k, v in wbw.items()
         if k.startswith(hedef_ayet + ":") and v.get("tip") != "end"])
    if not bizim:
        print(f"HATA: '{hedef_ayet}' âyetinde kelimemiz yok.")
        return

    # Hangi hedefe kaç kelimemiz düşüyor?
    dusen = Counter()
    for _s, kid, _ar in bizim:
        h = harita.get(kid)
        h = h[0] if isinstance(h, list) else h
        if h:
            dusen[h] += 1

    print("=" * 74)
    print(f"HİZALAMA RÖNTGENİ — {hedef_ayet}   (bizde {len(bizim)}, onlarda {len(onlarin)})")
    print("=" * 74)
    for _s, kid, ar in bizim:
        h = harita.get(kid)
        h = h[0] if isinstance(h, list) else h
        k = wbw.get(h) or {}
        im = "  ⚠GRUP" if h and dusen[h] > 1 else ""
        print(f"  {kid:<12} {ar}")
        print(f"      → {str(h):<12} {k.get('ar','—')}   «{(k.get('tr') or '—')}»{im}")
    kullanilan = {h for h in dusen}
    bos = [(s, k, ar) for s, k, ar, _tr in onlarin if k not in kullanilan]
    if bos:
        print()
        print("  ⚠ HİÇBİR KELİMEMİZİN BAĞLANMADIĞI quran.com kelimeleri:")
        for _s, k, ar in bos:
            print(f"    {k:<12} {ar}")
        print("    (bu kelimelerin anlamı ekranda hiç görünmez — hizalama kusuru)")


# ══════════════════════════════════════════════════════════════════════════
def qul_olc(qul_yolu="turkish-wbw-translation.json", wbw_yolu="wbw_tr.json"):
    """QUL (Tarteel) Türkçe kelime-kelime dosyası bizdeki boşlukların kaçını kapatır?

    quran.com ile aynı ekosistemden geldiği için AYNI boşlukları taşıyor olabilir;
    ama farklı/daha yeni bir sürüm olma ihtimali de var. Ölçmeden karar vermeyelim.

    Üç şey ölçülür:
      1) KAPSAM  : bizim İngilizce kalan 6890 konumun kaçında QUL'da Türkçe var.
      2) TUTARLILIK: zaten Türkçemiz olan konumlarda QUL ne diyor — aynı mı?
         (Aynıysa aynı kaynaktır; çok farklıysa bağımsız bir çeviridir.)
      3) İngilizce kalıntı: QUL'un kendi metinleri de İngilizce olabilir, sayılır.
    HİÇBİR DOSYAYI DEĞİŞTİRMEZ.
    """
    yol = veri_ara(qul_yolu)
    if not yol:
        print(f"HATA: '{qul_yolu}' bulunamadı.")
        return
    veri = json.load(open(yol, encoding="utf-8"))
    KONUM = re.compile(r"^(\d{1,3})[:._-](\d{1,3})[:._-](\d{1,3})$")

    # ── Yapıyı çöz: konum → Türkçe metin ──
    qul = {}
    def metin_al(v):
        if isinstance(v, str):
            return v
        if isinstance(v, dict):
            for ad in ("translation", "text", "tr", "turkish", "meal", "ceviri"):
                for k, x in v.items():
                    if isinstance(x, str) and k.lower() == ad and x.strip():
                        return x
            aday = [x for x in v.values() if isinstance(x, str) and x.strip()]
            return aday[0] if aday else None
        return None

    if isinstance(veri, dict):
        for k, v in veri.items():
            m = KONUM.match(str(k))
            if m:
                t = metin_al(v)
                if t:
                    qul[f"{int(m.group(1))}:{int(m.group(2))}:{int(m.group(3))}"] = t.strip()
    if not qul:
        listeler = [veri] if isinstance(veri, list) else \
                   [v for v in veri.values() if isinstance(v, list)] if isinstance(veri, dict) else []
        for lst in listeler:
            for o in lst:
                if not isinstance(o, dict):
                    continue
                anah = None
                for ad in ("word_key", "location", "key", "id", "word"):
                    v = o.get(ad)
                    if isinstance(v, str) and KONUM.match(v):
                        anah = v
                        break
                if not anah:
                    sn, an, wn = (o.get("surah", o.get("sure", o.get("chapter"))),
                                  o.get("ayah", o.get("ayet", o.get("verse"))),
                                  o.get("word", o.get("word_number", o.get("position"))))
                    try:
                        anah = f"{int(sn)}:{int(an)}:{int(wn)}"
                    except (TypeError, ValueError):
                        continue
                t = metin_al({k: v for k, v in o.items()
                              if k not in ("word_key", "location", "key", "id")})
                if t:
                    m = KONUM.match(anah)
                    qul[f"{int(m.group(1))}:{int(m.group(2))}:{int(m.group(3))}"] = t.strip()
    if not qul:
        print(f"  QUL dosyası okundu ama yapısı çözülemedi: {yol}")
        print(f"    en üst tür: {type(veri).__name__}")
        if isinstance(veri, dict):
            ks = list(veri)[:5]
            print(f"    ilk anahtarlar: {ks}")
            for k in ks[:2]:
                print(f"    veri[{k!r}] = {str(veri[k])[:200]}")
        elif isinstance(veri, list) and veri:
            print(f"    uzunluk {len(veri)}, ilk öğe: {str(veri[0])[:250]}")
        print("    → bu çıktıyı gönderin, okuyucuyu ona göre yazayım.")
        return
    print(f"  QUL dosyası: {yol}")
    print(f"  okunan kelime kaydı: {len(qul)}")
    for k in list(qul)[:3]:
        print(f"    örnek {k}: {qul[k]}")

    wbw = json.load(open(girdi(wbw_yolu), encoding="utf-8"))
    ing_konum, tr_konum = [], []
    for yer, v in wbw.items():
        if v.get("tip") == "end":
            continue
        (tr_konum if (v.get("dil") or "").lower() == "turkish" else ing_konum).append(
            (yer, v.get("ar", ""), (v.get("tr") or "").strip()))

    # 1) Kapsam
    kapanan, bos, ing_kalan, yok = [], 0, [], 0
    for yer, ar, ingm in ing_konum:
        t = qul.get(yer)
        if not t:
            yok += 1
        elif not t.strip():
            bos += 1
        elif ingilizce_mi(t):
            ing_kalan.append((yer, ar, ingm, t))
        else:
            kapanan.append((yer, ar, ingm, t))
    n = len(ing_konum)
    print()
    print("=" * 74)
    print("QUL TÜRKÇE KELİME-KELİME — ÖLÇÜM")
    print("=" * 74)
    print(f"  bizdeki İngilizce konum   : {n}")
    print(f"  QUL'da TÜRKÇE karşılık var: {len(kapanan)}  (%{round(100*len(kapanan)/n,1) if n else 0})")
    print(f"  QUL'da da İngilizce        : {len(ing_kalan)}")
    print(f"  QUL'da boş                 : {bos}")
    print(f"  QUL'da konum yok           : {yok}")
    print()
    if kapanan:
        print("  ── KAPANAN örnekleri " + "─" * 50)
        for yer, ar, ingm, t in kapanan[:16]:
            print(f"    {yer:<11} {ar:<18} {ingm:<26} → {t}")
        print()
    if ing_kalan:
        print("  ── QUL'da da İNGİLİZCE kalanlar " + "─" * 39)
        for yer, ar, ingm, t in ing_kalan[:8]:
            print(f"    {yer:<11} {ar:<18} {ingm:<26} → {t}")
        print()

    # 2) Tutarlılık: aynı kaynak mı, bağımsız çeviri mi?
    import random
    random.seed(5)
    ornek = random.sample(tr_konum, min(1500, len(tr_konum)))
    ayni = yakin = farkli = qul_yok = 0
    farkli_ornek = []
    for yer, ar, bizim in ornek:
        t = qul.get(yer)
        if not t:
            qul_yok += 1
            continue
        a, b = _sade(bizim), _sade(t)
        if a == b:
            ayni += 1
        elif _benzer(a, b) >= 0.80:
            yakin += 1
        else:
            farkli += 1
            if len(farkli_ornek) < 10:
                farkli_ornek.append((yer, ar, bizim, t))
    kar = ayni + yakin + farkli
    print("  ── TUTARLILIK (zaten Türkçemiz olan konumlarda) " + "─" * 23)
    print(f"    karşılaştırılan : {kar}  (QUL'da olmayan {qul_yok})")
    if kar:
        print(f"    birebir aynı    : {ayni}  (%{round(100*ayni/kar,1)})")
        print(f"    çok yakın       : {yakin}  (%{round(100*yakin/kar,1)})")
        print(f"    farklı          : {farkli}  (%{round(100*farkli/kar,1)})")
        if ayni / kar > 0.9:
            print("    → AYNI KAYNAK. Boşlukları da aynı olması beklenir.")
        elif (ayni + yakin) / kar < 0.5:
            print("    → BAĞIMSIZ bir çeviri. İkinci görüş olarak değerli.")
        else:
            print("    → akraba ama birebir değil; kısmen düzeltilmiş bir sürüm olabilir.")
    if farkli_ornek:
        print("\n  ── farklı örnekleri " + "─" * 50)
        for yer, ar, bizim, t in farkli_ornek:
            print(f"    {yer:<11} {ar:<16} bizde: {bizim:<24} QUL: {t}")
    print("\n  (hiçbir dosya değiştirilmedi — bu yalnız ölçüm)")


# ══════════════════════════════════════════════════════════════════════════
def meal_bak(aralik, meal_yolu="ayet-meal.json", mushaf_yolu="kuran-mushaf.json"):
    """Belirtilen âyetlerin mealini TAM olarak döker.  ör: --meal-bak 52:17-22

    Eksik bir meal gördüğümüzde ilk bakılacak yer burası: gerçekten yok mu,
    yoksa komşu âyetin içine BİRLEŞTİRİLMİŞ mi? Türkçe meallerde 52:19-20 gibi
    âyet çiftleri çoğu zaman tek paragrafta verilir; o zaman "eksik" değildir,
    yalnız ayrı anahtarı yoktur. Bunu görmeden bir şey yazmak yanlış olur.
    """
    ham = None
    try:
        ham = json.load(open(yol_coz(mushaf_yolu, sessiz=True), encoding="utf-8"))
    except SystemExit:
        pass
    mealler = meal_yukle(meal_yolu, ham)
    if not mealler:
        return
    m = re.match(r"^(\d+):(\d+)(?:\s*-\s*(\d+))?$", str(aralik).strip())
    if not m:
        print("Kullanım:  --meal-bak 52:17-22   ya da  --meal-bak 52:20")
        return
    sure = int(m.group(1)); bas = int(m.group(2)); son = int(m.group(3) or bas)
    print("=" * 74)
    for a in range(bas, son + 1):
        anah = f"{sure}:{a}"
        metin = mealler.get(anah)
        if metin is None:
            print(f"  {anah:<9} ✗ MEAL YOK")
        else:
            print(f"  {anah:<9} {metin}")
        print()


# ══════════════════════════════════════════════════════════════════════════
def meal_kopyala(eslesme, meal_yolu="ayet-meal.json", yaz=False, not_metni=None):
    """Birleşik verilmiş âyetin mealini komşusundan kopyalar.  ör: 52:20=52:19

    Türkçe meallerde bazı âyet çiftleri (52:19-20 gibi) tek paragrafta verilir;
    ikinci âyetin ayrı anahtarı olmaz. Metni UYDURMAK yerine, birlikte verildiği
    âyetin metni aynen kopyalanır ve sonuna bunun böyle olduğunu söyleyen not eklenir.

    ESKİ HATA: bu kip dosyanın düz {"52:19": "…"} sözlüğü olduğunu varsayıyordu;
    oysa meal dosyası başka biçimde. Artık biçim ÖNCE tespit ediliyor ve kayıt
    aynı biçimde geri yazılıyor.
    ORİJİNALE DOKUNMAZ: yeni dosya yazar. --yaz denirse yerine yazar, önce .bak alır.
    """
    m = re.match(r"^(\d+):(\d+)\s*=\s*(\d+):(\d+)$", str(eslesme).strip())
    if not m:
        print("Kullanım:  --meal-kopyala 52:20=52:19  [--yaz]")
        return
    hs, ha, ks, ka = (int(x) for x in m.groups())
    hedef, kaynak = f"{hs}:{ha}", f"{ks}:{ka}"
    yol = veri_ara(meal_yolu)
    if not yol:
        print(f"HATA: '{meal_yolu}' bulunamadı.")
        return
    veri = json.load(open(yol, encoding="utf-8"))
    AY_ANAH = re.compile(r"^(\d{1,3})\s*[:._-]\s*(\d{1,3})$")

    # ── Biçim tespiti ───────────────────────────────────────────────
    bicim = kap = None
    if isinstance(veri, dict) and any(AY_ANAH.match(str(k)) for k in list(veri)[:50]):
        bicim = "duz"
    elif isinstance(veri, dict) and any(str(k).isdigit() for k in list(veri)[:50]):
        ilk = veri.get(str(ks)) if str(ks) in veri else next(
            (v for k, v in veri.items() if str(k).isdigit()), None)
        bicim = "ic-sozluk" if isinstance(ilk, dict) else "ic-liste" if isinstance(ilk, list) else None
    if bicim is None:
        # liste biçimi: ya en üstte ya bir anahtarın altında
        if isinstance(veri, list):
            bicim, kap = "liste", None
        elif isinstance(veri, dict):
            for k, v in veri.items():
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    bicim, kap = "liste", k
                    break
    if bicim is None:
        print("HATA: meal dosyasının biçimi çözülemedi.")
        print(f"    en üst tür: {type(veri).__name__}; ilk anahtarlar: {list(veri)[:5] if isinstance(veri, dict) else len(veri)}")
        return
    print(f"  meal biçimi: {bicim}" + (f" (kap: '{kap}')" if kap else ""))

    def oku(sn, an):
        if bicim == "duz":
            for k, v in veri.items():
                mm = AY_ANAH.match(str(k))
                if mm and int(mm.group(1)) == sn and int(mm.group(2)) == an:
                    return k, v
        elif bicim == "ic-sozluk":
            d = veri.get(str(sn)) or {}
            for k, v in d.items():
                if str(k).isdigit() and int(k) == an:
                    return k, v
        elif bicim == "ic-liste":
            d = veri.get(str(sn)) or []
            return (an - 1, d[an - 1]) if 0 < an <= len(d) else (None, None)
        else:
            lst = veri if kap is None else veri[kap]
            for i, o in enumerate(lst):
                if not isinstance(o, dict):
                    continue
                sv = o.get("sureNo", o.get("sure", o.get("surah")))
                av = o.get("ayetNo", o.get("ayet", o.get("verse", o.get("no"))))
                try:
                    if int(sv) == sn and int(av) == an:
                        return i, o
                except (TypeError, ValueError):
                    continue
        return None, None

    def metni_al(v):
        if isinstance(v, str):
            return v
        if isinstance(v, dict):
            for ad in ("meal", "metin", "turkce", "ceviri", "text"):
                for k, x in v.items():
                    if isinstance(x, str) and k.lower() == ad:
                        return x
            aday = [x for x in v.values() if isinstance(x, str) and len(x) > 15]
            return max(aday, key=len) if aday else None
        return None

    k_anah, k_deger = oku(ks, ka)
    if k_deger is None:
        print(f"HATA: kaynak âyet '{kaynak}' dosyada bulunamadı (biçim: {bicim}).")
        return
    h_anah, h_deger = oku(hs, ha)
    if h_deger is not None and str(metni_al(h_deger) or "").strip():
        print(f"'{hedef}' zaten DOLU, dokunulmadı:\n  {str(metni_al(h_deger))[:110]}")
        return
    if h_deger is not None:
        # ÇELİŞKİNİN SEBEBİ BUYDU: anahtar var ama metni boş. --meal-denetle onu
        # "eksik", --meal-kopyala ise "zaten var" sayıyordu. Boş = doldurulacak.
        print(f"  '{hedef}' anahtarı var ama metni BOŞ → dolduruluyor")
    k_metin = metni_al(k_deger)
    if not k_metin:
        print(f"HATA: kaynak âyetin metni okunamadı: {k_deger!r}")
        return
    notu = not_metni if not_metni is not None else f" ({ka}-{ha}. âyetler mealde birlikte verilmiştir.)"
    yeni_metin = k_metin + notu

    # ── Aynı biçimde geri yaz ───────────────────────────────────────
    if bicim == "duz":
        veri[hedef] = yeni_metin
        def anah(k):
            mm = AY_ANAH.match(str(k))
            return (int(mm.group(1)), int(mm.group(2))) if mm else (999, 999)
        veri = {k: veri[k] for k in sorted(veri, key=anah)}
    elif bicim == "ic-sozluk":
        veri.setdefault(str(hs), {})[str(ha)] = yeni_metin
        veri[str(hs)] = {k: veri[str(hs)][k] for k in
                         sorted(veri[str(hs)], key=lambda x: int(x) if str(x).isdigit() else 999)}
    elif bicim == "ic-liste":
        print("HATA: 'ic-liste' biçiminde araya ekleme âyet numaralarını KAYDIRIR.")
        print("      Bu biçimde elle eklemek gerekir; kaydırma riskini almıyorum.")
        return
    else:
        lst = veri if kap is None else veri[kap]
        ornek = dict(k_deger)
        for ad, deger in (("sureNo", hs), ("sure", hs), ("surah", hs)):
            if ad in ornek:
                ornek[ad] = deger
        for ad, deger in (("ayetNo", ha), ("ayet", ha), ("verse", ha), ("no", ha)):
            if ad in ornek:
                ornek[ad] = deger
        for ad in ("meal", "metin", "turkce", "ceviri", "text"):
            for k in list(ornek):
                if k.lower() == ad and isinstance(ornek[k], str):
                    ornek[k] = yeni_metin
        lst.insert((k_anah if isinstance(k_anah, int) else len(lst)) + 1, ornek)

    if yaz:
        yedek = yol + ".bak"
        if not os.path.exists(yedek):
            shutil_kopya(yol, yedek)
            print(f"  yedek alındı: {yedek}")
        cikti = yol
    else:
        cikti = cikti_yolu("ayet-meal-yeni.json")
    json.dump(veri, open(cikti, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"  {hedef} eklendi:")
    print(f"    {yeni_metin[:130]}")
    print(f"\n  yazıldı: {cikti}")
    if not yaz:
        print("  (orijinale dokunulmadı; yerine yazmak için --yaz ekleyin)")


def shutil_kopya(a, b):
    with open(a, "rb") as f1, open(b, "wb") as f2:
        f2.write(f1.read())


# ══════════════════════════════════════════════════════════════════════════
def meal_orneklem(mushaf_yolu="kuran-mushaf.json", wbw_yolu="wbw_tr.json",
                  meal_yolu="ayet-meal.json", adet=120, ek=0.05, fark=0.20):
    """Kabul edilen kararlardan RASTGELE örneklem — gözle değerlendirmek için.

    NEDEN: otomatik ölçüm tıkandı. "✗ farklı" sayılanların çoğu aslında doğru:
      inanan lara / iman edenlere · umursamaz / gafil · akraba / yakınları
      arzın / yer · sürekli / ebediyen · إنما: şüphesiz / ancak
    Bunlar eşanlamlı; dizgi karşılaştırması eşanlamı bilemez. Yani artık ölçen
    alet yöntemden daha kusurlu. Gerçek hata oranını bilmenin tek yolu, kabul
    edilen kararlardan rastgele bir örneklemi İNSAN GÖZÜYLE tasnif etmek.
    Bu kip o örneklemi basar; "gerçek" sütunu quran.com'un bilinen karşılığı,
    "çekilen" sütunu yöntemin mealden aldığı karşılıktır.
    """
    import random
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    mealler = meal_yukle(meal_yolu, ham)
    if not mealler:
        return
    kayit = _meal_kararlari(wbw_yolu, mealler, ek, fark)
    random.seed(3)
    ornek = random.sample(kayit, min(adet, len(kayit)))
    print("=" * 74)
    print(f"KABUL EDİLEN KARARLARDAN RASTGELE {len(ornek)} ÖRNEK")
    print("(gerçek = quran.com'un bilinen karşılığı · çekilen = mealden alınan)")
    print("=" * 74)
    for i, (yer, ar, gercek, cekilen) in enumerate(ornek, 1):
        print(f"{i:>3}. {yer:<11} {ar:<18} {gercek:<28} | {cekilen}")
    print(f"\n  toplam kabul edilen karar: {len(kayit)}   (çalışma noktası: +{ek}, fark {fark})")


def meal_secim(mushaf_yolu="kuran-mushaf.json", wbw_yolu="wbw_tr.json",
               meal_yolu="ayet-meal.json", deneme_adedi=2000):
    """Kelimenin karşılığını O ÂYETİN MEALİNDEN çeker; önce yöntemi ÖLÇER.

    Aday havuzu (quran.com'un aynı kelimeye başka yerlerde verdiği karşılıklar)
    "mealin neresine bakacağımızı" söyler; cevabı meal verir — böylece çekim
    bu âyete ait olur. Edatlar ve 2 harflik gövdeler yönteme sokulmaz.

    Rapor üç bölüm: eşik taraması (kapsam↔hata), seçilen eşikte hata örnekleri,
    İngilizce kalanlara uygulama ölçümü. HİÇBİR DOSYAYI DEĞİŞTİRMEZ.
    """
    import random
    ham = json.load(open(yol_coz(mushaf_yolu), encoding="utf-8"))
    mealler = meal_yukle(meal_yolu, ham)
    if not mealler:
        return
    print(f"  meali olan âyet: {sum(1 for v in mealler.values() if v)}")

    wbw = json.load(open(girdi(wbw_yolu), encoding="utf-8"))
    tr_tam, tr_iskelet, tum = _havuzlar(wbw)

    # ── 1) Puanları BİR KEZ hesapla (eşikten bağımsız) ──
    tr_kayit = [t for t in tum if t[4] == "turkish" and t[3]]
    random.seed(1)
    deneme = random.sample(tr_kayit, min(deneme_adedi, len(tr_kayit)))
    olcum, d_adaysiz, d_karar_yok = [], 0, 0
    for i, (yer, ar, sk, gercek, _d) in enumerate(deneme, 1):
        if i % 500 == 0:
            print(f"    … {i}/{len(deneme)}")
        g = _sade(gercek)
        ad = _havuz(tr_tam, tr_iskelet, ar, sk, kendi_sade=g)
        if not ad:
            d_adaysiz += 1
            continue
        p = yer.split(":")
        meal = mealler.get(f"{p[0]}:{p[1]}", "")
        if not meal:
            d_karar_yok += 1
            continue
        pk = _puanla([_sade(a) for a in ad], _meal_parcalari(meal), set())
        if pk is None:
            d_karar_yok += 1
            continue
        olcum.append((pk, g, _edat_mi(sk), yer, ar, meal))

    print()
    print("=" * 74)
    print("1) DOĞRULUK SINAMASI + EŞİK TARAMASI")
    print("=" * 74)
    print(f"  denenen {len(deneme)} · adayı yok {d_adaysiz} · meal/puan yok {d_karar_yok}")
    print("  UYARI: '✗farklı' sütunu gerçek hatadan YÜKSEKTİR — dizgi karşılaştırması")
    print("  eşanlamı bilemiyor (yetimler↔öksüzler, gafil↔umursamaz doğru olduğu hâlde")
    print("  yanlış sayılıyor). Gerçek oran için: --meal-orneklem")
    print()
    print("   benzerlik  fark |  karar   birebir   ~gövde   ✗farklı  | kullanılabilir")
    print("   " + "─" * 70)
    icerik = [o for o in olcum if not o[2]]
    en_iyi = None
    for ek in (0.0, 0.05, 0.10):
        for fark in (0.10, 0.20, 0.30):
            t = k = f = 0
            for pk, g, _e, *_r in icerik:
                if not _gecer(pk, ek, fark):
                    continue
                d = _govde_ortak(pk[4], g)
                t, k, f = (t + 1, k, f) if d == "tam" else (t, k + 1, f) if d == "kismi" else (t, k, f + 1)
            kar = t + k + f
            if not kar:
                continue
            hata, kul = 100 * f / kar, 100 * (t + k) / kar
            isaret = ""
            # NOT: buradaki "hata" sütunu gerçek hatadan yüksek (eşanlam sorunu).
            # 150 kararlık gözle tasnifte +0.00/0.10 noktasında GERÇEK hata %1.3
            # çıktı; o yüzden kapsamı en geniş nokta tercih ediliyor.
            # ÖLÇÜLDÜ (2×150 karar gözle tasnif edildi):
            #   +0.05 / fark 0.20 → gerçek hata %1.3   (1841 kelime)
            #   +0.00 / fark 0.10 → gerçek hata %3.3   (2566 kelime)
            # Gevşek noktada MANA TERSİNE DÖNEN bir hata görüldü (6:104
            # فَلِنَفْسِهِۦ "yararı kendisinedir" → "zararı kendinedir"), o yüzden
            # 725 kelime fazlası için hatayı üçe katlamak kabul edilmiyor.
            if hata <= 14 and (en_iyi is None or kar > en_iyi[0]):
                en_iyi = (kar, ek, fark, hata, kul)
                isaret = " ←"
            print(f"   +{ek:<9.2f}{fark:<5.2f}| {kar:>6}  {t:>7}  {k:>7}  {f:>8}  |  %{kul:.1f} (hata %{hata:.1f}){isaret}")
    EK, FARK = (en_iyi[1], en_iyi[2]) if en_iyi else (0.05, 0.20)
    print(f"\n  → uygulama bu noktayla ölçülecek: benzerlik +{EK}, fark {FARK}")

    edatlar = [o for o in olcum if o[2]]
    e_kar = sum(1 for o in edatlar if _gecer(o[0], EK, FARK))
    e_hata = sum(1 for o in edatlar if _gecer(o[0], EK, FARK) and _govde_ortak(o[0][4], o[1]) == "yanlis")
    if e_kar:
        print(f"  → EDAT grubu (yönteme SOKULMUYOR): karar {e_kar}, ham hata %{round(100*e_hata/e_kar,1)}")
        print("     içerik kelimelerinden belirgin yüksek → dışarıda tutulması doğrulandı")
    print()
    yanlis = [(o[3], o[4], o[1], o[0][5], o[5]) for o in icerik
              if _gecer(o[0], EK, FARK) and _govde_ortak(o[0][4], o[1]) == "yanlis"][:14]
    if yanlis:
        print("  ── ✗ FARKLI örnekleri (eşanlamlılar da burada görünür) " + "─" * 16)
        for yer, ar, g, c, meal in yanlis:
            print(f"    {yer:<11} {ar:<16} gerçek: {g:<22} çekilen: {c}")
            print(f"                meal: …{meal[:60]}…")
        print()

    # ── 2) İngilizce kalanlara uygulama ──
    ing = [t for t in tum if t[4] != "turkish"]
    ayet_grup = {}
    for yer, ar, sk, metin, _d in ing:
        p = yer.split(":")
        ayet_grup.setdefault(f"{p[0]}:{p[1]}", []).append((yer, ar, sk, metin))
    u_cekildi = u_adaysiz = u_kararsiz = u_mealsiz = u_edat = 0
    u_ornek = []
    for ay, kelimeler_ in ayet_grup.items():
        meal = mealler.get(ay, "")
        if not meal:
            u_mealsiz += len(kelimeler_)
            continue
        parcalar = _meal_parcalari(meal)
        kullanilmis, puanli = set(), []
        for yer, ar, sk, ingm in kelimeler_:
            if _edat_mi(sk):
                u_edat += 1
                continue
            ad = _havuz(tr_tam, tr_iskelet, ar, sk)
            if not ad:
                u_adaysiz += 1
                continue
            puanli.append((yer, ar, ingm, [_sade(a) for a in ad]))
        sirali = []
        for yer, ar, ingm, ad in puanli:
            r = _sec(ad, parcalar, set(), EK, FARK)
            sirali.append((r[0] if r else 0, yer, ar, ingm, ad))
        sirali.sort(key=lambda x: -x[0])
        for _p, yer, ar, ingm, ad in sirali:
            r = _sec(ad, parcalar, kullanilmis, EK, FARK)
            if not r:
                u_kararsiz += 1
                continue
            kullanilmis.update(range(r[1], r[2]))
            u_cekildi += 1
            if len(u_ornek) < 14:
                u_ornek.append((yer, ar, ingm, r[3], meal))
    n = len(ing)
    print("=" * 74)
    print("2) İNGİLİZCE KALANLARA UYGULAMA")
    print("=" * 74)
    print(f"  İngilizce kelime kaydı    : {n}")
    print(f"  MEALDEN ÇEKİLDİ           : {u_cekildi}  (%{round(100*u_cekildi/n,1) if n else 0})")
    print(f"  edat/kısa gövde (atlandı) : {u_edat}")
    print(f"  aday yok (çapa yok)       : {u_adaysiz}")
    print(f"  karar verilemedi          : {u_kararsiz}")
    print(f"  âyetin meali yok          : {u_mealsiz}")
    print()
    for yer, ar, ingm, c, meal in u_ornek:
        print(f"    {yer:<11} {ar:<16} {ingm:<24} → {c}")
        print(f"                meal: …{meal[:60]}…")
    print("\n  (hiçbir dosya değiştirilmedi — bu yalnız ölçüm)")


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
        arg = [a for a in sys.argv[1:] if not a.startswith("--")]
        birlestir(arg[0] if arg else "wbw_tr.json")
    elif "--ing-analiz" in sys.argv:
        ingilizce_analiz()
    elif "--kusur-gider" in sys.argv:
        n = 20
        if "--ayrinti" in sys.argv:
            try: n = int(sys.argv[sys.argv.index("--ayrinti") + 1])
            except (IndexError, ValueError): pass
        kusur_gider(yaz=("--yaz" in sys.argv), ayrinti=n,
                    kararsizi_bol=("--kararsizi-bol" in sys.argv))
    elif "--metin-denetle" in sys.argv:
        n = 25
        if "--ayrinti" in sys.argv:
            try: n = int(sys.argv[sys.argv.index("--ayrinti") + 1])
            except (IndexError, ValueError): print("UYARI: --ayrinti okunamadı, 25 kullanılıyor.")
        metin_denetle(ayrinti=n)
    elif "--hizalama-bak" in sys.argv:
        i = sys.argv.index("--hizalama-bak")
        if i + 1 >= len(sys.argv):
            print("KULLANIM: --hizalama-bak SURE:AYET   (ör. --hizalama-bak 37:102)")
        else:
            hizalama_bak(sys.argv[i + 1])
    elif "--ayet-kod" in sys.argv:
        i = sys.argv.index("--ayet-kod")
        if i + 1 >= len(sys.argv):
            print("KULLANIM: --ayet-kod SURE:AYET   (ör. --ayet-kod 37:130)")
        else:
            ayet_kod(sys.argv[i + 1])
    elif "--kelime-sil" in sys.argv:
        i = sys.argv.index("--kelime-sil")
        if i + 1 >= len(sys.argv):
            print("KULLANIM: --kelime-sil SURE:AYET:SIRA [--yaz]")
        else:
            kelime_sil(sys.argv[i + 1], yaz=("--yaz" in sys.argv))
    elif "--bolunme" in sys.argv:
        # --ayrinti N'in DEĞERİ konumsal argüman sanılmasın (o yüzden atlanıyor).
        n = 25
        arg = []
        atla = False
        for a in sys.argv[1:]:
            if atla:
                atla = False
                continue
            if a == "--ayrinti":
                atla = True
                continue
            if not a.startswith("--"):
                arg.append(a)
        if "--ayrinti" in sys.argv:
            try:
                n = int(sys.argv[sys.argv.index("--ayrinti") + 1])
            except (IndexError, ValueError):
                print("UYARI: --ayrinti sayısı okunamadı, 25 kullanılıyor.")
        bolunme_denetle(arg[0] if arg else "kuran-mushaf.json", ayrinti=n)
    elif "--sarf" in sys.argv and "--sarf-kesif" not in sys.argv:
        arg = [a for a in sys.argv[1:] if not a.startswith("--")]
        sarf_uret(arg[0] if arg else "quran-morphology.txt")
    elif "--sarf-kesif" in sys.argv:
        arg = [a for a in sys.argv[1:] if not a.startswith("--")]
        sarf_kesif(arg[0] if arg else "quran-morphology.txt")
    elif "--ing-uygula" in sys.argv:
        ing_uygula()
    elif "--qul" in sys.argv:
        arg = [a for a in sys.argv[1:] if not a.startswith("--")]
        qul_olc(arg[0] if arg else "turkish-wbw-translation.json")
    elif "--meal-kopyala" in sys.argv:
        meal_kopyala(sys.argv[sys.argv.index("--meal-kopyala") + 1], yaz="--yaz" in sys.argv)
    elif "--meal-orneklem" in sys.argv:
        i = sys.argv.index("--meal-orneklem")
        n = int(sys.argv[i + 1]) if len(sys.argv) > i + 1 and sys.argv[i + 1].isdigit() else 120
        ek = float(sys.argv[sys.argv.index("--ek") + 1]) if "--ek" in sys.argv else 0.05
        fk = float(sys.argv[sys.argv.index("--fark") + 1]) if "--fark" in sys.argv else 0.20
        meal_orneklem(adet=n, ek=ek, fark=fk)
    elif "--meal-bak" in sys.argv:
        meal_bak(sys.argv[sys.argv.index("--meal-bak") + 1])
    elif "--meal-denetle" in sys.argv:
        arg = [a for a in sys.argv[1:] if not a.startswith("--")]
        meal_denetle(arg[0] if arg else "kuran-mushaf.json",
                     arg[1] if len(arg) > 1 else "ayet-meal.json")
    elif "--meal-secim" in sys.argv:
        arg = [a for a in sys.argv[1:] if not a.startswith("--")]
        meal_secim(arg[0] if arg else "kuran-mushaf.json",
                   meal_yolu=(arg[1] if len(arg) > 1 else "ayet-meal.json"))
    elif "--ingilizce" in sys.argv:
        ingilizce_kalanlar()
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
