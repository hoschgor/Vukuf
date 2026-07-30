/**
 * buildSayfaElemanlari
 * ────────────────────
 * Konum: src/data/hooks/useMushaf.js
 */

import { useMemo } from "react"

const BESMELE_YOK = new Set([1, 9])

export function useMushaf(mushafData, sayfaHarita) {
  return useMemo(() => {
    if (!mushafData?.length || !sayfaHarita?.length) {
      return { sayfaMap: new Map(), sureler: [], toplamSayfa: 0, sureSayfaLookup: new Map(), ayetSayfaLookup: new Map() }
    }
    return buildMushaf(mushafData, sayfaHarita)
  }, [mushafData, sayfaHarita])
}

export function buildMushaf(mushafData, sayfaHarita) {
  const ayetSayfaMap = new Map()

  const haritaSirali = [...sayfaHarita].sort((a, b) =>
    a.sure !== b.sure ? a.sure - b.sure : a.ayet - b.ayet
  )

  mushafData.forEach(sure => {
    sure.ayetler.forEach(ayet => {
      let sayfa = 1
      for (const h of haritaSirali) {
        if (h.sure > sure.id || (h.sure === sure.id && h.ayet > ayet.no)) break
        sayfa = h.sayfa
      }
      ayetSayfaMap.set(`${sure.id}:${ayet.no}`, sayfa)
    })
  })

  const sayfaMap = new Map()

  mushafData.forEach(sure => {
    sure.ayetler.forEach(ayet => {
      const sayfaNo = ayetSayfaMap.get(`${sure.id}:${ayet.no}`)

      if (!sayfaMap.has(sayfaNo)) {
        sayfaMap.set(sayfaNo, [])
      }
      const elemanlar = sayfaMap.get(sayfaNo)
      
      if (ayet.no === 1) {
        elemanlar.push({ tip: "sure-baslik", sure })
        if (!BESMELE_YOK.has(sure.id)) {
          elemanlar.push({ tip: "besmele", sure })
        }
      }
     
      ayet.kelimeler.forEach(kelime => {
        if (!kelime.arabic.trim()) return
        elemanlar.push({ tip: "kelime", sure, ayet, kelime })
      })

      elemanlar.push({ tip: "ayet-sonu", sure, ayet })

      // Sure son ayeti ise sure-sonu ekle
      if (ayet.no === sure.ayetler[sure.ayetler.length - 1].no) {
        elemanlar.push({ tip: "sure-sonu", sure })
      }
      
    })
  })
  
  
  const toplamSayfa = Math.max(...sayfaMap.keys())

  const sureler = mushafData.map(s => ({
    id: s.id,
    isim: s.isim,
    isimArapca: s.isimArapca,
    anlam: s.anlam,
    yer: s.yer,
    ayetSayisi: s.ayetSayisi,
  }))

  const sureSayfaLookup = new Map()
  const ayetSayfaLookup = new Map()

  for (const [sayfaNo, elemanlar] of sayfaMap) {
    for (const el of elemanlar) {
      if (el.tip === 'sure-baslik' && !sureSayfaLookup.has(el.sure.id)) {
        sureSayfaLookup.set(el.sure.id, sayfaNo)
      }
      if (el.tip === 'ayet-sonu') {
        ayetSayfaLookup.set(`${el.sure.id}:${el.ayet.no}`, sayfaNo)
      }
    }
  }

  return { sayfaMap, sureler, toplamSayfa, sureSayfaLookup, ayetSayfaLookup }
}

export function sureBaslangicSayfasi(sureId, sureSayfaLookup) {
  return sureSayfaLookup.get(sureId) || 1
}

export function ayetSayfasi(sureId, ayetNo, ayetSayfaLookup) {
  return ayetSayfaLookup.get(`${sureId}:${ayetNo}`) || 1
}