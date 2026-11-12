#!/usr/bin/env python3
"""
VUKUF — way2quran kâri dizini üretici
araclar/way2quran_dizin.py   →   public/way2quran-kariler.json

12 Kasım 2026. Ekstralar → Kur'an Dinle'deki "Başka kâri ara" düğmesi bu dizinde arar.
way2quran'ın açık bir API'si yok ve sayfaları tarayıcıdan başka siteye okunamıyor (CORS);
ses dosyaları ise herkese açık (media.way2quran.com). Bu yüzden dizin arada bir bu betikle
üretilip uygulamayla birlikte yayınlanıyor.

Yaptığı:
  1) sitemap.xml → bütün kâri sayfalarının kimlikleri (…/en/reciters/<slug>)
  2) her kâri sayfası → adı (sayfa başlığı) + sayfada geçen ses adresleri
     (media.way2quran.com/<slug>/<rivayet>/NNN.mp3) → rivayetler ve sûreleri
     sayfada başka rivayet bağlantısı (?recitationSlug=…) varsa o sayfa da okunur
  3) [{ "s": slug, "a": ad, "r": { rivayet: 114 | [sûre no…] } }] yazılır

Kullanım (proje kökünden):
  python3 araclar/way2quran_dizin.py            # bütün kâriler (birkaç dakika)
  python3 araclar/way2quran_dizin.py --deneme 20  # yalnız ilk 20 kâri (hızlı deneme)
  python3 araclar/way2quran_dizin.py --hepsi      # bütün rivayetler (varsayılan: yalnız Hafs)

RİVAYET (12 Kasım 2026, kullanıcı: "bizim kıraatimizde olan kârileri alması gerekiyor"):
varsayılan olarak YALNIZ Hafs 'an Âsım ("hafs-an-asim") kayıtları dizine girer; Hafs kaydı
olmayan kâri dizinde hiç yer almaz.

Yalnız Python'un kendi kütüphaneleri; ek kurulum gerekmez.
"""
import argparse
import html
import json
import os
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

KOK = "https://way2quran.com"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
HAFS = "hafs-an-asim"
CIKTI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "way2quran-kariler.json")


def al(url, deneme=3):
    for i in range(deneme):
        try:
            istek = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
            with urllib.request.urlopen(istek, timeout=40) as y:
                return y.read().decode("utf-8", "replace")
        except Exception as e:  # ağ hatası: biraz bekleyip yeniden
            if i == deneme - 1:
                print(f"  ! alınamadı: {url} ({e})", file=sys.stderr)
                return ""
            time.sleep(1.5 * (i + 1))
    return ""


def kimlikler():
    dizin = al(f"{KOK}/sitemap.xml")
    cocuklar = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", dizin)
    if not cocuklar:
        sys.exit("sitemap.xml okunamadı")
    sluglar = []
    gorulen = set()
    for c in cocuklar:
        metin = al(c) if c.endswith(".xml") else ""
        for s in re.findall(r"/en/reciters/([a-z0-9][a-z0-9-]*)(?=[<\"?#\s])", metin):
            if s not in gorulen:
                gorulen.add(s)
                sluglar.append(s)
        print(f"  sitemap: {c.rsplit('/', 1)[-1]} → toplam {len(sluglar)} kâri")
    return sluglar


def ad_bul(sayfa, slug):
    for desen in (r'<meta[^>]+property="og:title"[^>]+content="([^"]+)"',
                  r'<meta[^>]+content="([^"]+)"[^>]+property="og:title"',
                  r"<title[^>]*>([^<]+)</title>",
                  r"<h1[^>]*>([^<]+)</h1>"):
        m = re.search(desen, sayfa, re.I)
        if m:
            ad = html.unescape(m.group(1)).strip()
            # "Ad - … | Way2Quran" gibi ekleri at
            ad = re.split(r"\s+[|\-–—]\s+", ad)[0].strip()
            if ad and "way2quran" not in ad.lower():
                return ad
    return " ".join(w.capitalize() for w in slug.split("-"))


def sesler(sayfa, slug):
    """{ rivayet: { sûre no: dosya adı (uzantısız) } } — sayfada geçen ses adreslerinden.

    12 Kasım 2026: dosya adları her kâride "001.mp3" gibi dolgulu DEĞİL. Ör. İslam Sobhi'de
    çoğu "1.mp3", "8.mp3", bazıları "004.mp3"; bir sûrenin ek parçası "037-001.mp3". Eski
    desen yalnız üç haneli adları tanıdığı için İslam Sobhi'de 114 yerine 37 sûre görünüyordu.
    Artık 1–3 haneli ad (ve "-NNN" ekli parça) tanınıyor; aynı sûrenin birden çok dosyası
    varsa eksiz olan seçiliyor. Dosya adı "NNN" değilse dizine gerçek adıyla yazılıyor."""
    r = {}
    desen = r"media\.way2quran\.com/" + re.escape(slug) + r"/([a-z0-9-]+)/(\d{1,3})(-\d+)?\.mp3"
    for rv, no, ek in re.findall(desen, sayfa):
        n = int(no)
        if not 1 <= n <= 114:
            continue
        ad = no + (ek or "")
        d = r.setdefault(rv, {})
        if n not in d or ("-" in d[n] and not ek):   # eksiz ad ekliye üstün
            d[n] = ad
    return r


def deger(d):
    """{ no: ad } → 114 | [no…] | { "n": 114|[…], "f": { no: ad } } (yalnız NNN olmayan adlar)"""
    nolar = sorted(d)
    n = 114 if len(nolar) == 114 else nolar
    f = {str(k): v for k, v in sorted(d.items()) if v != f"{k:03d}"}
    return {"n": n, "f": f} if f else n


def kari_oku(slug):
    sayfa = al(f"{KOK}/en/reciters/{slug}")
    if not sayfa:
        return None
    ad = ad_bul(sayfa, slug)
    r = sesler(sayfa, slug)
    # Sayfa yalnız varsayılan rivayetin listesini veriyorsa öbürlerini ayrıca oku
    for rv in sorted(set(re.findall(r"recitationSlug=([a-z0-9-]+)", sayfa))):
        if rv in r:
            continue
        ek = al(f"{KOK}/en/reciters/{slug}?recitationSlug={rv}")
        for k, v in sesler(ek, slug).items():
            for n, ad in v.items():
                r.setdefault(k, {}).setdefault(n, ad)
    if not r:
        return {"s": slug, "a": ad, "r": {}}
    return {"s": slug, "a": ad, "r": {k: deger(v) for k, v in sorted(r.items())}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--deneme", type=int, default=0, help="yalnız ilk N kâri")
    ap.add_argument("--is", dest="esz", type=int, default=8, help="aynı anda istek sayısı")
    ap.add_argument("--hepsi", action="store_true", help="bütün rivayetler (varsayılan yalnız Hafs)")
    a = ap.parse_args()

    print("1) Kâri kimlikleri (sitemap)…")
    sluglar = kimlikler()
    if a.deneme:
        sluglar = sluglar[: a.deneme]
    print(f"   {len(sluglar)} kâri okunacak\n2) Kâri sayfaları…")

    sonuc, sessiz = [], []
    with ThreadPoolExecutor(max_workers=a.esz) as ex:
        isler = {ex.submit(kari_oku, s): s for s in sluglar}
        for i, f in enumerate(as_completed(isler), 1):
            k = f.result()
            if k and not a.hepsi:
                k["r"] = {rv: v for rv, v in k["r"].items() if rv == HAFS}
            if k and k["r"]:
                sonuc.append(k)
            elif k:
                sessiz.append(k["s"])   # Hafs kaydı yok ya da ses adresi bulunamadı
            if i % 50 == 0 or i == len(sluglar):
                print(f"   {i}/{len(sluglar)} · ses bulunan {len(sonuc)}")

    sonuc.sort(key=lambda k: k["a"].lower())
    os.makedirs(os.path.dirname(CIKTI), exist_ok=True)
    with open(CIKTI, "w", encoding="utf-8") as f:
        json.dump(sonuc, f, ensure_ascii=False, separators=(",", ":"))

    tam = sum(1 for k in sonuc if any(v == 114 or (isinstance(v, dict) and v.get("n") == 114) for v in k["r"].values()))
    farkli = sum(1 for k in sonuc if any(isinstance(v, dict) for v in k["r"].values()))
    print(f"\n3) Yazıldı: {os.path.normpath(CIKTI)} ({os.path.getsize(CIKTI) // 1024} KB)")
    print(f"   kâri: {len(sonuc)} · tam (114 sûre) olan: {tam} · dosya adı farklı olan: {farkli} · dizine girmeyen (Hafs yok / ses yok): {len(sessiz)}")
    for k in sonuc:
        if k["s"] == "islam-sobhi":
            v = next(iter(k["r"].values()))
            print("   islam-sobhi:", "tam" if v == 114 or (isinstance(v, dict) and v.get("n") == 114) else f"{len(v if isinstance(v, list) else v['n'])} sûre",
                  "· farklı adlı dosya:", len(v["f"]) if isinstance(v, dict) else 0)
    for k in sonuc[:3]:
        print("   örnek:", json.dumps(k, ensure_ascii=False)[:160])
    if sessiz[:5]:
        print("   ses bulunamayan ilk kimlikler:", ", ".join(sessiz[:5]))


if __name__ == "__main__":
    main()
