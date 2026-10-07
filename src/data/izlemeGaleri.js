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

/* Seçilen dosyaları ekler, eklenebilenlerin kimliklerini (seçim sırasıyla) döndürür. */
export async function galeriyeEkle(dosyalar) {
  const kimlikler = []
  for (const f of Array.from(dosyalar || [])) {
    if (!f || !/^image\//.test(f.type || "image/")) continue
    const b = await kucult(f)
    if (!b) continue
    const id = yeniKimlik()
    await islem("readwrite", d => d.put(b, id))
    kimlikler.push(id)
  }
  return kimlikler
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
