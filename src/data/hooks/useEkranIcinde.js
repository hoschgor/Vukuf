/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — BALONCUK EKRAN İÇİNDE KALSIN
   src/data/hooks/useEkranIcinde.js

   Kullanıcı (yatay telefon): "meal popup'ı ekran dışına çıkıyor; âyete yakın
   yerde ama ekran içinde olmalı". Âyet baloncuğu konumunu TAHMİNLE seçiyordu:
   `asagiMi` koşulu hiç doğru olamayacak biçimde yazılmıştı (y + ekranBoyu <
   ekranBoyu), baloncuk hep "dokunulan yerin ekran boyunun %20'si kadar üstüne"
   konuyordu. Dikey telefonda (932 px) bu 186 px ediyor ve çoğu zaman sığıyordu;
   yatayda (430 px) üst satırlardaki âyetlerde baloncuğun başı ekranın dışına
   taşıyordu. Kelime baloncuğu da benzer bir tahminle (220 px) çalışıyordu.

   ARTIK ÖLÇÜLÜYOR: baloncuk çizildikten sonra, boyanmadan ÖNCE (layout effect)
   gerçek eni/boyu okunuyor:
     1) dokunulan yerin ALTINA sığıyorsa oraya,
     2) değilse ÜSTÜNE,
     3) ikisine de sığmıyorsa ekranın içinde, dokunulan yere en yakın yere.
   Yatayda aynı şey: dokunulan x'ten başlıyor, sağdan taşarsa sola kayıyor.
   Çentik/ada payı (safe-area) hesaba katılıyor — yatayda iki yanda ~60 px.
   Baloncuk içeriği değişirse (ör. meal uzunluğu) ResizeObserver yeniden yerleştirir.

   `konum`: { x, y } eski biçim (sol üst tahmini) + varsa { ax, ay } — dokunulan
   noktanın KENDİSİ. ax/ay yoksa x/y dokunma noktası sayılır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useLayoutEffect, useState } from "react"

const PAY = 8          // ekran kenarından en az boşluk
const ARA = 12         // dokunulan nokta ile baloncuk arası

// Güvenli alan payları env() ile yalnız CSS'ten okunabiliyor → gizli bir
// ölçü kutusu bir kez kuruluyor, değerler her yerleşimde (dönmede değişir) okunuyor.
let olcuKutusu = null
export function guvenliAlan() {   // DonusDugmesi de kullanıyor (hap konumu)
  if (typeof document === "undefined") return { ust: 0, sag: 0, alt: 0, sol: 0 }
  if (!olcuKutusu) {
    olcuKutusu = document.createElement("div")
    olcuKutusu.setAttribute("aria-hidden", "true")
    olcuKutusu.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
      "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)"
    document.body.appendChild(olcuKutusu)
  }
  const s = getComputedStyle(olcuKutusu)
  return {
    ust: parseFloat(s.paddingTop) || 0,
    sag: parseFloat(s.paddingRight) || 0,
    alt: parseFloat(s.paddingBottom) || 0,
    sol: parseFloat(s.paddingLeft) || 0,
  }
}

export function useEkranIcinde(ref, konum) {
  const [yer, setYer] = useState(null)
  const x = konum ? konum.x : null
  const y = konum ? konum.y : null
  const ax = konum && konum.ax != null ? konum.ax : x
  const ay = konum && konum.ay != null ? konum.ay : y

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || x == null || y == null) return
    const yerlestir = () => {
      const r = el.getBoundingClientRect()
      const W = window.innerWidth, H = window.innerHeight
      const g = guvenliAlan()
      const ustSinir = PAY + g.ust, altSinir = H - PAY - g.alt
      const solSinir = PAY + g.sol, sagSinir = W - PAY - g.sag

      let top
      if (ay + ARA + r.height <= altSinir) top = ay + ARA                 // altına sığıyor
      else if (ay - ARA - r.height >= ustSinir) top = ay - ARA - r.height // üstüne sığıyor
      else {
        // İkisine de sığmıyor: dokunulan yere en yakın, ekranın içinde
        const ortada = ay - r.height / 2
        top = Math.max(ustSinir, Math.min(altSinir - r.height, ortada))
      }
      // Yatay: eski davranış (dokunulan x'ten başla), taşarsa içeri kaydır
      const left = Math.max(solSinir, Math.min(sagSinir - r.width, x))

      setYer(o => (o && o.top === top && o.left === left) ? o : { top, left })
    }
    yerlestir()
    let ro = null
    try { ro = new ResizeObserver(yerlestir); ro.observe(el) } catch { ro = null }
    window.addEventListener("resize", yerlestir)
    return () => {
      try { ro && ro.disconnect() } catch { /* yoksay */ }
      window.removeEventListener("resize", yerlestir)
    }
  }, [ref, x, y, ax, ay])

  return yer
}

/* Baloncuk için boy sınırı: dikeyde eskisi gibi ekranın %35'i, ama kısa
   (yatay) ekranda 150 px'e düşmesin — en az 260 px, ekrandan da taşmasın. */
export const BALONCUK_MAX_BOY = "max(35vh, min(260px, calc(100dvh - 24px)))"
