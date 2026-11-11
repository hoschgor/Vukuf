// ÂYET ROZETİ STİLİ (11 Kasım 2026) — "cini" (adı "Çiçekli"): klasik rozetin uçları + ortada
// hatâyî çiçeği (varsayılan) · "klasik": önceki rozet. Kimlik "cini" ilk denemeden kaldı.
// Ayarlar → Okuma Düzeni'nden seçilir.
import { useSyncExternalStore } from "react"

export const AYET_ROZETI_ANAHTAR = "vukuf-ayet-rozeti"
export const AYET_ROZETLERI = [
  { id: "cini", ad: "Çiçekli" },
  { id: "klasik", ad: "Klasik" },
]
function oku() {
  try { const v = localStorage.getItem(AYET_ROZETI_ANAHTAR); return v === "klasik" ? "klasik" : "cini" } catch { return "cini" }
}
let durum = oku()
const dinleyiciler = new Set()
export function ayetRozetiYaz(v) {
  durum = v === "klasik" ? "klasik" : "cini"
  try { localStorage.setItem(AYET_ROZETI_ANAHTAR, durum) } catch { /* yoksay */ }
  for (const f of dinleyiciler) f()
}
const abone = (f) => { dinleyiciler.add(f); return () => dinleyiciler.delete(f) }
export function useAyetRozeti() {
  return useSyncExternalStore(abone, () => durum, () => durum)
}
