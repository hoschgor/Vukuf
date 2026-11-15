/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — RENKLİ HAREKE ve KELİME / KALIP RENKLENDİRME ayarları (Kur'ân-ı Kerîm)
   src/data/harekeRenk.js

   15 Kasım 2026 — kullanıcı: "KuranOkuma bölümünde tema ayarlarına alt kısma renkli hareke
   seçeneği koyalım, aktif edilirse harekeler renklendirilsin ve kullanıcı rengini
   değiştirebilsin. Başlangıçta zıt renkli bir tema rengi verelim. Özel hareke değiştirmek
   isteyen olursa da bunun için switch koyalım, aktif edildiğinde tüm harekeleri ayrı ayrı
   renklendirebilsin, varsayılan başlangıç renkleri hepsinin üstte belirlediğimiz aynı zıt
   renk olsun. Ek olarak kelime/kalıp renklendir kısmı ekleyelim, buton sonrasında kelime
   seçilsin ve tüm mushaf içinde o kelime ile eşleşen kısımlar seçilen renkte boyansın."

   HAREKE  "vukuf-renkli-hareke" = { acik, renk (null = temanın zıt rengi), ozel, renkler: { grup: renk|null } }
           Zıt renk: temanın lügat (vurgu) rengi — her temada yazı ve âyet no renginden ayrışan renk.
           Özelde boş bırakılan grup üstteki ortak rengi alır. Çizim: data/harekeFont.js.
   KELİME  "vukuf-kelime-renkleri" = [{ id, metin, iskelet, eslesme: "tam"|"harekeli"|"iceren", renk }]
           tam      → harfleri aynı kelimeler (hareke farkı gözetilmez: ٱلْحَمْدُ = ٱلْحَمْدِ)
           harekeli → harfi harekesiyle aynı yazılan kelimeler
           iceren   → harfleri içinde bu kalıp geçen kelimeler (ör. ر ح م → رَحْمَة، ٱلرَّحِيمِ)
   ═══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react"
import { HAREKE_GRUPLARI } from "./harekeFont"

const HAREKE_ANAHTAR = "vukuf-renkli-hareke"
const KELIME_ANAHTAR = "vukuf-kelime-renkleri"
const oku = (a, v) => { try { const x = JSON.parse(localStorage.getItem(a) || "null"); return x ?? v } catch { return v } }
const yaz = (a, v) => { try { localStorage.setItem(a, JSON.stringify(v)) } catch { /* yoksay */ } }

function depo(anahtar, varsayilan, duzelt = (x) => x) {
  let durum = duzelt(oku(anahtar, varsayilan))
  const d = new Set()
  return {
    al: () => durum,
    yaz: (v) => { durum = duzelt(v); yaz(anahtar, durum); d.forEach(f => f()) },
    abone: (f) => { d.add(f); return () => d.delete(f) },
  }
}

// ── HAREKE ──────────────────────────────────────────────────────────────────
const HAREKE_VARSAYILAN = { acik: false, renk: null, ozel: false, renkler: {} }
const harekeDepo = depo(HAREKE_ANAHTAR, HAREKE_VARSAYILAN, (v) => ({
  ...HAREKE_VARSAYILAN, ...(v && typeof v === "object" ? v : {}),
  renkler: { ...((v && v.renkler) || {}) },
}))
export const useRenkliHareke = () => useSyncExternalStore(harekeDepo.abone, harekeDepo.al, harekeDepo.al)
export const renkliHarekeYaz = (yama) => harekeDepo.yaz({ ...harekeDepo.al(), ...yama })
/** Temaya göre zıt (varsayılan) hareke rengi */
export const harekeZitRengi = (theme) => theme?.lugatHighlight || theme?.accent || "#c0392b"
/** { grup: renk } — özel kapalıysa hepsi ortak renk */
export function harekeRenkleri(ayar, theme) {
  const ortak = ayar.renk || harekeZitRengi(theme)
  const r = {}
  for (const g of HAREKE_GRUPLARI) r[g.id] = ayar.ozel ? (ayar.renkler[g.id] || ortak) : ortak
  return { ortak, gruplar: r }
}

// ── KELİME / KALIP ─────────────────────────────────────────────────────────
// Harf iskeleti: harekeler, tecvid ve vakıf işaretleri, tatvil çıkar; elif türleri birleşir
const ISARET_RE = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ]/g
export function harfIskeleti(s) {
  return String(s || "")
    .replace(ISARET_RE, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, "")
}
const harekeliNorm = (s) => String(s || "").replace(/[ۖ-ۭ࣓-࣡ـ]/g, "").replace(/\s+/g, "")
const kelimeDepo = depo(KELIME_ANAHTAR, [], (v) => (Array.isArray(v) ? v.filter(x => x && x.metin && x.renk) : []))
export const useKelimeRenkleri = () => useSyncExternalStore(kelimeDepo.abone, kelimeDepo.al, kelimeDepo.al)
export function kelimeRengiEkle(metin, renk, eslesme = "tam") {
  const iskelet = harfIskeleti(metin)
  if (!iskelet) return
  const l = kelimeDepo.al().filter(x => !(x.iskelet === iskelet && x.eslesme === eslesme && (eslesme !== "harekeli" || harekeliNorm(x.metin) === harekeliNorm(metin))))
  kelimeDepo.yaz([...l, { id: Date.now().toString(36), metin, iskelet, eslesme, renk }])
}
export const kelimeRengiSil = (id) => kelimeDepo.yaz(kelimeDepo.al().filter(x => x.id !== id))
export const kelimeRengiDegis = (id, yama) => kelimeDepo.yaz(kelimeDepo.al().map(x => (x.id === id ? { ...x, ...yama } : x)))
/** Kural listesinden kelime → renk bulucu (sonra eklenen kural öncelikli) */
export function kelimeRengiBulucu(kurallar) {
  if (!kurallar || !kurallar.length) return null
  const ters = [...kurallar].reverse().map(k => ({ ...k, hn: harekeliNorm(k.metin) }))
  const bellek = new Map()
  return (arabic) => {
    if (bellek.has(arabic)) return bellek.get(arabic)
    const isk = harfIskeleti(arabic)
    let r = null
    for (const k of ters) {
      if (k.eslesme === "iceren" ? isk.includes(k.iskelet)
        : k.eslesme === "harekeli" ? harekeliNorm(arabic) === k.hn
          : isk === k.iskelet) { r = k.renk; break }
    }
    bellek.set(arabic, r)
    return r
  }
}
