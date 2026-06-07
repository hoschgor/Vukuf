import fitz
import pytesseract
from PIL import Image
import io

PDF_YOLU = "/home/hosgoer/Projeler/vukuf/src/data/Munkiz - Gazali.pdf"

doc = fitz.open(PDF_YOLU)

# Sadece 10. sayfayı test et
sayfa = doc[9]
mat = fitz.Matrix(2.0, 2.0)  # 2x zoom — daha iyi OCR kalitesi
pix = sayfa.get_pixmap(matrix=mat)
img_data = pix.tobytes("png")
img = Image.open(io.BytesIO(img_data))

metin = pytesseract.image_to_string(img, lang="tur")
print(metin[:1000])

doc.close()