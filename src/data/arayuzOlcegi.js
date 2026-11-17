/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — DÜĞME BOYUTU (ortak ölçek ayarları)
   src/data/arayuzOlcegi.js

   17 Kasım 2026 — kullanıcı: "Devamlı oynatma butonları ya da menü butonları vs için boyut
   ayarı yapılabilsin, ana menüden değiştirilsin, rahat tıklanabilir olmalı ve ekranı
   kaplamamalı. Web sürümü için daha da büyük olabilir, ekranda zaten küçük kalıyor."

   İki ölçek, ikisi de Ayarlar → Düğme boyutu'ndan değişir (cihazda saklanır):
   • HAP ÖLÇEĞİ ("vukuf-hap-olcegi") — yüzen haplar: mini oynatıcı, radyo, Kur'ân dinle,
     sesli okuma, oynatıcıların küçük hâlleri, Geri dön / köprü düğmeleri, Diyanet TV
     penceresinin şeridi. Uygulanışı: components/DonusDugmesi.jsx useHapKonumu (CSS zoom).
   • BAR ÖLÇEĞİ ("vukuf-bar-ui-olcegi", eskiden ekranların kendi durumuydu) — okuma
     ekranlarının barı, menüsü (orta menü), kaydırma menüsü. Okuma ekranlarındaki
     "Boyut ayarları → Arayüz" ile aynı değer; biri değişince öbürü de anında değişir.
   OTOMATİK: değer kaydedilmemişse geniş ekranda (fare ile kullanılan, ≥ 900 px — web
   sürümü) daha büyük, telefonda/tablette 1. Bir kez seçilince seçilen değer geçerli;
   "Otomatik" düğmesi kaydı siler.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react"

export const OLCEK_EN_AZ = 0.8
export const OLCEK_EN_COK = 1.6
const HAP_ANAHTAR = "vukuf-hap-olcegi"
const BAR_ANAHTAR = "vukuf-bar-ui-olcegi"
const GOC_ANAHTAR = "vukuf-olcek-goc-1"
const OTO = { hap: 1.3, bar: 1.2 }          // geniş ekranda otomatik değer

const sinirla = (v) => Math.min(OLCEK_EN_COK, Math.max(OLCEK_EN_AZ, Math.round(v * 100) / 100))

let genisMq = null
export function genisEkran() {
  if (typeof window === "undefined" || !window.matchMedia) return false
  if (!genisMq) genisMq = window.matchMedia("(min-width: 900px) and (pointer: fine)")
  return genisMq.matches
}

// Eski sürümler bar ölçeğini açılışta HER ZAMAN "1" olarak yazıyordu (bilinçli seçim değil):
// geniş ekranda bir kez silinir → otomatik (daha büyük) değer devreye girer.
try {
  if (typeof window !== "undefined" && !localStorage.getItem(GOC_ANAHTAR)) {
    if (genisEkran() && localStorage.getItem(BAR_ANAHTAR) === "1") localStorage.removeItem(BAR_ANAHTAR)
    localStorage.setItem(GOC_ANAHTAR, "1")
  }
} catch { /* yoksay */ }

const ANAHTAR = { hap: HAP_ANAHTAR, bar: BAR_ANAHTAR }
const dinleyiciler = new Set()
let surum = 0
function bildir() { surum++; for (const f of dinleyiciler) f() }

function abone(f) {
  dinleyiciler.add(f)
  if (dinleyiciler.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", depoDegisti)
    try { genisEkran(); genisMq && genisMq.addEventListener("change", bildir) } catch { /* yoksay */ }
  }
  return () => {
    dinleyiciler.delete(f)
    if (!dinleyiciler.size && typeof window !== "undefined") {
      window.removeEventListener("storage", depoDegisti)
      try { genisMq && genisMq.removeEventListener("change", bildir) } catch { /* yoksay */ }
    }
  }
}
function depoDegisti(e) { if (!e.key || e.key === HAP_ANAHTAR || e.key === BAR_ANAHTAR) bildir() }

/** { deger, oto } — oto: kayıt yok, otomatik değer kullanılıyor */
export function olcekAyari(tur) {
  let kayit = null
  try { kayit = localStorage.getItem(ANAHTAR[tur]) } catch { kayit = null }
  const v = parseFloat(kayit)
  if (kayit != null && isFinite(v)) return { deger: sinirla(v), oto: false }
  return { deger: genisEkran() ? OTO[tur] : 1, oto: true }
}
/** v: sayı → kaydet · null → otomatiğe dön */
export function olcekYaz(tur, v) {
  try {
    if (v == null) localStorage.removeItem(ANAHTAR[tur])
    else localStorage.setItem(ANAHTAR[tur], String(sinirla(v)))
  } catch { /* yoksay */ }
  bildir()
}

const anlik = () => surum
/** Etkin ölçek (sayı) — değişince yeniden çizer */
export function useOlcek(tur) {
  useSyncExternalStore(abone, anlik, anlik)
  return olcekAyari(tur).deger
}
export const useHapOlcegi = () => useOlcek("hap")
/** Okuma ekranları için [ölçek, setÖlçek] — eski useState imzasıyla aynı */
export function useBarOlcegi() {
  const v = useOlcek("bar")
  return [v, (y) => olcekYaz("bar", typeof y === "function" ? y(olcekAyari("bar").deger) : y)]
}
/** Ayarlar ekranı için { deger, oto } */
export function useOlcekAyari(tur) {
  useSyncExternalStore(abone, anlik, anlik)
  return olcekAyari(tur)
}

/* ── CSS zoom desteği ────────────────────────────────────────────────────────
   Yeni (standart) zoom'da getBoundingClientRect ekrandaki gerçek boyu verir; eski WebKit
   zoom'unda öğenin kendi (bölünmüş) birimiyle verir. Bir kez ölçülür. zoom hiç yoksa ölçek 1. */
let zoomBilgi = null
export function zoomDurumu() {
  if (zoomBilgi) return zoomBilgi
  if (typeof document === "undefined" || !document.body) return { var: false, gorsel: true }   // henüz ölçülemez (önbelleğe alınmaz)
  zoomBilgi = { var: false, gorsel: true }
  try {
    if (typeof CSS !== "undefined" && CSS.supports && CSS.supports("zoom", "2")) {
      const d = document.createElement("div")
      d.style.cssText = "position:fixed;left:0;top:0;width:10px;height:10px;zoom:2;visibility:hidden;pointer-events:none"
      document.body.appendChild(d)
      const w = d.getBoundingClientRect().width
      d.remove()
      zoomBilgi = { var: true, gorsel: w > 15 }
    }
  } catch { zoomBilgi = { var: false, gorsel: true } }
  return zoomBilgi
}
