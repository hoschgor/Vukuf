/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — EKSTRALAR SES DÜĞMESİ (radyo + Kur'an Dinle)
   src/components/EkstraSesDugmesi.jsx

   13 Kasım 2026 — kullanıcı: "Ekstralar bölümünde çalan kısımlar için de ses butonu
   gerekiyor." Yuvarlak düğme (çağıranın düğme biçimiyle); dokununca hemen yanında küçük
   bir ses kutusu açılır: susturma düğmesi + kaydırıcı + yüzde. Düzey radyo ve Kur'an
   Dinle'de ortak (data/ekstraSes.js). Ses düzeyinin yazılamadığı cihazlarda (iPhone)
   kutuda yalnız susturma var; düzey cihazın ses tuşlarıyla ayarlanır.

   Kutu body'ye taşınıyor (portal): hap ve kartlar transform'lu/taşmasız olabiliyor.
   Düğmenin altına (sığmazsa üstüne) açılır, ekran kenarından en az 8 px içeride kalır.
   Dışarı dokununca ya da Esc ile kapanır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Volume1, Volume2, VolumeX } from "lucide-react"
import { useEkstraSes, ekstraSesAyarla, ekstraSesSustur, sesDuzeyiYazilabilir } from "../data/ekstraSes"

const PAY = 8
const ARA = 8

export default function EkstraSesDugmesi({ theme, stil, boy = 15 }) {
  const ses = useEkstraSes()
  const [acik, setAcik] = useState(false)
  const [yer, setYer] = useState(null)
  const dugmeRef = useRef(null)
  const kutuRef = useRef(null)
  const yazilabilir = sesDuzeyiYazilabilir()
  const Ikon = ses === 0 ? VolumeX : ses < 0.5 ? Volume1 : Volume2
  const ac = theme.accent

  useLayoutEffect(() => {
    if (!acik) { setYer(null); return }
    const yerlestir = () => {
      const d = dugmeRef.current, k = kutuRef.current
      if (!d || !k) return
      const c = d.getBoundingClientRect(), r = k.getBoundingClientRect()
      const W = window.innerWidth, H = window.innerHeight
      let top = c.bottom + ARA
      if (top + r.height > H - PAY) top = Math.max(PAY, c.top - ARA - r.height)
      const left = Math.min(Math.max(PAY, c.left + c.width / 2 - r.width / 2), Math.max(PAY, W - PAY - r.width))
      setYer(o => (o && o.top === top && o.left === left ? o : { top, left }))
    }
    yerlestir()
    window.addEventListener("resize", yerlestir)
    window.addEventListener("scroll", yerlestir, true)
    return () => { window.removeEventListener("resize", yerlestir); window.removeEventListener("scroll", yerlestir, true) }
  }, [acik])

  useEffect(() => {
    if (!acik) return
    const tus = (e) => { if (e.key === "Escape") { e.stopPropagation(); setAcik(false) } }
    const disari = (e) => {
      if (kutuRef.current?.contains(e.target) || dugmeRef.current?.contains(e.target)) return
      setAcik(false)
    }
    window.addEventListener("keydown", tus, true)
    document.addEventListener("pointerdown", disari, true)
    return () => { window.removeEventListener("keydown", tus, true); document.removeEventListener("pointerdown", disari, true) }
  }, [acik])

  return (
    <>
      <button ref={dugmeRef} onClick={() => setAcik(v => !v)} aria-expanded={acik}
        aria-label={ses === 0 ? "Ses (kısık)" : "Ses"} title={ses === 0 ? "Ses kısık" : "Ses"}
        style={{ ...stil, color: ses === 0 ? "#c0392b" : acik ? ac : stil?.color }}>
        <Ikon size={boy} />
      </button>
      {acik && typeof document !== "undefined" && createPortal(
        <div ref={kutuRef} data-yuzen-pencere="" role="group" aria-label="Ses düzeyi"
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed", zIndex: 1400, top: yer ? yer.top : -9999, left: yer ? yer.left : -9999,
            visibility: yer ? "visible" : "hidden",
            width: yazilabilir ? "min(260px, calc(100vw - 16px))" : "min(240px, calc(100vw - 16px))", boxSizing: "border-box",
            display: "flex", flexDirection: "column", gap: "6px", padding: "8px 12px 8px 8px", borderRadius: "16px",
            background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`,
            boxShadow: "0 10px 28px rgba(0,0,0,0.25)", fontFamily: "inherit",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => ekstraSesSustur()} aria-label={ses === 0 ? "Sesi aç" : "Sessize al"} title={ses === 0 ? "Sesi aç" : "Sessize al"}
              style={{
                width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, padding: 0, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", border: "none",
                background: ses === 0 ? "#c0392b" : `${ac}18`, color: ses === 0 ? "#fff" : ac,
              }}>
              <Ikon size={16} />
            </button>
            {yazilabilir ? (
              <>
                <input type="range" min={0} max={1} step={0.01} value={ses} aria-label="Ses düzeyi"
                  onChange={(e) => ekstraSesAyarla(parseFloat(e.target.value))}
                  style={{ flex: 1, minWidth: 0, accentColor: ac, cursor: "pointer" }} />
                <span style={{ fontSize: "12px", fontWeight: 600, minWidth: "36px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  %{Math.round(ses * 100)}
                </span>
              </>
            ) : (
              <span style={{ flex: 1, fontSize: "12px", fontWeight: 600 }}>{ses === 0 ? "Ses kısık" : "Ses açık"}</span>
            )}
          </div>
          <div style={{ fontSize: "10.5px", color: theme.textSecondary, lineHeight: 1.35, padding: "0 2px 0 4px" }}>
            {yazilabilir
              ? "Radyo ve Kur'an Dinle için ortak; Kur'ân oynatıcısının sesinden ayrıdır."
              : "Bu cihazda ses düzeyi cihazın ses tuşlarıyla ayarlanır; buradan ses tamamen kısılıp açılabilir."}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
