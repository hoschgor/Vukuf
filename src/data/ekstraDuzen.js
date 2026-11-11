/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — EKSTRALAR DÜZENİ (sıra + gizli bölümler)
   src/data/ekstraDuzen.js

   11 Kasım 2026 — kullanıcı: "Ekstralar kısmına bir düzenleme simgesi butonu ekleyelim,
   buna bastığımızda gizleme seçeneği olsun. Ana menüdeki gibi kullanacağız. Sıralamayı da
   kullanıcı isterse değiştirebilecek."
   Depo: "vukuf-ekstralar-duzen" = { sira: [id…], gizli: [id…] }. Sayfaya sonradan yeni bir
   bölüm eklenirse kayıtlı sırada olmasa da varsayılan yerine (öncülünün arkasına) girer.
   Küçük haplar (radyo, Kur'an Dinle) Ekstralar'da gizlenir — ama kendi kartı gizliyse
   orada da görünür kalır, yoksa çalan sesi o sayfadan yönetmenin yolu kalmazdı.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react"

export const EKSTRA_DUZEN_ANAHTAR = "vukuf-ekstralar-duzen"
const BOS = { sira: [], gizli: [] }

function oku() {
  try {
    const v = JSON.parse(localStorage.getItem(EKSTRA_DUZEN_ANAHTAR) || "null")
    if (v && typeof v === "object") {
      return {
        sira: Array.isArray(v.sira) ? v.sira.filter(x => typeof x === "string") : [],
        gizli: Array.isArray(v.gizli) ? v.gizli.filter(x => typeof x === "string") : [],
      }
    }
  } catch { /* bozuk kayıt */ }
  return BOS
}

let durum = oku()
const dinleyiciler = new Set()
export function ekstraDuzenYaz(yama) {
  durum = { ...durum, ...yama }
  try { localStorage.setItem(EKSTRA_DUZEN_ANAHTAR, JSON.stringify(durum)) } catch { /* yoksay */ }
  dinleyiciler.forEach(f => f())
}
const abone = (f) => { dinleyiciler.add(f); return () => dinleyiciler.delete(f) }
export function useEkstraDuzen() {
  return useSyncExternalStore(abone, () => durum, () => durum)
}

export const ekstraGizliMi = (id) => durum.gizli.includes(id)
export function ekstraGizleDegis(id) {
  const g = durum.gizli.includes(id) ? durum.gizli.filter(x => x !== id) : [...durum.gizli, id]
  ekstraDuzenYaz({ gizli: g })
}

// Kayıtlı sıra + varsayılan sıra → görünen sıra (bilinmeyenler atılır, yeniler yerine girer)
export function ekstraSirala(kayitli, varsayilan) {
  const bilinen = new Set(varsayilan)
  const l = (kayitli || []).filter((x, i, a) => bilinen.has(x) && a.indexOf(x) === i)
  varsayilan.forEach((id, i) => {
    if (l.includes(id)) return
    let yer = 0
    for (let j = i - 1; j >= 0; j--) { const k = l.indexOf(varsayilan[j]); if (k >= 0) { yer = k + 1; break } }
    l.splice(yer, 0, id)
  })
  return l
}
