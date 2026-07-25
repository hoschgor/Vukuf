import { useState, useEffect, useRef, useCallback } from "react"

// Kariler (everyayah.com)
export const KARILAR = [
  { id: "Alafasy_128kbps",            label: "Mishary Alafasy" },
  { id: "AbdulSamad_64kbps_QuranExplorer.Com", label: "Abdulbasit Abdussamed" },
  { id: "MaherAlMuaiqly128kbps", label: "Maher  Al Muaiqly" },
  { id: "Abu_Bakr_Ash-Shaatree_128kbps",  label: "Abu Bakr Ash Shaatree" },
  { id: "Nasser_Alqatami_128kbps",  label: "Nasser Alqatami" },
  { id: "Yasser_Ad-Dussary_128kbps",  label: "Yasser Ad-Dussary" },
  { id: "Husary_128kbps",             label: "Mahmoud Khalil Husary" },
  { id: "Hudhaify_128kbps",           label: "Ali Al-Hudhaify" },
  { id: "Ghamadi_40kbps",             label: "Saad el-Gamidi" },
  { id: "Mohammad_al_Tablaway_128kbps", label: "Mohammad al-Tablaway" },
  { id: "Ibrahim_Akhdar_32kbps",      label: "Ibrahim Akhdar" },

]

const BASE_URL = "https://everyayah.com/data"

export function mp3Url(kariId, sureNo, ayetNo) {
  const s = String(sureNo).padStart(3, "0");
  const a = String(ayetNo).padStart(3, "0");
  let gercekKariId = kariId;
  return `${BASE_URL}/${gercekKariId}/${s}${a}.mp3`;
}

export function besmeleUrl(kariId) {
  return mp3Url(kariId, 1, 1)
}

export default function useAudioPlayer() {
  const audioRef = useRef(null)
  const kuyrukRef = useRef([])
  const kuyrukIndisRef = useRef(0)

  const [kariId, setKariId] = useState(
    () => localStorage.getItem("vukuf-kari") || "Alafasy_128kbps"
  )
  const [durum, setDurum] = useState("kapali")
  const [aktifAyet, setAktifAyet] = useState(null)
  const [hata, setHata] = useState(null)
  const kariIdRef = useRef(kariId)
  

useEffect(() => {
  kariIdRef.current = kariId
  localStorage.setItem("vukuf-kari", kariId)
}, [kariId])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = "auto"
    audioRef.current = audio

    audio.addEventListener("ended", () => sonrakiAyetCal())
    audio.addEventListener("error", () => {
      setHata("Ses yüklenemedi")
      setDurum("kapali")
    })

    return () => {
      audio.pause()
      audio.src = ""
    }
  }, [])

  useEffect(() => {
    kariIdRef.current = kariId
    localStorage.setItem("vukuf-kari", kariId)
    if (audioRef.current && durum !== "kapali") {
      audioRef.current.pause()
      audioRef.current.src = ""
      setDurum("kapali")
      setAktifAyet(null)
    }
  }, [kariId])

  const sonrakiAyetCal = useCallback(() => {
    const kuyruk = kuyrukRef.current
    const indis = kuyrukIndisRef.current + 1
    if (indis >= kuyruk.length) {
      setDurum("kapali")
      setAktifAyet(null)
      kuyrukIndisRef.current = 0
      kuyrukRef.current = []
      return
    }
    kuyrukIndisRef.current = indis
    const { sureNo, ayetNo, besmeleIcin } = kuyruk[indis]
    _ayetOynat(sureNo, ayetNo, besmeleIcin)
  }, [])

  const _ayetOynat = useCallback((sureNo, ayetNo, besmeleIcin = null) => {
    const audio = audioRef.current
    if (!audio) return
    setHata(null)
    audio.src = mp3Url(kariIdRef.current, sureNo, ayetNo)
    audio.play()
      .then(() => { setDurum("caliyor"); setAktifAyet({ sureNo, ayetNo, besmeleIcin }) })
      .catch(() => { setHata("Oynatma başlatılamadı"); setDurum("kapali") })
  }, [])

  const ayetCal = useCallback((sureNo, ayetNo) => {
    kuyrukRef.current = [{ sureNo, ayetNo }]
    kuyrukIndisRef.current = 0
    _ayetOynat(sureNo, ayetNo)
  }, [_ayetOynat])


const BESMELE_OKUYANLAR = [
  "AbdulSamad_64kbps_QuranExplorer.Com",
]

const sureCal = useCallback((sureNo, toplamAyetSayisi, baslangicAyet = 1) => {
  const kuyruk = []

  // Besmele ekle — sure 1 ve 9 hariç, kari besmele okumuyorsa
  const besmelEkle =
    sureNo !== 1 &&
    sureNo !== 9 &&
    baslangicAyet === 1 &&
    !BESMELE_OKUYANLAR.includes(kariIdRef.current)

  if (besmelEkle) {
    kuyruk.push({ sureNo: 1, ayetNo: 1, besmeleIcin: sureNo })
  }

  for (let a = baslangicAyet; a <= toplamAyetSayisi; a++) {
    kuyruk.push({ sureNo, ayetNo: a })
  }
  kuyrukRef.current = kuyruk
  kuyrukIndisRef.current = 0
  _ayetOynat(kuyruk[0].sureNo, kuyruk[0].ayetNo, kuyruk[0].besmeleIcin)
}, [_ayetOynat])

  const besmeleCal = useCallback(() => {
    kuyrukRef.current = [{ sureNo: 1, ayetNo: 1 }]
    kuyrukIndisRef.current = 0
    _ayetOynat(1, 1)
  }, [_ayetOynat])

  const duraklat = useCallback(() => {
    const audio = audioRef.current
    if (!audio || durum !== "caliyor") return
    audio.pause()
    setDurum("duraklatildi")
  }, [durum])

  const devamEt = useCallback(() => {
    const audio = audioRef.current
    if (!audio || durum !== "duraklatildi") return
    audio.play()
      .then(() => setDurum("caliyor"))
      .catch(() => setDurum("kapali"))
  }, [durum])

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

  const oncekiAyet = useCallback(() => {
    const indis = kuyrukIndisRef.current - 1
    if (indis < 0) return
    kuyrukIndisRef.current = indis
    const { sureNo, ayetNo, besmeleIcin } = kuyrukRef.current[indis]
    _ayetOynat(sureNo, ayetNo, besmeleIcin)
  }, [_ayetOynat])

  const sonrakiAyet = useCallback(() => {
    sonrakiAyetCal()
  }, [sonrakiAyetCal])

  return {
    durum, aktifAyet, kariId, hata,
    ayetCal, sureCal, besmeleCal,
    duraklat, devamEt, durdur,
    oncekiAyet, sonrakiAyet,
    setKariId, mp3Url, besmeleUrl, KARILAR,
  }
}