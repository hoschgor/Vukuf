#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
risale_cikar.py  (v5)
=====================
Risale veritabanından Vukuf'un MEVCUT okuyucusuna (OkumaEkrani) uygun çıktı üretir:

  1) Kitaplar -> <slug>-metin.json  =>  [ { "sayfa": N, "metin": "..." }, ... ]
     - metin içinde satırlar \n ile; dipnotlar "§[n] ..." satırı olarak (okuyucu § ile başlayan
       satırı haşiye/dipnot stilinde gösteriyor).
  2) Lügat   -> risale-lugat.json   =>  { "kelime": "1.a 2.b" }  (lugat.json ile aynı şema)
     - anahtarlar okuyucunun kelimeAra normalizasyonuyla (küçük harf + noktalama temizliği) üretilir,
       böylece kelimeler otomatik tıklanabilir olur.
  3) Kavramlar-> kavramlar.json      =>  { "normkelime": [ {terim, aciklama, kaynaklar} ] }
     - aynı normalizasyonla anahtarlı; popup'ta "Kavram" bölümü için.
  4) (Opsiyonel) Kitaplar -> <slug>.odt  okunur belge (odfpy varsa).

Kullanım:
    python3 risale_cikar.py --inspect
    python3 risale_cikar.py --calistir --eski-lugat ~/Projeler/vukuf/src/data/arapca-lugat.json

Girdi (aynı klasörde değilse --json-dir): bookpages.json, meanings.json (zorunlu);
       books.json, footnote.json, glossary.json, styles.json (varsa).
"""

import argparse
import json
import os
import re
import shutil
import sys
import unicodedata
from collections import OrderedDict, defaultdict
from datetime import datetime


# ----------------------------- yardımcılar --------------------------------

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_attr(s):
    """'|14,221,7|5,275,8|' -> [(14,221,7),(5,275,8)]  (no, offset, uzunluk)"""
    out = []
    if not s:
        return out
    for chunk in s.split("|"):
        chunk = chunk.strip()
        if not chunk:
            continue
        p = chunk.split(",")
        if len(p) != 3:
            continue
        try:
            out.append((int(p[0]), int(p[1]), int(p[2])))
        except ValueError:
            continue
    return out


def slice_u16(b16, off, ln):
    """UTF-16 (Delphi) karakter-bazlı kesme. b16 = PAGETEXT.encode('utf-16-le')."""
    try:
        return b16[off * 2:(off + ln) * 2].decode("utf-16-le")
    except Exception:
        return ""


def clean_ws(s):
    return re.sub(r"\s+", " ", (s or "").strip())


# Okuyucunun kelimeAra/kavramAra normalizasyonunun BİREBİR aynısı:
#   kelime.toLowerCase().replace(/[.,!?;:'"()\[\]]/g, "").trim()
_PUNCT_RE = re.compile(r"[.,!?;:'\"()\[\]]")


def reader_norm(s):
    return _PUNCT_RE.sub("", (s or "").lower()).strip()


_ASCII_MAP = str.maketrans({
    "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g", "ı": "i", "İ": "i",
    "ö": "o", "Ö": "o", "ş": "s", "Ş": "s", "ü": "u", "Ü": "u",
    "â": "a", "Â": "a", "î": "i", "Î": "i", "û": "u", "Û": "u",
    "ô": "o", "Ô": "o", "’": "", "'": "",
})


def ascii_slug(name, fallback):
    s = unicodedata.normalize("NFC", name or "").translate(_ASCII_MAP).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or fallback


def format_senses(lst):
    """['kul','köle'] -> '1.kul. 2.köle.'  (tek anlam ise düz metin) — lugat.json biçimi."""
    lst = [s for s in lst if s]
    if not lst:
        return ""
    if len(lst) == 1:
        return lst[0]
    return " ".join(f"{i}.{s}." for i, s in enumerate(lst, 1))


def tidy(s):
    s = (s or "").replace("\r", "")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


MARKER_RE = re.compile(r"^\s*\[\s*\d+\s*\]\s*$")
_DELIM_RE = re.compile(r"\n?\s*\*-{2,}\*\s*\n?")


# ----------------------------- haritalar ----------------------------------

def build_meaning_map(meanings):
    mm = {}
    for r in meanings:
        mm[(r.get("BOOKID"), r.get("PAGENO"), r.get("MEANINGNO"))] = clean_ws(
            r.get("MEANING", ""))
    return mm


def build_footnote_map(footnotes):
    fm = {}
    for r in footnotes:
        fm[(r.get("BOOKID"), r.get("PAGENO"), r.get("FOOTNOTENO"))] = clean_ws(
            r.get("FOOTNOTE", ""))
    return fm


def build_book_titles(books):
    titles = {}
    for b in (books or []):
        bid = b.get("BOOKID", b.get("id"))
        titles[bid] = {
            "baslik": clean_ws(b.get("BOOKNAME", "")),
            "yazar": clean_ws(b.get("AUTHORS", "")),
        }
    return titles


def build_contents(contents):
    """contents.json -> { BOOKID: [ {seviye, baslik, aciklama, pageno}, ... ] } (belge sırasında)"""
    out = defaultdict(list)
    for r in (contents or []):
        bid = r.get("BOOKID")
        baslik = clean_ws(r.get("TITLE", ""))
        if not baslik:
            continue
        aciklama = clean_ws(r.get("DESCRIPTION", ""))
        if aciklama in ("0", "-"):
            aciklama = ""
        out[bid].append({
            "seviye": r.get("TITLELEVEL", 1),
            "baslik": baslik,
            "aciklama": aciklama,
            "pageno": r.get("PAGENO"),
            "id": r.get("ID"),
        })
    return out


def build_kavramlar(glossary):
    """glossary.json -> { reader_norm(TERM): [ {terim, aciklama, kaynaklar} ] }"""
    out = OrderedDict()
    for r in (glossary or []):
        term = clean_ws(r.get("TERM", ""))
        if not term:
            continue
        parts = _DELIM_RE.split(r.get("INFO", "") or "", maxsplit=1)
        body = tidy(parts[0])
        refs = [ln.strip() for ln in tidy(parts[1]).splitlines()
                if ln.strip()] if len(parts) > 1 else []
        out.setdefault(reader_norm(term), []).append(
            {"terim": term, "aciklama": body, "kaynaklar": refs})
    return out


# ----------------------------- inspect ------------------------------------

def inspect(paths):
    print("=" * 70 + "\nYAPI KONTROLÜ (inspect)\n" + "=" * 70)
    for name, p in paths.items():
        if not p or not os.path.exists(p):
            print(f"\n[{name}] YOK -> {p}")
            continue
        try:
            data = load_json(p)
        except Exception as e:
            print(f"\n[{name}] OKUNAMADI: {e}")
            continue
        if isinstance(data, list):
            print(f"\n[{name}] liste, {len(data)} kayıt")
            if data:
                print(f"   alanlar: {list(data[0].keys())}")
                print("   ilk kayıt: "
                      f"{json.dumps(data[0], ensure_ascii=False)[:260]}")
        else:
            print(f"\n[{name}] tip: {type(data).__name__}")

    bp, mn = paths.get("bookpages"), paths.get("meanings")
    if bp and mn and os.path.exists(bp) and os.path.exists(mn):
        print("\n" + "=" * 70 + "\nHİZA KONTROLÜ (kelime -> anlam)\n" + "=" * 70)
        mm = build_meaning_map(load_json(mn))
        shown = 0
        for pg in load_json(bp):
            attrs = parse_attr(pg.get("MEANINGATTRIBUTES", ""))
            if not attrs:
                continue
            b16 = (pg.get("PAGETEXT", "") or "").encode("utf-16-le")
            bid, pno = pg.get("BOOKID"), pg.get("PAGENO")
            print(f"\n--- BOOKID {bid}  PAGENO {pno} ---")
            for (no, off, ln) in attrs[:8]:
                print(f"   '{slice_u16(b16, off, ln)}'  ->  "
                      f"{mm.get((bid, pno, no), '??')}")
            shown += 1
            if shown >= 3:
                break
    print("\nHizalar doğruysa:  python3 risale_cikar.py --calistir")


# ----------------------------- üretim -------------------------------------

def run(paths, out_dir, eski_lugat):
    metin_dir = os.path.join(out_dir, "public")          # -> public/ köküne kopyalanacak
    data_dir = os.path.join(out_dir, "src-data")         # -> src/data/'e kopyalanacak
    odt_dir = os.path.join(out_dir, "odt")
    bolum_dir = os.path.join(out_dir, "bolumler")        # -> public/bolumler/'e kopyalanacak
    for dd in (metin_dir, data_dir, odt_dir, bolum_dir):
        os.makedirs(dd, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

    if eski_lugat and os.path.exists(eski_lugat):
        ydir = os.path.join(data_dir, "yedek")
        os.makedirs(ydir, exist_ok=True)
        hedef = os.path.join(ydir, f"eski-lugat-{stamp}.json")
        shutil.copy2(eski_lugat, hedef)
        print(f"Eski lügat yedeklendi -> {hedef}")

    print("bookpages.json yükleniyor...")
    pages = load_json(paths["bookpages"])
    print(f"  {len(pages)} sayfa")
    print("meanings.json yükleniyor (büyük)...")
    mm = build_meaning_map(load_json(paths["meanings"]))
    print(f"  {len(mm)} anlam")
    fm = (build_footnote_map(load_json(paths["footnote"]))
          if paths.get("footnote") and os.path.exists(paths["footnote"]) else {})
    if fm:
        print(f"  {len(fm)} dipnot")
    titles = (build_book_titles(load_json(paths["books"]))
              if paths.get("books") and os.path.exists(paths["books"]) else {})
    contents = (build_contents(load_json(paths["contents"]))
                if paths.get("contents") and os.path.exists(paths["contents"]) else {})
    if contents:
        print(f"  {sum(len(v) for v in contents.values())} başlık (contents)")
    kavramlar = (build_kavramlar(load_json(paths["glossary"]))
                 if paths.get("glossary") and os.path.exists(paths["glossary"])
                 else OrderedDict())
    if kavramlar:
        with open(os.path.join(data_dir, "kavramlar.json"), "w", encoding="utf-8") as f:
            json.dump(kavramlar, f, ensure_ascii=False, indent=1)
        print(f"  {sum(len(v) for v in kavramlar.values())} kavram "
              f"({len(kavramlar)} anahtar)")

    lugat = OrderedDict()          # key -> [anlamlar]
    lugat_sayi = defaultdict(int)

    def lugata_ekle(word, meaning):
        key = reader_norm(word)
        if not key or not meaning:
            return
        lugat.setdefault(key, [])
        if meaning not in lugat[key]:
            lugat[key].append(meaning)
        lugat_sayi[key] += 1

    kitap_sayfalari = defaultdict(list)
    for pg in pages:
        kitap_sayfalari[pg.get("BOOKID")].append(pg)

    manifest = []

    for bid in sorted(kitap_sayfalari.keys(), key=lambda x: (x is None, x)):
        pg_list = sorted(kitap_sayfalari[bid],
                         key=lambda p: (p.get("PAGENO", 0), p.get("id", 0)))
        t = titles.get(bid, {})
        baslik = t.get("baslik") or f"Kitap {bid}"
        yazar = t.get("yazar") or ""
        slug = ascii_slug(baslik, f"kitap-{bid}")
        book_id = slug                    # kitaplar.js id'si
        dosya = f"{slug}-metin.json"

        metin_sayfalar = []
        odt_paras = []
        seq = 0
        dipnot_say = 0

        # Bu kitabın başlıkları (contents), sayfaya göre grupla
        cont_by_page = defaultdict(list)
        for c in contents.get(bid, []):
            cont_by_page[c["pageno"]].append(c)
        icindekiler_out = []

        for pg in pg_list:
            txt = pg.get("PAGETEXT", "") or ""
            b16 = txt.encode("utf-16-le")
            pno = pg.get("PAGENO")

            # Lügatı besle
            for (no, off, ln) in parse_attr(pg.get("MEANINGATTRIBUTES", "")):
                word = slice_u16(b16, off, ln)
                anlam = mm.get((bid, pno, no), "")
                if word and anlam:
                    lugata_ekle(word, anlam)

            # Dipnotlar
            fns = []
            for (fno, off, ln) in parse_attr(pg.get("FOOTNOTEATTRIBUTES", "")):
                ftext = fm.get((bid, pno, fno), "")
                if ftext:
                    fns.append((fno, off, ln, ftext))

            # metin.json sayfası: metin + § dipnot satırları
            metin = txt
            for (fno, off, ln, ftext) in sorted(fns):
                metin += f"\n§[{fno}] {ftext}"
                dipnot_say += 1
            seq += 1

            # Başlıklar: contents TITLE'ını sayfa metnindeki satırla eşleştir
            basliklar = []
            satirlar = txt.split("\n")
            for c in cont_by_page.get(pno, []):
                hedef = clean_ws(c["baslik"])
                idx = None
                for li, ln in enumerate(satirlar):
                    if clean_ws(ln) == hedef:
                        idx = li
                        break
                oran = round(idx / max(1, len(satirlar)), 4) if idx is not None else 0.0
                if idx is not None:
                    basliklar.append({"satir": idx, "seviye": c["seviye"],
                                      "aciklama": c["aciklama"]})
                icindekiler_out.append({"seviye": c["seviye"], "baslik": c["baslik"],
                                        "aciklama": c["aciklama"], "sayfa": seq, "oran": oran})

            pg_obj = {"sayfa": seq, "metin": metin}
            if basliklar:
                pg_obj["basliklar"] = basliklar
            metin_sayfalar.append(pg_obj)

            # ODT paragrafları (dipnotları gerçek dipnot yaparak)
            odt_paras.extend(_odt_sayfa(txt, fns))

        with open(os.path.join(metin_dir, dosya), "w", encoding="utf-8") as f:
            json.dump(metin_sayfalar, f, ensure_ascii=False)

        # İçindekiler dosyası (bolumler/)
        if icindekiler_out:
            with open(os.path.join(bolum_dir, f"{slug}-icindekiler.json"), "w", encoding="utf-8") as f:
                json.dump(icindekiler_out, f, ensure_ascii=False, indent=1)

        write_document(odt_dir, slug, baslik, yazar, odt_paras)
        manifest.append({"id": book_id, "baslik": baslik, "yazar": yazar,
                         "dosya": dosya, "sayfaSayisi": len(metin_sayfalar)})
        print(f"Kitap {bid}: '{baslik}' -> {dosya}  "
              f"({len(metin_sayfalar)} sayfa, {dipnot_say} dipnot)")

    # Lügat (lugat.json şeması)
    flat = OrderedDict((k, format_senses(v)) for k, v in lugat.items())
    with open(os.path.join(data_dir, "risale-lugat.json"), "w", encoding="utf-8") as f:
        json.dump(flat, f, ensure_ascii=False, indent=1)
    # Detaylı (geçiş sayısı + kavram bayrağı)
    detay = OrderedDict()
    eslesen = 0
    for k, v in lugat.items():
        d = {"anlamlar": v, "sayi": lugat_sayi[k]}
        if k in kavramlar:
            d["kavram"] = True
            eslesen += 1
        detay[k] = d
    with open(os.path.join(data_dir, "risale-lugat-detayli.json"), "w", encoding="utf-8") as f:
        json.dump(detay, f, ensure_ascii=False, indent=1)

    # Kitap katalog manifesti (kitaplar.js'e eklemek için)
    with open(os.path.join(data_dir, "risale-kitaplar.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    print("\n" + "=" * 60)
    print(f"Lügat: {len(flat)} kelime  |  Kavramla eşleşen: {eslesen}  "
          f"|  Kavram: {len(kavramlar)}")
    print(f"metin.json (public'e) -> {metin_dir}")
    print(f"lügat/kavram/katalog (src/data'e) -> {data_dir}")
    print(f"ODT -> {odt_dir}")
    print("=" * 60)


def _odt_sayfa(txt, fns):
    """Bir sayfayı ODT segment paragraflarına çevirir. fns: [(fno,off,ln,ftext)]."""
    out = []
    line_off = 0
    for line in txt.split("\n"):
        l_start, l_end = line_off, line_off + len(line)
        if line.strip():
            segs, cur = [], l_start
            for (fno, off, ln, ftext) in sorted(fns):
                if off + ln <= l_start or off >= l_end:
                    continue
                a, b = max(off, l_start), min(off + ln, l_end)
                if a > cur:
                    segs.append({"text": txt[cur:a]})
                anchor = txt[a:b]
                if not MARKER_RE.match(anchor):
                    segs.append({"text": anchor})
                segs.append({"note": ftext})
                cur = b
            if cur < l_end:
                segs.append({"text": txt[cur:l_end]})
            if not segs:
                segs = [{"text": line}]
            out.append(segs)
        line_off = l_end + 1
    return out


def write_document(odt_dir, base, baslik, yazar, odt_paras):
    try:
        from odf.opendocument import OpenDocumentText
        from odf.text import P, H, Note, NoteBody, NoteCitation
        from odf.style import Style, TextProperties, ParagraphProperties

        doc = OpenDocumentText()
        hs = Style(name="Bas", family="paragraph")
        hs.addElement(TextProperties(fontsize="18pt", fontweight="bold"))
        hs.addElement(ParagraphProperties(marginbottom="0.3cm"))
        doc.styles.addElement(hs)
        doc.text.addElement(H(outlinelevel=1, stylename=hs, text=baslik))
        if yazar:
            doc.text.addElement(P(text=yazar))
        doc.text.addElement(P(text=""))
        counter = 0
        for segs in odt_paras:
            p = P()
            for seg in segs:
                if "text" in seg:
                    p.addText(seg["text"])
                else:
                    counter += 1
                    note = Note(noteclass="footnote", id=f"ftn{counter}")
                    note.addElement(NoteCitation(text=str(counter)))
                    body = NoteBody()
                    body.addElement(P(text=seg["note"]))
                    note.addElement(body)
                    p.addElement(note)
            doc.text.addElement(p)
        doc.save(os.path.join(odt_dir, base + ".odt"))
    except ImportError:
        n = 0
        notlar = []
        with open(os.path.join(odt_dir, base + ".txt"), "w", encoding="utf-8") as f:
            f.write(baslik + "\n" + (yazar + "\n" if yazar else "") + "\n")
            for segs in odt_paras:
                buf = ""
                for s in segs:
                    if "text" in s:
                        buf += s["text"]
                    else:
                        n += 1
                        buf += f"[{n}]"
                        notlar.append(f"[{n}] {s['note']}")
                f.write(buf + "\n")
            if notlar:
                f.write("\n--- Dipnotlar ---\n" + "\n".join(notlar))
        print("   (odfpy yok, .txt yazıldı. ODT için: pip install odfpy)")


# ------------------------------- CLI --------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Risale veritabanı çıkarıcı (v5)")
    ap.add_argument("--json-dir", default=".")
    ap.add_argument("--out", default="./risale-cikti")
    ap.add_argument("--eski-lugat", default=None)
    ap.add_argument("--inspect", action="store_true")
    ap.add_argument("--calistir", action="store_true")
    args = ap.parse_args()

    d = args.json_dir
    paths = {k: os.path.join(d, f"{k}.json") for k in
             ("bookpages", "meanings", "books", "footnote", "styles", "glossary", "contents")}

    if args.inspect or not args.calistir:
        inspect(paths)
        if not args.calistir:
            return
    for req in ("bookpages", "meanings"):
        if not os.path.exists(paths[req]):
            print(f"HATA: {req} bulunamadı -> {paths[req]}")
            sys.exit(1)
    run(paths, args.out, args.eski_lugat)


if __name__ == "__main__":
    main()
