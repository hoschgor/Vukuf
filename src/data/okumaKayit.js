// ─────────────────────────────────────────────────────────────
// Vukuf — okuma kaydı, özel raflar ve gizli raflar (localStorage)
// Kutuphane, Arama, KapsamSecici ve okuma ekranları paylaşır.
// Bu dosya src/data/ altına konur.
// ─────────────────────────────────────────────────────────────

// Aksan/şapka + büyük-küçük duyarsız arama normalizasyonu
// (â→a, î→i, û→u, ş→s, ç→c, ğ→g, ü→u, ö→o, ı/İ→i). Sadece ARAMA eşleştirmede kullan
// (uzunluk korumaz; highlight offset hesaplarında KULLANMA).
const _AKSAN = new RegExp("[\\u0300-\\u036f]", "g")
export const normHarf = (s) => (s || "")
  .toLocaleLowerCase("tr")
  .replace(/ı/g, "i").replace(/İ/g, "i")
  .normalize("NFD").replace(_AKSAN, "")

export const OKUMA_KEY = "vukuf-okuma-istatistik"
export const OZEL_KEY = "vukuf-ozel-raflar"
export const GIZLI_KEY = "vukuf-gizli-raflar"
export const KURAN_ID = "kuran"

// ── Okuma istatistiği: { [kitapId]: { sayac, son } }
export function okumaKaydet(id) {
  if (!id) return
  try {
    const s = JSON.parse(localStorage.getItem(OKUMA_KEY) || "{}")
    const now = Date.now()
    const onceki = s[id] || { sayac: 0, son: 0 }
    // Aynı kitabı 1 dk içinde tekrar açmak sayaç şişirmesin (yenileme koruması)
    const artir = now - (onceki.son || 0) > 60000
    s[id] = {
      sayac: Math.max(1, (onceki.sayac || 0) + (artir ? 1 : 0)),
      son: now,
    }
    localStorage.setItem(OKUMA_KEY, JSON.stringify(s))
  } catch {}
}

export function okumaKayitOku() {
  try { return JSON.parse(localStorage.getItem(OKUMA_KEY) || "{}") } catch { return {} }
}
export function okumaKayitSil() { try { localStorage.removeItem(OKUMA_KEY) } catch {} }

// ── Özel raflar: [ { id, baslik, altRaflar:[ { id, baslik, kitapIdler:[] } ] } ]
export function ozelRaflarOku() {
  try {
    const l = JSON.parse(localStorage.getItem(OZEL_KEY) || "[]")
    return Array.isArray(l) ? l : []
  } catch { return [] }
}
export function ozelRaflarYaz(liste) {
  try { localStorage.setItem(OZEL_KEY, JSON.stringify(liste)) } catch {}
}

// ── Gizli raflar: [ rafId ]  (yalnızca büyük raflar: Kısım / özel / otomatik)
export function gizliRaflarOku() {
  try {
    const l = JSON.parse(localStorage.getItem(GIZLI_KEY) || "[]")
    return Array.isArray(l) ? l : []
  } catch { return [] }
}
export function gizliRaflarYaz(liste) {
  try { localStorage.setItem(GIZLI_KEY, JSON.stringify(liste)) } catch {}
}

// ── Kitap havuzu: id → kitap objesi (Kur'an dahil edilebilir)
export function kitapHavuzu(kitaplar, kuranKitap) {
  const m = new Map()
  ;(kitaplar || []).forEach(k => { if (k && k.id) m.set(k.id, k) })
  if (kuranKitap && kuranKitap.id) m.set(kuranKitap.id, kuranKitap)
  return m
}

// ── Katalogdan Kur'an kitabı objesi (link /kuran'a gitsin diye kuran:true)
export function kuranKitabiGetir(kategoriler) {
  const kat = (kategoriler || []).find(k => k.kuran)
  if (!kat || !kat.kuran) return null
  return { ...kat.kuran, kuran: true }
}

// ── Son okunanlar (recency) / Sık okunanlar (frequency)
export function sonOkunanlar(stats, havuz, n = 8) {
  return Object.entries(stats || {})
    .filter(([id]) => havuz.has(id))
    .sort((a, b) => (b[1].son || 0) - (a[1].son || 0))
    .slice(0, n)
    .map(([id]) => havuz.get(id))
    .filter(Boolean)
}
export function sikOkunanlar(stats, havuz, n = 8) {
  return Object.entries(stats || {})
    .filter(([id]) => havuz.has(id))
    .sort((a, b) => (b[1].sayac || 0) - (a[1].sayac || 0) || (b[1].son || 0) - (a[1].son || 0))
    .slice(0, n)
    .map(([id]) => havuz.get(id))
    .filter(Boolean)
}

// ── Özel rafları "kategori" şekline çöz (Kutuphane + KapsamSecici için)
//    { id, baslik, ozel:true, alimler:[ { id, isim, kitaplar:[obj] } ] }
export function ozelKategoriler(store, havuz) {
  return (store || []).map(raf => ({
    id: raf.id,
    baslik: raf.baslik,
    ozel: true,
    alimler: (raf.altRaflar || []).map(alt => ({
      id: alt.id,
      isim: alt.baslik,
      kitaplar: (alt.kitapIdler || []).map(id => havuz.get(id)).filter(Boolean),
    })),
  }))
}

// ── Kısa id üreteci (Math.random yerine zaman + sayaç; çakışmasız)
let _sayac = 0
export function yeniId(onek = "id") {
  _sayac += 1
  return `${onek}-${Date.now().toString(36)}-${_sayac}`
}
