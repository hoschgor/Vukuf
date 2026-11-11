/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KÜÇÜK "KUR'AN DİNLE" HAPI (Ekstralar → Kur'an Dinle)
   src/components/MiniKuranDinle.jsx

   11 Kasım 2026. Radyo hapıyla (MiniRadyo) aynı davranış — sürüklenebilir, 10 sn
   dokunulmazsa yuvarlak düğmeye iner, Ekstralar sayfasında görünmez — ama amblemi
   rahle üstünde açık mushaf; çalarken iki yanda ses dalgaları atar. Etikette
   "EKSTRALAR · 5. Cüz" gibi çalan parça yazar. Radyo açıkken gizlenir (ikisi aynı
   anda çalmaz; radyo başlayınca Kur'an Dinle duraklar, kaldığı yer saklanır).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Play, Pause, Compass, ChevronDown, X, SkipForward, Loader2 } from "lucide-react"
import { useApp } from "../AppContext"
import { useKuranDinle, kuranDinleZamanlayici, kariBul, parcaAdi } from "../data/kuranDinle"
import { useRadyo } from "../data/radyo"
import { useZamanlayici } from "../data/otomatikDurdurma"
import { UykuRozeti } from "./OtomatikDurdurmaSecici"
import { useHapKonumu } from "./DonusDugmesi"
import { useEkstraDuzen } from "../data/ekstraDuzen"

const KUCUK_ANAHTAR = "vukuf-mini-kuran-dinle-kucuk"
// Ekstralar → Kur'an Dinle kartındaki çalar da aynı amblemi/canlandırmayı kullanıyor
export const DINLE_HAP_CSS = `@keyframes vk-kd-dalga{0%,100%{opacity:.2}50%{opacity:1}}
.vk-kd-d1{animation:vk-kd-dalga 1.6s ease-in-out infinite}
.vk-kd-d2{animation:vk-kd-dalga 1.6s ease-in-out .3s infinite}
@keyframes vk-kd-don{to{transform:rotate(360deg)}}.vk-kd-don{animation:vk-kd-don 1s linear infinite}
@media (prefers-reduced-motion: reduce){.vk-kd-d1,.vk-kd-d2{animation:none}}`

/* Rahle üstünde açık mushaf + iki yanda ses dalgaları */
export function DinleAmblemi({ ac, zemin, calar, boy = 34 }) {
  const d = (s) => (calar ? s : undefined)
  return (
    <svg width={boy} height={boy} viewBox="-20 -20 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle r="19" fill={zemin} stroke={ac} strokeWidth="1.2" />
      <circle r="15.5" fill={`${ac}14`} stroke={ac} strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="1.5 2" />
      {/* açık mushaf */}
      <path d="M0 -3.5 C-3 -6 -6.5 -6.5 -9 -5.5 L-9 3.5 C-6.5 2.6 -3 3 0 5.2 Z" fill={`${ac}26`} stroke={ac} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M0 -3.5 C3 -6 6.5 -6.5 9 -5.5 L9 3.5 C6.5 2.6 3 3 0 5.2 Z" fill={`${ac}26`} stroke={ac} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M-6.8 -2.6 C-5 -3 -3.2 -2.6 -2 -1.6 M-6.8 0 C-5 -0.4 -3.2 0 -2 1 M6.8 -2.6 C5 -3 3.2 -2.6 2 -1.6 M6.8 0 C5 -0.4 3.2 0 2 1"
        fill="none" stroke={ac} strokeOpacity="0.55" strokeWidth="0.8" strokeLinecap="round" />
      {/* rahle ayakları (çapraz) */}
      <path d="M-6.5 5.5 L5 12.5 M6.5 5.5 L-5 12.5" stroke={ac} strokeWidth="1.5" strokeLinecap="round" />
      {/* ses dalgaları */}
      {[[11.5, "vk-kd-d1"], [14.2, "vk-kd-d2"]].map(([x, cls]) => (
        <g key={x} className={d(cls)} style={{ opacity: calar ? undefined : 0.4 }}>
          <path d={`M${-x} -4 Q${-x - 1.8} -0.5 ${-x} 3`} fill="none" stroke={ac} strokeWidth="1.2" strokeLinecap="round" />
          <path d={`M${x} -4 Q${x + 1.8} -0.5 ${x} 3`} fill="none" stroke={ac} strokeWidth="1.2" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  )
}

export default function MiniKuranDinle() {
  const dinle = useKuranDinle()
  const radyo = useRadyo()
  const location = useLocation()
  // Ekstralar'da kart varken hap gizli; kart gizlendiyse hap orada da görünür
  const duzen = useEkstraDuzen()
  if (!dinle || !dinle.calan || (location.pathname === "/ekstralar" && !duzen.gizli.includes("dinle")) || (radyo && radyo.istasyon)) return null
  return <DinleHapi dinle={dinle} kitapta={location.pathname.startsWith("/kitap/")} />
}

function DinleHapi({ dinle, kitapta }) {
  const { theme } = useApp()
  const navigate = useNavigate()
  const ac = theme.accent
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

  const k = useHapKonumu({ ad: "kuran-dinle", yan: "orta", altta: true, altPay: kitapta ? 64 : 0, ek: kitapta ? 50 : 0, kaydirGecir: true })
  const { calan, durum } = dinle
  const uyku = useZamanlayici(kuranDinleZamanlayici)
  const kari = kariBul(calan.kariId)
  const calar = durum === "caliyor"
  const yukleniyor = durum === "yukleniyor"
  const parca = parcaAdi(calan.tur, calan.parca, calan.ayet)
  const alt = durum === "hata" ? "Açılamadı" : yukleniyor ? "Yükleniyor…" : durum === "bitti" ? "Bitti" : calar ? parca : `Duraklatıldı · ${parca}`
  const yuvarlak = (vurgu) => ({
    width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    border: "none", background: vurgu ? ac : "transparent", color: vurgu ? "#fff" : theme.textSecondary,
  })

  return (
    <>
      <style>{DINLE_HAP_CSS}</style>
      <div ref={k.ref} className="vukuf-hap" {...k.olaylar}
        onPointerDownCapture={() => { if (!kucuk) setDokunus(n => n + 1) }}
        style={{ ...k.stil, zIndex: k.surukleniyor ? 130 : 125 }}>
        {kucuk ? (
          <button onClick={() => setKucuk(false)} aria-label={`Kur'an Dinle'yi aç — ${kari?.ad || ""}`} title={`${kari?.ad || "Kur'an Dinle"} · aç`}
            style={{
              position: "relative", width: "46px", height: "46px", borderRadius: "50%", padding: 0, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: theme.surface, border: `1.5px dashed ${ac}`,
              boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.22)",
            }}>
            <DinleAmblemi ac={ac} zemin={theme.surface} calar={calar} boy={38} />
          </button>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: "4px", padding: "4px 4px 4px 5px",
            maxWidth: "min(380px, calc(100vw - 20px))",
            background: `linear-gradient(90deg, ${ac}12, ${theme.surface} 45%)`, backgroundColor: theme.surface,
            border: `1.5px dashed ${ac}`, borderRadius: "24px",
            boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.22)",
          }}>
            <DinleAmblemi ac={ac} zemin={theme.surface} calar={calar} boy={36} />
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, padding: "0 6px 0 4px", lineHeight: 1.15 }}>
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kari?.ad}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "9.5px", letterSpacing: "0.08em", fontWeight: 700, color: theme.textSecondary, whiteSpace: "nowrap", minWidth: 0 }}>
                EKSTRALAR
                <span style={{ letterSpacing: 0, fontWeight: 500, fontSize: "10.5px", color: durum === "hata" ? "#c0392b" : calar ? ac : theme.textSecondary, overflow: "hidden", textOverflow: "ellipsis" }}>· {alt}</span>
                {uyku.bitis && <span style={{ fontSize: "10px" }}>· <UykuRozeti theme={theme} bitis={uyku.bitis} /></span>}
              </span>
            </span>
            <button onClick={() => (calar || yukleniyor ? dinle.duraklat() : dinle.devam())}
              aria-label={calar ? "Duraklat" : "Dinle"} title={calar ? "Duraklat" : "Dinle"} style={yuvarlak(true)}>
              {yukleniyor ? <Loader2 size={15} className="vk-kd-don" /> : calar ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: "2px" }} />}
            </button>
            <button onClick={() => dinle.atla(1)} aria-label="Sonraki" title="Sonraki" style={yuvarlak(false)}>
              <SkipForward size={15} />
            </button>
            <button onClick={() => navigate("/ekstralar")} aria-label="Ekstralar'a git" title="Ekstralar'a git"
              style={{ ...yuvarlak(false), color: ac, background: `${ac}14` }}>
              <Compass size={15} />
            </button>
            <button onClick={() => setKucuk(true)} aria-label="Küçült" title="Küçült" style={yuvarlak(false)}>
              <ChevronDown size={16} />
            </button>
            <button onClick={() => dinle.kapat()} aria-label="Kur'an Dinle'yi kapat" title="Kapat" style={yuvarlak(false)}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
