/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — EKSTRALAR ORTAK KART (açılır bölüm), düğme biçimi
   src/components/EkstraKart.jsx

   4 Kasım 2026: Ekstralar.jsx'ten ayrıldı — Namaz & Hatim takibi
   (components/NamazHatimTakibi.jsx) de aynı kartı kullanıyor.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useCallback, useState } from "react"
import { ChevronDown } from "lucide-react"
import CerceveliSimge from "./CerceveliSimge"
import { CICEK_DALI } from "../data/cicekDali"
import BolumSilueti from "./BolumSilueti"

// ── AÇILIR BÖLÜMLER ──────────────────────────────────────────────────────────
// Hangi kartın açık olduğu cihazda saklanır; başlangıçta yalnız Namaz Vakitleri açık.
export const BOLUM_ANAHTAR = "vukuf-ekstralar-bolumler"
const VARSAYILAN_ACIK = { namaz: true }
const bolumleriOku = () => { try { return JSON.parse(localStorage.getItem(BOLUM_ANAHTAR) || "{}") || {} } catch { return {} } }
export function useBolum(id) {
  const [acik, setAcik] = useState(() => { const m = bolumleriOku(); return id in m ? !!m[id] : !!VARSAYILAN_ACIK[id] })
  const degis = useCallback(() => {
    setAcik(a => {
      const y = !a
      try { const m = bolumleriOku(); m[id] = y; localStorage.setItem(BOLUM_ANAHTAR, JSON.stringify(m)) } catch { /* yoksay */ }
      return y
    })
  }, [id])
  return [acik, degis]
}

// ── ORTAK KART ───────────────────────────────────────────────────────────────
// `bolum` = [acik, degis] verilirse başlık dokunulabilir olur, içerik yalnız açıkken çizilir.
// `ozet`: kapalıyken başlığın altında görünen kısa bilgi (verilmezse `alt`).
/* KART GÖRÜNÜMÜ (23 Kasım 2026): solda tonlu pafta (rumi sırt + şemse içinde simge), kartta çift
   cetvel, sağ köşede çiçek dalı, halka içinde ok. Açık kartın başlığı vurgu renginde dolu; vurgu
   rengi açıksa (koyu temalar) başlık yazısı koyu olur. */
const acikMi = (hex) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex || "")
  if (!m) return false
  const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}
const rumiSerit = (renk) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='6' height='12' viewBox='0 0 6 12'><path d='M3 1.5 L5.5 6 L3 10.5 L0.5 6 Z' fill='${renk}'/></svg>`)}")`

// sus: açık başlığın sağındaki bölüm silüeti (components/BolumSilueti.jsx); verilmezse çiçek dalı
export function Kart({ theme, Ikon, baslik, alt, ozet, bolum, sus, children }) {
  const acilir = !!bolum
  const acik = acilir ? bolum[0] : true
  const altMetin = acik ? alt : (ozet ?? alt)
  const ac = theme.accent
  const dolu = acilir && acik                                   // başlık vurgu renginde
  const yaziRengi = dolu ? (acikMi(ac) ? theme.background : "#ffffff") : null
  const cizgi = dolu ? `${yaziRengi}55` : `${ac}38`
  const baslikIci = (
    <>
      {/* Pafta */}
      <span style={{
        position: "relative", width: "62px", flexShrink: 0, alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center",
        background: dolu ? "#00000024" : `${ac}12`, borderRight: `1px solid ${cizgi}`, color: dolu ? yaziRengi : ac,
        borderRadius: "10px 0 0 10px",
      }}>
        <span aria-hidden="true" style={{ position: "absolute", left: "5px", top: "8px", bottom: "8px", width: "6px", backgroundImage: rumiSerit(dolu ? yaziRengi : ac), backgroundRepeat: "repeat-y", opacity: dolu ? 0.7 : 0.45 }} />
        <span style={{ marginLeft: "6px", display: "flex" }}>
          <CerceveliSimge Ikon={Ikon} ac={dolu ? yaziRengi : ac} boy={38} />
        </span>
      </span>
      <span style={{ minWidth: 0, flex: 1, display: "block", padding: "11px 0 11px 12px", position: "relative", zIndex: 1 }}>
        <span style={{ display: "block", fontSize: "15.5px", fontWeight: 600, color: dolu ? yaziRengi : theme.text }}>{baslik}</span>
        {altMetin && (
          <span style={{
            display: "block", fontSize: "12px", marginTop: "1px",
            color: dolu ? `${yaziRengi}cc` : !acik && ozet ? ac : theme.textSecondary,
            whiteSpace: acik ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{altMetin}</span>
        )}
      </span>
      {acilir && (
        <span aria-hidden="true" style={{
          position: "relative", zIndex: 1, width: "26px", height: "26px", flexShrink: 0, borderRadius: "50%", margin: "0 64px 0 10px",
          border: `1px solid ${dolu ? `${yaziRengi}70` : `${ac}55`}`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ChevronDown size={15} color={dolu ? yaziRengi : ac} style={{ transition: "transform .2s ease", transform: acik ? "rotate(180deg)" : "none" }} />
        </span>
      )}
      {sus ? (
        <span aria-hidden="true" style={{ position: "absolute", right: "4px", bottom: "0", pointerEvents: "none" }}>
          <BolumSilueti ad={sus} renk={dolu ? yaziRengi : ac} yukseklik={50} enGenis={56} opaklik={dolu ? 0.24 : 0.16} />
        </span>
      ) : (<>
      {/* Çiçek dalı — sağ köşede, kartın içinde */}
        <span aria-hidden="true" style={{
          position: "absolute", right: "-14px", bottom: "-6px", width: "84px", height: "84px", pointerEvents: "none",
          background: dolu ? yaziRengi : ac, opacity: dolu ? 0.42 : 0.38,
          WebkitMaskImage: `url(${CICEK_DALI})`, maskImage: `url(${CICEK_DALI})`,
          WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        }} />
      </>)}
    </>
  )
  /* KAPALI KART (24 Kasım 2026): yan menü satırı gibi sade — çerçevesiz, düz simge, başlık ve
     kısa özet, sade ok. Süslü görünüm (pafta, şemse, çiçek dalı) yalnız açık kartta. */
  if (acilir && !acik) {
    return (
      <section style={{ margin: "0 0 2px" }}>
        <h2 style={{ margin: 0, fontSize: "inherit", fontWeight: "inherit" }}>
          <button onClick={bolum[1]} aria-expanded={false} className="vk-kart-satir"
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "16px", padding: "9px 10px", margin: 0,
              background: "none", border: "none", borderRadius: "10px", cursor: "pointer", textAlign: "left",
              fontFamily: "inherit", color: theme.text, "--vk-satir-zemin": `${theme.text}0d`,
            }}>
            <Ikon size={22} strokeWidth={1.8} color={theme.text} style={{ flexShrink: 0 }} />
            <span style={{ minWidth: 0, flex: 1, display: "block" }}>
              <span style={{ display: "block", fontSize: "15px", fontWeight: 500, color: theme.text }}>{baslik}</span>
              {altMetin && (
                <span style={{ display: "block", fontSize: "11.5px", color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "1px" }}>{altMetin}</span>
              )}
            </span>
            <ChevronDown size={18} color={theme.textSecondary} aria-hidden="true" style={{ flexShrink: 0 }} />
          </button>
        </h2>
        <style>{`.vk-kart-satir:hover, .vk-kart-satir:focus-visible { background: var(--vk-satir-zemin) !important; outline: none }`}</style>
      </section>
    )
  }

  const baslikStil = {
    position: "relative", overflow: "hidden", width: "100%", display: "flex", alignItems: "center", padding: 0, margin: 0,
    minHeight: "62px", borderRadius: "11px", textAlign: "left", fontFamily: "inherit", color: "inherit",
    background: dolu ? `linear-gradient(90deg, ${ac}, ${ac}e6)` : "transparent", border: "none",
  }
  return (
    <section style={{
      background: theme.surface, border: `1px solid ${dolu ? ac : theme.border}`, borderRadius: "14px",
      padding: "3px", margin: acilir ? "8px 0 12px" : "0 0 14px",
      boxShadow: `inset 0 0 0 1px ${theme.surface}, inset 0 0 0 2px ${ac}2e, 0 2px 10px rgba(0,0,0,0.06)`,
    }}>
      {acilir ? (
        <h2 style={{ margin: 0, fontSize: "inherit", fontWeight: "inherit" }}>
          <button onClick={bolum[1]} aria-expanded={acik} style={{ ...baslikStil, cursor: "pointer" }}>
            {baslikIci}
          </button>
        </h2>
      ) : (
        <div style={baslikStil}>{baslikIci}</div>
      )}
      {acik && <div style={{ padding: "12px 11px 11px" }}>{children}</div>}
    </section>
  )
}
export const dugmeStil = (theme, birincil) => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px",
  padding: "9px 14px", borderRadius: "10px", fontFamily: "inherit", fontSize: "13px", fontWeight: 600,
  cursor: "pointer", textDecoration: "none",
  border: `1px solid ${birincil ? theme.accent : theme.border}`,
  background: birincil ? theme.accent : "transparent", color: birincil ? "#fff" : theme.text,
})

