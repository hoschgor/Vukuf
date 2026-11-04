/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — CAMİ SAHNESİ (Ekstralar → Namaz Vakitleri)
   src/components/CamiVakit.jsx

   4 Kasım 2026 — kullanıcı: "Namaz vakitleri kısmına bizdeki tema bölümünde bulunan
   Cami görseli gibi bir görselle süsleyelim."
   Tema seçicideki cami önizlemesiyle (TemaSecici.jsx → CamiOnizleme) aynı dil: iki
   kalem minare, yan kubbeler, kasnaklı ana kubbe ve alem, cephe, yan kanatlarda
   çiçek rozetleri, ortada sivri kemerli MİHRAP. Renkler seçili temadan (tema
   değişince geçişle döner). Mihrap nişinin içinde sıradaki vakit ve kalan süre
   yazar (HTML katmanı; yazı boyu çizimle birlikte ölçeklenir). Çizim önizlemeden
   daha alçak: kart içinde yer kaplamasın diye cephe kısaltıldı.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react"
import { hilalYolu, RozetSekli } from "./TemaSecici"

const VB_G = 300, VB_Y = -2, VB_Y2 = 212, ZEMIN = 206
const GECIS = "fill .35s ease, stroke .35s ease"
// Niş içi yazı alanı (viewBox birimiyle)
const NIS = { x: 86, y: 134, g: 128, h: 66 }

export default function CamiVakit({ theme, ust, buyuk, alt }) {
  const t = { ...theme, ayetNoRengi: theme.ayetNoRengi || theme.accent }
  const f = (fill, stroke, sw, ek) => ({ fill, stroke, strokeWidth: sw, transition: GECIS, ...ek })
  const yuzey = f(t.surface, t.border, 1.2)
  const hat = f(t.surface, t.accent, 1.1)

  // Kutu genişliği → yazı boyları
  const kutuRef = useRef(null)
  const [gen, setGen] = useState(320)
  useEffect(() => {
    const el = kutuRef.current
    if (!el) return
    const olc = () => { const w = el.clientWidth; if (w) setGen(p => (Math.abs(p - w) > 0.5 ? w : p)) }
    olc()
    let ro
    try { ro = new ResizeObserver(olc); ro.observe(el) } catch { /* yoksay */ }
    return () => { try { ro && ro.disconnect() } catch { /* yoksay */ } }
  }, [])
  const k = gen / VB_G
  const yH = VB_Y2 - VB_Y

  const minare = (x) => (
    <g>
      <rect x={x - 6} y="40" width="12" height={ZEMIN - 40} style={yuzey} />
      <rect x={x - 9} y="76" width="18" height="4" rx="1" style={hat} />
      <rect x={x - 9} y="116" width="18" height="4" rx="1" style={hat} />
      <path d={`M${x - 6} 40 L${x} 8 L${x + 6} 40 Z`} style={f(t.accent, t.accent, 1, { fillOpacity: 0.85 })} />
      <line x1={x} y1="8" x2={x} y2="2" style={f("none", t.accent, 1.1)} />
      <path {...hilalYolu(x, 2.4, 3.1)} style={f(t.accent, "none", 0)} />
    </g>
  )
  const pencere = (x, y, g, h) => (
    <path d={`M${x} ${y + h} L${x} ${y + g / 2} Q${x} ${y}, ${x + g / 2} ${y - 2} Q${x + g} ${y}, ${x + g} ${y + g / 2} L${x + g} ${y + h} Z`}
      style={f(t.background, t.accent, 0.9)} />
  )
  const yuzde = (x, y) => ({ left: `${(x / VB_G) * 100}%`, top: `${((y - VB_Y) / yH) * 100}%` })

  return (
    <div ref={kutuRef} style={{ position: "relative", width: "100%", maxWidth: "380px", margin: "0 auto" }}>
      <svg viewBox={`0 ${VB_Y} ${VB_G} ${yH}`} width="100%" role="img" aria-label="Cami"
        style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 4px 10px rgba(0,0,0,.12))" }}>
        {minare(20)}
        {minare(280)}
        {/* yan kubbeler, kasnak + pencereler, ana kubbe, alem */}
        <path d="M46 100 A32 24 0 0 1 110 100 Z" style={hat} />
        <path d="M190 100 A32 24 0 0 1 254 100 Z" style={hat} />
        <rect x="98" y="76" width="104" height="24" style={yuzey} />
        {[108, 128, 162, 182].map(x => <g key={x}>{pencere(x, 82, 10, 14)}</g>)}
        <path d="M94 78 A56 50 0 0 1 206 78 Z" style={hat} />
        <line x1="150" y1="28" x2="150" y2="10" style={f("none", t.accent, 1.4)} />
        <circle cx="150" cy="20" r="2.8" style={f(t.accent, "none", 0)} />
        <circle cx="150" cy="13.5" r="2" style={f(t.accent, "none", 0)} />
        <path {...hilalYolu(150, 10, 7)} style={f(t.accent, "none", 0)} />
        {/* cephe */}
        <rect x="32" y="100" width="236" height={ZEMIN - 100} style={yuzey} />
        {/* yan kanatlar: çiçek rozeti + kemerli pencere */}
        <RozetSekli cx={50} cy={128} r={11} t={t} />
        <RozetSekli cx={250} cy={128} r={11} t={t} />
        {pencere(43, 158, 14, 30)}
        {pencere(243, 158, 14, 30)}
        {/* MİHRAP: pîştak + sivri kemerli niş */}
        <rect x="68" y="106" width="164" height={ZEMIN - 106} style={f(t.surface, t.accent, 1.1)} />
        <path d={`M78 ${ZEMIN} L78 146 C78 128, 124 122, 150 112 C176 122, 222 128, 222 146 L222 ${ZEMIN} Z`}
          style={f(t.background, t.accent, 1.1)} />
        <RozetSekli cx={80} cy={117} r={6} t={t} />
        <RozetSekli cx={220} cy={117} r={6} t={t} />
        <line x1="2" y1={ZEMIN + 0.5} x2="298" y2={ZEMIN + 0.5} style={f("none", t.border, 1.4)} />
      </svg>

      {/* NİŞ İÇİ YAZI */}
      <div style={{
        position: "absolute", boxSizing: "border-box", ...yuzde(NIS.x, NIS.y),
        width: `${(NIS.g / VB_G) * 100}%`, height: `${(NIS.h / yH) * 100}%`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", lineHeight: 1.2, color: t.text, transition: "color .35s ease",
      }}>
        {/* Dar ekranda satır kırılabilir (taşmasın): üst yazı iki satıra, saniye alta inebilir */}
        {ust && <div style={{ fontSize: `${Math.max(10.5, 9.4 * k)}px`, color: t.textSecondary, maxWidth: "100%" }}>{ust}</div>}
        {buyuk && <div style={{ fontSize: `${Math.max(16, 18 * k)}px`, fontWeight: 700, color: t.accent, fontVariantNumeric: "tabular-nums", margin: `${2 * k}px 0`, lineHeight: 1.1 }}>{buyuk}</div>}
        {alt && <div style={{ fontSize: `${Math.max(10, 8.6 * k)}px`, color: t.textSecondary }}>{alt}</div>}
      </div>
    </div>
  )
}
