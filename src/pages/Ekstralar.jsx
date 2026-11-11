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
   • OTOMATİK KAPANMA (4 Kasım 2026) — radyo kartında süre seçilir (data/otomatikDurdurma.js);
     süre dolunca radyo kapanır, Ekstralar'dan çıkılmış olsa da.
   • KONUM İZNİ / PİL (4 Kasım 2026) — kullanıcı: "1 kez izin alıp sürekli kullanmak
     mobilde şarjı etkiler gibi geliyor. İzin sıfırlama ile 1 kez izin vermeyi
     önerebiliriz, yapabiliyorsak buton ile izni sıfırlayabiliriz."
     Konum yalnız düğmeye dokunulunca BİR KEZ okunur (watchPosition yok). Pusula
     (yön algılayıcısı) sürekli dinlenen tek şey: sayfa arka plana geçince durur,
     5 dk sonra kendiliğinden kapanır, elle de kapatılabilir. Tarayıcı izni web
     sayfasından geri alınamıyor (Permissions API'de revoke yok) → "Konum izni"
     kartı iznin durumunu gösterir, kayıtlı il/ilçeyi siler ve izni sıfırlamanın
     yolunu cihaza göre anlatır; "Bir kez izin ver" seçeneği önerilir.
   • CAMİ SAHNESİ + AÇILIR BÖLÜMLER (4 Kasım 2026) — kullanıcı: "Namaz vakitleri kısmına
     tema bölümündeki Cami görseli gibi bir görselle süsleyelim. Kandil ve Mübarek
     günler, Radyo, Pusula gibi diğer bölümler de açılıp kapanabilsin."
     Sıradaki vakit ve kalan süre caminin mihrabında yazar (components/CamiVakit.jsx).
     Her kartın başlığına dokunulunca açılır/kapanır; hangi bölümün açık olduğu
     "vukuf-ekstralar-bolumler"de saklanır. Başlangıçta yalnız Namaz Vakitleri açık.
     Kapalı kartın başlığında kısa özet görünür (sıradaki vakit, yaklaşan gün, çalan
     radyo…). Kapalı kartın içi çizilmez → kıble pusulası kapanınca yön algılayıcısı da durur.
   • YAKLAŞAN / SEÇİLEN VAKİT (4 Kasım 2026) — kullanıcı: "Sıradaki yerine Yaklaşan Vakit;
     farklı bir vakit seçildiğinde kalan ya da üzerinden geçen zamanı yukarıda
     gösterebiliriz. Saniye de küçük bir şekilde 'sn' ibaresiyle görüntülenebilir."
     Vakit kutucuğuna dokunulunca mihrapta o vakte kalan ya da üzerinden geçen süre
     yazar; aynı kutucuğa ya da yaklaşan vakte dokunulunca yaklaşan vakte dönülür.
     Süre saniyeyle (küçük "sn") ve saniyede bir tazelenir — yalnız kart açıkken.
   • TAKVİM HATIRLATMASI, AYLIK VAKİTLER, RAMAZAN, KERAHAT (4 Kasım 2026):
     "Takvime ekle" küçük bir kutu açar: hatırlatma (yok / vaktinde / 5–30 dk önce) seçilir,
     .ics her vakte VALARM ile iner. "Aylık vakitler" elde olan ≈30 günü tablo olarak
     gösterir (Ramazan'da adı "İmsakiye", İmsak ve Akşam sütunları vurgulu). Ramazan
     girince (Diyanet hicrî tarihi) mihrapta kendiliğinden iftara / sahura kalan süre
     yazar — ayrıca bir ayar ya da duyuru yok. Kerahat vaktindeysek caminin sol
     kanadında levha (data/namazVakitleri.js → KERAHAT).
   • CUMA HUTBESİ (4 Kasım 2026) — kullanıcı: "izin veriyorlarsa o haftanın hutbesini
     PDF'ten otomatik indirip dönüştürebiliriz." Diyanet Din Hizmetleri'nin hutbe
     listesi robots.txt ile otomatik okumaya kapalı ve sitede yeniden yayım izni
     bulunamadı → metin uygulamaya alınmıyor; kart resmî sayfalara götürüyor.
   • KUR'AN DİNLE (11 Kasım 2026) — Türk hafızlardan cüz / sûre / âyet kayıtları, doğrudan
     akış (indirme yok). Kâriye göre olmayan biçimler kapalı belirteçle; sürekli çalma,
     otomatik kapanma, kaldığı yer. components/KuranDinleKarti.jsx, data/kuranDinle.jsx.
   • DÜZENLE (11 Kasım 2026) — kullanıcı: "Ekstralar kısmına bir düzenleme simgesi butonu
     ekleyelim, buna bastığımızda gizleme seçeneği olsun. Ana menüdeki gibi kullanacağız.
     Sıralamayı da kullanıcı isterse değiştirebilecek." Kitaplık'taki gibi: "Düzenle" →
     bölümler kısa satırlara iner, sürüklenerek sıralanır; göz düğmesiyle gizleme kipi açılır,
     her satırda göz çıkar. "Gizlileri göster" / "Sırayı sıfırla" iki dokunuşla onaylanır.
     Sıra ve gizliler data/ekstraDuzen.js'te ("vukuf-ekstralar-duzen").
   • Hicrî tarih Namaz Vakitleri kartında, Diyanet'in takviminden gelir (3 Kasım 2026'da
     başlıktaki Ümmü'l-Kurâ hesabı kaldırıldı: Diyanet takviminden bir gün sapabiliyordu).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ScrollText, BellRing, Table2, Radio, Compass, MapPin, Sparkles, Play, Pause, ExternalLink, RotateCcw, Navigation, Loader2, X, Clock, CalendarPlus, Moon, LocateFixed, ShieldCheck, Trash2, PowerOff, Pencil, Check, Eye, EyeOff, GripVertical, ListChecks, Headphones } from "lucide-react"
import { useApp } from "../AppContext"
import { useRadyo, YAYINLAR, radyoZamanlayici } from "../data/radyo"
import { useZamanlayici } from "../data/otomatikDurdurma"
import OtomatikDurdurmaSecici from "../components/OtomatikDurdurmaSecici"
import CamiVakit from "../components/CamiVakit"
import { Kart, useBolum, dugmeStil } from "../components/EkstraKart"
import NamazHatimTakibi from "../components/NamazHatimTakibi"
import KuranDinleKarti from "../components/KuranDinleKarti"
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GOZ_UZERINE_CSS } from "../components/gozUzerine"
// Radyo satırları küçük radyo hapının görünümünde (12 Kasım 2026)
import { RadyoAmblemi, RADYO_HAP_CSS } from "../components/MiniRadyo"
import { useEkstraDuzen, ekstraDuzenYaz, ekstraGizleDegis, ekstraSirala } from "../data/ekstraDuzen"
import {
  VAKITLER, vakitAni, sehirleriGetir, ilceleriGetir, vakitleriGetir, secimOku, secimYaz, durumHesapla, kalanMetni,
  konumdanBul, icsIndir, yaklasanGunler, konumBilgisiniSil, KONUM_SILINDI,
  ramazanHedefi, ramazanMi, kerahatDurumu, kerahatAraliklari, gokDurumu, HATIRLATMA_SECENEKLERI, hatirlatmaOku, hatirlatmaYaz,
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
      // Kıble ve camiler için şehir düzeyi yeter → GPS açılmaz (pil), 10 dk içindeki konum yeniden kullanılır
      e => red(e), { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 })
  })
}
const iosMu = () => typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))

// Süre yazısı: "1 sa 13 dk 42 sn" — saniye küçük ve soluk
function SureYazisi({ ms }) {
  const top = Math.max(0, Math.floor(Math.abs(ms) / 1000))
  const sa = Math.floor(top / 3600), dk = Math.floor((top % 3600) / 60), sn = top % 60
  const ana = [sa ? `${sa} sa` : "", sa || dk ? `${dk} dk` : ""].filter(Boolean).join(" ")
  return (
    <>
      <span style={{ whiteSpace: "nowrap" }}>{ana}</span>
      <span style={{ whiteSpace: "nowrap", display: "inline-block", fontSize: "0.5em", fontWeight: 600, opacity: 0.75, marginLeft: ana ? "0.35em" : 0 }}>
        {String(sn).padStart(ana ? 2 : 1, "0")} sn
      </span>
    </>
  )
}

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
  const [seciliVakit, setSeciliVakit] = useState(null)   // dokunulan vakit (null = yaklaşan vakit)
  const [takvimAcik, setTakvimAcik] = useState(false)      // "Takvime ekle" kutusu
  const [hatirlatma, setHatirlatma] = useState(hatirlatmaOku)
  const [tabloAcik, setTabloAcik] = useState(false)        // aylık vakitler / imsakiye

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
  // Konum değişince seçili vakit bırakılır
  useEffect(() => { setSeciliVakit(null) }, [secim])
  // İl listesi (seçim kutusu açılınca)
  useEffect(() => {
    if (!seciyor || sehirler.length) return
    sehirleriGetir().then(setSehirler).catch(() => setHata("İl listesi alınamadı; internet bağlantısı kontrol edilebilir."))
  }, [seciyor, sehirler.length])
  useEffect(() => {
    if (!taslakSehir) { setIlceler([]); return }
    ilceleriGetir(taslakSehir).then(setIlceler).catch(() => setIlceler([]))
  }, [taslakSehir])

  // Konum izni kartından kayıtlı konum silinince baştan başla
  useEffect(() => {
    const f = () => { setSecim(null); setListe(null); setDurum("bos"); setSeciyor(true) }
    window.addEventListener(KONUM_SILINDI, f)
    return () => window.removeEventListener(KONUM_SILINDI, f)
  }, [])
  const sec = (yeni) => { secimYaz(yeni); setSecim(yeni); setSeciyor(false); setListe(null) }
  const konumla = async () => {
    setKonumAraniyor(true); setHata("")
    try { sec(await konumdanBul()) }
    catch { setHata("Konumdan il/ilçe bulunamadı. Konum izni verilmemiş olabilir; il ve ilçe aşağıdan seçilebilir.") }
    finally { setKonumAraniyor(false) }
  }

  const bolum = useBolum("namaz")
  // Kalan süre için tazele — kart açıkken saniyede bir (saniye gösteriliyor), kapalıyken 15 sn'de bir
  useEffect(() => {
    const t = setInterval(() => setTik(n => n + 1), bolum[0] ? 1000 : 15000)
    return () => clearInterval(t)
  }, [bolum[0]]) // eslint-disable-line
  const d = liste ? durumHesapla(liste) : null
  const sonrakiKalan = d?.sonraki ? d.sonraki.an - Date.now() : null
  const ramazan = d ? ramazanHedefi(d) : null
  const kerahat = d?.bugun ? kerahatDurumu(d.bugun) : null
  const ozet = ramazan
    ? `${ramazan.tur === "iftar" ? "İftara" : "Sahura"} ${kalanMetni(ramazan.an - Date.now())} · ${ramazan.ad} ${ramazan.saat}`
    : d?.sonraki ? `${d.sonraki.ad} ${d.sonraki.saat} · ${kalanMetni(sonrakiKalan)} kaldı` : undefined
  const ramazanAyi = !!(d?.bugun && (ramazanMi(d.bugun) || ramazanMi(d.yarin)))
  const secStil = {
    width: "100%", padding: "9px 10px", borderRadius: "10px", fontFamily: "inherit", fontSize: "13.5px",
    color: theme.text, background: theme.background, border: `1px solid ${theme.border}`,
  }

  return (
    <Kart theme={theme} Ikon={Clock} baslik="Namaz Vakitleri" bolum={bolum} ozet={ozet}
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
          {/* Cami: mihrabında yaklaşan (ya da dokunulan) vakit ve kalan / geçen süre */}
          {(() => {
            const sec = seciliVakit && VAKITLER.find(v => v.k === seciliVakit)
            // Caminin solundaki gökyüzünde günün kerahat aralıkları; içindeysek sağda bildirim.
            // Ramazan'da (kerahat yokken) sağda sahur ve iftar saatleri.
            const araliklar = kerahatAraliklari(d.bugun)
            const gok = gokDurumu(d)
            const sol = (
              <>
                <span style={{ fontSize: "0.88em", fontWeight: 700, color: theme.textSecondary, marginBottom: "0.2em", lineHeight: 1.05 }}>Kerahat Vakitleri</span>
                {araliklar.map(a => (
                  <span key={a.k} title={`${a.ad} · ${a.basSaat}–${a.bitSaat}`}
                    style={{ display: "block", marginBottom: "0.12em", opacity: a.gecti && !a.aktif ? 0.55 : 1, color: a.aktif ? theme.accent : theme.textSecondary }}>
                    <span style={{ display: "block", fontSize: "0.88em" }}>{a.kisa}</span>
                    <span style={{ display: "block", fontWeight: a.aktif ? 700 : 600, color: a.aktif ? theme.accent : theme.text, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{a.basSaat}–{a.bitSaat}</span>
                  </span>
                ))}
              </>
            )
            const ramGun = d.bugun && Date.now() >= vakitAni(d.bugun, d.bugun.Aksam) && d.yarin ? d.yarin : d.bugun
            const sag = kerahat ? (
              <span role="status" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", padding: "0.35em 0.5em", borderRadius: "0.6em", border: `1px solid ${theme.accent}`, background: `${theme.accent}14` }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3em", fontWeight: 700, color: theme.accent }}>
                  <span className="vk-kerahat-nokta" style={{ width: "0.55em", height: "0.55em", borderRadius: "50%", background: theme.accent }} />Kerahat vakti
                </span>
                <span style={{ fontSize: "0.9em" }}>{kerahat.kisa}</span>
                <span style={{ color: theme.text, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>bitiş {kerahat.bitSaat}</span>
                <span style={{ fontSize: "0.9em" }}>{kalanMetni(kerahat.bit - Date.now())} kaldı</span>
              </span>
            ) : ramGun && ramazanMi(ramGun) ? (
              <>
                <span style={{ display: "block", fontSize: "0.88em" }}>Sahur</span>
                <span style={{ display: "block", fontWeight: 600, color: theme.text, fontVariantNumeric: "tabular-nums", marginBottom: "0.25em" }}>{ramGun.Imsak}</span>
                <span style={{ display: "block", fontSize: "0.88em" }}>İftar</span>
                <span style={{ display: "block", fontWeight: 600, color: theme.text, fontVariantNumeric: "tabular-nums" }}>{ramGun.Aksam}</span>
              </>
            ) : null
            if (sec) {
              const fark = vakitAni(d.bugun, d.bugun[sec.k]) - Date.now()
              return (
                <CamiVakit theme={theme} sol={sol} sag={sag} gok={gok}
                  ust={<><strong style={{ color: theme.text }}>{sec.ad}</strong> · {d.bugun[sec.k]}</>}
                  buyuk={<SureYazisi ms={fark} />}
                  alt={fark > 0 ? "kaldı" : "geçti"} />
              )
            }
            // Ramazan: iftara / sahura kalan (kendiliğinden)
            if (ramazan) {
              return (
                <CamiVakit theme={theme} sol={sol} sag={sag} gok={gok}
                  ust={<>{ramazan.tur === "iftar" ? "İftara kalan" : "Sahura kalan"}: <span style={{ whiteSpace: "nowrap" }}><strong style={{ color: theme.text }}>{ramazan.ad}</strong> · {ramazan.saat}</span></>}
                  buyuk={<SureYazisi ms={ramazan.an - Date.now()} />}
                  alt="kaldı" />
              )
            }
            return (
              <CamiVakit theme={theme} sol={sol} sag={sag} gok={gok}
                ust={d.sonraki ? <>{d.sonraki.yarin ? "Yarın" : "Yaklaşan vakit"}: <span style={{ whiteSpace: "nowrap" }}><strong style={{ color: theme.text }}>{d.sonraki.ad}</strong> · {d.sonraki.saat}</span></> : "Günün vakitleri"}
                buyuk={d.sonraki ? <SureYazisi ms={sonrakiKalan} /> : null}
                alt={d.sonraki ? "kaldı" : null} />
            )
          })()}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
            {VAKITLER.map(v => {
              const sira = d.sonraki && !d.sonraki.yarin && d.sonraki.k === v.k
              const simdi = d.simdiki === v.k
              const secili = seciliVakit === v.k
              return (
                <button key={v.k} aria-pressed={secili}
                  title={secili ? "Yaklaşan vakte dön" : `${v.ad} vaktine kalan / geçen süre`}
                  onClick={() => setSeciliVakit(secili || sira ? null : v.k)}
                  style={{
                    padding: "8px 6px", borderRadius: "10px", textAlign: "center", cursor: "pointer", fontFamily: "inherit",
                    border: secili ? `2px solid ${theme.accent}` : `1px solid ${sira ? theme.accent : theme.border}`,
                    margin: secili ? 0 : "1px",
                    background: secili ? `${theme.accent}22` : simdi ? `${theme.accent}18` : sira ? `${theme.accent}0a` : "transparent",
                  }}>
                  <div style={{ fontSize: "11.5px", color: theme.textSecondary }}>{v.ad}</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: secili || sira || simdi ? theme.accent : theme.text, fontVariantNumeric: "tabular-nums" }}>{d.bugun[v.k]}</div>
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, textAlign: "center", marginTop: "-6px" }}>
            {seciliVakit
              ? <button onClick={() => setSeciliVakit(null)} style={{ background: "none", border: "none", padding: "2px 6px", color: theme.accent, fontFamily: "inherit", fontSize: "11.5px", fontWeight: 600, cursor: "pointer" }}>Yaklaşan vakte dön</button>
              : "Bir vakte dokunulunca o vakte kalan ya da üzerinden geçen süre görünür."}
          </div>
          {d.bugun.HicriTarihUzun && (
            <div style={{ fontSize: "12px", color: theme.textSecondary, textAlign: "center" }}>
              {d.bugun.MiladiTarihUzun} · {d.bugun.HicriTarihUzun}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => setTakvimAcik(v => !v)} aria-expanded={takvimAcik} style={dugmeStil(theme, true)}><CalendarPlus size={15} /> Takvime ekle</button>
            <button onClick={() => setTabloAcik(v => !v)} aria-expanded={tabloAcik} style={dugmeStil(theme, false)}><Table2 size={15} /> {ramazanAyi ? "İmsakiye" : "Aylık vakitler"}</button>
            <button onClick={() => setSeciyor(true)} style={dugmeStil(theme, false)}><MapPin size={15} /> Konumu değiştir</button>
          </div>
          {takvimAcik && (
            <div style={{ padding: "10px 12px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: theme.background }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12.5px", fontWeight: 600, color: theme.text, marginBottom: "6px" }}>
                <BellRing size={15} color={theme.accent} /> Hatırlatma
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
                {HATIRLATMA_SECENEKLERI.map(dk => {
                  const sec = hatirlatma === dk
                  return (
                    <button key={String(dk)} aria-pressed={sec} onClick={() => { setHatirlatma(dk); hatirlatmaYaz(dk) }}
                      style={{
                        padding: "4px 9px", borderRadius: "999px", fontSize: "11.5px", fontFamily: "inherit", cursor: "pointer",
                        border: `1px solid ${sec ? theme.accent : theme.border}`, background: sec ? theme.accent : "transparent",
                        color: sec ? "#fff" : theme.textSecondary,
                      }}>
                      {dk == null ? "Yok" : dk === 0 ? "Vaktinde" : `${dk} dk önce`}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => icsIndir(liste, secim, hatirlatma)} style={{ ...dugmeStil(theme, true), width: "100%" }}>
                <CalendarPlus size={15} /> Takvim dosyasını indir
              </button>
              <div style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.5, marginTop: "8px" }}>
                Elde olan yaklaşık 30 günün vakitleri telefonun takvimine aktarılır; hatırlatmayı uygulama kapalıyken de takvim verir. Ay dolunca yeniden eklenebilir. Bazı takvim uygulamaları dosyadaki hatırlatmayı almayabilir; o durumda takvimden ayarlanabilir.
              </div>
            </div>
          )}
          {tabloAcik && <AylikVakitler theme={theme} liste={liste} bugun={d.bugun} ramazanAyi={ramazanAyi} />}
          <div style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.5, textAlign: "center" }}>
            Vakitler cihazda saklanır, internetsiz de görünür.
          </div>
        </div>
      )}
    </Kart>
  )
}

// ── AYLIK VAKİTLER / İMSAKİYE ───────────────────────────────────────────────
// Elde olan günler (≈30). Bugünün satırı vurgulu; Ramazan'da İmsak ve Akşam sütunları
// öne çıkar, Ramazan günleri satır başında küçük hilalle.
function AylikVakitler({ theme, liste, bugun, ramazanAyi }) {
  const satirlar = useMemo(() => {
    const i = liste.findIndex(g => g === bugun)
    return i >= 0 ? liste.slice(i) : liste
  }, [liste, bugun])
  const vurgulu = (k) => ramazanAyi && (k === "Imsak" || k === "Aksam")
  const hucre = { padding: "6px 4px", textAlign: "center", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }
  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ maxHeight: "360px", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: theme.text }}>
          <thead>
            <tr style={{ position: "sticky", top: 0, background: theme.surface, boxShadow: `0 1px 0 ${theme.border}` }}>
              <th style={{ ...hucre, textAlign: "left", paddingLeft: "8px", color: theme.textSecondary, fontWeight: 600 }}>Gün</th>
              {VAKITLER.map(v => (
                <th key={v.k} style={{ ...hucre, color: vurgulu(v.k) ? theme.accent : theme.textSecondary, fontWeight: vurgulu(v.k) ? 700 : 600 }}>{v.ad}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {satirlar.map(g => {
              const bu = g === bugun
              const [gg, aa] = String(g.MiladiTarihKisa || "").split(".")
              return (
                <tr key={g.MiladiTarihKisa} style={{ background: bu ? `${theme.accent}18` : "transparent", borderTop: `1px solid ${theme.border}55` }}>
                  <td style={{ ...hucre, textAlign: "left", paddingLeft: "8px", fontWeight: bu ? 700 : 500 }}>
                    {gg}.{aa}{ramazanMi(g) && <Moon size={10} color={theme.accent} style={{ marginLeft: "3px", verticalAlign: "-1px" }} aria-label="Ramazan" />}
                  </td>
                  {VAKITLER.map(v => (
                    <td key={v.k} style={{ ...hucre, color: vurgulu(v.k) ? theme.accent : theme.text, fontWeight: vurgulu(v.k) || bu ? 700 : 400 }}>{g[v.k]}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── CUMA HUTBESİ ─────────────────────────────────────────────────────────────
const HUTBE_ADRESI = "https://dinhizmetleri.diyanet.gov.tr/kategoriler/yayinlarimiz/hutbeler/t%C3%BCrk%C3%A7e"
const HUTBE_EDEVLET = "https://www.turkiye.gov.tr/diyanet-isleri-cuma-ve-bayram-hutbeleri"
function CumaHutbesi({ theme }) {
  const bolum = useBolum("hutbe")
  const bugun = new Date()
  const kalan = (5 - bugun.getDay() + 7) % 7          // 0 = bugün Cuma
  const cuma = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate() + kalan)
  const tarih = `${cuma.getDate()} ${AY_ADLARI[cuma.getMonth()]}`
  const ozet = kalan === 0 ? "Bugün Cuma" : kalan === 1 ? `Yarın Cuma · ${tarih}` : `Cuma'ya ${kalan} gün · ${tarih}`
  return (
    <Kart theme={theme} Ikon={ScrollText} baslik="Cuma Hutbesi" alt="Diyanet'in haftalık hutbesi" bolum={bolum} ozet={ozet}>
      <div style={{ fontSize: "12.5px", color: theme.text, lineHeight: 1.55 }}>
        {kalan === 0 ? <strong style={{ color: theme.accent }}>Bugün Cuma. </strong> : <>Bu haftanın Cuma'sı: <strong>{tarih}</strong>. </>}
        Diyanet her hafta Cuma hutbesini metni ve sesli hâliyle yayımlar; hutbeler resmî sayfada okunabilir ve dinlenebilir.
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
        <a href={HUTBE_ADRESI} target="_blank" rel="noopener noreferrer" style={dugmeStil(theme, true)}>
          <ScrollText size={15} /> Hutbeler · Diyanet
        </a>
        <a href={HUTBE_EDEVLET} target="_blank" rel="noopener noreferrer" style={dugmeStil(theme, false)}>
          <ExternalLink size={14} /> e-Devlet
        </a>
      </div>
      <div style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.5, marginTop: "8px" }}>
        Hutbe metni Diyanet'in sayfasında açılır; uygulamaya kopyalanmaz.
      </div>
    </Kart>
  )
}

// ── DİNÎ GÜNLER ─────────────────────────────────────────────────────────────
const GUN_ADLARI = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]
const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
function DiniGunler({ theme }) {
  const gunler = useMemo(() => yaklasanGunler(8), [])
  const bolum = useBolum("gunler")
  const ilk = gunler[0]
  const ozet = ilk ? `${ilk.ad} · ${ilk.kalanGun === 0 ? "bugün" : ilk.kalanGun === 1 ? "yarın" : `${ilk.kalanGun} gün sonra`}` : undefined
  return (
    <Kart theme={theme} Ikon={Moon} baslik="Kandiller ve Mübarek Günler" alt="Diyanet dinî günler takvimi" bolum={bolum} ozet={ozet}>
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
  const uyku = useZamanlayici(radyoZamanlayici)
  const bolum = useBolum("radyo")
  const ozet = radyo?.istasyon
    ? `${radyo.istasyon.kisa} · ${durum === "caliyor" ? "çalıyor" : durum === "yukleniyor" ? "bağlanıyor" : durum === "hata" ? "açılamadı" : "duraklatıldı"}`
    : undefined

  const dokun = (y) => {
    if (!radyo) return
    if (aktif === y.id && durum !== "hata") {
      if (durum === "caliyor" || durum === "yukleniyor") radyo.duraklat(); else radyo.devam()
      return
    }
    radyo.cal(y.id)
  }

  return (
    <Kart theme={theme} Ikon={Radio} baslik="Diyanet Radyoları" alt="Canlı yayın" bolum={bolum} ozet={ozet}>
      {!hlsVar && (
        <div style={{ fontSize: "12.5px", color: theme.textSecondary, lineHeight: 1.5, marginBottom: "10px" }}>
          Bu tarayıcı canlı yayın biçimini doğrudan çalamayabilir. Çalmazsa yayının yanındaki bağlantıdan resmî sitede dinleyebilirsiniz; telefonda çoğunlukla sorunsuz çalar.
        </div>
      )}
      {/* HAP GÖRÜNÜMÜ (12 Kasım 2026, kullanıcı: "sürekli oynatma kısmında görünen play
          butonları güzel oldu; aynı şekilde Ekstralar'daki durdurma ve play butonlarına da
          alalım"): her yayın küçük radyo hapı gibi — kule amblemi (çalarken dalgalar atar),
          vurgu renkli yuvarlak oynat/duraklat, yanında yuvarlak sade düğmeler. Açık yayın
          kesik çizgili kapsül ve "CANLI" noktasıyla. */}
      <style>{RADYO_HAP_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {YAYINLAR.map(y => {
          const bu = aktif === y.id
          const caliyor = bu && durum === "caliyor"
          const yukleniyor = bu && durum === "yukleniyor"
          const ac = theme.accent
          const yuvarlak = (vurgu) => ({
            width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", textDecoration: "none",
            border: "none", background: vurgu ? ac : "transparent", color: vurgu ? "#fff" : theme.textSecondary,
          })
          return (
            <div key={y.id} style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "4px 5px", borderRadius: "24px",
              border: bu ? `1.5px dashed ${ac}` : `1px solid ${theme.border}`,
              background: bu ? `linear-gradient(90deg, ${ac}12, ${theme.surface} 45%)` : "transparent",
            }}>
              <span style={{ opacity: bu ? 1 : 0.75, display: "flex" }}>
                <RadyoAmblemi ac={ac} zemin={theme.surface} calar={caliyor} boy={38} />
              </span>
              <div style={{ flex: 1, minWidth: 0, padding: "0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 600, color: theme.text }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{y.ad}</span>
                  {caliyor && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", flexShrink: 0, fontSize: "9.5px", letterSpacing: "0.08em", fontWeight: 700, color: "#d64545" }}>
                      <span className="vk-radyo-canli" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#d64545" }} /> CANLI
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "11.5px", color: bu && durum === "hata" ? "#c0392b" : theme.textSecondary }}>
                  {bu && durum === "hata" ? "Yayın şu an açılamadı; resmî siteden deneyebilirsiniz."
                    : yukleniyor ? "Bağlanıyor…" : caliyor ? "Çalıyor" : bu && durum === "duraklatildi" ? "Duraklatıldı" : y.aciklama}
                </div>
              </div>
              <button onClick={() => dokun(y)} aria-label={caliyor ? `${y.ad} — duraklat` : `${y.ad} — dinle`}
                title={caliyor ? "Duraklat" : "Dinle"} style={yuvarlak(true)}>
                {yukleniyor ? <Loader2 size={16} className="vk-don" /> : caliyor ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: "2px" }} />}
              </button>
              {bu && (
                <button onClick={() => radyo.kapat()} aria-label={`${y.ad} — kapat`} title="Kapat" style={yuvarlak(false)}>
                  <X size={15} />
                </button>
              )}
              <a href={y.site} target="_blank" rel="noopener noreferrer" aria-label={`${y.ad} resmî sitesi`} title="Resmî site"
                style={yuvarlak(false)}>
                <ExternalLink size={15} />
              </a>
            </div>
          )
        })}
      </div>
      {/* Otomatik kapanma — Kur'an Dinle ve Kur'ân oynatıcısındaki gibi anahtarlı (11 Kasım 2026) */}
      <div style={{ marginTop: "10px", padding: "4px 10px", borderRadius: "11px", border: `1px solid ${theme.border}` }}>
        <OtomatikDurdurmaSecici anahtarli theme={theme} uyku={uyku} baslik="Otomatik kapanma" eylem="kapanacak"
          aciklama="Seçilen süre sonunda radyo kapanır; başka ekrandayken de" />
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

  const [pusulaUyuyor, setPusulaUyuyor] = useState(false)   // pil için kapatıldı
  const bolum = useBolum("kible")
  const pusulaDurdur = () => {
    const d = dinleyiciRef.current
    if (d) { window.removeEventListener(d.olay, d.f, true); dinleyiciRef.current = null }
  }
  useEffect(() => pusulaDurdur, [])
  // PİL: pusula yalnız gerektiğinde — sayfa arka plana geçince dinleme durur, dönünce
  // sürer; açıldıktan 5 dk sonra kendiliğinden kapanır (bir dokunuşla yeniden açılır).
  const PUSULA_SURE = 5 * 60000
  useEffect(() => {
    if (durum !== "hazir" || pusulaUyuyor) return
    const zaman = setTimeout(() => { pusulaDurdur(); setYon(null); setPusulaUyuyor(true) }, PUSULA_SURE)
    const gorunur = () => {
      const d = dinleyiciRef.current
      if (!d) return
      if (document.visibilityState === "hidden") window.removeEventListener(d.olay, d.f, true)
      else window.addEventListener(d.olay, d.f, true)
    }
    document.addEventListener("visibilitychange", gorunur)
    return () => { clearTimeout(zaman); document.removeEventListener("visibilitychange", gorunur) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durum, pusulaUyuyor])
  const pusulaKapat = () => { pusulaDurdur(); setYon(null); setPusulaUyuyor(true) }
  // Bölüm kapanınca pusula da kapanır (kart içi çizilmiyor; algılayıcı boşuna dinlenmesin)
  useEffect(() => { if (!bolum[0] && dinleyiciRef.current) pusulaKapat() }, [bolum[0]]) // eslint-disable-line
  const pusulaAc = async () => { setPusulaUyuyor(false); yumusakRef.current = null; await pusulaBaslat() }

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
    setHata(""); setDurum("konum"); setPusulaUyuyor(false)
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
    <Kart theme={theme} Ikon={Compass} baslik="Kıble Pusulası" alt="Konumunuza göre Kâbe yönü" bolum={bolum}
      ozet={kible != null ? `Kıble ${Math.round(kible)}° (${yonAdi(kible)})` : undefined}>
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
            ) : pusulaUyuyor ? (
              <>Pusula pil için kapatıldı. Kıble, <strong>kuzeyden saat yönünde {Math.round(kible)}°</strong> ({yonAdi(kible)}) tarafındadır.</>
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
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            {pusulaUyuyor
              ? <button onClick={pusulaAc} style={dugmeStil(theme, true)}><Compass size={14} /> Pusulayı aç</button>
              : yon != null && <button onClick={pusulaKapat} style={dugmeStil(theme, false)}><PowerOff size={14} /> Pusulayı kapat</button>}
            <button onClick={baslat} style={dugmeStil(theme, false)}><RotateCcw size={14} /> Konumu yenile</button>
          </div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, textAlign: "center", lineHeight: 1.45 }}>
            Pil için pusula, uygulama arka plandayken çalışmaz ve 5 dakika sonra kendiliğinden kapanır.
          </div>
        </div>
      )}
    </Kart>
  )
}

// ── KONUM İZNİ ───────────────────────────────────────────────────────────────
// Tarayıcı izni web sayfasından geri alınamıyor (Permissions API'de revoke yok);
// burada durumu gösterilir, kayıtlı il/ilçe silinir, sıfırlama yolu anlatılır.
function KonumIzni({ theme }) {
  const [izin, setIzin] = useState(null)        // granted | prompt | denied | null (bilinmiyor)
  const [silindi, setSilindi] = useState(false)
  const [kayitli, setKayitli] = useState(() => !!secimOku())
  useEffect(() => {
    let durum = null, iptal = false
    try {
      navigator.permissions?.query({ name: "geolocation" }).then(d => {
        if (iptal) return
        durum = d; setIzin(d.state)
        d.onchange = () => setIzin(d.state)
      }).catch(() => {})
    } catch { /* yoksay */ }
    const f = () => setKayitli(!!secimOku())
    window.addEventListener(KONUM_SILINDI, f)
    const t = setInterval(f, 5000)
    return () => { iptal = true; if (durum) durum.onchange = null; window.removeEventListener(KONUM_SILINDI, f); clearInterval(t) }
  }, [])
  const ios = iosMu()
  const android = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)
  const izinMetni = izin === "granted" ? "Konum izni verilmiş"
    : izin === "denied" ? "Konum izni kapalı"
    : izin === "prompt" ? "Her kullanımda sorulur"
    : "İzin durumu bu tarayıcıda okunamıyor"
  const bolum = useBolum("izin")
  const sil = () => { konumBilgisiniSil(); setSilindi(true); setKayitli(false); setTimeout(() => setSilindi(false), 2500) }
  return (
    <Kart theme={theme} Ikon={ShieldCheck} baslik="Konum izni" alt={izinMetni} bolum={bolum}>
      <div style={{ fontSize: "12.5px", color: theme.text, lineHeight: 1.55 }}>
        Konum yalnız "Konumumdan bul", "Kıbleyi bul" ya da camiler düğmesine dokunulduğunda bir kez okunur; arka planda takip edilmez ve koordinatlar uygulamada saklanmaz. İl/ilçe bulunurken konum OpenStreetMap'e, camiler açılırken harita uygulamasına iletilir; saklanan yalnız seçilen il/ilçedir.
        İzin istendiğinde <strong>"Bir kez izin ver"</strong> seçilirse izin saklanmaz, her kullanımda yeniden sorulur.
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
        <button onClick={sil} disabled={!kayitli && !silindi} style={{ ...dugmeStil(theme, false), opacity: kayitli || silindi ? 1 : 0.55 }}>
          <Trash2 size={14} /> {silindi ? "Silindi" : "Kayıtlı konumu sil"}
        </button>
      </div>
      <div style={{ fontSize: "11.5px", color: theme.textSecondary, lineHeight: 1.55, marginTop: "10px" }}>
        <strong style={{ color: theme.text }}>Tarayıcı iznini sıfırlamak için</strong> (izin uygulamanın içinden geri alınamıyor; menü adları sürüme göre biraz değişebilir):
        {ios ? (
          <ul style={{ margin: "4px 0 0", paddingLeft: "18px" }}>
            <li>Safari'de: adres çubuğundaki <strong>aA</strong> → Web Sitesi Ayarları → Konum → <strong>Sor</strong>.</li>
            <li>Ana ekrana eklenmiş uygulamada: Ayarlar → Gizlilik ve Güvenlik → Konum Servisleri → Safari Web Siteleri → <strong>Bir Dahaki Sefere Sor</strong>.</li>
          </ul>
        ) : android ? (
          <ul style={{ margin: "4px 0 0", paddingLeft: "18px" }}>
            <li>Chrome'da: adres çubuğunun solundaki simge → İzinler → <strong>İzinleri sıfırla</strong>.</li>
            <li>Ana ekrana yüklenmiş uygulamada: uygulama simgesine basılı tutup Uygulama bilgileri → İzinler → Konum → <strong>Her zaman sor</strong>.</li>
          </ul>
        ) : (
          <ul style={{ margin: "4px 0 0", paddingLeft: "18px" }}>
            <li>Adres çubuğunun solundaki kilit/ayar simgesi → Konum → <strong>Sor</strong> ya da <strong>Sıfırla</strong>.</li>
          </ul>
        )}
      </div>
    </Kart>
  )
}

// ── YAKINDAKİ CAMİLER ────────────────────────────────────────────────────────
function YakinCamiler({ theme }) {
  const [durum, setDurum] = useState("bos")
  const bolum = useBolum("camiler")
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
    <Kart theme={theme} Ikon={MapPin} baslik="Yakındaki Camiler" alt="Harita uygulamasında açılır" bolum={bolum}>
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
  const bolum = useBolum("zikir")
  const yuzde = z.hedef > 0 ? z.sayi / z.hedef : 0
  const C = 2 * Math.PI * 64
  return (
    <Kart theme={theme} Ikon={Sparkles} baslik="Zikirmatik" alt="Dokundukça sayar; hedefe gelince titreşir" bolum={bolum}
      ozet={z.sayi || z.tur ? `${z.sayi}${z.hedef ? ` / ${z.hedef}` : ""}${z.tur ? ` · ${z.tur} tur` : ""}` : undefined}>
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
// Bölümler (varsayılan sıra). `id` sıra/gizleme kaydının anahtarı — değişmesin.
const BOLUMLER = [
  { id: "namaz",   ad: "Namaz Vakitleri",             Ikon: Clock,       Bilesen: NamazVakitleri },
  { id: "gunler",  ad: "Kandiller ve Mübarek Günler", Ikon: Moon,        Bilesen: DiniGunler },
  { id: "hutbe",   ad: "Cuma Hutbesi",                Ikon: ScrollText,  Bilesen: CumaHutbesi },
  { id: "dinle",   ad: "Kur'an Dinle",                Ikon: Headphones,  Bilesen: KuranDinleKarti },
  { id: "radyo",   ad: "Diyanet Radyoları",           Ikon: Radio,       Bilesen: Radyolar },
  { id: "kible",   ad: "Kıble Pusulası",              Ikon: Compass,     Bilesen: KiblePusulasi },
  { id: "camiler", ad: "Yakındaki Camiler",           Ikon: MapPin,      Bilesen: YakinCamiler },
  { id: "zikir",   ad: "Zikirmatik",                  Ikon: Sparkles,    Bilesen: Zikirmatik },
  { id: "izin",    ad: "Konum izni",                  Ikon: ShieldCheck, Bilesen: KonumIzni },
  { id: "takip",   ad: "Namaz & Hatim Takibi",        Ikon: ListChecks,  Bilesen: NamazHatimTakibi },
]
const VARSAYILAN_SIRA = BOLUMLER.map(b => b.id)
const bolumBul = (id) => BOLUMLER.find(b => b.id === id)

// Düzenleme kipinde bölüm satırı: satırın tamamı sürüklenir; göz düğmesi sürüklemeyi başlatmaz
function DuzenSatiri({ b, theme, gizli, gizlemeMod }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id })
  const ac = theme.accent
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} data-goz-kap=""
      style={{
        transform: CSS.Transform.toString(transform), transition,
        display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", marginBottom: "8px",
        borderRadius: "12px", background: theme.surface,
        border: `1px ${gizli ? "dashed" : "solid"} ${isDragging ? ac : theme.border}`,
        boxShadow: isDragging ? "0 10px 24px rgba(0,0,0,0.22)" : "0 2px 8px rgba(0,0,0,0.04)",
        opacity: gizli ? 0.5 : 1, position: "relative", zIndex: isDragging ? 5 : "auto",
        cursor: "grab", touchAction: "manipulation", userSelect: "none", WebkitUserSelect: "none",
        WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent",
      }}>
      <GripVertical size={17} color={theme.textSecondary} style={{ flexShrink: 0, touchAction: "none" }} />
      <span style={{ width: "30px", height: "30px", borderRadius: "9px", background: `${ac}18`, color: ac, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <b.Ikon size={16} />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: "14.5px", fontWeight: 600, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {b.ad}
        {gizli && <span style={{ fontSize: "11px", fontWeight: 500, color: theme.textSecondary, marginLeft: "8px" }}>gizli</span>}
      </span>
      {/* Gizleme kipinde hep görünür; kapalıyken fareli cihazda satırın üzerine gelince belirir */}
      {(
        <button type="button" className={gizlemeMod ? undefined : "vk-goz-uzerine"} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); ekstraGizleDegis(b.id) }}
          aria-label={gizli ? `${b.ad} — göster` : `${b.ad} — gizle`} aria-pressed={gizli}
          title={gizli ? "Bölümü göster" : "Bölümü gizle"}
          style={{ ...(gizlemeMod ? { display: "flex" } : null), alignItems: "center", padding: "4px", background: "none", border: "none", cursor: "pointer", color: gizli ? theme.textSecondary : ac }}>
          {gizli ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  )
}

export default function Ekstralar() {
  const { theme } = useApp()
  const duzen = useEkstraDuzen()
  const sira = useMemo(() => ekstraSirala(duzen.sira, VARSAYILAN_SIRA), [duzen.sira])
  const gizliMi = (id) => duzen.gizli.includes(id)
  const [duzenleme, setDuzenleme] = useState(false)
  const [gizlemeMod, setGizlemeMod] = useState(false)
  const [gizliSifirla, setGizliSifirla] = useState(0)
  const [siraSifirla, setSiraSifirla] = useState(0)
  const ozelSira = sira.join() !== VARSAYILAN_SIRA.join()
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 170, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const duzenleDegis = () => {
    setDuzenleme(d => !d); setGizlemeMod(false); setGizliSifirla(0); setSiraSifirla(0)
  }
  const surukBitti = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const a = sira.indexOf(active.id), b = sira.indexOf(over.id)
    if (a < 0 || b < 0) return
    ekstraDuzenYaz({ sira: arrayMove(sira, a, b) })
    setSiraSifirla(0)
  }
  const aracStil = (dolu, renk = theme.accent) => ({
    display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "10px",
    background: dolu ? renk : "transparent", color: dolu ? "#fff" : renk,
    border: `1px solid ${renk}`, fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
  })
  const gorunenler = sira.filter(id => !gizliMi(id))

  return (
    <div style={{
      minHeight: "100vh", background: theme.background, color: theme.text,
      padding: "18px 14px calc(70px + env(safe-area-inset-bottom))",
      width: "100%", maxWidth: "760px", margin: "0 auto", boxSizing: "border-box",
    }}>
      <style>{`@keyframes vk-don { to { transform: rotate(360deg) } } .vk-don { animation: vk-don 1s linear infinite }
        @keyframes vk-kerahat { 0%,100% { opacity: 1 } 50% { opacity: .3 } } .vk-kerahat-nokta { animation: vk-kerahat 1.6s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .vk-kerahat-nokta { animation: none } }`}</style>
      <style>{GOZ_UZERINE_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "9px", marginBottom: "14px", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: "19px", fontWeight: 600 }}>Ekstralar</h1>
        {/* Yalnız simge — oynatıcı barındaki ayar düğmesi gibi yuvarlak, çerçevesiz (Kitaplık'la aynı) */}
        <button onClick={duzenleDegis} aria-pressed={duzenleme}
          aria-label={duzenleme ? "Düzenlemeyi bitir" : "Düzenle"} title={duzenleme ? "Bitti" : "Düzenle"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            width: "34px", height: "34px", borderRadius: "50%", border: "none", cursor: "pointer",
            touchAction: "manipulation", flexShrink: 0,
            background: duzenleme ? `${theme.accent}33` : "transparent",
            color: duzenleme ? theme.accent : theme.textSecondary,
          }}>
          {duzenleme ? <Check size={17} /> : <Pencil size={16} />}
        </button>
      </div>

      {duzenleme ? (
        <>
          {/* Araç çubuğu: göz (gizleme kipi) · gizlileri göster · sırayı sıfırla */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
            <button onClick={() => { setGizlemeMod(m => !m); setGizliSifirla(0) }} title="Bölümleri gizle / göster"
              aria-pressed={gizlemeMod} style={aracStil(gizlemeMod)}>
              {gizlemeMod ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            {gizlemeMod && duzen.gizli.length > 0 && (
              <button onClick={() => {
                if (gizliSifirla < 1) { setGizliSifirla(1); return }
                ekstraDuzenYaz({ gizli: [] }); setGizliSifirla(0)
              }} style={aracStil(gizliSifirla > 0)}>
                <RotateCcw size={14} />
                {gizliSifirla === 0 ? "Gizlileri göster" : "Emin misiniz? (tekrar dokunun)"}
              </button>
            )}
            {ozelSira && (
              <button onClick={() => {
                if (siraSifirla < 1) { setSiraSifirla(1); return }
                ekstraDuzenYaz({ sira: [] }); setSiraSifirla(0)
              }} style={aracStil(siraSifirla > 0)}>
                <RotateCcw size={14} />
                {siraSifirla === 0 ? "Sırayı sıfırla" : "Emin misiniz? (tekrar dokunun)"}
              </button>
            )}
          </div>
          <div style={{ fontSize: "12px", color: theme.textSecondary, lineHeight: 1.5, margin: "0 2px 12px" }}>
            {gizlemeMod
              ? "Göz simgesiyle bölümler gizlenebilir ya da yeniden gösterilebilir. Sıralama için satırlar sürüklenebilir."
              : "Sıralamak için satırlar sürüklenebilir (dokunmatikte kısa basılı tutup). Gizlemek için göz düğmesi kullanılabilir; bilgisayarda satırın üzerine gelince de göz belirir."}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={surukBitti}>
            <SortableContext items={sira} strategy={verticalListSortingStrategy}>
              {sira.map(id => {
                const b = bolumBul(id)
                return b ? <DuzenSatiri key={id} b={b} theme={theme} gizli={gizliMi(id)} gizlemeMod={gizlemeMod} /> : null
              })}
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <>
          {gorunenler.map(id => {
            const B = bolumBul(id)?.Bilesen
            return B ? <B key={id} theme={theme} /> : null
          })}
          {gorunenler.length === 0 && (
            <div style={{ padding: "18px 14px", borderRadius: "14px", border: `1px dashed ${theme.border}`, textAlign: "center", fontSize: "13px", color: theme.textSecondary, lineHeight: 1.5 }}>
              Bütün bölümler gizli. "Düzenle" ile yeniden gösterilebilir.
            </div>
          )}
        </>
      )}
    </div>
  )
}
