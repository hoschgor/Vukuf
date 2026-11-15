/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — MEALİN MUSHAFTAKİ YERİ (Kur'ân-ı Kerîm · Ayarlar → Meal)
   src/data/mealGorunum.js

   15 Kasım 2026 — kullanıcı: "Meal seçeneklerine kelime meali aktif ise, altında farklı bir
   switch açılsın, altında ve gizli. Ayet mealinde de aynı şekilde altında ve gizli seçenekleri
   bulunsun. Altında seçilirse, âyet meali için ayet ve meal sıra sıra olacak şekilde
   gösterilsin, kelime meali için altında seçilirse de, arapça kısmın hemen altında türkçe
   anlamı da görüntülensin, Kelime meali için altında ifadesi seçiliyse, kelimeleri farklı
   renklendir switch i de aktif edilsin … renklendirme rastgele olacak."

   "vukuf-meal-gorunum" = { kelime: "gizli"|"altinda", ayet: "gizli"|"altinda", renkli, tohum }
     gizli   → eskisi gibi: meal dokununca açılan balonda
     altinda → kelime: her kelimenin altında Türkçe anlamı · âyet: her âyetin altında meali
     renkli  → (yalnız kelime "altinda"yken) kelimeler ve anlamları rastgele renklerde;
               `tohum` anahtar her açılışta yenilenir → her seferinde başka bir dağılım,
               ama açık kaldıkça (sayfa çevirince, yeniden çizilince) renkler sabit.
   15 Kasım 2026 (2) — kullanıcı: "Kelime meali açıksa morfoloji bilgisi için de switch koyalım,
   switch kapalıysa kelimeye tıklandığında bir işlem yapmaması gerek, zaten meal kısmı altında
   olacak … Ayet meali için de renklendir seçeneği koyalım, arapça ve meal ayetin tamamı aynı
   rastgele renge boyanabilir."
     morfoloji  → kelime penceresinde fiil çekimi (şahıs · sayı · cins · kip · çatı). Kelime
                  anlamı ALTINDAYKEN kapalıysa kelimeye dokunmak hiçbir şey açmaz (anlam zaten
                  görünüyor); gizli kipte pencere yine açılır, yalnız çekim satırı çıkmaz.
     ayetRenkli → (âyet meali "altinda"yken) her âyetin Arapçası ve meali aynı rastgele renkte;
                  `ayetTohum` her açılışta yenilenir. Kelime renklendirmesi açıksa kelimeler onu alır.
   Uygulayan: components/MushafSayfa.jsx (KuranOkuma prop olarak geçirir; hıfz açıkken
   kelime anlamı gösterilmez — perdenin cevabını vermesin).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react"

const ANAHTAR = "vukuf-meal-gorunum"
const VARSAYILAN = { kelime: "gizli", ayet: "gizli", renkli: false, tohum: 1, morfoloji: true, ayetRenkli: false, ayetTohum: 1 }
const duzelt = (v) => {
  const x = { ...VARSAYILAN, ...(v && typeof v === "object" ? v : {}) }
  return {
    kelime: x.kelime === "altinda" ? "altinda" : "gizli",
    ayet: x.ayet === "altinda" ? "altinda" : "gizli",
    renkli: !!x.renkli,
    tohum: Number.isFinite(x.tohum) ? x.tohum : 1,
    morfoloji: x.morfoloji !== false,
    ayetRenkli: !!x.ayetRenkli,
    ayetTohum: Number.isFinite(x.ayetTohum) ? x.ayetTohum : 1,
  }
}
let durum = (() => { try { return duzelt(JSON.parse(localStorage.getItem(ANAHTAR) || "null")) } catch { return VARSAYILAN } })()
const dinleyici = new Set()
export function mealGorunumYaz(yama) {
  const y = { ...durum, ...yama }
  if (yama.renkli && !durum.renkli) y.tohum = Math.floor(Math.random() * 1e6) + 1   // her açılışta yeni dağılım
  if (yama.ayetRenkli && !durum.ayetRenkli) y.ayetTohum = Math.floor(Math.random() * 1e6) + 1
  durum = duzelt(y)
  try { localStorage.setItem(ANAHTAR, JSON.stringify(durum)) } catch { /* yoksay */ }
  dinleyici.forEach(f => f())
}
export function useMealGorunum() {
  return useSyncExternalStore((f) => { dinleyici.add(f); return () => dinleyici.delete(f) }, () => durum, () => durum)
}

/* RASTGELE OKUMA RENKLERİ — temanın zeminine göre iki takım: açık zeminde koyu-doygun,
   koyu zeminde açık tonlar. Komşu iki kelime aynı rengi almaz. */
const ACIK_ZEMIN = ["#b03a2e", "#1f618d", "#117a65", "#7d3c98", "#a0620b", "#2e4a7a", "#a04000", "#196f3d", "#8e2d6b", "#2874a6"]
const KOYU_ZEMIN = ["#f1948a", "#85c1e9", "#76d7c4", "#c39bd3", "#f8c471", "#a9cce3", "#f5b041", "#82e0aa", "#e8a3c9", "#f0b27a"]
function koyuMu(renk) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(renk || "").trim())
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128
}
function karma(s, tohum) {
  let h = 2166136261 ^ tohum
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
/** kimlikler (okuma sırasıyla) → Map(id → renk) */
export function okumaRenkleri(kimlikler, tohum, zemin) {
  const takim = koyuMu(zemin) ? KOYU_ZEMIN : ACIK_ZEMIN
  const m = new Map()
  let onceki = -1
  for (const id of kimlikler) {
    let i = karma(String(id), tohum) % takim.length
    if (i === onceki) i = (i + 1 + (karma(String(id), tohum + 7) % (takim.length - 1))) % takim.length
    m.set(id, takim[i])
    onceki = i
  }
  return m
}

/** Âyetin rastgele rengi — yalnız sûreye, âyete ve tohuma bağlı (sayfa âyeti bölse de iki
    parçası aynı renkte); ardışık iki âyet aynı renkte olmaz. Sûre başına zincir bir kez kurulur. */
const ayetZinciri = new Map()
export function ayetRengi(sureNo, ayetNo, tohum, zemin) {
  const takim = koyuMu(zemin) ? KOYU_ZEMIN : ACIK_ZEMIN
  const n = takim.length
  const k = `${sureNo}:${tohum}`
  let z = ayetZinciri.get(k)
  if (!z) { z = []; ayetZinciri.set(k, z) }
  for (let a = z.length + 1; a <= ayetNo; a++) {
    let i = karma(`${sureNo}:${a}`, tohum) % n
    if (a > 1 && i === z[a - 2]) i = (i + 1 + (karma(`${sureNo}:${a}`, tohum + 7) % (n - 1))) % n
    z.push(i)
  }
  return takim[z[ayetNo - 1] ?? 0]
}
