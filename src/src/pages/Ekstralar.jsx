/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — EKSTRALAR
   src/pages/Ekstralar.jsx

   3 Kasım 2026 — kullanıcı: "Ana menüye ekstralar sayfası yapalım, mümkünse diyanet
   radyoyu bağlayalım, yakındaki camiler seçeneğini sunalım, pusula eklenebiliyorsa
   kıble bulma, varsa farklı öneriler de iletilebilir."

   • NAMAZ VAKİTLERİ (3 Kasım 2026) — konumdan ya da il/ilçe seçerek; sıradaki vakte
     kalan süre, günün vakitleri, ≈30 günü takvime ekleme (.ics). data/namazVakitleri.js
   • KANDİLLER VE MÜBAREK GÜNLER — Diyanet dinî günler takvimi (yaklaşanlar).
   • DİYANET RADYOLARI — Diyanet Radyo, Kur'an Radyo, Risalet Radyo canlı yayınları
     (HLS). Ses uygulama kökünde (data/radyo.jsx): sayfadan çıkınca da çalar, öbür
     ekranlarda küçük radyo hapı görünür (components/MiniRadyo.jsx).
   • KIBLE PUSULASI — konumdan Kâbe yönü (büyük daire kerterizi) ve uzaklık;
     telefonun pusulası varsa kadran telefonla birlikte döner, kıbleye dönülünce
     işaret yeşillenir. iPhone'da hareket/yön izni bir dokunuşla istenir.
   • YAKINDAKİ CAMİLER — konum izni verilirse o noktada, verilmezse genel aramayla
     harita uygulamasında "cami" araması açılır (Google Haritalar / Apple Haritalar).
   • ZİKİRMATİK — dokundukça sayar, hedefe (33/99/100) gelince titreşir; sayı
     cihazda saklanır.
   • Hicrî tarih Namaz Vakitleri kartında, Diyanet'in takviminden gelir (3 Kasım 2026'da
     başlıktaki Ümmü'l-Kurâ hesabı kaldırıldı: Diyanet takviminden bir gün sapabiliyordu).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Radio, Compass, MapPin, Sparkles, Play, Pause, ExternalLink, RotateCcw, Navigation, Loader2, X, Clock, CalendarPlus, Moon, LocateFixed } from "lucide-react"
import { useApp } from "../AppContext"
import { useRadyo, YAYINLAR } from "../data/radyo"
import {
  VAKITLER, sehirleriGetir, ilceleriGetir, vakitleriGetir, secimOku, secimYaz, durumHesapla, kalanMetni,
  konumdanBul, icsIndir, yaklasanGunler,
} from "../data/namazVakitleri"

// ── KIBLE ────────────────────────────────────────────────────────────────────
const KABE = { lat: 21.422487, lng: 39.826206 }
const rad = d => d * Math.PI / 180
const der = r => r * 180 / Math.PI
function kibleAcisi(lat, lng) {
  const f1 = rad(lat), f2 = rad(KABE.lat), dl = rad(KABE.lng - lng)
  const y = Math.sin(dl) * Math.cos(f2)
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)
  return (der(Math.atan2(y, x)) + 360) % 360
}
function uzaklikKm(lat, lng) {
  const R = 6371, f1 = rad(lat), f2 = rad(KABE.lat)
  const a = Math.sin((f2 - f1) / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(rad(KABE.lng - lng) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
const aciFarki = (a, b) => ((a - b + 540) % 360) - 180          // -180..180
const YONLER = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"]
const yonAdi = a => YONLER[Math.round(a / 45) % 8]

function konumAl() {
  return new Promise((coz, red) => {
    if (!navigator.geolocation) { red(new Error("yok")); return }
    navigator.geolocation.getCurrentPosition(
      p => coz({ lat: p.coords.latitude, lng: p.coords.longitude, dogruluk: p.coords.accuracy }),
      e => red(e), { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
  })
}
const iosMu = () => typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))

// ── ORTAK KART ───────────────────────────────────────────────────────────────
function Kart({ theme, Ikon, baslik, alt, children }) {
  return (
    <section style={{
      background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "14px",
      padding: "14px", marginBottom: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <span style={{ width: "34px", height: "34px", borderRadius: "10px", background: `${theme.accent}18`, color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Ikon size={18} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: "15.5px", fontWeight: 600, color: theme.text }}>{baslik}</h2>
          {alt && <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "1px" }}>{alt}</div>}
        </div>
      </div>
      {children}
    </section>
  )
}
const dugmeStil = (theme, birincil) => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px",
  padding: "9px 14px", borderRadius: "10px", fontFamily: "inherit", fontSize: "13px", fontWeight: 600,
  cursor: "pointer", textDecoration: "none",
  border: `1px solid ${birincil ? theme.accent : theme.border}`,
  background: birincil ? theme.accent : "transparent", color: birincil ? "#fff" : theme.text,
})

// ── NAMAZ VAKİTLERİ ──────────────────────────────────────────────────────────
function NamazVakitleri({ theme }) {
  const [secim, setSecim] = useState(secimOku)
  const [liste, setListe] = useState(null)
  const [durum, setDurum] = useState("bos")             // bos | yukleniyor | hazir | hata
  const [hata, setHata] = useState("")
  const [seciyor, setSeciyor] = useState(!secimOku())   // il/ilçe seçim kutusu açık mı
  const [sehirler, setSehirler] = useState([])
  const [ilceler, setIlceler] = useState([])
  const [taslakSehir, setTaslakSehir] = useState("")
  const [konumAraniyor, setKonumAraniyor] = useState(false)
  const [, setTik] = useState(0)

  // Vakitleri getir
  useEffect(() => {
    if (!secim) return
    let iptal = false
    setDurum("yukleniyor"); setHata("")
    vakitleriGetir(secim.ilceId)
      .then(l => { if (!iptal) { setListe(l); setDurum("hazir") } })
      .catch(() => { if (!iptal) { setDurum("hata"); setHata("Vakitler alınamadı. İnternet bağlantısı ya da vakit sunucusu kaynaklı olabilir; biraz sonra tekrar denenebilir.") } })
    return () => { iptal = true }
  }, [secim])
  // Kalan süre için tazele
  useEffect(() => {
    const t = setInterval(() => setTik(n => n + 1), 15000)
    return () => clearInterval(t)
  }, [])
  // İl listesi (seçim kutusu açılınca)
  useEffect(() => {
    if (!seciyor || sehirler.length) return
    sehirleriGetir().then(setSehirler).catch(() => setHata("İl listesi alınamadı; internet bağlantısı kontrol edilebilir."))
  }, [seciyor, sehirler.length])
  useEffect(() => {
    if (!taslakSehir) { setIlceler([]); return }
    ilceleriGetir(taslakSehir).then(setIlceler).catch(() => setIlceler([]))
  }, [taslakSehir])

  const sec = (yeni) => { secimYaz(yeni); setSecim(yeni); setSeciyor(false); setListe(null) }
  const konumla = async () => {
    setKonumAraniyor(true); setHata("")
    try { sec(await konumdanBul()) }
    catch { setHata("Konumdan il/ilçe bulunamadı. Konum izni verilmemiş olabilir; il ve ilçe aşağıdan seçilebilir.") }
    finally { setKonumAraniyor(false) }
  }

  const d = liste ? durumHesapla(liste) : null
  const sonrakiKalan = d?.sonraki ? d.sonraki.an - Date.now() : null
  const secStil = {
    width: "100%", padding: "9px 10px", borderRadius: "10px", fontFamily: "inherit", fontSize: "13.5px",
    color: theme.text, background: theme.background, border: `1px solid ${theme.border}`,
  }

  return (
    <Kart theme={theme} Ikon={Clock} baslik="Namaz Vakitleri"
      alt={secim ? `${secim.ilceAdi}${secim.sehirAdi && secim.sehirAdi !== secim.ilceAdi ? " · " + secim.sehirAdi : ""}` : "Diyanet aylık vakitleri"}>
      {seciyor ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={konumla} disabled={konumAraniyor} style={dugmeStil(theme, true)}>
            {konumAraniyor ? <Loader2 size={15} className="vk-don" /> : <LocateFixed size={15} />} Konumumdan bul
          </button>
          <div style={{ fontSize: "11.5px", color: theme.textSecondary, textAlign: "center" }}>ya da</div>
          <select value={taslakSehir} onChange={e => setTaslakSehir(e.target.value)} style={secStil} aria-label="İl">
            <option value="">İl seçiniz</option>
            {sehirler.map(s => <option key={s.SehirID} value={s.SehirID}>{s.SehirAdi}</option>)}
          </select>
          <select value="" disabled={!ilceler.length} aria-label="İlçe" style={secStil}
            onChange={e => {
              const i = ilceler.find(x => x.IlceID === e.target.value)
              const sh = sehirler.find(x => x.SehirID === taslakSehir)
              if (i && sh) sec({ sehirId: sh.SehirID, sehirAdi: sh.SehirAdi, ilceId: i.IlceID, ilceAdi: i.IlceAdi, kaynak: "elle" })
            }}>
            <option value="">{taslakSehir ? "İlçe seçiniz" : "Önce il seçiniz"}</option>
            {ilceler.map(i => <option key={i.IlceID} value={i.IlceID}>{i.IlceAdi}</option>)}
          </select>
          {hata && <div style={{ fontSize: "12px", color: "#c0392b", lineHeight: 1.5 }}>{hata}</div>}
          {secim && <button onClick={() => setSeciyor(false)} style={{ ...dugmeStil(theme, false), alignSelf: "center" }}>Vazgeç</button>}
        </div>
      ) : durum === "hata" ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12.5px", color: "#c0392b", lineHeight: 1.5, marginBottom: "10px" }}>{hata}</div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setSecim({ ...secim })} style={dugmeStil(theme, true)}><RotateCcw size={14} /> Tekrar dene</button>
            <button onClick={() => setSeciyor(true)} style={dugmeStil(theme, false)}>Konumu değiştir</button>
          </div>
        </div>
      ) : !d || !d.bugun ? (
        <div style={{ textAlign: "center", padding: "10px 0", color: theme.textSecondary, fontSize: "13px" }}>
          <Loader2 size={18} className="vk-don" /> Vakitler yükleniyor…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {d.sonraki && (
            <div style={{
              textAlign: "center", padding: "12px", borderRadius: "12px",
              background: `${theme.accent}12`, border: `1px solid ${theme.accent}33`,
            }}>
              <div style={{ fontSize: "12px", color: theme.textSecondary }}>{d.sonraki.yarin ? "Yarın" : "Sıradaki vakit"}: <strong style={{ color: theme.text }}>{d.sonraki.ad}</strong> · {d.sonraki.saat}</div>
              <div style={{ fontSize: "26px", fontWeight: 700, color: theme.accent, marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>{kalanMetni(sonrakiKalan)}</div>
              <div style={{ fontSize: "11px", color: theme.textSecondary }}>kaldı</div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
            {VAKITLER.map(v => {
              const sira = d.sonraki && !d.sonraki.yarin && d.sonraki.k === v.k
              const simdi = d.simdiki === v.k
              return (
                <div key={v.k} style={{
                  padding: "8px 6px", borderRadius: "10px", textAlign: "center",
                  border: `1px solid ${sira ? theme.accent : theme.border}`,
                  background: simdi ? `${theme.accent}18` : sira ? `${theme.accent}0a` : "transparent",
                }}>
                  <div style={{ fontSize: "11.5px", color: theme.textSecondary }}>{v.ad}</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: sira || simdi ? theme.accent : theme.text, fontVariantNumeric: "tabular-nums" }}>{d.bugun[v.k]}</div>
                </div>
              )
            })}
          </div>
          {d.bugun.HicriTarihUzun && (
            <div style={{ fontSize: "12px", color: theme.textSecondary, textAlign: "center" }}>
              {d.bugun.MiladiTarihUzun} · {d.bugun.HicriTarihUzun}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => icsIndir(liste, secim)} style={dugmeStil(theme, true)}><CalendarPlus size={15} /> Takvime ekle</button>
            <button onClick={() => setSeciyor(true)} style={dugmeStil(theme, false)}><MapPin size={15} /> Konumu değiştir</button>
          </div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.5, textAlign: "center" }}>
            "Takvime ekle", elde olan yaklaşık 30 günün vakitlerini telefonun takvimine aktarır; ay dolunca yeniden eklenebilir. Vakitler cihazda saklanır, internetsiz de görünür.
          </div>
        </div>
      )}
    </Kart>
  )
}

// ── DİNÎ GÜNLER ─────────────────────────────────────────────────────────────
const GUN_ADLARI = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]
const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
function DiniGunler({ theme }) {
  const gunler = useMemo(() => yaklasanGunler(8), [])
  return (
    <Kart theme={theme} Ikon={Moon} baslik="Kandiller ve Mübarek Günler" alt="Diyanet dinî günler takvimi">
      {gunler.length === 0 ? (
        <div style={{ fontSize: "12.5px", color: theme.textSecondary }}>Takvimdeki günler geride kaldı; yeni yılın takvimi eklenince burada görünecek.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {gunler.map((g, i) => {
            const t = new Date(g.ms)
            return (
              <div key={g.t + g.ad} style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "8px 2px",
                borderTop: i ? `1px solid ${theme.border}` : "none",
              }}>
                <div style={{
                  width: "44px", flexShrink: 0, textAlign: "center", borderRadius: "8px", overflow: "hidden",
                  border: `1px solid ${theme.border}`, background: theme.background,
                }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.06em", color: "#fff", background: g.gece ? theme.accent : theme.textSecondary, padding: "1px 0" }}>{AY_ADLARI[t.getMonth()].slice(0, 3).toLocaleUpperCase("tr-TR")}</div>
                  <div style={{ fontSize: "17px", fontWeight: 700, color: theme.text, padding: "1px 0 2px" }}>{t.getDate()}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: theme.text }}>{g.ad}</div>
                  <div style={{ fontSize: "11.5px", color: theme.textSecondary }}>
                    {t.getDate()} {AY_ADLARI[t.getMonth()]} {t.getFullYear()} {GUN_ADLARI[t.getDay()]}{g.gece ? " (akşamı)" : ""}
                  </div>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: g.kalanGun === 0 ? theme.accent : theme.textSecondary, flexShrink: 0 }}>
                  {g.kalanGun === 0 ? "Bugün" : g.kalanGun === 1 ? "Yarın" : `${g.kalanGun} gün`}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Kart>
  )
}

// ── RADYO ────────────────────────────────────────────────────────────────────
// Ses uygulama kökünde (data/radyo.jsx): sayfadan çıkınca da çalmaya devam eder,
// öbür ekranlarda küçük radyo hapı görünür (components/MiniRadyo.jsx).
function Radyolar({ theme }) {
  const radyo = useRadyo()
  const hlsVar = useMemo(() => {
    try { const a = document.createElement("audio"); return !!a.canPlayType("application/vnd.apple.mpegurl") } catch { return false }
  }, [])
  const durum = radyo?.durum || "kapali"
  const aktif = radyo?.istasyon?.id || null

  const dokun = (y) => {
    if (!radyo) return
    if (aktif === y.id && durum !== "hata") {
      if (durum === "caliyor" || durum === "yukleniyor") radyo.duraklat(); else radyo.devam()
      return
    }
    radyo.cal(y.id)
  }

  return (
    <Kart theme={theme} Ikon={Radio} baslik="Diyanet Radyoları" alt="Canlı yayın">
      {!hlsVar && (
        <div style={{ fontSize: "12.5px", color: theme.textSecondary, lineHeight: 1.5, marginBottom: "10px" }}>
          Bu tarayıcı canlı yayın biçimini doğrudan çalamayabilir. Çalmazsa yayının yanındaki bağlantıdan resmî sitede dinleyebilirsiniz; telefonda çoğunlukla sorunsuz çalar.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {YAYINLAR.map(y => {
          const bu = aktif === y.id
          const caliyor = bu && durum === "caliyor"
          const yukleniyor = bu && durum === "yukleniyor"
          return (
            <div key={y.id} style={{
              display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "11px",
              border: `1px solid ${bu ? theme.accent + "66" : theme.border}`, background: bu ? `${theme.accent}0d` : "transparent",
            }}>
              <button onClick={() => dokun(y)} aria-label={caliyor ? `${y.ad} — duraklat` : `${y.ad} — dinle`}
                style={{ width: "40px", height: "40px", borderRadius: "50%", border: "none", flexShrink: 0, cursor: "pointer",
                  background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {yukleniyor ? <Loader2 size={18} className="vk-don" /> : caliyor ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: "2px" }} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: theme.text }}>{y.ad}</div>
                <div style={{ fontSize: "11.5px", color: bu && durum === "hata" ? "#c0392b" : theme.textSecondary }}>
                  {bu && durum === "hata" ? "Yayın şu an açılamadı; resmî siteden deneyebilirsiniz."
                    : yukleniyor ? "Bağlanıyor…" : caliyor ? "Çalıyor" : bu && durum === "duraklatildi" ? "Duraklatıldı" : y.aciklama}
                </div>
              </div>
              {bu && (
                <button onClick={() => radyo.kapat()} aria-label={`${y.ad} — kapat`} title="Kapat"
                  style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", display: "flex", padding: "6px" }}>
                  <X size={16} />
                </button>
              )}
              <a href={y.site} target="_blank" rel="noopener noreferrer" aria-label={`${y.ad} resmî sitesi`} title="Resmî site"
                style={{ color: theme.textSecondary, display: "flex", padding: "6px" }}>
                <ExternalLink size={16} />
              </a>
            </div>
          )
        })}
      </div>
    </Kart>
  )
}

// ── KIBLE PUSULASI ───────────────────────────────────────────────────────────
function KiblePusulasi({ theme }) {
  const [konum, setKonum] = useState(null)
  const [durum, setDurum] = useState("bos")           // bos | konum | hazir | hata
  const [hata, setHata] = useState("")
  const [yon, setYon] = useState(null)                 // telefonun baktığı yön (derece), yoksa null
  const yumusakRef = useRef(null)
  const titrestiRef = useRef(false)
  const dinleyiciRef = useRef(null)

  const pusulaDurdur = () => {
    const d = dinleyiciRef.current
    if (d) { window.removeEventListener(d.olay, d.f, true); dinleyiciRef.current = null }
  }
  useEffect(() => pusulaDurdur, [])

  const pusulaBaslat = async () => {
    try {
      const DOE = window.DeviceOrientationEvent
      if (DOE && typeof DOE.requestPermission === "function") {
        const izin = await DOE.requestPermission()
        if (izin !== "granted") return false
      }
    } catch { return false }
    pusulaDurdur()
    const mutlak = "ondeviceorientationabsolute" in window
    const olay = mutlak ? "deviceorientationabsolute" : "deviceorientation"
    const f = (e) => {
      let h = null
      if (typeof e.webkitCompassHeading === "number" && !Number.isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading
      else if ((mutlak || e.absolute) && typeof e.alpha === "number") h = (360 - e.alpha) % 360
      if (h == null) return
      const ekran = (screen.orientation && typeof screen.orientation.angle === "number") ? screen.orientation.angle : (window.orientation || 0)
      h = (h + ekran + 360) % 360
      // titremeyi azalt (açı sarmasına dikkat ederek)
      const o = yumusakRef.current
      const y = o == null ? h : (o + aciFarki(h, o) * 0.25 + 360) % 360
      yumusakRef.current = y
      setYon(y)
    }
    window.addEventListener(olay, f, true)
    dinleyiciRef.current = { olay, f }
    return true
  }

  const baslat = async () => {
    setHata(""); setDurum("konum")
    // iPhone'da yön izni KULLANICI DOKUNUŞUNUN içinde istenmeli → önce pusula
    await pusulaBaslat()
    try {
      const k = await konumAl()
      setKonum(k); setDurum("hazir")
    } catch {
      setDurum("hata")
      setHata("Konum alınamadı. Kıble yönü için konum izni gerekiyor; tarayıcı ayarlarından izin verip tekrar deneyebilirsiniz.")
    }
  }

  const kible = konum ? kibleAcisi(konum.lat, konum.lng) : null
  const uzak = konum ? uzaklikKm(konum.lat, konum.lng) : null
  const fark = (kible != null && yon != null) ? aciFarki(kible, yon) : null
  const hizali = fark != null && Math.abs(fark) <= 5
  useEffect(() => {
    if (hizali && !titrestiRef.current) { titrestiRef.current = true; try { navigator.vibrate && navigator.vibrate(60) } catch { /* yoksay */ } }
    if (!hizali) titrestiRef.current = false
  }, [hizali])

  const R = 120, B = 2 * R + 20
  const kadranDon = yon != null ? -yon : 0
  const yesil = "#2e9e5b"
  return (
    <Kart theme={theme} Ikon={Compass} baslik="Kıble Pusulası" alt="Konumunuza göre Kâbe yönü">
      {durum !== "hazir" ? (
        <div style={{ textAlign: "center", padding: "6px 0 4px" }}>
          <button onClick={baslat} disabled={durum === "konum"} style={dugmeStil(theme, true)}>
            {durum === "konum" ? <Loader2 size={16} className="vk-don" /> : <Navigation size={16} />}
            {durum === "konum" ? "Konum alınıyor…" : "Kıbleyi bul"}
          </button>
          {hata && <div style={{ fontSize: "12px", color: "#c0392b", marginTop: "10px", lineHeight: 1.5 }}>{hata}</div>}
          <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "10px", lineHeight: 1.5 }}>
            Konum izni istenir{iosMu() ? "; iPhone'da ayrıca hareket ve yön izni sorulur" : ""}. Konum yalnız yön hesabı için cihazda kullanılır, bir yere gönderilmez.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div style={{ position: "relative", width: `${B}px`, height: `${B}px`, maxWidth: "100%" }}>
            {/* telefonun baktığı yön: üstte sabit ok */}
            <svg width={B} height={B} viewBox={`0 0 ${B} ${B}`} style={{ position: "absolute", inset: 0, maxWidth: "100%", height: "auto" }} aria-hidden="true">
              <g transform={`rotate(${kadranDon} ${B / 2} ${B / 2})`} style={{ transition: "transform .12s linear" }}>
                <circle cx={B / 2} cy={B / 2} r={R} fill={theme.background} stroke={hizali ? yesil : theme.border} strokeWidth={hizali ? 3 : 1.5} />
                <circle cx={B / 2} cy={B / 2} r={R - 14} fill="none" stroke={theme.border} strokeWidth="0.8" strokeDasharray="2 4" />
                {Array.from({ length: 72 }, (_, i) => i * 5).map(a => (
                  <line key={a} x1={B / 2} y1={B / 2 - R + 3} x2={B / 2} y2={B / 2 - R + (a % 45 === 0 ? 13 : a % 15 === 0 ? 9 : 6)}
                    stroke={theme.textSecondary} strokeWidth={a % 45 === 0 ? 1.6 : 0.8} transform={`rotate(${a} ${B / 2} ${B / 2})`} />
                ))}
                {["K", "D", "G", "B"].map((h, i) => (
                  <text key={h} x={B / 2} y={B / 2 - R + 30} textAnchor="middle" fontSize="14" fontWeight="700"
                    fill={h === "K" ? "#c0392b" : theme.text} transform={`rotate(${i * 90} ${B / 2} ${B / 2})`}>{h}</text>
                ))}
                {/* Kâbe işareti kıble açısında */}
                <g transform={`rotate(${kible} ${B / 2} ${B / 2})`}>
                  <line x1={B / 2} y1={B / 2} x2={B / 2} y2={B / 2 - R + 34} stroke={hizali ? yesil : theme.accent} strokeWidth="3" strokeLinecap="round" />
                  <g transform={`translate(${B / 2 - 11} ${B / 2 - R + 12})`}>
                    <rect width="22" height="22" rx="2" fill="#1d1d1d" />
                    <rect y="6" width="22" height="3" fill="#d4af37" />
                  </g>
                </g>
                <circle cx={B / 2} cy={B / 2} r="5" fill={theme.accent} />
              </g>
              {/* sabit üst ok: telefonun önü */}
              <path d={`M${B / 2} 2 L${B / 2 - 8} 16 L${B / 2 + 8} 16 Z`} fill={hizali ? yesil : theme.text} />
            </svg>
          </div>
          <div style={{ textAlign: "center", fontSize: "13px", color: theme.text, lineHeight: 1.55 }}>
            {yon != null ? (
              hizali
                ? <strong style={{ color: yesil }}>Kıbleye dönüksünüz</strong>
                : <>Kâbe işareti üstteki oka gelene kadar <strong>{fark > 0 ? "sağa" : "sola"}</strong> dönebilirsiniz ({Math.abs(Math.round(fark))}°).</>
            ) : (
              <>Telefonun pusulası okunamadı. Kıble, <strong>kuzeyden saat yönünde {Math.round(kible)}°</strong> ({yonAdi(kible)}) tarafındadır.</>
            )}
            <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "4px" }}>
              Kıble açısı {Math.round(kible)}° · Kâbe'ye uzaklık ≈ {Math.round(uzak).toLocaleString("tr-TR")} km
            </div>
            {yon != null && (
              <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "6px" }}>
                Yön şaşıyorsa telefonu havada birkaç kez 8 çizer gibi döndürmek pusulayı ayarlar; metal eşyalardan uzak durmak da yardımcı olur.
              </div>
            )}
          </div>
          <button onClick={baslat} style={dugmeStil(theme, false)}><RotateCcw size={14} /> Konumu yenile</button>
        </div>
      )}
    </Kart>
  )
}

// ── YAKINDAKİ CAMİLER ────────────────────────────────────────────────────────
function YakinCamiler({ theme }) {
  const [durum, setDurum] = useState("bos")
  const ac = async (hangi) => {
    setDurum("konum")
    let k = null
    try { k = await konumAl() } catch { k = null }
    setDurum("bos")
    let url
    if (hangi === "apple") {
      url = k ? `https://maps.apple.com/?q=cami&sll=${k.lat},${k.lng}&z=15` : "https://maps.apple.com/?q=cami"
    } else {
      url = k ? `https://www.google.com/maps/search/cami/@${k.lat},${k.lng},15z` : "https://www.google.com/maps/search/?api=1&query=cami"
    }
    window.open(url, "_blank", "noopener")
  }
  return (
    <Kart theme={theme} Ikon={MapPin} baslik="Yakındaki Camiler" alt="Harita uygulamasında açılır">
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={() => ac("google")} disabled={durum === "konum"} style={dugmeStil(theme, true)}>
          {durum === "konum" ? <Loader2 size={15} className="vk-don" /> : <MapPin size={15} />} Google Haritalar
        </button>
        {iosMu() && (
          <button onClick={() => ac("apple")} disabled={durum === "konum"} style={dugmeStil(theme, false)}>
            <MapPin size={15} /> Apple Haritalar
          </button>
        )}
      </div>
      <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "8px", lineHeight: 1.5 }}>
        Konum izni verilirse bulunduğunuz yerin çevresindeki camiler gösterilir; verilmezse harita kendi konum bilgisiyle arar.
      </div>
    </Kart>
  )
}

// ── ZİKİRMATİK ───────────────────────────────────────────────────────────────
const ZIKIR_ANAHTAR = "vukuf-zikirmatik"
function Zikirmatik({ theme }) {
  const [z, setZ] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(ZIKIR_ANAHTAR) || "null"); if (v && typeof v.sayi === "number") return v } catch { /* yoksay */ }
    return { sayi: 0, hedef: 33, tur: 0 }
  })
  useEffect(() => { try { localStorage.setItem(ZIKIR_ANAHTAR, JSON.stringify(z)) } catch { /* yoksay */ } }, [z])
  const say = useCallback(() => {
    setZ(o => {
      const sayi = o.sayi + 1
      const doldu = o.hedef > 0 && sayi >= o.hedef
      try { navigator.vibrate && navigator.vibrate(doldu ? [80, 60, 80] : 12) } catch { /* yoksay */ }
      return doldu ? { ...o, sayi: 0, tur: o.tur + 1 } : { ...o, sayi }
    })
  }, [])
  const yuzde = z.hedef > 0 ? z.sayi / z.hedef : 0
  const C = 2 * Math.PI * 64
  return (
    <Kart theme={theme} Ikon={Sparkles} baslik="Zikirmatik" alt="Dokundukça sayar; hedefe gelince titreşir">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <button onClick={say} aria-label={`Say (${z.sayi})`} style={{
          position: "relative", width: "160px", height: "160px", borderRadius: "50%", border: "none", cursor: "pointer",
          background: `radial-gradient(circle at 50% 40%, ${theme.surface}, ${theme.accent}22)`, boxShadow: `0 6px 18px ${theme.accent}33`,
          touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
        }}>
          <svg width="160" height="160" viewBox="0 0 160 160" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
            <circle cx="80" cy="80" r="64" fill="none" stroke={theme.border} strokeWidth="6" />
            <circle cx="80" cy="80" r="64" fill="none" stroke={theme.accent} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${C * yuzde} ${C}`} transform="rotate(-90 80 80)" style={{ transition: "stroke-dasharray .15s ease" }} />
          </svg>
          <span style={{ position: "relative", fontSize: "40px", fontWeight: 700, color: theme.text, fontVariantNumeric: "tabular-nums" }}>{z.sayi}</span>
          {z.hedef > 0 && <span style={{ position: "absolute", left: 0, right: 0, bottom: "34px", fontSize: "12px", color: theme.textSecondary }}>/ {z.hedef}</span>}
        </button>
        <div style={{ fontSize: "12.5px", color: theme.textSecondary }}>Tamamlanan tur: <strong style={{ color: theme.text }}>{z.tur}</strong></div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
          {[33, 99, 100, 0].map(h => (
            <button key={h} onClick={() => setZ(o => ({ ...o, hedef: h, sayi: 0 }))} aria-pressed={z.hedef === h}
              style={{ ...dugmeStil(theme, z.hedef === h), padding: "6px 12px", fontSize: "12px" }}>
              {h ? h : "Sınırsız"}
            </button>
          ))}
          <button onClick={() => setZ(o => ({ ...o, sayi: 0, tur: 0 }))} style={{ ...dugmeStil(theme, false), padding: "6px 12px", fontSize: "12px" }}>
            <RotateCcw size={13} /> Sıfırla
          </button>
        </div>
      </div>
    </Kart>
  )
}

// ── SAYFA ────────────────────────────────────────────────────────────────────
export default function Ekstralar() {
  const { theme } = useApp()
  return (
    <div style={{
      minHeight: "100vh", background: theme.background, color: theme.text,
      padding: "18px 14px calc(70px + env(safe-area-inset-bottom))",
      maxWidth: "760px", margin: "0 auto", boxSizing: "border-box",
    }}>
      <style>{`@keyframes vk-don { to { transform: rotate(360deg) } } .vk-don { animation: vk-don 1s linear infinite }`}</style>
      <div style={{ display: "flex", alignItems: "baseline", gap: "9px", marginBottom: "14px", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: "19px", fontWeight: 600 }}>Ekstralar</h1>

      </div>
      <NamazVakitleri theme={theme} />
      <DiniGunler theme={theme} />
      <Radyolar theme={theme} />
      <KiblePusulasi theme={theme} />
      <YakinCamiler theme={theme} />
      <Zikirmatik theme={theme} />
    </div>
  )
}
