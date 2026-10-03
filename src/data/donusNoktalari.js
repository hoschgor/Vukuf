/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — DÖNÜŞ NOKTALARI (geri dönüş listesi)
   src/data/donusNoktalari.js

   Kullanıcı (3 Ekim 2026): "İçindekiler'den ya da arama bölümünden bir yere
   gidilirse geri dön düğmesi olsun; birden fazla yere gidilirse geri dönme
   listesi gibi bir şey yapalım. Ayarlarda bu kısım aktifse."

   ── NASIL ────────────────────────────────────────────────────────────────────
   Bir ATLAMADAN hemen önce (İçindekiler, arama sonucu, sayfaya git, işaret…)
   okunan yer bir "dönüş noktası" olarak yığına konuyor. "Geri dön" en son
   noktaya götürüyor; liste açılınca daha eskilerine de gidilebiliyor. Bir
   noktaya dönülünce o nokta ve ondan SONRAKİLER listeden düşüyor (tarayıcının
   geri düğmesi gibi).

   • Kur'ân ve her kitap için AYRI liste (kapsam: "kuran", "okuma-<kitapId>").
   • Liste sessionStorage'da: Arama ekranına gidip dönünce, sayfa yenilenince
     duruyor; uygulama kapanınca temizleniyor — dünkü atlamalar bugün kafa
     karıştırmasın. Yedeğe de girmiyor (yedek yalnız localStorage'ı alır).
   • Aynı yere art arda bırakılan nokta çoğalmıyor, en fazla 12 nokta tutuluyor.
   • Ayar ("Dönüş noktaları") localStorage'da, iki okuma ekranında ORTAK.
     Varsayılan AÇIK.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react"

export const DONUS_AYAR_ANAHTAR = "vukuf-donus-noktalari"
const LISTE_ONEK = "vukuf-donus-liste-"
const EN_FAZLA = 12
const AYNI_YER_ORAN = 0.15        // aynı sayfada bu kadar yakınsa "aynı yer"

/* Kaynak adları — listede noktanın nereden ayrılındığını gösteriyor */
export const KAYNAK_ADI = {
  icindekiler: "İçindekiler",
  arama: "Arama",
  sayfa: "Sayfaya git",
  isaret: "İşaret",
  ornek: "Örnek âyet",
}

const aboneler = new Set()

export function donusAcikMi() {
  try { return localStorage.getItem(DONUS_AYAR_ANAHTAR) !== "0" } catch { return true }
}

export function donusAyarla(acik) {
  try { localStorage.setItem(DONUS_AYAR_ANAHTAR, acik ? "1" : "0") } catch { /* kota */ }
  for (const f of aboneler) f(!!acik)
}

/* Ayar kancası — iki ekranın ayar panelinde de aynı değer, anında eşleşir */
export function useDonusAyari() {
  const [acik, setAcik] = useState(donusAcikMi)
  useEffect(() => {
    aboneler.add(setAcik)
    return () => { aboneler.delete(setAcik) }
  }, [])
  return [acik, donusAyarla]
}

export function noktalariOku(kapsam) {
  try {
    const l = JSON.parse(sessionStorage.getItem(LISTE_ONEK + kapsam) || "[]")
    return Array.isArray(l) ? l.filter(n => n && n.sayfa) : []
  } catch { return [] }
}

function yaz(kapsam, liste) {
  try {
    if (liste.length) sessionStorage.setItem(LISTE_ONEK + kapsam, JSON.stringify(liste))
    else sessionStorage.removeItem(LISTE_ONEK + kapsam)
  } catch { /* kota / özel mod */ }
  return liste
}

const ayniYer = (a, b) => !!a && !!b && a.sayfa === b.sayfa &&
  Math.abs((a.oran || 0) - (b.oran || 0)) < AYNI_YER_ORAN

/* Nokta bırak. `hedef` ({ sayfa, oran? }) verilirse ve atlama aynı yere
   gidiyorsa nokta bırakılmaz (ör. zaten okunan sûreye İçindekiler'den gitmek). */
export function noktaEkle(kapsam, nokta, hedef = null) {
  const liste = noktalariOku(kapsam)
  if (!nokta || !nokta.sayfa) return liste
  if (hedef && hedef.sayfa === nokta.sayfa && (hedef.oran == null || ayniYer(hedef, nokta))) return liste
  const son = liste[liste.length - 1]
  const temel = ayniYer(son, nokta) ? liste.slice(0, -1) : liste
  return yaz(kapsam, [...temel, { ...nokta, z: Date.now() }].slice(-EN_FAZLA))
}

/* i. noktaya dönüldü: o nokta ve sonrakiler düşer */
export function noktayaKadarSil(kapsam, i) {
  return yaz(kapsam, noktalariOku(kapsam).slice(0, Math.max(0, i)))
}

export function noktalariTemizle(kapsam) {
  return yaz(kapsam, [])
}
