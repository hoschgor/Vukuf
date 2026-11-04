/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — NAMAZ VAKİTLERİ (Diyanet aylık vakitleri)
   src/data/namazVakitleri.js

   3 Kasım 2026 — kullanıcı: "Konum ile bulma ya da manuel il ilçe seçerek takvim alma
   seçeneği ile buraya takvim bilgisi de ekleyebiliriz. Sıradaki vakte kalan süre -
   günün namaz vakitleri - Kandil ve mübarek günler takvimi bu kısma alınabilir."

   KAYNAK: EzanVakti API (https://ezanvakti.emushaf.net — Diyanet'in yayımladığı aylık
   vakitleri sunan açık kaynak servis; github.com/furkantektas/EzanVaktiAPI).
   Uçlar: /sehirler/2 (Türkiye), /ilceler/{SehirID}, /vakitler/{IlceID} (≈30 gün).
   Sınır (üçüncü taraf bilgisi): 5 dakikada 30, günde 200 istek → her şey cihazda
   önbelleğe alınır; vakitler ilçe başına ayda ~bir kez indirilir.
   KONUMDAN BULMA: tarayıcı konumu → OpenStreetMap Nominatim ters kodlama (il/ilçe adı)
   → listedeki adla eşleşme. Konum yalnız bu ad sorgusu için kullanılır.
   Saatler Türkiye saatiyle gelir; GreenwichOrtalamaZamani ile UTC'ye çevrilir, böylece
   cihaz saat dilimi farklı olsa da doğru an hesaplanır.
   ═══════════════════════════════════════════════════════════════════════════ */

const API = "https://ezanvakti.emushaf.net"
const TURKIYE = 2
const SECIM_ANAHTAR = "vukuf-namaz-konum"
const GUN = 86400000

export const VAKITLER = [
  { k: "Imsak", ad: "İmsak" },
  { k: "Gunes", ad: "Güneş" },
  { k: "Ogle", ad: "Öğle" },
  { k: "Ikindi", ad: "İkindi" },
  { k: "Aksam", ad: "Akşam" },
  { k: "Yatsi", ad: "Yatsı" },
]

// ── önbellek ────────────────────────────────────────────────────────────────
function oku(anahtar) { try { return JSON.parse(localStorage.getItem(anahtar) || "null") } catch { return null } }
function yaz(anahtar, v) { try { localStorage.setItem(anahtar, JSON.stringify(v)) } catch { /* kota */ } }

async function getir(yol) {
  const r = await fetch(`${API}${yol}`, { headers: { Accept: "application/json" } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export async function sehirleriGetir() {
  const o = oku("vukuf-namaz-sehirler")
  if (o && Array.isArray(o.liste) && Date.now() - o.t < 60 * GUN) return o.liste
  const liste = await getir(`/sehirler/${TURKIYE}`)
  yaz("vukuf-namaz-sehirler", { t: Date.now(), liste })
  return liste
}
export async function ilceleriGetir(sehirId) {
  const a = `vukuf-namaz-ilceler-${sehirId}`
  const o = oku(a)
  if (o && Array.isArray(o.liste) && Date.now() - o.t < 60 * GUN) return o.liste
  const liste = await getir(`/ilceler/${sehirId}`)
  yaz(a, { t: Date.now(), liste })
  return liste
}

/** "03.11.2026" → { y, m, d } */
function tarihParcala(s) {
  const [d, m, y] = String(s || "").split(".").map(Number)
  return { y, m, d }
}
/** Günün kaydı + "HH:MM" → UTC zaman damgası */
export function vakitAni(gun, saat) {
  const { y, m, d } = tarihParcala(gun.MiladiTarihKisa)
  const [h, dk] = String(saat || "").split(":").map(Number)
  const gmt = typeof gun.GreenwichOrtalamaZamani === "number" ? gun.GreenwichOrtalamaZamani : 3
  return Date.UTC(y, m - 1, d, h, dk) - gmt * 3600000
}
/** Türkiye saatine göre bugünün "GG.AA.YYYY" biçimi (kayıtlarla eşleştirmek için) */
function bugunKisa(simdi = Date.now(), gmt = 3) {
  const t = new Date(simdi + gmt * 3600000)
  const p = (n) => String(n).padStart(2, "0")
  return `${p(t.getUTCDate())}.${p(t.getUTCMonth() + 1)}.${t.getUTCFullYear()}`
}

export async function vakitleriGetir(ilceId, { zorla = false } = {}) {
  const a = `vukuf-namaz-vakit-${ilceId}`
  const o = oku(a)
  if (!zorla && o && Array.isArray(o.liste) && o.liste.length) {
    // Listede bugünden sonra en az 5 gün varsa önbellek yeter
    const son = o.liste[o.liste.length - 1]
    if (vakitAni(son, "23:59") - Date.now() > 5 * GUN) return o.liste
  }
  try {
    const liste = await getir(`/vakitler/${ilceId}`)
    if (Array.isArray(liste) && liste.length) { yaz(a, { t: Date.now(), liste }); return liste }
    throw new Error("boş")
  } catch (e) {
    if (o && Array.isArray(o.liste) && o.liste.length) return o.liste   // çevrimdışı: eldeki
    throw e
  }
}

export function secimOku() { return oku(SECIM_ANAHTAR) }

/* Kayıtlı il/ilçe seçimini ve vakit önbelleğini sil (Ekstralar → Konum izni,
   4 Kasım 2026). Namaz kartı "vukuf-konum-silindi" olayıyla baştan başlar. */
export const KONUM_SILINDI = "vukuf-konum-silindi"
export function konumBilgisiniSil() {
  try {
    const sil = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k === SECIM_ANAHTAR || (k && k.startsWith("vukuf-namaz-vakit-"))) sil.push(k)
    }
    sil.forEach(k => localStorage.removeItem(k))
  } catch { /* yoksay */ }
  try { window.dispatchEvent(new Event(KONUM_SILINDI)) } catch { /* yoksay */ }
}
export function secimYaz(s) { if (s) yaz(SECIM_ANAHTAR, s); else { try { localStorage.removeItem(SECIM_ANAHTAR) } catch { /* yoksay */ } } }

/** Bugünün kaydı, sıradaki vakit ve kalan süre */
export function durumHesapla(liste, simdi = Date.now()) {
  if (!Array.isArray(liste) || !liste.length) return null
  const gmt = typeof liste[0].GreenwichOrtalamaZamani === "number" ? liste[0].GreenwichOrtalamaZamani : 3
  const bk = bugunKisa(simdi, gmt)
  const i = liste.findIndex(g => g.MiladiTarihKisa === bk)
  if (i < 0) return { bugun: null, sonraki: null }
  const bugun = liste[i]
  let sonraki = null, simdiki = null
  for (const v of VAKITLER) {
    const an = vakitAni(bugun, bugun[v.k])
    if (an > simdi) { sonraki = { ...v, an, saat: bugun[v.k], yarin: false }; break }
    simdiki = v.k
  }
  if (!sonraki && liste[i + 1]) {
    const y = liste[i + 1]
    sonraki = { ...VAKITLER[0], an: vakitAni(y, y.Imsak), saat: y.Imsak, yarin: true }
  }
  return { bugun, sonraki, simdiki, yarin: liste[i + 1] || null }
}

export function kalanMetni(ms) {
  if (ms <= 0) return "şimdi"
  const dk = Math.ceil(ms / 60000)
  const sa = Math.floor(dk / 60), kd = dk % 60
  if (!sa) return `${kd} dk`
  return kd ? `${sa} sa ${kd} dk` : `${sa} sa`
}

// ── KONUMDAN İL/İLÇE ────────────────────────────────────────────────────────
export function adNorm(s) {
  return String(s || "").toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I").replace(/Ş/g, "S").replace(/Ğ/g, "G").replace(/Ü/g, "U").replace(/Ö/g, "O").replace(/Ç/g, "C")
    .replace(/Â/g, "A").replace(/Î/g, "I").replace(/Û/g, "U")
    .replace(/\s+(ILI|ILCESI|MERKEZ)$/g, "")
    .replace(/[^A-Z]/g, "")
}
export async function konumdanBul() {
  const k = await new Promise((coz, red) => {
    if (!navigator.geolocation) { red(new Error("konum yok")); return }
    navigator.geolocation.getCurrentPosition(p => coz(p.coords), e => red(e), { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 })
  })
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=tr&lat=${k.latitude}&lon=${k.longitude}`)
  if (!r.ok) throw new Error("adres bulunamadı")
  const j = await r.json()
  const ad = j.address || {}
  const ilAdaylari = [ad.province, ad.state, ad.city].filter(Boolean)
  const ilceAdaylari = [ad.town, ad.county, ad.city_district, ad.district, ad.municipality, ad.suburb, ad.village, ad.city].filter(Boolean)
  const sehirler = await sehirleriGetir()
  const sehir = sehirler.find(s => ilAdaylari.some(a => adNorm(a) === adNorm(s.SehirAdi)))
  if (!sehir) throw new Error("il eşleşmedi")
  const ilceler = await ilceleriGetir(sehir.SehirID)
  const ilce = ilceler.find(i => ilceAdaylari.some(a => adNorm(a) === adNorm(i.IlceAdi)))
    || ilceler.find(i => adNorm(i.IlceAdi) === adNorm(sehir.SehirAdi))
    || ilceler[0]
  return { sehirId: sehir.SehirID, sehirAdi: sehir.SehirAdi, ilceId: ilce.IlceID, ilceAdi: ilce.IlceAdi, kaynak: "konum" }
}

// ── TAKVİM DOSYASI (.ics) ────────────────────────────────────────────────────
function icsZaman(ms) {
  const t = new Date(ms)
  const p = (n) => String(n).padStart(2, "0")
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00Z`
}
/** Elde olan günler (≈30) için her vakte bir etkinlik */
export function icsOlustur(liste, secim) {
  const yer = secim ? `${secim.ilceAdi}${secim.sehirAdi && secim.sehirAdi !== secim.ilceAdi ? ` / ${secim.sehirAdi}` : ""}` : ""
  const s = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Vukuf//Namaz Vakitleri//TR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:Namaz Vakitleri${yer ? ` - ${yer}` : ""}`, "X-WR-TIMEZONE:Europe/Istanbul",
  ]
  const damga = icsZaman(Date.now())
  const bugun = Date.now() - GUN
  for (const g of liste) {
    for (const v of VAKITLER) {
      const an = vakitAni(g, g[v.k])
      if (an < bugun) continue
      const { y, m, d } = tarihParcala(g.MiladiTarihKisa)
      s.push("BEGIN:VEVENT",
        `UID:vukuf-${secim?.ilceId || "x"}-${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}-${v.k}@vukuf`,
        `DTSTAMP:${damga}`, `DTSTART:${icsZaman(an)}`, `DTEND:${icsZaman(an + 10 * 60000)}`,
        `SUMMARY:${v.ad} (${g[v.k]})`,
        `DESCRIPTION:${v.ad} vakti${yer ? ` - ${yer}` : ""}. Kaynak: Diyanet aylık vakitleri.`,
        "TRANSP:TRANSPARENT", "END:VEVENT")
    }
  }
  s.push("END:VCALENDAR")
  return s.join("\r\n")
}
export function icsIndir(liste, secim) {
  const metin = icsOlustur(liste, secim)
  const blob = new Blob([metin], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `namaz-vakitleri-${adNorm(secim?.ilceAdi || "konum").toLowerCase()}.ics`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 1500)
}

// ── DİNÎ GÜNLER VE GECELER ───────────────────────────────────────────────────
/* Diyanet İşleri Başkanlığı dinî günler takvimi. 2026: e-sehir (Diyanet vakit hesaplama
   sayfasına dayanarak) ve islamveihsan listeleriyle karşılaştırıldı; 2027: Milli Gazete'nin
   aktardığı Diyanet 2026-2027 tablosu (hicrî ay başlarıyla tutarlılığı denetlendi).
   2027'nin kalanı (Kurban Bayramı, Hicrî yılbaşı, Aşure, Mevlid, Regaib) resmî takvim
   doğrulanınca eklenecek. `gece: true` → o günün AKŞAMI idrak edilir. */
export const DINI_GUNLER = [
  { t: "2026-01-15", ad: "Miraç Kandili", gece: true },
  { t: "2026-02-02", ad: "Berat Kandili", gece: true },
  { t: "2026-02-19", ad: "Ramazan Başlangıcı" },
  { t: "2026-03-16", ad: "Kadir Gecesi", gece: true },
  { t: "2026-03-19", ad: "Ramazan Bayramı Arefesi" },
  { t: "2026-03-20", ad: "Ramazan Bayramı (1. gün)" },
  { t: "2026-03-21", ad: "Ramazan Bayramı (2. gün)" },
  { t: "2026-03-22", ad: "Ramazan Bayramı (3. gün)" },
  { t: "2026-05-26", ad: "Kurban Bayramı Arefesi" },
  { t: "2026-05-27", ad: "Kurban Bayramı (1. gün)" },
  { t: "2026-05-28", ad: "Kurban Bayramı (2. gün)" },
  { t: "2026-05-29", ad: "Kurban Bayramı (3. gün)" },
  { t: "2026-05-30", ad: "Kurban Bayramı (4. gün)" },
  { t: "2026-06-16", ad: "Hicrî Yılbaşı" },
  { t: "2026-06-25", ad: "Aşure Günü" },
  { t: "2026-08-24", ad: "Mevlid Kandili", gece: true },
  { t: "2026-12-10", ad: "Üç Ayların Başlangıcı · Regaib Kandili", gece: true },
  { t: "2027-01-04", ad: "Miraç Kandili", gece: true },
  { t: "2027-01-22", ad: "Berat Kandili", gece: true },
  { t: "2027-02-08", ad: "Ramazan Başlangıcı" },
  { t: "2027-03-05", ad: "Kadir Gecesi", gece: true },
  { t: "2027-03-08", ad: "Ramazan Bayramı Arefesi" },
  { t: "2027-03-09", ad: "Ramazan Bayramı (1. gün)" },
  { t: "2027-03-10", ad: "Ramazan Bayramı (2. gün)" },
  { t: "2027-03-11", ad: "Ramazan Bayramı (3. gün)" },
]
/** Bugünden itibaren yaklaşan günler (bugün dahil) */
export function yaklasanGunler(adet = 8, simdi = new Date()) {
  const b = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate()).getTime()
  return DINI_GUNLER
    .map(g => { const [y, m, d] = g.t.split("-").map(Number); const ms = new Date(y, m - 1, d).getTime(); return { ...g, ms, kalanGun: Math.round((ms - b) / GUN) } })
    .filter(g => g.kalanGun >= 0)
    .slice(0, adet)
}
