/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — ALTTAN AÇILAN SAYFA (bottom sheet)
   src/components/AltSayfa.jsx

   Panelin HER YERİNDEN aşağı sürükleyerek kapanır; ayrıca üstteki tutamaktan.

   ── TASARIM KARARLARI ──────────────────────────────────────────────────────
   • GİRİŞ ANİMASYONU KEYFRAME DEĞİL. Önce `@keyframes` ile açılıyordu; sürükleme
     eklenince ikisi aynı `transform` üzerinde çakışıyor (animasyon bitene kadar
     parmak hareketi eziliyor). Onun yerine giriş de aynı transform/transition
     ile yapılıyor: ilk karede translateY(100%), sonraki karede 0.
   • POINTER EVENTS, touch/mouse ayrı ayrı değil. `setPointerCapture` ile parmak
     tutamağın dışına çıksa da olay akmaya devam ediyor.
   • SÜRÜKLEME PANELİN HER YERİNDEN başlar, yalnız tutamaktan değil. Ama iki
     şeyi bozmadan:
       – AYARA DOKUNMA: hareket 6px'i geçmeden sürükleme başlamaz, o yüzden
         basit dokunuş normal tıklama olarak geçer. Gerçek bir sürükleme
         olduysa ardından gelen `click` yakalama aşamasında yutulur, yoksa
         parmağını kaldırdığın yerdeki anahtar da değişirdi.
       – İÇERİK KAYDIRMA: sürükleme YALNIZ panel en üstteyken (scrollTop 0)
         başlar. İçerik aşağı kaydırılmışsa parmak paneli değil içeriği
         kaydırır; tutamak bunun istisnası, oradan her zaman sürüklenir.

   • ★ MOBİLDE İPTAL SORUNU — ASIL DÜZELTME. Masaüstünde kusursuz çalışan
     sürükleme, telefonda gövdeden başlatılınca "birkaç piksel kayıp geri
     dönüyordu". Sebep `touch-action` idi: gövdede `pan-y` yazdığı için tarayıcı
     dikey hareketi KENDİ kaydırma jesti sayıp devralıyor ve devralır almaz
     `pointercancel` gönderiyor. Bizim eşiğimiz (6px) tam o sırada aşılıyordu —
     panel 6-8px kayıyor, hemen ardından iptal gelip yerine yaylanıyordu.
     Fare `touch-action`'dan etkilenmediği için web'de hiç görünmedi.
     İki katmanlı çözüm:
       1) İÇERİK KAYDIRILAMIYORSA `touch-action: none`. Görünüm paneli gibi
          kısa panellerde tarayıcının devralacağı bir kaydırma zaten yok;
          jesti baştan bize bırakıyor. (Kaydırılabilir uzun panellerde `pan-y`
          kalır, yoksa içerik hiç kaydırılamaz.)
       2) PASİF OLMAYAN `touchmove` DİNLEYİCİSİ + preventDefault. Uzun
          panellerde, parmak AŞAĞI gidiyorken ve panel en üstteyken (yani
          kaydıracak bir şey yokken) tarayıcının jesti devralması engelleniyor.
          Böylece `pointercancel` hiç gelmiyor, sürükleme sonuna kadar bizde
          kalıyor. Yukarı hareket veya kaydırılmış içerik dokunulmadan geçer —
          içerik kaydırma bozulmasın.
     `pointercancel` yine de gelirse (sistem jesti, çağrı vb.) artık geri
     yaylanmak yerine normal bitiş kuralları uygulanıyor.

   • YUKARI ÇEKMEDE DİRENÇ var (katsayı 0.25): panel yukarı fırlamaz ama parmak
     da "tutmuyor" hissi vermez.
   • Kapanma kararı İKİ ÖLÇÜTTEN biri: yeterince aşağı indiyse (eşik) ya da hızlı
     bir fiske atıldıysa. Yalnız mesafeye bakmak hızlı kapatmayı imkânsız kılar,
     yalnız hıza bakmak yavaş ama uzun sürüklemeyi yok sayar.
   • Perde (backdrop) sürükledikçe SOLUYOR — panelin nereye gittiği görünsün.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"

const KAPANMA_SURESI = 220          // ms — çıkış geçişiyle aynı olmalı
const ESIK_PX = 90                  // bu kadar aşağı inerse kapanır
const HIZ_ESIGI = 0.5               // px/ms — fiske ile kapanma
const BASLAMA_ESIGI = 6             // px — bunu aşmadan sürükleme başlamaz

export default function AltSayfa({
  kapat,
  theme,
  baslik = null,
  children,
  maxGenislik = "520px",
  maxYukseklik = "82vh",
}) {
  const [kayma, setKayma] = useState(0)
  const [surukleniyor, setSurukleniyor] = useState(false)
  const [kapaniyor, setKapaniyor] = useState(false)
  const [acildi, setAcildi] = useState(false)
  // İçerik gerçekten kaydırılabiliyor mu? `touch-action`ı buna göre seçiyoruz.
  const [kaydirilabilir, setKaydirilabilir] = useState(false)
  const bilgi = useRef({ basY: 0, basT: 0, id: null, aday: false })
  const zamanlayici = useRef(null)
  const sayfaRef = useRef(null)
  // Gerçek bir sürükleme olduysa arkasından gelen `click` yutulur.
  const suruklendi = useRef(false)

  // Giriş: ilk karede kapalı, sonraki karede açık → transition devreye girer.
  useEffect(() => {
    const r = requestAnimationFrame(() => setAcildi(true))
    return () => {
      cancelAnimationFrame(r)
      if (zamanlayici.current) clearTimeout(zamanlayici.current)
    }
  }, [])

  // Her render sonrası ölç: içerik değişince (arama açılması, liste büyümesi)
  // kaydırılabilirlik de değişir. setState aynı değerde ise React zaten durur.
  useLayoutEffect(() => {
    const el = sayfaRef.current
    if (el) setKaydirilabilir(el.scrollHeight > el.clientHeight + 1)
  })

  const kapanmayaBasla = useCallback(() => {
    setKapaniyor(true)
    // Geçiş bitmeden unmount edilirse panel zıplayarak kaybolur; bekleniyor.
    zamanlayici.current = setTimeout(() => kapat?.(), KAPANMA_SURESI)
  }, [kapat])

  // Esc ile de kapansın — masaüstünde beklenen davranış.
  useEffect(() => {
    const tus = (e) => { if (e.key === "Escape") kapanmayaBasla() }
    window.addEventListener("keydown", tus)
    return () => window.removeEventListener("keydown", tus)
  }, [kapanmayaBasla])

  // ★ Jesti tarayıcıya kaptırmamak için pasif OLMAYAN touchmove dinleyicisi.
  // React'in onTouchMove'u pasif eklendiğinden preventDefault işlemiyor; bu
  // yüzden doğrudan DOM'a bağlanıyor.
  useEffect(() => {
    const el = sayfaRef.current
    if (!el) return
    const dokunHareket = (e) => {
      if (bilgi.current.id == null) return          // bizim jestimiz değil
      if (!e.cancelable) return                     // tarayıcı çoktan devraldı
      const t = e.touches && e.touches[0]
      if (!t) return
      const dy = t.clientY - bilgi.current.basY
      // Yalnızca AŞAĞI ve panel en üstteyken: kaydıracak bir şey yok, jest bizim.
      if (dy > 0 && (el.scrollTop || 0) <= 0) e.preventDefault()
    }
    el.addEventListener("touchmove", dokunHareket, { passive: false })
    return () => el.removeEventListener("touchmove", dokunHareket)
  }, [])

  // `hemen`: tutamaktan başlanmışsa eşik beklenmez, içerik kaydırılmış olsa da
  // sürüklenir. Gövdeden başlanmışsa önce ADAY olunur, hareket eşiği aşınca
  // sürükleme gerçekten başlar.
  function inisBasla(e, hemen = false) {
    if (bilgi.current.id != null || kapaniyor) return
    const ustte = (sayfaRef.current?.scrollTop || 0) <= 0
    if (!hemen && !ustte) return              // içerik kaydırılıyor, karışma
    bilgi.current = {
      basY: e.clientY, basT: performance.now(),
      id: e.pointerId, aday: !hemen,
    }
    suruklendi.current = false
    if (hemen) {
      setSurukleniyor(true)
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* eski tarayıcı */ }
    }
  }

  function inisHareket(e) {
    if (bilgi.current.id !== e.pointerId) return
    const dy = e.clientY - bilgi.current.basY
    if (bilgi.current.aday) {
      // Eşiği aşmadan sürükleme başlamaz → dokunuş dokunuş olarak kalır.
      if (dy <= BASLAMA_ESIGI) return
      bilgi.current.aday = false
      setSurukleniyor(true)
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* yoksay */ }
    }
    suruklendi.current = true
    setKayma(dy > 0 ? dy : dy * 0.25)      // yukarıda direnç
  }

  function inisBitti(e) {
    if (bilgi.current.id !== e.pointerId) return
    const dy = Math.max(0, e.clientY - bilgi.current.basY)
    const sure = Math.max(1, performance.now() - bilgi.current.basT)
    const aday = bilgi.current.aday
    bilgi.current.id = null
    bilgi.current.aday = false
    setSurukleniyor(false)
    if (aday) return                        // hiç sürüklenmedi, dokunuştu
    if (dy > ESIK_PX || dy / sure > HIZ_ESIGI) kapanmayaBasla()
    else setKayma(0)
  }

  const yer = kapaniyor ? "100%" : acildi ? `${kayma}px` : "100%"
  // Perde: sürükledikçe soluyor. 320px'de tamamen şeffaf olmasın diye taban 0.
  const perdeOran = kapaniyor ? 0 : Math.max(0, 1 - Math.max(0, kayma) / 320)

  return (
    <>
      <div
        onClick={kapanmayaBasla}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: `rgba(0,0,0,${0.35 * (acildi ? perdeOran : 0)})`,
          transition: surukleniyor ? "none" : "background 0.22s ease",
        }}
      />

      <div
        ref={sayfaRef}
        role="dialog"
        aria-modal="true"
        onPointerDown={(e) => inisBasla(e, false)}
        onPointerMove={inisHareket}
        onPointerUp={inisBitti}
        onPointerCancel={inisBitti}
        // Sürükledikten sonra parmağın kalktığı yerdeki düğme/anahtar
        // tetiklenmesin diye tıklama YAKALAMA aşamasında yutuluyor.
        onClickCapture={(e) => {
          if (suruklendi.current) { e.stopPropagation(); e.preventDefault() }
          suruklendi.current = false
        }}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 301,
          background: theme.surface,
          borderTop: `1px solid ${theme.border}`,
          borderRadius: "20px 20px 0 0",
          padding: "0 20px calc(18px + env(safe-area-inset-bottom))",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.22)",
          maxWidth: maxGenislik, margin: "0 auto",
          maxHeight: maxYukseklik, overflowY: "auto",
          // ★ Kaydırılamayan panelde jest baştan bizim; kaydırılabilende `pan-y`
          // kalır ve devralma yukarıdaki preventDefault ile engellenir.
          touchAction: kaydirilabilir ? "pan-y" : "none",
          overscrollBehavior: "contain",
          transform: `translateY(${yer})`,
          transition: surukleniyor ? "none" : `transform ${KAPANMA_SURESI}ms cubic-bezier(.22,.61,.36,1)`,
          // Sürüklerken seçim/uzun-basma menüsü açılmasın.
          userSelect: surukleniyor ? "none" : undefined,
        }}
      >
        {/* TUTAMAK — dokunma hedefi çizginin kendisinden büyük tutuluyor,
            yoksa 4px'lik bir çizgiyi parmakla yakalamak zor. */}
        <div
          onPointerDown={(e) => { e.stopPropagation(); inisBasla(e, true) }}
          onPointerMove={(e) => { e.stopPropagation(); inisHareket(e) }}
          onPointerUp={(e) => { e.stopPropagation(); inisBitti(e) }}
          onPointerCancel={(e) => { e.stopPropagation(); inisBitti(e) }}
          role="button"
          aria-label="Paneli kapatmak için aşağı sürükleyin"
          style={{
            touchAction: "none",          // burada her zaman: tutamak = sürükleme
            cursor: surukleniyor ? "grabbing" : "grab",
            padding: "12px 0 8px",
            margin: "0 -20px",            // tam genişlik hedef
            display: "flex", justifyContent: "center",
          }}
        >
          <div style={{
            width: "40px", height: "4px", borderRadius: "2px",
            background: theme.border,
            // Tutulduğunda belli olsun — dokunuşun işe yaradığı hissedilmeli.
            opacity: surukleniyor ? 1 : 0.85,
            transform: surukleniyor ? "scaleX(1.25)" : "none",
            transition: "transform 0.15s ease, opacity 0.15s ease",
          }} />
        </div>

        {baslik && (
          <div style={{
            fontSize: "12px", color: theme.textSecondary,
            letterSpacing: "1px", padding: "2px 4px 6px",
          }}>
            {baslik}
          </div>
        )}

        {children}
      </div>
    </>
  )
}
