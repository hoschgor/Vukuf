/* VUKUF — HIFZ MODU VERİ KATMANI
 *  src/data/hifz.js
 *
 *  Ezber çalışmasının bütün kararları burada; bileşenler yalnız çiziyor.
 *
 *  ── BİRİM ──────────────────────────────────────────────────────────────────
 *  Ezberin birimi TEK ÂYET ("2:255"). Sayfa/sûre birim yapılsaydı tekrar
 *  takvimi kaba kalırdı: bir sayfanın iki âyeti unutulmuşken gerisi sapasağlam
 *  olabiliyor. Âyet düzeyinde tutup sayfa/cüz özetini hesaplayarak çıkarıyoruz.
 *
 *  ── KAYIT BİÇİMİ KISA ──────────────────────────────────────────────────────
 *  6236 âyet olabildiği için alan adları tek harf: d durum, t tekrar sayısı,
 *  a aralık indeksi, s sonraki tekrar günü, i ipucu sayısı, g son çalışma günü.
 *  Uzun adlarla aynı veri yaklaşık üç katı yer kaplıyordu.
 *
 *  ── TEKRAR TAKVİMİ ─────────────────────────────────────────────────────────
 *  SM-2'nin sadeleştirilmişi: sabit aralık merdiveni + üç cevap.
 *  "Kolay" bir üst basamağa, "orta" aynı basamakta, "zor" başa döndürür.
 *  Gün, yerel saate göre gün numarası (gece yarısında döner) — saat tutulsaydı
 *  "bugünün tekrarı" listesi gün içinde kayardı. */

import { useCallback, useEffect, useState } from "react"

export const ANAHTAR = "vukuf-hifz"
/* /hifz ekranındaki "mushafta aç" hedefi buradan devrediliyor. Yönlendirme
 *  durumu (router state) sayfa yenilenince kaybolurdu; localStorage PWA'da
 *  geri dönüldüğünde de duruyor. Okuyan taraf okur okumaz siliyor. */
export const HEDEF_ANAHTAR = "vukuf-hifz-hedef"
/* Ters yön: okuma ekranından hıfz ekranına geçilirken "nereye döneceğiz"
 *  buraya yazılıyor; /hifz ekranı bunu görürse "Okumaya dön" düğmesini
 *  gösteriyor. Biçim: {"sure":2,"ayet":255,"kapsam":"sayfa"} */
export const DONUS_ANAHTAR = "vukuf-hifz-donus"

/* GİZLEME BİRİMİ — perdenin neyi sakladığı.
 *    kelime : âyetin baştan n kelimesi açık, gerisi perdeli (kademe belirler)
 *    ayet   : âyet ya tümüyle açık ya tümüyle perdeli; kademe devre dışı
 *  Zincir usulünde ikisi de işe yarıyor: kelime kademesi yeni ezberde,
 *  âyet birimi pekiştirmede. Bu yüzden ayar kullanıcıya bırakıldı. */
export const BIRIMLER = [
  { id: "kelime", ad: "Kelime" },
{ id: "ayet",   ad: "Âyet" },
]

// Tekrar aralıkları (gün). Son basamağa gelen âyet "oturmuş" sayılır.
export const ARALIKLAR = [1, 3, 7, 14, 30, 60]

export const DURUM = { YENI: 0, CALISILIYOR: 1, EZBERLENDI: 2 }

/* Perde kademeleri: her âyetin BAŞTAN kaç kelimesi açık kalacak.
 *  Baştan açık bırakmak bilinçli — hâfız âyetin başını hatırlayınca gerisi
 *  gelir; sondan açmak hatırlamaya yardım etmez, yalnız cevabı gösterir. */
export const KADEMELER = [
  { id: "tam",    ad: "Tam metin",    gorunur: (n) => n },
  { id: "ucte",   ad: "Üçte ikisi",   gorunur: (n) => Math.max(1, Math.ceil(n * 0.66)) },
  { id: "yarim",  ad: "Yarısı",       gorunur: (n) => Math.max(1, Math.ceil(n * 0.4)) },
  { id: "bas",    ad: "İlk kelime",   gorunur: () => 1 },
  { id: "kapali", ad: "Kapalı",       gorunur: () => 0 },
]
export const kademeBul = (id) => KADEMELER.find(k => k.id === id) || KADEMELER[0]
export const sonrakiKademe = (id) => {
  const i = KADEMELER.findIndex(k => k.id === id)
  return KADEMELER[Math.min(KADEMELER.length - 1, (i < 0 ? 0 : i) + 1)].id
}
export const oncekiKademe = (id) => {
  const i = KADEMELER.findIndex(k => k.id === id)
  return KADEMELER[Math.max(0, (i < 0 ? 0 : i) - 1)].id
}

export const birimAnahtar = (sureNo, ayetNo) => `${sureNo}:${ayetNo}`
export const anahtarCoz = (a) => {
  const [s, y] = String(a).split(":")
  return { sureNo: Number(s), ayetNo: Number(y) }
}

/* Yerel gün numarası. Saat/dakika atılıyor: aynı takvim gününde yapılan iki
 *  çalışma aynı güne düşsün, "yarın" da gerçekten yarın olsun. */
export function bugun() {
  const d = new Date()
  // Yerel saat farkı çıkarılıyor → gün numarası GECE YARISINDA dönüyor.
  // Ham epoch kullanılsaydı UTC'ye göre döner, bizde akşam saatlerinde
  // "yarının tekrarı" bugün görünürdü.
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000)
}

const BOS = {
  birimler: {},
  ayarlar: { kademe: "yarim", tekrarSayisi: 3, zincir: true, birim: "kelime" },
}

let bellek = null
const aboneler = new Set()

export function hifzOku() {
  if (bellek) return bellek
    try {
      const ham = JSON.parse(localStorage.getItem(ANAHTAR) || "{}")
      bellek = {
        birimler: (ham && ham.birimler) || {},
        ayarlar: { ...BOS.ayarlar, ...(ham && ham.ayarlar) },
      }
    } catch { bellek = { birimler: {}, ayarlar: { ...BOS.ayarlar } } }
    return bellek
}

function yaz(yeni) {
  bellek = yeni
  try { localStorage.setItem(ANAHTAR, JSON.stringify(yeni)) } catch { /* kota */ }
  for (const f of aboneler) f(yeni)
    return yeni
}

export function ayarGuncelle(parca) {
  const v = hifzOku()
  return yaz({ ...v, ayarlar: { ...v.ayarlar, ...parca } })
}

const birimAl = (v, a) => v.birimler[a] || { d: DURUM.YENI, t: 0, a: -1, s: 0, i: 0, g: 0 }

/* Çalışıldı işareti — ezberlendi DEĞİL. Yalnız "bugün baktım" bilgisi. */
export function calisildi(anahtarlar) {
  const v = hifzOku()
  const g = bugun()
  const birimler = { ...v.birimler }
  for (const a of anahtarlar) {
    const b = birimAl(v, a)
    birimler[a] = { ...b, g, d: b.d === DURUM.YENI ? DURUM.CALISILIYOR : b.d }
  }
  return yaz({ ...v, birimler })
}

export function ipucuAlindi(anahtar) {
  const v = hifzOku()
  const b = birimAl(v, anahtar)
  return yaz({ ...v, birimler: { ...v.birimler, [anahtar]: { ...b, i: (b.i || 0) + 1 } } })
}

/* Ezberlendi: takvime ilk basamaktan girer (yarın tekrar). */
export function ezberlendi(anahtarlar) {
  const v = hifzOku()
  const g = bugun()
  const birimler = { ...v.birimler }
  for (const a of anahtarlar) {
    const b = birimAl(v, a)
    birimler[a] = { ...b, d: DURUM.EZBERLENDI, g, a: 0, s: g + ARALIKLAR[0], t: (b.t || 0) + 1 }
  }
  return yaz({ ...v, birimler })
}

export function geriAl(anahtarlar) {
  const v = hifzOku()
  const birimler = { ...v.birimler }
  for (const a of anahtarlar) delete birimler[a]
    return yaz({ ...v, birimler })
}

/* Tekrar cevabı. zorluk: "kolay" | "orta" | "zor" */
export function cevapla(anahtar, zorluk) {
  const v = hifzOku()
  const b = birimAl(v, anahtar)
  const g = bugun()
  let a = typeof b.a === "number" ? b.a : 0
  if (zorluk === "kolay") a = Math.min(ARALIKLAR.length - 1, a + 1)
    else if (zorluk === "zor") a = 0
      // "orta" → basamak aynı kalır
      const yeni = { ...b, d: DURUM.EZBERLENDI, a, g, t: (b.t || 0) + 1, s: g + ARALIKLAR[Math.max(0, a)] }
      return yaz({ ...v, birimler: { ...v.birimler, [anahtar]: yeni } })
}

/* Bugün (ve geçmişte) tekrarı gelenler — en geciken önce. */
export function bekleyenTekrarlar(veri = hifzOku(), gun = bugun()) {
  return Object.entries(veri.birimler)
  .filter(([, b]) => b.d === DURUM.EZBERLENDI && (b.s || 0) <= gun)
  .map(([a, b]) => ({ anahtar: a, ...anahtarCoz(a), gecikme: gun - (b.s || 0), ...b }))
  .sort((x, y) => y.gecikme - x.gecikme || x.sureNo - y.sureNo || x.ayetNo - y.ayetNo)
}

/* En çok ipucu alınan âyetler — "zor âyetler" listesi. */
export function zorAyetler(veri = hifzOku(), adet = 20) {
  return Object.entries(veri.birimler)
  .filter(([, b]) => (b.i || 0) > 0)
  .map(([a, b]) => ({ anahtar: a, ...anahtarCoz(a), ipucu: b.i || 0 }))
  .sort((x, y) => y.ipucu - x.ipucu)
  .slice(0, adet)
}

export function ozet(veri = hifzOku()) {
  let ezber = 0, calisilan = 0
  for (const b of Object.values(veri.birimler)) {
    if (b.d === DURUM.EZBERLENDI) ezber++
      else if (b.d === DURUM.CALISILIYOR) calisilan++
  }
  return { ezber, calisilan, bekleyen: bekleyenTekrarlar(veri).length }
}

/* ── PERDE CSS ───────────────────────────────────────────────────────────────
 *  Gizleme React ile DEĞİL, üretilen bir stil etiketiyle yapılıyor. Sebebi
 *  önemli: mushaf sayfaları kaydırdıkça monte olup sökülüyor; DOM'a elle sınıf
 *  yazsaydık, sonradan monte olan kelimeler perdesiz gelirdi. CSS kuralı ise
 *  yeni gelen düğümlere kendiliğinden uyuyor. Ayrıca yüzlerce kelimeye prop
 *  geçmediğimiz için sayfa yeniden çizilmiyor.
 *
 *  ⚠ PERDE ARTIK SOLUKLUK DEĞİL BULANIKLIK. Solukluk (opacity .07) kopya
 *  çekmeye açıktı: metin duruyor, yalnız soluk; ekranı eğip ya da parlaklığı
 *  açıp okunabiliyordu. `filter: blur()` glifleri gerçekten dağıtıyor, geri
 *  getirilebilecek bir kenar bırakmıyor.
 *  Neden `color: transparent` + `text-shadow` değil: kelimenin Arapça metni
 *  MushafKelime içinde SATIR İÇİ (inline) `color` ile çiziliyor, stil sayfası
 *  onu ezemez. `filter` satır içi renkten bağımsız çalışıyor ve mutlak konumlu
 *  tecvid/vakıf işaretlerini de birlikte bulandırıyor.
 *
 *  `gizliler`: Map(anahtar → baştan görünür kelime sayısı).
 *  `disSayfalar`: kapsam DIŞINDA kalan ama ekranın kenarından görünebilen
 *  sayfalar. Kelime kelime bulandırmak yerine sayfa kabuğuna TEK kural
 *  veriliyor; yoksa monte 40+ sayfanın ~5000 kelimesi ayrı ayrı katman açardı. */
export const PERDE_SINIF = "vukuf-hifz"
export const ACIK_SINIF = "hifz-gosterildi"

export function perdeCss(gizliler, { disSayfalar = [] } = {}) {
  const bulanik = "var(--hifz-bulanik,6px)"
  const s = [
    `.${PERDE_SINIF} [data-hifz]{transition:filter .2s ease}`,
    // İpucu (kelimeye dokunma) her şeyi ezer.
    `.${PERDE_SINIF} .${ACIK_SINIF}{filter:none !important}`,
  ]
  for (const [anahtar, gorunur] of gizliler) {
    // -1 = âyet tümüyle açık. Hiç kural yazılmıyor: yoksa önce bulanıklık
    // veriliyor, sonra kelime kelime geri alınıyordu — tarayıcıya boşuna yük.
    if (gorunur < 0) continue
      s.push(`.${PERDE_SINIF} [data-hifz="${anahtar}"]{filter:blur(${bulanik})}`)
      if (gorunur > 0) {
        const sec = []
        for (let i = 1; i <= gorunur; i++) {
          sec.push(`.${PERDE_SINIF} [data-hifz="${anahtar}"][data-hs="${i}"]`)
        }
        s.push(`${sec.join(",")}{filter:none}`)
      }
  }
  if (disSayfalar.length) {
    const sec = disSayfalar.map(n => `.${PERDE_SINIF} [data-index="${n}"]`).join(",")
    // Kapsam dışı sayfa: daha kuvvetli bulanıklık + hafif soluklaştırma, ve
    // dokunulamaz (yanlışlıkla oradan ipucu açılmasın).
    s.push(`${sec}{filter:blur(calc(${bulanik} * 1.6));opacity:.45;pointer-events:none}`)
  }
  return s.join("\n")
}

/* Bir âyet aralığı için gizleme haritası.
 *  kelimeSayisi(anahtar) → o âyetin kelime sayısı (mushaf verisinden).
 *  zincir=true iken: SIRADAKİ âyet tam açık, ÖNCEKİLER seçili kademede,
 *  SONRAKİLER tamamen kapalı. Sonrakiler eskiden hiç perdelenmiyordu (haritaya
 *  bile girmiyorlardı): zincirin bir sonraki âyeti ekranda açıkça duruyordu,
 *  yani ezber sınavı kendi cevabını gösteriyordu.
 *  birim="ayet" iken kademe yok sayılıyor: âyet ya tam açık ya tam kapalı. */
export function gizlemeHaritasi({
  anahtarlar, kademe, zincir, aktifAnahtar, kelimeSayisi, birim = "kelime",
}) {
  const harita = new Map()
  const k = kademeBul(kademe)
  let aktifGecildi = false
  for (const a of anahtarlar) {
    const n = Math.max(1, kelimeSayisi(a) || 1)
    // -1 → "tümüyle açık"; perdeCss bu âyet için hiç kural üretmiyor.
    if (zincir && a === aktifAnahtar) { harita.set(a, -1); aktifGecildi = true; continue }
    if (zincir && aktifGecildi) { harita.set(a, 0); continue }        // henüz gelinmedi
    const gorunur = birim === "ayet" ? 0 : k.gorunur(n)
    harita.set(a, gorunur >= n ? -1 : gorunur)
  }
  return harita
}

export function useHifz() {
  const [veri, setVeri] = useState(hifzOku)
  useEffect(() => {
    aboneler.add(setVeri)
    return () => { aboneler.delete(setVeri) }
  }, [])
  const ayarla = useCallback((p) => ayarGuncelle(p), [])
  return [veri, ayarla]
}
