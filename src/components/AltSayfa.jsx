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

   ── 26 EKİM 2026: KAPANMA KARARI (bilinen alt sayfa mantığı) ───────────────
   Kullanıcı: "Biraz aşağı sürükleyip belirli bir noktayı geçip bırakırsam panel
   kapanmalı, hemen yukarıdayken bıraktığımda kapanmamalı. Aşağı çekip vazgeçip
   yukarı geri sürüklediğimde az sürüklesem de açık kalmalı."
   ESKİ HATA: hız başlangıçtan bırakışa ORTALAMA idi; kısa ve çabuk bir dokunuş
   "fiske" sayılıp kapatıyordu, geri çekilen hareketin yönü hesaba girmiyordu.
   Karar artık BIRAKMA ANINDA ve ortak kancada: data/hooks/useCekKapat.js
   (Lügat araması ve paylaşım penceresi de aynı kancayı kullanıyor).
   Eşik geçilince tutamak çizgisi vurgu rengine döner: "bırakılırsa kapanır".

   Korunanlar: giriş/çıkış geçişi (keyframe değil, aynı transform), sürükledikçe
   solan perde, perdede parmak kaydırınca arka sayfanın kaymaması (iOS),
   yatay telefon düzeni için `yp-altsayfa` sınıfı (bkz. yatayDuzen.js).
   Gövdeye kilit (body position:fixed) BİLEREK yok — iOS'ta kapanışta sayfa
   konumunu zıplatıyor.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react"
import "./yatayDuzen"
import { useCekKapat } from "../data/hooks/useCekKapat"

export default function AltSayfa({
  kapat,
  theme,
  baslik = null,
  children,
  maxGenislik = "520px",
  maxYukseklik = "82vh",
}) {
  const [acildi, setAcildi] = useState(false)
  const perdeRef = useRef(null)
  const panelRef = useRef(null)
  const ck = useCekKapat({ kapat, kutuRef: panelRef })
  const { kayma, surukleniyor, kapaniyor, kapanmayaBasla } = ck

  // Giriş: ilk karede kapalı, sonraki karede açık → geçiş devreye girer.
  useEffect(() => {
    const r = requestAnimationFrame(() => setAcildi(true))
    return () => cancelAnimationFrame(r)
  }, [])

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

  const yer = kapaniyor || !acildi ? "100%" : `${kayma}px`
  const perdeOran = kapaniyor ? 0 : Math.max(0, 1 - Math.max(0, kayma) / 320)
  const esikGecildi = ck.esikGecildi

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
        ref={panelRef}
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
          transition: ck.gecis,
        }}
      >
        {/* 1) BAŞLIK ŞERİDİ — tek sürükleme alanı. Dokunma hedefi çizgiden
            büyük tutuluyor; 4 px'lik çizgiyi yakalamak zor. */}
        <div
          {...ck.tutamak}
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
              background: esikGecildi ? theme.accent : theme.border,
              opacity: surukleniyor ? 1 : 0.85,
              transform: surukleniyor ? "scaleX(1.25)" : "none",
              transition: "transform 0.15s ease, opacity 0.15s ease, background 0.15s ease",
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
