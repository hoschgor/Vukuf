/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — GEÇMİŞ (aramalar + okuma oturumları)
   src/data/gecmis.js

   Kullanıcı (4 Ekim 2026): "Ana menüde ayarlara 'Geçmiş' ayarı; aktifse Okuma
   Tefeülü'nün altında Geçmiş sayfası. Aramalar, okunan kısımlar, okuma süreleri
   ve tarihleri kaydedilsin; işlemlere köprü kurulsun — okumada başlangıç ya da
   bitiş seçilip oraya gidilsin. Ayar, kayıt varken kapatılırsa geçmişin
   silineceği söylensin; kapalıyken kayıt tutulmaz."

   ── KAYIT BİÇİMİ (localStorage "vukuf-gecmis", EN YENİ BAŞTA) ───────────────
     Arama : { id, tur: "arama", z, sorgu, ayrinti? }
     Okuma : { id, tur: "okuma", kaynak: "kuran"|"kitap", kitapId, baslik,
               z (başlangıç anı), son (son güncelleme), sure (sn),
               bas: { sayfa, oran, etiket, merkez? }, bitis: { ... } }
   Konumlar okuma ekranlarının DÖNÜŞ NOKTALARI ile aynı referansta ölçülüyor
   (bkz. donusNoktalari.js) → köprüyle gidince ekran aynı yerden açılır.

   ── OKUMA OTURUMU ─────────────────────────────────────────────────────────
   useOkumaGecmisi kancası okuma ekranı açıkken her 10 sn'de konumu ve süreyi
   yazar. Süre yalnız ETKİN zamanı sayar: sayfa görünür VE son 3 dk içinde
   kaydırma/dokunma olmuş (ya da ses çalıyor — dinlerken de okuma sayılır).
   Aynı esere 10 dk içinde dönülürse (arada başka esere bakılsa da) YENİ kayıt
   açılmaz, o eserin oturumu sürer ve listenin başına çıkar.
   2 sn'den kısa ve yerinden kıpırdamamış (yanlışlıkla açılmış) oturumlar atılır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react"

export const GECMIS_AYAR = "vukuf-gecmis-acik"
export const GECMIS_ANAHTAR = "vukuf-gecmis"
const EN_FAZLA = 400
const DEVAM_SURESI = 10 * 60 * 1000       // aynı esere bu süre içinde dönülürse oturum sürer
const BOSTA_SINIR = 3 * 60 * 1000         // bu kadar etkileşimsiz geçerse süre saymaz
const ARAMA_BIRLESTIR = 2 * 60 * 1000     // aynı arama bu süre içinde tekrarlanırsa tek kayıt

/* ── AYAR ─────────────────────────────────────────────────────────────────── */
const ayarAboneleri = new Set()
/* VARSAYILAN AÇIK (8 Ekim 2026, kullanıcı kararı). Hiç dokunulmamışsa (anahtar
   yok) açık sayılır; kullanıcı kapattıysa "0" yazılı olduğu için kapalı kalır. */
export function gecmisAcikMi() {
  try {
    const v = localStorage.getItem(GECMIS_AYAR)
    return v === null ? true : v === "1"
  } catch { return false }
}
/* Kapatınca geçmiş SİLİNİR (onayı arayüz alır). */
export function gecmisAyarla(acik) {
  try {
    localStorage.setItem(GECMIS_AYAR, acik ? "1" : "0")
    if (!acik) localStorage.removeItem(GECMIS_ANAHTAR)
  } catch { /* kota */ }
  for (const f of ayarAboneleri) f(!!acik)
  if (!acik) bildir([])
}
export function useGecmisAyari() {
  const [acik, setAcik] = useState(gecmisAcikMi)
  useEffect(() => {
    ayarAboneleri.add(setAcik)
    return () => { ayarAboneleri.delete(setAcik) }
  }, [])
  return [acik, gecmisAyarla]
}

/* ── LİSTE ────────────────────────────────────────────────────────────────── */
const listeAboneleri = new Set()
function bildir(liste) { for (const f of listeAboneleri) f(liste) }

export function gecmisOku() {
  try {
    const l = JSON.parse(localStorage.getItem(GECMIS_ANAHTAR) || "[]")
    return Array.isArray(l) ? l.filter(e => e && e.id && e.tur) : []
  } catch { return [] }
}
/* YAZ — depo doluysa (iOS'ta site başına ~5 MB) yazma SESSİZCE düşmesin:
   önce geçmiş kısaltılıp yeniden denenir, olmazsa hata teşhise yazılır ve
   Geçmiş sayfasında uyarı çıkar. */
let sonYazmaHatasi = null
function yaz(liste) {
  let kirpik = liste.slice(0, EN_FAZLA)
  const dene = (l) => {
    if (l.length) localStorage.setItem(GECMIS_ANAHTAR, JSON.stringify(l))
    else localStorage.removeItem(GECMIS_ANAHTAR)
  }
  try {
    dene(kirpik)
    sonYazmaHatasi = null
  } catch (e) {
    try {
      kirpik = kirpik.slice(0, 100)            // yer aç: en eski kayıtlar düşer
      dene(kirpik)
      sonYazmaHatasi = null
    } catch (e2) {
      sonYazmaHatasi = `${(e2 && e2.name) || "hata"}: ${(e2 && e2.message) || e}`
      teshisYaz("yazılamadı", sonYazmaHatasi, true)
    }
  }
  bildir(kirpik)
  return kirpik
}

/* ── TEŞHİS (4 Ekim 2026, "normal eserler kaydolmuyor") ───────────────────
   Okuma kancasının son durumu oturum deposunda tutuluyor; Geçmiş sayfasının
   altında küçük bir "Kayıt durumu" satırı olarak görünüyor. Böylece bir
   sorun olursa hangi adımda kaldığı (hazır değil / konum yok / yazılamadı)
   cihazdan okunabiliyor. */
const TESHIS_ANAHTAR = "vukuf-gecmis-teshis"
export function teshisYaz(olay, ayrinti = "", hata = false) {
  try { sessionStorage.setItem(TESHIS_ANAHTAR, JSON.stringify({ z: Date.now(), olay, ayrinti, hata: !!hata })) } catch { /* yoksay */ }
}
export function gecmisTeshisOku() {
  try { return JSON.parse(sessionStorage.getItem(TESHIS_ANAHTAR) || "null") } catch { return null }
}
/* localStorage'ın kabaca dolu boyutu (karakter × 2 bayt) */
export function depoBoyutu() {
  let t = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const a = localStorage.key(i) || ""
      t += (a.length + (localStorage.getItem(a) || "").length) * 2
    }
  } catch { /* yoksay */ }
  return t
}
export function useGecmis() {
  const [liste, setListe] = useState(gecmisOku)
  useEffect(() => {
    listeAboneleri.add(setListe)
    setListe(gecmisOku())
    return () => { listeAboneleri.delete(setListe) }
  }, [])
  return liste
}

const yeniId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function gecmisSil(idler) {
  const kume = new Set(idler)
  return yaz(gecmisOku().filter(e => !kume.has(e.id)))
}
export function gecmisTemizle() { return yaz([]) }
/* Silineni geri koy ("Geri al") — kayıtlar zamanlarına göre yerine oturur */
export function gecmisGeriKoy(kayitlar) {
  const mevcut = gecmisOku()
  const idler = new Set(mevcut.map(e => e.id))
  const birlesik = [...mevcut, ...kayitlar.filter(e => !idler.has(e.id))]
  birlesik.sort((a, b) => (b.son || b.z || 0) - (a.son || a.z || 0))
  return yaz(birlesik)
}

/* ── ARAMA ────────────────────────────────────────────────────────────────── */
export function gecmisAramaEkle(sorgu, ayrinti = "") {
  if (!gecmisAcikMi()) return
  const s = String(sorgu || "").trim()
  if (s.length < 2) return
  const liste = gecmisOku()
  const simdi = Date.now()
  const ilk = liste[0]
  // Az önceki aramanın devamı ya da düzeltmesiyse ("sab" → "sabır", "sabırr" →
  // "sabır") yeni kayıt açılmaz, o kayıt güncellenir.
  const yakin = ilk && ilk.tur === "arama" && simdi - ilk.z < ARAMA_BIRLESTIR
  const devami = yakin && (ilk.sorgu === s || s.startsWith(ilk.sorgu) || ilk.sorgu.startsWith(s))
  if (devami) {
    return yaz([{ ...ilk, sorgu: s, z: simdi, son: simdi, ayrinti: ayrinti || ilk.ayrinti }, ...liste.slice(1)])
  }
  return yaz([{ id: yeniId(), tur: "arama", z: simdi, son: simdi, sorgu: s, ayrinti }, ...liste])
}

/* ── OKUMA OTURUMU ────────────────────────────────────────────────────────── */
const ayniYer = (a, b) => !!a && !!b && a.sayfa === b.sayfa && Math.abs((a.oran || 0) - (b.oran || 0)) < 0.05

function oturumAc(kaynak, kitapId, baslik, k) {
  const liste = gecmisOku()
  const simdi = Date.now()
  // AYNI ESERİN en son kaydı yakın zamandaysa sürdür (4 Ekim 2026: arada başka
  // bir esere bakılmış olsa da — eskiden yalnız EN SON okuma kaydına bakılıyordu;
  // Sözler → Münkız → Sözler'de ikinci Sözler yeni ve kısa bir kayıt açıyor, o
  // da kısa diye atılıyordu: "kitaptan çıkıp girince kaydetmiyor").
  // Sürdürülen kayıt güncellenince listenin en üstüne çıkar.
  const son = liste.find(e => e.tur === "okuma" && e.kaynak === kaynak && e.kitapId === kitapId)
  if (son && simdi - (son.son || son.z) < DEVAM_SURESI) {
    return son.id
  }
  const kayit = {
    id: yeniId(), tur: "okuma", kaynak, kitapId, baslik,
    z: simdi, son: simdi, sure: 0, bas: { ...k }, bitis: { ...k },
  }
  yaz([kayit, ...liste])
  return kayit.id
}

function oturumGuncelle(id, k, ekSure) {
  if (!id || !gecmisAcikMi()) return
  const liste = gecmisOku()
  const i = liste.findIndex(e => e.id === id)
  if (i < 0) return                       // kullanıcı bu arada sildi → yeniden açma
  const e = liste[i]
  const yeni = { ...e, son: Date.now(), sure: Math.round((e.sure || 0) + ekSure), bitis: k ? { ...k } : e.bitis }
  // Güncellenen oturum en üste (en yeni) çıkar
  yaz([yeni, ...liste.slice(0, i), ...liste.slice(i + 1)])
}

function oturumKapat(id) {
  if (!id) return
  const liste = gecmisOku()
  const e = liste.find(x => x.id === id)
  // Kullanıcı: "kitap açıp kaparsam da listede görünmeli". Yalnız yanlışlıkla
  // dokunma sayılacak kadar kısa (2 sn altı) ve hiç kıpırdamamış oturum atılır.
  if (e && (e.sure || 0) < 2 && ayniYer(e.bas, e.bitis)) {
    yaz(liste.filter(x => x.id !== id))
    teshisYaz("çok kısa açılış, kaydedilmedi", e.baslik || "")
  }
}

/* Okuma ekranının kancası.
   hazir     : içerik açıldı ve ilk konum oturdu mu
   konumOku  : () => { sayfa, oran, etiket, merkez? } | null
   etkinMi   : () => bool — etkileşim olmasa da okuma sayılsın mı (ses çalıyor) */
export function useOkumaGecmisi({ hazir, kaynak, kitapId = null, baslik, konumOku, etkinMi }) {
  const r = useRef({})
  r.current.konumOku = konumOku
  r.current.etkinMi = etkinMi
  r.current.baslik = baslik
  useEffect(() => {
    const ad = `${kaynak}${kitapId ? ` · ${kitapId}` : ""}`
    if (!gecmisAcikMi()) return
    if (!hazir) { teshisYaz("ekran hazır değil", ad); return }
    teshisYaz("başladı", ad)
    let id = null
    let sonK = null
    let sonEtkinlik = Date.now()
    let sonTik = Date.now()
    const etkin = () => { sonEtkinlik = Date.now() }
    const OLAYLAR = ["scroll", "pointerdown", "keydown", "wheel", "touchstart"]
    OLAYLAR.forEach(o => document.addEventListener(o, etkin, { passive: true, capture: true }))

    const tik = () => {
      if (!gecmisAcikMi()) return
      const simdi = Date.now()
      const ara = Math.min(60, (simdi - sonTik) / 1000)
      sonTik = simdi
      const gorunur = typeof document === "undefined" || document.visibilityState === "visible"
      let ses = false
      try { ses = !!(r.current.etkinMi && r.current.etkinMi()) } catch { ses = false }
      const aktif = gorunur && (simdi - sonEtkinlik < BOSTA_SINIR || ses)
      let k = null
      let konumHatasi = ""
      try { k = r.current.konumOku ? r.current.konumOku() : null } catch (e) { k = null; konumHatasi = String((e && e.message) || e) }
      if (k && k.sayfa) sonK = k
      if (!sonK) { teshisYaz("konum okunamadı", `${ad}${konumHatasi ? ` · ${konumHatasi}` : ""}`, true); return }
      if (!id) id = oturumAc(kaynak, kitapId, r.current.baslik, sonK)
      oturumGuncelle(id, sonK, aktif ? ara : 0)
      if (!sonYazmaHatasi) teshisYaz("kaydedildi", `${r.current.baslik} · ${sonK.etiket || `s. ${sonK.sayfa}`}`)
    }
    // İlk ölçüm açılıştaki hizalama oturduktan sonra (kayıt listede hemen görünsün)
    const ilk = setTimeout(tik, 1200)
    const aralik = setInterval(tik, 10000)
    const gorunurluk = () => { if (document.visibilityState === "hidden") tik() }
    document.addEventListener("visibilitychange", gorunurluk)
    return () => {
      clearTimeout(ilk)
      clearInterval(aralik)
      document.removeEventListener("visibilitychange", gorunurluk)
      OLAYLAR.forEach(o => document.removeEventListener(o, etkin, { capture: true }))
      tik()
      oturumKapat(id)
    }
  }, [hazir, kaynak, kitapId])
}

/* ── KÖPRÜLER (Geçmiş sayfasından) ─────────────────────────────────────────
   Hedefler okuma ekranlarının zaten okuduğu localStorage anahtarlarıyla
   devrediliyor; "vukuf-donus" = "gecmis" → varılan ekranda "Geçmiş'e dön". */
export const OKUMA_HEDEF_ANAHTAR = "vukuf-okuma-hedef"
export const ARAMA_BASLAT_ANAHTAR = "vukuf-arama-baslat"

export function gecmisKopruHazirla(kayit, uc) {
  try {
    if (kayit.tur === "arama") {
      // "vukuf-donus" BURADA YAZILMAZ: Arama ekranı onu okumuyor; yazılsaydı
      // sonra açılan bir okuma ekranında yersiz "Geçmiş'e dön" çıkardı. Arama
      // ekranı bu anahtarı okuyup sorguyu doldurur ve kendi dönüş düğmesini gösterir.
      localStorage.setItem(ARAMA_BASLAT_ANAHTAR, kayit.sorgu)
      return "/arama"
    }
    localStorage.setItem("vukuf-donus", "gecmis")
    const k = uc === "bas" ? kayit.bas : kayit.bitis
    if (kayit.kaynak === "kuran") {
      localStorage.setItem("vukuf-kuran-hedef", JSON.stringify({ sayfa: k.sayfa, oran: k.oran || 0 }))
      return "/kuran"
    }
    localStorage.setItem(OKUMA_HEDEF_ANAHTAR, JSON.stringify({ kitapId: kayit.kitapId, sayfa: k.sayfa, oran: k.oran || 0, merkez: !!k.merkez }))
    return `/kitap/${kayit.kitapId}`
  } catch { return null }
}
