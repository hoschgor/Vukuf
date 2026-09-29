/* VUKUF — HIFZ MODU VERİ KATMANI
   src/data/hifz.js

   Ezber çalışmasının bütün kararları burada; bileşenler yalnız çiziyor.

   ── BİRİM ──────────────────────────────────────────────────────────────────
   Ezberin birimi TEK ÂYET ("2:255"). Sayfa/sûre birim yapılsaydı tekrar
   takvimi kaba kalırdı: bir sayfanın iki âyeti unutulmuşken gerisi sapasağlam
   olabiliyor. Âyet düzeyinde tutup sayfa/cüz özetini hesaplayarak çıkarıyoruz.

   ── KAYIT BİÇİMİ KISA ──────────────────────────────────────────────────────
   6236 âyet olabildiği için alan adları tek harf: d durum, t tekrar sayısı,
   a aralık indeksi, s sonraki tekrar günü, i ipucu sayısı, g son çalışma günü.
   Uzun adlarla aynı veri yaklaşık üç katı yer kaplıyordu.

   ── TEKRAR TAKVİMİ ─────────────────────────────────────────────────────────
   SM-2'nin sadeleştirilmişi: sabit aralık merdiveni + üç cevap.
   "Kolay" bir üst basamağa, "orta" aynı basamakta, "zor" başa döndürür.
   Gün, yerel saate göre gün numarası (gece yarısında döner) — saat tutulsaydı
   "bugünün tekrarı" listesi gün içinde kayardı. */

import { useCallback, useEffect, useState } from "react"

export const ANAHTAR = "vukuf-hifz"
/* /hifz ekranındaki "mushafta aç" hedefi buradan devrediliyor. Yönlendirme
   durumu (router state) sayfa yenilenince kaybolurdu; localStorage PWA'da
   geri dönüldüğünde de duruyor. Okuyan taraf okur okumaz siliyor. */
export const HEDEF_ANAHTAR = "vukuf-hifz-hedef"
/* Ters yön: okuma ekranından hıfz ekranına geçilirken "nereye döneceğiz"
   buraya yazılıyor; /hifz ekranı bunu görürse "Okumaya dön" düğmesini
   gösteriyor. Biçim: {"sure":2,"ayet":255,"kapsam":"sayfa"} */
export const DONUS_ANAHTAR = "vukuf-hifz-donus"

/* GİZLEME BİRİMİ — perdenin neyi sakladığı.
     kelime : âyetin baştan n kelimesi açık, gerisi perdeli (kademe belirler)
     ayet   : âyet ya tümüyle açık ya tümüyle perdeli; kademe devre dışı
   Zincir usulünde ikisi de işe yarıyor: kelime kademesi yeni ezberde,
   âyet birimi pekiştirmede. Bu yüzden ayar kullanıcıya bırakıldı. */
export const BIRIMLER = [
  { id: "kelime", ad: "Kelime" },
  { id: "ayet",   ad: "Âyet" },
]

// Tekrar aralıkları (gün). Son basamağa gelen âyet "oturmuş" sayılır.
export const ARALIKLAR = [1, 3, 7, 14, 30, 60]

export const DURUM = { YENI: 0, CALISILIYOR: 1, EZBERLENDI: 2 }

/* Perde kademeleri: her âyetin BAŞTAN kaç kelimesi açık kalacak.
   Baştan açık bırakmak bilinçli — hâfız âyetin başını hatırlayınca gerisi
   gelir; sondan açmak hatırlamaya yardım etmez, yalnız cevabı gösterir. */
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
   çalışma aynı güne düşsün, "yarın" da gerçekten yarın olsun. */
export function bugun() {
  const d = new Date()
  // Yerel saat farkı çıkarılıyor → gün numarası GECE YARISINDA dönüyor.
  // Ham epoch kullanılsaydı UTC'ye göre döner, bizde akşam saatlerinde
  // "yarının tekrarı" bugün görünürdü.
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000)
}

const BOS = {
  birimler: {},
  // dokunAc: perdeli yere dokununca orası açılsın mı (eskiden hep açılıyordu → varsayılan açık)
  // dokunSes: dokunulan kelime okunsun mu (29 Eylül 2026, yeni → varsayılan kapalı; kullanıcı seçer)
  ayarlar: {
    kademe: "yarim", tekrarSayisi: 3, zincir: true, birim: "kelime", dokunAc: true, dokunSes: false,
    // EZBER PLANI (30 Eylül 2026) — ayrıntısı aşağıdaki "EZBER PLANI" bölümünde
    ezber: "sayfa",        // "sayfa" | "sure" | "donus"
    sayfaKismi: "tam",     // "tam" | "ust" | "alt"   (sayfa ve dönüşte)
    yon: "yukari",         // "yukari" (yukarıdan aşağı) | "asagi" (aşağıdan yukarı)
    tekrarYontem: "duz",   // "duz" | "baglama"
    bagla: true,           // bağlamada komşu (önceden ezberlenmiş) âyetle başla
    donus: { bas: "son", sira: 0 },   // dönüşün başladığı uç + dizideki yer
    manuel: { sure: 1, bas: 1, son: 7 },   // elle yazılan sûre + âyet aralığı
    sureSira: "orijinal",  // sûre listesi: "orijinal" | "kisa" (kısadan uzuna) | "uzun" (uzundan kısaya)
  },
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
   Gizleme React ile DEĞİL, üretilen bir stil etiketiyle yapılıyor. Sebebi
   önemli: mushaf sayfaları kaydırdıkça monte olup sökülüyor; DOM'a elle sınıf
   yazsaydık, sonradan monte olan kelimeler perdesiz gelirdi. CSS kuralı ise
   yeni gelen düğümlere kendiliğinden uyuyor. Ayrıca yüzlerce kelimeye prop
   geçmediğimiz için sayfa yeniden çizilmiyor.

   ⚠ PERDE ARTIK SOLUKLUK DEĞİL BULANIKLIK. Solukluk (opacity .07) kopya
   çekmeye açıktı: metin duruyor, yalnız soluk; ekranı eğip ya da parlaklığı
   açıp okunabiliyordu. `filter: blur()` glifleri gerçekten dağıtıyor, geri
   getirilebilecek bir kenar bırakmıyor.
   Neden `color: transparent` + `text-shadow` değil: kelimenin Arapça metni
   MushafKelime içinde SATIR İÇİ (inline) `color` ile çiziliyor, stil sayfası
   onu ezemez. `filter` satır içi renkten bağımsız çalışıyor ve mutlak konumlu
   tecvid/vakıf işaretlerini de birlikte bulandırıyor.

   `gizliler`: Map(anahtar → baştan görünür kelime sayısı).
   `disSayfalar`: kapsam DIŞINDA kalan ama ekranın kenarından görünebilen
   sayfalar. Kelime kelime bulandırmak yerine sayfa kabuğuna TEK kural
   veriliyor; yoksa monte 40+ sayfanın ~5000 kelimesi ayrı ayrı katman açardı. */
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
   kelimeSayisi(anahtar) → o âyetin kelime sayısı (mushaf verisinden).
   zincir=true iken: SIRADAKİ âyet tam açık, ÖNCEKİLER seçili kademede,
   SONRAKİLER tamamen kapalı. Sonrakiler eskiden hiç perdelenmiyordu (haritaya
   bile girmiyorlardı): zincirin bir sonraki âyeti ekranda açıkça duruyordu,
   yani ezber sınavı kendi cevabını gösteriyordu.
   birim="ayet" iken kademe yok sayılıyor: âyet ya tam açık ya tam kapalı. */
export function gizlemeHaritasi({
  anahtarlar, kademe, zincir, aktifAnahtar, kelimeSayisi, birim = "kelime", yon = "yukari",
}) {
  const harita = new Map()
  const k = kademeBul(kademe)
  // AŞAĞIDAN YUKARI ezberde "henüz gelinmemiş" âyetler aktifin ÖNCESİ (üstü),
  // ezberlenmiş olanlar SONRASI (altı) — zincirin yönü ters.
  const ai = zincir ? anahtarlar.indexOf(aktifAnahtar) : -1
  anahtarlar.forEach((a, i) => {
    const n = Math.max(1, kelimeSayisi(a) || 1)
    // -1 → "tümüyle açık"; perdeCss bu âyet için hiç kural üretmiyor.
    if (zincir && i === ai) { harita.set(a, -1); return }
    if (zincir && ai >= 0 && (yon === "asagi" ? i < ai : i > ai)) { harita.set(a, 0); return }   // henüz gelinmedi
    const gorunur = birim === "ayet" ? 0 : k.gorunur(n)
    harita.set(a, gorunur >= n ? -1 : gorunur)
  })
  return harita
}

/* ═══════════════════════════════════════════════════════════════════════════
   EZBER PLANI (30 Eylül 2026) — kullanıcının tarif ettiği usuller

   1) EZBER TERCİHİ — neyin ezberlendiği:
      • Sayfa  : bulunulan sayfa; tamamı ya da ÜST / ALT yarısı.
      • Sûre   : bulunulan sûre (asıl amaç kısa sûreler; panelde kısa sûreler
                 listesi var — "kısa" = en çok 2 sayfaya yayılan, MUSHAF
                 VERİSİNDEN hesaplanıyor, elle yazılmış liste yok).
      • Dönüş  : Türk usulü hafızlık. Her DÖNÜŞ'te 30 cüzün her birinden
                 aynı sıradaki BİR sayfa: 1. dönüş = her cüzün son sayfası
                 (klasik usul, "cüz sonundan") ya da ilk sayfası ("cüz
                 başından"); 2. dönüş = sondan/baştan ikinci sayfa… Cüz
                 sınırları ve sayfa sayıları mushaf verisinden (her âyetin
                 kendi `cuz` ve `sayfa` alanı); 20'den uzun cüzlerde fazla
                 sayfalar son dönüşlere düşüyor, kısa cüz atlanıyor.
   2) SIRA — sayfa/sûre içinde yeni âyetlerin geliş sırası: yukarıdan aşağı
      ya da AŞAĞIDAN YUKARI. Aşağıdan yukarıda YALNIZ YENİ ÂYETİN SIRASI
      tersine döner; birlikte okunan bloklar HER ZAMAN mushaf sırasıyla
      okunur (Kur'ân tersten okunmaz).
   3) TEKRAR YÖNTEMİ:
      • Düz     : seçilen âyetler N kez.
      • Bağlama : yeni âyet N kez → öğrenilenlerin hepsi birlikte bir kez →
                  sonraki yeni âyet N kez → hepsi birlikte… (1; 1-2; 1-2-3…)
                  "Komşuyla bağla" açıksa blok, ÖNCEDEN EZBERLENMİŞ komşu
                  âyetle başlar: sayfada önceki sayfanın son âyeti (alt yarıda
                  üst yarının son âyeti); cüz sonundan dönüşte ise sonraki
                  sayfanın ilk âyeti (çünkü orası bir önceki dönüşte ezberlendi).
   ═══════════════════════════════════════════════════════════════════════════ */
export const EZBER_TERCIHLERI = [
  { id: "sayfa", ad: "Sayfa" },
  { id: "sure",  ad: "Sûre" },
  { id: "donus", ad: "Dönüş" },
  { id: "manuel", ad: "Manuel" },
]
export const SAYFA_KISIMLARI = [
  { id: "tam", ad: "Tamamı" },
  { id: "ust", ad: "Üst yarı" },
  { id: "alt", ad: "Alt yarı" },
]
export const YONLER = [
  { id: "yukari", ad: "Yukarıdan aşağı" },
  { id: "asagi",  ad: "Aşağıdan yukarı" },
]
export const TEKRAR_YONTEMLERI = [
  { id: "duz",     ad: "Düz" },
  { id: "baglama", ad: "Bağlama" },
]
export const SURE_SIRALARI = [
  { id: "orijinal", ad: "Mushaf sırası" },
  { id: "kisa",     ad: "Kısadan uzuna" },
  { id: "uzun",     ad: "Uzundan kısaya" },
]

/* Sûre listesi sıralama: uzunluk ÂYET sayısıyla (eşitse kelime sayısı),
   ezberlenmiş sûreler (✓) her zaman listenin SONUNA iniyor. */
export function sureListesiSirala(liste, sira = "orijinal") {
  const l = [...liste]
  if (sira === "kisa") l.sort((a, b) => (a.ayetSayisi - b.ayetSayisi) || ((a.kelime || 0) - (b.kelime || 0)) || (a.id - b.id))
  else if (sira === "uzun") l.sort((a, b) => (b.ayetSayisi - a.ayetSayisi) || ((b.kelime || 0) - (a.kelime || 0)) || (a.id - b.id))
  else l.sort((a, b) => a.id - b.id)
  return [...l.filter(x => !x.ezber), ...l.filter(x => x.ezber)]
}

/* MANUEL ARAMA — "bakara 5-10", "2:5-10", "yasin", "36 1-12", "fussilet, 44".
   Dönüş: [{ id, isim, ayetSayisi, bas, son }] (en çok `sinir` öneri).
   normla: harf normalleştirici (şapka/aksan/büyük-küçük duyarsız). */
export function manuelOneriler(sorgu, sureler, normla = (s) => s.toLowerCase(), sinir = 8) {
  const q = String(sorgu || "").trim()
  if (!q) return []
  // Aralık: sondaki "5", "5-10", "5–10", ":5-10", ", 5-10"
  const m = q.match(/^(.*?)[\s,:]*?(\d+)(?:\s*[-–]\s*(\d+))?\s*$/)
  let ad = q, a1 = null, a2 = null
  if (m && m[1].trim()) { ad = m[1].trim(); a1 = parseInt(m[2], 10); a2 = m[3] ? parseInt(m[3], 10) : null }
  else if (m && !m[1].trim() && !m[3]) { ad = m[2]; }          // yalnız sayı → sûre no
  else if (m && !m[1].trim() && m[3]) { ad = m[2]; a1 = parseInt(m[3], 10) }   // "2 5" gibi değil; "2-5" sûre 2 âyet 5
  const nq = normla(ad.replace(/[.:,]+$/, "").trim())
  const sayi = /^\d+$/.test(ad.trim()) ? parseInt(ad, 10) : null
  const eslesen = sureler.filter(s =>
    sayi != null ? s.id === sayi : (normla(s.isim).startsWith(nq) || normla(s.isim).includes(nq)))
  // Başla eşleşenler önce
  eslesen.sort((x, y) => (normla(y.isim).startsWith(nq) - normla(x.isim).startsWith(nq)) || (x.id - y.id))
  return eslesen.slice(0, sinir).map(s => {
    const n = s.ayetSayisi || 1
    let bas, son
    if (a1 != null) {
      bas = Math.max(1, Math.min(n, a1))
      son = Math.max(bas, Math.min(n, a2 != null ? a2 : a1))
    } else {
      // Aralık yazılmadıysa: kısa sûre tamamı, uzunsa ilk 7 âyet
      bas = 1; son = n <= 20 ? n : 7
    }
    return { ...s, bas, son }
  })
}

export const DONUS_BASLARI = [
  { id: "son", ad: "Cüz sonundan" },
  { id: "bas", ad: "Cüz başından" },
]

const sirala = (a, b) => (a.sureNo - b.sureNo) || (a.ayetNo - b.ayetNo)

/* Sayfanın üst/alt yarısı. Bölme KELİME sayısıyla (satır bilgisi yok): bir
   âyet, kelimelerinin çoğu hangi yarıdaysa oraya düşer. Boş kalırsa tamamı. */
export function sayfaKismiSec(birimler, kisim) {
  if (kisim !== "ust" && kisim !== "alt") return birimler
  const toplam = birimler.reduce((t, b) => t + (b.kelime || 1), 0)
  let birikim = 0
  const ust = [], alt = []
  for (const b of birimler) {
    const orta = birikim + (b.kelime || 1) / 2
    ;(orta <= toplam / 2 ? ust : alt).push(b)
    birikim += b.kelime || 1
  }
  const sec = kisim === "ust" ? ust : alt
  return sec.length ? sec : birimler
}

/* Cüz → { ilk, son } sayfa. Bir sayfanın cüzü, o sayfada BAŞLAYAN ilk âyetin
   cüzü sayılıyor. Kaynak mushaf verisi (sûreler → âyetler: { sayfa, cuz }). */
export function cuzSayfalari(mushafData) {
  const sayfaCuz = new Map()
  for (const sr of mushafData || []) {
    for (const a of sr.ayetler || []) {
      if (a.sayfa && a.cuz && !sayfaCuz.has(a.sayfa)) sayfaCuz.set(a.sayfa, a.cuz)
    }
  }
  const aralik = new Map()
  for (const [s, c] of sayfaCuz) {
    const v = aralik.get(c)
    if (!v) aralik.set(c, { ilk: s, son: s })
    else { if (s < v.ilk) v.ilk = s; if (s > v.son) v.son = s }
  }
  return aralik
}

/* Dönüş dizisi: [{ donus, cuz, sayfa }]. bas="son": her cüzün sondan
   (donus-1). sayfası; bas="bas": baştan (donus-1). sayfası. */
export function donusDizisi(aralik, bas = "son") {
  const cuzler = [...aralik.keys()].sort((x, y) => x - y)
  const enUzun = Math.max(0, ...cuzler.map(c => aralik.get(c).son - aralik.get(c).ilk + 1))
  const dizi = []
  for (let d = 1; d <= enUzun; d++) {
    for (const c of cuzler) {
      const { ilk, son } = aralik.get(c)
      const sayfa = bas === "bas" ? ilk + d - 1 : son - d + 1
      if (sayfa >= ilk && sayfa <= son) dizi.push({ donus: d, cuz: c, sayfa })
    }
  }
  return dizi
}

/* Bağlama adımları. ayetler: mushaf sırasında [{sureNo, ayetNo}].
   bag: önceden ezberlenmiş komşu âyet (ya da null).
   bas: öğrenme sırasında kaçıncı âyetten başlanacağı — öncekiler ÖĞRENİLMİŞ
        sayılır (yeni olarak çalınmaz ama birlikte okunan bloklara girer);
        zincirde kalınan yerden devam etmek için.
   Dönüş: [{ tip: "yeni" | "bagla", ayetler: [...], tekrar }] */
export function baglamaAdimlari({ ayetler, yon = "yukari", tekrar = 3, bag = null, bas = 0 }) {
  const sira = yon === "asagi" ? [...ayetler].reverse() : [...ayetler]
  const b0 = Math.max(0, Math.min(bas || 0, sira.length - 1))
  const bilinen = sira.slice(0, b0)
  const adimlar = []
  for (const x of sira.slice(b0)) {
    adimlar.push({ tip: "yeni", ayetler: [x], tekrar: Math.max(1, tekrar) })
    bilinen.push(x)
    const blok = (bag ? [bag, ...bilinen] : [...bilinen]).sort(sirala)
    if (blok.length > 1) adimlar.push({ tip: "bagla", ayetler: blok, tekrar: 1 })
  }
  return adimlar
}

/* Düz tekrar: âyetler (mushaf sırasıyla) N kez. */
export function duzAdimlar({ ayetler, tekrar = 3 }) {
  return ayetler.length ? [{ tip: "duz", ayetler: [...ayetler].sort(sirala), tekrar: Math.max(1, tekrar) }] : []
}

/* Adımları oynatıcı listesine çevir: [{sureNo, ayetNo}] */
export function adimlariListele(adimlar) {
  const liste = []
  for (const a of adimlar) {
    for (let i = 0; i < a.tekrar; i++) for (const y of a.ayetler) liste.push({ sureNo: y.sureNo, ayetNo: y.ayetNo })
  }
  return liste
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
