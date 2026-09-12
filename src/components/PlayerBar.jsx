import { useRef, useEffect, useState } from "react"
import {
  Square, SkipBack, SkipForward, Glasses, Repeat, Gauge, Check, RotateCcw,
  Volume2, Volume1, VolumeX,
} from "lucide-react"
import { KARILAR } from "../data/hooks/useAudioPlayer"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import MushafPlayButton from "./MushafPlayButton"


export default function PlayerBar({
  player,
  sureler = [],
  theme,
  barKonum = "alt",
  barUiOlcegi,
  barGorunur = true,
  barYuksekligi = 0,
  playerBarYuksekligi,
  onOdaklan,
  onOlcum,
  onDonguAyar,          // döngü/tekrar ayar arayüzünü aç (KuranOkuma yönetir)
  tekrarAktif = false,  // bir tekrar modu seçili mi (buton vurgusu)
}) {
  const {
    durum, aktifAyet, kariId, duraklat, devamEt, durdur, oncekiAyet, sonrakiAyet,
    hiz = 1, hizAyarla, ses = 1, sesAyarla,
  } = player
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [hizAcik, setHizAcik] = useState(false)
  const [sesAcik, setSesAcik] = useState(false)
  // Sessize alınca eski seviyeyi hatırla → tekrar dokununca aynı seviyeye dön
  const oncekiSesRef = useRef(ses > 0 ? ses : 1)
  useEffect(() => { if (ses > 0) oncekiSesRef.current = ses }, [ses])
  const SesIkon = ses === 0 ? VolumeX : ses < 0.5 ? Volume1 : Volume2

  // Baloncuk (ses/hız kutusu): dışarı dokununca ve Esc ile kapanır.
  const baloncukRef = useRef(null)
  const sesDugmeRef = useRef(null)
  const hizDugmeRef = useRef(null)
  const baloncukAcik = sesAcik || hizAcik
  const kapatBaloncuk = () => { setSesAcik(false); setHizAcik(false) }
  useEffect(() => {
    if (!baloncukAcik) return
    const disari = (e) => {
      const t = e.target
      if (baloncukRef.current?.contains(t)) return
      if (sesDugmeRef.current?.contains(t) || hizDugmeRef.current?.contains(t)) return
      setSesAcik(false); setHizAcik(false)
    }
    const tus = (e) => { if (e.key === "Escape") { setSesAcik(false); setHizAcik(false) } }
    // "capture" değil: baloncuk içi tıklamalar zaten yukarıda eleniyor.
    document.addEventListener("pointerdown", disari)
    document.addEventListener("keydown", tus)
    return () => {
      document.removeEventListener("pointerdown", disari)
      document.removeEventListener("keydown", tus)
    }
  }, [baloncukAcik])

  // Gerçek yüksekliği ölç → ebeveyn (KuranOkuma) menü/içerik ofsetlerinde kullanır
  const rootRef = useRef(null)
  useEffect(() => {
    if (!rootRef.current || !onOlcum) return
    const ro = new ResizeObserver(() => {
      // offsetHeight = padding + border dahil (gerçek yükseklik)
      if (rootRef.current) onOlcum(Math.ceil(rootRef.current.offsetHeight))
    })
    ro.observe(rootRef.current)
    return () => ro.disconnect()
  }, [onOlcum, durum])

  if (durum === "kapali") return null

  const aktifSure = aktifAyet ? sureler.find(s => s.id === aktifAyet.sureNo) : null
  const aktifKari = KARILAR.find(k => k.id === kariId)

  const mainBarHeight = barYuksekligi || (isMobile ? 44 : 33)
  const playerBarHeight = playerBarYuksekligi

  // Bar görünürken oynatıcı barın iç kenarına bitişik; bar gizlenince
  // oynatıcı barın yerine (kenara) geçsin
  const getBottomPosition = () => (barKonum === "alt" ? (barGorunur ? `${mainBarHeight}px` : "0px") : "auto")
  const getTopPosition = () => (barKonum === "ust" ? (barGorunur ? `${mainBarHeight}px` : "0px") : "auto")

  const butonStil = (vurgulu = false) => ({
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    width: isMobile ? "30px" : "32px", 
    height: isMobile ? "30px" : "32px", 
    borderRadius: "50%",
    border: "none", 
    cursor: "pointer",
    background: vurgulu ? theme.accent : `${theme.accent}15`,
    color: vurgulu ? "#fff" : theme.accent,
    transition: "all 0.15s", 
    flexShrink: 0,
    touchAction: "manipulation",
  })

  const kucukButonStil = () => ({
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    width: isMobile ? "25px" : "26px", 
    height: isMobile ? "25px" : "26px", 
    borderRadius: "50%",
    border: "none", 
    cursor: "pointer",
    background: "transparent", 
    color: theme.textSecondary,
    transition: "all 0.15s", 
    flexShrink: 0,
    touchAction: "manipulation",
  })

  return (
    <div ref={rootRef} style={{
      position: "fixed",
      left: 0,
      right: 0,
      bottom: getBottomPosition(),
      top: getTopPosition(),
      minHeight: `${playerBarHeight}px`,
      height: "auto",
      background: theme.surface,
      borderTop: barKonum === "alt" ? `1px solid ${theme.accent}25` : "none",
      borderBottom: barKonum === "ust" ? `1px solid ${theme.accent}25` : "none",
      padding: isMobile ? "4px 16px" : "4px 24px",
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between",
      gap: isMobile ? "8px" : "12px",
      zIndex: 91,
      boxShadow: barKonum === "alt"
        ? `0 -2px 12px ${theme.accent}10`
        : `0 2px 12px ${theme.accent}10`,
      transition: "bottom 0.3s ease, top 0.3s ease, opacity 0.3s ease",
      opacity: 1,
      pointerEvents: "auto",
      // Baloncuk barın DIŞINA taştığı için açıkken kırpma kapatılır; kapalıyken
      // uzun sûre adlarının bardan taşmaması için yine gizlenir.
      overflow: baloncukAcik ? "visible" : "hidden",
      maxWidth: "100%",
      boxSizing: "border-box",
    }}>
      {/* SES / HIZ BALONCUĞU — barın TAMAMINI kaplamaz; düğmesinin üstünde (ya da bar
          üstteyse altında) küçük bir kutu olarak açılır. Böylece sûre·âyet bilgisi ve
          oynatma düğmeleri gözden kaybolmaz, ayar için ekranın bir ucundan öbürüne
          gitmek gerekmez. Dışarı dokununca veya Esc ile kapanır. */}
      {(sesAcik || hizAcik) && (
        <div
          ref={baloncukRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute",
            right: isMobile ? "10px" : "24px",
            bottom: barKonum === "alt" ? "calc(100% + 8px)" : "auto",
            top: barKonum === "ust" ? "calc(100% + 8px)" : "auto",
            width: isMobile ? "min(72vw, 250px)" : "260px",
            maxWidth: "calc(100vw - 20px)",
            background: theme.surface,
            border: `1px solid ${theme.accent}33`,
            borderRadius: "12px",
            boxShadow: barKonum === "alt"
              ? "0 -6px 22px rgba(0,0,0,0.22)"
              : "0 6px 22px rgba(0,0,0,0.22)",
            padding: isMobile ? "7px 9px" : "8px 10px",
            display: "flex", alignItems: "center", gap: "8px",
            zIndex: 3,
          }}
        >
          {sesAcik ? (<>
            {/* Simgeye dokunmak sessize alır / eski seviyeye döndürür */}
            <button
              onClick={() => sesAyarla && sesAyarla(ses === 0 ? (oncekiSesRef.current || 1) : 0)}
              title={ses === 0 ? "Sesi aç" : "Sessize al"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "26px", height: "26px", borderRadius: "50%", border: "none",
                background: "transparent", color: ses === 0 ? "#c0392b" : theme.accent,
                cursor: "pointer", flexShrink: 0, padding: 0,
              }}
            >
              <SesIkon size={16} />
            </button>
            <input type="range" min={0} max={1} step={0.01} value={ses}
              onChange={e => sesAyarla && sesAyarla(parseFloat(e.target.value))}
              style={{ flex: 1, minWidth: 0, accentColor: theme.accent, cursor: "pointer" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: theme.accent, minWidth: "34px", textAlign: "right", flexShrink: 0 }}>
              %{Math.round(ses * 100)}
            </span>
            <button onClick={() => sesAyarla && sesAyarla(1)} title="Tam sese getir"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "26px", height: "26px", borderRadius: "50%", cursor: "pointer", flexShrink: 0,
                border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary,
              }}>
              <RotateCcw size={13} />
            </button>
          </>) : (<>
            <Gauge size={16} color={theme.accent} style={{ flexShrink: 0 }} />
            <input type="range" min={0.5} max={2} step={0.05} value={hiz}
              onChange={e => hizAyarla && hizAyarla(parseFloat(e.target.value))}
              style={{ flex: 1, minWidth: 0, accentColor: theme.accent, cursor: "pointer" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: theme.accent, minWidth: "34px", textAlign: "right", flexShrink: 0 }}>
              {hiz}×
            </span>
            <button onClick={() => hizAyarla && hizAyarla(1)} title="1×'e getir"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "26px", height: "26px", borderRadius: "50%", cursor: "pointer", flexShrink: 0,
                border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary,
              }}>
              <RotateCcw size={13} />
            </button>
          </>)}
          <button onClick={kapatBaloncuk} title="Kapat"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "26px", height: "26px", borderRadius: "50%", border: "none",
              cursor: "pointer", background: theme.accent, color: "#fff", flexShrink: 0, padding: 0,
            }}>
            <Check size={14} />
          </button>
        </div>
      )}

      {/* SOL grup: (sure·ayet + kâri adı) → Gözlük → Döngü */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "4px" : "6px",
        flex: "0 1 auto",
        minWidth: 0,
        paddingLeft: isMobile ? "3%" : "1%",
      }}>
        {/* sure · ayet · kari adı (yeri/gösterimi aynı) */}
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{
            fontSize: `${Math.round((isMobile ? 12 : 11) * barUiOlcegi)}px`,
            fontWeight: "500",
            color: theme.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: "1.2",
          }}>
            {aktifSure
              ? (aktifAyet.besmeleIcin
                  ? "Bismillahirrahmanirrahim"
                  : `${aktifSure.isim} ${isMobile ? '·' : '·'} ${aktifAyet.ayetNo}`)
              : "Besmele"}
          </div>
          <div style={{
            fontSize: `${Math.round((isMobile ? 10 : 11) * barUiOlcegi)}px`,
            color: theme.textSecondary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            opacity: 0.7,
          }}>
            {aktifKari?.label || kariId}
          </div>
        </div>

        {/* GÖZLÜK */}
        <button
          onClick={onOdaklan}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: isMobile ? "28px" : "30px", height: isMobile ? "28px" : "30px", borderRadius: "50%",
            border: "none", cursor: "pointer", background: "transparent", color: theme.textSecondary,
            transition: "all 0.15s", flexShrink: 0, touchAction: "manipulation", padding: 0,
          }}
          title="Okunan ayete odaklan"
        >
          <Glasses size={isMobile ? 17 : 19} />
        </button>

        {/* DÖNGÜ / TEKRAR — ayar arayüzünü açar (sayfa/ayet/sure tekrarı) */}
        <button
          onClick={onDonguAyar}
          title="Tekrar (döngü) ayarları"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: isMobile ? "27px" : "29px", height: isMobile ? "27px" : "29px", borderRadius: "50%",
            border: "none", cursor: "pointer", flexShrink: 0, touchAction: "manipulation", padding: 0,
            background: tekrarAktif ? theme.accent : "transparent",
            color: tekrarAktif ? "#fff" : theme.textSecondary,
          }}
        >
          <Repeat size={isMobile ? 15 : 16} />
        </button>
      </div>

      {/* SAĞ grup: Çalma hızı → oynatma butonları */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "4px" : "6px",
        flexShrink: 0,
        marginRight: isMobile ? "3%" : "1%",
      }}>
        {/* SES — dokununca bar yatay ses kaydırıcısına döner (yukarıdaki sesAcik dalı).
            Uzun basmak gerekmez; seviye kalıcıdır (localStorage). */}
        <button
          ref={sesDugmeRef}
          onClick={() => { setHizAcik(false); setSesAcik(v => !v) }}
          title={ses === 0 ? "Ses kapalı — açmak için dokunun" : `Ses %${Math.round(ses * 100)}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: isMobile ? "27px" : "29px", height: isMobile ? "27px" : "29px", borderRadius: "50%",
            border: "none", cursor: "pointer", flexShrink: 0, touchAction: "manipulation", padding: 0,
            background: sesAcik ? `${theme.accent}33` : ses !== 1 ? `${theme.accent}22` : "transparent",
            color: ses === 0 ? "#c0392b" : (sesAcik || ses !== 1) ? theme.accent : theme.textSecondary,
          }}
        >
          <SesIkon size={isMobile ? 16 : 17} />
        </button>

        {/* ÇALMA HIZI — dokununca üstte küçük baloncuk açılır (bar olduğu gibi kalır) */}
        <button
          ref={hizDugmeRef}
          onClick={() => { setSesAcik(false); setHizAcik(v => !v) }}
          title="Çalma hızı"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "2px",
            minWidth: isMobile ? "36px" : "40px", height: isMobile ? "27px" : "29px", borderRadius: "14px",
            border: "none", cursor: "pointer", flexShrink: 0, touchAction: "manipulation", padding: "0 6px",
            background: hizAcik ? `${theme.accent}33` : hiz !== 1 ? `${theme.accent}22` : "transparent",
            color: (hizAcik || hiz !== 1) ? theme.accent : theme.textSecondary,
            fontSize: `${Math.round((isMobile ? 10 : 11) * (barUiOlcegi || 1))}px`, fontWeight: 600, fontFamily: "inherit",
          }}
        >
          <Gauge size={isMobile ? 16 : 17} />{hiz}×
        </button>

        {/* Kontrol butonları */}
        <button 
          onClick={oncekiAyet} 
          style={kucukButonStil()} 
          title="Önceki âyet"
          onMouseEnter={e => e.currentTarget.style.background = `${theme.accent}12`}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          onTouchStart={e => e.currentTarget.style.background = `${theme.accent}20`}
          onTouchEnd={e => e.currentTarget.style.background = "transparent"}
        >
          <SkipBack size={isMobile ? 15 : 14} />
        </button>
        
        {/* OYNAT / DURAKLAT — sûre başlığındaki ile AYNI mushaf düğmesi.
            Çalarken göbek durdur (duraklat) simgesine döner ve tezhip yavaşça döner
            (mushafSpin animasyonu bileşenin kendi içinde tanımlı). Bar dar olduğu için
            sûre başlığındaki 48px'ten belli oranda küçültüldü. */}
        <button
          onClick={durum === "caliyor" ? duraklat : devamEt}
          title={durum === "caliyor" ? "Duraklat" : "Devam et"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", cursor: "pointer",
            padding: "0 2px", lineHeight: 0, flexShrink: 0,
            color: theme.accent, opacity: 0.9, transition: "opacity 0.2s",
            touchAction: "manipulation",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.9"}
        >
          <MushafPlayButton
            ac={theme.accent}
            playing={durum === "caliyor"}
            size={isMobile ? 34 : 32}
          />
        </button>

        <button 
          onClick={durdur} 
          style={butonStil(false)} 
          title="Durdur ve kapat"
        >
          <Square size={isMobile ? 14 : 13} fill={theme.accent} />
        </button>
        
        <button 
          onClick={sonrakiAyet} 
          style={kucukButonStil()} 
          title="Sonraki âyet"
          onMouseEnter={e => e.currentTarget.style.background = `${theme.accent}12`}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          onTouchStart={e => e.currentTarget.style.background = `${theme.accent}20`}
          onTouchEnd={e => e.currentTarget.style.background = "transparent"}
        >
          <SkipForward size={isMobile ? 15 : 14} />
        </button>
      </div>
    </div>
  )
}