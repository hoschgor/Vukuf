/* VUKUF — İZLEME MODU GALERİSİ (kullanıcının seçtiği arka plan resimleri)
   src/data/izlemeGaleri.js

   Kullanıcı (7 Ekim 2026): "galeriden birden fazla resim seçilip slayt gösterisi
   oluşturulabilsin."

   NİÇİN IndexedDB: eskiden tek resim dataURL olarak localStorage'daki ayarın
   içinde duruyordu. localStorage ~5 MB ve YALNIZ METİN; birkaç telefon fotoğrafı
   (her biri base64 ile ~1,3 kat şişer) onu doldurur, dolunca diğer ayarlar da
   yazılamaz. Resimler burada Blob olarak, ayarda yalnız kimlikleri duruyor.

   Resimler eklenirken KÜÇÜLTÜLÜYOR (uzun kenar en çok 2560 px, JPEG): telefon
   fotoğrafı 4000+ px olabiliyor; izleme modu onu saniyede onlarca kez çizdiği için
   büyük resim hem belleği hem pili yorardı, ekranda da fark görünmez. */

import { ayarOku, ayarYaz } from "./izlemeAyar"

const DB_AD = "vukuf-izleme"
const DEPO = "gorseller"
const AZAMI_KENAR = 2560

let dbSoz = null
function dbAc() {
  if (dbSoz) return dbSoz
  dbSoz = new Promise((cz, red) => {
    try {
      const r = indexedDB.open(DB_AD, 1)
      r.onupgradeneeded = () => {
        const db = r.result
        if (!db.objectStoreNames.contains(DEPO)) db.createObjectStore(DEPO)
      }
      r.onsuccess = () => cz(r.result)
      r.onerror = () => { dbSoz = null; red(r.error) }
    } catch (e) { dbSoz = null; red(e) }
  })
  return dbSoz
}
function islem(kip, is) {
  return dbAc().then(db => new Promise((cz, red) => {
    const tx = db.transaction(DEPO, kip)
    const depo = tx.objectStore(DEPO)
    const istek = is(depo)            // IDBRequest
    tx.oncomplete = () => cz(istek ? istek.result : undefined)
    tx.onerror = () => red(tx.error)
    tx.onabort = () => red(tx.error)
  }))
}

const yeniKimlik = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/* Dosyayı çöz → gerekiyorsa küçült → JPEG Blob. Çözülemezse null. */
async function kucult(dosya) {
  let kaynak = null, w = 0, h = 0, kapat = () => {}
  try {
    if (typeof createImageBitmap === "function") {
      const bm = await createImageBitmap(dosya)
      kaynak = bm; w = bm.width; h = bm.height; kapat = () => { try { bm.close() } catch { /* yoksay */ } }
    }
  } catch { kaynak = null }
  if (!kaynak) {
    const url = URL.createObjectURL(dosya)
    try {
      const im = await new Promise((cz, red) => { const i = new Image(); i.onload = () => cz(i); i.onerror = red; i.src = url })
      kaynak = im; w = im.naturalWidth; h = im.naturalHeight
    } catch { URL.revokeObjectURL(url); return null }
    kapat = () => URL.revokeObjectURL(url)
  }
  try {
    const k = Math.min(1, AZAMI_KENAR / Math.max(w, h))
    const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k))
    const cv = document.createElement("canvas")
    cv.width = cw; cv.height = ch
    cv.getContext("2d").drawImage(kaynak, 0, 0, cw, ch)
    return await new Promise(cz => cv.toBlob(b => cz(b), "image/jpeg", 0.88))
  } catch { return null } finally { kapat() }
}

/* ── VİDEO (13 Ekim 2026) ───────────────────────────────────────────────────
   Kullanıcı: "video eklenebilsin, sesini kullanmasın ama arka plana alınabilsin;
   video ve resim aynı anda kullanılabilsin, sırası düzenlenebilsin."
   Video KÜÇÜLTÜLMÜYOR (tarayıcıda yeniden kodlamak hem çok yavaş hem pil yer);
   olduğu gibi saklanıyor, bu yüzden boyut sınırı var. Oynatırken hep SESSİZ. */
export const AZAMI_VIDEO_MB = 150

/* GENİŞ BİÇİM DESTEĞİ (13 Ekim 2026, kullanıcı: "farklı video formatları da
   desteklenebilmeli, geniş bir skala sunmalı").
   1) Uzantıdan tanınan her video kabul ediliyor (türü boş ya da tuhaf gelse de).
   2) Saklamadan önce BU CİHAZDA OYNUYOR MU diye yoklanıyor (aynı Blob ile).
      Oynamıyorsa ya da 150 MB'ı aşıyorsa `atlanan`a { sebep: "format" | "buyuk",
      dosya } olarak dönüyor; düzenleyici bunları data/videoDonustur.js ile MP4'e
      çevirip küçülterek eklemeyi öneriyor (AVI, WMV, FLV, MPEG, MKV, HEVC…). */
export const VIDEO_UZANTILARI = ["mp4", "m4v", "mov", "qt", "webm", "mkv", "3gp", "3g2", "ogv", "avi", "wmv", "asf",
  "flv", "f4v", "mpg", "mpeg", "mpe", "m2v", "ts", "mts", "m2ts", "vob", "mxf", "dv", "divx", "xvid", "rm", "rmvb", "hevc", "264", "265"]
const VIDEO_UZANTI = new RegExp(`\\.(${VIDEO_UZANTILARI.join("|")})$`, "i")
const UZANTI_TURU = {
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", qt: "video/quicktime", webm: "video/webm",
  mkv: "video/x-matroska", "3gp": "video/3gpp", "3g2": "video/3gpp2", ogv: "video/ogg", avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv", asf: "video/x-ms-asf", flv: "video/x-flv", mpg: "video/mpeg", mpeg: "video/mpeg", ts: "video/mp2t",
  mts: "video/mp2t", m2ts: "video/mp2t",
}
export const videoMu = (b) => !!b && /^video\//.test(b.type || "")
export const videoDosyasiMi = (f) => !!f && (/^video\//.test(f.type || "") || VIDEO_UZANTI.test(f.name || ""))
const uzanti = (ad) => ((ad || "").match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase()

/* Bu tarayıcı bu videoyu GÖSTEREBİLİYOR mu? İlk karenin boyutu gelirse evet.
   Hata ya da görüntüsüz (yalnız ses / çözülemeyen kodek) → hayır. */
export function videoOynarMi(blob) {
  return new Promise((cz) => {
    let bitti = false, url = ""
    const v = document.createElement("video")
    const son = (ok) => {
      if (bitti) return
      bitti = true; clearTimeout(zaman); clearTimeout(bekle)
      try { v.removeAttribute("src"); v.load() } catch { /* yoksay */ }
      try { URL.revokeObjectURL(url) } catch { /* yoksay */ }
      cz(ok)
    }
    const zaman = setTimeout(() => son(false), 15000)
    let bekle = 0
    v.muted = true; v.playsInline = true; v.preload = "metadata"
    v.onloadedmetadata = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) son(true)
      else bekle = setTimeout(() => son(v.videoWidth > 0), 2500)   // boyut geç gelebiliyor
    }
    v.onloadeddata = () => { if (v.videoWidth > 0) son(true) }
    v.onerror = () => son(false)
    try { url = URL.createObjectURL(blob); v.src = url } catch { son(false) }
  })
}

/* Seçilen dosyaları ekler, eklenebilenlerin kimliklerini (seçim sırasıyla) döndürür.
   Eklenemeyenler dizinin `atlanan` alanında:
     [{ ad, sebep: "buyuk" | "format" | "okunamadi", dosya? }]
   "buyuk" ve "format" olanlarda `dosya` var → dönüştürülerek eklenebilir. */
export async function galeriyeEkle(dosyalar) {
  const kimlikler = []
  const atlanan = []
  for (const f of Array.from(dosyalar || [])) {
    if (!f) continue
    const tur = f.type || ""
    let b = null
    if (videoDosyasiMi(f)) {
      if (f.size > AZAMI_VIDEO_MB * 1024 * 1024) { atlanan.push({ ad: f.name, sebep: "buyuk", dosya: f }); continue }
      // Türü boş ya da genel gelen dosyaya uzantısından tür verilir — oynatıcı tanısın
      const dogruTur = /^video\//.test(tur) ? tur : (UZANTI_TURU[uzanti(f.name)] || "video/mp4")
      b = dogruTur === tur ? f : new Blob([f], { type: dogruTur })
      if (!(await videoOynarMi(b))) { atlanan.push({ ad: f.name, sebep: "format", dosya: f }); continue }
    } else if (/^image\//.test(tur || "image/")) {
      b = await kucult(f)
    }
    if (!b) { atlanan.push({ ad: f.name, sebep: "okunamadi" }); continue }
    const id = yeniKimlik()
    await islem("readwrite", d => d.put(b, id))
    kimlikler.push(id)
  }
  kimlikler.atlanan = atlanan
  return kimlikler
}

/* Videodan tek kare (fotoğraf modunda arka plan, küçük resim için). JPEG nesne
   adresi döner; okunamazsa null. Çağıran işi bitince URL.revokeObjectURL yapmalı. */
export function videoKaresi(url, an = 0.5) {
  return new Promise((cz) => {
    let bitti = false
    const v = document.createElement("video")
    const son = (sonuc) => { if (bitti) return; bitti = true; try { v.removeAttribute("src"); v.load() } catch { /* yoksay */ } cz(sonuc) }
    const zaman = setTimeout(() => son(null), 8000)
    v.muted = true; v.playsInline = true; v.preload = "auto"
    v.onloadedmetadata = () => {
      try { v.currentTime = Math.min(an, Math.max(0, (v.duration || 1) - 0.05)) } catch { son(null) }
    }
    v.onseeked = () => {
      try {
        const w = v.videoWidth, h = v.videoHeight
        if (!w || !h) { clearTimeout(zaman); son(null); return }
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h
        cv.getContext("2d").drawImage(v, 0, 0, w, h)
        cv.toBlob(b => { clearTimeout(zaman); son(b ? URL.createObjectURL(b) : null) }, "image/jpeg", 0.88)
      } catch { clearTimeout(zaman); son(null) }
    }
    v.onerror = () => { clearTimeout(zaman); son(null) }
    v.src = url
  })
}

export function galeridenSil(id) {
  return islem("readwrite", d => d.delete(id)).catch(() => {})
}

export function galeriBlobu(id) {
  return islem("readonly", d => d.get(id)).catch(() => null)
}

/* ESKİ TEK RESİM: ayarda dataURL olarak duruyorsa galeriye taşınır, ayardan
   silinir (localStorage boşalır) ve arka plan "galeri" olur. Bir kez çalışır. */
let tasiniyor = false
export async function eskiGorselVarsaTasi() {
  const iz = ayarOku().izleme
  if (tasiniyor || !iz.ozelGorsel) return
  tasiniyor = true
  try {
    const b = await (await fetch(iz.ozelGorsel)).blob()
    const id = yeniKimlik()
    await islem("readwrite", d => d.put(b, id))
    const simdi = ayarOku().izleme
    ayarYaz("izleme", {
      galeri: [...(simdi.galeri || []), id],
      arka: simdi.arka === "ozel" ? "galeri" : simdi.arka,
      ozelGorsel: null,
    })
  } catch { /* taşınamadı → eski yol çalışmaya devam eder */ }
  finally { tasiniyor = false }
}
