/* ═══════════════════════════════════════════════════════════════════════════
 *  VUKUF — KÂRİ SESİ ÇEVRİMDIŞI İNDİRME (veri katmanı)
 *  src/data/sesIndirme.js
 *
 *  ── CÜZ SINIRLARI TABLODAN DEĞİL, KENDİ VERİMİZDEN ─────────────────────────
 *  Cüz başlangıçlarını ezbere bir tabloya yazmak kolaydı ama bu projede Kur'ân
 *  yapısına dair veriyi uydurmamak kuralı var. `kuran-mushaf.json` içinde ZATEN
 *  her âyetin `cuz` alanı duruyor; cüz→âyet eşlemesi oradan türetiliyor. Böylece
 *  uygulamanın gösterdiği cüz ile indirdiği cüz AYNI kaynaktan geliyor ve
 *  birbirinden ayrışması imkânsız.
 *
 *  ── BOYUT TAHMİNİ: ÂYET BAŞINA DEĞİL, KELİME BAŞINA ────────────────────────
 *  Âyet uzunlukları çok değişken (Âyetü'l-Kürsî ile Kevser aynı "1 âyet"). Bu
 *  yüzden "ortalama âyet boyutu × âyet sayısı" belirli bir sûre için kötü bir
 *  tahmin — daha önce üç örnekle yapılan tahmin tam bu yüzden 4-5 kat şişmişti.
 *  Mushaf verisinde her âyetin KELİMELERİ var; örneklemden `bayt/kelime` oranı
 *  çıkarılıp her sûre/cüz kendi kelime sayısıyla çarpılıyor. Uzunluk farkı
 *  böylece tahmine giriyor.
 *
 *  ── ÖLÇÜM İNDİRMEDEN YAPILIYOR ─────────────────────────────────────────────
 *  `HEAD` ile yalnız `Content-Length` okunuyor; dosyalar inmiyor. `Content-Length`
 *  CORS'ta güvenli listede olduğu için ek izin gerekmiyor.
 *  ═══════════════════════════════════════════════════════════════════════════ */

import { mp3Url, BESMELE_OKUYANLAR } from "./hooks/useAudioPlayer"

export const SES_ONBELLEK = "vukuf-ses"

/* Mushaf verisi 5 MB, yalnız gerektiğinde çekiliyor. Yükleyici ORTAK bir
 *  modülde (`mushafVerisi.js`): hıfz ilerleme haritası da aynı veriyi istiyor,
 *  iki ayrı yükleyici olsaydı 5 MB bellekte iki kez dururdu. Geriye dönük
 *  uyumluluk için buradan da dışa veriliyor. */
export { mushafYukle } from "./mushafVerisi"

const kelimeSayisi = (ayet) => (Array.isArray(ayet.kelimeler) ? ayet.kelimeler.length : 0)

/* Sûre listesi — ad, âyet sayısı, kelime sayısı. Kelime sayısı boyut tahmini için. */
export function sureListesi(mushaf) {
  return (mushaf || []).map(s => ({
    no: s.id,
    ad: s.isim,
    adArapca: s.isimArapca,
    ayetSayisi: (s.ayetler || []).length,
                                  kelime: (s.ayetler || []).reduce((t, a) => t + kelimeSayisi(a), 0),
                                  ayetler: (s.ayetler || []).map(a => ({ sureNo: s.id, ayetNo: a.no })),
  }))
}

/* Cüz listesi — her âyetin kendi `cuz` alanından toplanıyor.
 *  CÜZ SINIRI ÂYET ORTASINDAN GEÇMEZ: veri âyet düzeyinde etiketli, yani bir
 *  âyet tek bir cüze ait. Dolayısıyla "değen âyeti de al" gibi bir tavize
 *  gerek kalmıyor — sınırlar veriyle birebir. */
export function cuzListesi(mushaf) {
  const kutular = new Map()
  for (const s of mushaf || []) {
    for (const a of s.ayetler || []) {
      const c = a.cuz
      if (!c) continue
        if (!kutular.has(c)) kutular.set(c, { no: c, ayetler: [], kelime: 0, sureler: new Set() })
          const k = kutular.get(c)
          k.ayetler.push({ sureNo: s.id, ayetNo: a.no })
          k.kelime += kelimeSayisi(a)
          k.sureler.add(s.isim)
    }
  }
  return [...kutular.values()]
  .sort((a, b) => a.no - b.no)
  .map(k => ({ ...k, sureler: [...k.sureler] }))
}

/* Bir âyet kümesinin mp3 adresleri.
 *  BESMELE: `sureCal` çoğu kâride sûre başına Fâtiha 1:1'i besmele olarak
 *  ekliyor. O tek dosya indirme kümesine her zaman katılıyor — yoksa çevrimdışı
 *  sûre başlatınca ilk parça sessiz kalırdı. */
export function sesAdresleri(kariId, ayetler) {
  const kume = new Set(ayetler.map(a => mp3Url(kariId, a.sureNo, a.ayetNo)))
  if (!BESMELE_OKUYANLAR.includes(kariId)) kume.add(mp3Url(kariId, 1, 1))
    return [...kume]
}

/* ── BOYUT ÖRNEKLEMESİ ──────────────────────────────────────────────────────
 *  Rastgele n âyetin boyutu HEAD ile ölçülüp kelime sayılarına bölünüyor.
 *  Dönen `baytKelime` ile herhangi bir sûre/cüz boyutu tahmin edilebiliyor.
 *  `enAz`/`enCok` da dönüyor ki tahminin ne kadar kaba olduğu görülebilsin. */
export async function boyutOrnekle(kariId, mushaf, n = 20) {
  const havuz = []
  for (const s of mushaf || []) {
    for (const a of s.ayetler || []) {
      const k = kelimeSayisi(a)
      if (k > 0) havuz.push({ sureNo: s.id, ayetNo: a.no, kelime: k })
    }
  }
  if (!havuz.length) return { hata: "Mushaf verisi boş." }

  const secilen = []
  const gorulen = new Set()
  let guvenlik = 0
  while (secilen.length < n && guvenlik++ < n * 20) {
    const i = Math.floor(Math.random() * havuz.length)
    if (gorulen.has(i)) continue
      gorulen.add(i)
      secilen.push(havuz[i])
  }

  let toplamBayt = 0, toplamKelime = 0, basarili = 0
  let enAz = Infinity, enCok = 0
  let cors = null, hata = null
  for (const a of secilen) {
    const url = mp3Url(kariId, a.sureNo, a.ayetNo)
    try {
      const y = await fetch(url, { method: "HEAD", mode: "cors", cache: "no-store" })
      cors = true
      const bayt = Number(y.headers.get("content-length") || 0)
      if (!y.ok || !bayt) continue
        toplamBayt += bayt
        toplamKelime += a.kelime
        basarili++
        const oran = bayt / a.kelime
        if (oran < enAz) enAz = oran
          if (oran > enCok) enCok = oran
    } catch (e) {
      cors = false
      hata = String((e && e.message) || e)
      break            // CORS yoksa denemeyi sürdürmenin anlamı yok
    }
  }
  if (!basarili) return { hata: hata || "Bu kâri için dosya bulunamadı.", cors }
  return {
    cors,
    orneklem: basarili,
    baytKelime: toplamBayt / toplamKelime,
    enAz: enAz === Infinity ? 0 : enAz,
    enCok,
  }
}

export const tahminiBoyut = (olcum, kelime) =>
(olcum && olcum.baytKelime ? olcum.baytKelime * kelime : 0)

/* Önbellekteki TÜM ses adresleri tek seferde okunuyor.
 *  NİÇİN: 30 cüz + 114 sûre için tek tek `cache.match` çağırmak 6236 arama eder
 *  ve panel açılışını kilitler. Bir kez `keys()` alıp bellekte Set'te aramak
 *  aynı işi tek çağrıyla yapıyor. */
export async function sesAnahtarlari() {
  try {
    const k = await caches.open(SES_ONBELLEK)
    return new Set((await k.keys()).map(r => r.url))
  } catch { return new Set() }
}

/* Bir adres kümesinin kaçı önbellekte? Ses önbelleği ayrı (`vukuf-ses`) —
 *  metin verisinden bağımsız temizlenebilsin ve kota hesabı karışmasın diye. */
export async function sesDurumu(adresler) {
  try {
    const k = await caches.open(SES_ONBELLEK)
    let hazir = 0
    for (const u of adresler) if (await k.match(u, { ignoreVary: true })) hazir++
      return hazir
  } catch { return 0 }
}

export async function sesOnbellegiSil() {
  try { return await caches.delete(SES_ONBELLEK) } catch { return false }
}
