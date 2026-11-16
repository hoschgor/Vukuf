/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — HAVA DURUMU (namaz vakti kartları için yalnız derece + gök)
   src/data/havaDurumu.js

   15 Kasım 2026 — kullanıcı: "Bu kartlara hava durumunu da ekleyelim, fakat bilgi olarak
   vermeye lüzum yok, sadece derece olsa yeterli. Yağmurlu ise yağmur damlası, karlı ise
   kar tanesi, kapalı ise bulut çizimi ile birlikte verebiliriz. Bu şekilde hem zamanı hem
   havayı tek kartta vermiş oluruz."

   KAYNAK: Open-Meteo (https://open-meteo.com — anahtarsız, ticarî olmayan kullanım serbest,
   veri CC BY 4.0; atıf Hakkında'da). İki adım:
     1) Konum: seçim konumdan bulunduysa (konumdanBul) enlem/boylam zaten seçimde. Elle
        seçilen il/ilçede Open-Meteo'nun yer adı araması (GeoNames) — Türkiye'de, il adı
        eşleşen sonuç; ilçe bulunamazsa il merkezi. İlçe başına BİR KEZ sorulur, saklanır.
     2) Anlık hava: sıcaklık + WMO hava kodu + gündüz/gece. 30 dakikada bir tazelenir;
        internet yoksa son bilinen değer (en çok 6 saat eski) gösterilir, daha eskiyse hiç.
   Konum bilgisi silinince (Ekstralar → Konum izni) hava önbelleği de silinir
   (namazVakitleri.konumBilgisiniSil "vukuf-hava-" öneklerini de temizler).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react"
import { adNorm } from "./namazVakitleri"

const KONUM_ONEK = "vukuf-hava-konum-"
const HAVA_ONEK = "vukuf-hava-"
const TAZELE = 30 * 60000
const EN_ESKI = 6 * 3600000

const oku = (a) => { try { return JSON.parse(localStorage.getItem(a) || "null") } catch { return null } }
const yaz = (a, v) => { try { localStorage.setItem(a, JSON.stringify(v)) } catch { /* yoksay */ } }

/* WMO hava kodu → gök türü
   0–1 açık · 2 parçalı bulutlu · 3 kapalı · 45/48 sis · 51–67, 80–82 yağmur (çisenti dahil)
   71–77, 85–86 kar · 95–99 gök gürültülü fırtına */
export function havaTuru(kod) {
  const k = Number(kod)
  if (k <= 1) return "acik"
  if (k === 2) return "parcali"
  if (k === 3) return "kapali"
  if (k === 45 || k === 48) return "sis"
  if ((k >= 71 && k <= 77) || k === 85 || k === 86) return "kar"
  if (k >= 95) return "firtina"
  if ((k >= 51 && k <= 67) || (k >= 80 && k <= 82)) return "yagmur"
  return "kapali"
}
export const HAVA_ADLARI = {
  acik: "Açık", parcali: "Parçalı bulutlu", kapali: "Kapalı", sis: "Sisli",
  yagmur: "Yağmurlu", kar: "Karlı", firtina: "Gök gürültülü",
}

/** Kayıtlı konum (eşzamanlı): seçimdeki ya da hava için daha önce bulunan enlem/boylam; yoksa null.
    Gök hesabı (data/gokHesabi.js — ayın yeri ve eğimi) bunu kullanır. */
export function kayitliKonum(secim) {
  if (!secim) return null
  if (secim.lat != null && secim.lng != null) return { lat: secim.lat, lng: secim.lng }
  const o = secim.ilceId ? oku(KONUM_ONEK + secim.ilceId) : null
  return o && isFinite(o.lat) && isFinite(o.lng) ? o : null
}

async function konumBul(secim) {
  if (secim.lat != null && secim.lng != null) return { lat: secim.lat, lng: secim.lng }
  const a = KONUM_ONEK + secim.ilceId
  const o = oku(a)
  if (o && isFinite(o.lat) && isFinite(o.lng)) return o
  const il = adNorm(secim.sehirAdi)
  const ara = async (ad) => {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ad)}&count=10&language=tr&format=json&countryCode=TR`)
    if (!r.ok) throw new Error("yer adı araması")
    const j = await r.json()
    const l = (j.results || []).filter(x => x.country_code === "TR")
    return l.find(x => adNorm(x.admin1) === il) || null
  }
  let bulunan = null
  const ilceAdi = String(secim.ilceAdi || "")
  if (ilceAdi && adNorm(ilceAdi) !== il) bulunan = await ara(ilceAdi.toLocaleLowerCase("tr-TR"))
  if (!bulunan) bulunan = await ara(String(secim.sehirAdi || "").toLocaleLowerCase("tr-TR"))
  if (!bulunan) throw new Error("konum bulunamadı")
  const k = { lat: bulunan.latitude, lng: bulunan.longitude }
  yaz(a, k)
  return k
}

/** { derece, tur, gunduz, t } | null — önbellek tazeyse ağa çıkmaz */
export async function havaGetir(secim, { zorla = false } = {}) {
  if (!secim || !secim.ilceId) return null
  const a = HAVA_ONEK + secim.ilceId
  const o = oku(a)
  if (!zorla && o && Date.now() - o.t < TAZELE) return o
  try {
    const k = await konumBul(secim)
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${k.lat.toFixed(3)}&longitude=${k.lng.toFixed(3)}&current=temperature_2m,weather_code,is_day&timezone=auto`)
    if (!r.ok) throw new Error("hava")
    const j = await r.json()
    const c = j.current || {}
    if (!isFinite(c.temperature_2m)) throw new Error("boş")
    const v = { derece: Math.round(c.temperature_2m), tur: havaTuru(c.weather_code), gunduz: c.is_day !== 0, t: Date.now() }
    yaz(a, v)
    return v
  } catch {
    return o && Date.now() - o.t < EN_ESKI ? o : null
  }
}

/** Kartlar için: secim değişince ve 30 dk'da bir tazelenir */
export function useHavaDurumu(secim) {
  const ilceId = secim?.ilceId || null
  const [hava, setHava] = useState(() => {
    if (!ilceId) return null
    const o = oku(HAVA_ONEK + ilceId)
    return o && Date.now() - o.t < EN_ESKI ? o : null
  })
  useEffect(() => {
    if (!secim || !ilceId) { setHava(null); return }
    let iptal = false
    const al = () => havaGetir(secim).then(v => { if (!iptal) setHava(v) })
    al()
    const t = setInterval(al, TAZELE)
    return () => { iptal = true; clearInterval(t) }
  }, [ilceId]) // eslint-disable-line react-hooks/exhaustive-deps
  return hava
}
