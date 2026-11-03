/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KÜÇÜK RADYO HAPI (Ekstralar'dan açılan radyo için)
   src/components/MiniRadyo.jsx

   3 Kasım 2026 — kullanıcı: "Radyolardan biri açık olduğunda devamlı oynatılabilsin;
   devamlı oynatma efektinin benzer versiyonu, fakat görseli buraya özel olsun,
   Ekstralar kısmından geldiği belli olsun."

   Kur'ân'ın küçük oynatıcısıyla (MiniOynatici) aynı davranış — sürüklenebilir,
   10 sn dokunulmazsa yuvarlak düğmeye iner — ama görünüşü ayrı: yayın kulesi ve
   dalgalar (çalarken dalgalar nabız gibi atar), "EKSTRALAR · CANLI" etiketi, kırmızı
   canlı noktası. Ekstralar sayfasındayken görünmez (orada tam liste var).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Play, Pause, Compass, ChevronDown, X } from "lucide-react"
import { useApp } from "../AppContext"
import { useRadyo } from "../data/radyo"
import { useHapKonumu } from "./DonusDugmesi"

const KUCUK_ANAHTAR = "vukuf-mini-radyo-kucuk"
const CSS = `@keyframes vk-radyo-dalga{0%,100%{opacity:.25}50%{opacity:1}}
.vk-radyo-d1{animation:vk-radyo-dalga 1.4s ease-in-out infinite}
.vk-radyo-d2{animation:vk-radyo-dalga 1.4s ease-in-out .25s infinite}
.vk-radyo-d3{animation:vk-radyo-dalga 1.4s ease-in-out .5s infinite}
@keyframes vk-radyo-canli{0%,100%{opacity:1}50%{opacity:.35}}
.vk-radyo-canli{animation:vk-radyo-canli 1.6s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.vk-radyo-d1,.vk-radyo-d2,.vk-radyo-d3,.vk-radyo-canli{animation:none}}`

/* Yayın kulesi + iki yanda dalgalar */
export function RadyoAmblemi({ ac, zemin, calar, boy = 34 }) {
  const d = (s) => (calar ? s : undefined)
  return (
    <svg width={boy} height={boy} viewBox="-20 -20 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle r="19" fill={zemin} stroke={ac} strokeWidth="1.2" />
      <circle r="15.5" fill={`${ac}14`} stroke={ac} strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="1.5 2" />
      {/* kule */}
      <path d="M0 -4 L-5 11 M0 -4 L5 11 M-3.3 6 H3.3 M-2 2 H2" stroke={ac} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="0" cy="-5.5" r="2.2" fill={ac} />
      {/* dalgalar */}
      {[[6, "vk-radyo-d1"], [9.5, "vk-radyo-d2"], [13, "vk-radyo-d3"]].map(([r, cls]) => (
        <g key={r} className={d(cls)} style={{ opacity: calar ? undefined : 0.45 }}>
          <path d={`M${-r * 0.75} ${-5.5 - r * 0.66} A${r} ${r} 0 0 0 ${-r * 0.75} ${-5.5 + r * 0.66}`} fill="none" stroke={ac} strokeWidth="1.3" strokeLinecap="round" />
          <path d={`M${r * 0.75} ${-5.5 - r * 0.66} A${r} ${r} 0 0 1 ${r * 0.75} ${-5.5 + r * 0.66}`} fill="none" stroke={ac} strokeWidth="1.3" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  )
}

export default function MiniRadyo() {
  const radyo = useRadyo()
  const location = useLocation()
  if (!radyo || !radyo.istasyon || location.pathname === "/ekstralar") return null
  return <RadyoHapi radyo={radyo} kitapta={location.pathname.startsWith("/kitap/")} />
}

function RadyoHapi({ radyo, kitapta }) {
  const { theme } = useApp()
  const navigate = useNavigate()
  const ac = theme.accent
  const canliRenk = "#d64545"
  const [kucuk, setKucukDurum] = useState(() => {
    try { return localStorage.getItem(KUCUK_ANAHTAR) === "1" } catch { return false }
  })
  const setKucuk = (v) => {
    setKucukDurum(v)
    try { localStorage.setItem(KUCUK_ANAHTAR, v ? "1" : "0") } catch { /* yoksay */ }
  }
  const [dokunus, setDokunus] = useState(0)
  useEffect(() => {
    if (kucuk) return
    const t = setTimeout(() => setKucuk(true), 10000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kucuk, dokunus])

  const k = useHapKonumu({ ad: "radyo", yan: "orta", altta: true, altPay: kitapta ? 64 : 0, ek: kitapta ? 50 : 0, kaydirGecir: true })
  const { istasyon, durum } = radyo
  const calar = durum === "caliyor"
  const alt = durum === "hata" ? "Yayın açılamadı"
    : durum === "yukleniyor" ? "Bağlanıyor…"
    : calar ? null : "Duraklatıldı"
  const yuvarlak = (vurgu) => ({
    width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    border: "none", background: vurgu ? ac : "transparent", color: vurgu ? "#fff" : theme.textSecondary,
  })

  return (
    <>
      <style>{CSS}</style>
      <div ref={k.ref} className="vukuf-hap" {...k.olaylar}
        onPointerDownCapture={() => { if (!kucuk) setDokunus(n => n + 1) }}
        style={{ ...k.stil, zIndex: k.surukleniyor ? 130 : 125 }}>
        {kucuk ? (
          <button onClick={() => setKucuk(false)} aria-label={`Radyoyu aç — ${istasyon.ad}`} title={`${istasyon.ad} · aç`}
            style={{
              position: "relative", width: "46px", height: "46px", borderRadius: "50%", padding: 0, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: theme.surface, border: `1.5px dashed ${ac}`,
              boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.22)",
            }}>
            <RadyoAmblemi ac={ac} zemin={theme.surface} calar={calar} boy={38} />
            {calar && <span className="vk-radyo-canli" aria-hidden="true" style={{ position: "absolute", top: "3px", right: "3px", width: "9px", height: "9px", borderRadius: "50%", background: canliRenk, border: `1.5px solid ${theme.surface}` }} />}
          </button>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: "4px", padding: "4px 4px 4px 5px",
            maxWidth: "min(360px, calc(100vw - 20px))",
            background: `linear-gradient(90deg, ${ac}12, ${theme.surface} 45%)`, backgroundColor: theme.surface,
            border: `1.5px dashed ${ac}`, borderRadius: "24px",
            boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.22)",
          }}>
            <RadyoAmblemi ac={ac} zemin={theme.surface} calar={calar} boy={36} />
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, padding: "0 6px 0 4px", lineHeight: 1.15 }}>
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{istasyon.kisa}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "9.5px", letterSpacing: "0.08em", fontWeight: 700, color: theme.textSecondary, whiteSpace: "nowrap" }}>
                EKSTRALAR
                {alt
                  ? <span style={{ letterSpacing: 0, fontWeight: 500, fontSize: "10.5px", color: durum === "hata" ? canliRenk : theme.textSecondary }}>· {alt}</span>
                  : <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: canliRenk }}>
                      · <span className="vk-radyo-canli" style={{ width: "6px", height: "6px", borderRadius: "50%", background: canliRenk }} /> CANLI
                    </span>}
              </span>
            </span>
            <button onClick={() => (calar || durum === "yukleniyor" ? radyo.duraklat() : radyo.devam())}
              aria-label={calar ? "Duraklat" : "Dinle"} title={calar ? "Duraklat" : "Dinle"} style={yuvarlak(true)}>
              {calar || durum === "yukleniyor" ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: "2px" }} />}
            </button>
            <button onClick={() => navigate("/ekstralar")} aria-label="Ekstralar'a git" title="Ekstralar'a git"
              style={{ ...yuvarlak(false), color: ac, background: `${ac}14` }}>
              <Compass size={15} />
            </button>
            <button onClick={() => setKucuk(true)} aria-label="Küçült" title="Küçült" style={yuvarlak(false)}>
              <ChevronDown size={16} />
            </button>
            <button onClick={() => radyo.kapat()} aria-label="Radyoyu kapat" title="Radyoyu kapat" style={yuvarlak(false)}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
