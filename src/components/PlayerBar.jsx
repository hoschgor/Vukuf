import { useRef, useEffect, useState } from "react"
import {
  Square, SkipBack, SkipForward, Glasses, Gauge, RotateCcw, ChevronRight, ChevronLeft, Crosshair,
  Volume2, Volume1, VolumeX, SlidersHorizontal, Timer,
} from "lucide-react"
import { SemseAmblem, NABIZ_CSS } from "./MiniOynatici"
import { useHapKonumu } from "./DonusDugmesi"

/* ── OTOMATİK GİZLEME (18 Ekim 2026) ──────────────────────────────────────────
   Kullanıcı: "KuranOkuma ve OkumaEkranındaki oynatıcılara otomatik gizleme ayarı
   ekleyelim, saniye seçilebilsin; açıkken playerbar mini moda geçsin ve sürüklenebilsin.
   Mini moddan çıkarıldığında KuranOkuma'da eski yerine (barda seçili konuma göre alt ya
   da üst) geri dönsün."
   Açıksa oynatıcıya `sn` saniye dokunulmayınca (ses/hız kutusu kapalıyken) bar kalkar,
   yerine şemse amblemli tek yuvarlak düğme (MiniOynatici'nin küçük hâliyle aynı) çıkar.
   Düğme sürüklenir, yeri "vukuf-hap-konum-kuran-kucuk"te saklanır; dokununca oynatıcı
   barın yanındaki ESKİ yerinde (alt/üst) açılır. Ses çalmayı sürdürür.
   Ayar: localStorage "vukuf-oynatici-gizle" = { acik, sn } (sn 3–30, varsayılan 8). */
const GIZLE_ANAHTAR = "vukuf-oynatici-gizle"
function gizleOku() {
  try {
    const v = JSON.parse(localStorage.getItem(GIZLE_ANAHTAR) || "null")
    if (v && typeof v === "object") return { acik: !!v.acik, sn: Math.max(3, Math.min(30, Number(v.sn) || 8)) }
  } catch { /* yoksay */ }
  return { acik: false, sn: 8 }
}

function KuranKucuk({ theme, calar, barKonum, altPay, ustPay, ac: acFn }) {
  const ac = theme.accent
  const k = useHapKonumu({ ad: "kuran-kucuk", yan: "sag", altta: barKonum !== "ust", altPay, ustPay, kaydirGecir: true })
  return (
    <>
      <style>{NABIZ_CSS}</style>
      <div ref={k.ref} className="vukuf-hap" {...k.olaylar}
        style={{ ...k.stil, zIndex: k.surukleniyor ? 130 : 96, "--hap-kay": "8px", "--mini-ac": ac }}>
        <button onClick={acFn} aria-label="Oynatıcıyı aç" title="Oynatıcıyı aç"
          style={{
            position: "relative", width: "46px", height: "46px", borderRadius: "50%", padding: 0, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: theme.surface, border: `1px solid ${ac}`, color: ac,
            boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.22)",
          }}>
          {calar && <span className="vukuf-mini-nabiz" aria-hidden="true" />}
          <SemseAmblem ac={ac} zemin={theme.surface} calar={calar} />
        </button>
      </div>
    </>
  )
}
import { KARILAR } from "../data/hooks/useAudioPlayer"
import { useArkaCalma, useOtomatikDurdurma, UYKU_SURELERI } from "../data/oynatici"
import { useOdak, surekliAyarla } from "../data/odak"
import OtomatikDurdurmaSecici from "./OtomatikDurdurmaSecici"
import OdakKonumAyari from "./OdakKonumAyari"

/* GÖRÜNÜM VE KONUM (4 Kasım 2026) — kullanıcı: "Playerbar altayken çok içte kalıyor,
   padding gibi bir şey ile biraz daha üste alalım fakat çok abartmayalım. Belki opaklık ve
   konum değeri kullanıp bunu da playerbar ayarları içine koyabiliriz … bu karışık ayarları
   bu bölümde ayrı bir yere alıp sadeliği bozmayalım."
   • Bar ekranın alt kenarındayken (ana bar gizli / menülü düzen) içerik telefonun alt
     çizgisinden biraz yukarı alınır: alt iç boşluk = max(0, güvenli alan − 12 px) + seçilen
     ek boşluk (0–24 px, varsayılan 4). Zemin kenara kadar uzanır, yalnız içerik yükselir.
   • Opaklık iki ayrı değer (4 Kasım 2026, kullanıcı: "arka planı daha az opak olsun,
     butonlar daha fazla opak olsun"): ZEMİN %20–100 (100'ün altında arkası hafifçe
     bulanıklaşır) ve DÜĞMELER %40–100 — zemin saydamlaşınca düğmelerin ve sûre yazısının
     arkasına kendi küçük zemini çizilir (düğmenin kendi rengi bozulmadan, altında).
   • Âyetin karşılanacağı yer → OdakKonumAyari (sürüklemeli önizleme).
   Hepsi ayar kutusunun en altındaki "Görünüm ve konum" sayfasında. */
const GORUNUM_ANAHTAR = "vukuf-oynatici-gorunum"
const GORUNUM_VARSAYILAN = { bosluk: 4, zemin: 1, dugme: 0.92 }
const gorunumOku = () => {
  try {
    const k = JSON.parse(localStorage.getItem(GORUNUM_ANAHTAR) || "null") || {}
    if (k.opak != null && k.zemin == null) k.zemin = k.opak          // eski tek "opak" değeri → zemin
    delete k.opak
    return { ...GORUNUM_VARSAYILAN, ...k }
  } catch { return { ...GORUNUM_VARSAYILAN } }
}
import { Headphones, Music2, Moon } from "lucide-react"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import MushafPlayButton from "./MushafPlayButton"

/* ── ÇEVİRİ (MEAL) ve İZLEME SİMGELERİ ───────────────────────────────────────
   lucide'da ikisinin de karşılığı yok: "Languages" Latin-Latin, "Maximize" ise
   yalnız tam ekran anlatıyor. Bu yüzden elde çizildiler; ikisi de 24'lük ızgara,
   `currentColor` ve düğmenin kendi rengini alıyor. Çeviri simgesi Arapça kâse +
   nokta → ok → Latin "A" düzeninde; izleme simgesi tam ekran köşeleri + oynat. */
function CeviriIkonu({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.4 3.2c0 4.3 1.9 6.6 4.4 6.6s4.4-2.3 4.4-6.6" />
      <circle cx="6.8" cy="12.1" r="1" fill="currentColor" stroke="none" />
      <path d="M12.3 22 16.8 12.1h1.3L22.6 22" />
      <path d="M14.1 19.1h6.6" />
      <path d="M2.6 16.6h5.6" />
      <path d="M6.7 14.9l1.7 1.7-1.7 1.7" />
    </svg>
  )
}
function IzlemeIkonu({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.2V4.6A1.6 1.6 0 0 1 4.6 3H8.2" />
      <path d="M15.8 3h3.6A1.6 1.6 0 0 1 21 4.6v3.6" />
      <path d="M21 15.8v3.6a1.6 1.6 0 0 1-1.6 1.6h-3.6" />
      <path d="M8.2 21H4.6A1.6 1.6 0 0 1 3 19.4v-3.6" />
      <path d="M10.3 9v6l5-3z" fill="currentColor" stroke="none" />
    </svg>
  )
}


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
  odakDurum = "kapali",   // gözlük: "kapali" | "acik" (okunan âyeti takip) | "askida" (elle kaydırıldı)
  onOlcum,
  onDonguAyar,          // döngü/tekrar ayar arayüzünü aç (KuranOkuma yönetir)
  tekrarAktif = false,  // bir tekrar modu seçili mi (buton vurgusu)
  // Meal ve izleme modları — ayar dişlisi BAR'A KONMADI: ortak ayar paneline meal
  // penceresinin kenarından ve izleme ekranından giriliyor, bar kalabalıklaşmasın.
  onCeviri, ceviriAktif = false,
  onIzleme, izlemeAktif = false,
}) {
  const {
    durum, aktifAyet, kariId, duraklat, devamEt, durdur, oncekiAyet, sonrakiAyet,
    hiz = 1, hizAyarla, ses = 1, sesAyarla,
  } = player
  // Oynatıcıdan kâri değişince çalma kesilmesin (aynı âyetten yeni sesle sürer)
  const setKariId = player.kariDegistir || player.setKariId
  // OTOMATİK DURDURMA (uyku zamanlayıcısı) — data/oynatici.jsx
  const uyku = useOtomatikDurdurma()
  const uykuKalan = uyku.bitis ? Math.max(1, Math.ceil((uyku.bitis - Date.now()) / 60000)) : 0
  const isMobile = useMediaQuery("(max-width: 768px)")
  // SES + HIZ TEK MENÜDE (28 Eylül 2026). Kullanıcı: bar fazla doluydu, kâri adı
  // görünmüyordu; ayrı ses ve hız düğmeleri yerine "sonraki âyet" düğmesinin
  // sağında tek düğme, yukarı doğru açılan ince menü. Döngü düğmesi de bardan
  // kalktı (aşağıdaki ana barda zaten var).
  const [ayarAcik, setAyarAcik] = useState(false)
  const [altPanel, setAltPanel] = useState(null)          // null | "gorunum"
  useEffect(() => { if (!ayarAcik) setAltPanel(null) }, [ayarAcik])
  const [gorunum, setGorunumDurum] = useState(gorunumOku)
  const setGorunum = (p) => setGorunumDurum(o => { const y = { ...o, ...p }; try { localStorage.setItem(GORUNUM_ANAHTAR, JSON.stringify(y)) } catch { /* yoksay */ } return y })
  const [konumAyarAcik, setKonumAyarAcik] = useState(false)
  // DEVAMLI OYNATMA (6 Ekim 2026): açıksa Kur'ân ekranından çıkınca ses sürer,
  // öbür ekranlarda mini oynatıcı görünür (components/MiniOynatici.jsx)
  const [arkaCalma, setArkaCalma] = useArkaCalma()
  // SÜREKLİ ODAK (4 Kasım 2026) — data/odak.js
  const odakDurumu = useOdak()
  // Sessize alınca eski seviyeyi hatırla → tekrar dokununca aynı seviyeye dön
  const oncekiSesRef = useRef(ses > 0 ? ses : 1)
  useEffect(() => { if (ses > 0) oncekiSesRef.current = ses }, [ses])
  const SesIkon = ses === 0 ? VolumeX : ses < 0.5 ? Volume1 : Volume2

  // OTOMATİK GİZLEME (bkz. dosya başı)
  const [gizle, setGizleDurum] = useState(gizleOku)
  const setGizle = (p) => setGizleDurum(g => {
    const y = { ...g, ...p }
    try { localStorage.setItem(GIZLE_ANAHTAR, JSON.stringify(y)) } catch { /* kota */ }
    return y
  })
  const [kucuk, setKucuk] = useState(false)
  const [dokunus, setDokunus] = useState(0)
  useEffect(() => { if (!gizle.acik) setKucuk(false) }, [gizle.acik])
  useEffect(() => { if (durum === "kapali") setKucuk(false) }, [durum])
  useEffect(() => {
    if (!gizle.acik || kucuk || ayarAcik || durum === "kapali") return
    const t = setTimeout(() => setKucuk(true), gizle.sn * 1000)
    return () => clearTimeout(t)
  }, [gizle.acik, gizle.sn, kucuk, ayarAcik, durum, dokunus])

  // Baloncuk (ses/hız kutusu): dışarı dokununca ve Esc ile kapanır.
  const baloncukRef = useRef(null)
  const ayarDugmeRef = useRef(null)
  const baloncukAcik = ayarAcik
  useEffect(() => {
    if (!baloncukAcik) return
    const disari = (e) => {
      const t = e.target
      if (baloncukRef.current?.contains(t)) return
      if (ayarDugmeRef.current?.contains(t)) return
      setAyarAcik(false)
    }
    const tus = (e) => { if (e.key === "Escape") setAyarAcik(false) }
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
    if (kucuk && onOlcum) { onOlcum(0); return }          // küçükken bar yer kaplamıyor
    if (!rootRef.current || !onOlcum) return
    const ro = new ResizeObserver(() => {
      // offsetHeight = padding + border dahil (gerçek yükseklik)
      if (rootRef.current) onOlcum(Math.ceil(rootRef.current.offsetHeight))
    })
    ro.observe(rootRef.current)
    return () => ro.disconnect()
  }, [onOlcum, durum, kucuk])

  if (durum === "kapali") return null

  const aktifSure = aktifAyet ? sureler.find(s => s.id === aktifAyet.sureNo) : null
  const aktifKari = KARILAR.find(k => k.id === kariId)

  const mainBarHeight = barYuksekligi || (isMobile ? 44 : 33)
  const playerBarHeight = playerBarYuksekligi

  // Bar görünürken oynatıcı barın iç kenarına bitişik; bar gizlenince
  // oynatıcı barın yerine (kenara) geçsin
  if (kucuk) {
    return (
      <KuranKucuk theme={theme} calar={durum === "caliyor"} barKonum={barKonum}
        altPay={barKonum === "alt" && barGorunur ? mainBarHeight : 0}
        ustPay={barKonum === "ust" && barGorunur ? mainBarHeight : 0}
        ac={() => { setKucuk(false); setDokunus(n => n + 1) }} />
    )
  }

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

  // Ses/hız menüsü satır stilleri
  const satirStil = { display: "flex", alignItems: "center", gap: "7px", padding: "4px 0" }
  const ikonDugme = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "26px", height: "26px", borderRadius: "50%", border: "none",
    background: "transparent", cursor: "pointer", flexShrink: 0, padding: 0,
  }
  const degerStil = { fontSize: "12px", fontWeight: 700, color: theme.accent, minWidth: "34px", textAlign: "right", flexShrink: 0 }
  const sifirStil = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "24px", height: "24px", borderRadius: "50%", cursor: "pointer", flexShrink: 0, padding: 0,
    border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary,
  }

  return (
    <div ref={rootRef} className={gorunum.zemin < 1 ? "vk-pb-saydam" : undefined} onPointerDownCapture={() => setDokunus(n => n + 1)} style={{
      position: "fixed",
      left: 0,
      right: 0,
      bottom: getBottomPosition(),
      top: getTopPosition(),
      minHeight: `${playerBarHeight}px`,
      height: "auto",
      background: gorunum.zemin < 1 ? `color-mix(in srgb, ${theme.surface} ${Math.round(gorunum.zemin * 100)}%, transparent)` : theme.surface,
      ...(gorunum.zemin < 1 ? { backdropFilter: "blur(10px) saturate(1.15)", WebkitBackdropFilter: "blur(10px) saturate(1.15)" } : null),
      borderTop: barKonum === "alt" ? `1px solid ${theme.accent}25` : "none",
      borderBottom: barKonum === "ust" ? `1px solid ${theme.accent}25` : "none",
      padding: isMobile ? "4px 16px" : "4px 24px",
      // Ekranın alt kenarındayken içerik telefonun alt çizgisinden biraz yukarıda dursun
      ...(barKonum === "alt" && !barGorunur
        ? { paddingBottom: `calc(4px + max(0px, env(safe-area-inset-bottom) - 12px) + ${gorunum.bosluk}px)` }
        : null),
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between",
      gap: isMobile ? "8px" : "12px",
      // Menü açıkken meal penceresinin (z 92) ÜSTÜNE çıkar — menü barın dışına,
      // pencerenin bulunduğu yere taşıyor ve altında kalıyordu. Kapalıyken eski
      // sıra korunuyor (meal penceresi bara yakın durduğunda davranış değişmesin).
      zIndex: baloncukAcik ? 95 : 91,
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
      {gorunum.zemin < 1 && (
        <style>{`
          .vk-pb-saydam .vk-pb-grup { isolation: isolate; }
          .vk-pb-saydam .vk-pb-grup > button { position: relative; }
          .vk-pb-saydam .vk-pb-grup > button::before {
            content: ""; position: absolute; inset: -2px; border-radius: 999px; z-index: -1; pointer-events: none;
            background: color-mix(in srgb, ${theme.surface} ${Math.round(gorunum.dugme * 100)}%, transparent);
            box-shadow: 0 1px 4px rgba(0,0,0,${(0.16 * gorunum.dugme).toFixed(2)});
          }
          .vk-pb-saydam .vk-pb-metin {
            border-radius: 10px; padding: 2px 8px;
            background: color-mix(in srgb, ${theme.surface} ${Math.round(gorunum.dugme * 100)}%, transparent);
          }
        `}</style>
      )}
      {/* SES / HIZ BALONCUĞU — barın TAMAMINI kaplamaz; düğmesinin üstünde (ya da bar
          üstteyse altında) küçük bir kutu olarak açılır. Böylece sûre·âyet bilgisi ve
          oynatma düğmeleri gözden kaybolmaz, ayar için ekranın bir ucundan öbürüne
          gitmek gerekmez. Dışarı dokununca veya Esc ile kapanır. */}
      {ayarAcik && (
        <div
          ref={baloncukRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute",
            right: isMobile ? "8px" : "20px",
            bottom: barKonum === "alt" ? "calc(100% + 8px)" : "auto",
            top: barKonum === "ust" ? "calc(100% + 8px)" : "auto",
            width: isMobile ? "min(70vw, 236px)" : "250px",
            maxWidth: "calc(100vw - 16px)",
            background: theme.surface,
            border: `1px solid ${theme.accent}33`,
            borderRadius: "14px",
            boxShadow: barKonum === "alt"
              ? "0 -6px 22px rgba(0,0,0,0.22)"
              : "0 6px 22px rgba(0,0,0,0.22)",
            padding: "6px 8px",
            display: "flex", flexDirection: "column", gap: "2px",
            // kâri ve otomatik durdurma eklenince uzadı: kısa ekranda kaydırılabilsin
            maxHeight: "min(70vh, 520px)", overflowY: "auto", overscrollBehavior: "contain",
            zIndex: 3,
          }}
        >
          {altPanel === "gorunum" ? (
            <GorunumPaneli theme={theme} gorunum={gorunum} setGorunum={setGorunum} geri={() => setAltPanel(null)}
              konumAc={() => { setAyarAcik(false); setKonumAyarAcik(true) }}
              satirStil={satirStil} ikonDugme={ikonDugme} degerStil={degerStil} sifirStil={sifirStil}
              kenarda={barKonum === "alt" && !barGorunur} />
          ) : (<>
          {/* SES — simgeye dokunmak sessize alır / eski seviyeye döndürür */}
          <div style={satirStil}>
            <button
              onClick={() => sesAyarla && sesAyarla(ses === 0 ? (oncekiSesRef.current || 1) : 0)}
              title={ses === 0 ? "Sesi aç" : "Sessize al"}
              style={{ ...ikonDugme, color: ses === 0 ? "#c0392b" : theme.accent }}
            >
              <SesIkon size={16} />
            </button>
            <input type="range" min={0} max={1} step={0.01} value={ses}
              aria-label="Ses seviyesi"
              onChange={e => sesAyarla && sesAyarla(parseFloat(e.target.value))}
              style={{ flex: 1, minWidth: 0, accentColor: theme.accent, cursor: "pointer" }} />
            <span style={degerStil}>%{Math.round(ses * 100)}</span>
            <button onClick={() => sesAyarla && sesAyarla(1)} title="Tam sese getir" style={sifirStil}>
              <RotateCcw size={12} />
            </button>
          </div>
          <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "0 2px" }} />
          {/* HIZ */}
          <div style={satirStil}>
            <span style={{ ...ikonDugme, cursor: "default" }}><Gauge size={16} color={theme.accent} /></span>
            <input type="range" min={0.5} max={2} step={0.05} value={hiz}
              aria-label="Çalma hızı"
              onChange={e => hizAyarla && hizAyarla(parseFloat(e.target.value))}
              style={{ flex: 1, minWidth: 0, accentColor: theme.accent, cursor: "pointer" }} />
            <span style={degerStil}>{hiz}×</span>
            <button onClick={() => hizAyarla && hizAyarla(1)} title="1×'e getir" style={sifirStil}>
              <RotateCcw size={12} />
            </button>
          </div>
          <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "0 2px" }} />
          {/* KÂRÎ — 3 Kasım 2026 (kullanıcı: "Playerbar içine karileri alalım, hız ayarı altına") */}
          {setKariId && (
            <div style={satirStil}>
              <span style={{ ...ikonDugme, cursor: "default" }}><Music2 size={16} color={theme.accent} /></span>
              <select value={kariId || ""} aria-label="Kârî (okuyucu)"
                onChange={e => setKariId(e.target.value)}
                style={{
                  flex: 1, minWidth: 0, padding: "5px 8px", borderRadius: "8px", fontFamily: "inherit",
                  fontSize: "12px", color: theme.text, background: theme.background,
                  border: `1px solid ${theme.border}`, cursor: "pointer",
                }}>
                {(player.KARILAR || KARILAR).map(k => <option key={k.id} value={k.id}>{k.label || k.isim || k.id}</option>)}
              </select>
            </div>
          )}
          <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "0 2px" }} />
          {/* OTOMATİK DURDURMA — seçilen (ya da özel) süre sonunda oynatıcı kapanır; ortak seçici */}
          <OtomatikDurdurmaSecici theme={theme} uyku={uyku} girinti={24}
            aciklama="Seçilen süre sonunda oynatıcı kapanır" />
          <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "0 2px" }} />
          {/* DEVAMLI OYNATMA — satırın tamamı dokunulabilir; sağda küçük anahtar */}
          <div role="switch" aria-checked={arkaCalma} onClick={() => setArkaCalma(!arkaCalma)}
            title="Kur'ân ekranından çıkınca da çalmaya devam etsin (öbür ekranlarda küçük oynatıcı görünür)"
            style={{ ...satirStil, cursor: "pointer" }}>
            <span style={{ ...ikonDugme, cursor: "pointer" }}><Headphones size={16} color={arkaCalma ? theme.accent : theme.textSecondary} /></span>
            <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text, lineHeight: 1.25 }}>
              Devamlı oynatma
              <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>Ekrandan çıkınca da çalsın</span>
            </span>
            <span aria-hidden="true" style={{
              width: "30px", height: "18px", borderRadius: "999px", flexShrink: 0, position: "relative",
              background: arkaCalma ? theme.accent : `${theme.textSecondary}44`, transition: "background .15s ease",
            }}>
              <span style={{
                position: "absolute", top: "2px", left: arkaCalma ? "14px" : "2px",
                width: "14px", height: "14px", borderRadius: "50%", background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left .15s ease",
              }} />
            </span>
          </div>
          <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "0 2px" }} />
          {/* SÜREKLİ ODAK — mushaf okunan âyeti takip eder; öbür ekranlarda odak penceresi açık kalır */}
          <div role="switch" aria-checked={odakDurumu.surekli} onClick={() => surekliAyarla(!odakDurumu.surekli)}
            title="Kur'ân ekranında okunan âyet hep takip edilsin; ekrandan çıkınca okunan âyetler odak penceresinde görünsün"
            style={{ ...satirStil, cursor: "pointer" }}>
            <span style={{ ...ikonDugme, cursor: "pointer" }}><Glasses size={16} color={odakDurumu.surekli ? theme.accent : theme.textSecondary} /></span>
            <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text, lineHeight: 1.25 }}>
              Sürekli odak
              <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>Okunan âyet hep takip edilsin</span>
            </span>
            <span aria-hidden="true" style={{
              width: "30px", height: "18px", borderRadius: "999px", flexShrink: 0, position: "relative",
              background: odakDurumu.surekli ? theme.accent : `${theme.textSecondary}44`, transition: "background .15s ease",
            }}>
              <span style={{
                position: "absolute", top: "2px", left: odakDurumu.surekli ? "14px" : "2px",
                width: "14px", height: "14px", borderRadius: "50%", background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left .15s ease",
              }} />
            </span>
          </div>
          <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "0 2px" }} />
          {/* OTOMATİK GİZLEME — açıkken süre (3–30 sn) */}
          <div role="switch" aria-checked={gizle.acik} onClick={() => setGizle({ acik: !gizle.acik })}
            title="Dokunulmayınca oynatıcı küçük yuvarlak düğmeye insin; dokununca yerinde açılır"
            style={{ ...satirStil, cursor: "pointer" }}>
            <span style={{ ...ikonDugme, cursor: "pointer" }}><Timer size={16} color={gizle.acik ? theme.accent : theme.textSecondary} /></span>
            <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text, lineHeight: 1.25 }}>
              Otomatik gizleme
              <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>Küçük düğmeye insin, sürüklenebilsin</span>
            </span>
            <span aria-hidden="true" style={{
              width: "30px", height: "18px", borderRadius: "999px", flexShrink: 0, position: "relative",
              background: gizle.acik ? theme.accent : `${theme.textSecondary}44`, transition: "background .15s ease",
            }}>
              <span style={{
                position: "absolute", top: "2px", left: gizle.acik ? "14px" : "2px",
                width: "14px", height: "14px", borderRadius: "50%", background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left .15s ease",
              }} />
            </span>
          </div>
          {gizle.acik && (
            <div style={satirStil}>
              <span style={{ ...ikonDugme, cursor: "default" }} />
              <input type="range" min={3} max={30} step={1} value={gizle.sn}
                aria-label="Otomatik gizleme süresi (saniye)"
                onChange={e => setGizle({ sn: parseInt(e.target.value, 10) || 8 })}
                style={{ flex: 1, minWidth: 0, accentColor: theme.accent, cursor: "pointer" }} />
              <span style={degerStil}>{gizle.sn} sn</span>
              <button onClick={() => setGizle({ sn: 8 })} title="8 sn'ye getir" style={sifirStil}>
                <RotateCcw size={12} />
              </button>
            </div>
          )}
          <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "0 2px" }} />
          {/* GÖRÜNÜM VE KONUM — gelişmiş ayarlar ayrı sayfada, ana liste sade kalsın */}
          <button onClick={() => setAltPanel("gorunum")} style={{ ...satirStil, width: "100%", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: "6px 0" }}>
            <span style={{ ...ikonDugme, cursor: "pointer" }}><SlidersHorizontal size={15} color={theme.textSecondary} /></span>
            <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text, lineHeight: 1.25 }}>
              Görünüm ve konum
              <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>Kenar boşluğu, opaklık, âyetin karşılanacağı yer</span>
            </span>
            <ChevronRight size={15} color={theme.textSecondary} />
          </button>
          </>)}
        </div>
      )}
      <OdakKonumAyari acik={konumAyarAcik} kapat={() => setKonumAyarAcik(false)} theme={theme} />

      {/* SOL grup: (sure·ayet + kâri adı) → Gözlük → Meal → İzleme */}
      <div className="vk-pb-grup" style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "4px" : "6px",
        flex: "0 1 auto",
        minWidth: 0,
        paddingLeft: isMobile ? "3%" : "1%",
      }}>
        {/* sure · ayet · kari adı (yeri/gösterimi aynı) */}
        <div className="vk-pb-metin" style={{ minWidth: 0, overflow: "hidden" }}>
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

        {/* GÖZLÜK — okunan âyeti yumuşakça takip et (4 Kasım 2026; KuranOkuma → gozlukTikla) */}
        <button
          onClick={onOdaklan}
          aria-pressed={odakDurum !== "kapali"}
          style={{
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            width: isMobile ? "28px" : "30px", height: isMobile ? "28px" : "30px", borderRadius: "50%",
            border: "none", cursor: "pointer",
            background: odakDurum === "acik" ? `${theme.accent}22` : "transparent",
            color: odakDurum === "kapali" ? theme.textSecondary : theme.accent,
            transition: "all 0.15s", flexShrink: 0, touchAction: "manipulation", padding: 0,
          }}
          title={odakDurum === "kapali" ? "Okunan âyete odaklan ve takip et"
            : odakDurum === "askida" ? "Takip askıda — okunan âyete dön"
            : "Takip açık — kapatmak için dokunun"}
        >
          {odakDurum === "askida" && (
            <span aria-hidden="true" style={{ position: "absolute", top: "2px", right: "2px", width: "6px", height: "6px", borderRadius: "50%", background: theme.accent }} />
          )}
          <Glasses size={isMobile ? 17 : 19} />
        </button>

        {/* ÇEVİRİ — meal penceresini aç/kapat (çalan âyetin mealini takip eder) */}
        {onCeviri && (
          <button
            onClick={onCeviri}
            title={ceviriAktif ? "Meal penceresini kapat" : "Meal (çeviri) penceresini aç"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: isMobile ? "27px" : "29px", height: isMobile ? "27px" : "29px", borderRadius: "50%",
              border: "none", cursor: "pointer", flexShrink: 0, touchAction: "manipulation", padding: 0,
              background: ceviriAktif ? theme.accent : "transparent",
              color: ceviriAktif ? "#fff" : theme.textSecondary,
            }}
          >
            <CeviriIkonu size={isMobile ? 16 : 17} />
          </button>
        )}

        {/* İZLEME — tam ekranda âyetleri kâri sesiyle birlikte ilerlet */}
        {onIzleme && (
          <button
            onClick={onIzleme}
            title={izlemeAktif ? "İzleme modundan çık" : "İzleme modu (tam ekran)"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: isMobile ? "27px" : "29px", height: isMobile ? "27px" : "29px", borderRadius: "50%",
              border: "none", cursor: "pointer", flexShrink: 0, touchAction: "manipulation", padding: 0,
              background: izlemeAktif ? theme.accent : "transparent",
              color: izlemeAktif ? "#fff" : theme.textSecondary,
            }}
          >
            <IzlemeIkonu size={isMobile ? 16 : 17} />
          </button>
        )}

        {/* DÖNGÜ düğmesi KALDIRILDI (28 Eylül 2026) — ana barda zaten var.
            `onDonguAyar`/`tekrarAktif` prop'ları geriye uyum için kabul ediliyor. */}
      </div>

      {/* SAĞ grup: oynatma düğmeleri → ses/hız menüsü */}
      <div className="vk-pb-grup" style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "4px" : "6px",
        flexShrink: 0,
        marginRight: isMobile ? "3%" : "1%",
      }}>
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

        {/* SES + HIZ MENÜSÜ — yukarı açılan ince menü. Varsayılandan farklı bir
            ses/hız varsa düğme hafif vurgulu kalır (ayar unutulmasın). */}
        <button
          ref={ayarDugmeRef}
          onClick={() => setAyarAcik(v => !v)}
          title={`Ses %${Math.round(ses * 100)} · Hız ${hiz}×`}
          aria-expanded={ayarAcik}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: isMobile ? "28px" : "30px", height: isMobile ? "28px" : "30px", borderRadius: "50%",
            border: "none", cursor: "pointer", flexShrink: 0, touchAction: "manipulation", padding: 0,
            position: "relative",
            background: ayarAcik ? `${theme.accent}33` : (ses !== 1 || hiz !== 1) ? `${theme.accent}1f` : "transparent",
            color: ses === 0 ? "#c0392b" : (ayarAcik || ses !== 1 || hiz !== 1) ? theme.accent : theme.textSecondary,
          }}
        >
          <SlidersHorizontal size={isMobile ? 15 : 16} />
          {hiz !== 1 && (
            <span style={{
              position: "absolute", top: "-3px", right: "-5px",
              fontSize: "8.5px", fontWeight: 700, lineHeight: 1, padding: "1px 3px",
              borderRadius: "6px", background: theme.accent, color: "#fff",
            }}>{hiz}×</span>
          )}
        </button>
      </div>
    </div>
  )
}
/* ── GÖRÜNÜM VE KONUM SAYFASI (ayar kutusunun içinde) ───────────────────────── */
function GorunumPaneli({ theme, gorunum, setGorunum, geri, konumAc, satirStil, ikonDugme, degerStil, sifirStil, kenarda }) {
  const { konum } = useOdak()
  return (
    <>
      <button onClick={geri} style={{ ...satirStil, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", padding: "4px 0", color: theme.accent, fontSize: "12px", fontWeight: 700 }}>
        <ChevronLeft size={15} /> Görünüm ve konum
      </button>
      <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "0 2px" }} />
      <div style={{ fontSize: "11px", color: theme.text, padding: "6px 0 0" }}>
        Kenar boşluğu
        <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>
          {kenarda ? "Alttayken oynatıcının ekran kenarından yüksekliği" : "Oynatıcı ekranın alt kenarındayken uygulanır"}
        </span>
      </div>
      <div style={satirStil}>
        <input type="range" min={0} max={24} step={1} value={gorunum.bosluk} aria-label="Kenar boşluğu"
          onChange={e => setGorunum({ bosluk: parseInt(e.target.value, 10) || 0 })}
          style={{ flex: 1, minWidth: 0, accentColor: theme.accent, cursor: "pointer" }} />
        <span style={degerStil}>{gorunum.bosluk} px</span>
        <button onClick={() => setGorunum({ bosluk: GORUNUM_VARSAYILAN.bosluk })} title="Varsayılana döndür" style={sifirStil}><RotateCcw size={12} /></button>
      </div>
      <div style={{ fontSize: "11px", color: theme.text, padding: "4px 0 0" }}>Zemin opaklığı</div>
      <div style={satirStil}>
        <input type="range" min={0.2} max={1} step={0.05} value={gorunum.zemin} aria-label="Zemin opaklığı"
          onChange={e => setGorunum({ zemin: parseFloat(e.target.value) || 1 })}
          style={{ flex: 1, minWidth: 0, accentColor: theme.accent, cursor: "pointer" }} />
        <span style={degerStil}>%{Math.round(gorunum.zemin * 100)}</span>
        <button onClick={() => setGorunum({ zemin: 1 })} title="Tam opak" style={sifirStil}><RotateCcw size={12} /></button>
      </div>
      <div style={{ fontSize: "11px", color: gorunum.zemin < 1 ? theme.text : theme.textSecondary, padding: "4px 0 0" }}>
        Düğme opaklığı
        <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>Zemin saydamken düğmelerin ve yazının arkası</span>
      </div>
      <div style={{ ...satirStil, opacity: gorunum.zemin < 1 ? 1 : 0.5 }}>
        <input type="range" min={0.4} max={1} step={0.05} value={gorunum.dugme} aria-label="Düğme opaklığı" disabled={gorunum.zemin >= 1}
          onChange={e => setGorunum({ dugme: parseFloat(e.target.value) || 1 })}
          style={{ flex: 1, minWidth: 0, accentColor: theme.accent, cursor: "pointer" }} />
        <span style={degerStil}>%{Math.round(gorunum.dugme * 100)}</span>
        <button onClick={() => setGorunum({ dugme: GORUNUM_VARSAYILAN.dugme })} title="Varsayılana döndür" style={sifirStil}><RotateCcw size={12} /></button>
      </div>
      <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "4px 2px" }} />
      <button onClick={konumAc} style={{ ...satirStil, width: "100%", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: "6px 0" }}>
        <span style={{ ...ikonDugme, cursor: "pointer" }}><Crosshair size={15} color={theme.accent} /></span>
        <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text, lineHeight: 1.25 }}>
          Âyetin karşılanacağı yer
          <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>Gözlükle takipte okunan âyetin geleceği yükseklik</span>
        </span>
        <span style={degerStil}>%{Math.round(konum * 100)}</span>
        <ChevronRight size={15} color={theme.textSecondary} />
      </button>
    </>
  )
}
