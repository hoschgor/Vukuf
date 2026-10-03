/* VUKUF — HIFZ ÇUBUĞU (okuma ekranının üstünde)
   src/components/HifzPaneli.jsx

   Hıfz modu AYRI BİR EKRAN DEĞİL: çalışma mushafın kendi sayfası üzerinde
   yürüyor, çünkü hıfzın büyük kısmı sayfa görüntüsüne dayanıyor — âyetin
   sayfadaki yeri de ezberin parçası. Bu yüzden denetimler sayfayı kapatmayan
   ince bir şerit hâlinde; tam ayar paneli ancak dişliye basınca açılıyor.

   Bileşen SUNUM tarafı: kapsam/kademe/zincir durumunu KuranOkuma tutuyor,
   burada yalnız düğmeler var.

   ── YENİ DÜZEN (3 Ekim 2026, kullanıcı: "hıfz menüsünü güzelleştirelim, menü
   içerikleri olsun ama daha kullanışlı ve güzel görünen bir şey olsun") ──────
   • ŞERİT: başlıkta kip simgesi + çalışılan aralık + zincir ilerleme çizgisi.
     Denetimler iki kümede: solda gezinme (perde kademesi · önceki/sonraki ·
     odakla), sağda eylem (çal · durdur · EZBERLEDİM). Ezberledim artık asıl
     eylem olarak dolu renkte.
   • AYARLAR SEKMELİ: tek uzun kaydırma yerine Plan · Tekrar · Perde · Bugün.
     Seçenekler bölünmüş düğme (segment) hâlinde; seçili olanın kısa açıklaması
     hemen altında — eskiden en alttaki uzun açıklama paragrafı okunmuyordu.
     Aç/kapa seçenekleri anahtar (switch) satırı.
   • BUGÜN SEKMESİ: bugünün tekrarı mushafın içinden takip ediliyor — aralığa
     "Çalış" ile o aralık hıfz modunda açılıyor, Kolay/Orta/Zor buradan da
     verilebiliyor. Takvim düğmesi (rozetli) artık bu sekmeyi açıyor; Hıfz
     ekranına geçiş sekmenin altında. */

import { useMemo, useState } from "react"
import {
  X, Settings2, ChevronLeft, ChevronRight, Play, Pause, Square, Check, Eye, Volume2,
  Minus, Plus, Crosshair, CalendarCheck, FileText, BookOpen, RotateCw, Pencil,
  ArrowRight, CheckCircle2,
} from "lucide-react"
import {
  KADEMELER, BIRIMLER, kademeBul,
  EZBER_TERCIHLERI, SAYFA_KISIMLARI, YONLER, TEKRAR_YONTEMLERI, DONUS_BASLARI,
  SURE_SIRALARI, sureListesiSirala, manuelOneriler, hifzOku, ayarGuncelle,
  useHifz, bekleyenTekrarlar, tekrarGruplari, bugunTamamlanan, topluCevapla,
} from "../data/hifz"
import { normHarf } from "../data/okumaKayit"

/* Seçili seçeneğin altında görünen kısa açıklamalar (eski uzun paragrafın yerine) */
const ACIKLAMA = {
  ezber: {
    sayfa: "Bulunduğunuz sayfa — tamamı ya da yarısı.",
    sure: "Bulunduğunuz sûre; kısa sûreler aşağıdaki listeden seçilir.",
    donus: "Her cüzden aynı sıradaki sayfa. Klasik usulde önce her cüzün son sayfası, sonraki dönüşte sondan ikincisi…",
    manuel: "Sûre ve âyet aralığını kendiniz yazarsınız; bağlama aralığın bir önceki âyetinden başlar.",
  },
  yon: {
    yukari: "Yeni âyetler sayfanın başından gelir.",
    asagi: "Yeni âyetler sayfanın sonundan başlar; birlikte okunan kısımlar yine mushaf sırasıyla okunur.",
  },
  tekrar: {
    duz: "Öğrenilen âyetler seçilen sayıda baştan sona okunur.",
    baglama: "Yeni âyet tekrarlanır, sonra öğrenilenlerle birlikte okunur (1 · 1-2 · 1-2-3…).",
  },
  birim: {
    kelime: "Âyetin baştan bir kısmı açık kalır (kademeye göre).",
    ayet: "Âyet ya tümüyle açık ya tümüyle perdeli — pekiştirmede kullanışlı.",
  },
  zincir: {
    true: "Sıradaki âyet açık, öğrenilenler perdeli, gelmeyenler kapalı. Çalma bulunulan âyetten başlar.",
    false: "Aralığın tamamı birden perdeli.",
  },
}

const KIP_SIMGE = { sayfa: FileText, sure: BookOpen, donus: RotateCw, manuel: Pencil }

/* Bölünmüş düğme. Az seçenekte eşit sütunlar, çokta sarmalı. */
function Secim({ theme, secenekler, deger, onSec, kucuk }) {
  const ac = theme.accent
  const esit = secenekler.length <= 4
  return (
    <div role="radiogroup" style={{
      display: esit ? "grid" : "flex", flexWrap: "wrap",
      gridTemplateColumns: esit ? `repeat(${secenekler.length}, minmax(0, 1fr))` : undefined,
      gap: "3px", padding: "3px", borderRadius: "11px",
      background: `${ac}0f`, border: `1px solid ${theme.border}`,
    }}>
      {secenekler.map(s => {
        const sec = deger === s.id
        return (
          <button key={String(s.id)} role="radio" aria-checked={sec} onClick={() => onSec?.(s.id)}
            style={{
              flex: esit ? undefined : "1 1 auto",
              minHeight: kucuk ? "28px" : "32px", padding: "0 10px", borderRadius: "8px",
              border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: kucuk ? "11.5px" : "12px", fontWeight: 600, whiteSpace: "nowrap",
              background: sec ? ac : "transparent", color: sec ? "#fff" : theme.textSecondary,
              boxShadow: sec ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
              touchAction: "manipulation", transition: "background .15s ease, color .15s ease",
            }}>{s.ad}</button>
        )
      })}
    </div>
  )
}

/* Aç/kapa satırı: başlık + açıklama solda, anahtar sağda. Satırın tamamı dokunulabilir. */
function Anahtar({ theme, acik, onDegis, baslik, aciklama, ikon: Ikon }) {
  const ac = theme.accent
  return (
    <button onClick={() => onDegis?.(!acik)} role="switch" aria-checked={acik}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "10px", textAlign: "left",
        padding: "8px 10px", borderRadius: "10px", cursor: "pointer", fontFamily: "inherit",
        border: `1px solid ${theme.border}`, background: "transparent", color: theme.text,
        marginBottom: "6px", touchAction: "manipulation",
      }}>
      {Ikon && <Ikon size={15} color={acik ? ac : theme.textSecondary} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "12.5px", fontWeight: 600 }}>{baslik}</span>
        {aciklama && <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary, lineHeight: 1.45, marginTop: "1px" }}>{aciklama}</span>}
      </span>
      <span aria-hidden="true" style={{
        width: "34px", height: "20px", borderRadius: "999px", flexShrink: 0, position: "relative",
        background: acik ? ac : `${theme.textSecondary}44`, transition: "background .15s ease",
      }}>
        <span style={{
          position: "absolute", top: "2px", left: acik ? "16px" : "2px",
          width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left .15s ease",
        }} />
      </span>
    </button>
  )
}

export default function HifzPaneli({
  acik, kapat, theme, isMobile, altBosluk = 96,
  etiket,                 // "Bakara 1-7" gibi
  kademe, onKademe,
  birim, onBirim,         // "kelime" | "ayet"
  // EZBER PLANI (30 Eylül 2026) — kuralları data/hifz.js "EZBER PLANI"nda
  ezber = "sayfa", onEzber,          // "sayfa" | "sure" | "donus" | "manuel"
  kismi = "tam", onKismi,            // sayfanın tamamı / üst / alt yarısı
  yon = "yukari", onYon,             // yeni âyetlerin geliş sırası
  tekrarYontem = "duz", onTekrarYontem,
  bagla = true, onBagla,             // bağlamada komşu âyetle başla
  donusBas = "son", onDonusBas,      // dönüş: cüz sonundan / başından
  donusYer = null, donusSira = 0, donusToplam = 0, onDonusGit,
  kisaSureler = [], seciliSure, onSureSec,
  sureSira = "orijinal", onSureSira,   // kısa sûre listesinin sırası
  onSureEzber,                         // (id, isaretle) — listeden ✓ ekle/kaldır
  sureListesi = [], manuel = { sure: 1, bas: 1, son: 7 }, onManuel,   // manuel aralık
  dokunAc = true, onDokunAc,     // perdeli yere dokununca orası açılsın mı
  dokunSes = false, onDokunSes,  // dokunulan kelime okunsun mu
  zincir, onZincir,
  aktifSira, toplam,      // zincirde kaçıncı âyetteyiz
  onOnceki, onSonraki,
  onOdakla,               // çalışılan âyeti ekrana yeniden hizala
  onPanel,                // /hifz ekranı (tekrar takvimi)
  tekrarSayisi, onTekrarSayisi,
  onCal, onDurdur, calisiyor, sesAcik,
  onEzberledim, ezberliMi,
  onHepsiniAc,
  ipucu = 0,
  bekleyenTekrar = 0,
}) {
  const [ayarAcik, setAyarAcik] = useState(false)
  const [sekme, setSekme] = useState("plan")       // "plan" | "tekrar" | "perde" | "bugun"
  // MANUEL ARAMA — arama ekranı gibi: yazdıkça öneriler (bkz. hifz.js manuelOneriler)
  const [aramaMetni, setAramaMetni] = useState("")
  // Ezberlenen (✓) sûreleri listede gizle — kullanıcı: "göz yoruyorsa kaldırabilirsin"
  const [ezberGizle, setEzberGizle] = useState(() => !!hifzOku().ayarlar.ezberGizle)
  // BUGÜN sekmesi hıfz kaydına abone (cevap verilince liste tazelensin)
  const [veri] = useHifz()
  const bugunAcik = acik && ayarAcik && sekme === "bugun"
  const bekleyen = useMemo(() => (acik ? bekleyenTekrarlar(veri) : []), [veri, acik])
  const gruplar = useMemo(() => (bugunAcik ? tekrarGruplari(bekleyen) : []), [bugunAcik, bekleyen])
  const tamamlanan = useMemo(() => (bugunAcik ? bugunTamamlanan(veri) : 0), [bugunAcik, veri])
  if (!acik) return null

  const ac = theme.accent
  const tekrarModu = veri.ayarlar.tekrarModu === "elle" ? "elle" : "otomatik"
  const sureAdi = (no) => (sureListesi.find(x => x.id === no) || {}).isim || `Sûre ${no}`

  const yuvarlak = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, padding: 0,
    border: "none", background: "transparent", color: theme.textSecondary,
    cursor: "pointer", touchAction: "manipulation",
  }
  const kume = {
    display: "flex", alignItems: "center", gap: "1px", padding: "1px",
    borderRadius: "999px", background: `${ac}0f`, border: `1px solid ${theme.border}`,
  }
  const hap = (dolu) => ({
    display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
    height: "34px", padding: "0 13px", borderRadius: "999px", flexShrink: 0,
    border: `1px solid ${ac}`, background: dolu ? ac : "transparent",
    color: dolu ? "#fff" : ac, cursor: "pointer",
    fontSize: "12.5px", fontWeight: 700, fontFamily: "inherit", touchAction: "manipulation",
  })
  const kucukDugme = {
    display: "inline-flex", alignItems: "center", gap: "4px", height: "26px", padding: "0 9px",
    borderRadius: "999px", border: `1px solid ${theme.border}`, background: "transparent",
    color: theme.textSecondary, cursor: "pointer", fontSize: "11px", fontWeight: 600,
    fontFamily: "inherit", touchAction: "manipulation", flexShrink: 0,
  }
  // Perde kademesi YALNIZ kelime biriminde anlamlı: âyet biriminde âyet ya tam
  // açık ya tam kapalı olduğu için "yarısı/ilk kelime" diye bir ara durum yok.
  const kademeVar = birim !== "ayet"
  // Başlıklar Türkçe büyük harfle (CSS text-transform "i"yi "I" yapıyordu: "TERCIHI")
  const Baslik = ({ children, ust = 12 }) => (
    <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.05em", color: theme.textSecondary, margin: `${ust}px 0 6px` }}>
      {String(children).toLocaleUpperCase("tr")}
    </p>
  )
  const Not = ({ children }) => (
    <p style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.5, margin: "5px 2px 0" }}>{children}</p>
  )
  const KipSimge = KIP_SIMGE[ezber] || FileText
  const kipAdi = (EZBER_TERCIHLERI.find(t => t.id === ezber) || {}).ad || ""
  const oran = zincir && toplam > 0 ? Math.min(1, aktifSira / toplam) : 0

  function takvimAc() {
    if (ayarAcik && sekme === "bugun") { setAyarAcik(false); return }
    setSekme("bugun"); setAyarAcik(true)
  }
  function disliAc() {
    if (ayarAcik) { setAyarAcik(false); return }
    if (sekme === "bugun") setSekme("plan")
    setAyarAcik(true)
  }

  const SEKMELER = [
    { id: "plan", ad: "Plan" },
    { id: "tekrar", ad: "Tekrar" },
    { id: "perde", ad: "Perde" },
    { id: "bugun", ad: bekleyen.length ? `Bugün · ${bekleyen.length}` : "Bugün" },
  ]

  return (
    <div style={{
      position: "fixed", left: "50%", transform: "translateX(-50%)",
      bottom: altBosluk > 0 ? `${altBosluk + 8}px` : "calc(env(safe-area-inset-bottom) + 8px)",
      width: isMobile ? "calc(100% - 16px)" : "min(620px, 94vw)",
      zIndex: 93,
      background: theme.surface,
      border: `1px solid ${ac}44`,
      borderRadius: "16px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.22)",
      boxSizing: "border-box",
      overflow: "hidden",
    }}>
      {/* ── BAŞLIK: kip simgesi · aralık · sayaçlar · takvim/dişli/kapat ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 8px 6px 10px" }}>
        <span title={`Ezber tercihi: ${kipAdi}`} style={{
          width: "30px", height: "30px", borderRadius: "10px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${ac}18`, color: ac,
        }}>
          <KipSimge size={15} />
        </span>
        <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <span style={{
            display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontSize: "13px", fontWeight: 700, color: theme.text,
          }}>{etiket}</span>
          <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {kipAdi}
            {zincir && toplam > 0 ? ` · ${aktifSira}/${toplam}. âyet` : " · tüm aralık"}
            {ipucu > 0 && (
              <span title="Bu çalışmada aldığınız ipucu" style={{ marginLeft: "6px", display: "inline-flex", alignItems: "center", gap: "2px", verticalAlign: "-1px" }}>
                · <Eye size={11} /> {ipucu}
              </span>
            )}
          </span>
        </span>
        {/* Takvim — bugünün tekrarını (Bugün sekmesi) açar; rozet bekleyen âyet sayısı */}
        <button onClick={takvimAc} title="Bugünün tekrarı" aria-label="Bugünün tekrarı"
          style={{ ...yuvarlak, position: "relative", color: bekleyenTekrar > 0 || (ayarAcik && sekme === "bugun") ? ac : theme.textSecondary }}>
          <CalendarCheck size={16} />
          {bekleyenTekrar > 0 && (
            <span style={{
              position: "absolute", top: "0px", right: "-2px",
              minWidth: "15px", height: "15px", borderRadius: "999px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "9.5px", fontWeight: 700, color: "#fff", background: ac,
              padding: "0 3px", boxSizing: "border-box",
            }}>{bekleyenTekrar}</span>
          )}
        </button>
        <button onClick={disliAc} title="Hıfz ayarları" aria-label="Hıfz ayarları" aria-expanded={ayarAcik}
          style={{ ...yuvarlak, color: ayarAcik && sekme !== "bugun" ? ac : theme.textSecondary, background: ayarAcik && sekme !== "bugun" ? `${ac}14` : "transparent" }}>
          <Settings2 size={16} />
        </button>
        <button onClick={kapat} title="Hıfz modundan çık" aria-label="Hıfz modundan çık" style={yuvarlak}>
          <X size={16} />
        </button>
      </div>

      {/* Zincir ilerleme çizgisi */}
      <div style={{ height: "3px", margin: "0 12px", borderRadius: "2px", background: `${ac}1a`, overflow: "hidden" }}>
        <div style={{ width: `${oran * 100}%`, height: "100%", background: ac, transition: "width .25s ease" }} />
      </div>

      <div style={{ padding: "8px 10px 10px" }}>
        {/* DÖNÜŞ SATIRI — dönüş ezberinde dizide gezinme (RTL: sağ ok önceki) */}
        {ezber === "donus" && donusYer && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px",
            padding: "2px 4px", borderRadius: "12px", background: `${ac}10`,
          }}>
            <button onClick={() => onDonusGit?.(donusSira - 1)} disabled={donusSira <= 0}
              title="Dizide önceki sayfa" style={{ ...yuvarlak, opacity: donusSira <= 0 ? 0.35 : 1 }}>
              <ChevronRight size={16} />
            </button>
            <span style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: "12px", color: theme.text }}>
              <b style={{ color: ac }}>{donusYer.donus}. dönüş</b> · {donusYer.cuz}. cüz · s. {donusYer.sayfa}
              <span style={{ color: theme.textSecondary, marginLeft: "6px" }}>({donusSira + 1}/{donusToplam})</span>
            </span>
            <button onClick={() => onDonusGit?.(donusSira + 1)} disabled={donusSira >= donusToplam - 1}
              title="Dizide sonraki sayfa" style={{ ...yuvarlak, opacity: donusSira >= donusToplam - 1 ? 0.35 : 1 }}>
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* ── DENETİMLER: solda gezinme, sağda eylem (dar ekranda sarmalı) ── */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
          {kademeVar && (
            <div style={kume} title="Perde kademesi">
              <button onClick={() => onKademe?.(-1)} title="Daha çok göster" aria-label="Daha çok göster" style={{ ...yuvarlak, width: "30px", height: "30px" }}><Minus size={14} /></button>
              <span style={{
                minWidth: isMobile ? "70px" : "84px", textAlign: "center",
                fontSize: "11.5px", fontWeight: 700, color: theme.text,
              }}>{kademeBul(kademe).ad}</span>
              <button onClick={() => onKademe?.(1)} title="Daha çok gizle" aria-label="Daha çok gizle" style={{ ...yuvarlak, width: "30px", height: "30px" }}><Plus size={14} /></button>
            </div>
          )}

          <div style={kume}>
            {/* Zincirde gezinme — RTL: sağ ok "önceki", sol ok "sonraki" */}
            {zincir && (
              <>
                <button onClick={onOnceki} title="Önceki âyet" aria-label="Önceki âyet" style={{ ...yuvarlak, width: "30px", height: "30px" }}><ChevronRight size={16} /></button>
                <button onClick={onSonraki} title="Sonraki âyet" aria-label="Sonraki âyet" style={{ ...yuvarlak, width: "30px", height: "30px" }}><ChevronLeft size={16} /></button>
              </>
            )}
            {/* ODAKLA — perde açıkken sayfada gezinildiğinde çalışılan âyet
                ekrandan kaçabiliyor; bu düğme onu geri getiriyor. */}
            <button onClick={onOdakla} title="Çalışılan âyeti ekrana getir" aria-label="Çalışılan âyeti ekrana getir" style={{ ...yuvarlak, width: "30px", height: "30px" }}>
              <Crosshair size={15} />
            </button>
          </div>

          {/* EYLEM KÜMESİ — dar ekranda alt satıra bütün olarak iner ve satırı
              doldurur (Ezberledim tek başına sola düşüp sarkmasın) */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 auto", justifyContent: "flex-end" }}>
          {/* SES — tek düğme oynat/duraklat; etkinken yanında DURDUR çıkıyor */}
          <button onClick={onCal} style={hap(calisiyor)}
            title={calisiyor ? "Duraklat" : tekrarYontem === "baglama" ? "Bağlama usulüyle kâri sesinden çalış" : "Kâri sesiyle tekrar et"}>
            {calisiyor ? <Pause size={14} /> : <Play size={14} />} {tekrarSayisi}×{tekrarYontem === "baglama" ? " bağla" : ""}
          </button>
          {sesAcik && (
            <button onClick={onDurdur} style={{ ...yuvarlak, border: `1px solid ${theme.border}` }} title="Sesi durdur" aria-label="Sesi durdur">
              <Square size={13} />
            </button>
          )}
          <button onClick={onEzberledim} style={{ ...hap(true), flex: "1 1 auto", maxWidth: "190px", opacity: ezberliMi ? 0.85 : 1 }}
            title="Ezberledim — işaretle ve zincirde sıradaki âyete geç (tekrar takvimine girer)">
            <Check size={15} strokeWidth={2.6} /> Ezberledim
          </button>
          </div>
        </div>

        {/* ── AYARLAR — sekmeli; kendi içinde kaydırılır (yatay telefonda ekranı kaplamasın) ── */}
        {ayarAcik && (
          <div style={{ marginTop: "10px", borderTop: `1px solid ${theme.border}`, paddingTop: "10px" }}>
            <Secim theme={theme} secenekler={SEKMELER} deger={sekme} onSec={setSekme} />
            <div style={{
              marginTop: "4px", padding: "0 2px",
              maxHeight: "min(48vh, 420px)", overflowY: "auto", overscrollBehavior: "contain",
            }}>

              {/* ═══ PLAN ═══ */}
              {sekme === "plan" && (
                <>
                  <Baslik>Ezber tercihi</Baslik>
                  <Secim theme={theme} secenekler={EZBER_TERCIHLERI} deger={ezber} onSec={onEzber} />
                  <Not>{ACIKLAMA.ezber[ezber]}</Not>

                  {(ezber === "sayfa" || ezber === "donus") && (
                    <>
                      <Baslik>Sayfanın</Baslik>
                      <Secim theme={theme} secenekler={SAYFA_KISIMLARI} deger={kismi} onSec={onKismi} kucuk />
                    </>
                  )}

                  {ezber === "donus" && (
                    <>
                      <Baslik>Dönüş başlangıcı</Baslik>
                      <Secim theme={theme} kucuk deger={donusBas} onSec={onDonusBas}
                        secenekler={DONUS_BASLARI.map(d => ({ id: d.id, ad: d.id === "son" ? `${d.ad} (klasik)` : d.ad }))} />
                    </>
                  )}

                  {ezber === "sure" && kisaSureler.length > 0 && (() => {
                    // Ezberlenmiş (✓) sûreler listenin sonunda, soluk — istenirse gizli.
                    // Her sûrede iki dokunma alanı: ADI (sûreye git) · ✓ (ezberledim işaretle / kaldır).
                    const liste = sureListesiSirala(kisaSureler, sureSira)
                    const gorunen = ezberGizle ? liste.filter(k => !k.ezber) : liste
                    const ezberSay = liste.filter(k => k.ezber).length
                    return (
                      <>
                        <Baslik>Kısa sûreler</Baslik>
                        <Secim theme={theme} secenekler={SURE_SIRALARI} deger={sureSira} onSec={onSureSira} kucuk />
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", maxHeight: "150px", overflowY: "auto", margin: "8px 0 6px" }}>
                          {gorunen.map(k => {
                            const sec = seciliSure === k.id
                            return (
                              <span key={k.id} style={{
                                display: "inline-flex", alignItems: "stretch", borderRadius: "999px", overflow: "hidden",
                                border: `1px solid ${sec ? ac : theme.border}`,
                                opacity: k.ezber && !sec ? 0.65 : 1,
                              }}>
                                <button onClick={() => onSureSec?.(k.id)} title={`${k.ayetSayisi} âyet — sûreye git`}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: "5px", padding: "0 9px 0 11px",
                                    height: "30px", border: "none", cursor: "pointer", fontFamily: "inherit",
                                    fontSize: "12px", fontWeight: 600,
                                    background: sec ? ac : "transparent", color: sec ? "#fff" : theme.textSecondary,
                                  }}>
                                  {k.isim}
                                  <span style={{ fontWeight: 400, opacity: 0.7, fontSize: "10.5px" }}>{k.ayetSayisi}</span>
                                </button>
                                <button onClick={() => onSureEzber?.(k.id, !k.ezber)}
                                  aria-pressed={k.ezber}
                                  title={k.ezber ? "Ezber işaretini kaldır" : "Bu sûreyi ezberledim olarak işaretle"}
                                  style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: "30px", height: "30px", border: "none", cursor: "pointer", padding: 0,
                                    borderLeft: `1px solid ${sec ? "#ffffff55" : theme.border}`,
                                    background: k.ezber ? `${ac}22` : "transparent",
                                    color: k.ezber ? ac : `${theme.textSecondary}88`,
                                  }}>
                                  <Check size={14} strokeWidth={k.ezber ? 3 : 2} />
                                </button>
                              </span>
                            )
                          })}
                          {!gorunen.length && (
                            <span style={{ fontSize: "12px", color: theme.textSecondary }}>Listedeki bütün sûreler ezberli. ✓</span>
                          )}
                        </div>
                        {ezberSay > 0 && (
                          <button onClick={() => { const y = !ezberGizle; setEzberGizle(y); ayarGuncelle({ ezberGizle: y }) }}
                            style={kucukDugme}>
                            <Check size={12} /> {ezberGizle ? `Ezberlenenleri göster (${ezberSay})` : `Ezberlenenleri gizle (${ezberSay})`}
                          </button>
                        )}
                      </>
                    )
                  })()}

                  {ezber === "manuel" && (() => {
                    const oneriler = manuelOneriler(aramaMetni, sureListesi, normHarf)
                    const suAn = sureListesi.find(x => x.id === manuel.sure)
                    return (
                      <>
                        <Baslik>Sûre ve âyet aralığı</Baslik>
                        {/* 16 px: iOS daha küçük yazılı alana dokununca sayfayı yakınlaştırıyor */}
                        <input
                          type="search" value={aramaMetni} placeholder="ör. Bakara 5-10 · 36:1-12 · Mülk"
                          aria-label="Sûre ve âyet aralığı ara"
                          onChange={e => setAramaMetni(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && oneriler[0]) {
                              const o = oneriler[0]
                              onManuel?.({ sure: o.id, bas: o.bas, son: o.son }); setAramaMetni("")
                            }
                          }}
                          style={{
                            width: "100%", height: "36px", borderRadius: "10px", boxSizing: "border-box",
                            border: `1px solid ${theme.border}`, background: theme.background, color: theme.text,
                            fontSize: "16px", fontFamily: "inherit", padding: "0 10px", marginBottom: "6px",
                          }}
                        />
                        {oneriler.length > 0 && (
                          <div style={{
                            display: "flex", flexDirection: "column", gap: "4px", marginBottom: "6px",
                            maxHeight: "190px", overflowY: "auto",
                          }}>
                            {oneriler.map(o => (
                              <button key={o.id}
                                onClick={() => { onManuel?.({ sure: o.id, bas: o.bas, son: o.son }); setAramaMetni("") }}
                                style={{
                                  display: "flex", alignItems: "center", gap: "8px", textAlign: "left",
                                  padding: "8px 10px", borderRadius: "9px", cursor: "pointer", fontFamily: "inherit",
                                  border: `1px solid ${theme.border}`, background: `${ac}08`, color: theme.text,
                                }}>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: ac, minWidth: "24px" }}>{o.id}</span>
                                <span style={{ flex: 1, fontSize: "13px" }}>
                                  {o.isim} <b style={{ color: ac }}>{o.bas === o.son ? `${o.bas}` : `${o.bas}–${o.son}`}</b>
                                </span>
                                <span style={{ fontSize: "10.5px", color: theme.textSecondary }}>{o.ayetSayisi} âyet</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <Not>
                          Şu an çalışılan: <b style={{ color: theme.text }}>{suAn ? suAn.isim : `Sûre ${manuel.sure}`} {manuel.bas}–{manuel.son}</b>
                          {" "}· Aralık yazılmazsa kısa sûrenin tamamı, uzun sûrenin ilk 7 âyeti.
                        </Not>
                      </>
                    )
                  })()}

                  <Baslik>Sıra</Baslik>
                  <Secim theme={theme} secenekler={YONLER} deger={yon} onSec={onYon} kucuk />
                  <Not>{ACIKLAMA.yon[yon]}</Not>
                </>
              )}

              {/* ═══ TEKRAR ═══ */}
              {sekme === "tekrar" && (
                <>
                  <Baslik>Yöntem</Baslik>
                  <Secim theme={theme} secenekler={TEKRAR_YONTEMLERI} deger={tekrarYontem} onSec={onTekrarYontem} />
                  <Not>{ACIKLAMA.tekrar[tekrarYontem]}</Not>

                  <Baslik>Tekrar sayısı</Baslik>
                  <Secim theme={theme} kucuk deger={tekrarSayisi} onSec={onTekrarSayisi}
                    secenekler={[1, 3, 5, 7].map(n => ({ id: n, ad: `${n}×` }))} />

                  {tekrarYontem === "baglama" && ezber !== "sure" && (
                    <div style={{ marginTop: "10px" }}>
                      <Anahtar theme={theme} acik={bagla} onDegis={onBagla}
                        baslik="Komşu âyetle bağla"
                        aciklama="Blok, önceden ezberlenmiş komşu âyetle başlar." />
                    </div>
                  )}
                </>
              )}

              {/* ═══ PERDE ═══ */}
              {sekme === "perde" && (
                <>
                  <Baslik>Neyi gizleyelim</Baslik>
                  <Secim theme={theme} secenekler={BIRIMLER} deger={birim} onSec={onBirim} />
                  <Not>{ACIKLAMA.birim[birim]}</Not>

                  {kademeVar && (
                    <>
                      <Baslik>Perde kademesi</Baslik>
                      <Secim theme={theme} secenekler={KADEMELER} deger={kademe} onSec={onKademe} kucuk />
                    </>
                  )}

                  <Baslik>Perde düzeni</Baslik>
                  <Secim theme={theme} deger={!!zincir} onSec={onZincir}
                    secenekler={[{ id: true, ad: "Zincir" }, { id: false, ad: "Tüm aralık" }]} />
                  <Not>{ACIKLAMA.zincir[String(!!zincir)]}</Not>
                  <button onClick={onHepsiniAc} style={{ ...kucukDugme, marginTop: "8px" }}>
                    <Eye size={12} /> İpuçlarını sıfırla
                  </button>

                  {/* DOKUNUNCA — iki bağımsız seçim (29 Eylül 2026); ikisi kapalıysa dokunmak bir şey yapmaz */}
                  <Baslik>Kelimeye dokununca</Baslik>
                  <Anahtar theme={theme} acik={dokunAc} onDegis={onDokunAc} ikon={Eye}
                    baslik="Perdeyi kaldır" aciklama="Perdeli kelimeye dokununca açılır." />
                  <Anahtar theme={theme} acik={dokunSes} onDegis={onDokunSes} ikon={Volume2}
                    baslik="Kelimeyi okut" aciklama="Dokunulan kelime sesli okunur (kelime kelime okuyuş)." />
                  <Not>Perdeli bir yeri açmak ya da dinlemek ipucu sayılır (kelime başına bir kez).</Not>
                </>
              )}

              {/* ═══ BUGÜN — bugünün tekrarı mushafın içinden ═══ */}
              {sekme === "bugun" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px 0 8px" }}>
                    <div style={{ flex: 1 }}>
                      <Secim theme={theme} kucuk deger={tekrarModu} onSec={(m) => ayarGuncelle({ tekrarModu: m })}
                        secenekler={[{ id: "otomatik", ad: "Otomatik" }, { id: "elle", ad: "Elle (listem)" }]} />
                    </div>
                  </div>
                  {(tamamlanan > 0 || bekleyen.length > 0) && (
                    <div style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "3px" }}>
                        <span>{bekleyen.length ? `${bekleyen.length} âyet bekliyor` : "Bugünün tekrarı tamam"}</span>
                        <span><b style={{ color: ac }}>{tamamlanan}</b> / {tamamlanan + bekleyen.length}</span>
                      </div>
                      <div style={{ height: "4px", borderRadius: "2px", background: `${ac}22`, overflow: "hidden" }}>
                        <div style={{ width: `${(tamamlanan * 100) / Math.max(1, tamamlanan + bekleyen.length)}%`, height: "100%", background: ac }} />
                      </div>
                    </div>
                  )}
                  {!gruplar.length ? (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "12px", color: theme.textSecondary, lineHeight: 1.5, padding: "4px 2px 8px" }}>
                      <CheckCircle2 size={15} color={ac} style={{ flexShrink: 0, marginTop: "1px" }} />
                      {tamamlanan ? "Bugünün tekrarı bitti. Allah kabul etsin."
                        : tekrarModu === "elle" ? "Tekrar listeniz boş. Hıfz ekranında Ezberlediklerim'den \"Tekrara al\" ile ekleyin."
                        : "Bugün tekrarı gelen âyet yok."}
                    </div>
                  ) : gruplar.map(gr => {
                    const ad = `${sureAdi(gr.sureNo)} ${gr.bas === gr.son ? gr.bas : `${gr.bas}–${gr.son}`}`
                    return (
                      <div key={`${gr.kaynak}-${gr.anahtarlar[0]}`} style={{
                        display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px",
                        padding: "8px 2px", borderBottom: `1px solid ${theme.border}`,
                      }}>
                        <span style={{ flex: 1, minWidth: "120px", fontSize: "12.5px", fontWeight: 600, color: theme.text }}>
                          {ad}
                          {gr.kaynak === "liste" && (
                            <span style={{ marginLeft: "6px", fontSize: "9.5px", fontWeight: 700, color: ac, border: `1px solid ${ac}`, borderRadius: "999px", padding: "0 5px" }}>listem</span>
                          )}
                          {gr.gecikme > 0 && !veri.ayarlar.bildirimGizle && (
                            <span style={{ marginLeft: "6px", fontSize: "9.5px", fontWeight: 700, color: "#fff", background: "#c0392b", borderRadius: "999px", padding: "1px 5px" }}>{gr.gecikme} gün</span>
                          )}
                        </span>
                        {/* ÇALIŞ — bu aralığı hıfz modunda aç (manuel aralık olarak) */}
                        <button onClick={() => { onManuel?.({ sure: gr.sureNo, bas: gr.bas, son: gr.son }); setAyarAcik(false) }}
                          title="Bu aralığı hıfz modunda çalış" style={{ ...kucukDugme, borderColor: ac, color: ac }}>
                          Çalış <ArrowRight size={12} />
                        </button>
                        {[["kolay", "Kolay"], ["orta", "Orta"], ["zor", "Zor"]].map(([id, a]) => (
                          <button key={id} onClick={() => topluCevapla(gr.anahtarlar, id)} style={kucukDugme}>{a}</button>
                        ))}
                      </div>
                    )
                  })}
                  <button onClick={onPanel} style={{ ...kucukDugme, margin: "10px 0 2px", height: "30px" }}>
                    <CalendarCheck size={13} /> Hıfz ekranı — takvim, ilerleme, ezberlediklerim <ArrowRight size={12} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
