/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — GERİ DÖN DÜĞMESİ + DÖNÜŞ NOKTALARI LİSTESİ
   src/components/DonusDugmesi.jsx

   Kur'ân ve kitap okuma ekranlarında, bir atlamadan sonra (İçindekiler, arama,
   sayfaya git, işaret) SOL ALTTA (bar üstteyse sol üstte) beliren hap:
     [↶ Geri dön · Bakara 142]  [⌄ 3]  [✕]
   • "Geri dön" → en son bırakılan noktaya.
   • Sayı düğmesi (birden fazla nokta varsa) → "Dönüş noktaları" listesi; her
     satırda yer, nereden ayrıldığı ve ne zaman. Dokununca oraya gidilir.
   • ✕ → listeyi temizler (hap kaybolur).
   Sağ alttaki "Aramaya dön" hapıyla çakışmasın diye SOLDA duruyor; görünüşü de
   ondan ayrışsın diye dolu değil, çerçeveli. Ayrıntı: data/donusNoktalari.js
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState } from "react"
import { CornerUpLeft, ChevronUp, ChevronDown, X, Search, List, Bookmark, Hash, BookOpen } from "lucide-react"
import { KAYNAK_ADI } from "../data/donusNoktalari"

const KAYNAK_SIMGE = { icindekiler: List, arama: Search, sayfa: Hash, isaret: Bookmark, ornek: BookOpen }

function zamanYazi(z) {
  const sn = Math.floor((Date.now() - (z || 0)) / 1000)
  if (sn < 60) return "az önce"
  const dk = Math.floor(sn / 60)
  if (dk < 60) return `${dk} dk önce`
  return `${Math.floor(dk / 60)} sa önce`
}

export default function DonusDugmesi({ theme, noktalar, onGit, onTemizle, altta = true, pay = 58 }) {
  const [listeAcik, setListeAcik] = useState(false)
  if (!noktalar || !noktalar.length) return null
  const ac = theme.accent
  const sonIdx = noktalar.length - 1
  const son = noktalar[sonIdx]
  const dikey = altta ? { bottom: `calc(${pay}px + env(safe-area-inset-bottom))` } : { top: `calc(${pay}px + env(safe-area-inset-top))` }
  const git = (i) => { setListeAcik(false); onGit?.(i) }

  return (
    <>
      {listeAcik && (
        <div onClick={() => setListeAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 119 }} />
      )}
      <div style={{
        position: "fixed", left: "calc(14px + env(safe-area-inset-left))", zIndex: 120, ...dikey,
        maxWidth: "min(330px, calc(100vw - 28px))",
        display: "flex", flexDirection: altta ? "column-reverse" : "column", alignItems: "flex-start", gap: "6px",
      }}>
        {/* HAP */}
        <div style={{
          display: "flex", alignItems: "center", gap: "2px", maxWidth: "100%",
          background: theme.surface, border: `1px solid ${ac}`, borderRadius: "22px",
          padding: "3px", boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
        }}>
          <button onClick={() => git(sonIdx)} title={`Geri dön: ${son.etiket}`}
            style={{
              display: "flex", alignItems: "center", gap: "7px", minWidth: 0,
              padding: "5px 10px 5px 9px", borderRadius: "19px", border: "none",
              background: `${ac}14`, color: ac, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            }}>
            <CornerUpLeft size={16} style={{ flexShrink: 0 }} />
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.15 }}>
              <span style={{ fontSize: "12.5px", fontWeight: 700 }}>Geri dön</span>
              <span style={{
                fontSize: "10.5px", color: theme.textSecondary, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis", maxWidth: "170px",
              }}>{son.etiket}</span>
            </span>
          </button>
          {noktalar.length > 1 && (
            <button onClick={() => setListeAcik(v => !v)} aria-expanded={listeAcik}
              title="Dönüş noktaları" aria-label={`Dönüş noktaları (${noktalar.length})`}
              style={{
                display: "flex", alignItems: "center", gap: "2px", height: "32px", padding: "0 8px",
                borderRadius: "16px", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: listeAcik ? ac : "transparent", color: listeAcik ? "#fff" : theme.textSecondary,
                fontSize: "12px", fontWeight: 700,
              }}>
              {noktalar.length}
              {(altta ? !listeAcik : listeAcik) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button onClick={() => { setListeAcik(false); onTemizle?.() }} title="Dönüş noktalarını temizle" aria-label="Kapat"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px",
              borderRadius: "50%", border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer",
            }}>
            <X size={14} />
          </button>
        </div>

        {/* LİSTE — en yeni üstte */}
        {listeAcik && (
          <div style={{
            width: "min(300px, calc(100vw - 28px))", maxHeight: "min(52vh, 360px)", overflowY: "auto",
            background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "14px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.25)", padding: "6px",
          }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", color: theme.textSecondary, padding: "4px 8px 6px" }}>
              DÖNÜŞ NOKTALARI
            </div>
            {noktalar.map((n, i) => ({ n, i })).reverse().map(({ n, i }) => {
              const Simge = KAYNAK_SIMGE[n.kaynak] || CornerUpLeft
              return (
                <button key={`${i}-${n.z}`} onClick={() => git(i)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "9px", textAlign: "left",
                    padding: "8px", borderRadius: "10px", border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: i === sonIdx ? `${ac}12` : "transparent", color: theme.text,
                  }}>
                  <Simge size={14} color={ac} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.etiket}</span>
                    <span style={{ display: "block", fontSize: "10.5px", color: theme.textSecondary }}>
                      {KAYNAK_ADI[n.kaynak] ? `${KAYNAK_ADI[n.kaynak]} ile ayrıldınız` : "Ayrıldığınız yer"} · {zamanYazi(n.z)}
                    </span>
                  </span>
                </button>
              )
            })}
            <button onClick={() => { setListeAcik(false); onTemizle?.() }}
              style={{
                width: "100%", marginTop: "4px", padding: "7px", borderRadius: "9px", cursor: "pointer",
                border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary,
                fontSize: "11.5px", fontWeight: 600, fontFamily: "inherit",
              }}>
              Listeyi temizle
            </button>
          </div>
        )}
      </div>
    </>
  )
}
