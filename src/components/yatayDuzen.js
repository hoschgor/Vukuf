/* ═══════════════════════════════════════════════════════════════════════════
   YATAY TELEFON DÜZENİ (29 Eylül 2026) — bütün ayar panelleri için ortak

   Kullanıcı: "telefon yatay döndüğünde açılan ayar menüleri dikeye uzun ve zorla
   sığmaya çalışıyor; ekranda düzenleme payı kalmıyor". Paneller dikey telefona
   göre DAR ve UZUN tasarlanmıştı (240-320 px en, 80vh boy). Yatayda ekranın
   yüksekliği ~430 px, bar ve oynatıcı çıkınca panele ~250-300 px kalıyor:
   önizleme bile tek başına alanın yarısını yiyor, ayarlar küçük bir pencerede
   kaydırılıyordu — oysa yanlarda 600 px boş en duruyordu.

   ÇÖZÜM: yatay + alçak ekranda paneller ENİNE açılıyor:
     • Yazı paneli: önizleme SOLDA sabit, sekmeler ve ayarlar SAĞDA.
     • Tema paneli: tema satırları 2-3 sütun, renk ayarları yan yana.
     • Ayarlar / özel tema: iki sütun.
     • Alttan açılan sayfa: geniş ve ekran boyunca.
     • Her panelin boyu ekranın GERÇEKTEN kalan kısmına göre (80vh değil).

   ── DÖNME GECİKMESİ — NİÇİN @media DEĞİL, KÖK SINIF ──────────────────────────
   İlk sürüm kuralları `@media (orientation: landscape) …` içinde tutuyordu.
   Kullanıcı: "yatay-dikey dönme gecikmesi arttı gibi". Ölçüldü (Chromium,
   Kur'ân sayfası büyüklüğünde 30 bin öğe): uygulamada BAŞKA HİÇBİR medya
   sorgusu dönmede değişmiyordu, yani dönme stil hesabı gerektirmiyordu (0 ms).
   Bizim sorgumuz her dönmede açılıp kapandığı için tarayıcı BÜTÜN belgenin
   stilini yeniden hesaplıyordu: dönme başına ~6-8 ms (masaüstü işlemcide;
   telefonda birkaç katı). Seçicileri sınıfa bağlamak yetmedi (7,5 → 6,2 ms) —
   medya sorgusu değişimi tarayıcıda belgenin tamamını geçersiz sayıyor.
   ARTIK: kurallar `html.yp-yatay` sınıfına bağlı; sınıfı tek bir matchMedia
   dinleyicisi takıp çıkarıyor. Kök sınıf değişiminde tarayıcı yalnız bu
   kuralların eşleşebileceği öğelere (panellere) bakıyor.

   ⚠ SEÇİCİ KURALI: her kuralın EN SAĞ parçası bir SINIF olmalı. `.x > *`,
   `:first-child`, `:last-child` gibi seçiciler "her öğeye bak" dedirtir;
   WebKit ayrıca yapısal seçicilerde ebeveynleri işaretleyip sonraki her DOM
   değişiminde kardeşleri de yeniden sınar. Izgara yerleşimi bu yüzden
   OTOMATİK YERLEŞİMLE yapılıyor (önizleme 1. sütunda uzun bir satır aralığı
   kaplıyor, öbür çocuklar kendiliğinden 2. sütuna diziliyor).

   Durum: yatay VE yüksekliği 540 px'ten az — yatay telefon. Tablet yatayda
   (yükseklik ≥ 700) ve masaüstünde hiçbir şey değişmez.

   KULLANIM (panel kabuğunda):
     className="... yp-panel yp-genis yp-aa"
     style={{ ...ypDegisken({ pay: 68, en: 660, cizgi: theme.border }) }}
   ═══════════════════════════════════════════════════════════════════════════ */

export const YATAY_SORGU = "(orientation: landscape) and (max-height: 540px)"
const KOK_SINIF = "yp-yatay"

// Panele CSS değişkenleri: pay = panelin üstünde/altında kalan dolu alan (bar,
// oynatıcı, kenar payı), en = yatayda istenen genişlik, çizgi = ayırıcı rengi.
export function ypDegisken({ pay = 24, en = 620, cizgi } = {}) {
  const d = { "--yp-pay": `${Math.round(pay)}px`, "--yp-en": `${Math.round(en)}px` }
  if (cizgi) d["--yp-cizgi"] = cizgi
  return d
}

const YAN_PAY = "(24px + env(safe-area-inset-left) + env(safe-area-inset-right))"
const Y = `.${KOK_SINIF}`

const CSS = `
/* ── Genel: boy ekranın kalanına, en isteğe (çentik payı düşülerek) ── */
${Y} .yp-panel {
  max-height: calc(100dvh - var(--yp-pay, 24px)) !important;
  overflow-y: auto !important;
}
${Y} .yp-genis {
  width: min(var(--yp-en, 620px), calc(100vw - ${YAN_PAY})) !important;
  max-width: none !important;
  box-sizing: border-box;
}
/* Sağa yaslı paneller çentiğin altına girmesin */
${Y} .yp-sag { right: calc(12px + env(safe-area-inset-right)) !important; }

/* ── Yazı paneli: önizleme solda sabit, ayarlar sağda ── */
${Y} .yp-aa {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  column-gap: 16px;
  align-items: start;
}
${Y} .yp-aa-onizleme {
  grid-column: 1;
  grid-row: 1 / span 40;
  position: sticky !important;
  top: 0;
  margin: 0 !important;
  padding: 12px 16px 12px 0 !important;
  border-bottom: none !important;
  border-right: 1px solid var(--yp-cizgi, rgba(128,128,128,.25));
  align-self: start;
}
${Y} .yp-aa-ilk { margin-top: 12px !important; }
/* Sekme değişince zıplamayı önleyen en az yükseklik yatayda gereksiz yer yiyor */
${Y} .yp-aa-icerik { min-height: 0 !important; }

/* ── İki sütun (ayarlar, özel tema renkleri) ── */
${Y} .yp-iki {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px !important;
  align-items: start;
}
${Y} .yp-tam { grid-column: 1 / -1; }

/* ── Tema paneli: başlık + seçici tam genişlik (yp-tam), renk ayarları yan yana ── */
${Y} .yp-tema {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 20px;
  align-items: start;
}
${Y} .yp-renk {
  border-top: 1px solid var(--yp-cizgi, rgba(128,128,128,.25)) !important;
  margin-top: 10px !important;
  padding-top: 10px !important;
}

/* ── Alttan açılan sayfa (Ayarlar, Veriler…): geniş ve ekran boyu ── */
${Y} .yp-altsayfa {
  max-width: min(780px, calc(100vw - ${YAN_PAY})) !important;
  max-height: calc(100dvh - env(safe-area-inset-top) - 8px) !important;
}

/* ── TemaSecici "satır" düzeni: satırlar 2-3 sütun ── */
${Y} .vts-satirlar {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
  column-gap: 6px;
}

/* ── TemaSecici "kart" düzeni (Ayarlar): cami solda, rozetler sağda.
   Yalnız kabuk yeterince genişse (kap sorgusu) — dar sayfada tek sütun. ── */
${Y} .vts-kart { container: vts / inline-size; }
@container vts (min-width: 540px) {
  ${Y} .vts-kart-ic {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    column-gap: 18px;
    align-items: start;
  }
  ${Y} .vts-onizleme {
    grid-column: 1;
    grid-row: 1 / span 20;
    position: sticky;
    top: 0;
  }
  ${Y} .vts-cami { margin-top: 0 !important; }
}
`

export function yatayStilYukle() {
  if (typeof document === "undefined") return
  if (document.getElementById("vukuf-yatay-stil")) return
  const s = document.createElement("style")
  s.id = "vukuf-yatay-stil"
  s.textContent = CSS
  document.head.appendChild(s)

  // Kök sınıfı TEK dinleyici yönetiyor (bkz. baştaki "dönme gecikmesi" notu)
  if (typeof window === "undefined" || !window.matchMedia) return
  const mq = window.matchMedia(YATAY_SORGU)
  const uygula = () => document.documentElement.classList.toggle(KOK_SINIF, mq.matches)
  uygula()
  if (mq.addEventListener) mq.addEventListener("change", uygula)
  else if (mq.addListener) mq.addListener(uygula)
}

// İçe aktarılınca bir kez yüklenir (her ekran kendi içe aktarır; kimlik sayesinde tek kopya)
yatayStilYukle()
