import json
import time
import urllib.request
from pathlib import Path

BASE = Path(__file__).parent.parent.parent / "public"

def api_cek(url, deneme=3):
    for i in range(deneme):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as r:
                return json.loads(r.read())
        except Exception as e:
            print(f"  Hata ({i+1}): {e}")
            time.sleep(2)
    return None

def main():
    with open(BASE / "kuran-mushaf.json", encoding="utf-8") as f:
        mushaf = json.load(f)

    toplam_sure = len(mushaf)
    
    for sure in mushaf:
        sure_no = sure["id"]
        print(f"Sure {sure_no}/{toplam_sure}: {sure['isim']}")
        
        url = (f"https://api.quran.com/api/v4/verses/by_chapter/{sure_no}"
               f"?words=true&word_fields=text_uthmani&per_page=300&page=1")
        data = api_cek(url)
        if not data:
            print(f"  ATLA: Sure {sure_no} alinamadi")
            continue

        ayet_kelime_map = {}
        for verse in data["verses"]:
            ayet_no = int(verse["verse_key"].split(":")[1])
            kelimeler = [w["text_uthmani"] for w in verse["words"] if w["char_type_name"] == "word"]
            ayet_kelime_map[ayet_no] = kelimeler

        for ayet in sure["ayetler"]:
            ayet_no = ayet["no"]
            yeni_kelimeler = ayet_kelime_map.get(ayet_no, [])
            if not yeni_kelimeler:
                print(f"  UYARI: {sure_no}:{ayet_no} bulunamadi")
                continue
            mevcut = ayet["kelimeler"]
            if len(yeni_kelimeler) != len(mevcut):
                print(f"  UYARI: {sure_no}:{ayet_no} kelime sayisi farkli (mevcut={len(mevcut)}, yeni={len(yeni_kelimeler)})")
                continue
            for i, kelime in enumerate(mevcut):
                kelime["arabic"] = yeni_kelimeler[i]

        time.sleep(0.3)

    out = BASE / "kuran-mushaf.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(mushaf, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Guncellendi: {out}")

if __name__ == "__main__":
    main()
