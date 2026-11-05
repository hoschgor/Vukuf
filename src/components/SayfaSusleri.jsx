/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KİTAP MODU SAYFA SÜSLERİ
   src/components/SayfaSusleri.jsx

   5 Kasım 2026 — kullanıcı: "Kenarlarını da orijinal mushaf gibi süsleriz, sayfa
   rakamları da belli yerlerde olur. Normal okunan sayfalar için de farklı bir süs
   yaparız." Renkler temaya uyar (kullanıcı seçti): hepsi theme.accent / text /
   background'dan türetilir; koyu temada da aynı oranlarla çalışır.

   • MushafCercevesi — basma mushaf düzeni: desenli bordür (köşelerde gül), üstte iki
     levha (iç tarafta sûre adı, dış tarafta cüz), altta ortada madalyon içinde sayfa
     numarası (Arapça rakam). Bordür tek bir SVG ile `border-image` (9 dilim) olarak
     çiziliyor → kenar ne kadar uzun olursa olsun desen "round" ile tam oturuyor.
   • EserCercevesi — sade kitap sayfası: ince çift çizgi, köşelerde küçük kıvrım, üstte
     küçük harfli sayfa başlığı, altta dış köşede sayfa numarası (tek sayfada ortada).
     Arapça eserlerde aynası (rakamlar Arapça, numara yeri ters).
   Çerçeveler gövdenin ölçüsünü hesaplayıp çocuğa verir: children(gövdeW, gövdeH).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo } from "react"

export const arapcaRakam = (n) => String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d])

// #rgb / #rrggbb → rgb dizisi (değilse null)
function rgb(renk) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(renk || "").trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split("").map(c => c + c).join("")
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
}
// İki rengi karıştır (a'dan b'ye t oranında) → #rrggbb
function karistir(a, b, t) {
  const x = rgb(a), y = rgb(b)
  if (!x || !y) return a
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")
}
const kacis = (s) => encodeURIComponent(s).replace(/'/g, "%27").replace(/"/g, "%22")

/* Bordür SVG'si — 3×3 hücre (her biri H px): köşeler gül, kenarlar desen. */
function bordurSvg(c1, c2, c3, zemin, H = 30) {
  const T = H * 3
  const ust = (x, y) => `
    <g transform="translate(${x} ${y})">
      <rect width="${H}" height="${H}" fill="${zemin}"/>
      <line x1="0" y1="2" x2="${H}" y2="2" stroke="${c1}" stroke-width="1.4"/>
      <line x1="0" y1="${H - 2}" x2="${H}" y2="${H - 2}" stroke="${c1}" stroke-width="1.4"/>
      <path d="M0 ${H / 2} L${H * 0.18} ${H * 0.3} L${H * 0.18} ${H * 0.7} Z M${H} ${H / 2} L${H * 0.82} ${H * 0.3} L${H * 0.82} ${H * 0.7} Z" fill="${c3}"/>
      <path d="M${H / 2} ${H * 0.2} L${H * 0.78} ${H / 2} L${H / 2} ${H * 0.8} L${H * 0.22} ${H / 2} Z" fill="${c2}" stroke="${c1}" stroke-width="1.1"/>
      <circle cx="${H / 2}" cy="${H / 2}" r="${H * 0.08}" fill="${c1}"/>
    </g>`
  const yan = (x, y) => `
    <g transform="translate(${x} ${y})">
      <rect width="${H}" height="${H}" fill="${zemin}"/>
      <line x1="2" y1="0" x2="2" y2="${H}" stroke="${c1}" stroke-width="1.4"/>
      <line x1="${H - 2}" y1="0" x2="${H - 2}" y2="${H}" stroke="${c1}" stroke-width="1.4"/>
      <path d="M${H / 2} 0 L${H * 0.3} ${H * 0.18} L${H * 0.7} ${H * 0.18} Z M${H / 2} ${H} L${H * 0.3} ${H * 0.82} L${H * 0.7} ${H * 0.82} Z" fill="${c3}"/>
      <path d="M${H / 2} ${H * 0.2} L${H * 0.8} ${H / 2} L${H / 2} ${H * 0.78} L${H * 0.2} ${H / 2} Z" fill="${c2}" stroke="${c1}" stroke-width="1.1"/>
      <circle cx="${H / 2}" cy="${H / 2}" r="${H * 0.08}" fill="${c1}"/>
    </g>`
  const gul = (x, y) => {
    const c = H / 2
    const yap = Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4
      const px = c + Math.cos(a) * H * 0.27, py = c + Math.sin(a) * H * 0.27
      return `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${(H * 0.12).toFixed(2)}" fill="${c2}" stroke="${c1}" stroke-width="0.9"/>`
    }).join("")
    return `
    <g transform="translate(${x} ${y})">
      <rect width="${H}" height="${H}" fill="${zemin}"/>
      <rect x="2" y="2" width="${H - 4}" height="${H - 4}" fill="none" stroke="${c1}" stroke-width="1.4"/>
      ${yap}
      <circle cx="${c}" cy="${c}" r="${H * 0.16}" fill="${c3}" stroke="${c1}" stroke-width="1"/>
      <circle cx="${c}" cy="${c}" r="${H * 0.06}" fill="${c1}"/>
    </g>`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">
    ${gul(0, 0)}${ust(H, 0)}${gul(2 * H, 0)}
    ${yan(0, H)}<rect x="${H}" y="${H}" width="${H}" height="${H}" fill="none"/>${yan(2 * H, H)}
    ${gul(0, 2 * H)}${ust(H, 2 * H)}${gul(2 * H, 2 * H)}
  </svg>`
  return `url("data:image/svg+xml,${kacis(svg)}")`
}

// Temadan süs renkleri
export function susRenkleri(theme) {
  const ac = theme.accent || "#8b6914"
  const bg = theme.background || "#f4ecd8"
  const tx = theme.text || "#2a2118"
  return {
    c1: karistir(ac, tx, 0.25),          // çizgi
    c2: karistir(ac, bg, 0.45),          // dolgu
    c3: karistir(ac, bg, 0.15),          // koyu dolgu
    zemin: karistir(bg, ac, 0.12),       // bordür zemini
    levha: karistir(bg, ac, 0.16),       // levha zemini
    yazi: karistir(ac, tx, 0.35),
  }
}

// Uçları sivri levha (sûre adı / cüz)
function Levha({ metin, r, boy }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      height: `${boy}px`, padding: `0 ${Math.round(boy * 0.9)}px`, maxWidth: "46%", boxSizing: "border-box",
      background: r.levha, color: r.yazi, border: `1px solid ${r.c1}`,
      clipPath: `polygon(${boy * 0.55}px 0, calc(100% - ${boy * 0.55}px) 0, 100% 50%, calc(100% - ${boy * 0.55}px) 100%, ${boy * 0.55}px 100%, 0 50%)`,
      fontFamily: "'Scheherazade New', 'me_quran', serif", fontSize: `${Math.round(boy * 0.62)}px`, lineHeight: 1,
      direction: "rtl", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    }}>{metin}</span>
  )
}

/**
 * Mushaf sayfası çerçevesi.
 * taraf: "sag" | "sol" | "tek"  — sûre levhası İÇ tarafta (cilde yakın), cüz DIŞ tarafta
 */
export function MushafCercevesi({ theme, w, h, sayfaNo, sureAdi, cuzNo, taraf = "tek", children }) {
  const r = useMemo(() => susRenkleri(theme), [theme])
  const kucuk = w < 420
  const bant = kucuk ? 11 : 15                // bordür kalınlığı
  const ic = kucuk ? 6 : 10                   // bordür ile yazı arası
  const dis = kucuk ? 4 : 8                   // sayfa kenarı ile bordür arası
  const levhaBoy = kucuk ? 20 : 25
  const madalyon = kucuk ? 24 : 30
  const resim = useMemo(() => bordurSvg(r.c1, r.c2, r.c3, r.zemin), [r])
  const ustAlan = levhaBoy + 4
  const altAlan = Math.round(madalyon * 0.5) + 2
  const govdeW = Math.max(0, Math.floor(w - 2 * dis - 2 * bant - 2 * ic - 2))
  const govdeH = Math.max(0, Math.floor(h - 2 * dis - ustAlan - altAlan - 2 * bant - 2 * ic - 2))
  const sure = sureAdi ? <Levha metin={sureAdi} r={r} boy={levhaBoy} /> : <span />
  const cuz = cuzNo ? <Levha metin={`الجزء ${arapcaRakam(cuzNo)}`} r={r} boy={levhaBoy} /> : <span />
  // sağ sayfa: dış = sağ → cüz sağda, sûre solda; sol sayfa: tersi; tek: sûre sağda (okuma yönü)
  const [solda, sagda] = taraf === "sag" ? [sure, cuz] : taraf === "sol" ? [cuz, sure] : [cuz, sure]
  return (
    <div style={{ position: "absolute", inset: 0, padding: `${dis}px`, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div style={{ height: `${ustAlan}px`, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: `0 ${bant}px 3px`, gap: "8px" }}>
        {solda}{sagda}
      </div>
      <div style={{
        position: "relative", flex: 1, minHeight: 0,
        borderStyle: "solid", borderWidth: `${bant}px`, borderImageSource: resim,
        borderImageSlice: 30, borderImageWidth: `${bant}px`, borderImageRepeat: "round",
        boxSizing: "border-box",
      }}>
        <div style={{ position: "absolute", inset: 0, border: `1px solid ${r.c1}`, margin: `${Math.max(2, ic - 4)}px`, pointerEvents: "none", opacity: 0.7 }} />
        <div style={{ position: "absolute", inset: `${ic + 1}px`, overflow: "hidden" }}>
          {children(govdeW, govdeH)}
        </div>
        {/* sayfa numarası madalyonu — alt bordürün ortasında */}
        <div style={{
          position: "absolute", left: "50%", bottom: `${-bant / 2 - madalyon / 2}px`, transform: "translateX(-50%)",
          minWidth: `${madalyon * 1.6}px`, height: `${madalyon}px`, borderRadius: `${madalyon}px`, padding: "0 8px", boxSizing: "border-box",
          background: r.levha, border: `1.5px solid ${r.c1}`, boxShadow: `0 0 0 2px ${r.zemin}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Scheherazade New', 'me_quran', serif", fontSize: `${Math.round(madalyon * 0.6)}px`, color: r.yazi, lineHeight: 1,
        }}>{arapcaRakam(sayfaNo)}</div>
      </div>
      <div style={{ height: `${altAlan}px` }} />
    </div>
  )
}

/**
 * Eser (kitap) sayfası çerçevesi — sade.
 * yon: "rtl" (Arapça eser) | "ltr"; taraf: "sag" | "sol" | "tek"; baslik: sayfa başlığı
 */
export function EserCercevesi({ theme, w, h, sayfaNo, baslik, taraf = "tek", yon = "ltr", children }) {
  const r = useMemo(() => susRenkleri(theme), [theme])
  const kucuk = w < 420
  const dis = kucuk ? 8 : 14
  const ic = kucuk ? 10 : 18
  const ustAlan = kucuk ? 20 : 24
  const altAlan = kucuk ? 22 : 26
  const govdeW = Math.max(0, Math.floor(w - 2 * dis - 2 * ic - 4))
  const govdeH = Math.max(0, Math.floor(h - 2 * dis - ustAlan - altAlan - 2 * ic - 4))
  const rakam = yon === "rtl" ? arapcaRakam(sayfaNo) : String(sayfaNo)
  // numara: dış köşede; tek sayfada ortada
  const numHiza = taraf === "tek" ? "center" : taraf === "sag" ? "flex-end" : "flex-start"
  const kose = (don) => (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" style={{ position: "absolute", ...don.yer, transform: don.tr, pointerEvents: "none" }}>
      <path d="M1 17 V7 Q1 1 7 1 H17" fill="none" stroke={r.c1} strokeWidth="1.2" />
      <path d="M5 17 V9 Q5 5 9 5 H17" fill="none" stroke={r.c1} strokeWidth="0.8" opacity="0.7" />
      <circle cx="9" cy="9" r="1.6" fill={r.c3} />
    </svg>
  )
  return (
    <div style={{ position: "absolute", inset: 0, padding: `${dis}px`, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div style={{
        height: `${ustAlan}px`, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: kucuk ? "10px" : "11px", letterSpacing: "0.12em", color: r.yazi, opacity: 0.8,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", direction: yon, fontVariant: "small-caps",
        padding: "0 24px",
      }}>{baslik || ""}</div>
      <div style={{ position: "relative", flex: 1, minHeight: 0, border: `1px solid ${r.c1}88`, outline: `1px solid ${r.c1}44`, outlineOffset: "3px", margin: "3px" }}>
        {kose({ yer: { left: "-1px", top: "-1px" }, tr: "none" })}
        {kose({ yer: { right: "-1px", top: "-1px" }, tr: "scaleX(-1)" })}
        {kose({ yer: { left: "-1px", bottom: "-1px" }, tr: "scaleY(-1)" })}
        {kose({ yer: { right: "-1px", bottom: "-1px" }, tr: "scale(-1,-1)" })}
        <div style={{ position: "absolute", inset: `${ic}px`, overflow: "hidden" }}>
          {children(govdeW, govdeH)}
        </div>
      </div>
      <div style={{
        height: `${altAlan}px`, display: "flex", alignItems: "flex-end", justifyContent: numHiza, padding: "0 10px",
        fontSize: kucuk ? "11px" : "12px", color: r.yazi, fontVariantNumeric: "tabular-nums",
        fontFamily: yon === "rtl" ? "'Scheherazade New', serif" : "inherit",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "14px", height: "1px", background: r.c1, opacity: 0.6 }} />
          {rakam}
          <span style={{ width: "14px", height: "1px", background: r.c1, opacity: 0.6 }} />
        </span>
      </div>
    </div>
  )
}
