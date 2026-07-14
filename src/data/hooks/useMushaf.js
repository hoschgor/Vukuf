/**
 * buildSayfaElemanlari
 * ────────────────────
 * Konum: src/data/hooks/useMushaf.js
 *
 * kuran-mushaf.json ve sayfa-harita.json verilerini alır,
 * her sayfa için MushafSayfa'nın beklediği eleman listesini üretir.
 *
 * Dönüş:
 *   Map<sayfaNo, eleman[]>
 *
 * Eleman tipleri:
 *   { tip: "sure-baslik", sure }
 *   { tip: "besmele", sure }
 *   { tip: "kelime", sure, ayet, kelime }
 *   { tip: "ayet-sonu", sure, ayet }
 */

import { useMemo } from "react"

// Besmele gösterilmeyecek sureler
const BESMELE_YOK = new Set([1, 9])

/**
 * Hook versiyonu — bileşen içinde kullanılır
 *
 * Kullanım:
 *   const { sayfaMap, sureler, toplamSayfa } = useMushaf(mushafData, sayfaHarita)
 */
export function useMushaf(mushafData, sayfaHarita) {
  return useMemo(() => {
    if (!mushafData?.length || !sayfaHarita?.length) {
      return { sayfaMap: new Map(), sureler: [], toplamSayfa: 0 }
    }
    return buildMushaf(mushafData, sayfaHarita)
  }, [mushafData, sayfaHarita])
}

/**
 * Saf fonksiyon versiyonu
 */
export function buildMushaf(mushafData, sayfaHarita) {
  // Her ayet için sayfa numarasını bul
  // sayfa-harita: [{ sayfa, sure, ayet }, ...]
  // Bir ayetin sayfası = o ayetin başladığı veya önceki sayfa başının sayfası
  const ayetSayfaMap = new Map()

  // Haritayı indeksle
  const haritaSirali = [...sayfaHarita].sort((a, b) =>
    a.sure !== b.sure ? a.sure - b.sure : a.ayet - b.ayet
  )

  // Her sure için sayfa başlarını bul
  mushafData.forEach(sure => {
    sure.ayetler.forEach(ayet => {
      // Bu ayetin sayfasını bul: en yakın sayfa başını geç
      let sayfa = 1
      for (const h of haritaSirali) {
        if (h.sure > sure.id || (h.sure === sure.id && h.ayet > ayet.no)) break
        sayfa = h.sayfa
      }
      ayetSayfaMap.set(`${sure.id}:${ayet.no}`, sayfa)
    })
  })

  // Sayfa bazlı eleman listesi oluştur
  const sayfaMap = new Map()

  mushafData.forEach(sure => {
    let oncekiSayfa = null

    sure.ayetler.forEach(ayet => {
      const sayfaNo = ayetSayfaMap.get(`${sure.id}:${ayet.no}`)

      if (!sayfaMap.has(sayfaNo)) {
        sayfaMap.set(sayfaNo, [])
      }
      const elemanlar = sayfaMap.get(sayfaNo)

      // Sayfa veya sure değişince başlık/besmele ekle
      if (sayfaNo !== oncekiSayfa || ayet.no === 1) {
        // Sure başlığı — sadece ilk ayette
        if (ayet.no === 1) {
          elemanlar.push({ tip: "sure-baslik", sure })

          // Besmele — 1 ve 9 hariç
          if (!BESMELE_YOK.has(sure.id)) {
            elemanlar.push({ tip: "besmele", sure })
          }
        }
      }

      // Kelimeleri ekle
      ayet.kelimeler.forEach(kelime => {
        if (kelime.arabic === "۞") return  // hizb işareti — metin değil, süsleme
        elemanlar.push({ tip: "kelime", sure, ayet, kelime })
      })

      // Ayet sonu işareti ﴿١﴾
      elemanlar.push({ tip: "ayet-sonu", sure, ayet })

      oncekiSayfa = sayfaNo
    })
  })

  // Sure başlığı/besmele sayfa başına taşı
  // Eğer bir surenin 1. ayeti yeni sayfada başlıyorsa başlık zaten doğru yerde
  // Ama önceki sayfanın son elemanları sure-baslik/besmele ise sorun yok

  const toplamSayfa = Math.max(...sayfaMap.keys())

  // sure listesi (navigasyon için)
  const sureler = mushafData.map(s => ({
    id: s.id,
    isim: s.isim,
    isimArapca: s.isimArapca,
    anlam: s.anlam,
    yer: s.yer,
    ayetSayisi: s.ayetSayisi,
  }))

  return { sayfaMap, sureler, toplamSayfa }
}

/**
 * Bir surenin hangi sayfada başladığını bul
 */
export function sureBaslangicSayfasi(sureId, sayfaMap) {
  for (const [sayfaNo, elemanlar] of sayfaMap) {
    const var_ = elemanlar.some(
      el => el.tip === "sure-baslik" && el.sure.id === sureId
    )
    if (var_) return sayfaNo
  }
  return 1
}

/**
 * Bir ayetin hangi sayfada olduğunu bul
 */
export function ayetSayfasi(sureId, ayetNo, sayfaMap) {
  for (const [sayfaNo, elemanlar] of sayfaMap) {
    const var_ = elemanlar.some(
      el => el.tip === "ayet-sonu" &&
            el.sure.id === sureId &&
            el.ayet.no === ayetNo
    )
    if (var_) return sayfaNo
  }
  return 1
}