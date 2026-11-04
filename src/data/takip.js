/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — NAMAZ & HATİM TAKİBİ (veri)
   src/data/takip.js

   4 Kasım 2026 — kullanıcı: "En alta Namaz & Hatim kontrolü ya da takibi kısmı açıp,
   kaza namazları, günlük namazlar için ve hatim takibi ya da planı için bir bölüm
   yapabiliriz. Hatim için grup ile seçeneği oluşturup, cüz dağıtma vs işlemi
   yapılabilir, tabii zamanlama seçeneği de sunulur. Başlangıç - bitiş zamanı vs."
   Grup hatmi için seçilen yol: BAĞLANTIYLA, SUNUCUSUZ.
     • Grubu kuran kişi grubu kendi cihazında tutar (vukuf-hatim-gruplar).
     • Her katılımcıya kendi cüzlerinin bağlantısı gider: ?hg=<veri>  (davet)
       Açan kişinin cihazında davet olarak saklanır (vukuf-hatim-davetler).
     • Katılımcı okuduğunu işaretleyip "okudum" bağlantısı gönderir: ?hd=<veri>
       Grubu kuran açınca o cüzler kendiliğinden okundu olarak işaretlenir.
   Bağlantı verisi: JSON → UTF-8 → base64url (kısa anahtarlar). Ortak bir sunucuya
   geçilirse aynı alanlar kullanılabilir.

   Bütün kayıtlar cihazda (localStorage). Yedek/geri yükleme anahtar listesi
   data/vukufVeri.js'te.
   ═══════════════════════════════════════════════════════════════════════════ */

// ── ORTAK ────────────────────────────────────────────────────────────────────
export const GUNLUK_ANAHTAR = "vukuf-namaz-gunluk"
export const KAZA_ANAHTAR = "vukuf-kaza"
export const HATIM_ANAHTAR = "vukuf-hatim"
export const GRUP_ANAHTAR = "vukuf-hatim-gruplar"
export const DAVET_ANAHTAR = "vukuf-hatim-davetler"
export const GELEN_ANAHTAR = "vukuf-hatim-gelen"          // bağlantıyla gelen, henüz işlenmemiş
export const SEKME_ANAHTAR = "vukuf-takip-sekme"

export function oku(anahtar, yedek) {
  try { const v = JSON.parse(localStorage.getItem(anahtar) || "null"); return v == null ? yedek : v } catch { return yedek }
}
export function yaz(anahtar, deger) {
  try { localStorage.setItem(anahtar, JSON.stringify(deger)) } catch { /* kota / gizli mod */ }
}

const GUN = 86400000
const iki = (n) => String(n).padStart(2, "0")
export const gunAnahtari = (t = new Date()) => `${t.getFullYear()}-${iki(t.getMonth() + 1)}-${iki(t.getDate())}`
export const anahtardanTarih = (a) => { const [y, m, d] = String(a).split("-").map(Number); return new Date(y, m - 1, d) }
export const gunFarki = (a, b) => Math.round((anahtardanTarih(b) - anahtardanTarih(a)) / GUN)
export const gunEkle = (a, n) => { const t = anahtardanTarih(a); t.setDate(t.getDate() + n); return gunAnahtari(t) }
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
export const tarihYazi = (a, yil = true) => { const t = anahtardanTarih(a); return `${t.getDate()} ${AYLAR[t.getMonth()]}${yil ? ` ${t.getFullYear()}` : ""}` }

// ── GÜNLÜK NAMAZ / KAZA ──────────────────────────────────────────────────────
export const NAMAZLAR = [
  { k: "sabah", ad: "Sabah" }, { k: "ogle", ad: "Öğle" }, { k: "ikindi", ad: "İkindi" },
  { k: "aksam", ad: "Akşam" }, { k: "yatsi", ad: "Yatsı" }, { k: "vitir", ad: "Vitir", vacip: true },
]
export const FARZLAR = NAMAZLAR.filter(n => !n.vacip)
export const BOS_KAZA = { kalan: { sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0, vitir: 0 }, kilinan: 0 }

// ── HATİM ────────────────────────────────────────────────────────────────────
export const CUZ = 30
export const SAYFA = 604                     // Diyanet mushafı (cüz ≈ 20 sayfa)
export function cuzEtiketi(i, hatimSayisi = 1) {
  const c = (i % CUZ) + 1, h = Math.floor(i / CUZ) + 1
  return hatimSayisi > 1 ? `${h}. hatim ${c}. cüz` : `${c}. cüz`
}
export const cuzNo = (i) => (i % CUZ) + 1

/* Plan durumu: kalan gün, günlük hedef, plana göre ileride/geride */
export function planDurumu({ bas, bitis, okunanSayisi, toplam = CUZ }, bugun = gunAnahtari()) {
  const sure = Math.max(1, gunFarki(bas, bitis) + 1)
  const gecen = Math.min(sure, Math.max(0, gunFarki(bas, bugun) + 1))       // bugün dahil
  const kalanGun = Math.max(0, gunFarki(bugun, bitis) + 1)
  const kalanCuz = Math.max(0, toplam - okunanSayisi)
  const gunluk = kalanGun ? kalanCuz / kalanGun : kalanCuz
  // Dünün sonuna kadar okunmuş olması gereken (bugün henüz bitmedi → ilk gün "geride" denmez)
  const hedef = Math.min(toplam, Math.floor((toplam * Math.max(0, gecen - 1)) / sure))
  return { sure, gecen, kalanGun, kalanCuz, gunluk, gunlukSayfa: gunluk * (SAYFA / CUZ), hedef, fark: okunanSayisi - hedef, basladi: gunFarki(bas, bugun) >= 0, basaKalan: gunFarki(bugun, bas) }
}

/* Dağıtım: "sirayla" → kişi başına bitişik cüz blokları; "donusumlu" → sırayla birer */
export function dagit(toplam, kisiSayisi, yontem = "sirayla") {
  const d = new Array(toplam).fill(0)
  if (kisiSayisi < 1) return d
  if (yontem === "donusumlu") { for (let i = 0; i < toplam; i++) d[i] = i % kisiSayisi; return d }
  const taban = Math.floor(toplam / kisiSayisi), artan = toplam % kisiSayisi
  let i = 0
  for (let k = 0; k < kisiSayisi; k++) {
    const adet = taban + (k < artan ? 1 : 0)
    for (let j = 0; j < adet; j++) d[i++] = k
  }
  return d
}
export const yeniKimlik = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

// ── BAĞLANTI ─────────────────────────────────────────────────────────────────
const b64 = (metin) => btoa(unescape(encodeURIComponent(metin))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
const b64coz = (s) => decodeURIComponent(escape(atob(String(s).replace(/-/g, "+").replace(/_/g, "/"))))
export const veriPaketle = (o) => b64(JSON.stringify(o))
export function veriCoz(s) { try { return JSON.parse(b64coz(s)) } catch { return null } }
const kok = () => `${window.location.origin}/`

/* Davet: { i: grup kimliği, g: grup adı, b: başlangıç, s: bitiş, n: hatim sayısı, k: kişi adı, c: [cüz sıraları] } */
export function davetBaglantisi(grup, kisiIdx) {
  const c = []
  grup.dagitim.forEach((k, i) => { if (k === kisiIdx) c.push(i) })
  return { baglanti: `${kok()}?hg=${veriPaketle({ i: grup.id, g: grup.ad, b: grup.bas, s: grup.bitis, n: grup.hatimSayisi, k: grup.kisiler[kisiIdx], c })}`, cuzler: c }
}
/* Bildirim: { i: grup kimliği, k: kişi adı, c: [okunan cüz sıraları] } */
export function bildirimBaglantisi(davet, okunanlar) {
  return `${kok()}?hd=${veriPaketle({ i: davet.i, k: davet.k, c: okunanlar })}`
}
export const cuzListesiYazi = (dizi, n = 1) => dizi.map(i => (n > 1 ? cuzEtiketi(i, n) : String(cuzNo(i)))).join(", ")
/* "9–16. cüzler", "1, 5, 9. cüzler", "5. cüz" — tek hatimde ardışıklar aralık olur */
export function cuzlerYazi(dizi, n = 1, belirtme = false) {   // belirtme: "cüzü / cüzleri"
  if (!dizi.length) return ""
  if (n > 1) return dizi.map(i => cuzEtiketi(i, n)).join(", ")
  const s = [...dizi].sort((a, b) => a - b)
  const parca = []
  for (let i = 0; i < s.length; i++) {
    let j = i
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++
    parca.push(j - i >= 2 ? `${cuzNo(s[i])}–${cuzNo(s[j])}` : j > i ? `${cuzNo(s[i])}, ${cuzNo(s[j])}` : `${cuzNo(s[i])}`)
    i = j
  }
  return `${parca.join(", ")}. ${s.length > 1 ? (belirtme ? "cüzleri" : "cüzler") : (belirtme ? "cüzü" : "cüz")}`
}

export function davetMesaji(grup, kisiIdx) {
  const { baglanti, cuzler } = davetBaglantisi(grup, kisiIdx)
  return [
    `“${grup.ad}” grup hatmi`,
    `${grup.kisiler[kisiIdx]}, size düşen: ${cuzlerYazi(cuzler, grup.hatimSayisi)}`,
    `Hatim: ${tarihYazi(grup.bas, false)} – ${tarihYazi(grup.bitis)}`,
    "",
    `Cüzlerinizi görmek ve okuduğunuzda işaretlemek için:`,
    baglanti,
  ].join("\n")
}
export function bildirimMesaji(davet, okunanlar) {
  const n = davet.n || 1
  return [
    `“${davet.g}” grup hatmi: ${davet.k}, ${cuzlerYazi(okunanlar, n, true)} okudu.`,
    "",
    "Grubu kuran kişi bu bağlantıyı açınca liste kendiliğinden güncellenir:",
    bildirimBaglantisi(davet, okunanlar),
  ].join("\n")
}

/* Metni paylaş: sistem paylaşımı varsa o, yoksa WhatsApp; ikisi de olmazsa panoya */
export async function metinPaylas(metin) {
  try {
    if (navigator.share) { await navigator.share({ text: metin }); return "paylasildi" }
  } catch (e) { if (e && e.name === "AbortError") return "vazgecildi" }
  try {
    const w = window.open(`https://wa.me/?text=${encodeURIComponent(metin)}`, "_blank", "noopener,noreferrer")
    if (w) return "whatsapp"
  } catch { /* yoksay */ }
  try { await navigator.clipboard.writeText(metin); return "kopyalandi" } catch { return "olmadi" }
}

/* Bağlantıyla gelen davet / bildirimi işle → { mesajlar: [...] } */
export function gelenleriIsle() {
  const gelen = oku(GELEN_ANAHTAR, [])
  if (!Array.isArray(gelen) || !gelen.length) return []
  try { localStorage.removeItem(GELEN_ANAHTAR) } catch { /* yoksay */ }
  const mesajlar = []
  for (const g of gelen) {
    if (g.tip === "hatim-davet" && g.veri && g.veri.i && Array.isArray(g.veri.c)) {
      const davetler = oku(DAVET_ANAHTAR, [])
      const v = g.veri
      const i = davetler.findIndex(d => d.i === v.i && d.k === v.k)
      const yeni = { ...v, okunan: i >= 0 ? (davetler[i].okunan || {}) : {}, alindi: gunAnahtari() }
      if (i >= 0) davetler[i] = yeni; else davetler.unshift(yeni)
      yaz(DAVET_ANAHTAR, davetler)
      mesajlar.push(`“${v.g}” grup hatmindeki cüzleriniz eklendi.`)
    } else if (g.tip === "hatim-bildirim" && g.veri && g.veri.i && Array.isArray(g.veri.c)) {
      const gruplar = oku(GRUP_ANAHTAR, [])
      const grup = gruplar.find(x => x.id === g.veri.i)
      if (!grup) { mesajlar.push("Bildirim geldi ama bu grup bu cihazda bulunamadı; grubu kuran cihazda açılması gerekiyor."); continue }
      grup.okunan = grup.okunan || {}
      g.veri.c.forEach(i => { if (i >= 0 && i < grup.dagitim.length) grup.okunan[i] = true })
      yaz(GRUP_ANAHTAR, gruplar)
      mesajlar.push(`“${grup.ad}”: ${g.veri.k} — ${cuzlerYazi(g.veri.c, grup.hatimSayisi)} okundu olarak işaretlendi.`)
    }
  }
  return mesajlar
}
