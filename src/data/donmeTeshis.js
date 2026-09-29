/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — DÖNME TEŞHİSİ (GEÇİCİ)
   src/data/donmeTeshis.js

   Kullanıcı: "yatay-dikey dönme yavaş; çalma olmadan bile". Tahminle düzeltme
   YAPILMIYOR — ses geçişinde olduğu gibi önce telefonda ölçülüyor.

   NE ÖLÇÜYOR (yalnız Kur'ân ekranında, yalnız ölçüm AÇIKKEN):
     • KARE ARALIKLARI: ekran açıkken her karede zaman damgası tutuluyor. iOS
       dönmede yerleşimi BİZİM olaylarımızdan ÖNCE yapıyor; o donma olay
       zamanıyla ölçülemez ama kare akışındaki BOŞLUK olarak görünür.
       Rapor: en uzun kare boşluğu (dönme olayına göre nerede başlayıp bittiği),
       50 ms'yi aşan boşlukların toplamı, ekranın "oturduğu" an.
     • REACT ÇİZİMLERİ: dönme penceresinde Kur'ân ekranı, mushaf sayfası ve
       kelime bileşeni kaç kez çizildi (yerleşim mi, React mi — ayırt eder).
     • DOM: kaç sayfa dolu, kaç kelime, toplam öğe sayısı.

   DENEYLER (yine yalnız teşhis için; Veriler bölümünden açılıp kapanıyor,
   Kur'ân'a yeniden girince geçerli olur — uygulamayı kapatmak gerekmez):
     • vakifKat      : vakıf/secde işaretli kelimenin üst katı (z-index) KAPALI
     • ayetSonuKat   : âyet sonu rozet sarmalayıcısının konum/katı KAPALI
     • hizliYerlesim : uzak sayfalarda yerleşimi atla (content-visibility) AÇIK
     • sadeKelime    : işaretsiz kelimede konumlu katman + iç span YOK
     • susResim      : sûre başlığı tezhibi (~1100 öğe) ve âyet rozeti çerçevesi
                       (~44 öğe) tek <img>; ad hattı ve rakam canlı kalıyor
   (yenidenCiz deneyi kaldırıldı: özellik kullanıcı kararıyla koddan çıktı.)
   Aynı dönmeyi deneyli/deneysiz ölçüp karşılaştırınca suçlu sayıyla çıkıyor.

   Ölçüm bitince bu dosya, çağrıları ve Veriler'deki bölüm SİLİNECEK.
   ═══════════════════════════════════════════════════════════════════════════ */

const ANAHTAR = "vukuf-donme-teshis"          // "1" = ölçüm açık
const DENEY_ANAHTAR = "vukuf-donme-deney"     // { vakifKat, ayetSonuKat, yenidenCiz, hizliYerlesim }
const KAYIT_ANAHTAR = "vukuf-donme-kayit"     // son ölçümler (metin satırları)
const EN_COK = 30

// ── DENEY BAYRAKLARI — bileşenler render sırasında okuyor (bellekte tek nesne) ──
export const DENEY = (() => {
  try { return { ...JSON.parse(localStorage.getItem(DENEY_ANAHTAR) || "{}") } } catch { return {} }
})()
export function deneyAyarla(ad, deger) {
  DENEY[ad] = !!deger
  try { localStorage.setItem(DENEY_ANAHTAR, JSON.stringify(DENEY)) } catch { /* kota */ }
}
// Ölçümle karara bağlanan deneyler kaldırıldı (30 Eylül 2026):
//   vakıf katı / âyet sonu katı → hıza etkisi YOK, olduğu gibi kaldı;
//   sade kelime / süsler resim → KALICI yapıldı; yeniden çizim → koddan çıktı.
//   uzak sayfalar ertelenir → dönmeyi %18 hızlandırdı AMA kullanıcı yukarı
//   kaydırmada SIÇRAMA gördü → kapalı kaldı (HIZLI_YERLESIM = false).
const DENEY_ADLARI = {}
for (const eski of ["yenidenCiz", "vakifKat", "ayetSonuKat", "sadeKelime", "susResim", "hizliYerlesim"]) delete DENEY[eski]

// ── SAYAÇLAR — render gövdelerinde artırılıyor (maliyeti bir toplama) ──
export const SAYAC = { kuran: 0, sayfa: 0, kelime: 0 }

/* ── KUR'ÂN EKRANI ÇİZİMLERİ: SÜRE + HANGİ DURUM DEĞİŞTİ ────────────────────
   Teşhis: her dönmede ilk resize'dan hemen sonra ~550 ms'lik bir blok var ve
   DOM küçülse de DEĞİŞMİYOR (144 bin öğede de 48 bin öğede de aynı) → yerleşim
   değil, büyük olasılıkla ekranın 8-10 kez yeniden çizilmesi. Hangi durumun
   (useState) çizimi tetiklediği ve her çizimin süresi burada toplanıyor.
   KuranOkuma: gövde başında donmeCizimBasla(), commit'te (layout effect)
   donmeCizimBitti(); useState sarmalayıcısı değişen durumun SIRASINI bildiriyor. */
let durumAdlari = []
export function donmeDurumAdlari(adlar) { durumAdlari = adlar }
let cizimBas = 0
let cizimDegisen = []
const cizimler = []                 // { t, dt, degisen: [ad] } — son ~6 sn
export function donmeCizimBasla() { cizimBas = performance.now(); cizimDegisen = [] }
export function donmeDurumDegisti(i) { cizimDegisen.push(durumAdlari[i] || `#${i}`) }
export function donmeCizimBitti() {
  if (!cizimBas) return
  const t = performance.now()
  cizimler.push({ t: cizimBas, dt: t - cizimBas, degisen: cizimDegisen })
  while (cizimler.length && t - cizimler[0].t > 6000) cizimler.shift()
  cizimBas = 0
}

// Ölçüm açık mı: bayrak ya da HERHANGİ bir deney açıksa (deney açıp ölçümü
// açmayı unutmak kayıtsız kalmak demekti — kullanıcı: "kayıt yapmıyor").
export function teshisAcikMi() {
  let bayrak = false
  try { bayrak = localStorage.getItem(ANAHTAR) === "1" } catch { /* yoksay */ }
  return bayrak || Object.keys(DENEY_ADLARI).some(a => DENEY[a])
}
export function teshisAyarla(acik) {
  try { acik ? localStorage.setItem(ANAHTAR, "1") : localStorage.removeItem(ANAHTAR) } catch { /* yoksay */ }
}

function kayitlariOku() {
  try { return JSON.parse(localStorage.getItem(KAYIT_ANAHTAR) || "[]") } catch { return [] }
}
function kayitEkle(satir) {
  const k = kayitlariOku()
  k.push(satir)
  while (k.length > EN_COK) k.shift()
  try { localStorage.setItem(KAYIT_ANAHTAR, JSON.stringify(k)) } catch { /* kota */ }
}
export function donmeTeshisTemizle() {
  try { localStorage.removeItem(KAYIT_ANAHTAR) } catch { /* yoksay */ }
}

export function donmeTeshisMetni() {
  const k = kayitlariOku()
  const cihaz = typeof navigator !== "undefined" ? navigator.userAgent.replace(/^Mozilla\/5\.0 /, "") : "?"
  const pwa = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches
  const deney = Object.keys(DENEY_ADLARI).filter(a => DENEY[a]).map(a => DENEY_ADLARI[a]).join(", ") || "yok"
  return [
    `DÖNME TEŞHİSİ · ${new Date().toLocaleString("tr-TR")}`,
    `Cihaz: ${cihaz}${pwa ? " · PWA" : ""}`,
    `Ölçüm: ${teshisAcikMi() ? "açık" : "KAPALI"} · Şu anki deney: ${deney}`,
    "",
    k.length ? k.join("\n") : "(Henüz kayıt yok — Kur'ân'da telefonu birkaç kez çevirin.)",
  ].join("\n")
}

/* ── ÖLÇER — KuranOkuma'da bir kez kuruluyor; ölçüm kapalıysa hiçbir şey yapmaz ──
   Döndürdüğü işlev sökücüdür. */
export function donmeOlceriKur() {
  if (typeof window === "undefined" || !teshisAcikMi()) return () => {}
  const kareler = []            // performance.now() damgaları (son ~5 sn)
  let raf = 0
  const kare = (t) => {
    kareler.push(t)
    while (kareler.length && t - kareler[0] > 5000) kareler.shift()
    raf = requestAnimationFrame(kare)
  }
  raf = requestAnimationFrame(kare)

  let sonEn = window.innerWidth, sonBoy = window.innerHeight
  let aktif = null              // sürmekte olan dönme kaydı
  let sira = kayitlariOku().length
  const zamanlayicilar = []

  const olay = (ad) => () => {
    const w = window.innerWidth, h = window.innerHeight
    if (!aktif) {
      if (w === sonEn && ad === "resize") return       // en değişmediyse dönme değil
      aktif = {
        t0: performance.now(), ilk: ad, olaylar: [], once: `${sonEn}×${sonBoy}`,
        sayac0: { ...SAYAC },
      }
      zamanlayicilar.push(setTimeout(bitir, 2200))
    }
    aktif.olaylar.push(`${ad}@${Math.round(performance.now() - aktif.t0)}`)
    sonEn = w; sonBoy = h
  }

  function bitir() {
    const a = aktif
    aktif = null
    if (!a) return
    const t0 = a.t0
    // Kare boşlukları: t0'dan 1,5 sn önce ile 2,5 sn sonrası
    const bosluklar = []
    for (let i = 1; i < kareler.length; i++) {
      const bas = kareler[i - 1], son = kareler[i]
      if (son < t0 - 1500 || bas > t0 + 2500) continue
      const g = son - bas
      if (g > 50) bosluklar.push({ g, bas: bas - t0, son: son - t0 })
    }
    bosluklar.sort((x, y) => y.g - x.g)
    const toplam = bosluklar.reduce((s, b) => s + b.g, 0)
    const oturma = bosluklar.length ? Math.max(...bosluklar.map(b => b.son)) : 0
    const r = (x) => `${x >= 0 ? "+" : ""}${Math.round(x)}`
    const enUzun = bosluklar.slice(0, 3).map(b => `${Math.round(b.g)} ms (${r(b.bas)}…${r(b.son)})`).join(", ") || "yok"
    const d = {
      kuran: SAYAC.kuran - a.sayac0.kuran,
      sayfa: SAYAC.sayfa - a.sayac0.sayfa,
      kelime: SAYAC.kelime - a.sayac0.kelime,
    }
    let doluSayfa = 0, kelime = 0, oge = 0, konumlu = 0
    try {
      const kelimeler = document.getElementsByClassName("mushaf-kelime")
      kelime = kelimeler.length
      // DOLU sayfa = içinde kelime olan sayfa (önceki sürüm yer tutucuları da sayıyordu)
      const sayfalar = new Set()
      for (const k of kelimeler) { const s = k.closest("[data-index]"); if (s) sayfalar.add(s) }
      doluSayfa = sayfalar.size
      const hepsi = document.getElementsByTagName("*")
      oge = hepsi.length
      // KONUMLU öğe (position ≠ static) — WebKit her birine ayrı katman açıyor.
      // Ölçüm bittikten SONRA sayılıyor (kendi maliyeti donmaya karışmasın).
      for (const e of hepsi) { if (getComputedStyle(e).position !== "static") konumlu++ }
    } catch { /* yoksay */ }
    const deney = Object.keys(DENEY_ADLARI).filter(x => DENEY[x]).map(x => DENEY_ADLARI[x]).join(", ") || "-"
    // Pencere içindeki Kur'ân ekranı çizimleri: süre ve tetikleyen durumlar
    const pc = cizimler.filter(c => c.t >= t0 - 1500 && c.t <= t0 + 2500)
    const cizimToplam = pc.reduce((s2, c) => s2 + c.dt, 0)
    const cizimEnUzun = pc.reduce((m2, c) => Math.max(m2, c.dt), 0)
    const sayim = new Map()
    for (const c of pc) for (const ad of c.degisen) sayim.set(ad, (sayim.get(ad) || 0) + 1)
    const degisenMetin = [...sayim.entries()].sort((x, y) => y[1] - x[1]).map(([ad, n]) => `${ad}×${n}`).join(", ") || "-"
    const cizimZaman = pc.map(c => `${r(c.t - t0)}:${Math.round(c.dt)}`).join(" ")
    // EKRANDA KISA BİLDİRİM — ölçümün alındığı görülsün (kullanıcı: "kayıt yapmıyor")
    try {
      const b = document.createElement("div")
      b.textContent = `Dönme ölçüldü · en uzun donma ${bosluklar.length ? Math.round(bosluklar[0].g) : 0} ms`
      b.style.cssText = "position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 10px);transform:translateX(-50%);" +
        "z-index:99999;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.78);color:#fff;" +
        "font:600 12px/1.3 system-ui,sans-serif;pointer-events:none"
      document.body.appendChild(b)
      setTimeout(() => b.remove(), 2500)
    } catch { /* yoksay */ }
    sira++
    kayitEkle(
      `#${sira} ${a.once}→${window.innerWidth}×${window.innerHeight} · ilk olay: ${a.ilk} [${a.olaylar.join(" ")}]\n` +
      `   DONMA: en uzun ${enUzun} · >50ms toplam ${Math.round(toplam)} ms · oturma ${r(oturma)} ms\n` +
      `   ÇİZİM: ekran ${d.kuran} · sayfa ${d.sayfa} · kelime ${d.kelime} · ekran çizim süresi toplam ${Math.round(cizimToplam)} ms, en uzun ${Math.round(cizimEnUzun)} ms\n` +
      `   ÇİZİM ANLARI (başlangıç:süre ms): ${cizimZaman || "-"}\n` +
      `   TETİKLEYEN DURUMLAR: ${degisenMetin}\n` +
      `   DOM: ${doluSayfa} dolu sayfa · ${kelime} kelime · ${oge} öğe · ${konumlu} konumlu · deney: ${deney}`
    )
  }

  const rz = olay("resize"), oc = olay("orientationchange"), mqf = olay("mq")
  window.addEventListener("resize", rz, { passive: true })
  window.addEventListener("orientationchange", oc)
  let mq = null
  try {
    mq = window.matchMedia("(orientation: portrait)")
    mq.addEventListener ? mq.addEventListener("change", mqf) : mq.addListener(mqf)
  } catch { mq = null }

  return () => {
    // Ekrandan erken çıkılırsa yarım kalan ölçüm de kaydedilsin
    if (aktif) { try { bitir() } catch { /* yoksay */ } }
    cancelAnimationFrame(raf)
    zamanlayicilar.forEach(clearTimeout)
    window.removeEventListener("resize", rz)
    window.removeEventListener("orientationchange", oc)
    try { mq && (mq.removeEventListener ? mq.removeEventListener("change", mqf) : mq.removeListener(mqf)) } catch { /* yoksay */ }
  }
}
