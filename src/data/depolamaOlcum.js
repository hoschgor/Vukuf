/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — DEPOLAMA ÖLÇÜMÜ (bölüm bölüm)
   src/data/depolamaOlcum.js

   11 Ekim 2026, kullanıcı: "Depolama kısmında güzel bir görünüm ile kısımların
   harcadığı belleği ve en son da toplam bellek ve ayrılan bellek gösterilsin;
   Geçmiş'in harcadığı yer de görünsün."

   NEREDE NE DURUYOR — dört ayrı depo:
     • Önbellekler (Cache Storage, servis işçisi):
         vukuf-veri         → kitap/Kur'ân metinleri (.json), yazı tipleri, görseller
         vukuf-ses          → kâri sesleri
         vukuf-kabuk-*, vukuf-varlik-* → uygulamanın kendi dosyaları
         vukuf-ses-motoru   → Vukuf sesi (sesli okuma): okuyucular + ses motoru
     • IndexedDB "vukuf-izleme" → izleme modu galerisindeki resimler
     • IndexedDB "vukuf-ses-motoru" → Vukuf sesi, önbellek kullanılamayan kökende
       (http yerel ağ) aynı dosyalar burada (data/vukufSes.js depo())

   SESLİ OKUMA (17 Ekim 2026, kullanıcı: "depolama bölümü burayı da kontrol edecek mi"):
   ayrı bölüm, okuyucu okuyucu açılır alt satırlar (Antalia, Kerîm, eski sesler, ses
   motoru). Eskiden "vukuf-ses-motoru" önbelleği "Uygulama dosyaları"na karışıyordu,
   IndexedDB'deki kopyası hiç sayılmıyordu.
     • localStorage → ayarlar, işaretler, notlar, hıfz, Geçmiş… (vukufVeri envanteri)
     • `navigator.storage.estimate()` → tarayıcının bildirdiği toplam + ayrılan yer

   ÖNBELLEK BOYUTU: her yanıtın gövdesi OKUNMUYOR (onlarca MB diskten okunurdu);
   `content-length` başlığı toplanıyor. Başlığı olmayan yanıtın gövdesi okunuyor
   (az sayıda). Sıkıştırılmış aktarımda başlık diskteki boyuttan küçük olabilir,
   bu yüzden önbellek rakamları "≈" ile gösterilir. Tarayıcının bildirdiği
   toplamdan artan kısım ayrı bir satırda ("Tarayıcı payı") görünür; böylece
   bölümlerin toplamı ile genel toplam her zaman tutar.

   localStorage çoğu tarayıcıda estimate() toplamına GİRMİYOR → ayrıca ekleniyor.
   ═══════════════════════════════════════════════════════════════════════════ */

import { envanter } from "./vukufVeri"

const GECMIS_ANAHTAR = "vukuf-gecmis"   // Geçmiş sayfası kayıtları (data/gecmis.js)
const SES_MOTORU = "vukuf-ses-motoru"    // data/vukufSes.js ONBELLEK_ADI (önbellek ve IndexedDB adı)

/* Vukuf sesi dosyası → alt satır (adresinden). Sıra = gösterim sırası. */
const SES_PARCALARI = [
  { id: "antalia", ad: "Antalia", aciklama: "Türkçe okuyucu", esle: /\/ses\/antalia\//i },
  { id: "kareem", ad: "Kerîm", aciklama: "Arapça okuyucu", esle: /kareem/i },
  { id: "eski", ad: "Eski sesler (Fahrettin, Fettah, DFKI, MMS)", aciklama: "Artık kullanılmıyor; sesli okuma açılınca silinir", esle: /fahrettin|fettah|dfki|\/ses\/mms\//i },
  { id: "motor", ad: "Ses motoru", aciklama: "Bütün okuyucuların ortak parçası", esle: /./ },
]
const sesParcasi = (adres) => SES_PARCALARI.find(p => p.esle.test(String(adres || ""))).id

const UZANTI = (adres) => {
  try { return (new URL(adres).pathname.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase() } catch { return "" }
}
function veriTuru(adres) {
  const u = UZANTI(adres)
  if (u === "json") return "metin"
  if (/^(ttf|otf|woff2?)$/.test(u)) return "font"
  if (/^(png|jpe?g|webp|svg|ico|gif|avif)$/.test(u)) return "gorsel"
  return "metin"
}

async function yanitBoyutu(onbellek, istek) {
  try {
    const y = await onbellek.match(istek, { ignoreVary: true })
    if (!y) return 0
    const b = Number(y.headers.get("content-length"))
    if (Number.isFinite(b) && b > 0) return b
    return (await y.blob()).size
  } catch { return 0 }
}

/* Önbellekleri bölümlere göre topla. onIlerleme(oran 0..1) isteğe bağlı. */
async function onbellekleriOlc(onIlerleme) {
  const sonuc = { metin: 0, font: 0, gorsel: 0, ses: 0, uygulama: 0, adet: { metin: 0, font: 0, gorsel: 0, ses: 0, uygulama: 0 } }
  if (typeof caches === "undefined") return sonuc
  let adlar = []
  try { adlar = (await caches.keys()).filter(a => a.startsWith("vukuf-")) } catch { return sonuc }
  const isler = []
  for (const ad of adlar) {
    const k = await caches.open(ad)
    for (const istek of await k.keys()) isler.push({ k, ad, istek })
  }
  let biten = 0
  // Aynı anda 8 okuma — telefonda diski boğmasın
  const kuyruk = isler.slice()
  const isci = async () => {
    while (kuyruk.length) {
      const { k, ad, istek } = kuyruk.shift()
      const b = await yanitBoyutu(k, istek)
      if (ad === SES_MOTORU) {                   // Vukuf sesi ayrı bölümde (sesliOkumaOlc)
        biten++
        continue
      }
      const tur = ad === "vukuf-veri" ? veriTuru(istek.url) : ad === "vukuf-ses" ? "ses" : "uygulama"
      sonuc[tur] += b
      sonuc.adet[tur]++
      biten++
      if (onIlerleme && biten % 40 === 0) onIlerleme(biten / isler.length)
    }
  }
  await Promise.all(Array.from({ length: 8 }, isci))
  onIlerleme?.(1)
  return sonuc
}

/* Vukuf sesi: önbellek + IndexedDB yedeği, parça parça. */
async function sesliOkumaOlc() {
  const parca = Object.fromEntries(SES_PARCALARI.map(p => [p.id, 0]))
  let adet = 0
  // 1) Önbellek
  try {
    if (typeof caches !== "undefined" && (await caches.keys()).includes(SES_MOTORU)) {
      const k = await caches.open(SES_MOTORU)
      for (const istek of await k.keys()) {
        parca[sesParcasi(istek.url)] += await yanitBoyutu(k, istek)
        adet++
      }
    }
  } catch { /* ölçülemedi */ }
  // 2) IndexedDB (yalnız varsa açılır)
  try {
    if (typeof indexedDB !== "undefined") {
      let var_ = true
      if (indexedDB.databases) var_ = (await indexedDB.databases()).some(d => d.name === SES_MOTORU)
      if (var_) {
        const db = await new Promise((cz, red) => {
          const r = indexedDB.open(SES_MOTORU)
          r.onsuccess = () => cz(r.result)
          r.onerror = () => red(r.error)
          r.onupgradeneeded = () => { /* yoksa boş oluşur */ }
        })
        if (db.objectStoreNames.contains("d")) {
          await new Promise((cz) => {
            const tx = db.transaction("d", "readonly")
            const imlec = tx.objectStore("d").openCursor()
            imlec.onsuccess = () => {
              const c = imlec.result
              if (!c) return
              const v = c.value
              parca[sesParcasi(c.key)] += v && typeof v.size === "number" ? v.size : (v?.byteLength || 0)
              adet++
              c.continue()
            }
            tx.oncomplete = () => cz()
            tx.onerror = () => cz()
            tx.onabort = () => cz()
          })
        }
        db.close()
      }
    }
  } catch { /* ölçülemedi */ }
  const satirlar = SES_PARCALARI.filter(p => parca[p.id] > 0)
    .map(p => ({ id: p.id, ad: p.ad, aciklama: p.aciklama, bayt: parca[p.id] }))
  return { bayt: satirlar.reduce((t, s) => t + s.bayt, 0), adet, satirlar }
}

/* İzleme galerisi (IndexedDB). Veritabanı yoksa AÇILMIYOR (açmak boşunu oluştururdu). */
async function galeriOlc() {
  const sonuc = { bayt: 0, adet: 0 }
  try {
    if (typeof indexedDB === "undefined") return sonuc
    if (indexedDB.databases) {
      const dbler = await indexedDB.databases()
      if (!dbler.some(d => d.name === "vukuf-izleme")) return sonuc
    }
    const db = await new Promise((cz, red) => {
      const r = indexedDB.open("vukuf-izleme")
      r.onsuccess = () => cz(r.result)
      r.onerror = () => red(r.error)
      r.onupgradeneeded = () => { /* yoksa oluşmuş olur; boş depo */ }
    })
    if (!db.objectStoreNames.contains("gorseller")) { db.close(); return sonuc }
    await new Promise((cz) => {
      const tx = db.transaction("gorseller", "readonly")
      const imlec = tx.objectStore("gorseller").openCursor()
      imlec.onsuccess = () => {
        const c = imlec.result
        if (!c) return
        const v = c.value
        sonuc.bayt += v && typeof v.size === "number" ? v.size : 0
        sonuc.adet++
        c.continue()
      }
      tx.oncomplete = () => cz()
      tx.onerror = () => cz()
      tx.onabort = () => cz()
    })
    db.close()
  } catch { /* ölçülemedi — 0 kalır */ }
  return sonuc
}

function anahtarBoyutu(a) {
  try { return ((localStorage.getItem(a) || "").length + a.length) * 2 } catch { return 0 }
}

/* Kişisel veriler: envanter kutuları; "Okuma geçmişi" kutusundan Geçmiş sayfası
   kayıtları AYRI satıra alınıyor (kullanıcı ne kadar yer tuttuğunu görmek istedi). */
function kisiselOlc() {
  const kutular = envanter().filter(k => k.adet > 0)
  const satirlar = []
  for (const k of kutular) {
    if (k.id === "gecmis" && k.anahtarlar.includes(GECMIS_ANAHTAR)) {
      const g = anahtarBoyutu(GECMIS_ANAHTAR)
      satirlar.push({ id: "gecmis-sayfasi", ad: "Geçmiş sayfası", aciklama: "Aramalar ve okuma oturumları", bayt: g })
      if (k.boyut - g > 0) satirlar.push({ id: "gecmis", ad: "Okuma konumları", aciklama: "Son konum, son sayfa, okuma süreleri", bayt: k.boyut - g })
    } else {
      satirlar.push({ id: k.id, ad: k.ad, aciklama: k.aciklama, bayt: k.boyut })
    }
  }
  satirlar.sort((a, b) => b.bayt - a.bayt)
  return { bayt: satirlar.reduce((t, s) => t + s.bayt, 0), satirlar }
}

async function tarayiciBildirimi() {
  try {
    if (!window.isSecureContext) return { hata: "guvensiz" }
    if (!navigator.storage || !navigator.storage.estimate) return { hata: "yok" }
    const e = await navigator.storage.estimate()
    return { kullanilan: e.usage || 0, kota: e.quota || 0 }
  } catch { return { hata: "yok" } }
}

/* Bölümler — SIRA ve RENK YUVASI SABİT (renk bölüme bağlı, büyüklüğe göre değişmez). */
export const BOLUMLER = [
  { id: "metin",    ad: "Kitap ve Kur'ân metinleri", aciklama: "İndirilen eserler, mushaf, lügat" },
  { id: "ses",      ad: "Kâri sesleri",              aciklama: "İnternetsiz dinlemek için indirilenler" },
  { id: "font",     ad: "Yazı tipleri",              aciklama: "Arapça ve metin yazı tipleri" },
  { id: "gorsel",   ad: "Görseller",                 aciklama: "Raf resimleri, kapaklar, simgeler" },
  { id: "galeri",   ad: "İzleme galerisi",           aciklama: "Arka plan için eklediğiniz resimler" },
  { id: "kisisel",  ad: "Kişisel veriler ve ayarlar", aciklama: "İşaretler, notlar, hıfz, Geçmiş, ayarlar" },
  { id: "sesli",    ad: "Sesli okuma sesleri",       aciklama: "Vukuf sesi okuyucuları ve ses motoru" },
  { id: "uygulama", ad: "Uygulama dosyaları",        aciklama: "İnternetsiz açılmak için saklanan sürüm", notr: true },
  { id: "diger",    ad: "Tarayıcı payı",             aciklama: "Tarayıcının kendi kayıt ve ek yükü", notr: true },
]

/**
 * Bütün ölçüm. Dönen:
 *   { bolumler: [{ id, ad, aciklama, bayt, adet?, yaklasik, alt? }], toplam, kota, kullanilanTarayici, hata }
 */
export async function depolamaOlc(onIlerleme) {
  const [on, galeri, tarayici, sesli] = await Promise.all([onbellekleriOlc(onIlerleme), galeriOlc(), tarayiciBildirimi(), sesliOkumaOlc()])
  const kisisel = kisiselOlc()
  const olcBayt = {
    metin: on.metin, ses: on.ses, font: on.font, gorsel: on.gorsel, uygulama: on.uygulama,
    galeri: galeri.bayt, kisisel: kisisel.bayt, sesli: sesli.bayt,
  }
  const depolar = on.metin + on.ses + on.font + on.gorsel + on.uygulama + galeri.bayt + sesli.bayt
  const kullanilanTarayici = tarayici.hata ? 0 : tarayici.kullanilan
  // Tarayıcının bildirdiğinden artan (Cache/IDB iç yükü, sıkıştırma farkı vb.)
  const diger = Math.max(0, kullanilanTarayici - depolar)
  olcBayt.diger = diger > 256 * 1024 ? diger : 0
  const bolumler = BOLUMLER.map((b, i) => ({
    ...b, yuva: i,
    bayt: olcBayt[b.id] || 0,
    adet: b.id === "galeri" ? galeri.adet : b.id === "sesli" ? sesli.adet : on.adet[b.id],
    yaklasik: ["metin", "ses", "font", "gorsel", "uygulama", "sesli"].includes(b.id),
    alt: b.id === "kisisel" ? kisisel.satirlar : b.id === "sesli" ? sesli.satirlar : null,
  }))
  const toplam = bolumler.reduce((t, b) => t + b.bayt, 0)
  return { bolumler, toplam, kota: tarayici.hata ? 0 : tarayici.kota, kullanilanTarayici, hata: tarayici.hata || null }
}

/* Türkçe boyut yazımı (GB dahil, ondalık virgül) */
export function boyutYaz(bayt) {
  const b = Math.max(0, bayt || 0)
  const f = (v, h) => v.toLocaleString("tr-TR", { maximumFractionDigits: h, minimumFractionDigits: h })
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${f(b / 1024, b < 10 * 1024 ? 1 : 0)} KB`
  if (b < 1024 ** 3) return `${f(b / 1024 ** 2, 1)} MB`
  return `${f(b / 1024 ** 3, 1)} GB`
}
