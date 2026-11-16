/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — OTOMATİK KAYDIRMA (ortak: Kur'ân-ı Kerîm ve eser okuma ekranları)
   src/data/hooks/useOtoKaydirma.js

   16 Kasım 2026 — kullanıcı: "Kaydırma modunda bir düzenleme yapalım. Mod açıkken, kaydırma
   şuanki gibi yapılsın, herhangi bir yere basıldığında (basılı tutma değil, bu kaydırmayı
   durdurmak için kullanılacak) alt kısımda kaydırma menüsü açılsın, hız seçimi rakam girilerek
   ya da sürüklenebilen şekilde olsun. Maksimum hızı biraz daha yükseltelim (maks 40 olsun)
   yukarıya doğru geri gelmek istenildiğinde kaydırma işlemi bizi yukarıya gitmede zorlamasın,
   yukarıya normalde nasıl kaydırılıyorsa o şekilde kaydırılsın."

   • Kaydırma rAF + geçen süreye göre kesirli ilerleme (Kur'ân ekranındaki pürüzsüz motor).
   • BASILI TUTMA durdurur (parmak / fare ekrandayken kayma yok), bırakınca sürer.
   • ELLE KAYDIRMA (parmakla sürükleme, savurma, fare tekerleği, kaydırma çubuğu — hangi yöne
     olursa olsun) algılanınca kayma o hareket bitene kadar bekler; kullanıcının kendi kaydırması
     neyse o olur, yukarı çıkarken aşağı itilmez. Kendi yazdığımız scrollTop'tan ayırmak için
     son yazılan değerle karşılaştırılır.
   • KISA DOKUNUŞ (hareketsiz, < 300 ms) okuma ekranının kendi tıklama işini YAPMAZ (lügat, bar,
     menü açılmaz); onDokun çağrılır → ekran alttaki kaydırma menüsünü açar.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react"

export const OTO_EN_AZ = 1
export const OTO_EN_COK = 40
const HIZ_ANAHTAR = "vukuf-oto-kaydirma-hizi"
export const otoHizSinirla = (k) => Math.min(OTO_EN_COK, Math.max(OTO_EN_AZ, Math.round(Number(k) || 1)))

/** Kademe → piksel/sn. 1 → 6, 10 → 18, 20 → ~36, 30 → ~59, 40 → ~95 */
export function otoHizPx(kademe) {
  const k = otoHizSinirla(kademe)
  if (k <= 10) return 6 * Math.pow(1.13, k - 1)
  if (k <= 20) return 18 * Math.pow(1.0718, k - 10)
  return 36 * Math.pow(1.05, k - 20)
}

/** Hız (iki ekranda ortak, cihazda saklanır) */
export function useOtoKaydirmaHizi() {
  const [hiz, setHizD] = useState(() => { try { return otoHizSinirla(localStorage.getItem(HIZ_ANAHTAR) || 5) } catch { return 5 } })
  const setHiz = (v) => {
    setHizD(eski => {
      const y = otoHizSinirla(typeof v === "function" ? v(eski) : v)
      try { localStorage.setItem(HIZ_ANAHTAR, String(y)) } catch { /* yoksay */ }
      return y
    })
  }
  return [hiz, setHiz]
}

/**
 * elRef: kaydırılan kutu · acik: mod açık mı · hiz: 1..40
 * onDokun(): kısa dokunuş (menüyü aç/kapat) · onSon(): sona gelindi
 * dokunEngel(): true dönerse dokunuş yakalanmaz (ör. vurgu kipi)
 */
export function useOtoKaydirma({ elRef, acik, hiz, onDokun, onSon, dokunEngel }) {
  const cb = useRef({})
  cb.current = { onDokun, onSon, dokunEngel }
  useEffect(() => {
    const el = elRef.current
    if (!acik || !el) return
    const pxSn = otoHizPx(hiz)
    let raf = 0, sonT = 0
    let hedef = el.scrollTop, sonYazilan = -1
    let basili = false, kullaniciT = 0
    let bas = null, hareket = false, dokunusT = 0

    const onScroll = () => {
      if (sonYazilan < 0 || Math.abs(el.scrollTop - sonYazilan) > 2) kullaniciT = performance.now()
    }
    const onWheel = () => { kullaniciT = performance.now() }
    const onDown = (e) => {
      basili = true; hareket = false
      bas = { x: e.clientX, y: e.clientY, t: performance.now() }
    }
    const onMove = (e) => {
      if (bas && (Math.abs(e.clientX - bas.x) > 10 || Math.abs(e.clientY - bas.y) > 10)) hareket = true
    }
    const onUp = () => {
      basili = false
      kullaniciT = performance.now()          // bırakınca kısa bir soluk (savurma başlıyorsa onu bekle)
      if (bas && !hareket && performance.now() - bas.t < 300) dokunusT = performance.now()
      bas = null
    }
    // Kısa dokunuşun tıklamasını yakala: ekranın kendi tıklama işi çalışmasın, menü açılsın
    const onClick = (e) => {
      if (!dokunusT || performance.now() - dokunusT > 600) return
      dokunusT = 0
      if (cb.current.dokunEngel && cb.current.dokunEngel()) return
      e.stopPropagation(); e.preventDefault()
      cb.current.onDokun && cb.current.onDokun()
    }

    const adim = (t) => {
      if (!sonT) sonT = t
      const dt = Math.min(64, t - sonT)
      sonT = t
      const simdi = performance.now()
      if (basili || simdi - kullaniciT < 450) {
        hedef = el.scrollTop                    // kullanıcı kaydırıyor / basılı tutuyor → bekle
      } else {
        if (Math.abs(el.scrollTop - hedef) > 4) hedef = el.scrollTop
        hedef += (pxSn * dt) / 1000
        el.scrollTop = hedef
        sonYazilan = el.scrollTop
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) { cb.current.onSon && cb.current.onSon(); return }
      }
      raf = requestAnimationFrame(adim)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    el.addEventListener("wheel", onWheel, { passive: true })
    el.addEventListener("pointerdown", onDown, { passive: true })
    el.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerup", onUp, { passive: true })
    window.addEventListener("pointercancel", onUp, { passive: true })
    el.addEventListener("click", onClick, true)
    raf = requestAnimationFrame(adim)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("scroll", onScroll)
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      el.removeEventListener("click", onClick, true)
    }
  }, [acik, hiz, elRef])
}
