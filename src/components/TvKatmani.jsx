/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — DİYANET TV KATMANI (tek oynatıcı: kartta ya da yüzen pencerede)
   src/components/TvKatmani.jsx

   14 Kasım 2026 — kullanıcı: "ekran içinde ekran ile sürekli oynatmaya devam edebiliriz".
   Oynatıcı (YouTube iframe'i) uygulama kökünde TEK KEZ çiziliyor ve hep body'de duruyor;
   yalnız biçimi değişiyor:
     • Ekstralar'da kart açıkken → kartın yerinin TAM ÜSTÜNE (position:absolute, belge
       koordinatında) oturur; sayfa kaydıkça doğal olarak birlikte kayar.
     • Başka ekranda (ya da kart kapalıyken) → köşede küçük YÜZEN PENCERE (position:fixed),
       üst şeridinden sürüklenebilir; yeri cihazda saklanır.
   iframe'in DOM'daki yeri hiç değişmediği için geçişte yayın YENİDEN YÜKLENMEZ (iframe başka
   bir öğeye taşınsaydı baştan yüklenir, iPhone'da da sesli otomatik oynatma engellenirdi).
   • Masaüstünde "ekran içinde ekran" (Document PiP) açılınca oynatıcı o pencereye geçer
     (orada bir kez yeniden yüklenir); pencere kapanınca uygulamaya döner.
   Yüzen pencere en az ~356×200 px: YouTube oynatıcısı 200×200'den küçük olmamalı.
   ═══════════════════════════════════════════════════════════════════════════ */

import { isValidElement, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useLocation, useNavigate } from "react-router-dom"
import { PictureInPicture2, GripHorizontal } from "lucide-react"
import { DonusSimgesi, DurdurSimgesi } from "./CerceveliSimge"
import { useApp } from "../AppContext"
import { useDiyanetTv, tvAdresi, pipDestekli } from "../data/diyanetTv"

const KONUM_ANAHTAR = "vukuf-diyanet-tv-konum"
const SERIT = 32           // yüzen pencerenin üst şeridi (sürükleme + düğmeler)
const PAY = 8

function konumOku() {
  try { const v = JSON.parse(localStorage.getItem(KONUM_ANAHTAR) || "null"); if (v && isFinite(v.fx) && isFinite(v.fy)) return v } catch { /* yoksay */ }
  return null
}

export default function TvKatmani() {
  const tv = useDiyanetTv()
  if (!tv || !tv.acik || typeof document === "undefined") return null
  return <TvPencere tv={tv} />
}

function TvPencere({ tv }) {
  const { theme } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const ac = theme.accent

  // ── KARTTAKİ YER (belge koordinatı) ─────────────────────────────────────────
  const [yer, setYer] = useState(null)
  useLayoutEffect(() => {
    const el = tv.yuva
    if (!el) { setYer(null); return }
    const olc = () => {
      if (!el.isConnected) { setYer(null); return }
      const r = el.getBoundingClientRect()
      const y = { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
      setYer(o => (o && Math.abs(o.x - y.x) < 0.5 && Math.abs(o.y - y.y) < 0.5 && Math.abs(o.w - y.w) < 0.5 && Math.abs(o.h - y.h) < 0.5 ? o : y))
    }
    olc()
    let ro = null
    try { ro = new ResizeObserver(olc); ro.observe(el); ro.observe(document.body) } catch { ro = null }
    window.addEventListener("resize", olc)
    const t = setInterval(olc, 700)          // üstteki kartlar açılıp kapanınca yer kayabilir
    return () => { try { ro && ro.disconnect() } catch { /* yoksay */ }; window.removeEventListener("resize", olc); clearInterval(t) }
  }, [tv.yuva])

  // ── YÜZEN PENCERE ölçüsü ve yeri ────────────────────────────────────────────
  const [, setEkran] = useState(0)
  useEffect(() => {
    const f = () => setEkran(n => n + 1)
    window.addEventListener("resize", f)
    return () => window.removeEventListener("resize", f)
  }, [])
  const vw = window.innerWidth, vh = window.innerHeight
  const genis = vw >= 700
  const w = Math.round(Math.min(vw - 2 * PAY, genis ? 400 : Math.max(356, Math.min(vw - 2 * PAY, 420))))
  const h = Math.round(w * 9 / 16)
  const [konum, setKonum] = useState(konumOku)
  const [canli, setCanli] = useState(null)
  const sinirla = (x, y) => ({
    x: Math.max(PAY, Math.min(vw - w - PAY, x)),
    y: Math.max(PAY, Math.min(vh - h - SERIT - PAY, y)),
  })
  const varsayilan = { x: vw - w - (genis ? 20 : PAY), y: vh - h - SERIT - (genis ? 24 : 96) }
  const nokta = sinirla(
    canli ? canli.x : konum ? konum.fx * vw : varsayilan.x,
    canli ? canli.y : konum ? konum.fy * vh : varsayilan.y,
  )
  const surukle = useRef(null)
  const bas = (e) => {
    if (e.target.closest("button")) return
    e.preventDefault()
    surukle.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: nokta.x, y0: nokta.y }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* yoksay */ }
  }
  const hareket = (e) => {
    const s = surukle.current
    if (!s || s.id !== e.pointerId) return
    setCanli({ x: s.x0 + e.clientX - s.sx, y: s.y0 + e.clientY - s.sy })
  }
  const birak = (e) => {
    const s = surukle.current
    if (!s || s.id !== e.pointerId) return
    surukle.current = null
    if (canli) {
      const n = sinirla(canli.x, canli.y)
      const k = { fx: n.x / vw, fy: n.y / vh }
      setKonum(k); setCanli(null)
      try { localStorage.setItem(KONUM_ANAHTAR, JSON.stringify(k)) } catch { /* yoksay */ }
    }
  }

  const iframe = (
    <iframe ref={tv.cerceveRef} key={tv.kaynak} src={tvAdresi(tv.kaynak)} title="Diyanet TV canlı yayın"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }} />
  )

  // ── EKRAN İÇİNDE EKRAN (masaüstü) — oynatıcı o pencerede ──────────────────
  if (tv.pip) {
    try {
      return createPortal(<div style={{ position: "fixed", inset: 0, background: "#000" }}>{iframe}</div>, tv.pip.document.body)
    } catch { /* pencere kapanmış */ }
  }

  const kartta = !!yer && yer.w > 0
  const yuzen = !kartta
  const ekstralarda = location.pathname === "/ekstralar"
  const dugme = (etiket, Ikon, tikla, vurgu) => (
    <button onClick={tikla} aria-label={etiket} title={etiket}
      style={{
        width: "26px", height: "26px", borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: vurgu ? `${ac}22` : "transparent", color: vurgu ? ac : theme.textSecondary,
      }}>
      {isValidElement(Ikon) ? Ikon : <Ikon size={15} />}
    </button>
  )

  return createPortal(
    <div data-diyanet-tv="" style={kartta ? {
      position: "absolute", left: yer.x, top: yer.y, width: yer.w, height: yer.h, zIndex: 40,
      borderRadius: "12px", overflow: "hidden", background: "#000",
    } : {
      position: "fixed", left: nokta.x, top: nokta.y, width: w, height: h + SERIT, zIndex: 120,
      borderRadius: "14px", overflow: "hidden", background: theme.surface,
      border: `1.5px dashed ${ac}`, boxSizing: "content-box",
      boxShadow: canli ? "0 14px 34px rgba(0,0,0,0.38)" : "0 8px 26px rgba(0,0,0,0.3)",
    }}>
      {/* Oynatıcı HEP ilk çocuk: kart ↔ yüzen geçişinde DOM'daki yeri değişmesin */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: yuzen ? SERIT : 0, background: "#000" }}>
        {iframe}
      </div>
      {yuzen && (
        <div onPointerDown={bas} onPointerMove={hareket} onPointerUp={birak} onPointerCancel={birak}
          style={{
            position: "absolute", left: 0, right: 0, top: 0, height: SERIT, boxSizing: "border-box",
            display: "flex", alignItems: "center", gap: "6px", padding: "0 6px 0 8px",
            background: `linear-gradient(90deg, ${ac}14, ${theme.surface} 55%)`,
            cursor: canli ? "grabbing" : "grab", touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
          }}>
          <GripHorizontal size={15} color={theme.textSecondary} style={{ flexShrink: 0 }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11.5px", fontWeight: 700, color: theme.text, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden" }}>
            Diyanet TV
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "9px", letterSpacing: "0.08em", color: "#d64545" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#d64545" }} /> CANLI
            </span>
          </span>
          <span style={{ flex: 1 }} />
          {/* Geri dön lâle çerçeveli, kapatma "tamamen durdur" (15 Kasım 2026 — components/CerceveliSimge.jsx) */}
          {!ekstralarda && dugme("Ekstralar'a git", <DonusSimgesi bolum="tv" ac={ac} boy={26} />, () => navigate("/ekstralar"))}
          {pipDestekli() && dugme("Ekran içinde ekran (pencere üstte kalır)", PictureInPicture2, () => tv.pipAc())}
          {dugme("Yayını durdur ve kapat", <DurdurSimgesi ac={ac} boy={26} />, () => tv.kapat())}
        </div>
      )}
    </div>,
    document.body,
  )
}
