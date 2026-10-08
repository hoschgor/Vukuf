/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — ALTTAN AÇILAN SAYFA (bottom sheet)
   src/components/AltSayfa.jsx

   ── 8 EKİM 2026: BAŞTAN, SADE YAPI ─────────────────────────────────────────
   Kullanıcı: "Kaydırma kısmı daha kötü oldu, baştan bir şey düşünelim,
   şuankiler üst üste binip daha kötüleştirmiş olabilir, klasik ama temiz bir
   şey yapalım."

   Eski sürüm, paneli HER YERİNDEN aşağı çekip kapatabilmek için içerik
   kaydırmasının içine giriyordu: gövdeye pointer dinleyicileri, pasif olmayan
   touchmove + preventDefault, değişen `touch-action`, yön eşikleri, kenar
   payları… Her yama başka bir durumda kaydırmayı yutuyordu (iOS'ta bir
   dokunuşun ilk touchmove'u engellenirse o dokunuşun kaydırması tümüyle ölür).

   ARTIK KLASİK DÜZEN — iki ayrı bölge, birbirine karışmaz:
     1) BAŞLIK ŞERİDİ (tutamak çizgisi + başlık): yalnız burası sürüklenir.
        `touch-action: none` + pointer olayları; aşağı çekince ya da hızlı
        fiskeyle kapanır, yukarı çekmede direnç vardır.
     2) GÖVDE: ayrı bir kaydırma kutusu. Üzerinde HİÇBİR dokunma dinleyicisi,
        preventDefault ya da değişen touch-action YOK — kaydırma tamamen
        tarayıcının kendi kaydırması. `overscroll-behavior: contain` ile sona
        gelince arka sayfaya taşmaz.
   Kapatmanın öbür yolları: perdeye dokunmak, Esc.

   Korunanlar: giriş/çıkış geçişi (keyframe değil, aynı transform), sürükledikçe
   solan perde, perdede parmak kaydırınca arka sayfanın kaymaması (iOS),
   yatay telefon düzeni için `yp-altsayfa` sınıfı (bkz. yatayDuzen.js).
   Gövdeye kilit (body position:fixed) BİLEREK yok — iOS'ta kapanışta sayfa
   konumunu zıplatıyor.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useCallback } from "react"
import "./yatayDuzen"

const KAPANMA_SURESI = 220          // ms — çıkış geçişiyle aynı olmalı
const ESIK_PX = 90                  // bu kadar aşağı inerse kapanır
const HIZ_ESIGI = 0.5               // px/ms — fiske ile kapanma

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
  const bilgi = useRef({ id: null, basY: 0, basT: 0 })
  const suruklendi = useRef(false)
  const zamanlayici = useRef(null)
  const perdeRef = useRef(null)

  // Giriş: ilk karede kapalı, sonraki karede açık → geçiş devreye girer.
  useEffect(() => {
    const r = requestAnimationFrame(() => setAcildi(true))
    return () => {
      cancelAnimationFrame(r)
      if (zamanlayici.current) clearTimeout(zamanlayici.current)
    }
  }, [])

  const kapanmayaBasla = useCallback(() => {
    setKapaniyor(true)
    // Geçiş bitmeden unmount edilirse panel zıplayarak kaybolur; bekleniyor.
    zamanlayici.current = setTimeout(() => kapat?.(), KAPANMA_SURESI)
  }, [kapat])

  // Esc ile kapanma (masaüstü)
  useEffect(() => {
    const tus = (e) => { if (e.key === "Escape") kapanmayaBasla() }
    window.addEventListener("keydown", tus)
    return () => window.removeEventListener("keydown", tus)
  }, [kapanmayaBasla])

  // Perdede parmak kaydırması arka sayfaya geçmesin (iOS). Yalnız PERDEDE;
  // panelin kendisine dokunulmuyor. Perdeye dokunma = kapat (onClick) ayrı.
  useEffect(() => {
    const el = perdeRef.current
    if (!el) return
    const engel = (e) => { if (e.cancelable) e.preventDefault() }
    el.addEventListener("touchmove", engel, { passive: false })
    return () => el.removeEventListener("touchmove", engel)
  }, [])

  // ── BAŞLIK ŞERİDİNDEN SÜRÜKLEME ────────────────────────────────────────
  function basla(e) {
    if (kapaniyor || bilgi.current.id != null) return
    bilgi.current = { id: e.pointerId, basY: e.clientY, basT: performance.now() }
    suruklendi.current = false
    setSurukleniyor(true)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* eski tarayıcı */ }
  }
  function hareket(e) {
    if (bilgi.current.id !== e.pointerId) return
    const dy = e.clientY - bilgi.current.basY
    if (Math.abs(dy) > 3) suruklendi.current = true
    setKayma(dy > 0 ? dy : dy * 0.25)          // yukarı çekmede direnç
  }
  function bitir(e) {
    if (bilgi.current.id !== e.pointerId) return
    const dy = Math.max(0, e.clientY - bilgi.current.basY)
    const sure = Math.max(1, performance.now() - bilgi.current.basT)
    bilgi.current.id = null
    setSurukleniyor(false)
    if (dy > ESIK_PX || (suruklendi.current && dy / sure > HIZ_ESIGI)) kapanmayaBasla()
    else setKayma(0)
  }

  const yer = kapaniyor || !acildi ? "100%" : `${kayma}px`
  const perdeOran = kapaniyor ? 0 : Math.max(0, 1 - Math.max(0, kayma) / 320)

  return (
    <>
      <div
        ref={perdeRef}
        onClick={kapanmayaBasla}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          touchAction: "none",
          background: `rgba(0,0,0,${0.35 * (acildi ? perdeOran : 0)})`,
          transition: surukleniyor ? "none" : "background 0.22s ease",
        }}
      />

      <div
        className="yp-altsayfa"
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 301,
          maxWidth: maxGenislik, maxHeight: maxYukseklik, margin: "0 auto",
          display: "flex", flexDirection: "column", overflow: "hidden",
          background: theme.surface,
          borderTop: `1px solid ${theme.border}`,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.22)",
          transform: `translateY(${yer})`,
          transition: surukleniyor ? "none" : `transform ${KAPANMA_SURESI}ms cubic-bezier(.22,.61,.36,1)`,
        }}
      >
        {/* 1) BAŞLIK ŞERİDİ — tek sürükleme alanı. Dokunma hedefi çizgiden
            büyük tutuluyor; 4 px'lik çizgiyi yakalamak zor. */}
        <div
          onPointerDown={basla}
          onPointerMove={hareket}
          onPointerUp={bitir}
          onPointerCancel={bitir}
          // Sürükledikten sonra başlıktaki bir öğe tıklanmış sayılmasın
          onClickCapture={(e) => {
            if (suruklendi.current) { e.stopPropagation(); e.preventDefault() }
            suruklendi.current = false
          }}
          role="button"
          aria-label="Paneli kapatmak için aşağı sürükleyin"
          style={{
            flexShrink: 0,
            touchAction: "none",
            cursor: surukleniyor ? "grabbing" : "grab",
            padding: "0 20px",
            userSelect: "none", WebkitUserSelect: "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
            <div style={{
              width: "40px", height: "4px", borderRadius: "2px",
              background: theme.border,
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
        </div>

        {/* 2) GÖVDE — tarayıcının kendi kaydırması; hiçbir dokunma dinleyicisi yok. */}
        <div
          style={{
            flex: "1 1 auto", minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            padding: "0 20px calc(18px + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>
      </div>
    </>
  )
}
