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

/* KARŞILAMA KONUMU (4 Kasım 2026) — kullanıcı: "Odaklanma tek seferde kullanıldığında
   perdenin altında karşılayabiliyor; perdeye dokunmadan karşıladığı konumu varsayılan
   olarak biraz daha aşağı alalım ve bunu ayetin karşılanacağı konum ayarı olarak
   kullanıcıya bırakabilelim." Ekran yüksekliğine oran (0 üst … 1 alt).
   DÜZELTME (4 Kasım 2026, kullanıcı: "Uzun ayetlerde çok daha yukarıda, kısa ayetlerde
   çok daha aşağıda karşılıyor … uzun ayeti baz alıp karşılamayı ona göre ayarlamalıyız"):
   Eskiden öğenin ORTASI çizgiye geliyordu → uzun âyetin başı yukarıda, kısanınki aşağıda
   kalıyordu. Artık âyetin BAŞI her zaman bu çizgiye gelir; âyet ekrana (oynatıcıya
   kadar) sığmıyorsa sığacak kadar — en fazla perde sınırına dek — yukarı alınır.
   Mushafta âyetin bütün kelimeleri birlikte ölçülür (yalnız ilk kelime değil).
   Anlam değiştiği için yeni anahtar. Ayar: PlayerBar → Görünüm ve konum → sürüklemeli
   önizleme (components/OdakKonumAyari.jsx).
   İKİNCİ AYAR (4 Kasım 2026, kullanıcı: "Bu şekilde de çok aşağıda karşılıyor, değeri
   biraz düşük varsayılandan başlatmamız gerekebilir ya da − değere inebilecek şekilde
   ayarlamak gerekebilir."): varsayılan 0,30 → 0,15; alt sınır −0,20 (âyetin başı
   ekranın üst kenarının biraz üstünde, perdenin/barın altında kalabilir). Varsayılan
   değişince eski kayıt karışmasın diye anahtar yine yenilendi. */
const KONUM_ANAHTAR = "vukuf-odak-hiza"
export const KONUM_VARSAYILAN = 0.15
export const KONUM_SINIR = [-0.2, 0.55]
export const UST_SINIR = 0.1          // perde: âyetin başı bunun üstüne çıkmaz
export const ALT_SINIR = 0.86         // oynatıcı / bilgi şeridi payı: âyetin sonu bunun altına inmesin
const okuKonum = () => {
  try { const v = parseFloat(localStorage.getItem(KONUM_ANAHTAR)); return v >= KONUM_SINIR[0] && v <= KONUM_SINIR[1] ? v : KONUM_VARSAYILAN } catch { return KONUM_VARSAYILAN }
}
export function konumAyarla(v) {
  const y = Math.max(KONUM_SINIR[0], Math.min(KONUM_SINIR[1], Number(v) || KONUM_VARSAYILAN))
  try { localStorage.setItem(KONUM_ANAHTAR, String(y)) } catch { /* yoksay */ }
  yay({ konum: y })
}
/* Karşılama çizgisi → hizalama oranı ve "rahat bant" (bant içindeyken kımıldamaz) */
export function odakBandi(konum = KONUM_VARSAYILAN) {
  return { oran: konum, bolge: [konum - 0.14, Math.min(0.8, konum + 0.24)] }
}

let durum = { acik: false, kaynak: null, surekli: okuSurekli(), konum: okuKonum() }
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
export function hizayaGetir(kap, el, { oran = KONUM_VARSAYILAN, bolge = null, zorla = false, ustSinir = UST_SINIR, altSinir = ALT_SINIR, ...ops } = {}) {
  const liste = (Array.isArray(el) ? el : [el]).filter(Boolean)
  if (!kap || !liste.length) return () => {}
  const kr = kap.getBoundingClientRect()
  // Âyet birden çok parçadan (kelime) oluşabilir: hepsinin kapladığı alan
  let ustPx = Infinity, altPx = -Infinity
  for (const e of liste) { const r = e.getBoundingClientRect(); if (r.height || r.width) { ustPx = Math.min(ustPx, r.top); altPx = Math.max(altPx, r.bottom) } }
  if (!isFinite(ustPx)) return () => {}
  const H = kr.height
  const ust = (ustPx - kr.top) / H, alt = (altPx - kr.top) / H, boy = alt - ust
  // Hedef: başı çizgiye; sığmıyorsa sığacak kadar yukarı (perde sınırına kadar)
  let hedef = oran
  // (çizgi perde sınırından da yukarıdaysa — eksi değer — sınır olarak çizgi alınır)
  if (hedef + boy > altSinir) hedef = Math.max(Math.min(ustSinir, oran), altSinir - boy)
  if (!zorla) {
    const b = bolge || odakBandi(oran).bolge
    const sigiyor = alt <= altSinir
    // Denge: başı rahat bantta ve tamamı görünüyorsa kımıldama; sığmayan uzun âyet
    // zaten olabileceği en iyi yerdeyse de kımıldama
    if ((sigiyor && ust >= b[0] && ust <= b[1]) || (!sigiyor && Math.abs(ust - hedef) < 0.03)) return () => {}
  }
  return yumusakKaydir(kap, kap.scrollTop + (ustPx - kr.top) - hedef * H, ops)
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
