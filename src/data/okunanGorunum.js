// OKUNAN ÂYET GÖRÜNÜMÜ (11 Kasım 2026) — kâri okurken (ve gidilen âyette) âyetin nasıl
// işaretleneceği. Oynatıcının ayar kutusundaki "Okunan âyet görünümü" sayfası yazar,
// MushafSayfa / MushafKelime okur.
// AYRI AYRI SEÇİLİR (11 Kasım 2026, kullanıcı: "bant ayrı seçilir, arka plan karartma gibi
// olan kısım ayrı seçilir; arka planı boş bırakabiliriz, hafif karartılı seçebiliriz, alttaki
// bant kısmını da dal ya da bant olarak seçeriz"):
//   arka:    "yok" | "hafif" | "belirgin"   — âyet boyunca zemin tonu
//   altBant: "yok" | "bant" | "dal"         — kelimelerin altında düz şerit ya da ince dal
//   rozetDal: âyet sonu rozetinin üstünde/altında yapraklı dallar (isteğe bağlı, başta açık)
//   harf:    okunan âyetin harfleri vurgu renginde
//   hareket: rozet dalları hafifçe salınsın (yalnız transform)
//   harfRenk: harflerin rengi (12 Kasım 2026, kullanıcı: "Harfleri renklendir kısmında
//            kullanıcı farklı renk seçebilsin") — "tema" (vurgu rengi), "lugat", "rozet"
//            (temanın kendi renkleri, tema değişince onlar da değişir) ya da sabit "#rrggbb"
// (Çini fotoğrafından yapılan çiçek süsü kullanıcı isteğiyle kaldırıldı — o fotoğraf âyet
//  rozetinin [parantez] yeni tasarımı için verilmişti.)
import { useSyncExternalStore } from "react"

export const OKUNAN_ANAHTAR = "vukuf-okunan-gorunum"
// VARSAYILAN (12 Kasım 2026, kullanıcı: "varsayılan olarak arka plan yok, alt bant dal, harfleri
// renklendir açık ve tema rengi seçili, rozet dalı ve animasyon açık başlasın; kullanıcı isterse
// değiştirebilsin"). Ayarı daha önce değiştirilmiş cihazlarda kayıtlı seçim korunur.
export const OKUNAN_VARSAYILAN = { arka: "yok", altBant: "dal", rozetDal: true, harf: true, hareket: true, harfRenk: "tema" }
// Hazır harf renkleri: ilk üçü temadan gelir; ötekiler sabit, iki tonda da okunur koyulukta
export const OKUNAN_HARF_RENKLERI = [
  { id: "tema",    ad: "Tema rengi" },
  { id: "lugat",   ad: "Lügat rengi" },
  { id: "rozet",   ad: "Rozet rengi" },
  { id: "#c0392b", ad: "Kırmızı" },
  { id: "#d35400", ad: "Turuncu" },
  { id: "#b8860b", ad: "Altın" },
  { id: "#2e8b57", ad: "Yeşil" },
  { id: "#1f8a9e", ad: "Turkuaz" },
  { id: "#2f6fb5", ad: "Mavi" },
  { id: "#8e44ad", ad: "Mor" },
]
const harfRenkGecerli = (v) => typeof v === "string" && (["tema", "lugat", "rozet"].includes(v) || /^#[0-9a-f]{6}$/i.test(v))
// Seçimi temaya göre gerçek renge çevir
export function okunanHarfRengi(secim, theme) {
  if (!theme) return null
  if (secim === "lugat") return theme.lugatHighlight || theme.accent
  if (secim === "rozet") return theme.ayetNoRengi || theme.accent
  if (typeof secim === "string" && secim.startsWith("#")) return secim
  return theme.accent
}
export const OKUNAN_ARKALAR = [
  { id: "yok",      ad: "Yok",      aciklama: "Arka plan boş" },
  { id: "hafif",    ad: "Hafif",    aciklama: "Âyet boyunca hafif koyulaşma" },
  { id: "belirgin", ad: "Belirgin", aciklama: "Âyet boyunca belirgin zemin" },
]
export const OKUNAN_ALT_BANTLAR = [
  { id: "yok",  ad: "Yok",  aciklama: "Kelimelerin altında bir şey yok" },
  { id: "bant", ad: "Bant", aciklama: "Kelimelerin altında ince düz şerit" },
  { id: "dal",  ad: "Dal",  aciklama: "Kelimelerin altında ince dal şeridi" },
]

// Önceki kayıt biçimleri → yeni alanlar
function eskidenCevir(h) {
  if (h.stil) {                                   // ilk sürüm: tek "stil"
    if (h.stil === "bant") return { arka: "belirgin", altBant: "yok", rozetDal: false }
    if (h.stil === "renk") return { arka: "yok", altBant: "yok", rozetDal: false }
    if (h.stil === "dal") return { arka: "hafif", altBant: "yok", rozetDal: true }
  }
  if (h.zemin || h.rozet) {                       // ikinci sürüm: zemin + rozet
    return {
      arka: h.zemin === "bant" ? "belirgin" : h.zemin === "yok" ? "yok" : "hafif",
      altBant: h.zemin === "dal" ? "dal" : "yok",
      rozetDal: h.rozet === "dal",
    }
  }
  return {}
}

function oku() {
  try {
    const h = JSON.parse(localStorage.getItem(OKUNAN_ANAHTAR) || "null")
    if (h && typeof h === "object") {
      const e = eskidenCevir(h)
      const arka = h.arka ?? e.arka, altBant = h.altBant ?? e.altBant
      const rozetDal = typeof h.rozetDal === "boolean" ? h.rozetDal : e.rozetDal
      return {
        arka: OKUNAN_ARKALAR.some(s => s.id === arka) ? arka : OKUNAN_VARSAYILAN.arka,
        altBant: OKUNAN_ALT_BANTLAR.some(s => s.id === altBant) ? altBant : OKUNAN_VARSAYILAN.altBant,
        rozetDal: typeof rozetDal === "boolean" ? rozetDal : OKUNAN_VARSAYILAN.rozetDal,
        harf: typeof h.harf === "boolean" ? h.harf : OKUNAN_VARSAYILAN.harf,
        hareket: typeof h.hareket === "boolean" ? h.hareket : OKUNAN_VARSAYILAN.hareket,
        harfRenk: harfRenkGecerli(h.harfRenk) ? h.harfRenk : OKUNAN_VARSAYILAN.harfRenk,
      }
    }
  } catch { /* bozuk kayıt */ }
  return { ...OKUNAN_VARSAYILAN }
}

let durum = oku()
const dinleyiciler = new Set()
export function okunanGorunumYaz(yama) {
  durum = { ...durum, ...yama }
  try { localStorage.setItem(OKUNAN_ANAHTAR, JSON.stringify(durum)) } catch { /* yoksay */ }
  for (const f of dinleyiciler) f()
}
const abone = (f) => { dinleyiciler.add(f); return () => dinleyiciler.delete(f) }
export function useOkunanGorunum() {
  return useSyncExternalStore(abone, () => durum, () => durum)
}
