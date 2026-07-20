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

function cezmEkle(arabic) {
        const HAREKELER = new Set([
          0x064B, 0x064C, 0x064D, // tenvin
          0x064E, 0x064F, 0x0650, // fetha, damme, kesre
          0x0651, 0x0652,          // şedde, cezm
          0x0653, 0x0654, 0x0655, // medde, hemze
          0x0656, 0x0657, 0x0658, // Uthmani özel fetha/damme/işaretler
          0x065C, 0x065D, 0x065E, 0x065F, // Uthmani küçük harekeler
          0x06E1,                  // ۡ küçük cezm
          0x06ED,                  // küçük mim
        ])
        const UZUN_SESLI = new Set([0x0627,0x0671,0x0622,0x0623,0x0625,0x0648,0x064A,0x0649,0x0621,0x0624,0x0626])
        const UNSUZ = (cp) => !UZUN_SESLI.has(cp) && !HAREKELER.has(cp) &&
          (cp >= 0x0621 && cp <= 0x063A || cp >= 0x0641 && cp <= 0x064A)
        const chars = [...arabic].map(c => c.codePointAt(0))
        const result = []
        for (let i = 0; i < chars.length; i++) {
          const cp = chars[i]
          result.push(cp)
          if (!UNSUZ(cp)) continue
          const s1 = chars[i+1]
          const s2 = chars[i+2]
          const s3 = chars[i+3]
          if (s1 === 0x0651) continue
          if (s1 && HAREKELER.has(s1)) continue
          if (cp === 0x0644) {
            if (s1 && UNSUZ(s1) && s2 === 0x0651) continue
            if (s1 && UNSUZ(s1) && s2 && HAREKELER.has(s2) && s3 === 0x0651) continue
          }
          result.push(0x0652)
        }
        return result.map(cp => String.fromCodePoint(cp)).join('')
      }

const BAGIMSIZ_ISARETLER = new Set([
  "\u06DE", // ۞ hizb
  "\u06E9", // ۩ secde
  "\u06D6", // ۖ
  "\u06D7", // ۗ
  "\u06D8", // ۘ
  "\u06D9", // ۙ
  "\u06DA", // ۚ
  "\u06DB", // ۛ
  "\u06DC", // ۜ
  "\u06DD", // ۝ ayet sonu
  "\u06DF", // ۟
  "\u06E0", // ۠
])


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
        if (BAGIMSIZ_ISARETLER.has(kelime.arabic.trim())) return
        const temizArapca = kelime.arabic
        .replace(/(\u0648\u0627)\u0652/g, '$1')
        .replace(/[\u06DE\u06E9\u06D6\u06D7\u06D8\u06D9\u06DA\u06DB\u06DC\u06DD\u06DF\u06E0\u06ED]/g, '')
        .replace(/[\u0627\u0671]\u0652/g, match => match.replace('\u0652', ''))
        .replace(/\u0671/g, '\u0627')
        .replace(/(?<=[أُإِآ])و\u0652/g, '\u0648')

      if (!temizArapca.trim()) return

        const cezmliArapca = cezmEkle(temizArapca)
        elemanlar.push({ tip: "kelime", sure, ayet, kelime: { ...kelime, arabic: cezmliArapca } })
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