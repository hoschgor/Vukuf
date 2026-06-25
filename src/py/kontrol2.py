import fitz
import re

PDF_YOLU = "src/data/Ayetul-Kubra.pdf"
doc = fitz.open(PDF_YOLU)

lugat_kalip = re.compile(r'^[A-Za-zÂÎÛâîûçğışöüÇĞİŞÖÜ].{2,}\s*:\s*[A-Za-zÂÎÛâîûçğışöüÇĞİŞÖÜ].{3,}$')

for sayfa_no in [13, 19]:
    sayfa = doc[sayfa_no]
    sayfa_yuksekligi = sayfa.rect.height
    sayfa_genisligi = sayfa.rect.width

    print(f"\n=== SAYFA {sayfa_no+1} (genişlik:{sayfa_genisligi:.0f} yükseklik:{sayfa_yuksekligi:.0f}) ===")
    bloklar = sayfa.get_text("blocks")
    for blok in bloklar:
        x0, y0, x1, y1, metin, *_ = blok
        metin = metin.strip()
        if not metin:
            continue
        y_yuzde = (y0 / sayfa_yuksekligi) * 100
        x_yuzde = (x0 / sayfa_genisligi) * 100
        # Sadece şüpheli olanları göster
        ilk_satir = metin.split("\n")[0]
        if lugat_kalip.match(ilk_satir) or metin.startswith("1 ") or "bkz" in metin.lower():
            print(f"Y:{y_yuzde:.0f}% X:{x0:.0f}({x_yuzde:.0f}%) | {metin[:100]}")

doc.close()