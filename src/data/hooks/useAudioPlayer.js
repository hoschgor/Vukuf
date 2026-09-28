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

// Kayıtlarında sûre başındaki besmeleyi ZATEN okuyan kâriler → ayrı besmele (Fatiha 1:1) EKLENMEZ
export const BESMELE_OKUYANLAR = [
  "AbdulSamad_64kbps_QuranExplorer.Com",
]

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

/* ── ÖNDEN BAYT İNDİRME — âyet geçişindeki uzun sessizliğin çözümü ─────────
 *  ÇİFT TAMPON TEK BAŞINA iOS'TA İŞE YARAMIYORDU. Boştaki <audio>'ya sıradaki
 *  âyetin adresi verilip `load()` çağrılıyordu; masaüstü Chromium bunu gerçekten
 *  doldurur, ama iOS WebKit çalınmayan bir ses elemanı için VERİ İNDİRMEZ —
 *  `preload="auto"` da `load()` da yok sayılır, dosya ancak play() ile istenir.
 *  Sonuç: her geçişte everyayah'a o anda gidiliyor ve sessizlik, sunucunun
 *  yanıt süresi kadar uzuyordu.
 *  ÖLÇÜLDÜ (Chromium'da iOS davranışı taklit edilerek, gerçek bu kanca ile):
 *  sunucu gecikmesi 0,35 sn → geçiş başına ~365 ms sessizlik; 0,70 sn → ~714 ms.
 *  ÇÖZÜM: sıradaki âyetlerin BAYTLARI `fetch` ile önceden indirilip bellekte
 *  Blob olarak tutuluyor; boştaki elemana bu yerel adres (blob:) veriliyor.
 *  Yerel kaynak ağ beklemeden çalar — iOS önden doldurmasa bile.
 *  Kâri sunucusu CORS veriyor (v171'de kullanıcının cihazında ölçüldü);
 *  indirme başarısız olursa eski yol (doğrudan ağ adresi) aynen kullanılıyor.
 *  Pencere küçük tutuluyor: önceki + çalan + ONDEN kadar sonraki; dışarıda
 *  kalanlar serbest bırakılıyor (uzun âyet 192 kbps'te birkaç MB). */
const ONDEN = 2

/* ── ERKEN BAŞLATMA — kalan son milisaniyeler ──────────────────────────────
 *  Baytlar hazır olsa da "ended" olayını bekleyip sonra play() demek iki gecikme
 *  ekliyor: olayın gelişi ve yeni elemanın çalmaya BAŞLAMA süresi. Bu süre
 *  cihaza göre çok değişiyor (masaüstü Chromium ~10 ms; iOS'ta yeni bir ses
 *  elemanı çok daha yavaş açılıyor). Sabit bir sayı TAHMİN ETMEK yerine cihazın
 *  kendisinde ÖLÇÜLÜYOR (aşağıdaki BAŞLAMA SÜRESİ notu) ve sıradaki âyet, çalan
 *  âyetin bitişinden TAM O KADAR önce başlatılıyor.
 *  GÜVENLİK: çalan âyet ASLA erken kesilmiyor — kendi sonuna kadar çalıp susuyor;
 *  yalnız yenisi biraz önce başlıyor. Tahmin fazla çıkarsa en kötü ihtimalle iki
 *  dosyanın sessiz uçları birkaç ms üst üste biner (duyulmaz).
 *  Yalnız EKRAN AÇIKKEN: arka planda zamanlayıcılar kısıldığı için orada
 *  "ended" yolu kullanılıyor (baytlar yerel olduğu için o da hızlı). */
const iosMu = () => {
  try {
    const ua = navigator.userAgent || ""
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  } catch { return false }
}

/* ── BAŞLAMA SÜRESİ: SESİN GERÇEKTEN GELDİĞİ ANDAN ÖLÇÜLÜYOR ───────────────
 *  ⚠ ESKİ ÖLÇÜM YANLIŞ ŞEYİ ÖLÇÜYORDU: play() ile "playing" olayı arası alınıyordu.
 *  Cihaz teşhisi gösterdi ki olay sesten ÇOK ÖNCE geliyor:
 *    masaüstü Chrome: "playing" ≈2 ms, ses ≈200 ms sonra
 *    iPhone:          "playing" ≈121 ms, ses ≈280-320 ms sonra
 *  (Başsız test tarayıcısında ses çıkışı sahte olduğu için fark orada görünmedi.)
 *  Artık play() anından, elemanın KONUMUNUN İLERLEMEYE BAŞLADIĞI ana kadar
 *  ölçülüyor — yalnız yerel (önden inmiş) kaynakta ve ekran açıkken (arka planda
 *  zamanlayıcılar kısıldığı için ölçüm şişerdi).
 *  Değer CİHAZDA SAKLANIYOR: her açılışta ilk geçiş tahminle yapılmasın.
 *  İlk tahmin (hiç ölçüm yokken): iPhone 250 ms — kullanıcının cihazında
 *  ölçülen 280-320'nin biraz altı, ki şüphede boşluk kalsın, üst üste binme
 *  olmasın; diğerleri 120 ms. İlk gerçek ölçüm tahmini SİLER. */
const BASLAMA_ANAHTAR = "vukuf-ses-baslama"
let olculenBaslama = (() => {
  try {
    const v = parseFloat(localStorage.getItem(BASLAMA_ANAHTAR))
    if (Number.isFinite(v) && v > 0 && v < 1500) return v
  } catch { /* yoksay */ }
  return null
})()
let baslamaOlculdu = olculenBaslama !== null
if (olculenBaslama === null) olculenBaslama = (typeof navigator !== "undefined" && iosMu()) ? 250 : 120
  const baslamaEkle = (ms) => {
    if (!Number.isFinite(ms) || ms < 0 || ms > 1500) return      // uç değer
      olculenBaslama = baslamaOlculdu ? olculenBaslama * 0.6 + ms * 0.4 : ms
      baslamaOlculdu = true
      try { localStorage.setItem(BASLAMA_ANAHTAR, String(Math.round(olculenBaslama))) } catch { /* kota */ }
  }
  const oncuMs = () => Math.min(500, Math.max(10, olculenBaslama))

  /* ── ERKEN BAŞLATMA ARTIK iPHONE'DA DA AÇIK ─────────────────────────────────
   *  Önceki sürümde iOS'ta kapalıydı: "bir ses başlayınca öbürünü duraklatır"
   *  endişesiyle. Cihaz ölçümü iPhone'daki sessizliğin ~%90'ının yeni elemanın
   *  açılma süresi olduğunu gösterdi (play→ses ≈300 ms, hazırlık rs4, kaynak
   *  yerel) — bu süre yalnız erken başlatmayla gizlenebiliyor. iOS Safari'nin iki
   *  <audio>yu aynı anda çalabildiği de bildiriliyor.
   *  GÜVENLİK AĞI DURUYOR: erken geçişte çıkan eleman bizden başka biri tarafından
   *  duraklatılırsa özellik o oturumda kapanıyor ve sebep teşhise yazılıyor.
   *  En kötü ihtimal: oturumda BİR KEZ, bir âyetin son ~300 ms'si kırpılır. */
  let erkenIzinli = true
  let erkenKapanma = ""          // TEŞHİS: kapandıysa neden

  /* ══ GEÇİCİ: SES GEÇİŞ TEŞHİSİ ═════════════════════════════════════════════
   *  iPhone'da âyet geçişinin nereye harcandığını CİHAZIN KENDİSİNE ölçtürmek için.
   *  (Önden bayt indirme masaüstünde işe yaradı, iPhone'da belirgin fark etmedi —
   *  yani orada zamanı başka bir şey yiyor; tahminle ikinci düzeltme yazılmıyor.)
   *  Her geçişte dört an kaydediliyor:
   *    son    — çalan âyetin konumu sonuna vardı (sessizliğin başladığı an)
   *    ended  — tarayıcı "ended" olayını verdi
   *    play   — sıradakine play() dendi
   *    ses    — sıradakinin konumu gerçekten ilerlemeye başladı (ses geldi)
   *  Ayarlar > Veriler > "Ses geçiş teşhisi"nden okunup kopyalanıyor.
   *  Ölçüm bitince bu blok ve VeriAyarlari'ndaki bölüm silinecek. */
  /* ⏸ KAPALI (kullanıcı kararı: "teşhisi yoruma çekelim, ileride lazım olabilir").
   *  Açmak için: SES_TESHIS = true ve VeriAyarlari.jsx'te "Ses geçiş teşhisi"
   *  bölümünün yorumunu kaldır. Kapalıyken kayıt tutulmuyor, sona yakın yoklama
   *  (4 ms'lik zamanlayıcı) da çalışmıyor — oynatmaya hiçbir yük bindirmiyor.
   *  NOT: başlama süresi ÖLÇÜMÜ bu bayraktan bağımsız; erken başlatma onu kullanıyor. */
  const SES_TESHIS = false
  const TESHIS_ADET = 24
  const teshisKayit = []
  const teshisBayt = { tamam: 0, hata: 0, sureler: [], ilkHata: "" }
  const simdiMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now())
  const ayetEtiket = (url) => {
    const m = /(\d{3})(\d{3})\.mp3$/.exec(String(url || ""))
    return m ? `${Number(m[1])}:${Number(m[2])}` : "?"
  }
  function teshisBasla(yol, cikan) {
    if (!SES_TESHIS) return {}          // kapalı: alanlar boşa yazılır, hiçbir yere eklenmez
    const r = {
      yol, t0: simdiMs(),
      onceki: cikan ? ayetEtiket(cikan.dataset.url) : "-",
      sonAn: cikan ? (cikan.__sonAn || 0) : 0,
      endedAn: cikan ? (cikan.__endedAn || 0) : 0,
      // Çıkan âyetin geçiş anındaki süresi — bittiğinde değişirse (tarayıcı MP3
      // süresini önce TAHMİN edip sonda düzeltiyorsa) erken başlatma yanlış ana
      // kurulmuş demektir.
      sureTetik: cikan && Number.isFinite(cikan.duration) ? cikan.duration : NaN,
    }
    // Erken geçişte çıkan âyet henüz bitmedi: bitişi geldiğinde bu kayda yazılsın.
    if (cikan && !cikan.ended && !cikan.paused) cikan.__teshis = r
      teshisKayit.push(r)
      while (teshisKayit.length > TESHIS_ADET) teshisKayit.shift()
        return r
  }
  export function sesTeshisTemizle() {
    teshisKayit.length = 0
    teshisBayt.tamam = 0; teshisBayt.hata = 0; teshisBayt.sureler = []; teshisBayt.ilkHata = ""
  }
  export function sesTeshisMetni() {
    const ms = (x) => (Number.isFinite(x) ? `${Math.round(x)}` : "?")
    const ua = (typeof navigator !== "undefined" ? navigator.userAgent : "").replace(/\s*\(KHTML[^)]*\)\s*/, " ")
    const sw = typeof navigator !== "undefined" && navigator.serviceWorker && navigator.serviceWorker.controller ? "var" : "yok"
    const ortBayt = teshisBayt.sureler.length
    ? Math.round(teshisBayt.sureler.reduce((a, b) => a + b, 0) / teshisBayt.sureler.length) : null
    const satirlar = [
      `Vukuf ses teşhisi · ${new Date().toLocaleString("tr-TR")}`,
      `Cihaz: ${ua}`,
      `Servis işçisi: ${sw} · erken başlatma: ${erkenIzinli ? "açık" : `KAPANDI (${erkenKapanma || "?"})`} · ölçülen başlama ≈${ms(olculenBaslama)} ms${baslamaOlculdu ? "" : " (henüz tahmin)"}`,
      `Önden bayt: ${teshisBayt.tamam} hazır, ${teshisBayt.hata} hata` +
      (ortBayt !== null ? ` · ortalama iniş ${ortBayt} ms` : "") +
      (teshisBayt.ilkHata ? ` · ilk hata: ${teshisBayt.ilkHata}` : ""),
      "",
      "geçiş · yol · kaynak · hazırlık · öncü | son→ended · ended→play · play→ses | SESSİZLİK / BİNME",
    ]
    for (const r of teshisKayit) {
      const bas = r.sonAn || r.endedAn || 0
      const sessizlik = (r.tSes && bas) ? r.tSes - bas : NaN
      const parca = [
        r.sonAn && r.endedAn ? `son→ended ${ms(r.endedAn - r.sonAn)}` : "son→ended ?",
        r.endedAn && r.tPlay ? `ended→play ${ms(r.tPlay - r.endedAn)}` : `ended→play ${r.yol === "ended" ? "?" : "-"}`,
        r.tPlay && r.tSes ? `play→ses ${ms(r.tSes - r.tPlay)}` : "play→ses ?",
      ]
      // BİNME: yeni âyetin sesi, çıkan âyet daha BİTMEDEN geldiyse (erken başlatma fazla erken).
      // Ölçüt SON anı (konum sona vardı), "ended" DEĞİL: iPhone "ended"i sondan
      // 17-103 ms SONRA veriyor (cihaz ölçümü); ona göre hesaplamak binmeyi o kadar
      // şişiriyordu. Son anı yoksa "ended"e düşülüyor.
      const bitis = r.sonAn || r.endedAn || 0
      const binme = (r.tSes && bitis && r.tSes < bitis) ? bitis - r.tSes : 0
      const sureFark = (Number.isFinite(r.sureTetik) && Number.isFinite(r.sureSon)) ? (r.sureSon - r.sureTetik) * 1000 : 0
      let sonuc
      if (r.yol === "elle" || r.yol === "geri") sonuc = "(elle)"
        else if (r.kesildi) sonuc = "ÇIKAN ÂYET PLATFORMCA DURDURULDU (erken başlatma kapandı)"
          else if (binme > 5) sonuc = `BİNME ${ms(binme)} ms`
            else sonuc = `SESSİZLİK ${ms(Math.max(0, sessizlik))} ms${r.sonAn ? "" : " (ended'dan)"}`
              satirlar.push(
                `${r.onceki}→${r.ayet || "?"} · ${r.yol} · ${r.kaynak || "?"} · rs${r.rs ?? "?"}${r.onyuk ? " önyük" : ""} · öncü ${r.oncu ?? "?"}` +
                ` | ${parca.join(" · ")}` +
                ` | ${sonuc}` +
                (Math.abs(sureFark) > 20 ? ` · ⚠ süre sonda ${sureFark > 0 ? "+" : ""}${ms(sureFark)} ms değişti` : "")
              )
    }
    if (!teshisKayit.length) satirlar.push("(henüz kayıt yok — bir sûreyi birkaç âyet çalın)")
      return satirlar.join("\n")
  }

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
    // TEK ÂYET MODU: "Âyeti dinle" ile başlatıldı. Kuyrukta sûrenin TAMAMI var ki
    // ileri/geri düğmeleri çalışsın, ama âyet KENDİLİĞİNDEN bitince durulur —
    // yoksa "tek âyet dinle" sûreyi baştan sona okumaya dönerdi.
    const tekAyetRef = useRef(false)
    const gecisKilidiRef = useRef(0) // çok hızlı ikinci geçişi (çift ilerleme) yok say
    const teshisRef = useRef(null)   // GEÇİCİ TEŞHİS: yürüyen geçişin kaydı
    const durumRef = useRef(durum)   // "ended"/MediaSession/visibility handler'ları güncel durumu okusun
    useEffect(() => {
      durumRef.current = durum
      try {
        if ("mediaSession" in navigator)
          navigator.mediaSession.playbackState =
          durum === "caliyor" ? "playing" : durum === "duraklatildi" ? "paused" : "none"
      } catch {}
    }, [durum])

    // Çalma hızı (playbackRate)
    const [hiz, setHiz] = useState(() => parseFloat(localStorage.getItem("vukuf-calma-hizi") || "1") || 1)
    const hizRef = useRef(hiz)
    useEffect(() => {
      hizRef.current = hiz
      try { localStorage.setItem("vukuf-calma-hizi", String(hiz)) } catch {}
      for (const a of elsRef.current) { if (a) a.playbackRate = hiz }
    }, [hiz])
    const hizAyarla = useCallback((h) => setHiz(h), [])

    // ── SES SEVİYESİ ────────────────────────────────────────────────
    // 0…1 arası, localStorage'da saklanır, HER İKİ tampona da uygulanır (çift tamponda
    // âyet geçişinde seviye düşmesin diye yeni elemana da yazılır).
    //
    // MOBİL (iOS) SORUNU: iOS'ta <audio>.volume TASARIM GEREĞİ salt okunur — yazmak
    // hiçbir şey yapmaz, okumak her zaman 1 döner; ses yalnız cihazın fizikî tuşlarına
    // bırakılmıştır. Bu yüzden kaydırıcı webde çalışıp telefonda çalışmıyordu.
    // ÇÖZÜM: o cihazlarda ses, Web Audio kazanç (GainNode) düğümünden geçirilir.
    //   • Kazanç düğümü TEMBEL kurulur: yalnız kullanıcı seviyeyi ilk kez 1'in altına
    //     çektiğinde. Sesi hiç kısmayan kullanıcıda <audio> yolu hiç değişmez — arka
    //     plan/kilit ekranı oynatması olduğu gibi kalır.
    //   • AudioContext yalnız kullanıcı hareketiyle (kaydırıcı) doğar, yoksa askıda
    //     kalıp sesi tamamen keserdi. Her oynatmada ve öne dönüşte tekrar uyandırılır.
    //   • SUSTURMA her cihazda `muted` ile yapılır — `muted` iOS'ta da çalışır.
    const [ses, setSes] = useState(() => {
      const d = parseFloat(localStorage.getItem("vukuf-ses-seviyesi") || "1")
      return Number.isFinite(d) ? Math.min(Math.max(d, 0), 1) : 1
    })
    const sesRef = useRef(ses)
    const sesCtxRef = useRef(null)
    const kazancRef = useRef(null)
    // Zincir YALNIZ kullanıcı hareketinden kurulabilir. Sayfa açılışında (kayıtlı
    // seviye 1'in altındaysa) kurulsaydı AudioContext askıda doğar ve ses TAMAMEN
    // kesilirdi — kısık sesten beter. Bayrak: kaydırıcıya dokunuldu mu / oynat'a
    // basıldı mı (ikisi de gerçek hareket).
    const hareketVarRef = useRef(false)

    // Bu tarayıcıda volume gerçekten yazılabiliyor mu? (iOS'ta hayır.) Bir kez ölçülür.
    const volumeYazilabilirRef = useRef(null)
    const volumeYazilabilir = useCallback(() => {
      if (volumeYazilabilirRef.current !== null) return volumeYazilabilirRef.current
        let sonuc = true
        try {
          const t = new Audio()
          t.volume = 0.37
          sonuc = Math.abs(t.volume - 0.37) < 0.01
        } catch { sonuc = true }
        volumeYazilabilirRef.current = sonuc
        return sonuc
    }, [])

    // Askıya alınmış bağlamı uyandır (iOS arka plandan dönünce askıya alır).
    const sesCtxUyandir = useCallback(() => {
      const c = sesCtxRef.current
      if (c && c.state === "suspended") { try { c.resume() } catch { /* yoksay */ } }
    }, [])

    // Kazanç zincirini kur (yalnız gerektiğinde, yalnız bir kez).
    const kazancKur = useCallback(() => {
      if (kazancRef.current) return kazancRef.current
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return null
          try {
            const ctx = new AC()
            const g = ctx.createGain()
            g.connect(ctx.destination)
            sesCtxRef.current = ctx
            kazancRef.current = g
            // createMediaElementSource bir eleman için YALNIZ BİR KEZ çağrılabilir.
            for (const a of elsRef.current) {
              if (!a) continue
                try { ctx.createMediaElementSource(a).connect(g) } catch { /* zaten bağlı */ }
            }
            try { if (ctx.state === "suspended") ctx.resume() } catch { /* yoksay */ }
            return g
          } catch {
            kazancRef.current = null
            sesCtxRef.current = null
            return null
          }
    }, [])

    useEffect(() => {
      sesRef.current = ses
      try { localStorage.setItem("vukuf-ses-seviyesi", String(ses)) } catch { /* yoksay */ }
      // Susturma her yerde çalışır; seviye yalnız volume yazılabilen cihazlarda.
      for (const a of elsRef.current) { if (a) { a.volume = ses; a.muted = ses === 0 } }
      if (kazancRef.current) {
        sesCtxUyandir()
        try { kazancRef.current.gain.value = ses } catch { /* düğüm kapanmış */ }
      } else if (!volumeYazilabilir() && hareketVarRef.current && ses < 1 && ses > 0) {
        // iOS: seviye ilk kez kısıldı → zinciri şimdi kur (bu çağrı kullanıcı
        // hareketinden geliyor, bağlam askıda kalmaz).
        const g = kazancKur()
        if (g) { try { g.gain.value = ses } catch { /* yoksay */ } }
      }
    }, [ses, kazancKur, sesCtxUyandir, volumeYazilabilir])

    // Bileşen ölünce bağlamı kapat (mobilde açık bağlam pil yakar).
    useEffect(() => () => {
      const c = sesCtxRef.current
      sesCtxRef.current = null; kazancRef.current = null
      try { c && c.close() } catch { /* yoksay */ }
    }, [])

    const sesAyarla = useCallback((v) => {
      hareketVarRef.current = true          // kaydırıcı = kullanıcı hareketi
      const d = Number(v)
      setSes(Number.isFinite(d) ? Math.min(Math.max(d, 0), 1) : 1)
    }, [])

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

    // ── Bayt belleği (yukarıdaki ÖNDEN BAYT İNDİRME notu) ──
    // adres → { durum: "iniyor" | "hazir" | "hata", blobUrl, iptal }
    const sesBellekRef = useRef(new Map())
    const sonrakiOnyukleRef = useRef(null)

    const bellekBirak = (k) => {
      try { if (k.iptal) k.iptal.abort() } catch { /* yoksay */ }
      try { if (k.blobUrl) URL.revokeObjectURL(k.blobUrl) } catch { /* yoksay */ }
    }
    const bellekTemizle = useCallback(() => {
      for (const k of sesBellekRef.current.values()) bellekBirak(k)
        sesBellekRef.current.clear()
    }, [])
    // Çalınacak kaynak: bayt hazırsa yerel blob, değilse ağ adresi.
    const kaynakAl = useCallback((url) => {
      const k = sesBellekRef.current.get(url)
      return (k && k.durum === "hazir" && k.blobUrl) ? k.blobUrl : url
    }, [])

    const bellekIndir = useCallback((url) => {
      const bellek = sesBellekRef.current
      let iptal = null
      try { iptal = new AbortController() } catch { /* eski tarayıcı: iptalsiz sürer */ }
      const k = { durum: "iniyor", blobUrl: "", iptal }
      bellek.set(url, k)
      const t0 = simdiMs()                                  // TEŞHİS
      fetch(url, { mode: "cors", signal: iptal ? iptal.signal : undefined })
      .then(y => { if (!y.ok) throw new Error(String(y.status)); return y.blob() })
      .then(b => {
        if (bellek.get(url) !== k) return              // bu arada pencereden çıktı
          if (SES_TESHIS) {                                                                // TEŞHİS
            teshisBayt.tamam++; teshisBayt.sureler.push(simdiMs() - t0)
            if (teshisBayt.sureler.length > 40) teshisBayt.sureler.shift()
          }
          // Tür boş gelirse Safari blob'u çalamayabiliyor → açıkça audio/mpeg.
          const tur = (b.type && b.type.startsWith("audio/")) ? b.type : "audio/mpeg"
          k.blobUrl = URL.createObjectURL(b.type === tur ? b : new Blob([b], { type: tur }))
          k.durum = "hazir"; k.iptal = null
          // Boştaki tampon bu âyeti ağ adresiyle bekliyorsa şimdi yerel kaynağa geçsin.
          if (sonrakiOnyukleRef.current) sonrakiOnyukleRef.current()
      })
      // Hata kaydı pencerede KALIYOR: aynı dosya döngüyle tekrar tekrar istenmesin,
      // o âyet eski yoldan (ağ adresi) çalınır.
      .catch((e) => {
        if (bellek.get(url) !== k) return
          k.durum = "hata"; k.iptal = null
          if (SES_TESHIS) { teshisBayt.hata++; if (!teshisBayt.ilkHata) teshisBayt.ilkHata = String((e && (e.name + ": " + e.message)) || e) }   // TEŞHİS
      })
    }, [])

    /* Pencereyi güncelle: önceki + çalan + ONDEN kadar sonraki kalır, gerisi
     *    bırakılır; sonrakilerden inmemiş olanlar indirilmeye başlar. */
    const bellekYonet = useCallback(() => {
      const bellek = sesBellekRef.current
      const kuyruk = kuyrukRef.current
      const kari = kariIdRef.current
      const adres = (it) => mp3Url(kari, it.sureNo, it.ayetNo)
      const i = kuyrukIndisRef.current
      const tut = new Set()
      if (kuyruk[i - 1]) tut.add(adres(kuyruk[i - 1]))
        if (kuyruk[i]) tut.add(adres(kuyruk[i]))
          const ileri = []
          let j = i
          for (let n = 0; n < ONDEN; n++) {
            j = sonrakiIndeks(j)
            if (j < 0 || !kuyruk[j]) break
              const u = adres(kuyruk[j])
              tut.add(u); ileri.push(u)
          }
          for (const [u, k] of bellek) if (!tut.has(u)) { bellekBirak(k); bellek.delete(u) }
          for (const u of ileri) if (!bellek.has(u)) bellekIndir(u)
    }, [sonrakiIndeks, bellekIndir])

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
      bellekYonet()
      const b = bostaEl()
      if (!b) return
        // Boştaki tampon hâlâ çalıyorsa (geçişin son milisaniyeleri) kaynağına dokunma.
        if (!b.paused && !b.ended) return
          const j = sonrakiIndeks(kuyrukIndisRef.current)
          if (j < 0) return
            const it = kuyrukRef.current[j]
            if (!it) return
              try {
                const url = mp3Url(kariIdRef.current, it.sureNo, it.ayetNo)
                const kaynak = kaynakAl(url)
                if (b.dataset.url !== url || b.dataset.kaynak !== kaynak) {
                  const k = sesBellekRef.current.get(url)
                  // Baytlar zaten iniyorsa ağ adresini ÖNDEN DOLDURMA: Android Chrome boştaki
                  // elemanı gerçekten doldurduğu için aynı dosya iki kez inerdi. Baytlar
                  // gelince bu işlev tekrar çağrılıp yerel kaynağa geçiliyor.
                  b.preload = (kaynak === url && k && k.durum === "iniyor") ? "none" : "auto"
                  b.dataset.url = url; b.dataset.kaynak = kaynak; b.src = kaynak
                  b.playbackRate = hizRef.current
                  b.volume = sesRef.current
                  b.load()
                }
              } catch {}
    }, [bostaEl, sonrakiIndeks, bellekYonet, kaynakAl])
    sonrakiOnyukleRef.current = sonrakiOnyukle

    // ── Erken başlatma zamanlayıcısı (yukarıdaki ERKEN BAŞLATMA notu) ──
    const erkenZamanRef = useRef(0)
    const erkenIptal = useCallback(() => {
      if (erkenZamanRef.current) { clearTimeout(erkenZamanRef.current); erkenZamanRef.current = 0 }
    }, [])
    const erkenKur = useCallback(() => {
      erkenIptal()
      const a = aktifEl()
      if (!a || a.paused || a.ended) return
        if (!erkenIzinli) return
          // Tek âyet dinlemede âyet kendiliğinden bitince DURULUYOR — öne alınacak geçiş yok.
          if (tekAyetRef.current) return
            if (sonrakiIndeks(kuyrukIndisRef.current) < 0) return          // kuyruk sonu: "ended" bitirir
              if (typeof document !== "undefined" && document.visibilityState !== "visible") return
                const indeks = kuyrukIndisRef.current
                const adim = () => {
                  erkenZamanRef.current = 0
                  // İzin TETİKLEME ANINDA yeniden soruluyor: kapanma kararı ("tek ses" platformu)
                  // bu zamanlayıcı kurulduktan birkaç ms sonra gelebiliyor — ölçümde yakalandı.
                  if (!erkenIzinli) return
                    // Bu arada başka bir geçiş olduysa ya da duraklatıldıysa hiçbir şey yapma.
                    if (a !== aktifEl() || indeks !== kuyrukIndisRef.current || a.paused || a.ended) return
                      const sure = a.duration
                      if (!Number.isFinite(sure) || sure <= 0) return               // süre bilinmiyor → "ended" yolu
                        const kalan = ((sure - a.currentTime) / (a.playbackRate || 1)) * 1000 - oncuMs()
                        if (kalan <= 2) {
                          // Sıradaki âyet boştaki tamponda hazır DEĞİLSE erken geçme: yoksa çalan
                          // elemanın kaynağı değiştirilip âyet ortasında kesilirdi.
                          const j = sonrakiIndeks(indeks)
                          const it = j >= 0 ? kuyrukRef.current[j] : null
                          const b = bostaEl()
                          if (!it || !b || b.dataset.url !== mp3Url(kariIdRef.current, it.sureNo, it.ayetNo)) return
                            sonrakiAyetCalRef.current(false, true)
                            return
                        }
                        // Uzaktayken seyrek, yaklaşınca tam hedefe: zamanlayıcı kayması sona doğru küçülür.
                        erkenZamanRef.current = setTimeout(adim, kalan > 400 ? kalan - 250 : kalan)
                }
                adim()
    }, [aktifEl, bostaEl, sonrakiIndeks, erkenIptal])
    const erkenKurRef = useRef(erkenKur)
    erkenKurRef.current = erkenKur
    const erkenIptalRef = useRef(erkenIptal)
    erkenIptalRef.current = erkenIptal

    // iOS: her elemanı ilk kez kullanıcı hareketiyle "kilidini aç" (sessiz play→pause)
    const kilitAc = useCallback(() => {
      if (kilitAcikRef.current) return
        kilitAcikRef.current = true
        for (const a of elsRef.current) {
          if (!a || a === aktifEl()) continue   // aktif eleman zaten gerçek play ile açılacak
            try {
              a.muted = true
              const p = a.play()
              const geriAl = () => { a.volume = sesRef.current; a.muted = sesRef.current === 0 }
              if (p && p.then) p.then(() => { a.pause(); try { a.currentTime = 0 } catch {}; geriAl() }).catch(geriAl)
                else { a.pause(); geriAl() }
            } catch { a.volume = sesRef.current; a.muted = sesRef.current === 0 }
        }
    }, [aktifEl])

    // Bir âyeti oynat. hazir=true → sıradaki BOŞTA elemana geçerek (önden yüklenmiş) oynat
    // (arka plan güvenli). hazir=false → aktif elemana yükleyip oynat (ilk başlatma / geri).
    const _ayetOynat = useCallback((sureNo, ayetNo, besmeleIcin = null, hazir = false, erken = false) => {
      if (!elsRef.current.length) return
        setHata(null)
        erkenIptal()
        const url = mp3Url(kariIdRef.current, sureNo, ayetNo)

        // Her iki elemanı da DURDUR → aynı anda tek ses çalar (manuel "sonraki"de üst üste
        // iki ses çalması / yanlış elemanın açık kalması engellenir).
        // ERKEN geçişte çıkan âyet DURDURULMUYOR: son milisaniyelerini çalıp kendisi
        // bitiyor (bkz. ERKEN BAŞLATMA) — kesilirse âyetin sonu kırpılırdı.
        if (!erken) for (const el of elsRef.current) { if (el) { el.__erkenCikis = 0; try { el.pause() } catch {} } }
        else { const cikan = aktifEl(); if (cikan) cikan.__erkenCikis = performance.now() }

        let onyuk = false                                   // TEŞHİS: önden hazır tampona mı geçildi
        if (hazir) {
          const b = bostaEl()
          if (b && b.dataset.url === url) {
            // Önden yüklenmiş elemana geç → yükleme yok, arka planda da play() geçer
            aktifRef.current = 1 - aktifRef.current
            onyuk = true
          }
        }
        const a = aktifEl()
        if (!a) return
          // Baytlar önden indiyse YEREL kaynak — ağ beklemesi yok (bkz. ÖNDEN BAYT İNDİRME).
          const kaynak = kaynakAl(url)
          if (a.dataset.url !== url || a.dataset.kaynak !== kaynak) {
            a.preload = "auto"
            a.dataset.url = url; a.dataset.kaynak = kaynak; a.src = kaynak
          }
          try { if (a.currentTime !== 0) a.currentTime = 0 } catch {}
          a.playbackRate = hizRef.current
          a.volume = sesRef.current
          a.muted = sesRef.current === 0
          // Oynatma bir kullanıcı hareketinden gelir: kayıtlı seviye kısıksa zincir
          // burada kurulabilir (açılışta kurulamıyordu, bkz. hareketVarRef).
          hareketVarRef.current = true
          if (!volumeYazilabilir() && !kazancRef.current && sesRef.current < 1 && sesRef.current > 0) {
            const g = kazancKur()
            if (g) { try { g.gain.value = sesRef.current } catch { /* yoksay */ } }
          }
          sesCtxUyandir()            // iOS: kazanç zinciri varsa askıdan çıkar
          // ── BAŞLAMA ÖLÇÜMÜ: play() → konumun ilerlemeye başladığı an (ses geldi) ──
          // YALNIZ yerel kaynakta (ağdan başlatmada süreye sunucu gecikmesi karışır) ve
          // baştan sona ekran açıkken (arka planda zamanlayıcı kısılır, süre şişer).
          const tPlay = simdiMs()
          const yerel = kaynak !== url
          const acikBasladi = typeof document === "undefined" || document.visibilityState === "visible"
          a.__oynatma = tPlay
          // TEŞHİS kaydı (geçici)
          const r = teshisRef.current || teshisBasla("başlat", null)
          teshisRef.current = null
          {
            const bk = sesBellekRef.current.get(url)
            r.ayet = ayetEtiket(url); r.onyuk = onyuk; r.rs = a.readyState
            r.kaynak = yerel ? "blob" : bk ? `ağ(bayt ${bk.durum})` : "ağ"
            r.tPlay = tPlay; r.oncu = Math.round(oncuMs())
          }
          const sesIzle = () => {
            if (a.__oynatma !== tPlay) return                    // bu arada başka bir play()
    if (!a.paused && a.currentTime > 0.001) {
      const tSes = simdiMs()
      r.tSes = tSes
      const acik = typeof document === "undefined" || document.visibilityState === "visible"
      if (yerel && acikBasladi && acik) baslamaEkle(tSes - tPlay)
        return
    }
    if (simdiMs() - tPlay > 5000) return
      setTimeout(sesIzle, 4)
          }
          setTimeout(sesIzle, 0)
          a.play()
          .then(() => {
            a.playbackRate = hizRef.current
            setDurum("caliyor")
            setAktifAyet({ sureNo, ayetNo, besmeleIcin })
            mediaMeta(sureNo, ayetNo, besmeleIcin)
            sonrakiOnyukle()   // bir sonrakini hazırla
          })
          .catch(() => { setHata("Oynatma başlatılamadı"); setDurum("kapali") })
    }, [aktifEl, bostaEl, mediaMeta, sonrakiOnyukle, sesCtxUyandir, kazancKur, volumeYazilabilir, kaynakAl, erkenIptal])

    /* elle=true → kullanıcı "sonraki" düğmesine bastı. elle=false → âyet kendiliğinden
     *    bitti ("ended"). Tek âyet modunda yalnız İKİNCİSİ durdurur. */
    const sonrakiAyetCal = useCallback((elle = false, erken = false) => {
      erkenIptal()
      // Çift ilerleme koruması: 250ms içinde ikinci "sonraki" çağrısını yok say
      // (foreground'da spurious "ended" / hızlı çift dokunuş → sesin kesilmesi olmasın).
      const simdi = Date.now()
      if (simdi - gecisKilidiRef.current < 250) return
        gecisKilidiRef.current = simdi

        // Kuyruk bittiğinde ya da tek âyet kendiliğinden bittiğinde: TAM DURUŞ.
        const bitir = () => {
          // ⚠ SESİ DE DURDUR. Eskiden yalnız React durumu "kapali" yapılıyor, <audio>
          // çalmaya devam ediyordu: PlayerBar kayboluyor (durum kapali) ama ses arkadan
          // geliyordu — kullanıcının bildirdiği belirti tam olarak buydu.
          for (const el of elsRef.current) { if (el) { el.__erkenCikis = 0; try { el.pause() } catch { /* yoksay */ } } }
          setDurum("kapali")
          setAktifAyet(null)
          kuyrukIndisRef.current = 0
          kuyrukRef.current = []
          tekAyetRef.current = false
          try { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none" } catch {}
        }

        if (!elle && tekAyetRef.current) { bitir(); return }

        const j = sonrakiIndeks(kuyrukIndisRef.current)
        if (j < 0) { bitir(); return }
        kuyrukIndisRef.current = j
        const { sureNo, ayetNo, besmeleIcin } = kuyrukRef.current[j]
        teshisRef.current = teshisBasla(elle ? "elle" : erken ? "erken" : "ended", aktifEl())   // TEŞHİS
        // Elle geçişte önden yüklenmiş tampon doğru âyet olmayabilir → aktif elemana yükle.
        _ayetOynat(sureNo, ayetNo, besmeleIcin, !elle, erken && !elle)
    }, [sonrakiIndeks, _ayetOynat, erkenIptal, aktifEl])

    // Bu callback'lerin son sürümünü "ended"/Media Session handler'larından çağırmak için ref
    const sonrakiAyetCalRef = useRef(sonrakiAyetCal)
    sonrakiAyetCalRef.current = sonrakiAyetCal

    const oncekiAyet = useCallback(() => {
      const j = kuyrukIndisRef.current - 1
      if (j < 0) return
        kuyrukIndisRef.current = j
        const { sureNo, ayetNo, besmeleIcin } = kuyrukRef.current[j]
        teshisRef.current = teshisBasla("geri", aktifEl())   // TEŞHİS
        _ayetOynat(sureNo, ayetNo, besmeleIcin, false)
    }, [_ayetOynat, aktifEl])
    const oncekiAyetRef = useRef(oncekiAyet)
    oncekiAyetRef.current = oncekiAyet

    // ── İki elemanı kur + olay dinleyicileri (bir kez) ──
    useEffect(() => {
      const yap = () => {
        const a = new Audio()
        a.preload = "auto"
        a.volume = sesRef.current
        try { a.setAttribute("playsinline", "") } catch {}
        a.dataset.url = ""
        a.addEventListener("ended", (e) => {
          // TEŞHİS: "ended" anı; erken geçişte bu kayıt zaten açılmış olabilir.
          a.__endedAn = simdiMs()
          if (a.__teshis) {
            if (Number.isFinite(a.duration)) a.__teshis.sureSon = a.duration
              if (!a.__teshis.endedAn) a.__teshis.endedAn = a.__endedAn
                if (!a.__teshis.sonAn && a.__sonAn) a.__teshis.sonAn = a.__sonAn
                  a.__teshis = null
          }
          a.__erkenCikis = 0
          if (e.target === aktifEl()) { sonrakiAyetCalRef.current(); return }
          // Erken geçişte çıkan tampon son milisaniyelerini bitirdi → artık boşta;
          // sıradaki âyet ona yüklenebilir (çalarken dokunulmamıştı).
          if (sonrakiOnyukleRef.current) sonrakiOnyukleRef.current()
        })
        // Başlama süresi ölçümü + erken başlatma zamanlayıcısı (bkz. ERKEN BAŞLATMA)
        a.addEventListener("playing", () => {
          // TEŞHİS: konumun sona vardığı anı yakala (sessizliğin gerçek başlangıcı).
          // Uzaktayken seyrek, son 0,6 sn'de 4 ms'de bir bakılıyor.
          a.__sonAn = 0; a.__endedAn = 0
          a.__teshis = null            // yeni âyete başladı: eski geçişin kaydı artık ona ait değil
          const sonIzle = () => {
            if (!SES_TESHIS) return
              if (a.__sonAn || (a.paused && !a.ended)) return
                const d = a.duration
                if (!Number.isFinite(d) || d <= 0) { setTimeout(sonIzle, 200); return }
                const kalan = (d - a.currentTime) / (a.playbackRate || 1)
                if (a.ended || kalan <= 0.004) {
                  a.__sonAn = simdiMs()
                  if (a.__teshis && !a.__teshis.sonAn) a.__teshis.sonAn = a.__sonAn
                    return
                }
                setTimeout(sonIzle, kalan > 0.6 ? (kalan - 0.5) * 1000 : 4)
          }
          sonIzle()
          if (a === aktifEl()) erkenKurRef.current()
        })
        a.addEventListener("pause", () => {
          if (a === aktifEl()) { erkenIptalRef.current(); return }
          // Erken geçişte çıkan eleman sonuna varmadan DURAKLATILDI → bu platform iki
          // sesi birlikte çalmıyor; erken başlatma bu oturumda kapanıyor.
          if (a.__erkenCikis && !a.ended && performance.now() - a.__erkenCikis < 800) {
            erkenIzinli = false
            erkenKapanma = `platform çıkan âyeti sonuna ${Math.round(((a.duration || 0) - a.currentTime) * 1000)} ms kala durdurdu`
            // TEŞHİS: bu eleman "ended" vermeyecek; kayıt ona asılı kalırsa çok sonra
            // başka bir âyetin verisiyle dolar (sınamada yakalandı: "son→ended 3517").
            if (a.__teshis) { a.__teshis.kesildi = true; a.__teshis = null }
          }
          a.__erkenCikis = 0
        })
        // Hız, konum ya da süre değişince kalan süre değişir → zamanlayıcı yeniden kurulur.
        for (const olay of ["ratechange", "seeked", "durationchange"]) {
          a.addEventListener(olay, () => { if (a === aktifEl() && !a.paused) erkenKurRef.current() })
        }
        a.addEventListener("error", () => {
          // Yalnız aktif eleman hata verirse kullanıcıya bildir (boşta ön-yükleme hatası sessiz)
          if (a === aktifEl() && a.dataset.url) { setHata("Ses yüklenemedi"); setDurum("kapali") }
        })
        return a
      }
      elsRef.current = [yap(), yap()]

      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.setActionHandler("play",  () => {
            const a = aktifEl(); if (!a) return
            const b = bostaEl(); if (b && b !== a && !b.paused) { b.__erkenCikis = 0; try { b.pause() } catch {} }   // çift ses guard
            a.play().then(() => { setDurum("caliyor"); try { navigator.mediaSession.playbackState = "playing" } catch {} }).catch(() => {})
          })
          navigator.mediaSession.setActionHandler("pause", () => {
            for (const el of elsRef.current) { if (el) { el.__erkenCikis = 0; try { el.pause() } catch {} } }   // her iki tamponu da durdur
            setDurum("duraklatildi")
            try { navigator.mediaSession.playbackState = "paused" } catch {}
          })
          navigator.mediaSession.setActionHandler("nexttrack",     () => sonrakiAyetCalRef.current(true))
          navigator.mediaSession.setActionHandler("previoustrack", () => oncekiAyetRef.current && oncekiAyetRef.current())
        } catch {}
      }

      return () => {
        for (const a of elsRef.current) { try { a.pause(); a.src = "" } catch {} }
        bellekTemizle()
      }
      // eslint-disable-next-line
    }, [])

    // ── Foreground'a dönünce GERÇEK durumla senkronla ──
    // Kilit ekranında oynatma/duraklatma yapılıp uygulama açılınca React durumu ile <audio>
    // elemanının gerçek hali ayrışabiliyor (UI "çalıyor" der ama ses yok; ya da boştaki tampon
    // yanlışlıkla çalıp çift ses olur). Görünür olunca tek elemana indir + durumu gerçeğe çek.
    useEffect(() => {
      const senkronla = () => {
        // Arka planda zamanlayıcılar kısılıyor → erken başlatma kapanır, "ended" yolu işler.
        if (document.visibilityState !== "visible") { erkenIptalRef.current(); return }
        erkenKurRef.current()
        sesCtxUyandir()                       // askıya alınmış kazanç zinciri geri gelsin
        if (durumRef.current === "kapali") return
          const a = aktifEl(); if (!a) return
          const b = bostaEl()
          if (b && b !== a && !b.paused) { b.__erkenCikis = 0; try { b.pause() } catch {} }   // çift ses guard
          if (durumRef.current === "caliyor" && a.paused) setDurum("duraklatildi")
            else if (durumRef.current === "duraklatildi" && !a.paused) setDurum("caliyor")
      }
      document.addEventListener("visibilitychange", senkronla)
      window.addEventListener("focus", senkronla)
      return () => { document.removeEventListener("visibilitychange", senkronla); window.removeEventListener("focus", senkronla) }
    }, [aktifEl, bostaEl, sesCtxUyandir])

    // Kâri değişince: çalıyorsa durdur, tamponları temizle
    useEffect(() => {
      kariIdRef.current = kariId
      localStorage.setItem("vukuf-kari", kariId)
      // Önden inen baytlar ESKİ kârinin sesi — hepsi bırakılıyor.
      bellekTemizle()
      if (elsRef.current.length && durum !== "kapali") {
        for (const a of elsRef.current) { try { a.__erkenCikis = 0; a.pause(); a.src = ""; a.dataset.url = ""; a.dataset.kaynak = "" } catch {} }
        setDurum("kapali")
        setAktifAyet(null)
      }
      // eslint-disable-next-line
    }, [kariId])

    /* "Âyeti dinle". `ayetSayisi` verilirse kuyruğa sûrenin TAMAMI konur ve o âyetten
     *    başlanır: böylece ileri/geri düğmeleri çalışır (eskiden kuyrukta tek öğe vardı,
     *    "sonraki" kuyruğu bitirip oynatıcıyı kapatıyordu). Âyet kendiliğinden bitince
     *    yine durulur — `tekAyetRef`. Verilmezse eski davranış. */
    const ayetCal = useCallback((sureNo, ayetNo, ayetSayisi = 0) => {
      kilitAc()
      donguRef.current = false
      const toplam = Number(ayetSayisi) || 0
      if (toplam > 1) {
        const kuyruk = []
        for (let a = 1; a <= toplam; a++) kuyruk.push({ sureNo, ayetNo: a })
          kuyrukRef.current = kuyruk
          kuyrukIndisRef.current = Math.min(Math.max(1, ayetNo), toplam) - 1
      } else {
        kuyrukRef.current = [{ sureNo, ayetNo }]
        kuyrukIndisRef.current = 0
      }
      tekAyetRef.current = true
      _ayetOynat(sureNo, ayetNo, null, false)
    }, [_ayetOynat, kilitAc])

    // TEKRAR modları için: hazır bir âyet listesini [{sureNo,ayetNo,besmeleIcin?}] oynat.
    const listeCal = useCallback((liste, dongu = false) => {
      if (!liste || !liste.length) return
        kilitAc()
        tekAyetRef.current = false
        donguRef.current = !!dongu
        kuyrukRef.current = liste
        kuyrukIndisRef.current = 0
        _ayetOynat(liste[0].sureNo, liste[0].ayetNo, liste[0].besmeleIcin, false)
    }, [_ayetOynat, kilitAc])

    /* Sûreyi çal. KUYRUK HER ZAMAN SÛRENİN BAŞINDAN kurulur, yalnız BAŞLANGIÇ İNDEKSİ
     *    seçilen âyete konur. Eskiden kuyruk `baslangicAyet`ten başlıyordu, bu yüzden
     *    sûrenin ortasından başlayınca GERİ gidilemiyordu (kuyrukta önceki âyetler yoktu). */
    const sureCal = useCallback((sureNo, toplamAyetSayisi, baslangicAyet = 1) => {
      kilitAc()
      donguRef.current = false
      tekAyetRef.current = false
      const toplam = Math.max(1, Number(toplamAyetSayisi) || 1)
      const bas = Math.min(Math.max(1, Number(baslangicAyet) || 1), toplam)
      const kuyruk = []
      const besmelEkle =
      sureNo !== 1 && sureNo !== 9 && !BESMELE_OKUYANLAR.includes(kariIdRef.current)
      if (besmelEkle) kuyruk.push({ sureNo: 1, ayetNo: 1, besmeleIcin: sureNo })
        for (let a = 1; a <= toplam; a++) kuyruk.push({ sureNo, ayetNo: a })
          // Sûre BAŞINDAN başlanıyorsa besmeleden başla (eski davranış); ortadan
          // başlanıyorsa doğrudan o âyetten — besmele geride, geri gidince duyulur.
          kuyrukIndisRef.current = bas === 1 ? 0 : (besmelEkle ? 1 : 0) + (bas - 1)
          const it = kuyruk[kuyrukIndisRef.current]
          kuyrukRef.current = kuyruk
          _ayetOynat(it.sureNo, it.ayetNo, it.besmeleIcin, false)
    }, [_ayetOynat, kilitAc])

    const besmeleCal = useCallback(() => {
      kilitAc()
      tekAyetRef.current = true
      kuyrukRef.current = [{ sureNo: 1, ayetNo: 1 }]
      kuyrukIndisRef.current = 0
      _ayetOynat(1, 1, null, false)
    }, [_ayetOynat, kilitAc])

    const duraklat = useCallback(() => {
      const a = aktifEl()
      if (!a || durum === "kapali") return
        // Her iki tamponu da durdur → arkada bir tampon çalıyor kalmasın (çift ses)
        for (const el of elsRef.current) { if (el) { el.__erkenCikis = 0; try { el.pause() } catch {} } }
        setDurum("duraklatildi")
        try { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused" } catch {}
    }, [durum, aktifEl])

    const devamEt = useCallback(() => {
      const a = aktifEl()
      if (!a || durum === "kapali") return
        if (!aktifAyet) return
          // Src bir şekilde düştüyse (arka planda iOS boşaltmış olabilir) mevcut âyeti yeniden yükle
          const beklenen = mp3Url(kariIdRef.current, aktifAyet.sureNo, aktifAyet.ayetNo)
          if (a.dataset.url !== beklenen || !a.src) {
            _ayetOynat(aktifAyet.sureNo, aktifAyet.ayetNo, aktifAyet.besmeleIcin, false)
            return
          }
          const b = bostaEl(); if (b && b !== a && !b.paused) { b.__erkenCikis = 0; try { b.pause() } catch {} }   // çift ses guard
          sesCtxUyandir()            // iOS: kazanç zinciri askıdaysa uyandır
          a.play()
          .then(() => { setDurum("caliyor"); try { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing" } catch {} })
          .catch(() => setDurum("kapali"))
    }, [durum, aktifEl, bostaEl, aktifAyet, _ayetOynat, sesCtxUyandir])

    const durdur = useCallback(() => {
      erkenIptalRef.current()
      for (const a of elsRef.current) { try { a.__erkenCikis = 0; a.pause(); a.src = ""; a.dataset.url = ""; a.dataset.kaynak = "" } catch {} }
      bellekTemizle()
      donguRef.current = false
      tekAyetRef.current = false
      kuyrukRef.current = []
      kuyrukIndisRef.current = 0
      setDurum("kapali")
      setAktifAyet(null)
      setHata(null)
      try { if ("mediaSession" in navigator) { navigator.mediaSession.playbackState = "none"; navigator.mediaSession.metadata = null } } catch {}
    }, [bellekTemizle])

    // Düğmeden gelen "sonraki": ELLE. (Argümansız çağrılmalı — `onClick={sonrakiAyet}`
    // ile bağlanırsa tıklama olayı ilk argüman olur; o yüzden burada sarmalanıyor.)
    const sonrakiAyet = useCallback(() => {
      sonrakiAyetCal(true)
    }, [sonrakiAyetCal])

    return {
      durum, aktifAyet, kariId, hata,
      ayetCal, sureCal, besmeleCal, listeCal,
      duraklat, devamEt, durdur,
      oncekiAyet, sonrakiAyet,
      hiz, hizAyarla,
      ses, sesAyarla,
      setKariId, mp3Url, besmeleUrl, KARILAR,
    }
  }
