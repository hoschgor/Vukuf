/* VUKUF — MEAL & İZLEME AYARLARI (ortak küçük depo)
 *  src/data/izlemeAyar.js
 *
 *  Meal popup'ı ile izleme modu AYNI ayar panelini paylaşıyor; ayarı iki bileşenin
 *  ayrı ayrı tutması, birinde değişenin öbüründe görünmemesi demekti. Burada tek
 *  kopya duruyor, değişince abone olan bileşenler birlikte yenileniyor. */

import { useEffect, useState, useCallback } from "react"

const ANAHTAR = "vukuf-izleme-ayar"

export const VARSAYILAN = {
  meal: {
    konum: "alt",        // "ust" | "orta" | "alt"
    genislik: "orta",    // "dar" | "orta" | "genis"
    yaziBoyu: 14,        // px
    kaydir: 0,           // sürükleyerek yapılan ince ayar (px)
    hat: true,           // sûre adını hat fontuyla göster
  },
  izleme: {
    arka: "zumrut",
    cerceve: "ince",
    karartma: "orta",
    meal: true,          // tam ekranda mealı da göster
    gizliDugme: false,   // düğmeleri gizle, her şey hareketle (sürükle/dokun)
    ozelGorsel: null,    // galeriden seçilen (dataURL)
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
