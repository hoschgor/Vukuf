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
 */
export function useMushaf(mushafData, sayfaHarita) {
  return useMemo(() => {
    // Veri kontrolü
    if (!mushafData?.length) {
      console.warn('⚠️ useMushaf: mushafData boş')
      return { sayfaMap: new Map(), sureler: [], toplamSayfa: 0 }
    }
    
    if (!sayfaHarita?.length) {
      console.warn('⚠️ useMushaf: sayfaHarita boş')
      return { sayfaMap: new Map(), sureler: [], toplamSayfa: 0 }
    }

    console.log('🔍 useMushaf başladı:', {
      mushafLength: mushafData.length,
      haritaLength: sayfaHarita.length,
      ilkSure: mushafData[0]?.isim,
    })

    const result = buildMushaf(mushafData, sayfaHarita)
    
    console.log('✅ useMushaf tamamlandı:', {
      sayfaMapSize: result.sayfaMap.size,
      toplamSayfa: result.toplamSayfa,
      surelerLength: result.sureler.length,
    })
    
    return result
  }, [mushafData, sayfaHarita])
}

/**
 * Saf fonksiyon versiyonu
 */
export function buildMushaf(mushafData, sayfaHarita) {
  // ── 1. Her ayet için sayfa numarasını bul ──
  const ayetSayfaMap = new Map()

  // Haritayı indeksle - sayfaHarita format: [{ sayfa: 1, sure: 1, ayet: 1 }, ...]
  const haritaSirali = [...sayfaHarita].sort((a, b) => {
    if (a.sure !== b.sure) return a.sure - b.sure
    return a.ayet - b.ayet
  })

  // Debug: İlk 5 harita girişi
  console.log('📄 sayfaHarita ilk 5:', haritaSirali.slice(0, 5))

  // Her sure ve ayet için sayfa numarasını ata
  mushafData.forEach(sure => {
    if (!sure.ayetler) {
      console.warn(`⚠️ Sure ${sure.id} için ayetler bulunamadı`)
      return
    }

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

  console.log('📊 ayetSayfaMap size:', ayetSayfaMap.size)

  // ── 2. Sayfa bazlı eleman listesi oluştur ──
  const sayfaMap = new Map()

  mushafData.forEach(sure => {
    if (!sure.ayetler) return

    sure.ayetler.forEach(ayet => {
      const sayfaNo = ayetSayfaMap.get(`${sure.id}:${ayet.no}`)
      
      if (!sayfaNo) {
        console.warn(`⚠️ Ayet ${sure.id}:${ayet.no} için sayfa bulunamadı`)
        return
      }

      // Sayfa için Map'e ekle
      if (!sayfaMap.has(sayfaNo)) {
        sayfaMap.set(sayfaNo, [])
      }
      const elemanlar = sayfaMap.get(sayfaNo)

      // ── Sure başlığı ve Besmele ──
      // Sayfa başlangıcı veya ayet 1 ise
      if (ayet.no === 1) {
        // Sadece bu sayfada yoksa ekle
        const baslikVar = elemanlar.some(el => el.tip === "sure-baslik")
        if (!baslikVar) {
          elemanlar.push({ tip: "sure-baslik", sure })
          
          // Besmele - Tevbe suresi hariç
          if (!BESMELE_YOK.has(sure.id)) {
            const besmeleVar = elemanlar.some(el => el.tip === "besmele")
            if (!besmeleVar) {
              elemanlar.push({ tip: "besmele", sure })
            }
          }
        }
      }

      // ── Kelimeler ──
      if (ayet.kelimeler && ayet.kelimeler.length > 0) {
        ayet.kelimeler.forEach(kelime => {
          elemanlar.push({ 
            tip: "kelime", 
            sure, 
            ayet, 
            kelime: {
              ...kelime,
              // Varsa vakıf ve secde bilgilerini koru
              vakif: kelime.vakif || null,
              secde: kelime.secde || false,
            }
          })
        })
      } else {
        console.warn(`⚠️ Ayet ${sure.id}:${ayet.no} için kelime bulunamadı`)
      }

      // ── Ayet sonu işareti ──
      elemanlar.push({ tip: "ayet-sonu", sure, ayet })
    })
  })

  // ── 3. Sayfa numaralarını sırala ──
  const sayfaNolari = [...sayfaMap.keys()].sort((a, b) => a - b)
  const toplamSayfa = sayfaNolari.length > 0 ? Math.max(...sayfaNolari) : 0

  console.log('📚 Oluşturulan sayfalar:', sayfaNolari.slice(0, 10))

  // ── 4. Sure listesi (navigasyon için) ──
  const sureler = mushafData.map(s => ({
    id: s.id,
    isim: s.isim,
    isimArapca: s.isimArapca || '',
    anlam: s.anlam || '',
    yer: s.yer || '',
    ayetSayisi: s.ayetSayisi || s.ayetler?.length || 0,
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