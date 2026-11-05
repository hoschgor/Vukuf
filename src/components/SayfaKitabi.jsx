/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KİTAP MODU (sayfa sayfa okuma)
   src/components/SayfaKitabi.jsx

   5 Kasım 2026 — kullanıcı: "okuma ekranı ve KuranOkuma için normal mod haricinde bir de
   sayfa ile okuma modu yapalım. Her sayfa ayrı ayrı görüntülenecek, Kur'ân-ı Kerîm'de sayfa
   sola doğru ilerleyecek, arapça eserlerde de aynı şekilde, normal eserlerde de sağa doğru
   ilerleyecek. Mobilde tek sayfa gösterilir fakat tablet ya da bilgisayarda 2 sayfa birden
   gösterilebilir. … Ayarlardan kitap modu açık olursa bu şekilde gösterilir, değilse şuanki
   halde devam eder. Fakat bu hali hiç bozmamamız lazım."
   Kararlar (kullanıcı seçti): taşan sayfa önce küçültülerek sığdırılır, okunamayacak kadar
   küçülecekse sayfanın içi kaydırılır; süsler temaya uyar; geçiş yumuşak kayma ama kâğıt
   çevirmeyi andırır (hafif eğilme + gölge — gerçek kıvrılma YOK, eski cihazları yormasın).

   BU DOSYA KAYDIRMALI DÜZENE HİÇ DOKUNMAZ. Ekranlar kitap modu açıkken kaydırma kutusunu
   gizleyip bunu gösteriyor; sayfa numarası ekranın kendi durumundan (mevcutSayfa) gelir,
   çevirme onSayfa ile o duruma yazılır. Böylece fihrist, sayfaya git, kayıtlar gibi
   mevcutSayfa'yı ayarlayan her gidiş kitap modunda da kendiliğinden çalışır.

   • YAYILIM: geniş ve yatay ekranda (tablet/bilgisayar) iki sayfa yan yana. Mushaf gibi
     tek numaralı sayfa sağda (sağdan sola eserlerde), soldan sağa eserlerde solda.
   • YÖN: "rtl" → sonraki sayfa SOLDA: parmak sağa çekilir, sol kenara dokunulur, ← tuşu.
          "ltr" → sonraki sayfa SAĞDA.
   • SIĞDIRMA (SayfaSigdir): sayfa içeriği önce doğal boyunda ölçülür; sığmıyorsa genişliği
     büyütülüp ölçeklenerek (transform) küçültülür — yazı yeniden dizildiği için oran
     kareköküyle yaklaşır, 3-5 ölçümde oturur. `minOlcek` altına inilmez; o zaman sayfanın
     içi dikey kaydırılır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ── AYAR ─────────────────────────────────────────────────────────────────────
export const KITAP_MODU_KURAN = "vukuf-kitap-modu-kuran"
export const KITAP_MODU_ESER = "vukuf-kitap-modu-eser"
export function kitapModuOku(anahtar) {
  try { return localStorage.getItem(anahtar) === "1" } catch { return false }
}
export function useKitapModu(anahtar) {
  const [acik, setAcik] = useState(() => kitapModuOku(anahtar))
  const yaz = useCallback((v) => {
    setAcik(o => {
      const y = typeof v === "function" ? !!v(o) : !!v
      try { localStorage.setItem(anahtar, y ? "1" : "0") } catch { /* yoksay */ }
      return y
    })
  }, [anahtar])
  return [acik, yaz]
}

// Çentik payı (env(safe-area-inset-top)) — görünmez bir kutuyla ÖLÇÜLÜR (CSS'te sayı değil)
export function useGuvenliUst() {
  const [d, setD] = useState(0)
  useEffect(() => {
    const k = document.createElement("div")
    k.setAttribute("aria-hidden", "true")
    k.style.cssText = "position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none"
    document.body.appendChild(k)
    const oku = () => setD(Math.round(k.getBoundingClientRect().height) || 0)
    oku()
    let ro = null
    try { ro = new ResizeObserver(oku); ro.observe(k) } catch { /* eski tarayıcı */ }
    window.addEventListener("resize", oku)
    return () => { try { ro && ro.disconnect() } catch { /* yoksay */ } window.removeEventListener("resize", oku); k.remove() }
  }, [])
  return d
}

// İki sayfa yan yana mı? (kutu ölçüsüne göre)
export const ciftSayfaMi = (w, h) => w >= 820 && w / Math.max(1, h) >= 1.05
// Bir sayfanın içinde bulunduğu yayılımın ilk sayfası
export const yayilimBasi = (sayfa, cift) => (cift ? sayfa - ((sayfa - 1) % 2) : sayfa)

/* MENÜ İLE ÇAKIŞMA (5 Kasım 2026) — kullanıcı: "sayfa değiştirmek istenirken menü de
   açılabiliyor … sağa sola hareket yapılırsa menü açılmasın, sadece düz dokunmada açılsın,
   sayfa köşelerinde düz dokunma yapılırsa sayfa değişsin." Menü (OrtaMenu) dokunuşu
   pencere düzeyinde ve bizden ÖNCE yakalıyor; bu yüzden ona soracağı bir işlev veriyoruz:
   dokunuş kitabın kenar bölgesindeyse ya da az önce parmakla çevirme yapıldıysa → menü
   açılmaz (o dokunuş sayfanındır). */
let sonJestAni = 0
const KENAR = 0.2
export function kitapDokunusuMu(x, y, el) {
  if (Date.now() - sonJestAni < 500) return true
  let kutu = null
  try { kutu = el?.closest?.("[data-kitap-kutu]") || document.elementFromPoint(x, y)?.closest?.("[data-kitap-kutu]") } catch { kutu = null }
  if (!kutu || kutu.getAttribute("data-kitap-kutu") === "jestsiz") return false
  const r = kutu.getBoundingClientRect()
  const o = (x - r.left) / (r.width || 1)
  return o < KENAR || o > 1 - KENAR
}

const hareketAzMi = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches } catch { return false } }
// Sayfa içindeki etkileşimli öğeler: dokunuş sayfa çevirmesin, bar açıp kapatmasın
const ETKILESIMLI = "button, a, input, textarea, select, label, [role='button'], [data-kelime], [data-sure], [data-ayet], [data-sure-baslik], [data-etkilesim]"

// ── SIĞDIRMA ─────────────────────────────────────────────────────────────────
/* carpan (5 Kasım 2026) — kullanıcı: "Normal kaydırma kısmındaki yazı boyutu, sayfa
   yazısını da büyütebilsin ama aşırıya kaçmasın." Sığdırma yazı boyutunu kendiliğinden
   dengelediği için (büyük yazı → daha çok küçültme) boyut ayarı görünmüyordu. Sığdırma
   ölçeği bu çarpanla büyütülür (yazı boyutu / varsayılan, en çok ~1,45); hiçbir zaman
   kullanıcının seçtiği gerçek yazı boyutunu aşmaz (ölçek ≤ 1). Taşan kısım kaydırılır. */
/* ORTAK ÖLÇEK (5 Kasım 2026) — kullanıcı: "Kâri okurken yazı boyutları değişiyor, sayfa da
   dolayısıyla kayıyor." İki sebep vardı: (1) her sayfa KENDİ içeriğine göre sığdırılıyordu →
   sûre başlıklı sayfa büyük, dolu sayfa küçük yazıyla; okuma sayfadan sayfaya geçtikçe yazı
   boyu değişiyordu; (2) oynatıcı çubuğunun ölçülen boyu 1-2 px oynadıkça sayfa kutusu da
   oynuyor, her seferinde yeniden sığdırılıyordu. Artık bütün sayfalar TEK ölçekle çizilir
   (basılı mushaf gibi): ilk açılan sayfalar kendi sığma ölçeğini bildirir, ortak ölçek
   bunların en küçüğüdür ve sonra dondurulur (bkz. SayfaKitabi "ortak ölçek"). Ortak ölçeğe
   sığmayan sayfa içinde kaydırılır; az dolu sayfa ortalanır.
   Kutu ölçüsü de küçük oynamalara karşı sabit tutuluyor (aşağıda, SayfaKitabi). */
const OlcekBaglami = createContext(null)

export function SayfaSigdir({ w, h, minOlcek = 0.62, carpan = 1, yenile, ortala = true, children }) {
  const disRef = useRef(null)
  const icRef = useRef(null)
  const [tasiyor, setTasiyor] = useState(false)
  const ortak = useContext(OlcekBaglami)
  const ortakDeger = ortak ? ortak.deger : null
  const bildirRef = useRef(null)
  bildirRef.current = ortak ? ortak.bildir : null
  const olc = useCallback(() => {
    const ic = icRef.current, dis = disRef.current
    if (!ic || !dis || w < 40 || h < 40) return
    let s = 1, nh = 0
    for (let i = 0; i < 6; i++) {
      ic.style.width = `${w / s}px`
      nh = ic.offsetHeight
      const f = nh * s
      if (f > h + 0.5) {
        const y = Math.max(minOlcek, s * Math.sqrt(h / f) * 0.995)
        if (Math.abs(y - s) < 0.002) { s = y; break }
        s = y
      } else if (f < h * 0.96 && s < 1) {
        const y = Math.min(1, s * Math.sqrt(h / f) * 0.995)
        if (Math.abs(y - s) < 0.002) break
        s = y
      } else break
    }
    // Ortak ölçek varsa bütün sayfalar onunla (bu sayfanın kendi sığma ölçeği bildirilir)
    if (bildirRef.current && yenile != null) bildirRef.current(String(yenile), s)
    if (ortakDeger != null) s = ortakDeger
    s = Math.max(minOlcek, s)
    if (carpan !== 1) s = Math.min(1, s * carpan)
    ic.style.width = `${w / s}px`
    nh = ic.offsetHeight
    ic.style.transform = s < 0.999 ? `scale(${s})` : ""
    const boy = nh * s
    dis.style.height = `${Math.max(boy, ortala ? h : 0)}px`
    ic.style.top = ortala && boy < h ? `${Math.round((h - boy) / 2)}px` : "0px"
    setTasiyor(boy > h + 1)
  }, [w, h, minOlcek, ortala, carpan, ortakDeger, yenile])
  useLayoutEffect(() => { olc() }, [olc])
  useEffect(() => {
    const ic = icRef.current
    if (!ic) return
    let raf = 0, sonH = ic.offsetHeight
    let ro = null
    try {
      ro = new ResizeObserver(() => {
        const yh = ic.offsetHeight
        if (Math.abs(yh - sonH) < 1) return
        sonH = yh
        cancelAnimationFrame(raf); raf = requestAnimationFrame(olc)
      })
      ro.observe(ic)
    } catch { /* eski tarayıcı */ }
    try { document.fonts && document.fonts.ready.then(() => requestAnimationFrame(olc)) } catch { /* yoksay */ }
    return () => { cancelAnimationFrame(raf); try { ro && ro.disconnect() } catch { /* yoksay */ } }
  }, [olc])
  return (
    <div style={{ width: `${w}px`, height: `${h}px`, overflowX: "hidden", overflowY: tasiyor ? "auto" : "hidden", overscrollBehavior: "contain", touchAction: "pan-y" }}>
      <div ref={disRef} style={{ position: "relative", width: `${w}px`, overflow: "hidden" }}>
        <div ref={icRef} data-kitap-icerik="" style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0" }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── KİTAP ────────────────────────────────────────────────────────────────────
/**
 * toplam     : sayfa sayısı
 * sayfa      : gösterilen sayfa (1'den)
 * onSayfa    : (no) => void — çevirme
 * yon        : "rtl" | "ltr"
 * sayfaCiz   : (no, { w, h, taraf }) => ReactNode  — taraf: "sag" | "sol" | "tek"
 * onOrtaDokunus : orta bölgeye dokunuş (bar aç/kapa)
 * onSayfaTikla  : (no, oranY, e) => bool — true dönerse dokunuş başka işlenmez (kayıt koyma vb.)
 * onCift     : (bool) => void — yayılım durumu değişince
 * ustPay/altPay : üst/alt bar payları (px)
 */
export default function SayfaKitabi({
  toplam, sayfa, onSayfa, yon = "rtl", sayfaCiz, theme,
  onOrtaDokunus, onSayfaTikla, onCift, ustPay = 0, altPay = 0, ciftIzin = true,
  className, style,
  etkilesimli = "",       // ekranın kendi tıklanabilir öğeleri (ör. ".lugat-kelime")
  jestKapali = false,     // true: parmakla çevirme ve kenar dokunuşu kapalı (ör. vurgu modu)
  olcekAnahtar = "",      // yazı boyutu/aralık/font gibi ortak ölçeği geçersiz kılan ayarlar
}) {
  const kutuRef = useRef(null)
  const [olcu, setOlcu] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = kutuRef.current
    if (!el) return
    const al = () => {
      const r = el.getBoundingClientRect()
      setOlcu(o => (Math.abs(o.w - r.width) < 1 && Math.abs(o.h - r.height) < 1 ? o : { w: r.width, h: r.height }))
    }
    al()
    let ro = null
    try { ro = new ResizeObserver(al); ro.observe(el) } catch { window.addEventListener("resize", al) }
    return () => { try { ro ? ro.disconnect() : window.removeEventListener("resize", al) } catch { /* yoksay */ } }
  }, [])

  // Küçük oynamalara karşı sabit: 8 px'ten az değişim yok sayılır (oynatıcı/bar ölçümü
  // 1-2 px oynadıkça bütün sayfalar yeniden sığdırılıp yazı boyu titremesin)
  const sabitRef = useRef({ w: 0, h: 0 })
  const hamH = Math.max(0, olcu.h - ustPay - altPay)
  if (Math.abs(olcu.w - sabitRef.current.w) > 8) sabitRef.current = { ...sabitRef.current, w: olcu.w }
  if (Math.abs(hamH - sabitRef.current.h) > 8) sabitRef.current = { ...sabitRef.current, h: hamH }
  const alanW = sabitRef.current.w
  const alanH = sabitRef.current.h
  const cift = ciftIzin && ciftSayfaMi(alanW, alanH)
  useEffect(() => { onCift && onCift(cift) }, [cift]) // eslint-disable-line react-hooks/exhaustive-deps
  const adim = cift ? 2 : 1
  const n = Math.max(1, toplam || 1)
  const s0 = Math.max(1, Math.min(n, sayfa || 1))
  const bas = yayilimBasi(s0, cift)
  const rtl = yon === "rtl"
  // Sonraki yayılım rtl'de SOLDA (−X), ltr'de SAĞDA (+X)
  const ileriIsaret = rtl ? -1 : 1

  // ── sürükleme / animasyon ──
  const [dx, setDx] = useState(0)
  const [anim, setAnim] = useState(false)
  const surRef = useRef(null)        // { x, y, t, karar: null|"yatay"|"dikey", id }
  const sonSurukRef = useRef(0)
  const bekleyenRef = useRef(null)
  const W = alanW || 1

  const gecebilir = (d) => (d > 0 ? bas + adim <= n : bas - adim >= 1)
  const icCevirRef = useRef(false)    // sayfa değişimi bizim çevirmemizden mi?
  const icSayfa = (no) => { icCevirRef.current = true; setTimeout(() => { icCevirRef.current = false }, 600); onSayfa(no) }
  const cevir = useCallback((d, animli = true) => {   // d: +1 ileri, −1 geri
    if (bekleyenRef.current) return
    const hedef = d > 0 ? bas + adim : bas - adim
    if (hedef < 1 || hedef > n) { setAnim(true); setDx(0); return }
    if (!animli || hareketAzMi()) { icSayfa(Math.max(1, Math.min(n, hedef))); setDx(0); return }
    setAnim(true)
    setDx(-d * ileriIsaret * W)          // içerik ters yöne kayar, yeni yayılım gelir
    bekleyenRef.current = setTimeout(() => {
      bekleyenRef.current = null
      setAnim(false); setDx(0)
      icSayfa(Math.max(1, Math.min(n, hedef)))
    }, 330)
  }, [bas, adim, n, ileriIsaret, W, onSayfa]) // eslint-disable-line react-hooks/exhaustive-deps

  /* DIŞ GİDİŞ ANİMASYONU (5 Kasım 2026) — kullanıcı: "Kayda gitme de farklı sayfadaysa
     gitmiyor, bu gibi fonksiyonları ufak bir sayfa çevirme animasyonu ile çalıştırabiliriz."
     Fihrist, kayıt, sayfaya git, oynatıcı takibi gibi DIŞARIDAN gelen sayfa değişiminde yeni
     yayılım, gidiş yönünden kısa bir kayma + eğilmeyle gelir (komşular bu sırada gizli). */
  const [giris, setGiris] = useState(false)
  const oncekiBasRef = useRef(bas)
  useLayoutEffect(() => {
    const once = oncekiBasRef.current
    oncekiBasRef.current = bas
    if (once === bas) return
    if (icCevirRef.current) { icCevirRef.current = false; return }
    if (hareketAzMi() || !alanW) return
    const ileri = bas > once
    setGiris(true); setAnim(false)
    setDx((ileri ? 1 : -1) * ileriIsaret * alanW * 0.42)
    let r1 = 0, r2 = 0
    r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => { setAnim(true); setDx(0) }) })
    const t = setTimeout(() => { setGiris(false); setAnim(false) }, 420)
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(t) }
  }, [bas]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (bekleyenRef.current) clearTimeout(bekleyenRef.current) }, [])

  // Tuşlar: ←/→ yöne göre; PageUp/PageDown ve boşluk her zaman ileri/geri
  useEffect(() => {
    const t = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const hedef = e.target
      if (hedef && (hedef.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(hedef.tagName))) return
      let d = 0
      if (e.key === "ArrowLeft") d = rtl ? 1 : -1
      else if (e.key === "ArrowRight") d = rtl ? -1 : 1
      else if (e.key === "PageDown" || (e.key === " " && !e.shiftKey)) d = 1
      else if (e.key === "PageUp" || (e.key === " " && e.shiftKey)) d = -1
      if (!d) return
      e.preventDefault()
      cevir(d)
    }
    window.addEventListener("keydown", t)
    return () => window.removeEventListener("keydown", t)
  }, [cevir, rtl])

  const pDown = (e) => {
    if (e.pointerType === "mouse" || jestKapali) return   // farede sürükleme yok (metin seçimi kalsın)
    if (bekleyenRef.current) return
    surRef.current = { x: e.clientX, y: e.clientY, t: performance.now(), karar: null, id: e.pointerId }
  }
  const pMove = (e) => {
    const s = surRef.current
    if (!s || s.id !== e.pointerId) return
    const ddx = e.clientX - s.x, ddy = e.clientY - s.y
    if (!s.karar) {
      if (Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(ddy) * 1.2) {
        s.karar = "yatay"
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* yoksay */ }
      } else if (Math.abs(ddy) > 10) { surRef.current = null; return }
      else return
    }
    sonJestAni = Date.now()
    // Uçlarda direnç
    const d = -ddx * ileriIsaret > 0 ? 1 : -1
    const direnc = gecebilir(d) ? 1 : 0.28
    setAnim(false)
    setDx(ddx * direnc)
  }
  const pUp = (e) => {
    const s = surRef.current
    surRef.current = null
    if (!s || s.karar !== "yatay") return
    sonSurukRef.current = Date.now()
    sonJestAni = Date.now()
    const ddx = e.clientX - s.x
    const sure = Math.max(1, performance.now() - s.t)
    const hiz = Math.abs(ddx) / sure                   // px/ms
    const d = -ddx * ileriIsaret > 0 ? 1 : -1          // parmak sonrakinin TERSİNE çekilir
    if ((Math.abs(ddx) > W * 0.18 || (hiz > 0.45 && Math.abs(ddx) > 30)) && gecebilir(d)) cevir(d)
    else { setAnim(true); setDx(0) }
  }

  const tikla = (e) => {
    if (Date.now() - sonSurukRef.current < 350) return
    if (bekleyenRef.current) return
    try { const sec = window.getSelection && window.getSelection(); if (sec && String(sec).trim()) return } catch { /* yoksay */ }
    const kutu = kutuRef.current
    if (!kutu) return
    const r = kutu.getBoundingClientRect()
    // Hangi sayfaya dokunuldu (kayıt koyma vb. için)
    const sEl = e.target?.closest?.("[data-kitap-sayfa]")
    if (sEl && onSayfaTikla) {
      // Oran, ayraçların çizildiği İÇERİĞE göre (çerçeve/başlık payı hariç; ölçek ve
      // sayfa içi kaydırma getBoundingClientRect'e zaten yansır)
      const icEl = sEl.querySelector("[data-kitap-icerik]") || sEl
      const sr = icEl.getBoundingClientRect()
      const no = Number(sEl.getAttribute("data-kitap-sayfa"))
      if (onSayfaTikla(no, Math.max(0, Math.min(1, (e.clientY - sr.top) / (sr.height || 1))), e)) return
    }
    if (e.target?.closest?.(etkilesimli ? `${ETKILESIMLI}, ${etkilesimli}` : ETKILESIMLI)) return
    const x = (e.clientX - r.left) / (r.width || 1)
    if (jestKapali) { onOrtaDokunus && onOrtaDokunus(e); return }
    if (x < 0.2) { cevir(rtl ? 1 : -1); return }
    if (x > 0.8) { cevir(rtl ? -1 : 1); return }
    onOrtaDokunus && onOrtaDokunus(e)
  }

  // ── sayfa düzeni ──
  const kenar = alanW < 520 ? 6 : 14
  const yayilimW = Math.max(0, alanW - kenar * 2)
  const sayfaW = cift ? Math.floor(yayilimW / 2) : Math.min(yayilimW, Math.round(alanH * 0.78) || yayilimW)
  const sayfaH = Math.max(0, alanH - kenar * 2)

  // ── ortak ölçek ──
  // Düzen (kutu ölçüsü + yazı ayarları) değişince ilk açılan sayfalar (görünen + komşular)
  // ~1,2 sn içinde kendi sığma ölçeklerini bildirir; ortak ölçek bunların EN KÜÇÜĞÜ olur ve
  // sonra DONDURULUR → okuma boyunca (sayfa çevirme, kâri takibi, uzak gidiş) yazı boyu hiç
  // değişmez. Daha dolu bir sayfa ileride çıkarsa o sayfanın içi kaydırılır.
  const olcekKey = `${Math.round(sayfaW)}x${Math.round(sayfaH)}|${olcekAnahtar}`
  const ornekRef = useRef({ key: "", min: null, ilk: 0, donuk: false })
  if (ornekRef.current.key !== olcekKey) ornekRef.current = { key: olcekKey, min: null, ilk: 0, donuk: false }
  const [ortak, setOrtak] = useState({ key: "", deger: null })
  const bildir = useCallback((id, ham) => {
    const o = ornekRef.current
    if (o.key !== olcekKey || o.donuk) return
    const simdi = Date.now()
    if (!o.ilk) {
      o.ilk = simdi
      setTimeout(() => { if (ornekRef.current === o) o.donuk = true }, 1200)
    }
    if (o.min != null && ham >= o.min) return
    o.min = ham
    const deger = Math.round(ham * 1000) / 1000
    setOrtak({ key: olcekKey, deger })
  }, [olcekKey])
  const olcekDegeri = { deger: ortak.key === olcekKey ? ortak.deger : null, bildir }

  const yayilimCiz = (b) => {
    const sayfalar = cift ? [b, b + 1].filter(x => x >= 1 && x <= n) : [b]
    // rtl: ilk sayfa SAĞDA; ltr: ilk sayfa SOLDA
    const sira = rtl ? [...sayfalar].reverse() : sayfalar
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", height: `${sayfaH}px`, filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.18))" }}>
        {cift && sayfalar.length === 1 && rtl && <div style={{ width: `${sayfaW}px` }} />}
        {sira.map((no) => {
          const taraf = !cift ? "tek" : (no === b ? (rtl ? "sag" : "sol") : (rtl ? "sol" : "sag"))
          return (
            <div key={no} data-kitap-sayfa={no} style={{ position: "relative", width: `${sayfaW}px`, height: `${sayfaH}px`, background: theme.background, overflow: "hidden" }}>
              {sayfaCiz(no, { w: sayfaW, h: sayfaH, taraf })}
              {/* cilt gölgesi (iki sayfada iç kenar) */}
              {cift && (
                <div aria-hidden="true" style={{
                  position: "absolute", top: 0, bottom: 0, width: "26px", pointerEvents: "none",
                  [taraf === "sag" ? "left" : "right"]: 0,
                  background: `linear-gradient(${taraf === "sag" ? "to right" : "to left"}, rgba(0,0,0,0.13), rgba(0,0,0,0))`,
                }} />
              )}
            </div>
          )
        })}
        {cift && sayfalar.length === 1 && !rtl && <div style={{ width: `${sayfaW}px` }} />}
      </div>
    )
  }

  // Görünen + komşu yayılımlar (komşular yalnız sürükleme/çevirme sırasında görünür)
  const komsular = [
    { b: bas, ofs: 0 },
    ...(bas + adim <= n ? [{ b: bas + adim, ofs: ileriIsaret * W }] : []),
    ...(bas - adim >= 1 ? [{ b: bas - adim, ofs: -ileriIsaret * W }] : []),
  ]
  const gecis = anim && !hareketAzMi() ? "transform 0.32s cubic-bezier(.25,.8,.3,1), opacity 0.32s ease" : "none"

  return (
    <div
      ref={kutuRef}
      data-kitap-kutu={jestKapali ? "jestsiz" : ""}
      className={className}
      onPointerDown={pDown} onPointerMove={pMove} onPointerUp={pUp} onPointerCancel={() => { surRef.current = null; setAnim(true); setDx(0) }}
      onClick={tikla}
      style={{
        position: "relative", flex: 1, minHeight: 0, overflow: "hidden",
        background: `color-mix(in srgb, ${theme.background} 90%, ${theme.text})`,
        touchAction: "pan-y", userSelect: "text",
        ...style,
      }}
    >
      <OlcekBaglami.Provider value={olcekDegeri}>
      <div style={{ position: "absolute", left: 0, right: 0, top: `${ustPay + kenar}px`, height: `${sayfaH}px`, perspective: "2200px" }}>
        {alanW > 0 && komsular.map(({ b, ofs }) => {
          const p = Math.max(-1, Math.min(1, (ofs + dx) / W))   // −1…1: merkeze uzaklık
          const egim = p * (rtl ? 9 : -9)
          const golge = Math.abs(p)
          return (
            <div key={b} aria-hidden={ofs !== 0 ? "true" : undefined} style={{
              position: "absolute", left: `${kenar}px`, width: `${yayilimW}px`, top: 0, height: `${sayfaH}px`,
              transform: `translateX(${ofs + dx}px) rotateY(${egim}deg)`,
              transformOrigin: p < 0 ? "right center" : "left center",
              transition: gecis,
              willChange: dx || anim ? "transform" : undefined,
              visibility: ofs !== 0 && ((!dx && !anim) || giris) ? "hidden" : "visible",
              opacity: giris && ofs === 0 ? Math.max(0.35, 1 - Math.abs(dx) / (W * 0.6)) : 1,
              pointerEvents: ofs !== 0 ? "none" : "auto",
            }}>
              {yayilimCiz(b)}
              {/* kâğıt gölgesi — çevrilirken koyulaşır */}
              {golge > 0.01 && (
                <div aria-hidden="true" style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: `linear-gradient(${p < 0 ? "to left" : "to right"}, rgba(0,0,0,${0.22 * golge}), rgba(0,0,0,0) 55%)`,
                  transition: gecis === "none" ? "none" : "opacity 0.32s",
                }} />
              )}
            </div>
          )
        })}
      </div>
      </OlcekBaglami.Provider>
      {/* Geniş ekranda kenar okları (sade, üzerine gelince belirginleşir) */}
      {(alanW >= 700 || jestKapali) && (
        <>
          {[{ taraf: "left", d: rtl ? 1 : -1, Ikon: ChevronLeft }, { taraf: "right", d: rtl ? -1 : 1, Ikon: ChevronRight }].map(({ taraf, d, Ikon }) => (
            gecebilir(d) ? (
              <button key={taraf} onClick={(e) => { e.stopPropagation(); cevir(d) }}
                aria-label={d > 0 ? "Sonraki sayfa" : "Önceki sayfa"} title={d > 0 ? "Sonraki sayfa" : "Önceki sayfa"}
                className="vk-kitap-ok"
                style={{
                  position: "absolute", [taraf]: "2px", top: `${ustPay + kenar + sayfaH / 2 - 22}px`,
                  width: "30px", height: "44px", border: "none", borderRadius: "8px", cursor: "pointer",
                  background: "transparent", color: theme.textSecondary, display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: 0.35, transition: "opacity .2s",
                }}>
                <Ikon size={22} />
              </button>
            ) : null
          ))}
          <style>{`.vk-kitap-ok:hover{opacity:.85!important}`}</style>
        </>
      )}
    </div>
  )
}
