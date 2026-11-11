// OKUNAN ÂYET GÖRÜNÜMÜ (11 Kasım 2026) — kâri okurken (ve gidilen âyette) âyetin nasıl
// işaretleneceği. Oynatıcının ayar kutusundaki "Okunan âyet görünümü" sayfası yazar,
// MushafSayfa / MushafKelime okur.
// AYRI AYRI SEÇİLİR (11 Kasım 2026, kullanıcı: "bant ayrı seçilir, arka plan karartma gibi
// olan kısım ayrı seçilir; arka planı boş bırakabiliriz, hafif karartılı seçebiliriz, alttaki
// bant kısmını da dal ya da bant olarak seçeriz"):
//   arka:    "yok" | "hafif" | "belirgin"   — âyet boyunca zemin tonu
//   altBant: "yok" | "bant" | "dal"         — kelimelerin altında düz şerit ya da ince dal
//   rozetDal: âyet sonu rozetinin üstünde/altında yapraklı dallar (isteğe bağlı, başta kapalı)
//   harf:    okunan âyetin harfleri vurgu renginde
//   hareket: rozet dalları hafifçe salınsın (yalnız transform)
// (Çini fotoğrafından yapılan çiçek süsü kullanıcı isteğiyle kaldırıldı — o fotoğraf âyet
//  rozetinin [parantez] yeni tasarımı için verilmişti.)
import { useSyncExternalStore } from "react"

export const OKUNAN_ANAHTAR = "vukuf-okunan-gorunum"
export const OKUNAN_VARSAYILAN = { arka: "hafif", altBant: "yok", rozetDal: false, harf: true, hareket: true }
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
