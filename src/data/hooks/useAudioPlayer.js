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
  { id: "ahmed_ibn_ali_al_ajamy_128kbps",      label: "Ali Al Ajamy" },
  { id: "Fares_Abbad_64kbps",      label: "Fares Abbad" },
  { id: "Hani_Rifai_192kbps",      label: "Hani Rifai" },
  { id: "Khaalid_Abdullaah_al-Qahtaanee_192kbps",      label: "Khaalid Abdullah Al Qahtaanee" },
  { id: "Nabil_Rifa3i_48kbps",      label: "Nabil Rifai" },
  { id: "mahmoud_ali_al_banna_32kbps",      label: "Mahmoud Ali Al Banna" },
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

const kariEtiket = (id) => (KARILAR.find(k => k.id === id)?.label || "Kur'ân-ı Kerîm")

export default function useAudioPlayer() {
  const audioRef = useRef(null)
  const onyukleRef = useRef(null)   // sıradaki âyeti arka planda önden yükleyen gizli <audio>
  const kuyrukRef = useRef([])
  const kuyrukIndisRef = useRef(0)

  const [kariId, setKariId] = useState(
    () => localStorage.getItem("vukuf-kari") || "Alafasy_128kbps"
  )
  const [durum, setDurum] = useState("kapali")
  const [aktifAyet, setAktifAyet] = useState(null)
  const [hata, setHata] = useState(null)
  const kariIdRef = useRef(kariId)
  const oncekiAyetRef = useRef(null)   // Media Session "previoustrack" için (tanımdan sonra atanır)
  const donguRef = useRef(false)   // kuyruk bitince başa dön (tekrar modları)

  // Media Session meta verisi (kilit ekranı başlığı) — oturumu canlı tutar
  const mediaMeta = useCallback((sureNo, ayetNo, besmeleIcin) => {
    if (!("mediaSession" in navigator)) return
    try {
      if (window.MediaMetadata) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: besmeleIcin ? "Bismillâhirrahmânirrahîm" : `${sureNo}. Sûre · ${ayetNo}. Âyet`,
          artist: kariEtiket(kariIdRef.current),
          album: "Kur'ân-ı Kerîm",
        })
      }
      navigator.mediaSession.playbackState = "playing"
    } catch {}
  }, [])

  // Sıradaki âyeti önden yükle (arka planda ağ yavaşladığında sessizliği azaltır)
  const sonrakiOnyukle = useCallback(() => {
    const on = onyukleRef.current
    const kuyruk = kuyrukRef.current
    if (!on || !kuyruk.length) return
    let idx = kuyrukIndisRef.current + 1
    if (idx >= kuyruk.length) { if (donguRef.current) idx = 0; else return }
    const s = kuyruk[idx]
    if (!s) return
    try {
      const url = mp3Url(kariIdRef.current, s.sureNo, s.ayetNo)
      if (on.src !== url) { on.src = url; on.load() }
    } catch {}
  }, [])
  // Çalma hızı (playbackRate)
  const [hiz, setHiz] = useState(() => parseFloat(localStorage.getItem("vukuf-calma-hizi") || "1") || 1)
  const hizRef = useRef(hiz)
  useEffect(() => {
    hizRef.current = hiz
    try { localStorage.setItem("vukuf-calma-hizi", String(hiz)) } catch {}
    if (audioRef.current) audioRef.current.playbackRate = hiz
  }, [hiz])
  const hizAyarla = useCallback((h) => setHiz(h), [])
  

useEffect(() => {
  kariIdRef.current = kariId
  localStorage.setItem("vukuf-kari", kariId)
}, [kariId])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = "auto"
    // Arka planda/kilit ekranında sesin devam etmesi için ipuçları
    try { audio.setAttribute("playsinline", "") } catch {}
    audioRef.current = audio

    // Sıradaki âyeti önden yükleyen gizli eleman (arka planda ağ yavaşlar → boşluk/sessizlik olmasın)
    const on = new Audio()
    on.preload = "auto"
    onyukleRef.current = on

    audio.addEventListener("ended", () => sonrakiAyetCal())
    audio.addEventListener("error", () => {
      setHata("Ses yüklenemedi")
      setDurum("kapali")
    })
    // Kilit ekranı / bildirim kontrolleri (Media Session) → oturum aktif kalır, arka planda çalmaya devam
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play",  () => { audio.play().then(() => { setDurum("caliyor"); try { navigator.mediaSession.playbackState = "playing" } catch {} }).catch(() => {}) })
        navigator.mediaSession.setActionHandler("pause", () => { audio.pause(); setDurum("duraklatildi"); try { navigator.mediaSession.playbackState = "paused" } catch {} })
        navigator.mediaSession.setActionHandler("nexttrack",     () => sonrakiAyetCal())
        navigator.mediaSession.setActionHandler("previoustrack", () => oncekiAyetRef.current && oncekiAyetRef.current())
      } catch {}
    }

    return () => {
      audio.pause()
      audio.src = ""
      on.pause()
      on.src = ""
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
    let indis = kuyrukIndisRef.current + 1
    if (indis >= kuyruk.length) {
      if (donguRef.current && kuyruk.length) {
        indis = 0   // TEKRAR modu: kuyruğun başına dön (playlist gibi)
      } else {
        setDurum("kapali")
        setAktifAyet(null)
        kuyrukIndisRef.current = 0
        kuyrukRef.current = []
        return
      }
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
    audio.playbackRate = hizRef.current
    audio.play()
      .then(() => {
        audio.playbackRate = hizRef.current
        setDurum("caliyor")
        setAktifAyet({ sureNo, ayetNo, besmeleIcin })
        mediaMeta(sureNo, ayetNo, besmeleIcin)   // kilit ekranı oturumunu güncelle/canlı tut
        sonrakiOnyukle()                          // bir sonrakini önden yükle (arka plan boşluğunu azalt)
      })
      .catch(() => { setHata("Oynatma başlatılamadı"); setDurum("kapali") })
  }, [mediaMeta, sonrakiOnyukle])

  const ayetCal = useCallback((sureNo, ayetNo) => {
    donguRef.current = false
    kuyrukRef.current = [{ sureNo, ayetNo }]
    kuyrukIndisRef.current = 0
    _ayetOynat(sureNo, ayetNo)
  }, [_ayetOynat])

  // TEKRAR modları için: hazır bir âyet listesini [{sureNo,ayetNo,besmeleIcin?}] oynat.
  // dongu=true → kuyruk bitince başa döner (sayfa/ayet/sure tekrarı hep bunu kullanır).
  const listeCal = useCallback((liste, dongu = false) => {
    if (!liste || !liste.length) return
    donguRef.current = !!dongu
    kuyrukRef.current = liste
    kuyrukIndisRef.current = 0
    _ayetOynat(liste[0].sureNo, liste[0].ayetNo, liste[0].besmeleIcin)
  }, [_ayetOynat])


const BESMELE_OKUYANLAR = [
  "AbdulSamad_64kbps_QuranExplorer.Com",
]

const sureCal = useCallback((sureNo, toplamAyetSayisi, baslangicAyet = 1) => {
  donguRef.current = false
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
    try { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused" } catch {}
  }, [durum])

  const devamEt = useCallback(() => {
    const audio = audioRef.current
    if (!audio || durum !== "duraklatildi") return
    audio.play()
      .then(() => { setDurum("caliyor"); try { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing" } catch {} })
      .catch(() => setDurum("kapali"))
  }, [durum])

  const durdur = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.src = ""
    if (onyukleRef.current) { try { onyukleRef.current.pause(); onyukleRef.current.src = "" } catch {} }
    donguRef.current = false
    kuyrukRef.current = []
    kuyrukIndisRef.current = 0
    setDurum("kapali")
    setAktifAyet(null)
    setHata(null)
    try { if ("mediaSession" in navigator) { navigator.mediaSession.playbackState = "none"; navigator.mediaSession.metadata = null } } catch {}
  }, [])

  const oncekiAyet = useCallback(() => {
    const indis = kuyrukIndisRef.current - 1
    if (indis < 0) return
    kuyrukIndisRef.current = indis
    const { sureNo, ayetNo, besmeleIcin } = kuyrukRef.current[indis]
    _ayetOynat(sureNo, ayetNo, besmeleIcin)
  }, [_ayetOynat])
  oncekiAyetRef.current = oncekiAyet   // Media Session "previoustrack" handler'ı güncel kalsın

  const sonrakiAyet = useCallback(() => {
    sonrakiAyetCal()
  }, [sonrakiAyetCal])

  return {
    durum, aktifAyet, kariId, hata,
    ayetCal, sureCal, besmeleCal, listeCal,
    duraklat, devamEt, durdur,
    oncekiAyet, sonrakiAyet,
    hiz, hizAyarla,
    setKariId, mp3Url, besmeleUrl, KARILAR,
  }
}