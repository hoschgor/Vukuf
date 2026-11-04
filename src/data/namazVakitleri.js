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

/* ── RAMAZAN (4 Kasım 2026) ─────────────────────────────────────────────────
   Kullanıcı: "Ramazan modunu ekleyelim ama kullanıcıya belirtmeye gerek yok, Ramazan
   ayı girdiğinde otomatik çalışsın." Ölçüt Diyanet'in kendi hicrî tarihi
   (HicriTarihUzun içinde "Ramazan"): bugün Ramazan'sa gündüz iftara (Akşam),
   iftardan sonra ve imsaktan önce sahura (İmsak) kalan süre. Ramazan'ın son
   iftarından sonra (ertesi gün Ramazan değilse) sahur gösterilmez. */
export const ramazanMi = (gun) => !!gun && /ramazan/i.test(String(gun.HicriTarihUzun || ""))
export function ramazanHedefi(d, simdi = Date.now()) {
  if (!d || !d.bugun) return null
  const b = d.bugun
  const imsak = vakitAni(b, b.Imsak), aksam = vakitAni(b, b.Aksam)
  if (ramazanMi(b)) {
    if (simdi < imsak) return { tur: "sahur", an: imsak, saat: b.Imsak, ad: "İmsak" }
    if (simdi < aksam) return { tur: "iftar", an: aksam, saat: b.Aksam, ad: "Akşam" }
  }
  // İftardan sonra: yarın da Ramazan'sa sahura (yarının imsakı)
  if (simdi >= aksam && d.yarin && ramazanMi(d.yarin)) {
    return { tur: "sahur", an: vakitAni(d.yarin, d.yarin.Imsak), saat: d.yarin.Imsak, ad: "İmsak" }
  }
  return null
}

/* ── KERAHAT VAKİTLERİ (4 Kasım 2026) ───────────────────────────────────────
   Kullanıcı: "Kerahat vakti içerisindeysek cami üzerinde sağ ya da sol bölümde bilgi
   verebiliriz." Süreler, Diyanet'in fetva/ilmihal metinlerinde Merğînânî'ye (el-Hidâye,
   I, 265-271) dayanarak verilen aralıklardan; ihtiyatlı uçları alındı:
     • Güneşin doğmasından itibaren 40-50 dk  → Güneş … Güneş + 50 dk
     • İstivâ: öğle vaktinin girmesine yaklaşık 10 dk kalmasından öğle vaktine kadar
                                              → Öğle − 10 dk … Öğle
     • Güneşin batmasına 40-50 dk kalmasından akşam vakti girinceye kadar
                                              → Akşam − 50 dk … Akşam
   Değiştirmek gerekirse yalnız bu tablo. */
export const KERAHAT = [
  { k: "sabah", ad: "Güneşin doğuşu", kisa: "Şurûk", vakit: "Gunes", once: 0, sonra: 50 },
  { k: "istiva", ad: "İstivâ (zevâl)", kisa: "İstivâ", vakit: "Ogle", once: 10, sonra: 0 },
  { k: "gurub", ad: "Güneşin batışı", kisa: "Gurûb", vakit: "Aksam", once: 50, sonra: 0 },
]
const saatYaz = (ms, gmt = 3) => {
  const t = new Date(ms + gmt * 3600000)
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`
}
/* ── GÖK: GÜNEŞ / AY (4 Kasım 2026) ─────────────────────────────────────────
   Kullanıcı: "üst kısma güneşin doğuş batışına göre ay ve güneş resmi çizebilir miyiz".
   Güneş doğuşu (Gunes) ile Akşam arasında güneş, gökte soldan (doğu) sağa (batı)
   bir yay boyunca ilerler; gece (Akşam → ertesi Güneş) aynı yayda ay ilerler.
   `oran` 0..1 yaydaki yer. Ayın evresi astronomik ortalamadan: bilinen bir yeni ay
   (6 Ocak 2000 18:14 UT) + sinodik ay 29,530588853 gün → 0 yeni ay, 0,5 dolunay.
   Yalnız çizim içindir (hilal gözlemi / takvim hesabı değildir). */
const SINODIK = 29.530588853 * 86400000
const YENI_AY = Date.UTC(2000, 0, 6, 18, 14)
export const ayEvresi = (simdi = Date.now()) => (((simdi - YENI_AY) % SINODIK) + SINODIK) % SINODIK / SINODIK
export function gokDurumu(d, simdi = Date.now()) {
  if (!d || !d.bugun) return null
  const b = d.bugun
  const dogus = vakitAni(b, b.Gunes), aksam = vakitAni(b, b.Aksam)
  const sinir = (x) => Math.min(1, Math.max(0, x))
  if (simdi >= dogus && simdi < aksam) return { tur: "gunes", oran: sinir((simdi - dogus) / (aksam - dogus)) }
  // Gece: akşamdan ertesi güneş doğuşuna (sabah ise dünkü akşamdan bugünkü doğuşa)
  let bas, bit
  if (simdi >= aksam) { bas = aksam; bit = d.yarin ? vakitAni(d.yarin, d.yarin.Gunes) : dogus + 86400000 }
  else { bas = aksam - 86400000; bit = dogus }
  return { tur: "ay", oran: sinir((simdi - bas) / (bit - bas)), evre: ayEvresi(simdi) }
}

/* Günün üç kerahat aralığı (caminin solundaki liste için); `aktif` = şu an içinde */
export function kerahatAraliklari(gun, simdi = Date.now()) {
  if (!gun) return []
  const gmt = typeof gun.GreenwichOrtalamaZamani === "number" ? gun.GreenwichOrtalamaZamani : 3
  return KERAHAT.map(k => {
    const an = vakitAni(gun, gun[k.vakit])
    const bas = an - k.once * 60000, bit = an + k.sonra * 60000
    return { ...k, bas, bit, basSaat: saatYaz(bas, gmt), bitSaat: saatYaz(bit, gmt), aktif: simdi >= bas && simdi < bit, gecti: simdi >= bit }
  })
}
export function kerahatDurumu(gun, simdi = Date.now()) {
  if (!gun) return null
  const gmt = typeof gun.GreenwichOrtalamaZamani === "number" ? gun.GreenwichOrtalamaZamani : 3
  for (const k of KERAHAT) {
    const an = vakitAni(gun, gun[k.vakit])
    const bas = an - k.once * 60000, bit = an + k.sonra * 60000
    if (simdi >= bas && simdi < bit) return { ...k, bas, bit, basSaat: saatYaz(bas, gmt), bitSaat: saatYaz(bit, gmt) }
  }
  return null
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
/* HATIRLATMA (4 Kasım 2026): `hatirlatma` dk verilirse her vakte VALARM eklenir —
   uyarıyı telefonun takvimi verir (uygulama kapalıyken de). 0 = vaktinde, null = yok. */
export const HATIRLATMA_SECENEKLERI = [null, 0, 5, 10, 15, 30]
export const HATIRLATMA_ANAHTAR = "vukuf-namaz-hatirlatma"
export function hatirlatmaOku() {
  try { const v = localStorage.getItem(HATIRLATMA_ANAHTAR); return v == null || v === "" || v === "yok" ? null : Number(v) } catch { return null }
}
export function hatirlatmaYaz(dk) { try { localStorage.setItem(HATIRLATMA_ANAHTAR, dk == null ? "yok" : String(dk)) } catch { /* yoksay */ } }

export function icsOlustur(liste, secim, hatirlatma = null) {
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
        "TRANSP:TRANSPARENT")
      if (hatirlatma != null && hatirlatma >= 0) {
        s.push("BEGIN:VALARM", "ACTION:DISPLAY",
          `DESCRIPTION:${hatirlatma ? `${v.ad} vaktine ${hatirlatma} dk` : `${v.ad} vakti girdi`}`,
          `TRIGGER:${hatirlatma ? `-PT${hatirlatma}M` : "PT0M"}`, "END:VALARM")
      }
      s.push("END:VEVENT")
    }
  }
  s.push("END:VCALENDAR")
  return s.join("\r\n")
}
export function icsIndir(liste, secim, hatirlatma = null) {
  const metin = icsOlustur(liste, secim, hatirlatma)
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
