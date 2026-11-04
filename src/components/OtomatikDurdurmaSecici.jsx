/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — OTOMATİK DURDURMA SEÇİCİSİ (radyo, sesli okuma)
   src/components/OtomatikDurdurmaSecici.jsx

   4 Kasım 2026. Kur'ân oynatıcısındaki (PlayerBar) "Otomatik durdurma" satırının
   aynısı: ay simgesi + açıklama + süre çipleri (Kapalı, 5 … 90 dk).
   uyku: { dk, bitis, kur } — data/otomatikDurdurma.js → useZamanlayici
   ÖZEL SÜRE (4 Kasım 2026, kullanıcı: "otomatik [durdurma] kısımları için özel süre
   ayarlanabilsin") — "Özel" çipi küçük bir dakika kutusu açar (1–600 dk); seçilen özel
   süre çipte "Özel · 25 dk" diye görünür. Kur'ân oynatıcısı, radyo ve sesli okuma ortak.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState } from "react"
import { Moon, Check } from "lucide-react"
import { UYKU_SURELERI, kalanDakika } from "../data/otomatikDurdurma"

export default function OtomatikDurdurmaSecici({ theme, uyku, baslik = "Otomatik durdurma", aciklama, eylem = "duracak", girinti = 24 }) {
  const ac = theme.accent
  const ozelSecili = !!uyku.dk && !UYKU_SURELERI.includes(uyku.dk)
  const [ozelAcik, setOzelAcik] = useState(false)
  const [ozelDk, setOzelDk] = useState(() => (ozelSecili ? String(uyku.dk) : ""))
  const ozelKur = () => {
    const n = Math.max(1, Math.min(600, parseInt(ozelDk, 10) || 0))
    if (!parseInt(ozelDk, 10)) return
    uyku.kur(n); setOzelAcik(false)
  }
  const cip = (sec) => ({
    padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontFamily: "inherit",
    cursor: "pointer", border: `1px solid ${sec ? ac : theme.border}`,
    background: sec ? ac : "transparent", color: sec ? "#fff" : theme.textSecondary,
  })
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
            <button key={dk} onClick={(e) => { e.stopPropagation(); setOzelAcik(false); uyku.kur(dk) }} aria-pressed={sec} style={cip(sec)}>
              {dk ? `${dk} dk` : "Kapalı"}
            </button>
          )
        })}
        <button onClick={(e) => { e.stopPropagation(); setOzelAcik(v => !v) }} aria-pressed={ozelSecili} aria-expanded={ozelAcik} style={cip(ozelSecili)}>
          {ozelSecili ? `Özel · ${uyku.dk} dk` : "Özel"}
        </button>
      </div>
      {ozelAcik && (
        <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: `${girinti}px` }}>
          <input type="number" inputMode="numeric" min="1" max="600" value={ozelDk} autoFocus
            onChange={e => setOzelDk(e.target.value)} onKeyDown={e => { if (e.key === "Enter") ozelKur() }}
            placeholder="dk" aria-label="Özel süre (dakika)"
            style={{ width: "70px", padding: "4px 7px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontFamily: "inherit", fontSize: "12px" }} />
          <span style={{ fontSize: "11px", color: theme.textSecondary }}>dakika</span>
          <button onClick={ozelKur} disabled={!(parseInt(ozelDk, 10) > 0)}
            style={{ ...cip(true), display: "inline-flex", alignItems: "center", gap: "3px", opacity: parseInt(ozelDk, 10) > 0 ? 1 : 0.5 }}>
            <Check size={11} /> Kur
          </button>
        </div>
      )}
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
