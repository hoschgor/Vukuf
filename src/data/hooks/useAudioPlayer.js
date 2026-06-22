import { useState, useEffect, useRef, useCallback } from "react"

// Mevcut karilar — everyayah.com'daki klasör adları
export const KARILAR = [
  { id: "Alafasy_128kbps",        label: "Mishary Alafasy" },
  { id: "Husary_128kbps",         label: "Mahmoud Khalil Husary" },
  { id: "Minshawi_128kbps",       label: "Mohamed Siddiq Minshawi" },
  { id: "Abdul_Basit_128kbps",    label: "Abdulbasit Abdussamad" },
  { id: "Sudais_128kbps",         label: "Abdurrahman es-Sudeys" },
  { id: "Ghamadi_40kbps",         label: "Saad el-Gamidi" },
]

const BASE_URL = "https://everyayah.com/data"

// URL üretici: sure ve ayet numarasını 3 basamaklı stringe çevirir
// Örnek: sure=2, ayet=1 → "002001.mp3"
function mp3Url(kariId, sureNo, ayetNo) {
  const s = String(sureNo).padStart(3, "0")
  const a = String(ayetNo).padStart(3, "0")
  return `${BASE_URL}/${kariId}/${s}${a}.mp3`
}

// Besmele için özel URL (sure=1, ayet=1 her zaman)
function besmeleUrl(kariId) {
  return mp3Url(kariId, 1, 1)
}

export default function useAudioPlayer() {
  const audioRef = useRef(null)
  const kuyrukRef = useRef([])       // { sureNo, ayetNo } dizisi
  const kuyrukIndisRef = useRef(0)

  const [kariId, setKariId] = useState(
    () => localStorage.getItem("vukuf-kari") || "Alafasy_128kbps"
  )
  const [durum, setDurum] = useState("kapali") // "caliyor" | "duraklatildi" | "kapali"
  const [aktifAyet, setAktifAyet] = useState(null) // { sureNo, ayetNo }
  const [hata, setHata] = useState(null)

  // Kari değişince kaydet
  useEffect(() => {
    localStorage.setItem("vukuf-kari", kariId)
  }, [kariId])

  // Audio nesnesi bir kez oluşturulur
  useEffect(() => {
    const audio = new Audio()
    audio.preload = "auto"
    audioRef.current = audio

    audio.addEventListener("ended", () => {
      sonrakiAyetCal()
    })

    audio.addEventListener("error", () => {
      setHata("Ses yüklenemedi")
      setDurum("kapali")
    })

    return () => {
      audio.pause()
      audio.src = ""
    }
  }, [])

  // Kari değişince mevcut ses durdurulur
  useEffect(() => {
    if (audioRef.current && durum !== "kapali") {
      durdur()
    }
  }, [kariId])

  // Sıradaki ayeti çal
  const sonrakiAyetCal = useCallback(() => {
    const kuyruk = kuyrukRef.current
    const indis = kuyrukIndisRef.current + 1

    if (indis >= kuyruk.length) {
      // Kuyruk bitti
      setDurum("kapali")
      setAktifAyet(null)
      kuyrukIndisRef.current = 0
      kuyrukRef.current = []
      return
    }

    kuyrukIndisRef.current = indis
    const { sureNo, ayetNo } = kuyruk[indis]
    _ayetOynat(sureNo, ayetNo)
  }, [])

  // Doğrudan bir ayeti oynat (internal)
  const _ayetOynat = useCallback((sureNo, ayetNo) => {
    const audio = audioRef.current
    if (!audio) return

    setHata(null)
    const url = mp3Url(kariId, sureNo, ayetNo)
    audio.src = url
    audio.play()
      .then(() => {
        setDurum("caliyor")
        setAktifAyet({ sureNo, ayetNo })
      })
      .catch(() => {
        setHata("Oynatma başlatılamadı")
        setDurum("kapali")
      })
  }, [kariId])

  // ── Dışarıya açık fonksiyonlar ──────────────────────────────────

  // Tek bir ayeti çal
  const ayetCal = useCallback((sureNo, ayetNo) => {
    kuyrukRef.current = [{ sureNo, ayetNo }]
    kuyrukIndisRef.current = 0
    _ayetOynat(sureNo, ayetNo)
  }, [_ayetOynat])

  // Bir surenin tamamını çal (başlangıç ayeti belirtilebilir)
  const sureCal = useCallback((sureNo, toplamAyetSayisi, baslangicAyet = 1) => {
    const kuyruk = []
    for (let a = baslangicAyet; a <= toplamAyetSayisi; a++) {
      kuyruk.push({ sureNo, ayetNo: a })
    }
    kuyrukRef.current = kuyruk
    kuyrukIndisRef.current = 0
    const { sureNo: s, ayetNo: a } = kuyruk[0]
    _ayetOynat(s, a)
  }, [_ayetOynat])

  // Besmeleyi çal
  const besmeleCal = useCallback(() => {
    kuyrukRef.current = [{ sureNo: 1, ayetNo: 1 }]
    kuyrukIndisRef.current = 0
    _ayetOynat(1, 1)
  }, [_ayetOynat])

  // Duraklat
  const duraklat = useCallback(() => {
    const audio = audioRef.current
    if (!audio || durum !== "caliyor") return
    audio.pause()
    setDurum("duraklatildi")
  }, [durum])

  // Devam et
  const devamEt = useCallback(() => {
    const audio = audioRef.current
    if (!audio || durum !== "duraklatildi") return
    audio.play()
      .then(() => setDurum("caliyor"))
      .catch(() => setDurum("kapali"))
  }, [durum])

  // Durdur ve kapat
  const durdur = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.src = ""
    kuyrukRef.current = []
    kuyrukIndisRef.current = 0
    setDurum("kapali")
    setAktifAyet(null)
    setHata(null)
  }, [])

  // Önceki ayet
  const oncekiAyet = useCallback(() => {
    const indis = kuyrukIndisRef.current - 1
    if (indis < 0) return
    kuyrukIndisRef.current = indis
    const { sureNo, ayetNo } = kuyrukRef.current[indis]
    _ayetOynat(sureNo, ayetNo)
  }, [_ayetOynat])

  // Sonraki ayet
  const sonrakiAyet = useCallback(() => {
    sonrakiAyetCal()
  }, [sonrakiAyetCal])

  return {
    // State
    durum,           // "caliyor" | "duraklatildi" | "kapali"
    aktifAyet,       // { sureNo, ayetNo } | null
    kariId,
    hata,

    // Fonksiyonlar
    ayetCal,
    sureCal,
    besmeleCal,
    duraklat,
    devamEt,
    durdur,
    oncekiAyet,
    sonrakiAyet,
    setKariId,

    // Yardımcılar
    mp3Url,
    besmeleUrl,
    KARILAR,
  }
}
