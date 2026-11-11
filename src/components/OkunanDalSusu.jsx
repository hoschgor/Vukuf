// OKUNAN ÂYET DAL SÜSÜ (11 Kasım 2026) — ayrı dosya: "DalSusu.jsx" meal penceresinin dal süsü
// (dalPaleti ile birlikte TemaSecici, KitaplikModu, MealPopup kullanıyor), ona dokunulmuyor.
// — okunan âyetin sonundaki rozetin üstünde ve altında, rozetten
// iki yana kıvrılan yapraklı ince dallar. Kullanıcı: "çalarken âyet işaretlemesini …
// dallar ile süsleyelim … sistemi yormayacaksa dalların hareketleri ile hafif efekt".
// YORMAMASI İÇİN:
//   • Sayfada yalnız OKUNAN âyetin rozetinde çizilir (tek örnek, 4 küçük SVG).
//   • Mutlak konumlu, pointer-events yok → satır akışına, kırılıma, sayfa boyuna dokunmaz.
//     Rozetin kendi kutusundaki boş alana (çizim kutunun dikey ortasında) ve satır
//     aralığına yerleşir; komşu kelimelerin üstüne binmez.
//   • Hareket yalnız HTML kutularının transform'u (ekran kartında çalışır); SVG'nin içi
//     hiç değişmez → her karede yeniden boyama yok. "Hareketi azalt" açıksa durur.
const STIL_ID = "vk-okunan-dal-stil"
function stilKur() {
  if (typeof document === "undefined" || document.getElementById(STIL_ID)) return
  const st = document.createElement("style")
  st.id = STIL_ID
  st.textContent = `
@keyframes vkDalSol { 0% { transform: rotate(-4deg); } 100% { transform: rotate(5deg); } }
@keyframes vkDalSag { 0% { transform: rotate(4deg); } 100% { transform: rotate(-5deg); } }
@keyframes vkDalGir { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: scale(1); } }
.vk-dal-kat { animation: vkDalGir .45s ease-out both; }
.vk-dal-oynar .vk-dal-sol { animation: vkDalSol 3.4s ease-in-out infinite alternate; will-change: transform; }
.vk-dal-oynar .vk-dal-sag { animation: vkDalSag 3.4s ease-in-out -1.7s infinite alternate; will-change: transform; }
@media (prefers-reduced-motion: reduce) { .vk-dal-kat, .vk-dal-oynar .vk-dal-sol, .vk-dal-oynar .vk-dal-sag { animation: none; } }`
  document.head.appendChild(st)
}

// Tek dal (sol yarı): taban sağ altta (60,30), uç sola-yukarı kıvrılır; boyunca yapraklar.
function Dal({ renk }) {
  const yaprak = (x, y, a, s = 1) => (
    <path transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}
      d="M0 0 C 3.5 -4.2, 10 -4.2, 13 0 C 10 4.2, 3.5 4.2, 0 0 Z" fill={renk} />
  )
  return (
    <svg viewBox="0 0 60 32" width="100%" height="100%" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <path d="M59 30 C 47 29.5, 33 25, 22 16 C 15 10.5, 10 7, 4 6" fill="none" stroke={renk} strokeWidth="1.5" strokeLinecap="round" />
      {/* kısa yan filiz */}
      <path d="M36 23.5 C 33 19, 33 15.5, 35 12.5" fill="none" stroke={renk} strokeWidth="1.1" strokeLinecap="round" />
      {yaprak(46, 28.2, -168, 0.95)}
      {yaprak(42, 26.6, -118, 0.8)}
      {yaprak(28, 20.8, -150, 0.9)}
      {yaprak(25, 18.5, -100, 0.72)}
      {yaprak(35, 12.5, -80, 0.62)}
      {yaprak(14, 10.2, -140, 0.75)}
      <circle cx="4" cy="6" r="1.9" fill={renk} />
    </svg>
  )
}

// Rozet kutusunun içine konur (kutu position:relative olmalı). size: rozet boyu (px).
export default function OkunanDalSusu({ size, renk, hareket = true }) {
  stilKur()
  // Rozet çizimi kutunun dikey ortasında ±%23'lük bir şerit; dallar onun hemen üstünden/altından
  const en = size * 0.7, boy = size * 0.4, ara = size * 0.24
  const kat = (alt) => (
    <span className={`vk-dal-kat${hareket ? " vk-dal-oynar" : ""}`} aria-hidden="true" style={{
      position: "absolute", left: "50%", width: `${en * 2}px`, height: `${boy}px`,
      marginLeft: `${-en}px`,
      ...(alt ? { top: `calc(50% + ${ara}px)` } : { bottom: `calc(50% + ${ara}px)` }),
      pointerEvents: "none", display: "flex", opacity: 0.9,
    }}>
      {/* alttaki kat aynalı (dallar aşağı kıvrılır) — iç kutuda, salınım dış kutuda */}
      <span style={{ display: "flex", width: "100%", height: "100%", transform: alt ? "scaleY(-1)" : undefined }}>
        <span className="vk-dal-sol" style={{ width: "50%", height: "100%", transformOrigin: "100% 94%" }}>
          <Dal renk={renk} />
        </span>
        <span className="vk-dal-sag" style={{ width: "50%", height: "100%", transformOrigin: "0% 94%" }}>
          {/* aynalama İÇ kutuda (merkezine göre); salınım dış kutuda, tabanı ortada */}
          <span style={{ display: "block", width: "100%", height: "100%", transform: "scaleX(-1)" }}>
            <Dal renk={renk} />
          </span>
        </span>
      </span>
    </span>
  )
  return <>{kat(false)}{kat(true)}</>
}
