/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — SIRALAMA YARDIMCILARI (sûre menüsü ve içindekiler)
   src/data/sureSirasi.js

   15 Ekim 2026, kullanıcı: "Sûre menüsünü ve içindekileri alfabetik sıralayabilmek
   için bir düğme; sûre menüsü için nüzul sırası da alternatif olsun. Seçim
   hatırlansın, sıfırlanabilsin (onay gerekmeden); kullanıcıyı yormadan."

   NÜZUL SIRASI — KAYNAK: Tanzil "Revelation Order" tablosu
   (https://tanzil.net/docs/revelation_ordeR). Bu, 1924 Mısır (Kral Fuâd) mushafının
   esas aldığı ve bugün en yaygın kullanılan tertiptir; İbn Abbâs rivayetlerine
   dayanır (Zencânî, Târîhu'l-Kur'ân). Rivayetler arasında birkaç sûrede farklılık
   vardır (ör. Nöldeke 110 ve 62'yi başka yere koyar) — arayüzde "yaygın tertip"
   olarak anılıyor. Doğrulama: dizi 1..114'ün tam permütasyonu; Fâtiha = 5
   (islamic.app API örneğiyle aynı).

   NUZUL[sureNo - 1] = o sûrenin nüzul sırası (1 = Alak).
   ═══════════════════════════════════════════════════════════════════════════ */

export const NUZUL = [
  5, 87, 89, 92, 112, 55, 39, 88, 113, 51, 52, 53, 96, 72, 54, 70, 50, 69, 44, 45,
  73, 103, 74, 102, 42, 47, 48, 49, 85, 84, 57, 75, 90, 58, 43, 41, 56, 38, 59, 60,
  61, 62, 63, 64, 65, 66, 95, 111, 106, 34, 67, 76, 23, 37, 97, 46, 94, 105, 101, 91,
  109, 110, 104, 108, 99, 107, 77, 2, 78, 79, 71, 40, 3, 4, 31, 98, 33, 80, 81, 24,
  7, 82, 86, 83, 27, 36, 8, 68, 10, 35, 26, 9, 11, 12, 28, 1, 25, 100, 93, 14,
  30, 16, 13, 32, 19, 29, 17, 15, 18, 114, 6, 22, 20, 21,
]

export const nuzulSirasi = (sureNo) => NUZUL[(Number(sureNo) || 0) - 1] || 999

/* Türkçe alfabetik karşılaştırma: şapka/aksan, büyük-küçük ve kesme işaretleri
   yok sayılır ("Âl-i İmrân" A'da, "En'âm" E'de). Baştaki "el-/en-/er-…" takısı
   OLDUĞU GİBİ sayılır — sûre menüsünde Türkçe adlar zaten takısız yazılıyor. */
const harmanci = (() => {
  try { return new Intl.Collator("tr", { sensitivity: "base", ignorePunctuation: true, numeric: true }) }
  catch { return null }
})()
export function trKarsilastir(a, b) {
  const x = String(a || ""), y = String(b || "")
  return harmanci ? harmanci.compare(x, y) : x.localeCompare(y, "tr")
}

/* ── SÛRE MENÜSÜ ──────────────────────────────────────────────────────────── */
export const SURE_SIRALARI = [
  { id: "mushaf", ad: "Mushaf", ipucu: "Mushaf sırası — Fâtiha'dan Nâs'a" },
  { id: "nuzul",  ad: "Nüzul",  ipucu: "Nüzul sırası — sûrelerin iniş sırası (yaygın tertip)" },
  { id: "alfabe", ad: "A–Z",    ipucu: "Alfabetik — Türkçe adlarına göre" },
]
export const SURE_SIRA_ANAHTAR = "vukuf-sure-menu-sira"

/** sureler: [{ id (sûre no), ... }], adAl(s) → Türkçe ad. Yeni dizi döner. */
export function sureleriSirala(sureler, sira, adAl) {
  const liste = [...(sureler || [])]
  if (sira === "nuzul") return liste.sort((a, b) => nuzulSirasi(a.id) - nuzulSirasi(b.id))
  if (sira === "alfabe") return liste.sort((a, b) => trKarsilastir(adAl(a), adAl(b)) || a.id - b.id)
  return liste.sort((a, b) => a.id - b.id)
}

/* ── İÇİNDEKİLER ──────────────────────────────────────────────────────────── */
export const ICINDEKILER_SIRALARI = [
  { id: "kitap",  ad: "Kitap sırası", ipucu: "Kitap sırası — kitaptaki dizilişiyle" },
  { id: "alfabe", ad: "A–Z",          ipucu: "Alfabetik — bölümler korunarak her seviye kendi içinde" },
  { id: "dizin",  ad: "Dizin",        ipucu: "Dizin — bütün başlıklar tek listede, alfabetik" },
]
export const ICINDEKILER_SIRA_ANAHTAR = "vukuf-icindekiler-sira"

/** Ağacı her seviyede alfabetik sıralar (düğümler { baslik, cocuklar? }). Yeni ağaç döner. */
export function agaciSirala(dugumler, baslikAl = (d) => d.baslik) {
  return [...(dugumler || [])]
    .map(d => (d && Array.isArray(d.cocuklar) && d.cocuklar.length ? { ...d, cocuklar: agaciSirala(d.cocuklar, baslikAl) } : d))
    .sort((a, b) => trKarsilastir(baslikAl(a), baslikAl(b)))
}

/** Ağacı düzleştirip DİZİN yapar: [{ dugum, yol: "Üst › Ara" }]. sirala=false → kitap sırası. */
export function agaciDizinle(dugumler, baslikAl = (d) => d.baslik, sirala = true) {
  const cikti = []
  const gez = (liste, yol) => {
    for (const d of liste || []) {
      if (!d) continue
      cikti.push({ dugum: d, yol: yol.join(" › ") })
      if (Array.isArray(d.cocuklar) && d.cocuklar.length) gez(d.cocuklar, [...yol, baslikAl(d)])
    }
  }
  gez(dugumler, [])
  return sirala ? cikti.sort((a, b) => trKarsilastir(baslikAl(a.dugum), baslikAl(b.dugum))) : cikti
}

/* Seçim okuma/yazma — bozuk ya da tanımsız değer varsayılana döner */
export function siraOku(anahtar, gecerliler, varsayilan) {
  try {
    const v = localStorage.getItem(anahtar)
    return gecerliler.some(g => g.id === v) ? v : varsayilan
  } catch { return varsayilan }
}
export function siraYaz(anahtar, deger, varsayilan) {
  try {
    if (deger === varsayilan) localStorage.removeItem(anahtar)    // varsayılan = kayıt yok (sıfırlanmış)
    else localStorage.setItem(anahtar, deger)
  } catch { /* yoksay */ }
}
