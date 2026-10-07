/* VUKUF — MEAL & İZLEME AYARLARI (ortak küçük depo)
   src/data/izlemeAyar.js

   Meal popup'ı ile izleme modu AYNI ayar panelini paylaşıyor; ayarı iki bileşenin
   ayrı ayrı tutması, birinde değişenin öbüründe görünmemesi demekti. Burada tek
   kopya duruyor, değişince abone olan bileşenler birlikte yenileniyor. */

import { useEffect, useState, useCallback } from "react"

const ANAHTAR = "vukuf-izleme-ayar"

export const VARSAYILAN = {
  meal: {
    konum: "alt",        // "ust" | "orta" | "alt"
    genislik: "orta",    // "dar" | "orta" | "genis"
    yaziBoyu: 14,        // px
    olcek: 1,            // MEAL PENCERESİ BOYUTU (KuranOkuma → Ayarlar): 0.85–1.6, pencerenin tamamı
    kaydir: 0,           // sürükleyerek yapılan ince ayar (px)
    hat: true,           // sûre adını hat fontuyla göster
    sus: "dal",          // pencere süsü: "dal" (saran dallar) | "tezhip" (köşe rozetleri + şemse)
  },
  izleme: {
    arka: "zumrut",
    cerceve: "ince",
    karartma: "orta",
    meal: true,          // tam ekranda mealı da göster
    gizliDugme: false,   // düğmeleri gizle, her şey hareketle (sürükle/dokun)
    ozelGorsel: null,    // ESKİ: galeriden seçilen tek resim (dataURL) — açılışta galeriye taşınır
    // ── Hareketli sahne (7 Ekim 2026) — seçenekler data/izlemeSahne.js'te ──
    hareket: "gezinti",  // sabit | gezinti | nefes | kaydir | akis
    hiz: "yavas",        // yavas | orta | hizli
    hava: "yok",         // yok | kar | tipi | yagmur | ruzgar | yaprak | yildiz | atesbocegi | toz
    isik: "yok",         // yok | huzme | nur | sis | bokeh
    galeri: [],          // galeriden seçilen resimlerin kimlikleri (IndexedDB, data/izlemeGaleri.js)
    slaytSure: 15,       // sn — 2+ resimde her resmin ekranda kalma süresi
    slaytGecis: "solma", // solma | yakinlas | kayma | silme | daire | perde | karisik
    // ── Renkler (8 Ekim 2026) ──
    yaziRengi: null,     // null = otomatik (koyu zeminde açık, açıkta koyu) | "#rrggbb"
    isaretRenk: "kapali",// vakıf vb. işaretler: kapali | mushaf | vurgu | ozel
    isaretOzel: "#e0503c",
  },
}

const birlestir = (d) => ({
  meal:   { ...VARSAYILAN.meal,   ...(d && d.meal) },
  izleme: { ...VARSAYILAN.izleme, ...(d && d.izleme) },
})

let bellek = null
const aboneler = new Set()

export function ayarOku() {
  if (bellek) return bellek
  try { bellek = birlestir(JSON.parse(localStorage.getItem(ANAHTAR) || "{}")) }
  catch { bellek = birlestir(null) }
  return bellek
}

/* bolum: "meal" | "izleme" — yalnız o bölümün verilen alanları değişir. */
export function ayarYaz(bolum, parca) {
  const simdi = ayarOku()
  bellek = { ...simdi, [bolum]: { ...simdi[bolum], ...parca } }
  try { localStorage.setItem(ANAHTAR, JSON.stringify(bellek)) } catch { /* kota dolu olabilir */ }
  for (const f of aboneler) f(bellek)
  return bellek
}

export function useIzlemeAyar() {
  const [ayar, setAyar] = useState(ayarOku)
  useEffect(() => {
    aboneler.add(setAyar)
    return () => { aboneler.delete(setAyar) }
  }, [])
  const guncelle = useCallback((bolum, parca) => { ayarYaz(bolum, parca) }, [])
  return [ayar, guncelle]
}
