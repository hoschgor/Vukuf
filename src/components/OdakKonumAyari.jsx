/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — ÂYETİN KARŞILANACAĞI YER (sürüklemeli önizleme)
   src/components/OdakKonumAyari.jsx

   4 Kasım 2026 — kullanıcı: "perdeye dokunmadan karşıladığı konumu varsayılan olarak biraz
   daha aşağı alalım ve bunu ayetin karşılanacağı konum ayarı olarak kullanıcıya
   bırakabilelim; sürüklemeli ön gösterimli bir panel ile ayarlanabilir."
   Küçük bir telefon önizlemesi: üstte perde (durum çubuğu bölgesi), altta oynatıcı,
   arada satırlar. Vurgulu "âyet" şeridi parmakla yukarı/aşağı çekilir (ya da alttaki
   kaydırıcıyla); bırakılan yer gözlük takibinin ve odak penceresinin okunan âyeti
   getireceği çizgidir (data/odak.js → konumAyarla). Çizgi âyetin BAŞIDIR (uzun âyet sığmazsa yukarı alınır); eksi değerde (en çok −%20) âyetin başı ekranın üst kenarının da üstünde kalır.
   createPortal ile body'ye çizilir (oynatıcının saydamlık bulanıklığı fixed konumu
   bozmasın).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X, RotateCcw, Check } from "lucide-react"
import { useOdak, konumAyarla, KONUM_VARSAYILAN, KONUM_SINIR } from "../data/odak"

export default function OdakKonumAyari({ acik, kapat, theme }) {
  const { konum } = useOdak()
  const [deger, setDeger] = useState(konum)
  const kutuRef = useRef(null)
  const surukRef = useRef(false)
  useEffect(() => { if (acik) setDeger(konum) }, [acik]) // eslint-disable-line
  useEffect(() => {
    if (!acik) return
    const t = (e) => { if (e.key === "Escape") kapat() }
    window.addEventListener("keydown", t)
    return () => window.removeEventListener("keydown", t)
  }, [acik, kapat])
  if (!acik) return null
  const ac = theme.accent
  const sinirla = (v) => Math.max(KONUM_SINIR[0], Math.min(KONUM_SINIR[1], v))
  const noktadan = (e) => {
    const r = kutuRef.current.getBoundingClientRect()
    setDeger(sinirla(Math.round(((e.clientY - r.top - EK) / Y) * 100) / 100))
  }
  const kaydet = () => { konumAyarla(deger); kapat() }
  const G = 150, Y = 300                       // önizleme boyu (px)
  const EK = Math.round(-KONUM_SINIR[0] * Y) + 6   // telefonun üstünde eksi değerler için pay
  const satirlar = Array.from({ length: 16 }, (_, i) => i)
  return createPortal(
    <div onClick={kapat} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div role="dialog" aria-modal="true" aria-label="Âyetin karşılanacağı yer" onClick={e => e.stopPropagation()}
        style={{ width: "min(360px, 100%)", background: theme.surface, color: theme.text, borderRadius: "18px", boxShadow: "0 18px 50px rgba(0,0,0,0.3)", padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ flex: 1, fontSize: "15px", fontWeight: 700 }}>Âyetin karşılanacağı yer</span>
          <button onClick={kapat} aria-label="Kapat" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: "12px", color: theme.textSecondary, lineHeight: 1.5, marginBottom: "12px" }}>
          Okunan âyetin <strong>başı</strong> bu çizgiye gelir; şerit yukarı ya da aşağı çekilerek seçilebilir. Ekrana sığmayan uzun âyet, tamamı görünecek kadar yukarı alınır.
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "center" }}>
          {/* Telefon önizlemesi — üstünde ekran DIŞI bir pay var (eksi değerler görünsün) */}
          <div ref={kutuRef}
            onPointerDown={e => { surukRef.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); noktadan(e) }}
            onPointerMove={e => { if (surukRef.current) noktadan(e) }}
            onPointerUp={() => { surukRef.current = false }}
            onPointerCancel={() => { surukRef.current = false }}
            style={{ position: "relative", width: `${G}px`, height: `${Y + EK}px`, flexShrink: 0, touchAction: "none", cursor: "ns-resize", userSelect: "none" }}>
            {/* ekranın üstü (eksi bölge) */}
            <div style={{ position: "absolute", left: "10px", right: "10px", top: 0, height: `${EK - 6}px`, borderRadius: "10px 10px 0 0", border: `1px dashed ${theme.textSecondary}55`, borderBottom: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8.5px", color: theme.textSecondary, letterSpacing: "0.04em" }}>ekranın üstü</div>
            <div style={{
              position: "absolute", left: 0, top: `${EK}px`, width: `${G}px`, height: `${Y}px`, borderRadius: "22px", overflow: "hidden", boxSizing: "border-box",
              border: `3px solid ${theme.text}33`, background: theme.background,
            }}>
              {/* satırlar */}
              {satirlar.map(i => (
                <div key={i} style={{ position: "absolute", left: "14px", right: i % 4 === 3 ? "44px" : "14px", top: `${8 + i * 5.6}%`, height: "5px", borderRadius: "3px", background: theme.textSecondary, opacity: 0.22 }} />
              ))}
              {/* perde */}
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "11%", background: `linear-gradient(${theme.text}38, ${theme.text}00)` }} />
              <div style={{ position: "absolute", left: "50%", top: "4px", transform: "translateX(-50%)", fontSize: "8px", color: theme.textSecondary, letterSpacing: "0.06em" }}>PERDE</div>
              {/* oynatıcı */}
              <div style={{ position: "absolute", left: "8px", right: "8px", bottom: "8px", height: "9%", borderRadius: "8px", background: `${ac}2a`, border: `1px solid ${ac}55` }} />
            </div>
            {/* karşılama çizgisi (şeridin arkasında) + şerit — telefonun dışına taşabilir */}
            <div style={{ position: "absolute", left: "-4px", right: "-4px", top: `${EK + deger * Y}px`, height: 0, borderTop: `1px dashed ${ac}` }} />
            <div style={{
              position: "absolute", left: "6px", right: "6px", top: `${EK + deger * Y}px`, height: "44px",
              borderRadius: "8px", background: `linear-gradient(${ac}24, ${ac}24), ${theme.background}`, boxShadow: `inset 3px 0 0 ${ac}`, border: `1px solid ${ac}88`,
              display: "flex", alignItems: "center", justifyContent: "center", transition: surukRef.current ? "none" : "top .2s ease",
            }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: ac, textAlign: "center", lineHeight: 1.25 }}>okunan âyet<br /><span style={{ fontWeight: 500 }}>başı çizgide</span></span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "26px", fontWeight: 700, color: ac, fontVariantNumeric: "tabular-nums" }}>{deger < 0 ? "−" : ""}%{Math.abs(Math.round(deger * 100))}</span>
            <span style={{ fontSize: "11px", color: theme.textSecondary, textAlign: "center", lineHeight: 1.35 }}>âyetin başı<br />ekranın<br />üstünden</span>
          </div>
        </div>
        <input type="range" min={KONUM_SINIR[0]} max={KONUM_SINIR[1]} step={0.01} value={deger} aria-label="Karşılama yüksekliği"
          onChange={e => setDeger(parseFloat(e.target.value))} style={{ width: "100%", accentColor: ac, marginTop: "12px" }} />
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button onClick={() => setDeger(KONUM_VARSAYILAN)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "9px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.text, fontFamily: "inherit", fontSize: "13px", cursor: "pointer" }}>
            <RotateCcw size={14} /> Varsayılan (%{Math.round(KONUM_VARSAYILAN * 100)})
          </button>
          <button onClick={kaydet} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "9px", borderRadius: "10px", border: "none", background: ac, color: "#fff", fontFamily: "inherit", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            <Check size={15} /> Tamam
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
