/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KUR'AN DİNLE (Ekstralar) — kâriler, kaynaklar, uygulama geneli çalar
   src/data/kuranDinle.jsx

   11 Kasım 2026 — kullanıcı: "Ekstralar sayfasına Kur'an dinle bölümü yapalım; cüz
   olarak okuyan ve tüm hatim kaydı olan kârileri (bizde olmayanlardan, ör. İsmail
   Biçer) buraya alıp otomatik kapanma ve sürekli çalma ayarı ile birlikte verelim."
   "Kâri cüz cüz okuyorsa cüz, âyet âyet okuyorsa âyet, sûre sûre okuyorsa sûre seçenek
   olarak verilir; diğer seçeneklerin üzeri kapalı (koyu renkli bir belirteç) olur.
   Herhangi bir indirme yapmadan API olarak alabilmemiz gerekiyor."

   KAYNAKLAR (hepsi doğrudan akış; cihaza bir şey indirilmez):
   • way2quran.com — İsmail Biçer, sûre sûre (001–114.mp3). CORS açık (kullanıcının
     cihazında doğrulandı, 11 Kasım 2026).
   • Internet Archive (archive.org) — hatim kayıtları. Dosya adları kayıttan kayda
     farklı (cuz01.mp3, 01.mp3, 001Fatiha.mp3, "Abese.mp3", "… Bakara Suresi (256kbit).mp3")
     → liste ÇALIŞIRKEN archive.org'un metadata API'sinden alınır, dosya adından
     cüz / sûre numarası çıkarılır. Kayıtta bulunmayan cüz/sûre listede kapalı görünür.
     Yalnız .mp3 seçilir (İshak Danış'ın asılları Apple Lossless .m4a — çoğu tarayıcı
     çalamaz; archive.org'un ürettiği .mp3 kopyası kullanılıyor).
   • Diyanet Kur'an portalı — âyet âyet (Kur'ân oynatıcısındaki Türk kâriler).
     Ses dosyaları CORP same-site → eleman CORS kipinde (sesKaynagiAta).

   ÇALAR uygulama kökünde (App.jsx → <KuranDinleSaglayici>, radyonun içinde): Ekstralar'dan
   çıkınca susmaz, öbür ekranlarda küçük hap (components/MiniKuranDinle.jsx) görünür.
   Kur'ân oynatıcısı ya da radyo başlarsa Kur'an Dinle duraklar; Kur'an Dinle başlarsa
   Kur'ân oynatıcısı duraklar, radyo kapanır — iki ses üst üste binmez.
   KALDIĞI YER cihazda saklanır ("vukuf-kuran-dinle-son"): uzun cüz kayıtlarında
   dakikasıyla birlikte; kart "Kaldığınız yerden devam" önerir.
   ═══════════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useOynatici } from "./oynatici"
import { useRadyo } from "./radyo"
import { zamanlayiciOlustur, useZamanlayici } from "./otomatikDurdurma"
import { DIYANET_SES_URL, sesKaynagiAta } from "./hooks/useAudioPlayer"
import { SURE_ADLARI, sureAdi } from "./sureAdlari"
import { disSesKaydet, disSesBirak } from "./disSes"

// ── SABİTLER ─────────────────────────────────────────────────────────────────
// Sûre başına âyet sayıları (Hafs) — uygulamanın meal verisinden sayıldı (toplam 6236)
export const AYET_SAYILARI = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
]

export const TURLER = [
  { id: "cuz",  ad: "Cüz" },
  { id: "sure", ad: "Sûre" },
  { id: "ayet", ad: "Âyet" },
]

const p2 = (n) => String(n).padStart(2, "0")
const p3 = (n) => String(n).padStart(3, "0")
const arsivSayfa = (kimlik) => `https://archive.org/details/${kimlik}`

/* KÂRİLER — `kaynaklar` hangi biçimde okuduğunu söyler (cuz / sure / ayet).
   tip "sablon": adres numaradan kurulur. tip "arsiv": archive.org kaydı (esle: dosya
   adından numara nasıl çıkar — "cuz" | "numara" | "ad"). tip "diyanet": âyet âyet. */
export const KARILER = [
  { id: "ismail-bicer", ad: "İsmail Biçer", kaynaklar: {
      sure: { tip: "sablon", url: (n) => `https://media.way2quran.com/ismail-bicer/hafs-an-asim/${p3(n)}.mp3`,
              kaynak: "way2quran.com", sayfa: "https://way2quran.com/" } } },
  { id: "fatih-collak", ad: "Fatih Çollak", alt: "ve 70 hafız · hatim", kaynaklar: {
      cuz: { tip: "arsiv", kimlik: "fatihcollakve70hafizlihatimmp3", esle: "cuz", dua: "000-Hatim-Duasi.mp3",
             yedek: (n) => `cuz${p2(n)}.mp3` } } },
  { id: "mehmet-emin-ay", ad: "Mehmet Emin Ay", alt: "hatim", kaynaklar: {
      cuz: { tip: "arsiv", kimlik: "Mehmet-Emin-Ay-Cuz-Hatim-Arapca", esle: "cuz",
             yedek: (n) => `Mehmet-Emin-Ay-cuz${p2(n)}.mp3` } } },
  { id: "abdulkadir-sehitoglu", ad: "Abdulkadir Şehitoğlu", alt: "hatim", kaynaklar: {
      cuz: { tip: "arsiv", kimlik: "Abdulkadir-Sehitoglu-Hatim", esle: "cuz",
             yedek: (n) => `Abdulkadir-Sehitoglu-cuz${p2(n)}.mp3` } } },
  { id: "ihsan-atasoy", ad: "İhsan Atasoy", alt: "hatim", kaynaklar: {
      cuz: { tip: "arsiv", kimlik: "IhsanAtasoyHatim", esle: "cuz", yedek: (n) => `${p2(n)}.mp3` } } },
  { id: "davut-kaya", ad: "Davut Kaya", kaynaklar: {
      sure: { tip: "arsiv", kimlik: "davut-kaya-hatim", esle: "numara" },
      ayet: { tip: "diyanet", kimlik: "ar_davutkaya" } } },
  { id: "tayyar-altikulac", ad: "Tayyar Altıkulaç", kaynaklar: {
      sure: { tip: "arsiv", kimlik: "tayyar_altikulac_sure_sure_hatim", esle: "ad" },
      ayet: { tip: "diyanet", kimlik: "ar_TayyarAltikulac" } } },
  { id: "ishak-danis", ad: "İshak Danış", kaynaklar: {
      sure: { tip: "arsiv", kimlik: "ishakdanissureler", esle: "ad" },
      ayet: { tip: "diyanet", kimlik: "ar_ishakdemir" } } },
  { id: "osman-sahin", ad: "Osman Şahin", kaynaklar: {
      ayet: { tip: "diyanet", kimlik: "ar_osmanSahin" } } },
  { id: "mehmet-cevik", ad: "Mehmet Çevik", kaynaklar: {
      ayet: { tip: "diyanet", kimlik: "ar_mehmetcevik" } } },
  // 12 Kasım 2026 — kullanıcı: "Okuyanlara bir de Mahmoud Ali Al Banna'yı ekleyelim."
  // Sûre sûre way2quran (Hafs, 114 sûre, 320 kbps); âyet âyet everyayah (32 kbps — Kur'ân
  // oynatıcısındaki kayıt).
  { id: "mahmoud-ali-al-banna", ad: "Mahmoud Ali Al-Banna", kaynaklar: {
      sure: { tip: "way2", slug: "mahmoud-ali-al-banna", rivayet: "hafs-an-asim" },
      ayet: { tip: "everyayah", klasor: "mahmoud_ali_al_banna_32kbps" } } },
  // 12 Kasım 2026 — kullanıcı: "way2quran.com/tr/reciters/islam-sobhi bu kâriyi de ana listeye alalım."
  // Hangi sûrelerin olduğu kâri dizininden okunur (dizinde yoksa hepsi açık görünür).
  { id: "islam-sobhi", ad: "İslam Sobhi", kaynaklar: {
      sure: { tip: "way2", slug: "islam-sobhi", rivayet: "hafs-an-asim" } } },
]

/* ── WAY2QURAN ARAMASI — EK KÂRİLER (12 Kasım 2026) ─────────────────────────
   Kullanıcı: "Bu sayfada bulunan kâriler için bir arama butonu yapıp, yine way2 üzerinden
   bizim sistemimizde okutabilelim. Bizim seçtiğimiz kârileri değiştirmeyeceğiz, ek olarak
   bir arama butonu koyup way2 üzerinden çalacağız."
   way2quran'ın açık bir API'si yok, sayfaları da başka siteden okunamıyor (CORS); ses
   dosyaları ise her siteye açık (media.way2quran.com, ACAO *). Bu yüzden kâri DİZİNİ bir kez
   üretilip uygulamayla yayınlanıyor: public/way2quran-kariler.json (araclar/way2quran_dizin.py).
   Biçim: [{ s: slug, a: ad, r: { rivayet: 114 | [sûre no…] | { n: 114|[…], f: { no: "dosya" } } } }]
   — 114 = tam. `f`: dosya adı alışılmış "NNN" değilse (12 Kasım 2026: İslam Sobhi'de çoğu
   sûre "1.mp3", "8.mp3" diye dolgusuz; birinde "037-001.mp3" ek parça) o sûrenin gerçek adı.
   Aramadan seçilen kâri "ek kâri" olarak cihazda saklanır (son 8), listede ayrı çiplerde durur;
   kayıtlı kâriler değişmez. Kimlik: "way2:<slug>:<rivayet>". */
export const WAY2_DIZIN = "/way2quran-kariler.json"
// Dizindeki değer → { sureler: Set | null (tam), dosya: { no: "ad" } | null }
export function way2KapsamCoz(v) {
  if (Array.isArray(v)) return { sureler: new Set(v), dosya: null }
  if (v && typeof v === "object") {
    return {
      sureler: Array.isArray(v.n) ? new Set(v.n) : null,
      dosya: v.f && typeof v.f === "object" ? v.f : null,
    }
  }
  return { sureler: null, dosya: null }
}
// Kayıtlı way2 kârilerinin kapsamı dizinden öğrenilir: "slug|rivayet" → { sureler, dosya }
const way2Kapsam = new Map()
const kapsamAnahtar = (k) => `${k.slug}|${k.rivayet}`
function way2KapsamAl(k) {
  const a = kapsamAnahtar(k)
  if (way2Kapsam.has(a)) return Promise.resolve(way2Kapsam.get(a))
  return way2Dizin().then(d => {
    const x = d.find(y => y.s === k.slug)
    const c = way2KapsamCoz(x && x.r ? x.r[k.rivayet] : null)
    way2Kapsam.set(a, c)
    return c
  })
}
// Kapsam eldeyse hemen: aramadan eklenen kâride kendi üstünde (k.kapsam), kayıtlıda dizinden
function way2KapsamEl(k) {
  if (k.kapsam !== undefined) return k._kapsam || (k._kapsam = way2KapsamCoz(k.kapsam))
  return way2Kapsam.get(kapsamAnahtar(k)) || null
}
const way2KapsamHemen = (k) => way2KapsamEl(k)?.sureler || null
let dizinSozu = null
export function way2Dizin() {
  if (!dizinSozu) {
    dizinSozu = fetch(WAY2_DIZIN)
      .then(r => {
        const tur = (r.headers.get("content-type") || "").toLowerCase()
        if (!r.ok || tur.includes("text/html")) throw new Error("dizin yok")
        return r.json()
      })
      .then(j => {
        if (!Array.isArray(j)) throw new Error("bozuk")
        return j.filter(x => x && typeof x.s === "string" && x.r && typeof x.r === "object")
      })
      .catch(e => { dizinSozu = null; throw e })
  }
  return dizinSozu
}

const RIVAYET_ADLARI = {
  "hafs-an-asim": "Hafs", "warsh-an-nafi": "Verş", "qalun-an-nafi": "Kâlûn", "shubah-an-asim": "Şu'be",
  "al-duri-an-abi-amr": "Dûrî (Ebû Amr)", "al-susi-an-abi-amr": "Sûsî", "al-bazzi-an-ibn-kathir": "Bezzî",
  "qunbul-an-ibn-kathir": "Kunbül", "khalaf-an-hamzah": "Halef", "khallad-an-hamzah": "Hallâd",
  "al-duri-an-al-kisai": "Dûrî (Kisâî)", "hisham-an-ibn-amir": "Hişâm", "ibn-dhakwan-an-ibn-amir": "İbn Zekvân",
}
export function rivayetAdi(slug) {
  if (RIVAYET_ADLARI[slug]) return RIVAYET_ADLARI[slug]
  return String(slug || "").split("-").filter(Boolean).map(w => w[0].toLocaleUpperCase("tr-TR") + w.slice(1)).join(" ")
}

const EK_ANAHTAR = "vukuf-kuran-dinle-ek"
const EK_EN_COK = 8
function ekOku() {
  try {
    const l = JSON.parse(localStorage.getItem(EK_ANAHTAR) || "[]")
    if (Array.isArray(l)) return l.filter(e => e && typeof e.slug === "string" && typeof e.rivayet === "string")
  } catch { /* yoksay */ }
  return []
}
let ekListe = ekOku()
const ekDinleyici = new Set()
const ekYay = (l) => {
  ekListe = l
  try { localStorage.setItem(EK_ANAHTAR, JSON.stringify(l)) } catch { /* yoksay */ }
  ekDinleyici.forEach(f => f())
}
export const ekKimlik = (e) => `way2:${e.slug}:${e.rivayet}`
const ekBellek = new Map()
function ekNesne(e) {
  const id = ekKimlik(e)
  const o = ekBellek.get(id)
  if (o && o._e === e) return o
  const n = {
    id, ad: e.ad || e.slug, alt: rivayetAdi(e.rivayet), ek: true, _e: e,
    // kapsam: dizindeki değer (eski kayıtlarda yalnız `sureler` dizisi vardı)
    kaynaklar: { sure: { tip: "way2", slug: e.slug, rivayet: e.rivayet, kapsam: e.kapsam !== undefined ? e.kapsam : (Array.isArray(e.sureler) ? e.sureler : 114) } },
  }
  ekBellek.set(id, n)
  return n
}
export function useEkKariler() {
  const l = useSyncExternalStore((f) => { ekDinleyici.add(f); return () => ekDinleyici.delete(f) }, () => ekListe, () => ekListe)
  return useMemo(() => l.map(ekNesne), [l])
}
// Aramadan seçilen kâriyi başa ekle (varsa öne al); kimliğini döndür
export function ekKariEkle(e) {
  const y = { slug: e.slug, ad: e.ad, rivayet: e.rivayet, kapsam: e.kapsam !== undefined ? e.kapsam : 114 }
  const id = ekKimlik(y)
  ekYay([y, ...ekListe.filter(x => ekKimlik(x) !== id)].slice(0, EK_EN_COK))
  return id
}
export function ekKariSil(id) { ekYay(ekListe.filter(x => ekKimlik(x) !== id)) }

// Dizinde arama: ad ya da kimlik (slug) içinde sorgunun bütün kelimeleri (Türkçe/aksan duyarsız)
const aramaMetni = (x) => (sade(x.a) + " " + sade(String(x.s).replace(/-/g, " "))).replace(/[^a-z0-9 ]/g, "")
export function way2Ara(dizin, sorgu, sinir = 40) {
  const kel = sade(sorgu).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean)
  if (!kel.length || !Array.isArray(dizin)) return []
  const sonuc = []
  for (const x of dizin) {
    const m = x._m || (x._m = aramaMetni(x))
    if (kel.every(k => m.includes(k))) { sonuc.push(x); if (sonuc.length >= sinir) break }
  }
  return sonuc
}

export const kariBul = (id) => {
  if (!id) return null
  const k = KARILER.find(x => x.id === id)
  if (k) return k
  const e = ekListe.find(x => ekKimlik(x) === id)
  return e ? ekNesne(e) : null
}

export function kaynakBilgisi(k) {
  if (!k) return null
  if (k.tip === "arsiv") return { ad: "Internet Archive", sayfa: arsivSayfa(k.kimlik) }
  if (k.tip === "diyanet") return { ad: "Diyanet Kur'an portalı", sayfa: "https://kuran.diyanet.gov.tr/" }
  if (k.tip === "way2") return { ad: "way2quran.com", sayfa: `https://way2quran.com/tr/reciters/${k.slug}` }
  if (k.tip === "everyayah") return { ad: "EveryAyah", sayfa: "https://everyayah.com/" }
  return { ad: k.kaynak, sayfa: k.sayfa }
}

// ── SÛRE ADI → NUMARA (archive.org dosya adları için) ────────────────────────
const sade = (s) => String(s || "")
  .toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/ı/g, "i")
const anahtar = (s) => sade(s).replace(/[^a-z]/g, "")
const AD_TABLOSU = (() => {
  const m = new Map()
  SURE_ADLARI.forEach((ad, i) => {
    const ana = ad.replace(/\(.*?\)/g, "")
    m.set(anahtar(ana), i + 1)
    const ic = /\((.*?)\)/.exec(ad)
    if (ic) m.set(anahtar(ic[1]), i + 1)
  })
  // Kayıtlarda görülen ya da yaygın başka yazılışlar
  const ek = { lukman: 31, hasir: 59, saf: 61, muzemmil: 73, mudessir: 74, serh: 94, insirah: 94,
    yasinisserif: 36, yasinserif: 36, alaa: 87, kiyamet: 75, tekasur: 102, berae: 9, leheb: 111 }
  for (const [k, v] of Object.entries(ek)) if (!m.has(k)) m.set(k, v)
  return m
})()
const ATILAN = /\b(suresi|sure|surah|kbit|kbps|ishak|danis|tayyar|altikulac|hafiz)\b/g
/* SÛRE ARAMASI (12 Kasım 2026, kullanıcı: "sûre kısmına arama butonu koyalım; büyük/küçük
   harf ayarı da gerekecek, ör. 'ali imran' yazan doğru sûreye ulaşabilmeli"). Yazılanın
   harfleri sadeleşir (Türkçe büyük/küçük, şapka, kesme, tire, boşluk yok sayılır): "ALİ İMRAN",
   "al-i imran", "âl-i İmrân" hepsi aynı. Ad ya da bilinen öbür adı (Gâfir, Şerh, Lokman…) ile ve
   sûre numarasıyla bulunur; adın başı tutanlar öne alınır. Dönüş: [sûre no…] */
export function sureAra(sorgu) {
  const ham = String(sorgu || "").trim()
  if (!ham) return []
  const sayi = /^\d{1,3}$/.test(ham) ? +ham : null
  const q = anahtar(ham)
  const tam = [], bas = [], ic = []
  if (sayi && sayi >= 1 && sayi <= 114) tam.push(sayi)
  if (q) {
    const adlar = Array.from({ length: 114 }, () => [])
    for (const [k, no] of AD_TABLOSU) adlar[no - 1].push(k)
    for (let i = 0; i < 114; i++) {
      const no = i + 1
      if (no === sayi) continue
      if (adlar[i].includes(q)) tam.push(no)
      else if (adlar[i].some(k => k.startsWith(q))) bas.push(no)
      else if (adlar[i].some(k => k.includes(q))) ic.push(no)
    }
  }
  return [...tam, ...bas, ...ic]
}

export function sureAdindanNo(metin) {
  const s = sade(metin).replace(/\(.*?\)/g, " ").replace(/\d+/g, " ").replace(ATILAN, " ")
  const k = s.replace(/[^a-z]/g, "")
  return AD_TABLOSU.get(k) || null
}

// ── ARŞİV LİSTESİ (archive.org metadata API) ─────────────────────────────────
const LISTE_ANAHTAR = "vukuf-kuran-dinle-liste"      // { kimlik: { t, dosyalar:[ad…] } } — yalnız dosya adları
const LISTE_OMRU = 7 * 24 * 3600 * 1000
const bellek = new Map()                              // kimlik → Promise<string[]>
const hazir = new Map()                               // kimlik → string[] (eşzamanlı erişim)

function listeOku(kimlik) {
  try {
    const t = JSON.parse(localStorage.getItem(LISTE_ANAHTAR) || "{}")[kimlik]
    if (t && Array.isArray(t.dosyalar) && Date.now() - t.t < LISTE_OMRU) return t.dosyalar
  } catch { /* yoksay */ }
  return null
}
function listeYaz(kimlik, dosyalar) {
  try {
    const t = JSON.parse(localStorage.getItem(LISTE_ANAHTAR) || "{}")
    t[kimlik] = { t: Date.now(), dosyalar }
    localStorage.setItem(LISTE_ANAHTAR, JSON.stringify(t))
  } catch { /* yoksay */ }
}

export function arsivDosyalari(kimlik) {
  if (hazir.has(kimlik)) return Promise.resolve(hazir.get(kimlik))
  const kayitli = listeOku(kimlik)
  if (kayitli) { hazir.set(kimlik, kayitli); return Promise.resolve(kayitli) }
  if (bellek.has(kimlik)) return bellek.get(kimlik)
  const p = fetch(`https://archive.org/metadata/${encodeURIComponent(kimlik)}/files`)
    .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
    .then(j => {
      const liste = (j && (j.result || j.files)) || []
      const adlar = liste.map(f => f && f.name).filter(ad => typeof ad === "string" && /\.mp3$/i.test(ad))
      if (!adlar.length) throw new Error("bos")
      hazir.set(kimlik, adlar); listeYaz(kimlik, adlar)
      return adlar
    })
    .catch(e => { bellek.delete(kimlik); throw e })
  bellek.set(kimlik, p)
  return p
}

/* Dosya adlarından numara → dosya adı eşlemi. Aynı parçanın birden çok .mp3'ü varsa
   (ör. "cuz01.mp3", "cuz01_vbr.mp3", "cuz01_64kb.mp3") ekisiz olan seçilir. */
const eslemBellek = new Map()
export function arsivEslemi(k, dosyalar) {
  const anah = `${k.kimlik}|${k.esle}`
  const onceki = eslemBellek.get(anah)
  if (onceki && onceki.kaynak === dosyalar) return onceki.harita
  const harita = new Map()
  const puanlar = new Map()
  for (const ad of dosyalar) {
    const taban = ad.replace(/^.*\//, "").replace(/\.mp3$/i, "")
    if (k.dua && ad === k.dua) continue
    let no = null
    if (k.esle === "cuz") {
      const m = /cuz\D{0,2}0*(\d{1,2})/i.exec(taban) || /^0*(\d{1,2})(?:_|$)/.exec(taban)
      no = m ? +m[1] : null
      if (!(no >= 1 && no <= 30)) no = null
    } else if (k.esle === "numara") {
      const m = /^0*(\d{1,3})/.exec(taban)
      no = m ? +m[1] : null
      if (!(no >= 1 && no <= 114)) no = null
    } else if (k.esle === "ad") {
      no = sureAdindanNo(taban.replace(/_(64kb|vbr)$/i, ""))
    }
    if (!no) continue
    const puan = /_64kb$/i.test(taban) ? 1 : /_vbr$/i.test(taban) ? 2 : 3
    if (!harita.has(no) || puanlar.get(no) < puan) { harita.set(no, ad); puanlar.set(no, puan) }
  }
  if (k.dua && dosyalar.includes(k.dua)) harita.set("dua", k.dua)
  eslemBellek.set(anah, { kaynak: dosyalar, harita })
  return harita
}
const arsivUrl = (kimlik, ad) => `https://archive.org/download/${kimlik}/${ad.split("/").map(encodeURIComponent).join("/")}`

/* Bir kâri + tür için parça listesi: [{ no, ad, var }] — `var:false` olanlar kapalı çizilir.
   durum: "hazir" | "yukleniyor" | "hata". Arşiv listesi alınamazsa ve kaydın bilinen bir
   dosya kalıbı varsa (yedek) liste yine de verilir (hepsi açık). */
export function parcaSayisi(tur) { return tur === "cuz" ? 30 : 114 }

export function parcaAdi(tur, no, ayet) {
  if (no === "dua") return "Hatim duası"
  if (tur === "cuz") return `${no}. Cüz`
  if (tur === "sure") return `${sureAdi(no)} Sûresi`
  if (ayet === 0) return `${sureAdi(no)} · Besmele`
  return `${sureAdi(no)} · ${ayet}. âyet`
}

// Eşzamanlı: liste hazırsa URL'yi hemen verir (iPhone'da dokunuş anında play() için şart)
function urlHemen(kari, tur, no, ayet) {
  const k = kari?.kaynaklar?.[tur]
  if (!k) return { url: null }
  if (k.tip === "sablon") return { url: k.url(no) }
  if (k.tip === "way2") {
    const c = way2KapsamEl(k)
    if (!c) return { bekle: true }                   // kayıtlı kâri: dosya adları dizinden gelecek
    return { url: `https://media.way2quran.com/${k.slug}/${k.rivayet}/${encodeURIComponent((c.dosya && c.dosya[no]) || p3(no))}.mp3` }
  }
  if (k.tip === "everyayah") {
    const a = ayet === 0 ? 1 : ayet, s = ayet === 0 ? 1 : no      // besmele: Fâtiha 1
    return { url: `https://everyayah.com/data/${k.klasor}/${p3(s)}${p3(a)}.mp3` }
  }
  if (k.tip === "diyanet") {
    const a = ayet === 0 ? 1 : ayet, s = ayet === 0 ? 1 : no      // besmele: Fâtiha 1 (oynatıcıdaki gibi)
    return { url: `${DIYANET_SES_URL}/${k.kimlik}/${Number(s)}_${Number(a)}.mp3` }
  }
  if (k.tip === "arsiv") {
    const dosyalar = hazir.get(k.kimlik) || listeOku(k.kimlik)
    if (!dosyalar) return { bekle: true }
    hazir.set(k.kimlik, dosyalar)
    const ad = arsivEslemi(k, dosyalar).get(no)
    return { url: ad ? arsivUrl(k.kimlik, ad) : null }
  }
  return { url: null }
}
async function urlBekle(kari, tur, no, ayet) {
  const k = kari?.kaynaklar?.[tur]
  const h = urlHemen(kari, tur, no, ayet)
  if (!h.bekle) return h.url
  if (k.tip === "way2") {
    // Dizin alınamazsa alışılmış "NNN.mp3" adıyla denenir
    try { await way2KapsamAl(k) } catch { way2Kapsam.set(kapsamAnahtar(k), { sureler: null, dosya: null }) }
    return urlHemen(kari, tur, no, ayet).url
  }
  try {
    await arsivDosyalari(k.kimlik)
    return urlHemen(kari, tur, no, ayet).url
  } catch {
    if (no === "dua") return k.dua ? arsivUrl(k.kimlik, k.dua) : null
    return k.yedek ? arsivUrl(k.kimlik, k.yedek(no)) : null
  }
}

// Parça listesi için kanca (kart kullanır)
export function useParcaListesi(kari, tur) {
  const k = kari?.kaynaklar?.[tur] || null
  const [s, setS] = useState(0)                       // liste gelince yeniden çiz
  const [deneme, setDeneme] = useState(0)             // "Tekrar dene"
  const [hata, setHata] = useState(null)
  // way2 kâri (kayıtlı): eksik sûreler varsa dizinden öğrenilir; dizin yoksa hepsi açık kalır
  useEffect(() => {
    if (!k || k.tip !== "way2" || k.kapsam !== undefined) return
    let iptal = false
    way2KapsamAl(k).then(() => { if (!iptal) setS(x => x + 1) }).catch(() => {})
    return () => { iptal = true }
  }, [k])
  useEffect(() => {
    setHata(null)
    if (!k || k.tip !== "arsiv") return
    let iptal = false
    arsivDosyalari(k.kimlik).then(() => { if (!iptal) setS(x => x + 1) })
      .catch(() => { if (!iptal) setHata(k.yedek ? "yedek" : "hata") })
    return () => { iptal = true }
  }, [k, deneme])
  const tekrar = useCallback(() => { setHata(null); setDeneme(x => x + 1) }, [])
  return useMemo(() => {
    if (!k) return { durum: "yok", parcalar: [] }
    if (tur === "ayet") return { durum: "hazir", parcalar: SURE_ADLARI.map((_, i) => ({ no: i + 1, var: true })) }
    const sayi = parcaSayisi(tur)
    const hepsi = (v) => Array.from({ length: sayi }, (_, i) => ({ no: i + 1, var: v }))
    if (k.tip === "sablon") return { durum: "hazir", parcalar: hepsi(true) }
    if (k.tip === "way2") {
      const var_ = way2KapsamHemen(k)
      return { durum: "hazir", parcalar: hepsi(true).map(p => ({ ...p, var: !var_ || var_.has(p.no) })) }
    }
    const dosyalar = hazir.get(k.kimlik) || listeOku(k.kimlik)
    if (dosyalar) {
      const h = arsivEslemi(k, dosyalar)
      const l = hepsi(false).map(p => ({ ...p, var: h.has(p.no) }))
      if (h.has("dua")) l.push({ no: "dua", var: true })
      return { durum: "hazir", parcalar: l, tekrar }
    }
    if (hata === "yedek") {
      const l = hepsi(true)
      if (k.dua) l.push({ no: "dua", var: true })
      return { durum: "hazir", parcalar: l, yedek: true, tekrar }
    }
    if (hata) return { durum: "hata", parcalar: [], tekrar }
    return { durum: "yukleniyor", parcalar: [], tekrar }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, tur, s, hata, tekrar])
}

// Sıradaki (ya da önceki) mevcut parça; yoksa null
function komsuParca(kari, tur, no, yon) {
  const k = kari?.kaynaklar?.[tur]
  if (!k) return null
  const sayi = parcaSayisi(tur)
  let harita = null
  if (k.tip === "arsiv") {
    const d = hazir.get(k.kimlik) || listeOku(k.kimlik)
    if (d) harita = arsivEslemi(k, d)
  }
  if (k.tip === "way2") harita = way2KapsamHemen(k)
  const varMi = (n) => (!harita ? true : harita.has(n))
  const duaVar = harita ? harita.has("dua") : !!k.dua
  if (yon > 0) {
    if (no === "dua") return null
    for (let n = no + 1; n <= sayi; n++) if (varMi(n)) return n
    return duaVar ? "dua" : null
  }
  const bas = no === "dua" ? sayi : no - 1
  for (let n = bas; n >= 1; n--) if (varMi(n)) return n
  return null
}
// Âyet kipinde sıradaki âyet: besmele (0) → 1 → … → son; sûre bitince sıradaki sûrenin başı
const besmeleli = (s) => s !== 1 && s !== 9
function sonrakiAyet(s, a, surekli) {
  if (a < AYET_SAYILARI[s - 1]) return { parca: s, ayet: a + 1 }
  if (!surekli || s >= 114) return null
  return { parca: s + 1, ayet: besmeleli(s + 1) ? 0 : 1 }
}
function oncekiAyet(s, a) {
  if (a > 1) return { parca: s, ayet: a - 1 }
  if (a === 1 && besmeleli(s)) return { parca: s, ayet: 0 }
  if (s <= 1) return null
  return { parca: s - 1, ayet: AYET_SAYILARI[s - 2] }
}

// ── KALDIĞI YER, SÜREKLİ ÇALMA ───────────────────────────────────────────────
const SON_ANAHTAR = "vukuf-kuran-dinle-son"
const SUREKLI_ANAHTAR = "vukuf-kuran-dinle-surekli"
export function sonKonumOku() {
  try {
    const v = JSON.parse(localStorage.getItem(SON_ANAHTAR) || "null")
    if (v && kariBul(v.kariId) && v.tur && v.parca != null) return v
  } catch { /* yoksay */ }
  return null
}
function sonKonumYaz(v) {
  try { localStorage.setItem(SON_ANAHTAR, JSON.stringify({ ...v, t: Date.now() })) } catch { /* yoksay */ }
}

// Çalma süresi ayrı bir depoda: saniyede birkaç kez değişir, yalnız ilerleme çubuğu dinler
let zaman = { su: 0, toplam: 0 }
const zamanDinleyici = new Set()
const zamanYay = (z) => { zaman = z; zamanDinleyici.forEach(f => f()) }
export function useDinleZamani() {
  return useSyncExternalStore((f) => { zamanDinleyici.add(f); return () => zamanDinleyici.delete(f) }, () => zaman, () => zaman)
}
export const sureYazisi = (sn) => {
  if (!isFinite(sn) || sn < 0) sn = 0
  const s = Math.floor(sn % 60), d = Math.floor(sn / 60) % 60, sa = Math.floor(sn / 3600)
  return sa ? `${sa}:${p2(d)}:${p2(s)}` : `${d}:${p2(s)}`
}

/* OTOMATİK KAPANMA — süre dolunca durur; kaldığı yer saklanır (radyodaki gibi modül
   düzeyinde: Ekstralar'dan çıkılınca da sürer). */
let dinleKapat = () => {}
export const kuranDinleZamanlayici = zamanlayiciOlustur(() => dinleKapat())

// ── SAĞLAYICI ────────────────────────────────────────────────────────────────
const Baglam = createContext(null)
export function useKuranDinle() { return useContext(Baglam) }

export function KuranDinleSaglayici({ children }) {
  const player = useOynatici()
  const radyo = useRadyo()
  const sesRef = useRef(null)
  const onRef = useRef(null)                           // sıradaki âyeti önden ısıtmak için
  const [calan, setCalan] = useState(null)             // { kariId, tur, parca, ayet }
  const [durum, setDurum] = useState("kapali")         // kapali | yukleniyor | caliyor | duraklatildi | bitti | hata
  const [surekli, setSurekliD] = useState(() => { try { return localStorage.getItem(SUREKLI_ANAHTAR) !== "0" } catch { return true } })
  const calanRef = useRef(null); calanRef.current = calan
  const surekliRef = useRef(surekli); surekliRef.current = surekli
  const jetonRef = useRef(0)
  const sonYazRef = useRef(0)
  const arayuzRef = useRef(null)                       // disSes kaydı (kilit ekranı düğmeleri)

  const konumSakla = useCallback(() => {
    const c = calanRef.current, a = sesRef.current
    if (!c) return
    sonKonumYaz({ ...c, zaman: c.tur === "ayet" || !a ? 0 : Math.floor(a.currentTime || 0) })
  }, [])

  const ses = useCallback(() => {
    if (!sesRef.current && typeof Audio !== "undefined") {
      const a = new Audio()
      a.preload = "auto"
      a.addEventListener("playing", () => setDurum("caliyor"))
      a.addEventListener("waiting", () => setDurum(d => (d === "caliyor" ? "yukleniyor" : d)))
      a.addEventListener("pause", () => { setDurum(d => (d === "caliyor" || d === "yukleniyor" ? "duraklatildi" : d)); konumSakla() })
      a.addEventListener("error", () => { if (a.getAttribute("src")) setDurum(d => (d === "kapali" ? d : "hata")) })
      a.addEventListener("timeupdate", () => {
        zamanYay({ su: a.currentTime || 0, toplam: isFinite(a.duration) ? a.duration : 0 })
        if (Date.now() - sonYazRef.current > 5000) { sonYazRef.current = Date.now(); konumSakla() }
      })
      a.addEventListener("loadedmetadata", () => zamanYay({ su: a.currentTime || 0, toplam: isFinite(a.duration) ? a.duration : 0 }))
      a.addEventListener("ended", () => bittiRef.current())
      sesRef.current = a
    }
    return sesRef.current
  }, [konumSakla])

  const digerleriSustur = useCallback(() => {
    try { if (player && player.durum === "caliyor") player.duraklat() } catch { /* yoksay */ }
    try { if (radyo && radyo.istasyon) radyo.kapat() } catch { /* yoksay */ }
  }, [player, radyo])

  const medya = useCallback((c) => {
    try {
      if (!("mediaSession" in navigator) || !window.MediaMetadata) return
      const k = kariBul(c.kariId)
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: parcaAdi(c.tur, c.parca, c.ayet), artist: k ? k.ad : "Kur'ân-ı Kerîm", album: "Vukuf · Kur'an Dinle",
      })
    } catch { /* yoksay */ }
  }, [])

  // Kilit ekranı düğmeleri: Kur'an Dinle etkinken onu yönetsin
  const kaydol = useCallback(() => {
    const a = arayuzRef.current
    if (!a) return
    disSesKaydet(a)
    try {
      const ms = navigator.mediaSession
      ms.setActionHandler("seekto", (e) => { const s = sesRef.current; if (s && e && isFinite(e.seekTime)) s.currentTime = e.seekTime })
      ms.setActionHandler("seekbackward", (e) => { const s = sesRef.current; if (s) s.currentTime = Math.max(0, s.currentTime - ((e && e.seekOffset) || 15)) })
      ms.setActionHandler("seekforward", (e) => { const s = sesRef.current; if (s) s.currentTime = s.currentTime + ((e && e.seekOffset) || 15) })
    } catch { /* yoksay */ }
  }, [])
  const birak = useCallback(() => {
    disSesBirak(arayuzRef.current)
    try {
      const ms = navigator.mediaSession
      ms.setActionHandler("seekto", null); ms.setActionHandler("seekbackward", null); ms.setActionHandler("seekforward", null)
    } catch { /* yoksay */ }
  }, [])

  const yukleVeCal = useCallback((c, url, zamanSn) => {
    const a = ses()
    const jeton = jetonRef.current
    if (!a) return
    if (!url) { setDurum("hata"); return }
    sesKaynagiAta(a, url)
    zamanYay({ su: zamanSn || 0, toplam: 0 })
    if (zamanSn > 0) {
      const git = () => { try { a.currentTime = zamanSn } catch { /* yoksay */ } a.removeEventListener("loadedmetadata", git) }
      a.addEventListener("loadedmetadata", git)
    }
    a.play().catch((e) => {
      if (jeton !== jetonRef.current || (e && e.name === "AbortError")) return   // yerine yenisi geldi
      setDurum(e && e.name === "NotAllowedError" ? "duraklatildi" : "hata")
    })
    medya(c)
    kaydol()
    // Âyet kipinde sıradaki âyeti önden ısıt (masaüstü tarayıcılar önbelleğe alır)
    if (c.tur === "ayet") {
      const s = sonrakiAyet(c.parca, c.ayet, surekliRef.current)
      if (s) {
        try {
          if (!onRef.current) { onRef.current = new Audio(); onRef.current.preload = "auto"; onRef.current.muted = true }
          sesKaynagiAta(onRef.current, urlHemen(kariBul(c.kariId), "ayet", s.parca, s.ayet).url)
          onRef.current.load()
        } catch { /* yoksay */ }
      }
    }
  }, [ses, medya, kaydol])

  // Bir parçayı başlat: { kariId, tur, parca, ayet?, zaman? }
  const baslat = useCallback((istek) => {
    const kari = kariBul(istek.kariId)
    if (!kari || !kari.kaynaklar[istek.tur]) return
    const c = { kariId: kari.id, tur: istek.tur, parca: istek.parca, ayet: istek.tur === "ayet" ? (istek.ayet ?? 1) : null }
    const jeton = ++jetonRef.current
    digerleriSustur()
    setCalan(c); calanRef.current = c
    setDurum("yukleniyor")
    const h = urlHemen(kari, c.tur, c.parca, c.ayet)
    if (!h.bekle) { yukleVeCal(c, h.url, istek.zaman || 0); return }
    // Arşiv listesi henüz gelmedi (kart onu kâri seçilince önden ister; buraya nadiren düşülür).
    // iPhone dokunuştan sonra gecikmeli play()'i reddederse durum "duraklatıldı" olur, ▶ ile sürer.
    urlBekle(kari, c.tur, c.parca, c.ayet).then(url => {
      if (jeton !== jetonRef.current) return
      yukleVeCal(c, url, istek.zaman || 0)
    })
  }, [digerleriSustur, yukleVeCal])

  const duraklat = useCallback(() => { try { sesRef.current?.pause() } catch { /* yoksay */ } }, [])
  const devam = useCallback(() => {
    const a = sesRef.current, c = calanRef.current
    if (!a || !c) return
    if (!a.getAttribute("src") || durum === "hata" || durum === "bitti") { baslat({ ...c, zaman: durum === "bitti" ? 0 : Math.floor(a.currentTime || 0) }); return }
    digerleriSustur()
    kaydol()
    setDurum("yukleniyor")
    a.play().catch((e) => setDurum(e && e.name === "NotAllowedError" ? "duraklatildi" : "hata"))
  }, [baslat, digerleriSustur, kaydol, durum])

  const atla = useCallback((yon) => {
    const c = calanRef.current
    if (!c) return
    const kari = kariBul(c.kariId)
    if (c.tur === "ayet") {
      const y = yon > 0 ? sonrakiAyet(c.parca, c.ayet, true) : oncekiAyet(c.parca, c.ayet)
      if (y) baslat({ kariId: c.kariId, tur: "ayet", ...y })
      return
    }
    // Geri: parçanın başından 5 sn'den fazla geçildiyse önce başa sar
    const a = sesRef.current
    if (yon < 0 && a && a.currentTime > 5) { a.currentTime = 0; return }
    const n = komsuParca(kari, c.tur, c.parca, yon)
    if (n != null) baslat({ kariId: c.kariId, tur: c.tur, parca: n })
  }, [baslat])

  const kapat = useCallback(() => {
    const a = sesRef.current
    konumSakla()
    jetonRef.current++
    kuranDinleZamanlayici.iptal()
    birak()
    setDurum("kapali")
    setCalan(null); calanRef.current = null
    zamanYay({ su: 0, toplam: 0 })
    if (a) { try { a.pause(); a.removeAttribute("src"); a.load() } catch { /* yoksay */ } }
    if (onRef.current) { try { onRef.current.removeAttribute("src"); onRef.current.load() } catch { /* yoksay */ } }
  }, [konumSakla, birak])
  dinleKapat = kapat

  const sar = useCallback((sn) => { const a = sesRef.current; if (a && isFinite(sn)) { try { a.currentTime = Math.max(0, sn) } catch { /* yoksay */ } } }, [])

  // Parça bitince: sürekli çalma açıksa sıradaki, değilse dur
  const bittiRef = useRef(() => {})
  bittiRef.current = () => {
    const c = calanRef.current
    if (!c) return
    if (kuranDinleZamanlayici.denetle()) return
    if (c.tur === "ayet") {
      // Âyet kipinde sûre içinde her zaman devam; sûre bitince sürekli çalma karar verir
      const y = sonrakiAyet(c.parca, c.ayet, surekliRef.current)
      if (y) { baslat({ kariId: c.kariId, tur: "ayet", ...y }); return }
    } else if (surekliRef.current) {
      const n = komsuParca(kariBul(c.kariId), c.tur, c.parca, 1)
      if (n != null) { baslat({ kariId: c.kariId, tur: c.tur, parca: n }); return }
    }
    setDurum("bitti")
    sonKonumYaz({ ...c, zaman: 0 })
  }

  const setSurekli = useCallback((v) => {
    setSurekliD(v)
    try { localStorage.setItem(SUREKLI_ANAHTAR, v ? "1" : "0") } catch { /* yoksay */ }
  }, [])

  // Kilit ekranı işleyicileri (oynatıcının işleyicileri bunlara devreder)
  arayuzRef.current = arayuzRef.current || {}
  Object.assign(arayuzRef.current, {
    play: () => devam(), pause: () => duraklat(),
    nexttrack: () => atla(1), previoustrack: () => atla(-1),
  })

  // Kur'ân oynatıcısı ya da radyo başlarsa Kur'an Dinle duraklar ve düğmeleri bırakır
  useEffect(() => {
    if (player && player.durum === "caliyor") {
      if (durum === "caliyor" || durum === "yukleniyor") duraklat()
      birak()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.durum])
  useEffect(() => {
    if (radyo && (radyo.durum === "caliyor" || radyo.durum === "yukleniyor")) {
      if (durum === "caliyor" || durum === "yukleniyor") duraklat()
      birak()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radyo?.durum])

  useEffect(() => {
    try { if ("mediaSession" in navigator && calan) navigator.mediaSession.playbackState = durum === "caliyor" ? "playing" : "paused" } catch { /* yoksay */ }
  }, [durum, calan])

  const uyku = useZamanlayici(kuranDinleZamanlayici)

  const deger = useMemo(() => ({
    calan, durum, surekli, setSurekli, baslat, duraklat, devam, atla, kapat, sar, uyku,
  }), [calan, durum, surekli, setSurekli, baslat, duraklat, devam, atla, kapat, sar, uyku.dk, uyku.bitis])   // eslint-disable-line react-hooks/exhaustive-deps

  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>
}
