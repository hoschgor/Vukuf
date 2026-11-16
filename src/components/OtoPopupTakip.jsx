/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KAYARKEN AÇILAN PENCERE, ÖĞESİYLE BİRLİKTE KAYAR
   src/components/OtoPopupTakip.jsx

   16 Kasım 2026 — kullanıcı: "kayarken kelimeye tıklanırsa kaydırma duraklamayacak sadece popup
   açılacak ve ekranın hareketi ile birlikte popup da hareket edecek, ta ki üst sınıra kadar …
   kaydırma ekranından çıktığında popup kendiliğinden kapanacak."
   16 Kasım 2026 (2) — kullanıcı: "popup yukarıya çıktığında her zaman kapanmayabiliyor, bazen
   yukarıda bazen ortada takılı kalabiliyor. Ekranın üstünü %100 - altını %0 olarak düşünürsek,
   %70 altında bir konumdan tıklanırsa yukarıya doğru opaklığı azalıp kaybolabilir, yukarıdan
   tıklanırsa da 2 3 sn görünüp otomatik kaybolabilir."

   `etkin` iken çocuklar (kelime / âyet / lügat / dipnot penceresi) sıfır boyutlu, sabit bir
   katmana alınır; katman her karede dokunulan öğenin (hedefRef) ilk yerine göre kaydırılır
   (transform + opacity — React yeniden çizmez). İki kip, dokunulan öğenin ekrandaki yerine göre:
   • ALT KİP (öğe alanın alttan %70'inin içinde): pencere öğeyle yukarı kayar; yolun ilk %40'ında
     tam görünür, sonra solar ve üst sınıra (ustSinir) vardığında kaybolur → üstte takılmaz.
   • ÜST KİP (öğe üstteki %30'da): pencere ~2,5 sn görünür, sonra solup kapanır (öğeyle kayar ama
     üst sınırı aşmaz). Pencereye dokunmak süreyi yeniler.
   Güvenceler: öğe alandan çıkarsa / DOM'dan kalkarsa kapanır; öğe 4 sn kımıldamazsa (kayma
   durduysa) solup kapanır; öğe ölçülemezse üst kip gibi süreyle kapanır; takip açıkken kip
   kapanırsa (kaydırma bitti, parmak kapandı) pencere de kapanır → ortada asılı kalmaz.
   Not: katman sıfır boyutlu olduğu için pencerelerin tam ekran arka örtüsü bu sırada tıklama
   almaz; dışarı dokunuşu kaydırma motoru karşılar (ekran pencereyi kapatır).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react"

const UST_ESIK = 0.70        // alttan %70 ve üstü → üst kip
const GORUNME_MS = 2500      // üst kip: görünme süresi
const SOLMA_MS = 500         // süreli kapanışta solma
const DURGUN_MS = 4000       // öğe kımıldamazsa
const TAM_PAY = 0.40         // alt kip: yolun bu kısmında tam görünür

// anahtar: pencere değişince (başka öğeye dokununca) takip yeniden başlasın
export default function OtoPopupTakip({ etkin, anahtar, hedefRef, alanRef, ustSinir, onDisari, children }) {
  const katman = useRef(null)
  const cb = useRef({}); cb.current = { ustSinir, onDisari }
  // Takip sürerken kip kapanırsa pencere eski yerine dönüp asılı kalmasın → kapat
  const oncekiEtkin = useRef(false)
  useEffect(() => {
    if (oncekiEtkin.current && !etkin && children) cb.current.onDisari && cb.current.onDisari()
    oncekiEtkin.current = etkin
  }) // her çizimde (etkin geçişini yakalamak için)

  useEffect(() => {
    if (!etkin) return
    const k = katman.current
    if (!k) return
    let h = hedefRef && hedefRef.current
    // Ölçülebilir öğe: sarmalayıcı `display: contents` ise (Kur'ân kelimesi) boyutu sıfırdır → ilk çocuğu
    for (let i = 0; i < 4 && h; i++) {
      const r0 = h.getBoundingClientRect()
      if (r0.width > 0 || r0.height > 0) break
      h = h.firstElementChild
    }
    if (h && !h.isConnected) h = null
    const kapat = () => { cb.current.onDisari && cb.current.onDisari() }
    let raf = 0, ilk = null, taban = null, kip = "ust", yol = 0
    let basT = performance.now(), sonY = null, sonHareketT = basT, solmaT = 0
    // Pencereye dokunuş: süreler yenilenir (okunuyor / kullanılıyor)
    const yenile = () => { basT = performance.now(); sonHareketT = basT; solmaT = 0; k.style.opacity = "1" }
    k.addEventListener("pointerdown", yenile, { passive: true })

    const kare = () => {
      const simdi = performance.now()
      const alan = alanRef && alanRef.current ? alanRef.current.getBoundingClientRect() : { top: 0, bottom: window.innerHeight, height: window.innerHeight }
      const sinir = cb.current.ustSinir ? cb.current.ustSinir() : alan.top
      let r = null
      if (h) {
        if (!h.isConnected) { kapat(); return }
        r = h.getBoundingClientRect()
      }
      if (ilk === null) {
        // Pencerenin (görünen, tam ekran olmayan çocuğun) ilk üst kenarı
        let ust = Infinity
        for (const c of k.querySelectorAll(":scope > *")) {
          const cr = c.getBoundingClientRect()
          if (cr.width > 0 && cr.height > 0 && cr.height < window.innerHeight * 0.95) ust = Math.min(ust, cr.top)
        }
        taban = ust === Infinity ? null : ust
        if (r) {
          ilk = r.top; sonY = r.top
          const orta = (r.top + r.bottom) / 2
          const yukseklik = Math.max(1, (alan.height || (alan.bottom - alan.top)))
          const alttan = (alan.bottom - orta) / yukseklik          // 0 = alt, 1 = üst
          yol = taban !== null ? taban - sinir : 0
          kip = alttan < UST_ESIK && yol > 40 ? "alt" : "ust"
        } else { ilk = 0; kip = "ust" }
      }
      let dy = 0, opak = 1
      if (r) {
        if (r.bottom < alan.top + 2 || r.top > alan.bottom - 2) { kapat(); return }
        if (Math.abs(r.top - sonY) > 0.5) { sonY = r.top; sonHareketT = simdi }
        dy = r.top - ilk
        if (kip === "alt") {
          const cikis = -dy                                       // yukarı gidilen yol (px)
          const oran = cikis / yol
          if (oran >= 1) { kapat(); return }
          opak = oran <= TAM_PAY ? 1 : 1 - (oran - TAM_PAY) / (1 - TAM_PAY)
        } else if (taban !== null && taban + dy < sinir) dy = sinir - taban
      }
      // Süreli solma: üst kipte görünme süresi doldu ya da öğe uzun süre kımıldamadı
      if (!solmaT && ((kip === "ust" && simdi - basT > GORUNME_MS) || simdi - sonHareketT > DURGUN_MS)) solmaT = simdi
      if (solmaT) {
        const s = (simdi - solmaT) / SOLMA_MS
        if (s >= 1) { kapat(); return }
        opak = Math.min(opak, 1 - s)
      }
      k.style.transform = `translateY(${dy.toFixed(1)}px)`
      k.style.opacity = opak.toFixed(3)
      raf = requestAnimationFrame(kare)
    }
    raf = requestAnimationFrame(kare)
    return () => { cancelAnimationFrame(raf); k.removeEventListener("pointerdown", yenile) }
  }, [etkin, anahtar, hedefRef, alanRef])

  if (!etkin) return children
  return (
    <div ref={katman} style={{ position: "fixed", left: 0, top: 0, width: 0, height: 0, zIndex: 300, willChange: "transform, opacity" }}>
      {children}
    </div>
  )
}
