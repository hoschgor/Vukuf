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
  // ── ÇİFT TAMPON (double buffer) ──
  // Kilit ekranında/arka planda iOS, "ended" olunca yeni src yükleyip play() çağırmayı
  // kısıtlıyor (âyet bitince ses kesiliyordu). Çözüm: iki <audio> elemanı tutup sıradaki
  // âyeti ÖNCEDEN (ön planda, kilitli/açık) yükleyip hazır bekletmek. Âyet bitince ağ
  // yüklemesi olmadan, zaten tamponlanmış elemana geçip play() basıyoruz → arka planda da
  // kesintisiz devam ediyor. iOS'ta her eleman ilk kez bir kullanıcı hareketiyle
  // "kilidi açılmalı" → ilk oynatmada iki eleman da sessizce açılıyor (kilitAc).
  const elsRef = useRef([])            // [Audio, Audio]
  const aktifRef = useRef(0)           // aktif eleman indeksi (0/1)
  const kilitAcikRef = useRef(false)   // iOS eleman kilidi açıldı mı
  const kuyrukRef = useRef([])
  const kuyrukIndisRef = useRef(0)

  const [kariId, setKariId] = useState(
    () => localStorage.getItem("vukuf-kari") || "Alafasy_128kbps"
  )
  const [durum, setDurum] = useState("kapali")
  const [aktifAyet, setAktifAyet] = useState(null)
  const [hata, setHata] = useState(null)
  const kariIdRef = useRef(kariId)
  const donguRef = useRef(false)   // kuyruk bitince başa dön (tekrar modları)
  const gecisKilidiRef = useRef(0) // çok hızlı ikinci geçişi (çift ilerleme) yok say

  // Çalma hızı (playbackRate)
  const [hiz, setHiz] = useState(() => parseFloat(localStorage.getItem("vukuf-calma-hizi") || "1") || 1)
  const hizRef = useRef(hiz)
  useEffect(() => {
    hizRef.current = hiz
    try { localStorage.setItem("vukuf-calma-hizi", String(hiz)) } catch {}
    for (const a of elsRef.current) { if (a) a.playbackRate = hiz }
  }, [hiz])
  const hizAyarla = useCallback((h) => setHiz(h), [])

  useEffect(() => {
    kariIdRef.current = kariId
    localStorage.setItem("vukuf-kari", kariId)
  }, [kariId])

  // ── Eleman yardımcıları ──
  const aktifEl = useCallback(() => elsRef.current[aktifRef.current], [])
  const bostaEl = useCallback(() => elsRef.current[1 - aktifRef.current], [])

  // Kuyrukta bir sonraki indeks (döngü dahil). Yoksa -1.
  const sonrakiIndeks = useCallback((i) => {
    const j = i + 1
    if (j >= kuyrukRef.current.length) return (donguRef.current && kuyrukRef.current.length) ? 0 : -1
    return j
  }, [])

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

  // Sıradaki âyeti BOŞTA elemana önden yükle (arka planda ağ beklemesi olmasın)
  const sonrakiOnyukle = useCallback(() => {
    const b = bostaEl()
    if (!b) return
    const j = sonrakiIndeks(kuyrukIndisRef.current)
    if (j < 0) return
    const it = kuyrukRef.current[j]
    if (!it) return
    try {
      const url = mp3Url(kariIdRef.current, it.sureNo, it.ayetNo)
      if (b.dataset.url !== url) { b.dataset.url = url; b.src = url; b.playbackRate = hizRef.current; b.load() }
    } catch {}
  }, [aktifEl, bostaEl, sonrakiIndeks])

  // iOS: her elemanı ilk kez kullanıcı hareketiyle "kilidini aç" (sessiz play→pause)
  const kilitAc = useCallback(() => {
    if (kilitAcikRef.current) return
    kilitAcikRef.current = true
    for (const a of elsRef.current) {
      if (!a || a === aktifEl()) continue   // aktif eleman zaten gerçek play ile açılacak
      try {
        a.muted = true
        const p = a.play()
        if (p && p.then) p.then(() => { a.pause(); try { a.currentTime = 0 } catch {}; a.muted = false }).catch(() => { a.muted = false })
        else { a.pause(); a.muted = false }
      } catch { a.muted = false }
    }
  }, [aktifEl])

  // Bir âyeti oynat. hazir=true → sıradaki BOŞTA elemana geçerek (önden yüklenmiş) oynat
  // (arka plan güvenli). hazir=false → aktif elemana yükleyip oynat (ilk başlatma / geri).
  const _ayetOynat = useCallback((sureNo, ayetNo, besmeleIcin = null, hazir = false) => {
    if (!elsRef.current.length) return
    setHata(null)
    const url = mp3Url(kariIdRef.current, sureNo, ayetNo)

    // Her iki elemanı da DURDUR → aynı anda tek ses çalar (manuel "sonraki"de üst üste
    // iki ses çalması / yanlış elemanın açık kalması engellenir).
    for (const el of elsRef.current) { if (el) { try { el.pause() } catch {} } }

    if (hazir) {
      const b = bostaEl()
      if (b && b.dataset.url === url) {
        // Önden yüklenmiş elemana geç → yükleme yok, arka planda da play() geçer
        aktifRef.current = 1 - aktifRef.current
      }
    }
    const a = aktifEl()
    if (!a) return
    if (a.dataset.url !== url) { a.dataset.url = url; a.src = url }
    try { if (a.currentTime !== 0) a.currentTime = 0 } catch {}
    a.playbackRate = hizRef.current
    a.muted = false
    a.play()
      .then(() => {
        a.playbackRate = hizRef.current
        setDurum("caliyor")
        setAktifAyet({ sureNo, ayetNo, besmeleIcin })
        mediaMeta(sureNo, ayetNo, besmeleIcin)
        sonrakiOnyukle()   // bir sonrakini hazırla
      })
      .catch(() => { setHata("Oynatma başlatılamadı"); setDurum("kapali") })
  }, [aktifEl, bostaEl, mediaMeta, sonrakiOnyukle])

  const sonrakiAyetCal = useCallback(() => {
    // Çift ilerleme koruması: 250ms içinde ikinci "sonraki" çağrısını yok say
    // (foreground'da spurious "ended" / hızlı çift dokunuş → sesin kesilmesi olmasın).
    const simdi = Date.now()
    if (simdi - gecisKilidiRef.current < 250) return
    gecisKilidiRef.current = simdi
    const j = sonrakiIndeks(kuyrukIndisRef.current)
    if (j < 0) {
      setDurum("kapali")
      setAktifAyet(null)
      kuyrukIndisRef.current = 0
      kuyrukRef.current = []
      try { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none" } catch {}
      return
    }
    kuyrukIndisRef.current = j
    const { sureNo, ayetNo, besmeleIcin } = kuyrukRef.current[j]
    _ayetOynat(sureNo, ayetNo, besmeleIcin, true)   // hazir=true → önden yüklenmiş elemanı kullan
  }, [sonrakiIndeks, _ayetOynat])

  // Bu callback'lerin son sürümünü "ended"/Media Session handler'larından çağırmak için ref
  const sonrakiAyetCalRef = useRef(sonrakiAyetCal)
  sonrakiAyetCalRef.current = sonrakiAyetCal

  const oncekiAyet = useCallback(() => {
    const j = kuyrukIndisRef.current - 1
    if (j < 0) return
    kuyrukIndisRef.current = j
    const { sureNo, ayetNo, besmeleIcin } = kuyrukRef.current[j]
    _ayetOynat(sureNo, ayetNo, besmeleIcin, false)
  }, [_ayetOynat])
  const oncekiAyetRef = useRef(oncekiAyet)
  oncekiAyetRef.current = oncekiAyet

  // ── İki elemanı kur + olay dinleyicileri (bir kez) ──
  useEffect(() => {
    const yap = () => {
      const a = new Audio()
      a.preload = "auto"
      try { a.setAttribute("playsinline", "") } catch {}
      a.dataset.url = ""
      a.addEventListener("ended", (e) => { if (e.target === aktifEl()) sonrakiAyetCalRef.current() })
      a.addEventListener("error", () => {
        // Yalnız aktif eleman hata verirse kullanıcıya bildir (boşta ön-yükleme hatası sessiz)
        if (a === aktifEl() && a.dataset.url) { setHata("Ses yüklenemedi"); setDurum("kapali") }
      })
      return a
    }
    elsRef.current = [yap(), yap()]

    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play",  () => { const a = aktifEl(); if (a) a.play().then(() => { setDurum("caliyor"); try { navigator.mediaSession.playbackState = "playing" } catch {} }).catch(() => {}) })
        navigator.mediaSession.setActionHandler("pause", () => { const a = aktifEl(); if (a) a.pause(); setDurum("duraklatildi"); try { navigator.mediaSession.playbackState = "paused" } catch {} })
        navigator.mediaSession.setActionHandler("nexttrack",     () => sonrakiAyetCalRef.current())
        navigator.mediaSession.setActionHandler("previoustrack", () => oncekiAyetRef.current && oncekiAyetRef.current())
      } catch {}
    }

    return () => {
      for (const a of elsRef.current) { try { a.pause(); a.src = "" } catch {} }
    }
    // eslint-disable-next-line
  }, [])

  // Kâri değişince: çalıyorsa durdur, tamponları temizle
  useEffect(() => {
    kariIdRef.current = kariId
    localStorage.setItem("vukuf-kari", kariId)
    if (elsRef.current.length && durum !== "kapali") {
      for (const a of elsRef.current) { try { a.pause(); a.src = ""; a.dataset.url = "" } catch {} }
      setDurum("kapali")
      setAktifAyet(null)
    }
    // eslint-disable-next-line
  }, [kariId])

  const ayetCal = useCallback((sureNo, ayetNo) => {
    kilitAc()
    donguRef.current = false
    kuyrukRef.current = [{ sureNo, ayetNo }]
    kuyrukIndisRef.current = 0
    _ayetOynat(sureNo, ayetNo, null, false)
  }, [_ayetOynat, kilitAc])

  // TEKRAR modları için: hazır bir âyet listesini [{sureNo,ayetNo,besmeleIcin?}] oynat.
  const listeCal = useCallback((liste, dongu = false) => {
    if (!liste || !liste.length) return
    kilitAc()
    donguRef.current = !!dongu
    kuyrukRef.current = liste
    kuyrukIndisRef.current = 0
    _ayetOynat(liste[0].sureNo, liste[0].ayetNo, liste[0].besmeleIcin, false)
  }, [_ayetOynat, kilitAc])

  const BESMELE_OKUYANLAR = [
    "AbdulSamad_64kbps_QuranExplorer.Com",
  ]

  const sureCal = useCallback((sureNo, toplamAyetSayisi, baslangicAyet = 1) => {
    kilitAc()
    donguRef.current = false
    const kuyruk = []
    const besmelEkle =
      sureNo !== 1 && sureNo !== 9 && baslangicAyet === 1 &&
      !BESMELE_OKUYANLAR.includes(kariIdRef.current)
    if (besmelEkle) kuyruk.push({ sureNo: 1, ayetNo: 1, besmeleIcin: sureNo })
    for (let a = baslangicAyet; a <= toplamAyetSayisi; a++) kuyruk.push({ sureNo, ayetNo: a })
    kuyrukRef.current = kuyruk
    kuyrukIndisRef.current = 0
    _ayetOynat(kuyruk[0].sureNo, kuyruk[0].ayetNo, kuyruk[0].besmeleIcin, false)
  }, [_ayetOynat, kilitAc])

  const besmeleCal = useCallback(() => {
    kilitAc()
    kuyrukRef.current = [{ sureNo: 1, ayetNo: 1 }]
    kuyrukIndisRef.current = 0
    _ayetOynat(1, 1, null, false)
  }, [_ayetOynat, kilitAc])

  const duraklat = useCallback(() => {
    const a = aktifEl()
    if (!a || durum !== "caliyor") return
    a.pause()
    setDurum("duraklatildi")
    try { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused" } catch {}
  }, [durum, aktifEl])

  const devamEt = useCallback(() => {
    const a = aktifEl()
    if (!a || durum !== "duraklatildi") return
    a.play()
      .then(() => { setDurum("caliyor"); try { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing" } catch {} })
      .catch(() => setDurum("kapali"))
  }, [durum, aktifEl])

  const durdur = useCallback(() => {
    for (const a of elsRef.current) { try { a.pause(); a.src = ""; a.dataset.url = "" } catch {} }
    donguRef.current = false
    kuyrukRef.current = []
    kuyrukIndisRef.current = 0
    setDurum("kapali")
    setAktifAyet(null)
    setHata(null)
    try { if ("mediaSession" in navigator) { navigator.mediaSession.playbackState = "none"; navigator.mediaSession.metadata = null } } catch {}
  }, [])

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
