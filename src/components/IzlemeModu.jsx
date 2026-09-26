/* VUKUF — İZLEME MODU (tam ekran)
   src/components/IzlemeModu.jsx

   PlayerBar'daki izleme düğmesi bunu açar. Çalan âyet tam ekranda gösterilir,
   kâri bir sonrakine geçince ekran da geçer, sûre bitince kendiliğinden kapanır.

   ── NİÇİN CANVAS, NİÇİN `gorselCiz` ────────────────────────────────────────
   Ekran, görsel modundaki ÇİZİMİN AYNISI: arka plan, çerçeve, karartma, Arapça,
   meal, kaynak, sûre adı hattı ve rahle. HTML ile ayrıca kurulsaydı iki yüzey
   zamanla birbirinden ayrışırdı; aynı işlevi çağırmak "ayarı görselde değiştirdim,
   izlemede olmadı" sınıfını baştan imkânsız kılıyor.

   ── KATMAN AYRIMI ──────────────────────────────────────────────────────────
   Arka plan ÂYET BAŞINA yeniden çizilmiyor: bir kez `katman:"arka"` ile kendi
   tuvaline alınıyor (fotoğraf yüklemesi asenkron). Her âyette yalnız `katman:"on"`
   çiziliyor — o dal senkron çalışıyor — ve iki tuval görünür tuvale bindiriliyor.
   Görünür tuval İKİ TANE: yeni âyet gizli olana çizilip opaklıkla değiştiriliyor,
   böylece geçiş sırasında ekran bir kare bile boş kalmıyor. */

import { useEffect, useMemo, useRef, useState } from "react"
import { X, Settings2, SkipBack, SkipForward, Play, Pause } from "lucide-react"
import { DESENLER, GORSELLER } from "../data/arkaplanlar"
import { gorselCiz, rozetGorseliUret } from "./GorselOlustur"
import { useIzlemeAyar } from "../data/izlemeAyar"
import MealIzlemeAyarlari from "./MealIzlemeAyarlari"

const AZAMI_DPR = 2          // 3× tuval telefonda belleği zorluyor, görünür fayda yok
const KONTROL_SURESI = 3500  // ms — dokunulmazsa düğmeler solar
const SURUKLE_ESIK = 46      // px — bu kadar kayma bir "sürükleme" sayılır
const DOKUNUS_ESIK = 12      // px — bu kadarın altı hâlâ "dokunuş"
const DOKUNUS_SURE = 400     // ms — daha uzun basış dokunuş sayılmaz

export default function IzlemeModu({
  acik, kapat, player, icerikAl, arapcaFont, theme, isMobile,
}) {
  const [ayar] = useIzlemeAyar()
  const iz = ayar.izleme
  const [ayarAcik, setAyarAcik] = useState(false)
  const [kontrolGorunur, setKontrolGorunur] = useState(true)
  const hareketRef = useRef(null)

  const cvA = useRef(null)
  const cvB = useRef(null)
  const [ustte, setUstte] = useState(0)          // 0 = A görünür, 1 = B
  const ilkCizimRef = useRef(true)               // ilk kare takas beklemeden görünsün
  const arkaRef = useRef(null)                   // yalnız arka plan
  const onRef = useRef(null)                     // yalnız yazı katmanı
  const rozetRef = useRef(null)
  const [olcu, setOlcu] = useState(null)         // { w, h, gUst, gAlt } — tuval pikseli
  const [arkaSurum, setArkaSurum] = useState(0)  // arka plan hazırlandıkça artar
  const [hatVar, setHatVar] = useState(false)

  const aktif = player?.aktifAyet || null
  const caliyor = player?.durum === "caliyor"

  /* Arka plan tanımı — görsel modundaki çözümlemenin aynısı. */
  const arka = useMemo(() => {
    if (iz.arka === "ozel" && iz.ozelGorsel) {
      return { id: "ozel", ad: "Galeriden", src: iz.ozelGorsel, koyu: true, tip: "gorsel" }
    }
    const g = GORSELLER.find(x => x.id === iz.arka)
    if (g) return { ...g, tip: "gorsel" }
    const d = DESENLER.find(x => x.id === iz.arka) || DESENLER[0]
    return { ...d, tip: "desen" }
  }, [iz.arka, iz.ozelGorsel])

  /* Âyet sonu madalyonu — görsel moduyla aynı kaynak. */
  useEffect(() => {
    if (rozetRef.current) return
    const im = rozetGorseliUret()
    im.onload = () => { rozetRef.current = im; setArkaSurum(v => v + 1) }
    im.onerror = () => {}
    if (im.complete && im.naturalWidth > 0) rozetRef.current = im
  }, [])

  /* Sûre adı hattı: font yüklenmediyse hiç çizilmesin (yedek yazı tipinde □ çıkar). */
  useEffect(() => {
    if (!acik || typeof document === "undefined" || !document.fonts) return
    let iptal = false
    document.fonts.load("64px 'surah-name-v2-icon', serif", "")
      .then(y => { if (!iptal) setHatVar(!!(y && y.length)) })
      .catch(() => {})
    return () => { iptal = true }
  }, [acik])

  /* Tuval ölçüsü — döndürmede ve tarayıcı çubuğu gizlenince yeniden alınır. */
  useEffect(() => {
    if (!acik) { setOlcu(null); return }
    /* GÜVENLİ ALAN TAHMİN DEĞİL ÖLÇÜM: `env(safe-area-inset-*)` CSS'te bir sayı
       değil; görünmez bir kutuya yükseklik olarak verilip okunuyor. Çentiksiz
       cihazda 0 döner. Arka plan bütün ekranı kaplar, yalnız çerçeve ve yazı bu
       kadar içeri alınır — yoksa sûre adı ve çerçevenin üstü saatin altında kalıyor. */
    const kutu = document.createElement("div")
    kutu.setAttribute("aria-hidden", "true")
    kutu.style.cssText = "position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none"
    const ustKutu = document.createElement("div")
    ustKutu.style.cssText = "height:env(safe-area-inset-top)"
    const altKutu = document.createElement("div")
    altKutu.style.cssText = "height:env(safe-area-inset-bottom)"
    kutu.appendChild(ustKutu); kutu.appendChild(altKutu)
    document.body.appendChild(kutu)

    const oku = () => {
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), AZAMI_DPR)
      const w = Math.max(2, Math.round(window.innerWidth * dpr))
      const h = Math.max(2, Math.round(window.innerHeight * dpr))
      const gUst = Math.round((ustKutu.getBoundingClientRect().height || 0) * dpr)
      const gAlt = Math.round((altKutu.getBoundingClientRect().height || 0) * dpr)
      setOlcu(o => (o && o.w === w && o.h === h && o.gUst === gUst && o.gAlt === gAlt
        ? o : { w, h, gUst, gAlt }))
    }
    oku()
    window.addEventListener("resize", oku)
    window.addEventListener("orientationchange", oku)
    return () => {
      window.removeEventListener("resize", oku)
      window.removeEventListener("orientationchange", oku)
      kutu.remove()
    }
  }, [acik])

  /* ARKA PLAN KATMANI — ölçü ya da arka plan değişince BİR KEZ. */
  useEffect(() => {
    if (!acik || !olcu) return
    let iptal = false
    const cv = document.createElement("canvas")
    cv.width = olcu.w; cv.height = olcu.h
    gorselCiz(cv.getContext("2d"), {
      W: olcu.w, H: olcu.h, arka, katman: "arka",
      cerceve: iz.cerceve, karartma: iz.karartma,
      guvenliUst: olcu.gUst, guvenliAlt: olcu.gAlt,
    }).then(() => {
      if (iptal) return
      arkaRef.current = cv
      setArkaSurum(v => v + 1)
    }).catch(() => {})
    return () => { iptal = true }
  }, [acik, olcu, arka, iz.cerceve, iz.karartma])

  /* ÂYET KATMANI — âyet ya da ayar değişince gizli tuvale çizilip öne alınır. */
  useEffect(() => {
    if (!acik || !olcu || !arkaRef.current || !aktif) return
    const veri = icerikAl ? icerikAl(aktif) : null
    if (!veri) return

    // Yazı katmanı ayrı tuvalde: `gorselCiz` her çağrıda `clearRect` yaptığı için
    // arka planı önce çizip üstüne çağırmak arka planı siler.
    let onCv = onRef.current
    if (!onCv || onCv.width !== olcu.w || onCv.height !== olcu.h) {
      onCv = document.createElement("canvas")
      onCv.width = olcu.w; onCv.height = olcu.h
      onRef.current = onCv
    }
    gorselCiz(onCv.getContext("2d"), {
      W: olcu.w, H: olcu.h, arka, katman: "on",
      cerceve: iz.cerceve, karartma: iz.karartma,
      arapca: veri.arapca,
      meal: iz.meal ? veri.meal : null,
      kaynak: veri.kaynak,
      sureNo: hatVar ? (veri.sureNo || 0) : 0,
      rahle: true,
      arapcaFont,
      rozetNo: veri.ayetNo || null,
      secde: !!veri.secde,
      rozetImg: rozetRef.current,
      guvenliUst: olcu.gUst,
      // Düğmeler görünürken alt paya onların yüksekliği de ekleniyor ki rahle
      // ile çakışmasın; gizli düğme modunda yalnız güvenli alan kadar.
      guvenliAlt: olcu.gAlt + (iz.gizliDugme ? 0 : Math.round(66 * (olcu.w / window.innerWidth))),
    })

    // İLK çizim GÖRÜNÜR tuvale yapılır ve takas edilmez: aksi hâlde ilk kare
    // hiç çizilmemiş boş tuval oluyor ve ekran bir an simsiyah kalıyordu.
    const ilk = ilkCizimRef.current
    const hedef = (ilk ? (ustte === 0 ? cvA : cvB) : (ustte === 0 ? cvB : cvA)).current
    if (!hedef) return
    hedef.width = olcu.w; hedef.height = olcu.h
    const ctx = hedef.getContext("2d")
    ctx.drawImage(arkaRef.current, 0, 0)
    ctx.drawImage(onCv, 0, 0)
    if (ilk) ilkCizimRef.current = false
    else setUstte(u => (u === 0 ? 1 : 0))
    // `ustte` bilerek bağımlılıkta DEĞİL: onu burada değiştiriyoruz, listeye
    // girerse efekt kendi kendini tetikleyip sonsuz takas yapardı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, olcu, arkaSurum, aktif, icerikAl, arka, iz.cerceve, iz.karartma, iz.meal, iz.gizliDugme, arapcaFont, hatVar])

  /* Gerçek tam ekran: destekleyen tarayıcıda (masaüstü, Android) sistem çubukları
     da kalkar. iOS bunu video dışı öğelerde desteklemiyor; orada kurulu uygulama
     zaten tam ekran olduğu için kaplama yeterli. Başarısızlık sessizce geçiliyor. */
  useEffect(() => {
    if (!acik) return
    const el = document.documentElement
    try { el.requestFullscreen && el.requestFullscreen({ navigationUI: "hide" }).catch(() => {}) } catch { /* yoksay */ }
    return () => {
      try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}) } catch { /* yoksay */ }
    }
  }, [acik])

  /* Ekran uykuya dalmasın — izleme sırasında elle dokunulmuyor. */
  useEffect(() => {
    if (!acik) return
    let kilit = null, iptal = false
    const al = async () => {
      try { if (navigator.wakeLock) kilit = await navigator.wakeLock.request("screen") } catch { /* desteklenmiyor */ }
    }
    al()
    // Sekme arkaya alınıp geri gelince kilit düşmüş olur → yeniden istenir.
    const gorunurluk = () => { if (!iptal && document.visibilityState === "visible") al() }
    document.addEventListener("visibilitychange", gorunurluk)
    return () => {
      iptal = true
      document.removeEventListener("visibilitychange", gorunurluk)
      try { kilit && kilit.release() } catch { /* yoksay */ }
    }
  }, [acik])

  /* Sûre bitince oynatıcı kapanır → tam ekrandan çık, okuma normal sürsün.
     GECİKMELİ: âyet değiştirirken oynatıcı bir an "kapali" hâlinden geçiyorsa
     tam ekranın o anda kapanması yanlış olur ("ileri/geri bastım, okuma
     ekranına attı" belirtisi). Bu yüzden durum KALICI olarak kapalıysa çıkılıyor;
     yarım saniye içinde yeniden çalmaya başlarsa hiçbir şey olmuyor. */
  useEffect(() => {
    if (!acik || player?.durum !== "kapali") return
    const t = setTimeout(() => kapat?.(), 600)
    return () => clearTimeout(t)
  }, [acik, player?.durum, kapat])

  /* Esc ile çıkış + düğmelerin kendiliğinden solması. */
  useEffect(() => {
    // Ayar paneli açıkken Esc YALNIZ onu kapatmalı; ikisi birden dinlerse tek
    // tuşla hem panel hem izleme kapanıyordu (testte yakalandı).
    if (!acik || ayarAcik) return
    const tus = (e) => { if (e.key === "Escape") kapat?.() }
    document.addEventListener("keydown", tus)
    return () => document.removeEventListener("keydown", tus)
  }, [acik, ayarAcik, kapat])

  useEffect(() => {
    if (!acik || !kontrolGorunur || ayarAcik) return
    const t = setTimeout(() => setKontrolGorunur(false), KONTROL_SURESI)
    return () => clearTimeout(t)
  }, [acik, kontrolGorunur, ayarAcik, aktif])


  // Kapanınca bayrak sıfırlanır; bir sonraki açılış yine takassız başlar.
  if (!acik) { ilkCizimRef.current = true; return null }

  const kontrolGoster = () => setKontrolGorunur(true)

  /* ── HAREKETLER ────────────────────────────────────────────────────────────
     Sola sürükle → önceki âyet · sağa sürükle → sonraki âyet ·
     aşağı sürükle → çıkış · ortaya bir kez dokun → duraklat/devam.
     Sürüklemeler HER İKİ MODDA çalışıyor (zararı yok, işi kolaylaştırıyor);
     farklı olan yalnız DOKUNUŞ: düğmeler açıkken dokunuş onları gösterip
     gizliyor, gizli modda duraklatıyor. */
  function bas(e) {
    /* ⚠ DÜĞMEDEN BAŞLAYAN DOKUNUŞ HAREKET SAYILMAZ.
       Sebep ölçüldü: düğmeye dokununca kökteki `pointerup` ÖNCE çalışıp
       `kontrolGorunur`u kapatıyordu; kap `pointerEvents:"none"` olunca ardından
       gelen `click` düğmeye hiç ulaşmıyordu. Belirti tam olarak "düğmeler
       görünüyor ama hiçbiri çalışmıyor, dokununca kaybolup geri geliyor". */
    if (e.target && e.target.closest && e.target.closest("button")) {
      hareketRef.current = null
      return
    }
    hareketRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }
  function birak(e) {
    const b = hareketRef.current
    hareketRef.current = null
    if (!b) return
    const dx = e.clientX - b.x
    const dy = e.clientY - b.y
    const uzunluk = Math.hypot(dx, dy)

    if (uzunluk >= SURUKLE_ESIK) {
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy > 0) kapat?.()                       // aşağı → çıkış
        else setAyarAcik(true)                      // yukarı → ayarlar
        return
      }
      if (dx < 0) player?.oncekiAyet?.()            // sola → önceki
      else player?.sonrakiAyet?.()                  // sağa → sonraki
      if (!iz.gizliDugme) kontrolGoster()
      return
    }

    if (uzunluk <= DOKUNUS_ESIK && Date.now() - b.t <= DOKUNUS_SURE) {
      if (!iz.gizliDugme) { setKontrolGorunur(v => !v); return }
      // ORTA bölge: kenardaki kazara dokunuşlar oynatmayı kesmesin
      const ortadaMi =
        Math.abs(e.clientX - window.innerWidth / 2) < window.innerWidth * 0.33 &&
        Math.abs(e.clientY - window.innerHeight / 2) < window.innerHeight * 0.28
      if (!ortadaMi) return
      if (player?.durum === "caliyor") player.duraklat?.()
      else player?.devamEt?.()
    }
  }

  const yuvarlak = (baslik, Ikon, tikla, buyuk = false) => (
    <button
      onClick={(e) => { e.stopPropagation(); kontrolGoster(); tikla?.() }}
      title={baslik} aria-label={baslik}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: buyuk ? "54px" : "42px", height: buyuk ? "54px" : "42px",
        borderRadius: "50%", flexShrink: 0, padding: 0, cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.28)",
        background: "rgba(0,0,0,0.42)", color: "#fff",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        touchAction: "manipulation",
      }}
    >
      <Ikon size={buyuk ? 24 : 18} />
    </button>
  )

  const tuval = (ref, gorunur) => (
    <canvas
      ref={ref}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        opacity: gorunur ? 1 : 0, transition: "opacity 0.45s ease",
      }}
    />
  )

  return (
    <>
      <div
        onPointerDown={bas}
        onPointerUp={birak}
        onPointerCancel={() => { hareketRef.current = null }}
        style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "#000", overflow: "hidden",
          // Tam ekranda kaydırma/geri hareketi devreye girmesin
          touchAction: "none", overscrollBehavior: "none",
        }}
      >
        {tuval(cvA, ustte === 0)}
        {tuval(cvB, ustte === 1)}

        {/* ÜST — ayarlar ve çıkış. GİZLİ DÜĞME MODUNDA HİÇ ÇİZİLMİYOR:
            ekranda yazı da simge de kalmıyor, gerçek tam ekran. O modda ayarlara
            YUKARI sürükleyerek, çıkışa AŞAĞI sürükleyerek ulaşılıyor. */}
        {!iz.gizliDugme && (
          <div style={{
            position: "absolute", left: 0, right: 0,
            top: "calc(env(safe-area-inset-top) + 10px)",
            display: "flex", justifyContent: "flex-end", gap: "10px",
            padding: "0 14px",
            opacity: kontrolGorunur ? 1 : 0,
            transition: "opacity 0.3s ease",
            pointerEvents: kontrolGorunur ? "auto" : "none",
          }}>
            {yuvarlak("İzleme ayarları", Settings2, () => setAyarAcik(true))}
            {yuvarlak("İzleme modundan çık", X, kapat)}
          </div>
        )}

        {/* ALT — oynatma denetimleri (gizli düğme modunda hiç çizilmiyor) */}
        {!iz.gizliDugme && (
          <div style={{
            position: "absolute", left: 0, right: 0,
            bottom: "calc(env(safe-area-inset-bottom) + 18px)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "16px",
            opacity: kontrolGorunur ? 1 : 0,
            transition: "opacity 0.3s ease",
            pointerEvents: kontrolGorunur ? "auto" : "none",
          }}>
            {yuvarlak("Önceki âyet", SkipBack, () => player?.oncekiAyet?.())}
            {yuvarlak(caliyor ? "Duraklat" : "Devam et", caliyor ? Pause : Play,
              () => (caliyor ? player?.duraklat?.() : player?.devamEt?.()), true)}
            {yuvarlak("Sonraki âyet", SkipForward, () => player?.sonrakiAyet?.())}
          </div>
        )}

      </div>

      <MealIzlemeAyarlari
        acik={ayarAcik} kapat={() => { setAyarAcik(false); kontrolGoster() }}
        theme={theme} isMobile={isMobile} odak="izleme"
      />
    </>
  )
}
