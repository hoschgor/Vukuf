/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — EKSTRALAR ORTAK KART (açılır bölüm), düğme biçimi
   src/components/EkstraKart.jsx

   4 Kasım 2026: Ekstralar.jsx'ten ayrıldı — Namaz & Hatim takibi
   (components/NamazHatimTakibi.jsx) de aynı kartı kullanıyor.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useCallback, useState } from "react"
import { ChevronDown } from "lucide-react"

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
export function Kart({ theme, Ikon, baslik, alt, ozet, bolum, children }) {
  const acilir = !!bolum
  const acik = acilir ? bolum[0] : true
  const altMetin = acik ? alt : (ozet ?? alt)
  const baslikIci = (
    <>
      <span style={{ width: "34px", height: "34px", borderRadius: "10px", background: `${theme.accent}18`, color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ikon size={18} />
      </span>
      <span style={{ minWidth: 0, flex: 1, display: "block" }}>
        <span style={{ display: "block", fontSize: "15.5px", fontWeight: 600, color: theme.text }}>{baslik}</span>
        {altMetin && (
          <span style={{
            display: "block", fontSize: "12px", marginTop: "1px",
            color: !acik && ozet ? theme.accent : theme.textSecondary,
            whiteSpace: acik ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{altMetin}</span>
        )}
      </span>
      {acilir && (
        <ChevronDown size={18} color={theme.textSecondary} aria-hidden="true"
          style={{ flexShrink: 0, transition: "transform .2s ease", transform: acik ? "rotate(180deg)" : "none" }} />
      )}
    </>
  )
  return (
    <section style={{
      background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "14px",
      padding: acik ? "14px" : "12px 14px", marginBottom: acik ? "14px" : "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    }}>
      {acilir ? (
        <h2 style={{ margin: 0, fontSize: "inherit", fontWeight: "inherit" }}>
          <button onClick={bolum[1]} aria-expanded={acik}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: 0, margin: 0,
              marginBottom: acik ? "10px" : 0, background: "none", border: "none", cursor: "pointer",
              textAlign: "left", fontFamily: "inherit", color: "inherit",
            }}>
            {baslikIci}
          </button>
        </h2>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>{baslikIci}</div>
      )}
      {acik && children}
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

