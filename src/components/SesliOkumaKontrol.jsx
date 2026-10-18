/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — SESLİ OKUMA DENETİMİ (okuma ekranı)
   src/components/SesliOkumaKontrol.jsx

   15 Ekim 2026. Bardaki "Sesli oku" düğmesi bunu açar; açılınca ekranda en üstte
   görünen satırdan okumaya başlar. Altta küçük bir hap:
       ⏮  ⏯  ⏭   1×   ⌖   ⚙   ✕
   ⌖ Cümle seçimi (16 Ekim 2026) — düğmeye basılınca metinde dokunulan kelimenin
     cümlesinden okunur. Seçim açıkken dokunuş başka işe (sözlük, bar) gitmez.
   ⚙ Ses kaynağı, âyetler (hafız kaydı + meal / yalnız meal, kâri), Arapça ibareler
     (uyarı / atla / Arapça sesle: Kerîm ya da cihaz sesi), işaret sesi, takip.
   SÜRÜKLEME: hap tutulup taşınabilir (yeri hatırlanır); ayarlar açıkken dışarı
   dokunulunca kapanır (16 Ekim 2026, kullanıcı).
   Ayarlarda cinsiyet / erişilebilirlik yol tarifleri gösterilmez (16 Ekim 2026, kullanıcı).

   VURGU: okunan satır hafif zeminle, okunan cümle (destekleyen tarayıcıda) CSS
   Custom Highlight ile işaretlenir — metnin DOM'una dokunulmaz. TAKİP: okunan satır
   görünür alanın dışına çıkınca yumuşakça kaydırılır; kullanıcı son 5 sn içinde
   elle kaydırdıysa araya girilmez. Sayfa henüz çizilmemişse `onSayfayaGit` çağrılır.
   Metin motoru: data/sesliOkuma.js
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { KitapAmblem, KITAP_CSS } from "./SesliMiniHap"
import { useHapKonumu } from "./DonusDugmesi"
import { SkipBack, SkipForward, Play, Pause, X, Settings2, Crosshair, Loader2, GripVertical, Glasses, Gauge, RotateCcw, SlidersHorizontal, Volume1, Volume2, VolumeX, Headphones, Timer } from "lucide-react"
import {
  sesliOkuyucu, sesliDestekVar, ayarOku, sesleriAl, turkceSesler, arapcaSesler, enIyiSes, konumOku,
  sesCinsiyeti, sesKilidiAc, kariSec, KARILAR,
} from "../data/sesliOkuma"

// Vukuf sesi (Piper) yardımcıları yalnız ayarlar açılınca / indirirken yüklenir
const vukufSesYukle = () => import("../data/vukufSes")
// Fahrettin 16, Fettah ve DFKI 17 Ekim 2026'da çıkarıldı. Her ses ayrı indirilir (grup).
// 18 Ekim 2026: MMS de çıkarıldı (kullanıcı: "daha sonra farklı bir ses bulursak ekleriz") → tek
// Türkçe okuyucu Antalia; "Okuyucu" seçimi yalnız listede birden çok ses varken görünür.
// Antalia (Antalia-2 Mini) 16 Ekim 2026'da eklendi ve varsayılan oldu (kullanıcı: "Piper'dan daha iyi")
const VUKUF_SES_LISTESI = [
  { id: "antalia", ad: "Antalia", grup: "antalia" },
]
const VUKUF_GRUPLARI = ["antalia", "ar"]
const VUKUF_TOPLAM_MB = 95
const VUKUF_ARAPCA_MB = 63            // Kerîm modeli
const VUKUF_MOTOR_MB = 30             // ses motoru + fonemleyici (Türkçe sesler inmişse zaten var)
const HAP_KONUM_ANAHTAR = "vukuf-sesli-hap-konum"

const HIGHLIGHT_AD = "vukuf-sesli"

function useSesliDurum() {
  return useSyncExternalStore(sesliOkuyucu.abone, sesliOkuyucu.durum, sesliOkuyucu.durum)
}

/* Paragrafta cümleyi bul → Range. <sup> içindekiler (dipnot no, haşiye "H") atlanır;
   boşluklar tek boşluğa indirgenerek eşleştirilir. */
function duzMetin(kok) {
  const tw = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT)
  const parcalar = []
  let duz = "", n
  while ((n = tw.nextNode())) {
    if (n.parentElement && n.parentElement.closest("sup")) continue
    const t = n.nodeValue || ""
    for (let i = 0; i < t.length; i++) {
      const ch = /\s/.test(t[i]) ? " " : t[i]
      if (ch === " " && (duz.endsWith(" ") || !duz.length)) continue
      parcalar.push([n, i]); duz += ch
    }
  }
  return { duz, parcalar }
}

function cumleAraligi(kok, aranan, baslangic = 0) {
  if (!kok || !aranan) return null
  const { duz, parcalar } = duzMetin(kok)
  const hedef = aranan.replace(/\s+/g, " ").trim()
  let i = duz.indexOf(hedef, baslangic)
  if (i < 0) i = duz.indexOf(hedef)
  if (i < 0) return null
  const [bn, bo] = parcalar[i], [sn, so] = parcalar[i + hedef.length - 1]
  try {
    const r = document.createRange()
    r.setStart(bn, bo); r.setEnd(sn, so + 1)
    return { r, son: i + hedef.length, bas: i }
  } catch { return null }
}

/* Dokunulan noktadaki satır + harf konumu → { sayfa, satir, ofset, duz } */
function dokunulanYer(x, y, hedef) {
  let dugum = null, ofs = 0
  try {
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y)
      if (p) { dugum = p.offsetNode; ofs = p.offset }
    } else if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y)
      if (r) { dugum = r.startContainer; ofs = r.startOffset }
    }
  } catch { /* yoksay */ }
  const el = (dugum && (dugum.nodeType === 3 ? dugum.parentElement : dugum))?.closest?.("[data-satir]")
    || hedef?.closest?.("[data-satir]")
  if (!el) return null
  const anahtar = el.getAttribute("data-satir") || ""
  const tire = anahtar.lastIndexOf("-")
  const sayfa = Number(anahtar.slice(0, tire)), satir = Number(anahtar.slice(tire + 1))
  if (!Number.isFinite(sayfa) || !Number.isFinite(satir)) return null
  // Konum alınamadıysa (eski tarayıcı) dokunulan kelimenin (span) ilk harfi
  if (!(dugum && dugum.nodeType === 3 && el.contains(dugum)) && hedef && el.contains(hedef)) {
    const tw0 = document.createTreeWalker(hedef, NodeFilter.SHOW_TEXT)
    dugum = tw0.nextNode(); ofs = 0
  }
  const { duz, parcalar } = duzMetin(el)
  let ofset = 0
  if (dugum && dugum.nodeType === 3 && el.contains(dugum)) {
    // Dokunulan harf (ya da <sup>/boşluk ise ondan sonraki ilk görünen harf)
    const dugumler = []
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let n
    while ((n = tw.nextNode())) dugumler.push(n)
    const sira = dugumler.indexOf(dugum)
    const k = parcalar.findIndex(([d, i]) => { const s = dugumler.indexOf(d); return s > sira || (s === sira && i >= ofs) })
    ofset = k < 0 ? duz.length : k
  }
  return { sayfa, satir, ofset, duz }
}

export default function SesliOkumaKontrol({
  acik, kapat, theme, isMobile, olcek = 1, kitapId, kitapMetni,
  baslangicAl, scrollEl, onSayfayaGit, altPay = 16, kitapAdi = "",
  arapcaKapali = false,      // Evrad ve Ezkâr: Arapça yapay sesle okunmaz (16 Ekim 2026, kullanıcı)
}) {
  const d = useSesliDurum()
  const [ayar, setAyar] = useState(() => ayarOku())
  const [ayarAcik, setAyarAcik] = useState(false)
  const [sesler, setSesler] = useState({ tr: [], ar: [] })
  /* TAKİP (17 Ekim 2026, kullanıcı: "farklı bir sayfadayken yer seçme düğmesine basınca sayfa
     okunan yere geçiyor, geçmemeli"; "takip sayfayı odaklamıyor, altına geçiyor"; "gözlük
     düğmesiyle, farklı sayfadaysak okumayı hizalayabilmeliyiz").
     Elle kaydırınca takip ASKIYA alınır (eskiden 5 sn sonra kendiliğinden geri dönüyordu).
     Okunan yer yeniden görünür alana girerse ya da 👓 düğmesine basılırsa takip sürer.
     Kaydırma hedefi artık okunan CÜMLE (uzun paragrafta paragrafın başı değil). */
  const ayrildiRef = useRef(false)
  const [ayrildi, setAyrildi] = useState(false)
  const ayrilmaYaz = (v) => { ayrildiRef.current = v; setAyrildi(v) }
  const secimRef = useRef(false)
  const hedefRef = useRef(null)                            // () => okunan cümlenin/satırın dikdörtgeni
  const sonBirimRef = useRef({ birim: null, bas: 0 })     // aynı birim yeniden çizilirse aynı yerden ara
  const [tazele, setTazele] = useState(0)                  // 👓 sonrası vurguyu/takibi yeniden uygula
  const isaretliRef = useRef([])
  const cumleKonumRef = useRef({ satirAnahtar: "", son: 0 })
  const [secim, setSecim] = useState(false)                 // ⌖ açık: okunacak kelime bekleniyor
  const ac = theme.accent
  const px = (v) => `${Math.round(v * olcek)}px`

  /* Açılınca başla; kapanınca dur.
     DEVAMLI OKUMA (17 Ekim 2026): ayar açıksa okuma ekranından ÇIKINCA okuma sürer (öbür
     ekranlarda SesliMiniHap). ✕ ile kapatınca her hâlükârda durur. Aynı kitaba dönülüp denetim
     açılınca baştan başlamaz, süren okumaya bağlanır. */
  const kapatmaRef = useRef(false)
  const kapatVeDurdur = () => { kapatmaRef.current = true; kapat() }
  useEffect(() => {
    if (!acik) return
    kapatmaRef.current = false
    const coz = sesliOkuyucu.kontrolBagla()
    sesliOkuyucu.bilgiYaz({ kitapId, kitapAdi })
    const d0 = sesliOkuyucu.durum()
    const sururken = ["okuyor", "duraklatildi", "hazirlaniyor"].includes(d0.durum) && sesliOkuyucu.kitap() === kitapId
    let iptal = false
    if (!sesliDestekVar() || sururken) {
      if (sururken) sesleriAl().then(v => { if (!iptal) setSesler({ tr: turkceSesler(v), ar: arapcaSesler(v) }) })
      return () => { iptal = true; coz(); if (kapatmaRef.current || !ayarOku().devamli) sesliOkuyucu.durdur() }
    }
    ;(async () => {
      const meal = (await import("../data/ayet-meal.json")).default
      if (iptal) return
      // Ekrandaki yerden başla; aynı sayfada daha ileride kalınmışsa KALDIĞI YERDEN sürsün
      const ekran = baslangicAl() || { sayfa: kitapMetni?.[0]?.sayfa, satir: 0 }
      const kayit = konumOku(kitapId)
      const bas = kayit && kayit.sayfa === ekran.sayfa && kayit.satir > ekran.satir ? kayit : ekran
      sesliOkuyucu.baslat({ kitapId, kitapMetni, baslangic: bas, ayetMeal: meal, arapcaKapali })
    })()
    sesleriAl().then(v => { if (!iptal) setSesler({ tr: turkceSesler(v), ar: arapcaSesler(v) }) })
    return () => {
      iptal = true; coz()
      // ✕ ile kapatıldıysa ya da devamlı okuma kapalıysa dur; değilse (ekrandan çıkış) sürsün
      if (kapatmaRef.current || !ayarOku().devamli) sesliOkuyucu.durdur()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, kitapId])

  // Elle kaydırma: takip askıya (bkz. yukarı)
  useEffect(() => {
    const el = scrollEl?.()
    if (!acik || !el) return
    const elle = () => { if (!ayrildiRef.current) ayrilmaYaz(true) }
    el.addEventListener("wheel", elle, { passive: true })
    el.addEventListener("touchmove", elle, { passive: true })
    return () => { el.removeEventListener("wheel", elle); el.removeEventListener("touchmove", elle) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik])

  // ⌖ CÜMLE SEÇİMİ: açıkken metne ilk dokunuş yakalanır (sözlük / bar gibi işlere gitmeden)
  useEffect(() => {
    if (!acik || !secim) return
    const kap = scrollEl?.()
    kap?.classList.add("sesli-secim")
    const tik = (e) => {
      const satirEl = e.target?.closest?.("[data-satir]")
      if (!satirEl || (kap && !kap.contains(satirEl))) return
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.()
      const yer = dokunulanYer(e.clientX, e.clientY, e.target)
      setSecim(false)
      if (!yer) return
      try { window.getSelection()?.removeAllRanges() } catch { /* yoksay */ }
      sesKilidiAc()
      ayrilmaYaz(false)                                      // seçilen yerden okunur → takip sürer
      import("../data/ayet-meal.json").then(m => sesliOkuyucu.baslat({ kitapId, kitapMetni, baslangic: yer, ayetMeal: m.default, arapcaKapali }))
    }
    const tus = (e) => { if (e.key === "Escape") setSecim(false) }
    window.addEventListener("click", tik, true)
    window.addEventListener("keydown", tus)
    return () => {
      kap?.classList.remove("sesli-secim")
      window.removeEventListener("click", tik, true)
      window.removeEventListener("keydown", tus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, secim, kitapId, kitapMetni])
  useEffect(() => { if (!acik) setSecim(false) }, [acik])
  useEffect(() => { secimRef.current = secim }, [secim])

  // Vurgu + takip
  useEffect(() => {
    const temizle = () => {
      // "Okunup geçilen kısımlar kısmen işaretli kalabiliyor" (17 Ekim 2026): React bazen satır
      // öğesini başka bir satır için yeniden kullanıyor → eski sınıf orada kalıyordu. Artık
      // belgede bu sınıfı taşıyan HER öğe temizleniyor.
      document.querySelectorAll(".sesli-satir").forEach(el => el.classList.remove("sesli-satir"))
      isaretliRef.current = []
      try { if (window.CSS && window.CSS.highlights) window.CSS.highlights.delete(HIGHLIGHT_AD) } catch { /* yoksay */ }
    }
    /* iOS/WebKit: Custom Highlight değişince eski cümlenin boyası her zaman silinmiyor; okunup
       geçilen satırların altında soluk şeritler kalıyordu (18 Ekim 2026 ekran görüntüsü). Eski ve
       yeni satırlar iki kare boyunca kendi katmanına alınıp bırakılıyor → tarayıcı onları
       baştan boyuyor. Yalnız transform (yerleşim değişmez). */
    const yenidenBoya = (els) => {
      const l = els.filter(el => el && el.isConnected && !el.style.transform)
      if (!l.length) return
      l.forEach(el => { el.style.transform = "translateZ(0)" })
      requestAnimationFrame(() => requestAnimationFrame(() => l.forEach(el => { if (el.style.transform === "translateZ(0)") el.style.transform = "" })))
    }
    const b = d.birim
    if (!acik || !b) { temizle(); return }
    let deneme = 0, zaman = 0
    const uygula = () => {
      const oncekiler = isaretliRef.current.slice()
      temizle()
      const nolar = b.satirlar && b.satirlar.length ? b.satirlar : [b.satir]
      const els = nolar.map(s => document.querySelector(`[data-satir="${b.sayfa}-${s}"]`)).filter(Boolean)
      if (!els.length) {
        // Sayfa henüz çizilmedi → (takip sürüyorsa) oraya git, sonra yeniden dene
        if (deneme === 0 && ayar.takip && !ayrildiRef.current && !secimRef.current) onSayfayaGit?.(b.sayfa, b.satir)
        if (deneme++ < 20) zaman = setTimeout(uygula, 150)
        return
      }
      els.forEach(el => el.classList.add("sesli-satir"))
      isaretliRef.current = els
      yenidenBoya([...new Set([...oncekiler, ...els])])
      // Cümle vurgusu (Custom Highlight API varsa)
      const anahtar = `${b.sayfa}-${b.satir}`
      if (cumleKonumRef.current.satirAnahtar !== anahtar) cumleKonumRef.current = { satirAnahtar: anahtar, son: 0 }
      let aralik = null
      if (b.goster) {
        const ayniBirim = sonBirimRef.current.birim === b
        const bul = cumleAraligi(els[0], b.goster, ayniBirim ? sonBirimRef.current.bas : cumleKonumRef.current.son)
        if (bul) {
          cumleKonumRef.current.son = bul.son
          sonBirimRef.current = { birim: b, bas: bul.bas }
          aralik = bul.r
          if (window.CSS && window.CSS.highlights && typeof window.Highlight === "function") {
            try { window.CSS.highlights.set(HIGHLIGHT_AD, new window.Highlight(bul.r)) } catch { /* yoksay */ }
          }
        }
      }
      // Hedef: okunan cümle (bulunduysa), değilse satır(lar)
      hedefRef.current = () => {
        try {
          if (aralik) { const r = aralik.getBoundingClientRect(); if (r.height > 0) return r }
        } catch { /* yoksay */ }
        return els[0].isConnected ? els[0].getBoundingClientRect() : null
      }
      // Takip: askıda değilse ve cümle görünür bandın dışındaysa yumuşakça kaydır
      const kap = scrollEl?.()
      if (ayar.takip && kap && !secimRef.current) {
        const kr = kap.getBoundingClientRect(), er = hedefRef.current()
        if (er) {
          const gorunur = er.bottom > kr.top + 8 && er.top < kr.bottom - 8
          if (ayrildiRef.current && gorunur) ayrilmaYaz(false)      // okuyucu okunan yere döndü
          if (!ayrildiRef.current) {
            const ust = kr.top + kr.height * 0.12, alt = kr.top + kr.height * 0.68
            if (er.top < ust || er.bottom > alt) {
              kap.scrollBy({ top: er.top - (kr.top + kr.height * 0.3), behavior: "smooth" })
            }
          }
        }
      }
    }
    uygula()
    return () => clearTimeout(zaman)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, d.birim, tazele])

  // Bitti → kısa süre sonra kendiliğinden kapanmaz; düğme "baştan değil, kaldığı yerden" yeniden başlatır
  const ayarDegis = (parca) => { setAyar(a => ({ ...a, ...parca })); sesliOkuyucu.ayarlariYenile(parca) }

  // 👓 OKUNAN YERE HİZALA: takip yeniden başlar; sayfa çizili değilse önce oraya gidilir
  const hizala = () => {
    ayrilmaYaz(false)
    const b = d.birim
    const kap = scrollEl?.()
    if (!b || !kap) return
    const kaydir = () => {
      const er = hedefRef.current?.()
      if (!er) return false
      const kr = kap.getBoundingClientRect()
      kap.scrollBy({ top: er.top - (kr.top + kr.height * 0.3), behavior: "smooth" })
      return true
    }
    const satirVar = document.querySelector(`[data-satir="${b.sayfa}-${b.satir}"]`)
    if (satirVar && kaydir()) return
    // Sayfa çizili değil: oraya git, sonra vurguyu yeniden uygula (takip açık → cümleye hizalanır)
    onSayfayaGit?.(b.sayfa, b.satir)
    setTimeout(() => setTazele(t => t + 1), 350)
  }

  /* HIZ (17 Ekim 2026, kullanıcı: "PlayerBar'daki hızlandırma düğmesi mantığında"): düğme küçük
     bir kutu açar — kaydırıcı (0,5–2×), değer, 1×'e dönüş. Varsayılandan farklıysa düğmede
     küçük rozet. Kaydırırken her adımda değil, bırakınca/kısa beklemeden sonra uygulanır
     (her uygulama okunan cümleyi yeniden hazırlıyor). */
  const [hizAcik, setHizAcik] = useState(false)
  const [hizDeger, setHizDeger] = useState(() => Number(ayarOku().hiz) || 1)
  const hizZamanRef = useRef(0)
  useEffect(() => { setHizDeger(Number(ayar.hiz) || 1) }, [ayar.hiz])
  const hizDegis = (v, hemen) => {
    const y = Math.round(Math.max(0.5, Math.min(2, v)) * 20) / 20
    setHizDeger(y)
    clearTimeout(hizZamanRef.current)
    hizZamanRef.current = setTimeout(() => { if (y !== Number(ayar.hiz)) ayarDegis({ hiz: y }) }, hemen ? 0 : 350)
  }
  const hizYaz = (v) => `${String(v).replace(".", ",")}×`
  // SES DÜZEYİ (0–200 %): kaydırıcı yerel, uygulama kısa gecikmeyle; simgeye dokunmak sessize alır/geri açar
  const [sesDeger, setSesDeger] = useState(() => Number(ayarOku().ses ?? 1))
  const sesZamanRef = useRef(0)
  const oncekiSesRef = useRef(1)
  useEffect(() => { setSesDeger(Number(ayar.ses ?? 1)) }, [ayar.ses])
  useEffect(() => { if (sesDeger > 0) oncekiSesRef.current = sesDeger }, [sesDeger])
  const sesDegis = (v, hemen) => {
    const y = Math.round(Math.max(0, Math.min(2, v)) * 20) / 20
    setSesDeger(y)
    clearTimeout(sesZamanRef.current)
    sesZamanRef.current = setTimeout(() => { if (y !== Number(ayar.ses ?? 1)) ayarDegis({ ses: y }) }, hemen ? 0 : 150)
  }
  const SesIkon = sesDeger === 0 ? VolumeX : sesDeger < 0.5 ? Volume1 : Volume2

  /* OTOMATİK GİZLEME (18 Ekim 2026, kullanıcı: "oynatıcılara otomatik gizleme ayarı ekleyelim,
     saniye seçilebilsin; açıkken mini moda geçsin ve sürüklenebilsin; OkumaEkranında açık
     konumdayken son bırakıldığı yere dönsün"). Açıksa denetime gizleSn saniye dokunulmayınca
     (ayar/hız kutusu açık değilken, cümle seçilmiyorken) tek yuvarlak düğmeye (KitapAmblem)
     iner. Küçük düğme AYRI yerde durur ve sürüklenir ("vukuf-hap-konum-sesli-kucuk");
     dokununca denetim, hapın son bırakıldığı yerde (HAP_KONUM_ANAHTAR) yeniden açılır.
     Okuma, vurgu ve takip küçükken de sürer. */
  const [gizleSnDeger, setGizleSnDeger] = useState(() => Number(ayarOku().gizleSn) || 8)
  useEffect(() => { setGizleSnDeger(Number(ayar.gizleSn) || 8) }, [ayar.gizleSn])
  const gizleZamanRef = useRef(0)
  const gizleSnDegis = (v, hemen) => {
    const y = Math.round(Math.max(3, Math.min(30, v)))
    setGizleSnDeger(y)
    clearTimeout(gizleZamanRef.current)
    gizleZamanRef.current = setTimeout(() => { if (y !== Number(ayar.gizleSn)) ayarDegis({ gizleSn: y }) }, hemen ? 0 : 250)
  }
  const [kucuk, setKucuk] = useState(false)
  const [dokunus, setDokunus] = useState(0)
  useEffect(() => { if (!acik) setKucuk(false) }, [acik])
  useEffect(() => { if (!ayar.gizle) setKucuk(false) }, [ayar.gizle])
  useEffect(() => {
    if (!acik || !ayar.gizle || kucuk || ayarAcik || hizAcik || secim) return
    const t = setTimeout(() => { if (!surukleRef.current) setKucuk(true) }, (Number(ayar.gizleSn) || 8) * 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, ayar.gizle, ayar.gizleSn, kucuk, ayarAcik, hizAcik, secim, dokunus])

  // VUKUF SESİ: indirilmiş mi, indirme ilerlemesi — gruplar: "antalia" · "ar" (Kerîm)
  const [vukufHazir, setVukufHazir] = useState({ antalia: null, ar: null })   // null: bilinmiyor
  const [indirme, setIndirme] = useState(null)              // { grup, oran, ad } | { grup, hata, ayrinti }
  const [eksik, setEksik] = useState({})                    // grup → eksik MB (motor zaten inmişse yalnız ses modeli)
  const indirmeIptalRef = useRef(null)
  useEffect(() => {
    if (!acik) return
    let iptal = false
    vukufSesYukle()
      .then(async m => {
        const v = {}, e = {}
        for (const g of VUKUF_GRUPLARI) {
          v[g] = await m.indirilmisMi(g)
          if (!v[g]) e[g] = await m.eksikMb(g)
        }
        if (!iptal) setEksik(e)
        return v
      })
      .then(v => { if (!iptal) setVukufHazir(v) })
      .catch(() => { if (!iptal) setVukufHazir({ antalia: false, ar: false }) })
    return () => { iptal = true }
  }, [acik])
  // Vukuf sesi yokken açılırsa ayarlar kendiliğinden açılsın (indirme orada)
  useEffect(() => { if (d.hata === "vukufYok") setAyarAcik(true) }, [d.hata])
  const vukufIndir = async (grup = "antalia") => {
    const k = new AbortController()
    indirmeIptalRef.current = k
    setIndirme({ grup, oran: 0, ad: "" })
    try {
      const m = await vukufSesYukle()
      await m.indir((p) => setIndirme({ grup, oran: p.oran, ad: p.ad }), k.signal, grup)
      setIndirme(null); setVukufHazir(v => ({ ...v, [grup]: true }))
      // Motor inmiş oldu → öbür seslerin eksik boyutu küçüldü
      const e = {}
      for (const g of VUKUF_GRUPLARI) if (g !== grup) e[g] = await m.eksikMb(g)
      setEksik(e)
      if (grup !== "ar") {
        ayarDegis({ motor: "vukuf" })
        if (d.durum === "kapali" || d.hata === "vukufYok") baslatYeniden()
      } else {
        // Kerîm indi → okunuyorsa bulunulan satırdan Kerîm'le sürsün
        ayarDegis({ arSes: "kerim" })
      }
    } catch (e) {
      setIndirme(k.signal.aborted ? null : { grup, hata: true, ayrinti: e?.message || "", url: e?.url || "" })
    } finally { indirmeIptalRef.current = null }
  }
  const vukufSil = async (grup) => {
    const m = await vukufSesYukle()
    await m.sil(grup)
    if (grup === "ar") { setVukufHazir(v => ({ ...v, ar: false })); if (d.durum !== "kapali") ayarDegis({ arSes: ayar.arSes }) }
    else if (grup) {
      setVukufHazir(v => ({ ...v, [grup]: false }))
      // Silinen ses seçiliyse cihazda kalan bir sese geç (yoksa varsayılan)
      const kalan = VUKUF_SES_LISTESI.find(v => v.grup !== grup && vukufHazir[v.grup])
      if (VUKUF_SES_LISTESI.find(v => v.id === ayar.vukufSes)?.grup === grup) ayarDegis({ vukufSes: (kalan || VUKUF_SES_LISTESI[0]).id })
    }
    else { setVukufHazir({ antalia: false, ar: false }); if (ayar.motor === "vukuf") ayarDegis({ motor: "cihaz" }) }
    try { const e = {}; for (const g of VUKUF_GRUPLARI) e[g] = await m.eksikMb(g); setEksik(e) } catch { /* yoksay */ }
  }
  /* HIZ TESTİ (16 Ekim 2026, iPhone'da cümle başına ~30 sn): nerede beklendiğini ölçer —
     dosya okuma, motor, ses modeli, fonemleme, çıkarım — ve kopyalanabilir metin verir. */
  const [hizTest, setHizTest] = useState(null)            // null | { calisiyor } | { metin } | { hata }
  const sn = (ms) => (ms == null ? "?" : (ms / 1000).toFixed(1).replace(".", ","))
  const hizTestiYap = async () => {
    if (d.durum === "okuyor") sesliOkuyucu.duraklat()
    setHizTest({ calisiyor: true })
    try {
      const m = await vukufSesYukle()
      const t = await m.hizTesti(ayar.vukufSes)
      const k = t.kurulum || {}, sk = t.ses || {}, o = t.ortam || {}
      const satirlar = [
        `Hazırlık: ${sn(t.hazirlikMs)} sn (dosyalar ${sn(k.dosyaMs)} · motor ${sn(k.motorMs)} · fonemleyici ${sn(k.fonemleyiciMs)} · ses dosyası ${sn(sk.dosyaMs)} · ses kurulumu ${sn(sk.oturumMs)})`,
        ...t.cumleler.map((c, i) => `Cümle ${i + 1}: ${sn(c.sesMs)} sn ses → ${sn(c.toplamMs)} sn (fonem ${c.fonemMs ?? "?"} ms · çıkarım ${sn(c.cikarimMs)} sn · ${c.fonemSayisi ?? "?"} fonem) · oran ${c.sesMs ? (c.toplamMs / c.sesMs).toFixed(1).replace(".", ",") : "?"}`),
        `JS ölçüsü: ${t.js} ms · ORT ${o.ort || "?"} · SIMD: ${o.simd == null ? "?" : o.simd ? "var" : "yok"} · çekirdek: ${o.cekirdek || "?"} · işçi: ${t.isci} · izole: ${o.izole ? "evet" : "hayır"} · güvenli kök: ${t.guvenli ? "evet" : "hayır"}`,
        t.tarayici,
      ]
      setHizTest({ metin: satirlar.join("\n") })
    } catch (e) {
      setHizTest({ hata: e?.message || String(e) })
    }
  }
  const hizTestiKopyala = async (metin) => {
    try { await navigator.clipboard.writeText(metin); setHizTest(h => ({ ...h, kopyalandi: true })) }
    catch { setHizTest(h => ({ ...h, kopyalanamadi: true })) }
  }

  const baslatYeniden = () => {
    import("../data/ayet-meal.json").then(m => sesliOkuyucu.baslat({ kitapId, kitapMetni, baslangic: baslangicAl(), ayetMeal: m.default, arapcaKapali }))
  }

  /* ── SÜRÜKLEME (16 Ekim 2026, kullanıcı: "bu menü sürüklenebilir olmalı") ──────
     Hap, boş yerinden ya da bir düğmesinden tutulup (6 px'ten fazla kaydırınca)
     taşınır; bırakılan yer cihazda hatırlanır. Ekran dışına çıkamaz. Hap ekranın
     üst yarısındaysa ayarlar AŞAĞI doğru açılır. */
  const bolgeRef = useRef(null)
  const hapRef = useRef(null)
  const [konum, setKonum] = useState(() => {
    try {
      const k = JSON.parse(localStorage.getItem(HAP_KONUM_ANAHTAR) || "null")
      if (k && Number.isFinite(k.x) && Number.isFinite(k.y)) return k
    } catch { /* yoksay */ }
    return { x: 0, y: 0 }
  })
  const konumRef = useRef(konum)
  konumRef.current = konum
  const surukleRef = useRef(null)                          // { id, x0, y0, k0, tasindi }
  const yutRef = useRef(0)                                 // bu zamana kadar gelen tıklama yutulur
  const [asagiAc, setAsagiAc] = useState(false)
  const [panelYuk, setPanelYuk] = useState(0)
  const [kayma, setKayma] = useState(0)                    // ayar paneli ekrandan taşmasın diye yatay kayma

  const sinirla = (k) => {
    const el = hapRef.current
    if (!el) return k
    const r = el.getBoundingClientRect()
    const solTaban = r.left - konumRef.current.x, ustTaban = r.top - konumRef.current.y
    const vw = window.innerWidth, vh = window.innerHeight, m = 6
    return {
      x: Math.round(Math.min(vw - m - r.width - solTaban, Math.max(m - solTaban, k.x))),
      y: Math.round(Math.min(vh - m - r.height - ustTaban, Math.max(m - ustTaban, k.y))),
    }
  }
  const yerlesimHesapla = () => {
    const el = hapRef.current
    if (!el) return
    const r = el.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth
    const asagi = r.top + r.height / 2 < vh / 2
    setAsagiAc(asagi)
    setPanelYuk(Math.max(180, Math.round((asagi ? vh - r.bottom : r.top) - 70)))
    const w = Math.min(360, vw - 20), merkez = r.left + r.width / 2
    const sol = Math.min(vw - 10 - w, Math.max(10, merkez - w / 2))
    setKayma(Math.round(sol - (merkez - w / 2)))
  }
  useEffect(() => {
    if (!acik) return
    const f = () => { setKonum(k => sinirla(k)); requestAnimationFrame(yerlesimHesapla) }
    f()
    window.addEventListener("resize", f)
    return () => window.removeEventListener("resize", f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik])
  useEffect(() => { if (acik && ayarAcik) yerlesimHesapla() }, [acik, ayarAcik])   // eslint-disable-line react-hooks/exhaustive-deps

  // Hareket/bırakma pencereye bağlanır: parmak haptan hızla çıksa da sürükleme sürer
  // (işaretçi yakalama kullanılmıyor — düğmelerin tıklaması bozulmasın)
  const hapBas = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    const s = { id: e.pointerId, x0: e.clientX, y0: e.clientY, k0: konumRef.current, tasindi: false }
    surukleRef.current = s
    const kaydir = (ev) => {
      if (ev.pointerId !== s.id) return
      const dx = ev.clientX - s.x0, dy = ev.clientY - s.y0
      if (!s.tasindi) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        s.tasindi = true
      }
      ev.preventDefault?.()
      setKonum(sinirla({ x: s.k0.x + dx, y: s.k0.y + dy }))
    }
    const birak = (ev) => {
      if (ev.pointerId !== s.id) return
      window.removeEventListener("pointermove", kaydir)
      window.removeEventListener("pointerup", birak)
      window.removeEventListener("pointercancel", birak)
      surukleRef.current = null
      if (!s.tasindi) return
      yutRef.current = Date.now() + 400                    // bırakınca altındaki düğme çalışmasın
      requestAnimationFrame(() => {
        try { localStorage.setItem(HAP_KONUM_ANAHTAR, JSON.stringify(konumRef.current)) } catch { /* yoksay */ }
        yerlesimHesapla()
      })
    }
    window.addEventListener("pointermove", kaydir, { passive: false })
    window.addEventListener("pointerup", birak)
    window.addEventListener("pointercancel", birak)
  }

  /* ── DIŞARI DOKUNUNCA AYARLAR KAPANIR (16 Ekim 2026, kullanıcı) ─────────────
     O dokunuş başka bir işe (sözlük, bar) gitmez — yalnız menüyü kapatır. */
  useEffect(() => {
    if (!acik || (!ayarAcik && !hizAcik)) return
    const bas = (e) => {
      if (bolgeRef.current && !bolgeRef.current.contains(e.target)) {
        setAyarAcik(false); setHizAcik(false)
        yutRef.current = Date.now() + 700
      }
    }
    document.addEventListener("pointerdown", bas, true)
    return () => document.removeEventListener("pointerdown", bas, true)
  }, [acik, ayarAcik, hizAcik])
  useEffect(() => {
    if (!acik) return
    const tik = (e) => {
      if (Date.now() > yutRef.current) return
      yutRef.current = 0
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.()
    }
    window.addEventListener("click", tik, true)
    return () => window.removeEventListener("click", tik, true)
  }, [acik])

  if (!acik) return null
  if (kucuk) {
    const hal = (d.durum === "hazirlaniyor" || (d.durum === "okuyor" && d.bekliyor)) ? "hazirlaniyor"
      : d.durum === "okuyor" ? "okuyor" : "duraklatildi"
    return <SesliKucuk theme={theme} hal={hal} altPay={altPay} ac={() => { setKucuk(false); setDokunus(n => n + 1) }} />
  }
  const destek = sesliDestekVar() || typeof Audio !== "undefined"
  const vukuf = ayar.motor === "vukuf"
  const okuyor = d.durum === "okuyor"
  const hazirlaniyor = d.durum === "hazirlaniyor" || (d.durum === "okuyor" && !!d.bekliyor)
  const trSes = enIyiSes(sesler.tr, ayar.sesTr)
  const kariAdi = (id) => (KARILAR.find(k => k.id === id)?.label || "").replace(/\s+/g, " ").trim()

  const dugme = (icerik, onClick, etiket, vurgu) => (
    <button onClick={onClick} title={etiket} aria-label={etiket}
      style={{
        width: px(36), height: px(36), borderRadius: "999px", border: "none", cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: vurgu ? ac : "transparent", color: vurgu ? "#fff" : theme.text,
      }}>{icerik}</button>
  )
  const cip = (secili, etiket, onClick, kapali) => (
    <button key={etiket} onClick={kapali ? undefined : onClick} disabled={kapali}
      style={{
        padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontFamily: "inherit", cursor: kapali ? "not-allowed" : "pointer",
        border: `1px solid ${secili ? ac : theme.border}`, background: secili ? `${ac}18` : "transparent",
        color: kapali ? `${theme.textSecondary}88` : (secili ? ac : theme.text), fontWeight: secili ? 700 : 500,
      }}>{etiket}</button>
  )
  const baslik = (t, ust = 12) => <div style={{ fontWeight: 700, margin: `${ust}px 0 6px` }}>{t}</div>
  const not = (t) => <div style={{ color: theme.textSecondary, fontSize: "11px", lineHeight: 1.5, marginTop: "6px" }}>{t}</div>
  const secici = (deger, degis, secenekler) => (
    <select value={deger} onChange={e => degis(e.target.value)}
      style={{ width: "100%", padding: "7px 8px", borderRadius: "9px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontFamily: "inherit", fontSize: "12.5px" }}>
      {secenekler.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  )
  const kucukDugme = (t, onClick, renk) => (
    <button onClick={onClick} style={{ background: "none", border: "none", color: renk || theme.textSecondary, cursor: "pointer", fontSize: "11.5px", padding: 0, fontFamily: "inherit", fontWeight: renk ? 700 : 400, textDecoration: renk ? "none" : "underline" }}>{t}</button>
  )
  // İndirme kartı / ilerleme / hata — iki grup için ortak
  const indirmeAlani = (grup, metin) => {
    const bu = indirme && indirme.grup === grup
    const baska = indirme && indirme.grup !== grup && !indirme.hata
    return (
      <>
        {vukufHazir[grup] === false && !bu && (
          <div style={{ marginTop: "10px", padding: "10px", borderRadius: "10px", background: `${ac}0f`, border: `1px solid ${ac}30` }}>
            <div style={{ lineHeight: 1.55 }}>{metin}</div>
            <button onClick={() => vukufIndir(grup)} disabled={baska} style={{
              marginTop: "8px", padding: "7px 14px", borderRadius: "999px", border: "none", cursor: baska ? "not-allowed" : "pointer",
              background: baska ? theme.border : ac, color: "#fff", fontWeight: 700, fontSize: "12.5px", fontFamily: "inherit",
            }}>İndir</button>
          </div>
        )}
        {bu && !indirme.hata && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: theme.textSecondary }}>
              <span>{indirme.ad ? `${indirme.ad} indiriliyor…` : "Hazırlanıyor…"}</span>
              <span>%{Math.round((indirme.oran || 0) * 100)}</span>
            </div>
            <div style={{ height: "5px", borderRadius: "3px", background: `${ac}22`, margin: "5px 0", overflow: "hidden" }}>
              <div style={{ width: `${Math.round((indirme.oran || 0) * 100)}%`, height: "100%", background: ac, transition: "width .3s" }} />
            </div>
            {kucukDugme("Durdur", () => indirmeIptalRef.current?.abort())}
          </div>
        )}
        {bu && indirme.hata && (
          <div style={{ marginTop: "8px", color: "#c0392b", fontSize: "11.5px", lineHeight: 1.5 }}>
            İndirme tamamlanamadı; internet bağlantısı varken yeniden denenebilir. İnen parçalar saklandı.
            {indirme.ayrinti && <span style={{ display: "block", color: theme.textSecondary, marginTop: "4px", wordBreak: "break-word" }}>Ayrıntı: {indirme.ayrinti}</span>}{" "}
            {kucukDugme("Yeniden dene", () => vukufIndir(grup), ac)}
          </div>
        )}
      </>
    )
  }

  const bilgi = !destek ? "Bu tarayıcı sesli okumayı desteklemiyor."
    : secim ? "Okumanın başlayacağı kelimeye dokunulabilir."
    : d.durum === "bitti" ? "Kitabın sonuna gelindi."
    : d.hata === "trSes" ? "Bu cihazda Türkçe ses bulunamadı; ayarlardan Vukuf sesi seçilebilir."
    : d.hata === "vukufYok" ? "Vukuf sesi için indirilmesi gereken parçalar var; ayarlardan indirilebilir."
    : d.hata === "vukufHata" ? "Vukuf sesi açılamadı; ayarlardan cihaz sesine geçilebilir."
    : d.hata === "vukufCal" ? "Ses çalınamadı; ▶ ile yeniden denenebilir."
    : d.yavas && vukuf ? "Bu cihaz Vukuf sesini okunduğundan yavaş hazırlıyor; cümle aralarında beklemeler olabilir. Daha akıcı okuma için ayarlardan cihaz sesi seçilebilir."
    : d.sesListesiBos && !vukuf ? "Ses duyulmazsa ayarlardan Vukuf sesi seçilebilir."
    : d.durum === "hazirlaniyor" && d.asama === "vukuf" ? "Vukuf sesi hazırlanıyor… İlk açılışta birkaç saniye sürebilir."
    : d.bekliyor ? "Ses hazırlanıyor…"
    : null
  // Hata ayrıntısı (ör. iPhone'da hangi adımda kalındığı) — sorunu bildirmek için
  const ayrinti = (d.hata === "vukufHata" || d.hata === "vukufCal") && d.hataAyrinti ? d.hataAyrinti
    : bilgi && d.yavas && vukuf && !d.hata && d.uretimOrani ? `1 saniyelik ses yaklaşık ${String(d.uretimOrani).replace(".", ",")} saniyede hazırlanıyor.`
    : ""

  const arapcaOku = ayar.arapca === "oku" && !arapcaKapali
  const secSes = VUKUF_SES_LISTESI.find(v => v.id === ayar.vukufSes) || VUKUF_SES_LISTESI[0]
  const secGrup = secSes.grup
  const kerimSecili = arapcaOku && (ayar.arSes !== "cihaz" || !sesler.ar.length)

  return (
    <>
      <style>{`
        .sesli-satir { background: ${ac}14; border-radius: 6px; box-shadow: 0 0 0 4px ${ac}14; transition: background .25s; }
        ::highlight(${HIGHLIGHT_AD}) { background-color: ${ac}38; }
        .sesli-secim [data-satir] { cursor: pointer; user-select: text; -webkit-user-select: text; }
        .sesli-secim [data-satir]:hover { background: ${ac}0d; border-radius: 6px; }
        @keyframes sesliDon { to { transform: rotate(360deg) } }
      `}</style>
      <div ref={bolgeRef} role="region" aria-label="Sesli okuma"
        onPointerDownCapture={() => setDokunus(n => n + 1)}
        style={{
        position: "fixed", left: "50%", bottom: `calc(${altPay}px + env(safe-area-inset-bottom))`,
        transform: `translate(calc(-50% + ${konum.x}px), ${konum.y}px)`,
        zIndex: 140, maxWidth: "calc(100vw - 20px)",
      }}>
        {/* Panel + bilgi: hapın üstünde (hap ekranın üst yarısındaysa altında) — hap yerinden oynamaz */}
        <div style={{
          position: "absolute", left: "50%", transform: `translateX(calc(-50% + ${kayma}px))`,
          ...(asagiAc ? { top: "calc(100% + 6px)" } : { bottom: "calc(100% + 6px)" }),
          width: "min(360px, calc(100vw - 20px))", display: "flex", flexDirection: asagiAc ? "column-reverse" : "column",
          alignItems: "center", gap: "6px", pointerEvents: "none",
        }}>
        {/* AYARLAR */}
        {ayarAcik && destek && (
          <div style={{
            pointerEvents: "auto",
            width: "min(340px, calc(100vw - 20px))", background: theme.surface, border: `1px solid ${theme.border}`,
            borderRadius: "14px", padding: "12px 12px 10px", boxShadow: "0 10px 30px rgba(0,0,0,0.22)", color: theme.text,
            fontSize: "12.5px", maxHeight: panelYuk ? `${panelYuk}px` : "60vh", overflowY: "auto", overscrollBehavior: "contain",
          }}>
            {baslik("Ses kaynağı", 0)}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
              {cip(vukuf, "Vukuf sesi", () => ayarDegis({ motor: "vukuf" }))}
              {cip(!vukuf, "Cihaz sesi", () => ayarDegis({ motor: "cihaz" }), !sesliDestekVar())}
            </div>

            {vukuf ? (
              <>
                {VUKUF_SES_LISTESI.length > 1 && (
                  <>
                    {baslik("Okuyucu", 0)}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {VUKUF_SES_LISTESI.map(v => cip(ayar.vukufSes === v.id, v.ad, () => ayarDegis({ vukufSes: v.id })))}
                    </div>
                  </>
                )}
                {indirmeAlani(secGrup, eksik[secGrup] && eksik[secGrup] < 40
                  ? `Ses motorunun yeni sürümü indirilecek (yaklaşık ${eksik[secGrup]} MB). Sesler cihazda kalıyor.`
                  : `${secSes.ad} sesi bir kez indirilir (yaklaşık ${eksik[secGrup] || VUKUF_TOPLAM_MB} MB). Sonra her cihazda internetsiz, aynı sesle okunur.`)}
                {vukufHazir[secGrup] && (
                  <div style={{ marginTop: "8px", fontSize: "11px", color: theme.textSecondary, display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ flex: 1 }}>Ses cihazda; internetsiz çalışır.</span>
                    {kucukDugme(hizTest?.calisiyor ? "Ölçülüyor…" : "Hız testi", () => { if (!hizTest?.calisiyor) hizTestiYap() })}
                    {kucukDugme("Bu sesi sil", () => vukufSil(secGrup))}
                    {kucukDugme("Sesleri sil", () => vukufSil())}
                  </div>
                )}
                {hizTest && !hizTest.calisiyor && (
                  <div style={{ marginTop: "8px", padding: "8px", borderRadius: "8px", background: theme.background, border: `1px solid ${theme.border}`, fontSize: "10.5px", lineHeight: 1.5 }}>
                    {hizTest.hata
                      ? <div style={{ color: "#c0392b", wordBreak: "break-word" }}>Ölçüm tamamlanamadı: {hizTest.hata}</div>
                      : <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, Menlo, monospace", userSelect: "text", WebkitUserSelect: "text" }}>{hizTest.metin}</pre>}
                    <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                      {hizTest.metin && kucukDugme(hizTest.kopyalandi ? "Kopyalandı" : hizTest.kopyalanamadi ? "Kopyalanamadı; metin seçilebilir" : "Kopyala", () => hizTestiKopyala(hizTest.metin))}
                      {kucukDugme("Kapat", () => setHizTest(null))}
                    </div>
                  </div>
                )}
              </>
            ) : sesler.tr.length ? (<>
              {secici(trSes?.name || "", v => ayarDegis({ sesTr: v }),
                [...sesler.tr].sort((a, b) => (sesCinsiyeti(b) === "erkek") - (sesCinsiyeti(a) === "erkek") || String(a.name).localeCompare(b.name))
                  .map(v => [v.name, v.name.replace(/^Microsoft\s+|\s+-\s+Turkish.*$/gi, "")]))}
              {not("Cihazın kendi sesiyle okunur.")}
            </>) : <div style={{ color: theme.textSecondary, lineHeight: 1.5 }}>Bu cihazda Türkçe ses bulunamadı; Vukuf sesi seçilebilir.</div>}

            {baslik("Âyetler")}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {cip(ayar.ayetSes !== "meal", "Hafız sesiyle", () => ayarDegis({ ayetSes: "hafiz" }))}
              {cip(ayar.ayetSes === "meal", "Yalnız meal", () => ayarDegis({ ayetSes: "meal" }))}
            </div>
            {ayar.ayetSes !== "meal" && (
              <div style={{ marginTop: "8px" }}>
                {secici(ayar.kari || "", v => ayarDegis({ kari: v }), [
                  ["", `Kur'ân bölümündeki kâri (${kariAdi(kariSec({}))})`],
                  ...KARILAR.map(k => [k.id, kariAdi(k.id)]),
                ])}
              </div>
            )}
            {not(ayar.ayetSes !== "meal"
              ? "Kaynağı belli âyetlerde sûre adı ve âyet numarasından sonra hafız kaydı, ardından meal okunur. Kayıt indirilmemişse internet gerekir."
              : "Kaynağı belli âyetlerde sûre adı ve âyet numarası, ardından meal okunur.")}

            {baslik("Kaynağı belirtilmemiş Arapça ibareler")}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {cip(ayar.arapca === "uyari", "Haber ver", () => ayarDegis({ arapca: "uyari" }))}
              {cip(ayar.arapca === "atla" || (arapcaKapali && ayar.arapca === "oku"), "Atla", () => ayarDegis({ arapca: "atla" }))}
              {cip(arapcaOku, "Arapça sesle oku", () => ayarDegis({ arapca: "oku" }), arapcaKapali)}
            </div>
            {arapcaKapali && not("Evrad ve Ezkâr'da Arapça kısımlar yapay sesle okunmaz.")}
            {arapcaOku && (
              <>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                  {cip(kerimSecili, "Kerîm", () => ayarDegis({ arSes: "kerim" }))}
                  {cip(!kerimSecili, "Cihaz sesi", () => ayarDegis({ arSes: "cihaz" }), !sesler.ar.length)}
                </div>
                {kerimSecili && indirmeAlani("ar", `Kerîm sesi bir kez indirilir (yaklaşık ${eksik.ar || (vukufHazir.antalia ? VUKUF_ARAPCA_MB : VUKUF_ARAPCA_MB + VUKUF_MOTOR_MB)} MB). Harekeli metinleri daha doğru okur.`)}
                {kerimSecili && vukufHazir.ar && (
                  <div style={{ marginTop: "8px", fontSize: "11px", color: theme.textSecondary, display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ flex: 1 }}>Kerîm cihazda.</span>
                    {kucukDugme("Sil", () => vukufSil("ar"))}
                  </div>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
              {cip(ayar.isaret, ayar.isaret ? "İşaret sesi açık" : "İşaret sesi kapalı", () => ayarDegis({ isaret: !ayar.isaret }))}
              {cip(ayar.takip, ayar.takip ? "Okunan yeri takip et" : "Takip kapalı", () => ayarDegis({ takip: !ayar.takip }))}
            </div>
          </div>
        )}

        {hizAcik && destek && (
          <div style={{
            pointerEvents: "auto", width: "min(270px, calc(100vw - 20px))", background: theme.surface,
            border: `1px solid ${ac}33`, borderRadius: "14px", padding: "6px 10px",
            boxShadow: "0 6px 22px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: "2px", color: theme.text,
          }}>
            {/* SES — simge sessize alır / eski düzeye döndürür; 100 %'ün üstü Vukuf sesini yükseltir */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
              <button onClick={() => sesDegis(sesDeger === 0 ? (oncekiSesRef.current || 1) : 0, true)}
                title={sesDeger === 0 ? "Sesi aç" : "Sessize al"} aria-label={sesDeger === 0 ? "Sesi aç" : "Sessize al"}
                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "flex", color: sesDeger === 0 ? "#c0392b" : ac, flexShrink: 0 }}>
                <SesIkon size={16} />
              </button>
              <input type="range" min={0} max={2} step={0.05} value={sesDeger}
                aria-label="Ses düzeyi"
                onChange={e => sesDegis(parseFloat(e.target.value))}
                onPointerUp={e => sesDegis(parseFloat(e.currentTarget.value), true)}
                style={{ flex: 1, minWidth: 0, accentColor: ac, cursor: "pointer" }} />
              <span style={{ minWidth: "40px", textAlign: "right", fontSize: "12px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: sesDeger > 1 ? ac : theme.text }}>%{Math.round(sesDeger * 100)}</span>
              <button onClick={() => sesDegis(1, true)} title="%100'e getir" aria-label="%100'e getir"
                style={{ border: "none", background: "none", padding: "4px", cursor: "pointer", color: theme.textSecondary, display: "flex" }}>
                <RotateCcw size={13} />
              </button>
            </div>
            <div style={{ height: "1px", background: theme.border, opacity: 0.6 }} />
            {/* HIZ */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
              <Gauge size={16} color={ac} style={{ flexShrink: 0 }} />
              <input type="range" min={0.5} max={2} step={0.05} value={hizDeger}
                aria-label="Okuma hızı"
                onChange={e => hizDegis(parseFloat(e.target.value))}
                onPointerUp={e => hizDegis(parseFloat(e.currentTarget.value), true)}
                style={{ flex: 1, minWidth: 0, accentColor: ac, cursor: "pointer" }} />
              <span style={{ minWidth: "40px", textAlign: "right", fontSize: "12px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{hizYaz(hizDeger)}</span>
              <button onClick={() => hizDegis(1, true)} title="1×'e getir" aria-label="1×'e getir"
                style={{ border: "none", background: "none", padding: "4px", cursor: "pointer", color: theme.textSecondary, display: "flex" }}>
                <RotateCcw size={13} />
              </button>
            </div>
            <div style={{ height: "1px", background: theme.border, opacity: 0.6 }} />
            {/* DEVAMLI OKUMA — satırın tamamı dokunulabilir */}
            <div role="switch" aria-checked={!!ayar.devamli} onClick={() => ayarDegis({ devamli: !ayar.devamli })}
              title="Okuma ekranından çıkınca da okumaya devam etsin (öbür ekranlarda küçük denetim görünür)"
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", cursor: "pointer" }}>
              <Headphones size={16} color={ayar.devamli ? ac : theme.textSecondary} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: "12px", lineHeight: 1.25 }}>
                Devamlı okuma
                <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>Ekrandan çıkınca da okusun</span>
              </span>
              <span aria-hidden="true" style={{
                width: "30px", height: "18px", borderRadius: "999px", flexShrink: 0, position: "relative",
                background: ayar.devamli ? ac : `${theme.textSecondary}44`, transition: "background .15s ease",
              }}>
                <span style={{
                  position: "absolute", top: "2px", left: ayar.devamli ? "14px" : "2px", width: "14px", height: "14px",
                  borderRadius: "50%", background: "#fff", transition: "left .15s ease", boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                }} />
              </span>
            </div>
            <div style={{ height: "1px", background: theme.border, opacity: 0.6 }} />
            {/* OTOMATİK GİZLEME — açıkken süre kaydırıcısı (3–30 sn) */}
            <div role="switch" aria-checked={!!ayar.gizle} onClick={() => ayarDegis({ gizle: !ayar.gizle })}
              title="Dokunulmayınca küçük yuvarlak düğmeye insin; dokununca yeniden açılır"
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", cursor: "pointer" }}>
              <Timer size={16} color={ayar.gizle ? ac : theme.textSecondary} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: "12px", lineHeight: 1.25 }}>
                Otomatik gizleme
                <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>Küçük düğmeye insin, sürüklenebilsin</span>
              </span>
              <span aria-hidden="true" style={{
                width: "30px", height: "18px", borderRadius: "999px", flexShrink: 0, position: "relative",
                background: ayar.gizle ? ac : `${theme.textSecondary}44`, transition: "background .15s ease",
              }}>
                <span style={{
                  position: "absolute", top: "2px", left: ayar.gizle ? "14px" : "2px", width: "14px", height: "14px",
                  borderRadius: "50%", background: "#fff", transition: "left .15s ease", boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                }} />
              </span>
            </div>
            {ayar.gizle && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "2px 0 4px" }}>
                <span style={{ width: "16px", flexShrink: 0 }} />
                <input type="range" min={3} max={30} step={1} value={gizleSnDeger}
                  aria-label="Otomatik gizleme süresi (saniye)"
                  onChange={e => gizleSnDegis(parseFloat(e.target.value))}
                  onPointerUp={e => gizleSnDegis(parseFloat(e.currentTarget.value), true)}
                  style={{ flex: 1, minWidth: 0, accentColor: ac, cursor: "pointer" }} />
                <span style={{ minWidth: "40px", textAlign: "right", fontSize: "12px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{gizleSnDeger} sn</span>
                <button onClick={() => gizleSnDegis(8, true)} title="8 sn'ye getir" aria-label="8 saniyeye getir"
                  style={{ border: "none", background: "none", padding: "4px", cursor: "pointer", color: theme.textSecondary, display: "flex" }}>
                  <RotateCcw size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {bilgi && (
          <div style={{
            maxWidth: "min(360px, calc(100vw - 20px))", background: theme.surface, border: `1px solid ${theme.border}`,
            borderRadius: "12px", padding: "8px 12px", fontSize: "12px", color: theme.textSecondary, lineHeight: 1.5,
            boxShadow: "0 6px 18px rgba(0,0,0,0.15)", textAlign: "center", pointerEvents: "auto",
          }}>
            {bilgi}
            {ayrinti && <span style={{ display: "block", fontSize: "11px", marginTop: "4px", opacity: 0.85, wordBreak: "break-word" }}>Ayrıntı: {ayrinti}</span>}
          </div>
        )}
        </div>

        {/* HAP — boş yerinden ya da düğmesinden tutulup sürüklenebilir */}
        <div ref={hapRef}
          onPointerDown={hapBas}
          style={{
            display: "flex", alignItems: "center", gap: px(2), padding: px(4),
            background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "999px",
            boxShadow: "0 8px 26px rgba(0,0,0,0.2)", color: theme.text, touchAction: "none", userSelect: "none",
          }}>
          <span aria-hidden="true" title="Sürüklenebilir" style={{ display: "flex", alignItems: "center", color: theme.textSecondary, opacity: 0.55, cursor: "grab", padding: `0 ${px(1)}` }}>
            <GripVertical size={Math.round(14 * olcek)} />
          </span>
          {destek && <>
            {dugme(<SkipBack size={Math.round(17 * olcek)} />, () => sesliOkuyucu.geri(), "Önceki cümle")}
            {dugme(
              hazirlaniyor ? <Loader2 size={Math.round(18 * olcek)} style={{ animation: "sesliDon .9s linear infinite" }} />
                : okuyor ? <Pause size={Math.round(18 * olcek)} /> : <Play size={Math.round(18 * olcek)} />,
              () => {
                if (okuyor) sesliOkuyucu.duraklat()
                else if (d.durum === "duraklatildi") { sesKilidiAc(); sesliOkuyucu.devam() }
                else { sesKilidiAc(); baslatYeniden() }
              },
              okuyor ? "Duraklat" : "Oku", true)}
            {dugme(<SkipForward size={Math.round(17 * olcek)} />, () => sesliOkuyucu.ileri(), "Sonraki cümle")}
            <button
              onClick={() => { setAyarAcik(false); setSecim(false); setHizAcik(v => !v) }}
              title={`Ses %${Math.round(Number(ayar.ses ?? 1) * 100)} · Hız ${hizYaz(Number(ayar.hiz) || 1)}${ayar.devamli ? " · Devamlı okuma" : ""}`}
              aria-label="Ses, hız ve devamlı okuma" aria-expanded={hizAcik}
              style={{
                width: px(36), height: px(36), borderRadius: "999px", border: "none", cursor: "pointer", flexShrink: 0, position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: hizAcik ? `${ac}33` : (Number(ayar.hiz) !== 1 || Number(ayar.ses ?? 1) !== 1) ? `${ac}1f` : "transparent",
                color: Number(ayar.ses ?? 1) === 0 ? "#c0392b" : (hizAcik || Number(ayar.hiz) !== 1 || Number(ayar.ses ?? 1) !== 1) ? ac : theme.text,
              }}>
              <SlidersHorizontal size={Math.round(16 * olcek)} />
              {Number(ayar.hiz) !== 1 && (
                <span style={{
                  position: "absolute", top: "-2px", right: "-4px", fontSize: px(8.5), fontWeight: 700, lineHeight: 1,
                  padding: "1px 3px", borderRadius: "6px", background: ac, color: "#fff",
                }}>{hizYaz(Number(ayar.hiz))}</span>
              )}
            </button>
            {dugme(<Crosshair size={Math.round(16 * olcek)} />, () => {
              sesKilidiAc(); setAyarAcik(false); setHizAcik(false); setSecim(v => !v)
            }, secim ? "Cümle seçimini kapat" : "Okunacak cümleyi seç", secim)}
            {dugme(<Glasses size={Math.round(16 * olcek)} />, hizala,
              ayrildi ? "Okunan yere dön (takip askıda)" : "Okunan yere hizala", ayrildi && (okuyor || hazirlaniyor))}
            {dugme(<Settings2 size={Math.round(16 * olcek)} />, () => { setSecim(false); setHizAcik(false); setAyarAcik(v => !v) }, "Sesli okuma ayarları", ayarAcik)}
          </>}
          {dugme(<X size={Math.round(17 * olcek)} />, kapatVeDurdur, "Sesli okumayı kapat")}
        </div>
      </div>
    </>
  )
}

/* Otomatik gizlemede küçük hâl: KitapAmblem'li tek yuvarlak düğme (devamlı okumadaki
   SesliMiniHap'in küçük hâliyle aynı çizim). Kendi yerinde durur, sürüklenir; dokununca açılır. */
function SesliKucuk({ theme, hal, altPay, ac: acFn }) {
  const ac = theme.accent
  const k = useHapKonumu({ ad: "sesli-kucuk", yan: "sag", altta: true, altPay, kaydirGecir: true })
  return (
    <div ref={k.ref} className="vukuf-hap" {...k.olaylar}
      style={{ ...k.stil, zIndex: k.surukleniyor ? 145 : 140, "--hap-kay": "8px", "--sk-ac": ac }}>
      <style>{KITAP_CSS}</style>
      <button onClick={acFn} aria-label="Sesli okuma denetimini aç" title="Sesli okuma · aç"
        style={{
          position: "relative", width: "46px", height: "46px", borderRadius: "50%", padding: 0, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: theme.surface, border: `1px solid ${ac}`, color: ac,
          boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.22)",
        }}>
        {hal === "okuyor" && <span className="vukuf-sk-nabiz" aria-hidden="true" />}
        <KitapAmblem ac={ac} zemin={theme.surface} hal={hal} />
      </button>
    </div>
  )
}
