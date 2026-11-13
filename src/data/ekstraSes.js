/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — EKSTRALAR SES DÜZEYİ (radyo + Kur'an Dinle)
   src/data/ekstraSes.js

   13 Kasım 2026 — kullanıcı: "Ekstralar bölümünde çalan kısımlar için de ses butonu
   gerekiyor." Radyo ve Kur'an Dinle'nin ORTAK ses düzeyi (0…1); cihazda saklanır.
   Kur'ân oynatıcısının (PlayerBar) sesinden ayrı: mushafı okurken kâri sesi ile arkada
   radyo/Kur'an Dinle farklı düzeyde olabilsin.

   Sağlayıcılar kendi <audio> öğelerini `ekstraSesBagla(a)` ile kaydeder; düzey değişince
   hepsine uygulanır (volume + muted).

   iOS: <audio>.volume TASARIM GEREĞİ salt okunur (bkz. useAudioPlayer). Kur'ân
   oynatıcısı orada Web Audio kazanç düğümü kullanıyor; ancak radyo yayınları CORS
   başlığı göndermediği için kazanç düğümünden geçen ses TAMAMEN SUSAR. Bu yüzden burada
   o yol yok: iOS'ta yalnız susturma (muted her yerde çalışır) — kutu bunu belirtir.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react"

const ANAHTAR = "vukuf-ekstralar-ses"
const sinirla = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1)

function oku() {
  try {
    const v = localStorage.getItem(ANAHTAR)
    return v == null ? 1 : sinirla(parseFloat(v))
  } catch { return 1 }
}

let duzey = oku()
let onceki = duzey > 0 ? duzey : 1          // susturmadan önceki düzey (geri açınca dönülür)
const ogeler = new Set()
const dinleyiciler = new Set()

function uygula(a) {
  try { a.volume = duzey } catch { /* iOS'ta yazılamaz — yoksay */ }
  try { a.muted = duzey === 0 } catch { /* yoksay */ }
}

export function ekstraSesBagla(a) {
  if (!a) return
  ogeler.add(a)
  uygula(a)
}

export function ekstraSesAyarla(v) {
  duzey = sinirla(Number(v))
  if (duzey > 0) onceki = duzey
  try { localStorage.setItem(ANAHTAR, String(duzey)) } catch { /* yoksay */ }
  for (const a of ogeler) uygula(a)
  for (const f of dinleyiciler) f()
}

// Sessize al ↔ önceki düzeye dön
export function ekstraSesSustur() {
  ekstraSesAyarla(duzey === 0 ? (onceki || 1) : 0)
}

const abone = (f) => { dinleyiciler.add(f); return () => dinleyiciler.delete(f) }
export function useEkstraSes() {
  return useSyncExternalStore(abone, () => duzey, () => duzey)
}

// Bu tarayıcıda ses düzeyi yazılabiliyor mu? (iOS'ta hayır.) Bir kez ölçülür.
let yazilabilir = null
export function sesDuzeyiYazilabilir() {
  if (yazilabilir !== null) return yazilabilir
  try {
    const t = new Audio()
    t.volume = 0.37
    yazilabilir = Math.abs(t.volume - 0.37) < 0.01
  } catch { yazilabilir = true }
  return yazilabilir
}
