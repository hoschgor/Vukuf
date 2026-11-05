/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — AÇIK PENCEREYİ KAPATAN DOKUNUŞ
   src/data/pencereDokunusu.js

   5 Kasım 2026 — kullanıcı: "Farklı bir kısım açıkken kelimeye tıklamak da kelime popup'ı
   ile birlikte ya da âyet popup'ı ile birlikte açılmamalı, o menüyü kapamalı."
   Açık bir panel (.vukuf-panel / .okuma-panel — usePanelKilidi'nin de kullandığı işaret;
   bunlar yalnız açıkken DOM'da) ya da küçük pencere ([data-orta-engel]: oynatıcının ses/hız
   baloncuğu vb.) varken, onların DIŞINA yapılan dokunuş "kapatma dokunuşu" sayılır.
   Kelime/âyet/sûre tıklama işleyicileri bunu sorup pencere açmak yerine paneli kapatır.
   Dokunuşun BAŞINDA bakılır (pointerdown, yakalama evresi): pencere kendini pointerdown'da
   kapatsa da tıklama anında hâlâ bilinir.
   ═══════════════════════════════════════════════════════════════════════════ */

const ACIK = ".vukuf-panel, .okuma-panel, [data-orta-engel]"
let sonAn = -1e9

function gorunur(el) {
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return false
  const cs = getComputedStyle(el)
  return cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity || "1") > 0.05
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => {
    try {
      const acik = [...document.querySelectorAll(ACIK)].filter(gorunur)
      if (acik.length && !acik.some(el => el.contains(e.target))) sonAn = performance.now()
    } catch { /* yoksay */ }
  }, true)
}

/** Son dokunuş açık bir pencerenin dışına mı yapıldı? (tıklama işleyicisinde sorulur) */
export function pencereKapatmaDokunusu() {
  return performance.now() - sonAn < 900
}
