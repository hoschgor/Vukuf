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
   YAN KÖŞELER (4 Kasım 2026): kullanıcı: "caminin dışında sol tarafa günün kerahat
   vakitleri aralıklarını liste olarak tutalım, kerahat vakti içindeysek sağ tarafta da
   bununla ilgili bildirim verebilir." Minare ile kubbeler arasındaki boş gökyüzü
   köşeleri kullanılıyor: `sol` (liste) ve `sag` (bildirim) — HTML katmanı, yazı boyu
   çizimle ölçeklenir. (İlk denemedeki sol kanat levhası beğenilmedi, kaldırıldı.)
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react"
import { hilalYolu, RozetSekli } from "./TemaSecici"
import { HavaGlifi, HAVA_CSS } from "./HavaSimgesi"

// VB_Y −42: caminin üstünde güneşin / ayın dolaştığı gök şeridi (4 Kasım 2026)
const VB_G = 300, VB_Y = -42, VB_Y2 = 212, ZEMIN = 206
const GECIS = "fill .35s ease, stroke .35s ease"
// Niş içi yazı alanı (viewBox birimiyle)
const NIS = { x: 86, y: 134, g: 128, h: 66 }

// Gökyüzü köşeleri (viewBox birimi): minarenin şerefesi ile yan kubbe/ana kubbe arası
const SOL_KOSE = { x: 31, y: 0, g: 60, h: 80 }
const SAG_KOSE = { x: 209, y: 0, g: 60, h: 80 }

/* GÖK — güneş ya da ay, doğudan (sol) batıya (sağ) yay üzerinde. `gok`: { tur: "gunes"|"ay", oran 0..1, evre 0..1 } */
const yayNoktasi = (oran) => ({ x: 34 + oran * 232, y: -10 - 24 * Math.sin(Math.PI * oran) })
function Gunes({ x, y }) {
  const isinlar = Array.from({ length: 12 }, (_, i) => i * 30)
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} aria-hidden="true">
      <circle r="15" fill="#f2b544" opacity="0.16" />
      <circle r="11" fill="#f2b544" opacity="0.18" />
      {isinlar.map(a => (
        <line key={a} x1="0" y1="-9.5" x2="0" y2={a % 60 ? "-12" : "-13.5"} stroke="#e39b2d" strokeWidth="1.1" strokeLinecap="round" transform={`rotate(${a})`} />
      ))}
      <circle r="7" fill="#f6c453" stroke="#e39b2d" strokeWidth="1" />
    </g>
  )
}
/* AY (16 Kasım 2026) — kesir: aydınlık oranı (0 yeni ay … 1 dolunay); egim: aydınlık kenarın
   görünen yönü, zenitten saat yönünün tersine (data/gokHesabi.js). Şekil aydınlık kenar SAĞDA
   çizilir, sonra o yöne döndürülür: döndürme = −(90° + eğim). Gündüz gökteyse soluk. */
function Ay({ x, y, kesir, egim, gunduz, t }) {
  const r = 7
  const rx = r * Math.abs(1 - 2 * kesir)
  const sisk = kesir > 0.5                            // şişkin (yarımdan büyük) ay
  const aydin = `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${rx.toFixed(2)} ${r} 0 0 ${sisk ? 1 : 0} 0 ${-r} Z`
  const don = -(90 + (egim * 180) / Math.PI)
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} aria-hidden="true" opacity={gunduz ? 0.7 : 1}>
      {!gunduz && <circle r="13" fill="#f3ead0" opacity="0.14" />}
      <circle r={r} fill={t.textSecondary} opacity="0.18" stroke={t.border} strokeWidth="0.6" />
      {kesir > 0.01 && <path d={aydin} fill="#f3ead0" stroke="#cdbb86" strokeWidth="0.6" transform={`rotate(${don.toFixed(1)})`} />}
    </g>
  )
}
/* Ayın gökteki yeri: x 0..1 doğu→batı, y 0..1 ufuk→tepe (güneşin yayıyla aynı çerçeve) */
const ayNoktasi = (a) => ({ x: 34 + a.x * 232, y: -10 - 24 * a.y })
const YILDIZLAR = [[58, -30], [92, -18], [126, -36], [178, -32], [214, -20], [246, -34], [270, -14], [40, -16]]

/* HAVA (15 Kasım 2026) — kullanıcı: "Bu kartlara hava durumunu da ekleyelim … sadece derece
   olsa yeterli. Yağmurlu ise yağmur damlası, karlı ise kar tanesi, kapalı ise bulut çizimi."
   `hava` = { derece, tur, gunduz } (data/havaDurumu.js). Göğün sol üst köşesinde: bulut
   (gerekiyorsa damla / kar tanesi / şimşek / sis) ve yanında derece. Bulut güneşten/aydan
   sonra çizilir — önünden geçen güneşi örter. Açık havada yalnız derece (gökte güneş/ay var). */
const HAVA_YER = { x: 2, y: -42, olcek: 1.25 }
export default function CamiVakit({ theme, ust, buyuk, alt, sol = null, sag = null, gok = null, hava = null }) {
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
        {/* GÖK: gece yıldızlar + ay, gündüz güneş */}
        {gok && gok.tur === "ay" && YILDIZLAR.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 ? 0.8 : 1.1} fill={t.accent} opacity={0.35 + (i % 3) * 0.15} />
        ))}
        {gok && gok.tur === "gunes" && (() => { const n = yayNoktasi(gok.oran); return <Gunes x={n.x} y={n.y} /> })()}
        {gok && gok.ay && (() => { const n = ayNoktasi(gok.ay); return <Ay x={n.x} y={n.y} kesir={gok.ay.kesir} egim={gok.ay.egim} gunduz={gok.ay.gunduz} t={t} /> })()}
        {/* HAVA — bulut ve yağış */}
        {hava && hava.tur && hava.tur !== "acik" && (
          <g transform={`translate(${HAVA_YER.x} ${HAVA_YER.y}) scale(${HAVA_YER.olcek})`}>
            <HavaGlifi tur={hava.tur} dolgu={t.surface} cizgi={t.accent} vurgu={t.accent} />
          </g>
        )}
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
        {pencere(43, 158, 14, 30)}
        <RozetSekli cx={250} cy={128} r={11} t={t} />
        {pencere(243, 158, 14, 30)}
        {/* MİHRAP: pîştak + sivri kemerli niş */}
        <rect x="68" y="106" width="164" height={ZEMIN - 106} style={f(t.surface, t.accent, 1.1)} />
        <path d={`M78 ${ZEMIN} L78 146 C78 128, 124 122, 150 112 C176 122, 222 128, 222 146 L222 ${ZEMIN} Z`}
          style={f(t.background, t.accent, 1.1)} />
        <RozetSekli cx={80} cy={117} r={6} t={t} />
        <RozetSekli cx={220} cy={117} r={6} t={t} />
        <line x1="2" y1={ZEMIN + 0.5} x2="298" y2={ZEMIN + 0.5} style={f("none", t.border, 1.4)} />
      </svg>

      {/* HAVA — derece (bulutun sağında; açık havada köşede tek başına) */}
      {hava && (
        <>
          <style>{HAVA_CSS}</style>
          <div title={`${hava.derece}°`} style={{
            position: "absolute", ...yuzde(hava.tur && hava.tur !== "acik" ? HAVA_YER.x + 44 : HAVA_YER.x + 4, HAVA_YER.y + 10),
            fontSize: `${Math.max(11, 12 * k)}px`, fontWeight: 700, lineHeight: 1, color: t.text,
            fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", pointerEvents: "none",
          }}>{hava.derece}°</div>
        </>
      )}

      {/* GÖKYÜZÜ KÖŞELERİ: solda liste, sağda bildirim */}
      {[[sol, SOL_KOSE, "flex-start"], [sag, SAG_KOSE, "flex-end"]].map(([icerik, kose, hiza], i) => icerik && (
        <div key={i} style={{
          position: "absolute", boxSizing: "border-box", ...yuzde(kose.x, kose.y),
          width: `${(kose.g / VB_G) * 100}%`, height: `${(kose.h / yH) * 100}%`,
          display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: hiza,
          // Sağ köşe sola doğru taşabilir (12 Kasım 2026): kerahat geri sayımı ("34 dk 07 sn kaldı")
          // dar ekranda köşeye sığmıyor, kesilmesin — taşan kısım yan kubbenin üstündeki boş göğe düşer
          textAlign: i ? "right" : "left", overflow: i ? "visible" : "hidden",
          fontSize: `${Math.max(8.5, 8.2 * k)}px`, lineHeight: 1.12, color: t.textSecondary,
        }}>{icerik}</div>
      ))}

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
