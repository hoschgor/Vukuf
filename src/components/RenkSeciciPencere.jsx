/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — UYGULAMA İÇİ RENK SEÇİCİ (küçük pencere)
   src/components/RenkSeciciPencere.jsx

   12 Kasım 2026 — kullanıcı: "Web'de bu kısımda renk seçmek için açılan panel ekranın
   dışına gidebiliyor; çok uzağa almadan rahat seçebilecek gibi sınıra yakın durabilir."
   Tarayıcının kendi renk seçicisinin (<input type="color">) yeri bizim elimizde değil:
   masaüstü Chrome onu düğmenin yanına açıyor, düğme ekranın kenarındaki bir ayar
   kutusundaysa pencere ekrandan taşıyor. Bunun yerine kendi küçük penceremiz:
     • düğmenin hemen altına (sığmazsa üstüne) açılır, ekran kenarından en az 8 px
       içeride kalır — taşacaksa kenara yaslanır, düğmeden uzaklaşmaz;
     • doygunluk/parlaklık alanı + renk tonu şeridi + #rrggbb kutusu;
     • seçim pencerede canlı görünür, "Seç" ile uygulanır; dışarı dokunmak ya da Esc kapatır.
   body'ye taşınıyor (portal): ayar kutuları transform'lu olabiliyor, içindeki
   position:fixed ona göre konumlanırdı.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { guvenliAlan } from "../data/hooks/useEkranIcinde"

const PAY = 8
const ARA = 8

// ── renk dönüşümleri ─────────────────────────────────────────────────────────
function hexHsv(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim())
  if (!m) return { h: 0, s: 0.7, v: 0.75 }
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}
function hsvHex({ h, s, v }) {
  const f = (n) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return "#" + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("")
}
const sinirla = (x, a, b) => Math.max(a, Math.min(b, x))

// Sürükleme: işaretçi yakalanır, her harekette 0..1 oranlar bildirilir
function useSurukle(ref, bildir) {
  const bas = (e) => {
    const el = ref.current
    if (!el) return
    e.preventDefault()
    try { el.setPointerCapture(e.pointerId) } catch { /* yoksay */ }
    const hesap = (ev) => {
      const r = el.getBoundingClientRect()
      bildir(sinirla((ev.clientX - r.left) / r.width, 0, 1), sinirla((ev.clientY - r.top) / r.height, 0, 1))
    }
    hesap(e)
    const hareket = (ev) => hesap(ev)
    const bitti = () => {
      el.removeEventListener("pointermove", hareket)
      el.removeEventListener("pointerup", bitti)
      el.removeEventListener("pointercancel", bitti)
    }
    el.addEventListener("pointermove", hareket)
    el.addEventListener("pointerup", bitti)
    el.addEventListener("pointercancel", bitti)
  }
  return { onPointerDown: bas }
}

/**
 * @param acik      pencere açık mı
 * @param capa      açan düğmenin DOM öğesi (konum için)
 * @param deger     başlangıç rengi (#rrggbb)
 * @param onSec     (hex) — "Seç"e basılınca
 * @param onKapat   pencere kapanınca
 */
export default function RenkSeciciPencere({ acik, capa, deger, onSec, onKapat, theme, baslik = "Özel renk" }) {
  const [hsv, setHsv] = useState(() => hexHsv(deger))
  const [yazi, setYazi] = useState(() => hsvHex(hexHsv(deger)))
  const [yer, setYer] = useState(null)
  const kutuRef = useRef(null)
  const alanRef = useRef(null)
  const tonRef = useRef(null)

  // Her açılışta değerden başla
  useEffect(() => {
    if (!acik) return
    const h = hexHsv(deger)
    setHsv(h); setYazi(hsvHex(h))   // konum aşağıdaki yerleşim etkisinde (boyamadan önce) kurulur
  }, [acik]) // eslint-disable-line react-hooks/exhaustive-deps

  // Konum: düğmenin altı, sığmazsa üstü; yatayda düğmeyle hizalı, ekran içinde
  useLayoutEffect(() => {
    if (!acik) return
    const yerlestir = () => {
      const el = kutuRef.current
      if (!el || !capa) return
      const c = capa.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      const W = window.innerWidth, H = window.innerHeight, g = guvenliAlan()
      const ust = PAY + g.ust, alt = H - PAY - g.alt, sol = PAY + g.sol, sag = W - PAY - g.sag
      let top
      if (c.bottom + ARA + r.height <= alt) top = c.bottom + ARA
      else if (c.top - ARA - r.height >= ust) top = c.top - ARA - r.height
      else top = sinirla(c.top + c.height / 2 - r.height / 2, ust, Math.max(ust, alt - r.height))
      const left = sinirla(c.left + c.width / 2 - r.width / 2, sol, Math.max(sol, sag - r.width))
      setYer(o => (o && o.top === top && o.left === left ? o : { top, left }))
    }
    yerlestir()
    window.addEventListener("resize", yerlestir)
    window.addEventListener("scroll", yerlestir, true)
    return () => { window.removeEventListener("resize", yerlestir); window.removeEventListener("scroll", yerlestir, true) }
  }, [acik, capa])

  // Esc ile kapanma
  useEffect(() => {
    if (!acik) return
    // Yakalama evresinde + yayılım durduruluyor: Esc yalnız bu pencereyi kapatsın,
    // altındaki ayar kutusunu da kapatmasın
    const tus = (e) => { if (e.key === "Escape") { e.stopPropagation(); onKapat() } }
    window.addEventListener("keydown", tus, true)
    return () => window.removeEventListener("keydown", tus, true)
  }, [acik, onKapat])

  const guncelle = (y) => { setHsv(y); setYazi(hsvHex(y)) }
  const alanSur = useSurukle(alanRef, (x, y) => guncelle({ ...hsv, s: x, v: 1 - y }))
  const tonSur = useSurukle(tonRef, (x) => guncelle({ ...hsv, h: x * 359.9 }))

  if (!acik || typeof document === "undefined") return null
  const hex = hsvHex(hsv)
  const saf = hsvHex({ h: hsv.h, s: 1, v: 1 })
  const yaziGecerli = /^#[0-9a-f]{6}$/i.test(yazi)
  const yaziDegis = (v) => {
    let t = v.trim()
    if (t && t[0] !== "#") t = "#" + t
    setYazi(t)
    if (/^#[0-9a-f]{6}$/i.test(t)) setHsv(hexHsv(t))
  }
  const imlec = { position: "absolute", width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.35)", transform: "translate(-50%, -50%)", pointerEvents: "none" }

  return createPortal(
    <>
      {/* data-yuzen-pencere: açan kutunun "dışarı dokununca kapan" denetimi bunu dışarı saymaz */}
      <div data-yuzen-pencere="" onPointerDown={onKapat} style={{ position: "fixed", inset: 0, zIndex: 1399 }} />
      <div data-yuzen-pencere="" ref={kutuRef} role="dialog" aria-label={baslik}
        style={{
          position: "fixed", zIndex: 1400, top: yer ? yer.top : -9999, left: yer ? yer.left : -9999,
          visibility: yer ? "visible" : "hidden",
          width: "232px", boxSizing: "border-box", padding: "10px",
          background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`,
          borderRadius: "14px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)", fontFamily: "inherit",
          touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
        }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "0.3px" }}>{baslik}</div>
        {/* Doygunluk (yatay) · parlaklık (dikey) */}
        <div ref={alanRef} {...alanSur} style={{
          position: "relative", height: "120px", borderRadius: "9px", cursor: "crosshair",
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${saf})`,
        }}>
          <span style={{ ...imlec, left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }} />
        </div>
        {/* Renk tonu */}
        <div ref={tonRef} {...tonSur} style={{
          position: "relative", height: "14px", borderRadius: "999px", marginTop: "10px", cursor: "pointer",
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}>
          <span style={{ ...imlec, left: `${(hsv.h / 360) * 100}%`, top: "50%", background: saf }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
          <span aria-hidden="true" style={{ width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0, background: hex, boxShadow: `0 0 0 1px ${theme.border}` }} />
          <input value={yazi} onChange={(e) => yaziDegis(e.target.value)} aria-label="Renk kodu" spellCheck={false}
            maxLength={7}
            style={{
              flex: 1, minWidth: 0, padding: "5px 8px", borderRadius: "8px", fontFamily: "monospace", fontSize: "12.5px",
              border: `1px solid ${yaziGecerli ? theme.border : "#c0392b"}`, background: theme.background, color: theme.text,
              userSelect: "text", WebkitUserSelect: "text",
            }} />
          <button onClick={() => { onSec(hex); onKapat() }}
            style={{
              padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: "12.5px", fontWeight: 600, background: theme.accent, color: "#fff",
            }}>Seç</button>
        </div>
      </div>
    </>,
    document.body,
  )
}
