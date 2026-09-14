/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — BİLDİRİM MOTORU  (src/data/hooks/useBildirim.js)

   NE YAPAR: kullanıcının kurduğu hatırlatmaları saklar, saati gelince bildirim
   gösterir, kaçanları işaretler. Arayüzü BildirimPaneli.jsx çiziyor.

   ── ÖNCE SINIRLARI SÖYLEYELİM, ÇÜNKÜ TASARIMI ONLAR BELİRLİYOR ──────────────
   Tarayıcıda "şu saatte bildir" diyen bir API YOK.
     • Chrome'un Notification Triggers denemesi (TimestampTrigger) yayına
       alınmadan bırakıldı — "platformlar arasında tutarlı ve güvenilir bir
       deneyim sağlayabileceğimiz açık değildi" denildi.
     • Periodic Background Sync yalnız Chrome'da ve en az ~12 saat aralıklı;
       "07:00'de" gibi bir kesinlik veremez.
     • iOS'ta yerel zamanlama hiç yok. Ana ekrana eklenmiş PWA'da Web Push
       çalışır ama o da SUNUCUDAN gelir.
   Dolayısıyla bu motor şunu yapar: UYGULAMA AÇIKKEN saati saniyesinde yakalar,
   KAPALIYKEN geçen hatırlatmaları açılışta "kaçtı" diye işaretler. Kapalıyken
   bildirim istiyorsak yol bellidir ve ayrıdır: VAPID + abonelik sunucusu + cron.

   ── KAÇANLARI NEDEN SİSTEM BİLDİRİMİ OLARAK ATMIYORUZ ───────────────────────
   Sabah 07:00 hatırlatması uygulama akşam 21:00'de açıldığında sistem bildirimi
   olarak düşerse yanlış bilgi verir ("şimdi okuma vakti" demek olur). Onun
   yerine kayıt `kacirildi` işaretlenir, panelde görünür ve bir daha tetiklenmez.
   Eşiği aşmamış (GECIKME_SINIRI içindeki) hatırlatmalar normal gösterilir.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from "react"

const ANAHTAR = "vukuf-bildirimler"
// SW dar kapsamda: uygulamanın asıl PWA service worker'ının yerini almasın.
const SW_DOSYA = "/bildirim/sw.js"
const SW_KAPSAM = "/bildirim/"
// Saati kaç saniye geçmiş bir hatırlatma HÂLÂ gösterilir? Sekme arka planda
// kısılmış olabilir (tarayıcılar zamanlayıcıyı seyreltiyor), o yüzden sıfır
// olamaz; ama "kaçmış" sayılacak kadar da uzun olmamalı.
const GECIKME_SINIRI = 3 * 60 * 1000
// Uyanık kontrol aralığı. Sekme öndeyken tam zamanlı setTimeout da kuruluyor;
// bu aralık onun yedeği (cihaz uykudan dönerse, saat değişirse).
const KONTROL_ARALIGI = 20 * 1000

export const GUN_ADLARI = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]

function yeniId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function oku() {
  try {
    const d = JSON.parse(localStorage.getItem(ANAHTAR) || "[]")
    return Array.isArray(d) ? d.filter(b => b && typeof b === "object") : []
  } catch { return [] }
}

function yaz(liste) {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(liste)) } catch { /* kota dolu */ }
}

/** "HH:MM" → [saat, dakika]; bozuksa [0,0]. */
function saatAyir(s) {
  const p = String(s || "").split(":")
  const ss = parseInt(p[0], 10)
  const dd = parseInt(p[1], 10)
  return [Number.isFinite(ss) ? Math.min(23, Math.max(0, ss)) : 0,
          Number.isFinite(dd) ? Math.min(59, Math.max(0, dd)) : 0]
}

/** Bu hatırlatmanın ŞİMDİDEN SONRAKİ ilk zamanı (ms) — yoksa null. */
export function sonrakiZaman(b, simdi = Date.now()) {
  if (!b || b.acik === false) return null
  const [ss, dd] = saatAyir(b.saat)
  const n = new Date(simdi)
  if (b.tekrar === "birkez") {
    if (!b.tarih) return null
    const t = new Date(`${b.tarih}T00:00:00`)
    if (Number.isNaN(t.getTime())) return null
    t.setHours(ss, dd, 0, 0)
    return t.getTime() > simdi ? t.getTime() : null
  }
  const gunler = (Array.isArray(b.gunler) && b.gunler.length) ? b.gunler : [0, 1, 2, 3, 4, 5, 6]
  for (let i = 0; i <= 7; i++) {
    const t = new Date(n)
    t.setDate(n.getDate() + i)
    t.setHours(ss, dd, 0, 0)
    if (t.getTime() <= simdi) continue
    if (gunler.includes(t.getDay())) return t.getTime()
  }
  return null
}

/** Bu hatırlatmanın ŞİMDİDEN ÖNCEKİ en son zamanı (ms) — yoksa null. */
function oncekiZaman(b, simdi = Date.now()) {
  if (!b || b.acik === false) return null
  const [ss, dd] = saatAyir(b.saat)
  const n = new Date(simdi)
  if (b.tekrar === "birkez") {
    if (!b.tarih) return null
    const t = new Date(`${b.tarih}T00:00:00`)
    if (Number.isNaN(t.getTime())) return null
    t.setHours(ss, dd, 0, 0)
    return t.getTime() <= simdi ? t.getTime() : null
  }
  const gunler = (Array.isArray(b.gunler) && b.gunler.length) ? b.gunler : [0, 1, 2, 3, 4, 5, 6]
  for (let i = 0; i <= 7; i++) {
    const t = new Date(n)
    t.setDate(n.getDate() - i)
    t.setHours(ss, dd, 0, 0)
    if (t.getTime() > simdi) continue
    if (gunler.includes(t.getDay())) return t.getTime()
  }
  return null
}

export function zamanMetni(ms) {
  if (!ms) return "—"
  const t = new Date(ms)
  const bugun = new Date()
  const ayniGun = t.toDateString() === bugun.toDateString()
  const yarin = new Date(bugun); yarin.setDate(bugun.getDate() + 1)
  const ss = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0")
  if (ayniGun) return `bugün ${ss}`
  if (t.toDateString() === yarin.toDateString()) return `yarın ${ss}`
  return `${GUN_ADLARI[t.getDay()]} ${t.getDate()}.${t.getMonth() + 1} ${ss}`
}

// ── Ortam yetenekleri ───────────────────────────────────────────────────────
// Kullanıcıya "neden gelmiyor" sorusunun cevabını verebilmek için ölçülüyor;
// tahmin edilmiyor. Panel bunu olduğu gibi gösteriyor.
function ortamOlc() {
  const n = typeof navigator !== "undefined" ? navigator : {}
  const ua = n.userAgent || ""
  const ios = /iPad|iPhone|iPod/.test(ua) ||
              (n.platform === "MacIntel" && (n.maxTouchPoints || 0) > 1)
  let standalone = false
  try {
    standalone = (typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(display-mode: standalone)").matches) || n.standalone === true
  } catch { /* yoksay */ }
  // iOS SÜRÜMÜ ÖNEMLİ: web push ve standalone PWA bildirimleri 16.4 ile geldi.
  // 16.4 altındaysa yapılacak bir şey yok — bunu tahmin etmek yerine okuyoruz.
  let iosSurum = ""
  const m = ua.match(/OS (\d+)[._](\d+)/)
  if (ios && m) iosSurum = `${m[1]}.${m[2]}`
  return {
    bildirimVar: typeof Notification !== "undefined",
    swVar: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    pushVar: typeof window !== "undefined" && "PushManager" in window,
    // Service worker ve bildirim YALNIZ güvenli bağlamda çalışır. localhost da
    // güvenli sayılır; düz http:// ile açılmışsa hiçbiri olmaz.
    guvenliBaglam: typeof window !== "undefined" && window.isSecureContext === true,
    ios, iosSurum, standalone,
    // Zamanlanmış bildirim API'si: hiçbir tarayıcıda yok (Chrome denemesi bırakıldı).
    // Yine de ölçülüyor — bir gün gelirse burada görünür.
    tetikleyiciVar: typeof window !== "undefined" && "TimestampTrigger" in window,
  }
}

export default function useBildirim() {
  const [liste, setListe] = useState(oku)
  const [izin, setIzin] = useState(() =>
    (typeof Notification !== "undefined" ? Notification.permission : "yok"))
  const [ortam] = useState(ortamOlc)
  const swRef = useRef(null)
  const listeRef = useRef(liste)
  const zamanlayiciRef = useRef(null)
  const sonHataRef = useRef("")
  // Tanılama için: service worker gerçekten etkinleşti mi? Panelde gösteriliyor,
  // çünkü "bildirim gelmiyor" şikâyetinin en sık sebebi burada saklı.
  const [swDurum, setSwDurum] = useState("bilinmiyor")

  useEffect(() => { listeRef.current = liste }, [liste])

  const kaydet = useCallback((yeniListe) => {
    yaz(yeniListe)
    listeRef.current = yeniListe
    setListe(yeniListe)
  }, [])

  // ── Service worker ────────────────────────────────────────────────────────
  // ETKİNLEŞMEYİ BEKLEMEK ŞART. `register()` hemen dönüyor ama service worker o
  // anda "installing" hâlinde olabilir; `reg.active` henüz null. Böyle bir
  // registration üzerinde showNotification ÇAĞRILIRSA HATA VERİR.
  // Masaüstünde bu gizlendi, çünkü hata yakalanıp `new Notification(...)`
  // yedeğine düşülüyor ve orada çalışıyor. iOS'ta o yedek YOK (Safari'de
  // Notification kurucusu desteklenmiyor, yalnız SW yolu var) → ilk denemede
  // hiçbir şey olmuyordu. Belirtinin "webde sorunsuz, iOS'ta hiç" olmasının
  // sebebi buydu.
  const aktifBekle = useCallback(async (reg, sinirMs = 6000) => {
    if (!reg || reg.active) return reg
    const sw = reg.installing || reg.waiting
    if (!sw) return reg
    await new Promise((bitir) => {
      let bitti = false
      const kapat = () => { if (!bitti) { bitti = true; sw.removeEventListener("statechange", dinle); bitir() } }
      const dinle = () => { if (sw.state === "activated" || sw.state === "redundant") kapat() }
      sw.addEventListener("statechange", dinle)
      dinle()
      setTimeout(kapat, sinirMs)      // takılırsa sonsuza kadar bekleme
    })
    return reg
  }, [])

  const swAl = useCallback(async () => {
    if (swRef.current && swRef.current.active) return swRef.current
    // BU DAL SESSİZDİ: durum "bilinmiyor" kalıyordu, tanılamada "kaydedilmedi mi,
    // API mi yok" ayırt edilemiyordu. Artık sebebi söylüyor.
    if (!("serviceWorker" in navigator)) { setSwDurum("API yok"); return null }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setSwDurum("güvensiz bağlam (https değil)")
      return null
    }
    setSwDurum(d => (d === "bilinmiyor" ? "kaydediliyor" : d))
    try {
      const mevcut = await navigator.serviceWorker.getRegistration(SW_KAPSAM)
      let reg = mevcut || await navigator.serviceWorker.register(SW_DOSYA, { scope: SW_KAPSAM })
      reg = await aktifBekle(reg)
      swRef.current = reg
      setSwDurum(reg.active ? "etkin" : (reg.installing ? "kuruluyor" : reg.waiting ? "bekliyor" : "kayıtlı"))
      return reg
    } catch (e) {
      // dosya yok (404) / HTTP üzerinden açılmış / kapsam reddedildi
      sonHataRef.current = String(e && e.message || e)
      setSwDurum("kayıt başarısız")
      return null
    }
  }, [aktifBekle])

  useEffect(() => { swAl() }, [swAl])

  // ── İzin ──────────────────────────────────────────────────────────────────
  // DİKKAT: iOS'ta bu çağrı ancak KULLANICI HAREKETİ içinde ve uygulama ana
  // ekrandan (standalone) açılmışken çalışır. Bu yüzden panelde açık bir
  // düğmeye bağlı; otomatik çağrılmıyor (otomatik çağrı kalıcı ret getirebilir).
  //
  // ÖNEMLİ: iOS'ta "denied" KALICIDIR. Ne uygulama içinden ne de iOS
  // Ayarlar'dan geri alınabilir — reddedilmiş bir web app iOS'un bildirim
  // listesinde hiç görünmez. Tek sıfırlama yolu ana ekran simgesini SİLİP
  // yeniden eklemektir. Panel "denied" gördüğünde bunu söylüyor.
  const izinIste = useCallback(async () => {
    if (typeof Notification === "undefined") return "yok"
    // Service worker'ı ÖNCE hazırla: iOS izni verdikten hemen sonra ilk
    // bildirimi göstermeye kalkarsak SW daha etkinleşmemiş olabiliyor.
    swAl()
    try {
      const s = await Notification.requestPermission()
      setIzin(s)
      if (s === "granted") await swAl()
      return s
    } catch (e) {
      sonHataRef.current = String(e && e.message || e)
      return Notification.permission
    }
  }, [swAl])

  // ── Gösterim ──────────────────────────────────────────────────────────────
  // Dönüş: "tamam" | hata sebebi. Boolean değil — "gönderilemedi" demek
  // kullanıcıya hiçbir şey anlatmıyordu; tanılama bölümü bu sebebi gösteriyor.
  const goster = useCallback(async (baslik, metin, ek = {}) => {
    if (typeof Notification === "undefined") return "api-yok"
    if (Notification.permission !== "granted") return "izin-yok"
    const secenekler = {
      body: metin || "",
      tag: ek.tag,
      renotify: ek.tag ? true : undefined,
      data: { yol: ek.yol || "/" },
    }
    const reg = await swAl()
    if (reg) {
      try { await reg.showNotification(baslik, secenekler); return "tamam" }
      catch (e) { sonHataRef.current = String(e && e.message || e) }
    } else {
      sonHataRef.current = "service worker kaydedilemedi (/bildirim/sw.js)"
    }
    // Yedek: doğrudan Notification. iOS Safari bu kurucuyu DESTEKLEMEZ —
    // orada tek yol service worker'dır, o yüzden yukarısı çalışmak zorunda.
    try { new Notification(baslik, secenekler); return "tamam" }
    catch (e) {
      sonHataRef.current = sonHataRef.current || String(e && e.message || e)
      return "hata"
    }
  }, [swAl])

  // ── Zamanlama çarkı ───────────────────────────────────────────────────────
  // Saati gelenleri gönderir, çok gecikmişleri "kaçtı" diye işaretler.
  // Her iki durumda da `sonGonderim` ilerletilir → aynı hatırlatma bir daha
  // tetiklenmez (yoksa her kontrolde tekrar tekrar düşerdi).
  const carkiCevir = useCallback(async () => {
    const simdi = Date.now()
    const mevcut = listeRef.current
    let degisti = false
    const yeni = mevcut.map(b => b)
    for (let i = 0; i < yeni.length; i++) {
      const b = yeni[i]
      if (!b || b.acik === false) continue
      const onceki = oncekiZaman(b, simdi)
      if (!onceki) continue
      if (onceki <= (b.sonGonderim || 0)) continue          // zaten işlendi
      if (simdi - onceki <= GECIKME_SINIRI) {
        await goster(b.baslik || "Vukuf", b.metin || "", { tag: `vukuf-${b.id}`, yol: b.yol })   // sonuç yok sayılır: gösterilemese de tekrar denemek fayda etmez

        yeni[i] = { ...b, sonGonderim: onceki, kacirildi: false }
      } else {
        yeni[i] = { ...b, sonGonderim: onceki, kacirildi: true, kacanZaman: onceki }
      }
      degisti = true
    }
    if (degisti) kaydet(yeni)
  }, [goster, kaydet])

  // Bir sonraki hatırlatmaya TAM zamanlı kurulum + yedek aralık.
  useEffect(() => {
    let durdu = false
    const kur = () => {
      if (zamanlayiciRef.current) { clearTimeout(zamanlayiciRef.current); zamanlayiciRef.current = null }
      const simdi = Date.now()
      let enYakin = null
      for (const b of listeRef.current) {
        const t = sonrakiZaman(b, simdi)
        if (t && (enYakin === null || t < enYakin)) enYakin = t
      }
      if (enYakin === null) return
      // setTimeout üst sınırı ~24.8 gün; uzun beklemeler parçalanıyor.
      const gecikme = Math.min(Math.max(250, enYakin - simdi + 400), 60 * 60 * 1000)
      zamanlayiciRef.current = setTimeout(async () => {
        if (durdu) return
        await carkiCevir()
        kur()
      }, gecikme)
    }

    const araligi = setInterval(() => { if (!durdu) carkiCevir() }, KONTROL_ARALIGI)
    // Sekme öne geldiğinde hemen bak: arka planda zamanlayıcılar seyreltilmiş olabilir.
    const gorunurluk = () => { if (document.visibilityState === "visible") { carkiCevir(); kur() } }
    document.addEventListener("visibilitychange", gorunurluk)
    carkiCevir()
    kur()
    return () => {
      durdu = true
      clearInterval(araligi)
      document.removeEventListener("visibilitychange", gorunurluk)
      if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current)
      document.removeEventListener("visibilitychange", gorunurluk)
    }
  }, [carkiCevir, liste])

  // ── Dışa verilen işlemler ─────────────────────────────────────────────────
  const ekle = useCallback((veri) => {
    const b = {
      id: yeniId(),
      baslik: (veri.baslik || "").trim() || "Vukuf",
      metin: (veri.metin || "").trim(),
      saat: veri.saat || "08:00",
      tekrar: veri.tekrar === "birkez" ? "birkez" : "gunluk",
      gunler: Array.isArray(veri.gunler) ? [...veri.gunler].sort() : [],
      tarih: veri.tarih || "",
      yol: veri.yol || "/",
      acik: veri.acik !== false,
      sonGonderim: 0,
      kacirildi: false,
      olusturma: Date.now(),
    }
    kaydet([...listeRef.current, b])
    return b
  }, [kaydet])

  const guncelle = useCallback((id, yama) => {
    kaydet(listeRef.current.map(b => {
      if (b.id !== id) return b
      const y = { ...b, ...yama }
      // Saat/tekrar/gün değiştiyse geçmiş gönderim damgası ANLAMINI YİTİRİR:
      // sıfırlanmazsa yeni saat "zaten gönderilmiş" sayılıp hiç çalmayabilir.
      const zamanDegisti = ("saat" in yama) || ("tekrar" in yama) || ("gunler" in yama) || ("tarih" in yama)
      if (zamanDegisti) { y.sonGonderim = 0; y.kacirildi = false }
      return y
    }))
  }, [kaydet])

  const sil = useCallback((idler) => {
    const kume = new Set(Array.isArray(idler) ? idler : [idler])
    kaydet(listeRef.current.filter(b => !kume.has(b.id)))
  }, [kaydet])

  const hepsiniSil = useCallback(() => { kaydet([]) }, [kaydet])

  const acKapa = useCallback((id) => {
    kaydet(listeRef.current.map(b =>
      b.id === id ? { ...b, acik: !b.acik, sonGonderim: 0, kacirildi: false } : b))
  }, [kaydet])

  const kacaniTemizle = useCallback((id) => {
    kaydet(listeRef.current.map(b => (b.id === id ? { ...b, kacirildi: false } : b)))
  }, [kaydet])

  // Deneme bildirimi — "cihazımda çalışıyor mu" sorusunun tek adımlık cevabı.
  const deneme = useCallback(async () => {
    sonHataRef.current = ""
    if (typeof Notification === "undefined") return "yok"
    if (Notification.permission !== "granted") {
      const s = await izinIste()
      if (s !== "granted") return s
    }
    const sonuc = await goster("Vukuf — deneme", "Bildirimler çalışıyor.", { tag: "vukuf-deneme" })
    return sonuc === "tamam" ? "gonderildi" : sonuc
  }, [goster, izinIste])

  // Tanılama dökümü — kullanıcı bunu olduğu gibi paylaşabilsin diye METİN.
  // "Bildirim gelmiyor" şikâyetini tahminle değil ölçümle çözmek için.
  const tanilama = useCallback(() => ({
    izin,
    swDurum,
    sonHata: sonHataRef.current || "—",
    ...ortam,
    kayitSayisi: listeRef.current.length,
    // iOS'ta "denied" geri alınamaz; panelin doğru tavsiyeyi verebilmesi için
    // bu iki şartı birlikte biliyor olması gerekiyor.
    iosYenidenKurGerek: ortam.ios && izin === "denied",
    saatDilimi: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return "?" } })(),
  }), [izin, swDurum, ortam])

  return {
    liste, izin, ortam, swDurum,
    ekle, guncelle, sil, hepsiniSil, acKapa, kacaniTemizle,
    izinIste, deneme, tanilama,
    sonrakiZaman, zamanMetni,
  }
}
