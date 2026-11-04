/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — OTOMATİK DURDURMA (uyku zamanlayıcısı) — ortak sayaç
   src/data/otomatikDurdurma.js

   4 Kasım 2026 — kullanıcı: "Radyo dinlemede de otomatik kapanma verelim … normal
   okuma ekranındaki dinleme modunda da otomatik durdurma ekleyelim."
   Kur'ân oynatıcısındakiyle (data/oynatici.jsx → useUykuDurumu) aynı mantık, ama
   React dışında bir depo: sayaç, onu kuran ekran kapansa da sürer (radyo ve sesli
   okuma öbür ekranlarda da devam ediyor). Telefonda sayfa arka plandayken JS
   sayaçları gecikebildiği için süre, uygulamaya dönülünce ve `denetle()` her
   çağrıldığında (ör. sesli okumada her cümlede) ayrıca kontrol edilir.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react"
// Kur'ân oynatıcısındakiyle (data/oynatici.jsx) aynı süreler; döngüsel içe aktarma
// olmasın diye burada ayrıca yazıldı (SesliMiniHap modül düzeyinde sayaç kuruyor).
export const UYKU_SURELERI = [0, 5, 10, 15, 30, 45, 60, 90]   // dk; 0 = kapalı

const BOS = { dk: 0, bitis: null }

export function zamanlayiciOlustur(durdur) {
  let d = BOS
  const dinleyiciler = new Set()
  let t = null, iv = null
  const yay = (p) => { d = { ...d, ...p }; dinleyiciler.forEach(f => f()) }
  const temizle = () => { clearTimeout(t); clearInterval(iv); t = null; iv = null }
  const denetle = () => {
    if (!d.bitis || Date.now() < d.bitis) return false
    temizle(); d = BOS; dinleyiciler.forEach(f => f())
    try { durdur() } catch { /* yoksay */ }
    return true
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") denetle() })
  }
  return {
    abone(f) { dinleyiciler.add(f); return () => dinleyiciler.delete(f) },
    durum: () => d,
    kur(dk) {
      temizle()
      if (!dk) { if (d.bitis) { d = BOS; dinleyiciler.forEach(f => f()) } return }
      yay({ dk, bitis: Date.now() + dk * 60000 })
      t = setTimeout(denetle, dk * 60000 + 50)
      iv = setInterval(() => { if (!denetle()) yay({}) }, 20000)   // kalan dakika gösterimi tazelensin
    },
    iptal() { if (d.bitis) { temizle(); d = BOS; dinleyiciler.forEach(f => f()) } },
    denetle,
  }
}

export function useZamanlayici(z) {
  const d = useSyncExternalStore(z.abone, z.durum, z.durum)
  return { dk: d.dk, bitis: d.bitis, kur: z.kur }
}

export const kalanDakika = (bitis) => (bitis ? Math.max(1, Math.ceil((bitis - Date.now()) / 60000)) : 0)
