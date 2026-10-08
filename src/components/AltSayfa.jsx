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

   • ★ "NADİREN KAYDIRILAMIYOR, BİR SÜRE SONRA DÜZELİYOR" (8 Ekim 2026,
     Yardım paneli, mobil). SEBEP: panel en üstteyken, parmak içeriği yukarı
     kaydırmaya başlarken ilk karede 1-2 px AŞAĞI titreyebiliyor. Pasif olmayan
     touchmove dinleyicisi bunu "aşağı çekme" sanıp hemen preventDefault
     ediyordu; iOS'ta ilk touchmove'u engellemek o dokunuşun kaydırmasını
     baştan sona iptal eder → parmak kayıyor, içerik kımıldamıyor. Sonraki
     dokunuş titremesiz başlayınca "düzelmiş" görünüyordu.
     ARTIK: YON_ESIGI (3 px) aşılmadan hiçbir şey engellenmiyor; yukarı yön
     belirlenirse jest tümüyle içerik kaydırmasına bırakılıyor. Ayrıca bitişi
     kaçmış (pointerup/cancel gelmemiş) eski bir dokunuş kaydı, sürükleme
     yokken yeni dokunuşu kilitlemiyor.
   • ★ "EN ALTA İNİNCE / KART AÇINCA KAYDIRMA KİLİTLENİYOR" (8 Ekim 2026,
     mobil). Panel kaydırmanın SONUNDAYKEN parmak aynı yöne itilince
     kaydıracak bir şey kalmıyor; iOS bu jesti arkadaki sayfaya (Kitaplık)
     zincirliyor. Arka sayfa momentumla kayarken sonraki dokunuşlar da ona
     bağlanıyor → panel bir süre "donuyor", momentum bitince düzeliyor.
     ARTIK KENAR KORUMASI: sürükleme jestimiz olmayan dokunuşlarda yön (yine
     YON_ESIGI'nden sonra) belirlenir; panel o yönde sondaysa ve parmağın
     altında o yöne kayabilen bir iç kutu yoksa jest engellenir. Ters yöne
     (geri kaydırma) ve yatay şeritlere hiç karışılmaz.
   • YUKARI ÇEKMEDE DİRENÇ var (katsayı 0.25): panel yukarı fırlamaz ama parmak
     da "tutmuyor" hissi vermez.
   • Kapanma kararı İKİ ÖLÇÜTTEN biri: yeterince aşağı indiyse (eşik) ya da hızlı
     bir fiske atıldıysa. Yalnız mesafeye bakmak hızlı kapatmayı imkânsız kılar,
     yalnız hıza bakmak yavaş ama uzun sürüklemeyi yok sayar.
   • Perde (backdrop) sürükledikçe SOLUYOR — panelin nereye gittiği görünsün.
   • ★ TUTAMAK + BAŞLIK YAPIŞKAN (3 Ekim 2026). Kullanıcı: "bazı menülerde
     (veri indirme kısmı) açılan bölümün kaydırması iyi ama çekmecenin üst
     kısmından aşağı sürüklemek zor". Sebep: tutamak ve başlık içerikle BİRLİKTE
     kayıyordu. Uzun bir bölüm açılıp içerik biraz kaydırılınca tutamak ekranın
     üstünden çıkıyor, panelin tepesinde yalnız içerik kalıyordu; oradan aşağı
     çekmek paneli değil içeriği kaydırıyordu (gövde sürüklemesi yalnız
     scrollTop 0'da başlar). Artık tutamak + başlık şeridi `position: sticky`
     ile panelin tepesinde DURUYOR ve şeridin TAMAMI tutamak: içerik ne kadar
     kaydırılmış olursa olsun panel oradan her zaman aşağı çekilir.
   • İÇ KAYDIRMA KUTULARI. Panel en üstteyken, kendi kaydırması olan bir iç
     kutuda (ör. uzun liste) aşağı çekmek, kutu kaydırılmışsa önce KUTUYU
     kaydırır; panel ancak kutu da en üstteyse sürüklenir.
   • ★ "1 KEZ YUKARI KAYDIRINCA KİLİT AÇILIYOR" (3 Ekim 2026). Kullanıcı:
     "çekmece açıkken menü aşağı kaydırılamıyor, bir kez yukarı kaydırdıktan
     sonra kilit açılmış gibi kaydırılabiliyor". SEBEP: kaydırılabilirlik
     (→ `touch-action`) yalnız AltSayfa YENİDEN ÇİZİLİNCE ölçülüyordu. Ama
     içerik, AltSayfa'yı yeniden çizdirmeden de büyüyebiliyor: Veriler
     bölümünün kendi akordiyonu (Depolama, Veri indirme…) KENDİ durumunu
     tutuyor. Bölüm açılınca içerik uzuyor, ölçü eski kalıyor → panel hâlâ
     "kaydırılamaz" sanılıp `touch-action: none` kalıyordu: parmak içeriği
     kaydıramıyordu. Bir kez sürükleyince (yukarı direnç) AltSayfa yeniden
     çiziliyor, ölçü tazeleniyor ve kaydırma "açılıyordu".
     ARTIK: ölçü ResizeObserver ile — içerik kutusu ya da panelin kendisi
     boyut değiştirdiği AN yeniden ölçülüyor; kimin durumu değiştiği önemsiz.
   • PERDEDEN ARKA SAYFA KAYMASIN. iOS'ta sabit (fixed) perdenin üzerinde
     parmak kaydırınca arkadaki sayfa kayıyordu ("çekmece harici kısımda aşağı
     yukarı yapabiliyoruz"). Perdeye `touch-action: none` + pasif olmayan
     touchmove ile engel. Gövdeye kilit (body position:fixed) BİLEREK
     kullanılmadı — iOS'ta kapanışta sayfa konumunu zıplatıyor.
   • YATAY TELEFON (29 Eylül 2026): `yp-altsayfa` sınıfı — 520 px'lik dar sayfa
     ekranın ~430 px'lik boyunun %82'sine sıkışıyor, yanlarda yüzlerce piksel
     boş kalıyordu. Yatayda en ~780 px, boy çentik payı dışında ekranın tamamı
     (bkz. yatayDuzen.js). Tema bölümü bu genişlikte cami + rozetleri yan yana
     diziyor. Dikeyde ve masaüstünde hiçbir şey değişmedi.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import "./yatayDuzen"

const KAPANMA_SURESI = 220          // ms — çıkış geçişiyle aynı olmalı
const ESIK_PX = 90                  // bu kadar aşağı inerse kapanır
const HIZ_ESIGI = 0.5               // px/ms — fiske ile kapanma
const BASLAMA_ESIGI = 6             // px — bunu aşmadan sürükleme başlamaz
const YON_ESIGI = 3                 // px — dokunuşun yönü bundan sonra belirlenir

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
  const icerikRef = useRef(null)
  const perdeRef = useRef(null)
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
  const olc = useCallback(() => {
    const el = sayfaRef.current
    if (el) setKaydirilabilir(el.scrollHeight > el.clientHeight + 1)
  }, [])
  useLayoutEffect(() => { olc() })
  // İçerik AltSayfa'yı yeniden çizdirmeden büyüyüp küçülebilir (iç akordiyon
  // kendi durumunu tutuyor) → boyut gözlemcisiyle de ölç. Bkz. baştaki not.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => olc())
    if (sayfaRef.current) ro.observe(sayfaRef.current)
    if (icerikRef.current) ro.observe(icerikRef.current)
    return () => ro.disconnect()
  }, [olc])

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

  // Perdede parmak kaydırması arka sayfaya geçmesin (iOS). Dokunma = kapat
  // (onClick) ayrıca çalışmaya devam ediyor; yalnız kaydırma engelleniyor.
  useEffect(() => {
    const el = perdeRef.current
    if (!el) return
    const engel = (e) => { if (e.cancelable) e.preventDefault() }
    el.addEventListener("touchmove", engel, { passive: false })
    return () => el.removeEventListener("touchmove", engel)
  }, [])

  // ★ Jesti tarayıcıya kaptırmamak için pasif OLMAYAN touchmove dinleyicisi.
  // React'in onTouchMove'u pasif eklendiğinden preventDefault işlemiyor; bu
  // yüzden doğrudan DOM'a bağlanıyor.
  useEffect(() => {
    const el = sayfaRef.current
    if (!el) return
    // Kenar koruması için dokunuşun başlangıcı (bkz. baştaki "en altta kilit").
    const kenar = { x: 0, y: 0, yon: null, engelle: false }
    const dokunBasla = (e) => {
      const t = e.touches && e.touches[0]
      if (!t) return
      kenar.x = t.clientX; kenar.y = t.clientY; kenar.yon = null; kenar.engelle = false
    }
    // Dokunulan yerle panel arasında, istenen yönde HÂLÂ kayabilen bir iç kutu var mı?
    const icKutuKayabilir = (hedef, yon) => {
      for (let d = hedef; d && d !== el; d = d.parentElement) {
        if (d.nodeType !== 1 || d.scrollHeight <= d.clientHeight + 1) continue
        const oy = getComputedStyle(d).overflowY
        if (oy !== "auto" && oy !== "scroll") continue
        if (yon > 0 ? d.scrollTop < d.scrollHeight - d.clientHeight - 1 : d.scrollTop > 0) return true
      }
      return false
    }
    const dokunHareket = (e) => {
      if (!e.cancelable) return                     // tarayıcı çoktan devraldı
      const t = e.touches && e.touches[0]
      if (!t) return
      if (bilgi.current.id == null) {
        // ── KENAR KORUMASI: bizim sürükleme jestimiz değil. Panel kaydırmanın
        // SONUNDAYSA (en alt / içerik kısa) ve parmak o yöne gidiyorsa kaydıracak
        // bir şey yok; jest engellenir ki iOS onu arkadaki sayfaya zincirleyip
        // paneli "kilitlemesin". Yön yine eşikten sonra belirlenir (titreme payı).
        if (kenar.yon == null) {
          const dx = t.clientX - kenar.x, dy = t.clientY - kenar.y
          if (Math.max(Math.abs(dx), Math.abs(dy)) < YON_ESIGI) return
          kenar.yon = Math.abs(dx) > Math.abs(dy) ? "yatay" : dy < 0 ? "yukari" : "asagi"
          const enAlt = el.scrollTop >= el.scrollHeight - el.clientHeight - 1
          kenar.engelle =
            (kenar.yon === "yukari" && enAlt && !icKutuKayabilir(e.target, 1)) ||
            (kenar.yon === "asagi" && el.scrollTop <= 0 && !icKutuKayabilir(e.target, -1))
        }
        if (kenar.engelle) e.preventDefault()
        return
      }
      const b = bilgi.current
      const dy = t.clientY - b.basY
      // Tutamak şeridinden başlayan jest her zaman bizim
      if (b.tutamak) { e.preventDefault(); return }
      // Jest bir kez "içerik kaydırma" diye belirlendiyse artık karışılmaz.
      if (b.kaydirma) return
      // ★ YÖN EŞİĞİ (bkz. baştaki "nadiren kaydırılamıyor"): parmak yukarı
      // kaydırmaya başlarken ilk anda 1-2 px AŞAĞI titreyebiliyor. Eskiden bu
      // titreme hemen preventDefault ediliyordu; iOS'ta ilk touchmove'un
      // engellenmesi o dokunuşun kaydırmasını BÜTÜNÜYLE iptal ediyor.
      if (dy < -YON_ESIGI) { b.kaydirma = true; return }   // yukarı: içerik kayar
      // Yalnızca belirgin AŞAĞI ve panel en üstteyken: kaydıracak bir şey yok, jest bizim.
      if (dy > YON_ESIGI && (el.scrollTop || 0) <= 0 && !b.icKutu) e.preventDefault()
    }
    el.addEventListener("touchstart", dokunBasla, { passive: true })
    el.addEventListener("touchmove", dokunHareket, { passive: false })
    return () => {
      el.removeEventListener("touchstart", dokunBasla)
      el.removeEventListener("touchmove", dokunHareket)
    }
  }, [])

  // `hemen`: tutamaktan başlanmışsa eşik beklenmez, içerik kaydırılmış olsa da
  // sürüklenir. Gövdeden başlanmışsa önce ADAY olunur, hareket eşiği aşınca
  // sürükleme gerçekten başlar.
  // Dokunulan yer ile panel arasında, AŞAĞI kaydırılmış bir iç kutu var mı?
  // Varsa aşağı çekmek önce o kutuyu kaydırmalı, paneli değil.
  function icKutuKaydirilmis(hedef) {
    const kok = sayfaRef.current
    for (let d = hedef; d && d !== kok; d = d.parentElement) {
      if (d.scrollTop > 0 && d.scrollHeight > d.clientHeight + 1) {
        const oy = getComputedStyle(d).overflowY
        if (oy === "auto" || oy === "scroll") return true
      }
    }
    return false
  }

  function inisBasla(e, hemen = false) {
    if (kapaniyor) return
    // Sürmekte olan bir sürükleme varsa ikinci parmak karışmasın. Ama sürükleme
    // YOKKEN dolu kalmış (bitişi kaçmış) eski bir kayıt yeni dokunuşu
    // kilitlemesin: eski kimlik bırakılıp yeni dokunuş alınır.
    if (bilgi.current.id != null && (surukleniyor || bilgi.current.id === e.pointerId)) return
    const ustte = (sayfaRef.current?.scrollTop || 0) <= 0
    if (!hemen && !ustte) return              // içerik kaydırılıyor, karışma
    const icKutu = !hemen && icKutuKaydirilmis(e.target)
    if (icKutu) return                        // iç liste kaydırılıyor, karışma
    bilgi.current = {
      basY: e.clientY, basT: performance.now(),
      id: e.pointerId, aday: !hemen, tutamak: hemen, icKutu, kaydirma: false,
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
    bilgi.current.tutamak = false
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
        ref={perdeRef}
        onClick={kapanmayaBasla}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          touchAction: "none", overscrollBehavior: "contain",
          background: `rgba(0,0,0,${0.35 * (acildi ? perdeOran : 0)})`,
          transition: surukleniyor ? "none" : "background 0.22s ease",
        }}
      />

      <div
        ref={sayfaRef}
        className="yp-altsayfa"
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
        {/* TUTAMAK ŞERİDİ — tutamak çizgisi + başlık. YAPIŞKAN: içerik
            kaydırılsa da panelin tepesinde durur ve TAMAMI sürükleme alanıdır
            (bkz. baştaki "tutamak + başlık yapışkan"). Dokunma hedefi çizginin
            kendisinden büyük tutuluyor, yoksa 4px'lik çizgiyi yakalamak zor. */}
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
            position: "sticky", top: 0, zIndex: 5,
            background: theme.surface,
            borderRadius: "20px 20px 0 0",
            margin: "0 -20px",            // tam genişlik hedef
            padding: "0 20px",
            userSelect: "none", WebkitUserSelect: "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
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
        </div>

        {/* İçerik kutusu — boyutu gözleniyor (kaydırılabilirlik ölçüsü) */}
        <div ref={icerikRef}>
          {children}
        </div>
      </div>
    </>
  )
}
