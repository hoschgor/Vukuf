// RENKLİ TECVİD AYARI — tek kaynak (useSyncExternalStore). Mücevher panelindeki bölüm yazar,
// MushafSayfa okur. Renkli tecvidin kendisi BAŞTA KAPALI; kuralların ilk durumu
// TECVID_KURALLARI'ndaki `acik` alanından gelir (medd-i tabiî ve okunmayan harfler kapalı).
import { useSyncExternalStore } from "react"
import { TECVID_KURALLARI } from "./tecvid"

export const TECVID_AYAR_ANAHTAR = "vukuf-renkli-tecvid"

function varsayilan() {
  return { acik: false, kurallar: Object.fromEntries(TECVID_KURALLARI.map(k => [k.id, k.acik])) }
}

function oku() {
  const v = varsayilan()
  try {
    const ham = JSON.parse(localStorage.getItem(TECVID_AYAR_ANAHTAR) || "null")
    if (ham && typeof ham === "object") {
      v.acik = !!ham.acik
      for (const k of TECVID_KURALLARI) if (typeof ham.kurallar?.[k.id] === "boolean") v.kurallar[k.id] = ham.kurallar[k.id]
    }
  } catch { /* bozuk kayıt → varsayılan */ }
  return v
}

let durum = oku()
const dinleyiciler = new Set()
function yay() { for (const f of dinleyiciler) f() }
function yaz(yeni) {
  durum = yeni
  try { localStorage.setItem(TECVID_AYAR_ANAHTAR, JSON.stringify(durum)) } catch { /* kota / gizli mod */ }
  yay()
}

export function tecvidAcikYaz(acik) { yaz({ ...durum, acik: !!acik }) }
export function tecvidKuralYaz(id, acik) { yaz({ ...durum, kurallar: { ...durum.kurallar, [id]: !!acik } }) }
export function tecvidVarsayilanaDon() { yaz({ ...varsayilan(), acik: durum.acik }) }

// Yedekten geri yükleme vb. başka sekmede değişirse
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => { if (e.key === TECVID_AYAR_ANAHTAR) { durum = oku(); yay() } })
}

const abone = (f) => { dinleyiciler.add(f); return () => dinleyiciler.delete(f) }
export function useTecvidAyar() {
  return useSyncExternalStore(abone, () => durum, () => durum)
}

// Kapalıyken "" → MushafSayfa'nın memo karşılaştırması ve önbellek için kısa imza
export function tecvidImza(a) {
  if (!a?.acik) return ""
  return TECVID_KURALLARI.filter(k => a.kurallar[k.id]).map(k => k.id).join(",")
}
