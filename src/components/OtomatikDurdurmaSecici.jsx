/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — OTOMATİK DURDURMA SEÇİCİSİ (radyo, sesli okuma)
   src/components/OtomatikDurdurmaSecici.jsx

   4 Kasım 2026. Kur'ân oynatıcısındaki (PlayerBar) "Otomatik durdurma" satırının
   aynısı: ay simgesi + açıklama + süre çipleri (Kapalı, 5 … 90 dk).
   uyku: { dk, bitis, kur } — data/otomatikDurdurma.js → useZamanlayici
   ═══════════════════════════════════════════════════════════════════════════ */

import { Moon } from "lucide-react"
import { UYKU_SURELERI, kalanDakika } from "../data/otomatikDurdurma"

export default function OtomatikDurdurmaSecici({ theme, uyku, baslik = "Otomatik durdurma", aciklama, eylem = "duracak", girinti = 24 }) {
  const ac = theme.accent
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "5px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Moon size={16} color={uyku.bitis ? ac : theme.textSecondary} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text, lineHeight: 1.25 }}>
          {baslik}
          <span style={{ display: "block", fontSize: "10px", color: uyku.bitis ? ac : theme.textSecondary }}>
            {uyku.bitis ? `${kalanDakika(uyku.bitis)} dk sonra ${eylem}` : aciklama}
          </span>
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", paddingLeft: `${girinti}px` }}>
        {UYKU_SURELERI.map(dk => {
          const sec = (uyku.dk || 0) === dk
          return (
            <button key={dk} onClick={(e) => { e.stopPropagation(); uyku.kur(dk) }} aria-pressed={sec}
              style={{
                padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontFamily: "inherit",
                cursor: "pointer", border: `1px solid ${sec ? ac : theme.border}`,
                background: sec ? ac : "transparent", color: sec ? "#fff" : theme.textSecondary,
              }}>
              {dk ? `${dk} dk` : "Kapalı"}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* Haplarda küçük gösterge: ☾ 12 dk */
export function UykuRozeti({ theme, bitis, renk }) {
  if (!bitis) return null
  return (
    <span title={`${kalanDakika(bitis)} dk sonra otomatik durdurulacak`}
      style={{ display: "inline-flex", alignItems: "center", gap: "2px", color: renk || theme.accent, fontWeight: 600, letterSpacing: 0 }}>
      <Moon size={9} /> {kalanDakika(bitis)} dk
    </span>
  )
}
