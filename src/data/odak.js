/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — ODAK (gözlük düğmesi): durum, yumuşak kaydırma, veri yükleyiciler
   src/data/odak.js

   4 Kasım 2026 — kullanıcı: "Playerbardaki gözlük butonu için bir geliştirme yapalım.
   Amacımız başka sayfadan okumaya odaklanabilmek, istersek sürekli odak açık
   kalabilmeli, okunan ayetleri ya da yazıları ekranda gösterecek, sonraki ayet ya da
   cümleye geçtiğinde keskin, göz yoran bir şekilde kaymak yerine yavaşça ama güzel
   bir denge ile takip edecek."
   • ODAK PENCERESİ (components/OdakPenceresi.jsx) — öbür ekranlarda küçük oynatıcıdaki
     gözlükle açılır; Kur'ân'da çalan sûrenin âyetleri (Arapça + meal), sesli okumada
     okunan cümleler. Okunan öğe sakin bir kaydırmayla göz hizasına gelir.
   • SÜREKLİ ODAK ("vukuf-odak-surekli") — açıksa: Kur'ân ekranında mushaf çalan âyeti
     kendiliğinden takip eder; öbür ekranlarda okuma sürerken odak penceresi
     kendiliğinden açık kalır (kapatılırsa o okuma boyunca yeniden açılmaz).
   • yumusakKaydir — tarayıcının "smooth" kaydırması kısa ve sert; burada süre mesafeye
     göre uzar (0,8–1,8 sn), yavaş başlayıp yavaş biten bir eğriyle ilerler; kullanıcı
     dokunursa/kaydırırsa hemen bırakır. "Hareketi azalt" açıksa anında konumlanır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react"

// ── DURUM ────────────────────────────────────────────────────────────────────
const SUREKLI_ANAHTAR = "vukuf-odak-surekli"
export const BOYUT_ANAHTAR = "vukuf-odak-boyut"
export const GORUNUM_ANAHTAR = "vukuf-odak-gorunum"     // { arapca, meal }

const okuSurekli = () => { try { return localStorage.getItem(SUREKLI_ANAHTAR) === "1" } catch { return false } }
let durum = { acik: false, kaynak: null, surekli: okuSurekli() }
const dinleyiciler = new Set()
const yay = (p) => { durum = { ...durum, ...p }; dinleyiciler.forEach(f => f()) }
const abone = (f) => { dinleyiciler.add(f); return () => dinleyiciler.delete(f) }
const al = () => durum

export function useOdak() { return useSyncExternalStore(abone, al, al) }
export function odakAc(kaynak) { yay({ acik: true, kaynak }) }
export function odakKapat() { yay({ acik: false }) }
export function surekliAyarla(v) {
  try { localStorage.setItem(SUREKLI_ANAHTAR, v ? "1" : "0") } catch { /* yoksay */ }
  yay({ surekli: !!v })
}

// ── YUMUŞAK KAYDIRMA ─────────────────────────────────────────────────────────
const egri = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)   // easeInOutCubic
const hareketAzMi = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches } catch { return false } }

/* kap: kaydırılan öğe; hedef: scrollTop değeri. Dönen işlev animasyonu durdurur.
   Kullanıcı dokunur/teker çevirir/tuşa basarsa animasyon kendiliğinden biter. */
export function yumusakKaydir(kap, hedef, { sure = null, bitti } = {}) {
  if (!kap) return () => {}
  const bas = kap.scrollTop
  const enFazla = Math.max(0, kap.scrollHeight - kap.clientHeight)
  const son = Math.max(0, Math.min(enFazla, hedef))
  const fark = son - bas
  if (Math.abs(fark) < 2) { bitti && bitti(); return () => {} }
  if (hareketAzMi()) { kap.scrollTop = son; bitti && bitti(); return () => {} }
  const ms = sure ?? Math.max(800, Math.min(1800, 600 + Math.abs(fark) * 0.9))
  let id = 0, durdu = false
  const t0 = performance.now()
  const durdur = () => {
    if (durdu) return
    durdu = true; cancelAnimationFrame(id)
    kap.removeEventListener("wheel", durdur); kap.removeEventListener("touchstart", durdur); kap.removeEventListener("pointerdown", durdur)
  }
  kap.addEventListener("wheel", durdur, { passive: true })
  kap.addEventListener("touchstart", durdur, { passive: true })
  kap.addEventListener("pointerdown", durdur, { passive: true })
  const adim = (an) => {
    if (durdu) return
    const t = Math.min(1, (an - t0) / ms)
    kap.scrollTop = bas + fark * egri(t)
    if (t < 1) id = requestAnimationFrame(adim)
    else { durdur(); bitti && bitti() }
  }
  id = requestAnimationFrame(adim)
  return durdur
}

/* Öğeyi kabın "göz hizasına" getir — ama zaten rahat bölgedeyse kımıldama (denge):
   oran: hedef çizgi (0 üst … 1 alt), bolge: [üst, alt] rahat bant */
export function hizayaGetir(kap, el, { oran = 0.36, bolge = [0.16, 0.62], zorla = false, ...ops } = {}) {
  if (!kap || !el) return () => {}
  const kr = kap.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  const ust = (er.top - kr.top) / kr.height
  const alt = (er.bottom - kr.top) / kr.height
  // Rahat bantta mı? Banttan uzun öğe, başı bandın başına yakınsa bantta sayılır
  const uzun = (alt - ust) > (bolge[1] - bolge[0])
  const bantta = uzun ? ust >= bolge[0] - 0.02 && ust <= bolge[0] + 0.1 : ust >= bolge[0] && alt <= bolge[1]
  if (!zorla && bantta) return () => {}
  // Uzun öğe (ekrandan büyük) başından hizalanır
  const pay = er.height > kr.height * 0.6 ? kr.height * 0.12 : kr.height * oran - Math.min(er.height, kr.height * 0.4) / 2
  return yumusakKaydir(kap, kap.scrollTop + (er.top - kr.top) - pay, ops)
}

// ── VERİ (odak penceresi Kur'ân ekranı dışında da çalışır) ─────────────────────
let mushafSoz = null, mealSoz = null
export const mushafYukle = () => (mushafSoz ||= fetch("/kuran-mushaf.json").then(r => (r.ok ? r.json() : null)).catch(() => { mushafSoz = null; return null }))
export const mealYukle = () => (mealSoz ||= import("./ayet-meal.json").then(m => m.default).catch(() => { mealSoz = null; return null }))

// Vakıf harfi → mushaf imlâsındaki küçük üst işaret (KuranOkuma ayetArapcasi ile aynı tablo)
const VAKIF_ISARET = { "ط": "ؕ", "م": "ۘ", "ج": "ۚ", "ص": "ۖ", "مع": "ۛ", "ق": "ۗ", "س": "ۜ", "لا": "ۙ" }
export function ayetMetni(ayet) {
  return (ayet?.kelimeler || []).map(k => {
    let w = String(k.arabic || "").replace(/\s+/g, " ").trim()
    const vk = k.vakif && VAKIF_ISARET[k.vakif]
    if (vk && w && !w.endsWith(vk)) w += vk
    return w
  }).filter(Boolean).join(" ")
}
