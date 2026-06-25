import urllib.request
import json
import time
import re
from html.parser import HTMLParser

class AnlamParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.anlamlar = []
        self.kayit = False
        self.mevcut = ""

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        # Anlam div'ini bul
        if tag == "div" and "class" in attrs_dict:
            if "meaning" in attrs_dict["class"] or "anlam" in attrs_dict["class"]:
                self.kayit = True

    def handle_endtag(self, tag):
        if tag == "div" and self.kayit:
            if self.mevcut.strip():
                self.anlamlar.append(self.mevcut.strip())
            self.kayit = False
            self.mevcut = ""

    def handle_data(self, data):
        if self.kayit:
            self.mevcut += data

def kelime_ara(kelime):
    try:
        url = f"https://www.luggat.com/{urllib.parse.quote(kelime)}"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        resp = urllib.request.urlopen(req, timeout=5)
        html = resp.read().decode("utf-8")

        # Basit regex ile anlam çek
        kalip = re.search(r'<p[^>]*class="[^"]*meaning[^"]*"[^>]*>(.*?)</p>', html, re.DOTALL)
        if kalip:
            anlam = re.sub(r'<[^>]+>', '', kalip.group(1)).strip()
            return anlam

        # Alternatif kalıp
        kalip2 = re.search(r'"description":\s*"([^"]+)"', html)
        if kalip2:
            return kalip2.group(1)

    except Exception as e:
        print(f"Hata ({kelime}): {e}")
    return None

# Test
import urllib.parse
test_kelimeler = ["zerre", "düstur", "mahiyet", "azamet", "burhan"]
for k in test_kelimeler:
    anlam = kelime_ara(k)
    print(f"{k}: {anlam}")
    time.sleep(0.5)