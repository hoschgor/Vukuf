/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KELİME SESİ (tek kaynak)
   src/data/kelimeSes.js

   Kelime kelime okunuş (quran.com WBW mp3). Eskiden bütün mantık KelimePopup
   içindeydi; hıfz modu da aynı sesi çalacağı için buraya alındı — bizim kelime
   bölmemizle ses dosyalarının sırası İKİ YERDE ayrı ayrı tutulmasın.

   ── NİÇİN TEK ÇALAR ─────────────────────────────────────────────────────────
   Baloncuk her dokunuşta yeni bir `Audio` açıyor ve kapanınca DURDURMUYORDU:
   kelime çalarken baloncuk kapatılırsa ses arkadan sürüyordu, üst üste iki
   kelimeye dokununca iki ses birden çalabiliyordu. Artık modül genelinde TEK
   ses var: yenisi başlarken eskisi susuyor; baloncuk kapanınca `kelimeSesDurdur`.

   ── EŞLEME TABLOSU TEMBEL (1,7 MB) ──────────────────────────────────────────
   `kelime-mapping.json` (bizim kelime id'si → quran.com kelime sırası) ölçüldü:
   1,7 MB. Eskiden KelimePopup onu doğrudan içe aktarıyordu, yani Kur'ân sayfası
   her açılışta bu tabloyu da ayrıştırıyordu. Artık ilk gerektiğinde yükleniyor
   (`eslemeYukle`) ve baloncuk açılır açılmaz önden isteniyor.

   ⚠ iOS: `play()` kullanıcı dokunuşunun İÇİNDE çağrılmalı; araya bir `await`
   girerse Safari sesi reddedebilir. Bu yüzden tablo hazırsa çalma EŞZAMANLI
   yapılıyor; hazır değilse (çok nadir — baloncuk açılınca önden yükleniyor)
   beklenip deneniyor, reddedilirse ikinci dokunuş çalışır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react"

const WBW_BASE = "https://audio.qurancdn.com/wbw"

let esleme = null
let eslemeSoz = null

export function eslemeYukle() {
  if (esleme) return Promise.resolve(esleme)
  if (!eslemeSoz) {
    eslemeSoz = import("./kelime-mapping.json")
      .then((m) => { esleme = m.default || m; return esleme })
      .catch((e) => { eslemeSoz = null; throw e })   // ağ hatası → sonra yeniden denensin
  }
  return eslemeSoz
}

// Bizim kelime id'miz → quran.com kelime sırası.
// NEDEN GEREKLİ: sesler quran.com'un kelime numaralarına göre dosyalanmış. Bizim
// bölünmemiz bazı yerlerde farklı (ör. Bakara 40'ta bizde "يَا" + "بَنٖي" iki
// kelime, onlarda tek); BİZİM sıramızla dosya istemek o âyette yanlış kelimeyi
// çaldırır. Eşleme varsa ondan okunur.
function eslenenSira(tablo, kelimeId) {
  if (!tablo || !kelimeId) return null
  const eslenen = tablo[kelimeId]
  if (!eslenen) return null
  const p = String(eslenen).split(":")
  const n = parseInt(p[2], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/* Sıra: önce eşleme tablosu (doğrusu bu), birleşik kelimede ilk üyenin eşlemesi,
   yoksa gelen konum. `tablo` verilmezse o an yüklü olan kullanılır. */
export function kelimeSirasi({ id, grupUyeleri, position } = {}, tablo = esleme) {
  const uyeler = Array.isArray(grupUyeleri) && grupUyeleri.length > 1 ? grupUyeleri : null
  return eslenenSira(tablo, id)
    || (uyeler ? eslenenSira(tablo, uyeler[0]) : null)
    || position
    || null
}

export function kelimeMp3(sureNo, ayetNo, sira) {
  const pos = sira && sira > 0 ? sira : 1
  const s = String(sureNo).padStart(3, "0")
  const a = String(ayetNo).padStart(3, "0")
  const k = String(pos).padStart(3, "0")
  return `${WBW_BASE}/${s}_${a}_${k}.mp3`
}

// ── TEK ÇALAR ────────────────────────────────────────────────────────────────
let calan = null            // { anahtar, audio }
const aboneler = new Set()
const bildir = () => { const a = calan ? calan.anahtar : null; aboneler.forEach((f) => f(a)) }

export function kelimeSesDurdur() {
  if (!calan) return
  try { calan.audio.pause() } catch { /* yoksay */ }
  calan = null
  bildir()
}

function baslat(anahtar, url) {
  kelimeSesDurdur()
  const audio = new Audio(url)
  const kayit = { anahtar, audio }
  calan = kayit
  const bitti = () => { if (calan === kayit) { calan = null; bildir() } }
  audio.addEventListener("ended", bitti)
  audio.addEventListener("error", bitti)
  bildir()
  const p = audio.play()
  if (p && p.catch) p.catch(bitti)
  return true
}

/* Kelimeyi çal. `anahtar` çalan kelimeyi tanımak için (düğmenin "durdur" hâli).
   Dönüş: çalma başladıysa true (tablo beklenirse söz). */
export function kelimeSesCal({ sureNo, ayetNo, kelime, anahtar }) {
  const ank = anahtar || `${sureNo}:${ayetNo}:${kelime?.id || kelime?.position || ""}`
  if (esleme) {
    const sira = kelimeSirasi(kelime)
    if (!sira) return false
    return baslat(ank, kelimeMp3(sureNo, ayetNo, sira))
  }
  // Tablo henüz yok: bekle, sonra dene (tablo hiç gelmezse konuma düşülür)
  return eslemeYukle()
    .catch(() => null)
    .then((t) => {
      const sira = kelimeSirasi(kelime, t)
      return sira ? baslat(ank, kelimeMp3(sureNo, ayetNo, sira)) : false
    })
}

/* Bu anahtarlı kelime şu an çalıyor mu — düğme simgesi için. */
export function useKelimeCaliyor(anahtar) {
  const [calanAnahtar, setCalanAnahtar] = useState(calan ? calan.anahtar : null)
  useEffect(() => {
    aboneler.add(setCalanAnahtar)
    return () => { aboneler.delete(setCalanAnahtar) }
  }, [])
  return !!anahtar && calanAnahtar === anahtar
}
