/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — EKSTRALAR → KUR'AN DİNLE KARTI
   src/components/KuranDinleKarti.jsx

   11 Kasım 2026 — kullanıcı: "Kâri eğer cüz cüz okuyorsa, o kâri seçildiğinde cüz
   seçenek olarak verilir. Âyet âyet okuyorsa âyet, sûre sûre okuyorsa sûre. Diğer
   seçeneklerin üzeri kapalı (koyu renkli bir belirteç) olarak verilir ki kullanıcı
   bunun sistemde mevcut olmadığını anlasın." "Otomatik kapanma ayarı burada da
   buton ile yapılsın."
   • Kâri seçilir → Cüz / Sûre / Âyet seçeneklerinden o kârinin kaydı olanlar açık,
     olmayanlar çizgili koyu belirteçle kapalı. Kayıtta eksik olan tek tek cüz/sûreler
     de aynı belirteçle kapalı (ör. bir arşiv kaydında bulunmayan sûre).
   • Parçaya dokunulunca çalar; çalan parçaya yeniden dokunulunca duraklar/sürer.
   • Sürekli çalma (anahtar): parça bitince sıradaki. Otomatik kapanma (anahtar + süre).
   • Kaldığınız yer: son dinlenen parça (uzun kayıtlarda dakikasıyla) — "Devam" ile sürer.
   Ses uygulama kökünde (data/kuranDinle.jsx); sayfadan çıkınca küçük hap görünür.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react"
import { Headphones, Play, Pause, SkipBack, SkipForward, X, Loader2, ExternalLink, Repeat, RotateCcw, History, Search } from "lucide-react"
import { Kart, useBolum, dugmeStil } from "./EkstraKart"
import IosSwitch from "./IosSwitch"
import OtomatikDurdurmaSecici from "./OtomatikDurdurmaSecici"
import { sureAdi, SURE_ADLARI } from "../data/sureAdlari"
import {
  useKuranDinle, KARILER, TURLER, AYET_SAYILARI, kariBul, kaynakBilgisi, parcaAdi,
  useParcaListesi, useDinleZamani, sureYazisi, sonKonumOku,
  useEkKariler, ekKariEkle, ekKariSil, way2Dizin, way2Ara, rivayetAdi, sureAra,
} from "../data/kuranDinle"
// Çalar paneli küçük hapla aynı görünüm (12 Kasım 2026): rahle amblemi + yuvarlak düğmeler
import { DinleAmblemi, DINLE_HAP_CSS } from "./MiniKuranDinle"

const KARI_ANAHTAR = "vukuf-kuran-dinle-kari"
const TUR_ANAHTAR = "vukuf-kuran-dinle-tur"           // { kariId: "cuz" | "sure" | "ayet" }
const oku = (k, v) => { try { const x = JSON.parse(localStorage.getItem(k) || "null"); return x ?? v } catch { return v } }
const yaz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* yoksay */ } }

// Mevcut olmayan seçenekler için koyu, çizgili belirteç
const kapaliZemin = (theme) =>
  `repeating-linear-gradient(135deg, ${theme.text}45 0 5px, ${theme.text}26 5px 10px)`

const besmeleli = (s) => s !== 1 && s !== 9

function Ilerleme({ theme, dinle }) {
  const z = useDinleZamani()
  const [suruk, setSuruk] = useState(null)
  const su = suruk ?? z.su
  const toplam = z.toplam || 0
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "11px", color: theme.textSecondary, minWidth: "38px", fontVariantNumeric: "tabular-nums" }}>{sureYazisi(su)}</span>
      <input type="range" min="0" max={toplam || 1} step="1" value={Math.min(su, toplam || 1)} disabled={!toplam}
        aria-label="Konum"
        onChange={(e) => setSuruk(+e.target.value)}
        onPointerUp={() => { if (suruk != null) { dinle.sar(suruk); setSuruk(null) } }}
        onKeyUp={() => { if (suruk != null) { dinle.sar(suruk); setSuruk(null) } }}
        onBlur={() => { if (suruk != null) { dinle.sar(suruk); setSuruk(null) } }}
        style={{ flex: 1, minWidth: 0, accentColor: theme.accent }} />
      <span style={{ fontSize: "11px", color: theme.textSecondary, minWidth: "38px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{toplam ? sureYazisi(toplam) : "–:––"}</span>
    </div>
  )
}

/* WAY2QURAN KÂRİ ARAMASI (12 Kasım 2026) — kayıtlı kâriler değişmez; buradan seçilen kâri
   "ek kâri" olur (listenin altında ayrı çipler). Dizin ilk açılışta indirilir (~100 KB). */
function KariArama({ theme, onSec, onKapat }) {
  const ac = theme.accent
  const [sorgu, setSorgu] = useState("")
  const [dizin, setDizin] = useState(null)
  const [durum, setDurum] = useState("yukleniyor")      // yukleniyor | hazir | yok
  const [deneme, setDeneme] = useState(0)
  useEffect(() => {
    let iptal = false
    setDurum("yukleniyor")
    way2Dizin().then(d => { if (!iptal) { setDizin(d); setDurum("hazir") } }).catch(() => { if (!iptal) setDurum("yok") })
    return () => { iptal = true }
  }, [deneme])
  const sonuc = useMemo(() => (dizin && sorgu.trim().length >= 2 ? way2Ara(dizin, sorgu, 40) : []), [dizin, sorgu])
  // Dizin değeri: 114 | [sûre no…] | { n: 114 | […], f: {…} }
  const sayiOf = (v) => {
    const n = v && typeof v === "object" && !Array.isArray(v) ? v.n : v
    return Array.isArray(n) ? n.length : Number(n) || 0
  }
  return (
    <div style={{ margin: "0 0 12px", padding: "10px", borderRadius: "14px", border: `1px solid ${ac}55`, background: `${ac}08` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Search size={15} color={theme.textSecondary} style={{ flexShrink: 0 }} />
        <input value={sorgu} onChange={e => setSorgu(e.target.value)} autoFocus placeholder="Kâri adı (ör. Alafasy, Minshawi)"
          aria-label="Kâri ara" enterKeyHint="search"
          style={{ flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontFamily: "inherit", fontSize: "13px" }} />
        <button onClick={onKapat} aria-label="Aramayı kapat" title="Kapat"
          style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <X size={15} />
        </button>
      </div>
      <div style={{ fontSize: "11px", color: theme.textSecondary, margin: "6px 2px 0", lineHeight: 1.45 }}>
        {durum === "yukleniyor" && <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Loader2 size={12} className="vk-don" /> Kâri dizini hazırlanıyor…</span>}
        {durum === "yok" && (
          <span>Kâri dizini şu an alınamadı. <button onClick={() => setDeneme(x => x + 1)} style={{ background: "none", border: "none", padding: 0, color: ac, cursor: "pointer", fontFamily: "inherit", fontSize: "11px", textDecoration: "underline" }}>Tekrar dene</button></span>
        )}
        {durum === "hazir" && sorgu.trim().length < 2 && `${dizin.length.toLocaleString("tr-TR")} kâri arasında aranabilir · kayıtlar way2quran.com'dan çalınır`}
        {durum === "hazir" && sorgu.trim().length >= 2 && !sonuc.length && "Bu adla bir kâri bulunamadı."}
      </div>
      {sonuc.length > 0 && (
        <div style={{ marginTop: "8px", maxHeight: "260px", overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column", gap: "4px" }}>
          {sonuc.map(x => {
            const rivayetler = Object.entries(x.r)
            return (
              <div key={x.s} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.surface }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.a}</div>
                </div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {rivayetler.map(([rv, v]) => (
                    <button key={rv} onClick={() => onSec({ slug: x.s, ad: x.a, rivayet: rv, kapsam: v })}
                      title={`${x.a} · ${rivayetAdi(rv)} · ${sayiOf(v)} sûre`}
                      style={{ padding: "5px 9px", borderRadius: "999px", border: "none", background: ac, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: "11.5px", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {rivayetler.length > 1 ? rivayetAdi(rv) : "Seç"}
                      <span style={{ fontWeight: 400, opacity: 0.85 }}> · {sayiOf(v)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function KuranDinleKarti({ theme }) {
  const dinle = useKuranDinle()
  const bolum = useBolum("kuran-dinle")
  const ac = theme.accent
  const [kariId, setKariIdD] = useState(() => (kariBul(oku(KARI_ANAHTAR, null)) ? oku(KARI_ANAHTAR, null) : KARILER[0].id))
  const [turlar, setTurlar] = useState(() => oku(TUR_ANAHTAR, {}) || {})
  const ekKariler = useEkKariler()          // aramadan eklenenler (değişince yeniden çizilsin)
  const [aramaAcik, setAramaAcik] = useState(false)
  // Sûre araması (Sûre ve Âyet kipinde) — 12 Kasım 2026
  const [sureAramaAcik, setSureAramaAcik] = useState(false)
  const [sureSorgu, setSureSorgu] = useState("")
  const sureSonuc = useMemo(() => (sureSorgu.trim() ? sureAra(sureSorgu) : null), [sureSorgu])
  const kari = kariBul(kariId) || KARILER[0]
  const ilkTur = TURLER.find(t => kari.kaynaklar[t.id])?.id
  const tur = turlar[kari.id] && kari.kaynaklar[turlar[kari.id]] ? turlar[kari.id] : ilkTur
  const setKari = (id) => { setKariIdD(id); yaz(KARI_ANAHTAR, id) }
  const setTur = (t) => { const y = { ...turlar, [kari.id]: t }; setTurlar(y); yaz(TUR_ANAHTAR, y) }

  const liste = useParcaListesi(kari, tur)
  const calan = dinle?.calan || null
  const durum = dinle?.durum || "kapali"
  const buKari = calan && calan.kariId === kari.id && calan.tur === tur
  const [ayetSure, setAyetSure] = useState(() => (calan && calan.tur === "ayet" ? calan.parca : 1))
  useEffect(() => { if (buKari && calan.tur === "ayet") setAyetSure(calan.parca) }, [buKari, calan?.parca])   // eslint-disable-line react-hooks/exhaustive-deps

  const [son, setSon] = useState(() => sonKonumOku())
  useEffect(() => { if (!calan) setSon(sonKonumOku()) }, [calan, durum])

  const calarDurum = durum === "caliyor" || durum === "yukleniyor"
  const ozet = calan
    ? `${kariBul(calan.kariId)?.ad} · ${parcaAdi(calan.tur, calan.parca, calan.ayet)} · ${durum === "caliyor" ? "çalıyor" : durum === "yukleniyor" ? "yükleniyor" : durum === "hata" ? "açılamadı" : durum === "bitti" ? "bitti" : "duraklatıldı"}`
    : son ? `Kaldığınız yer: ${kariBul(son.kariId)?.ad} · ${parcaAdi(son.tur, son.parca, son.ayet)}` : undefined

  const dokun = (parca, ayet = null) => {
    if (!dinle) return
    const ayni = calan && calan.kariId === kari.id && calan.tur === tur && calan.parca === parca &&
      (tur !== "ayet" || calan.ayet === ayet || (ayet === 1 && calan.ayet === 0))
    if (ayni && durum !== "hata" && durum !== "bitti") { calarDurum ? dinle.duraklat() : dinle.devam(); return }
    if (tur === "ayet") dinle.baslat({ kariId: kari.id, tur, parca, ayet: ayet === 1 && besmeleli(parca) ? 0 : ayet })
    else dinle.baslat({ kariId: kari.id, tur, parca })
  }
  const devamEt = () => {
    if (!son || !dinle) return
    setKari(son.kariId)
    setTurlar(t => { const y = { ...t, [son.kariId]: son.tur }; yaz(TUR_ANAHTAR, y); return y })
    dinle.baslat(son)
  }

  const kaynak = kaynakBilgisi(kari.kaynaklar[tur])
  // Küçük haptaki yuvarlak düğmeler (MiniKuranDinle / MiniRadyo ile aynı ölçü ve renk)
  const yuvarlak = (vurgu) => ({
    width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    border: "none", background: vurgu ? ac : "transparent", color: vurgu ? "#fff" : theme.textSecondary,
  })
  const varSayisi = liste.parcalar.filter(p => p.var && p.no !== "dua").length
  const toplamSayi = tur === "cuz" ? 30 : 114

  // ── parça düğmesi biçimi
  const parcaStil = (vr, aktif, genis) => ({
    position: "relative", padding: genis ? "7px 9px" : "8px 0", borderRadius: "9px", fontFamily: "inherit",
    fontSize: genis ? "12.5px" : "13px", fontWeight: aktif ? 700 : 500, textAlign: genis ? "left" : "center",
    cursor: vr ? "pointer" : "not-allowed", minWidth: 0,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    border: `1px solid ${aktif ? ac : theme.border}`,
    background: aktif ? ac : vr ? "transparent" : kapaliZemin(theme),
    color: aktif ? "#fff" : vr ? theme.text : theme.textSecondary,
    opacity: vr ? 1 : 0.6,
  })
  const aktifMi = (no, ayet = null) => buKari && calan.parca === no && (tur !== "ayet" || calan.ayet === ayet || (ayet === 1 && calan.ayet === 0))
  const simge = (no, ayet) => (aktifMi(no, ayet)
    ? (durum === "yukleniyor" ? <Loader2 size={11} className="vk-don" style={{ marginRight: 3, verticalAlign: "-1px" }} />
      : durum === "caliyor" ? <Pause size={11} style={{ marginRight: 3, verticalAlign: "-1px" }} /> : null)
    : null)

  const ayetSayisi = AYET_SAYILARI[ayetSure - 1] || 0
  const ayetNolari = useMemo(() => Array.from({ length: ayetSayisi }, (_, i) => i + 1), [ayetSayisi])

  return (
    <Kart theme={theme} Ikon={Headphones} baslik="Kur'an Dinle" alt="Hafızlardan cüz, sûre ve âyet kayıtları" bolum={bolum} ozet={ozet}>
      {/* KÂRİ — sağda arama düğmesi (way2quran'daki bütün kâriler) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 0 6px 2px" }}>
        <span style={{ fontSize: "11px", letterSpacing: "0.5px", color: theme.textSecondary }}>KÂRİ</span>
        <button onClick={() => setAramaAcik(v => !v)} aria-pressed={aramaAcik} aria-label="Başka kâri ara" title="Başka kâri ara (way2quran)"
          style={{
            width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: aramaAcik ? `${ac}33` : "transparent", color: aramaAcik ? ac : theme.textSecondary,
          }}>
          <Search size={16} />
        </button>
      </div>
      {aramaAcik && (
        <KariArama theme={theme} onKapat={() => setAramaAcik(false)}
          onSec={(e) => { const id = ekKariEkle(e); setKari(id); setAramaAcik(false) }} />
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: ekKariler.length ? "8px" : "12px" }}>
        {KARILER.map(k => {
          const sec = k.id === kari.id
          const calarK = calan && calan.kariId === k.id && durum === "caliyor"
          return (
            <button key={k.id} onClick={() => setKari(k.id)} aria-pressed={sec}
              title={TURLER.filter(t => k.kaynaklar[t.id]).map(t => t.ad).join(" · ")}
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "6px 11px", borderRadius: "999px", fontFamily: "inherit", fontSize: "12.5px", cursor: "pointer",
                border: `1px solid ${sec ? ac : theme.border}`, background: sec ? ac : "transparent",
                color: sec ? "#fff" : theme.text, fontWeight: sec ? 600 : 500,
              }}>
              {calarK && <span aria-hidden="true" className="vk-kerahat-nokta" style={{ width: 6, height: 6, borderRadius: "50%", background: sec ? "#fff" : ac }} />}
              {k.ad}
            </button>
          )
        })}
      </div>
      {/* ARAMADAN EKLENENLER — ayrı çipler; × listeden kaldırır */}
      {ekKariler.length > 0 && (
        <>
          <div style={{ fontSize: "10px", letterSpacing: "0.5px", color: theme.textSecondary, margin: "0 0 5px 2px" }}>ARAMADAN</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            {ekKariler.map(k => {
              const sec = k.id === kari.id
              const calarK = calan && calan.kariId === k.id && durum === "caliyor"
              return (
                <span key={k.id} style={{
                  display: "inline-flex", alignItems: "center", borderRadius: "999px",
                  border: `1px dashed ${sec ? ac : theme.border}`, background: sec ? ac : "transparent",
                }}>
                  <button onClick={() => setKari(k.id)} aria-pressed={sec} title={`${k.ad} · ${k.alt} · way2quran`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 4px 6px 11px", border: "none", background: "none",
                      fontFamily: "inherit", fontSize: "12.5px", cursor: "pointer", color: sec ? "#fff" : theme.text, fontWeight: sec ? 600 : 500,
                    }}>
                    {calarK && <span aria-hidden="true" className="vk-kerahat-nokta" style={{ width: 6, height: 6, borderRadius: "50%", background: sec ? "#fff" : ac }} />}
                    {k.ad}
                    {k.alt !== "Hafs" && <span style={{ fontSize: "10.5px", opacity: 0.8 }}>· {k.alt}</span>}
                  </button>
                  <button onClick={() => { if (sec) setKari(KARILER[0].id); ekKariSil(k.id) }} aria-label={`${k.ad} — listeden kaldır`} title="Listeden kaldır"
                    style={{ display: "flex", alignItems: "center", padding: "6px 9px 6px 3px", border: "none", background: "none", cursor: "pointer", color: sec ? "#fff" : theme.textSecondary }}>
                    <X size={12} />
                  </button>
                </span>
              )
            })}
          </div>
        </>
      )}

      {/* TÜR — kaydı olmayanlar çizgili koyu belirteçle kapalı */}
      <div role="radiogroup" aria-label="Okuma biçimi" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "4px" }}>
        {TURLER.map(t => {
          const vr = !!kari.kaynaklar[t.id]
          const sec = vr && t.id === tur
          return (
            <button key={t.id} role="radio" aria-checked={sec} aria-disabled={!vr} disabled={!vr}
              onClick={() => vr && setTur(t.id)}
              title={vr ? `${t.ad} ${t.id === "ayet" ? "âyet" : t.id === "cuz" ? "cüz" : "sûre"} dinle` : `${kari.ad} için ${t.ad.toLocaleLowerCase("tr-TR")} kaydı bulunmuyor`}
              style={{
                padding: "8px 4px", borderRadius: "10px", fontFamily: "inherit", fontSize: "13px",
                fontWeight: sec ? 700 : 500, cursor: vr ? "pointer" : "not-allowed",
                border: `1px solid ${sec ? ac : theme.border}`,
                background: sec ? ac : vr ? "transparent" : kapaliZemin(theme),
                color: sec ? "#fff" : vr ? theme.text : theme.textSecondary,
                opacity: vr ? 1 : 0.65, lineHeight: 1.15,
              }}>
              {t.ad}
              {!vr && <span style={{ display: "block", fontSize: "9.5px", letterSpacing: "0.3px", marginTop: "1px" }}>kayıt yok</span>}
            </button>
          )
        })}
      </div>
      {kaynak && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "11px", color: theme.textSecondary, margin: "6px 2px 8px" }}>
          {/* Sûre arama düğmesi soldaki yazının yanında (12 Kasım 2026, kullanıcı: "arama butonunu
              'Sûre' yazısı yanına alalım, böyle yanlışlıkla siteye tıklanabilir") — sağdaki kaynak
              bağlantısından uzak dursun */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
            <span>
              {liste.durum === "hazir" && tur !== "ayet" && varSayisi < toplamSayi && !liste.yedek
                ? `Bu kayıtta ${varSayisi} / ${toplamSayi} ${tur === "cuz" ? "cüz" : "sûre"} var`
                : tur === "ayet" ? "Sûre seçilip başlanacak âyete dokunulabilir" : tur === "cuz" ? "Tam hatim · 30 cüz" : "114 sûre"}
            </span>
            {(tur === "sure" || tur === "ayet") && (
              <button onClick={() => { setSureAramaAcik(v => !v); setSureSorgu("") }} aria-pressed={sureAramaAcik}
                aria-label="Sûre ara" title="Sûre ara"
                style={{
                  width: "28px", height: "28px", borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: sureAramaAcik ? `${ac}33` : "transparent", color: sureAramaAcik ? ac : theme.textSecondary,
                }}>
                <Search size={14} />
              </button>
            )}
          </span>
          <a href={kaynak.sayfa} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: theme.textSecondary, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
            {kaynak.ad} <ExternalLink size={11} />
          </a>
        </div>
      )}
      {/* SÛRE ARAMASI — ad (Türkçe büyük/küçük harf, şapka, tire fark etmez) ya da numara */}
      {sureAramaAcik && (tur === "sure" || tur === "ayet") && (
        <div style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input value={sureSorgu} onChange={e => setSureSorgu(e.target.value)} autoFocus enterKeyHint="search"
              placeholder="Sûre adı ya da numarası (ör. Âl-i İmrân, Yâsîn, 36)" aria-label="Sûre ara"
              onKeyDown={e => {
                if (e.key === "Enter" && sureSonuc && sureSonuc.length) {
                  if (tur === "ayet") { setAyetSure(sureSonuc[0]); setSureAramaAcik(false); setSureSorgu("") }
                }
                if (e.key === "Escape") { setSureAramaAcik(false); setSureSorgu("") }
              }}
              style={{ flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontFamily: "inherit", fontSize: "13px" }} />
            {sureSorgu && (
              <button onClick={() => setSureSorgu("")} aria-label="Aramayı temizle"
                style={{ width: "28px", height: "28px", borderRadius: "50%", border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
          {sureSonuc && !sureSonuc.length && (
            <div style={{ fontSize: "11px", color: theme.textSecondary, margin: "6px 2px 0" }}>Bu adla bir sûre bulunamadı.</div>
          )}
          {/* Âyet kipinde: bulunan sûreler düğme olarak — dokununca o sûrenin âyetleri açılır */}
          {tur === "ayet" && sureSonuc && sureSonuc.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "6px" }}>
              {sureSonuc.slice(0, 12).map(n => (
                <button key={n} onClick={() => { setAyetSure(n); setSureAramaAcik(false); setSureSorgu("") }}
                  style={{ ...parcaStil(true, n === ayetSure, true), padding: "5px 9px", flex: "0 0 auto" }}>
                  <span style={{ opacity: 0.6 }}>{n}</span> {sureAdi(n)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PARÇALAR */}
      {liste.durum === "yukleniyor" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 4px", fontSize: "12.5px", color: theme.textSecondary }}>
          <Loader2 size={15} className="vk-don" /> Kayıt listesi hazırlanıyor…
        </div>
      )}
      {liste.durum === "hata" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "10px", borderRadius: "10px", border: `1px solid ${theme.border}`, fontSize: "12.5px", color: theme.textSecondary }}>
          <span>Kayıt listesi şu an alınamadı.</span>
          <button onClick={liste.tekrar} style={{ ...dugmeStil(theme, false), padding: "6px 10px", fontSize: "12px" }}><RotateCcw size={13} /> Tekrar dene</button>
        </div>
      )}
      {liste.durum === "hazir" && tur === "cuz" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(46px, 1fr))", gap: "6px" }}>
            {liste.parcalar.filter(p => p.no !== "dua").map(p => (
              <button key={p.no} disabled={!p.var} aria-label={`${p.no}. Cüz${p.var ? "" : " — kayıtta yok"}`}
                title={p.var ? `${p.no}. Cüz` : "Bu cüz kayıtta bulunmuyor"}
                onClick={() => p.var && dokun(p.no)} style={parcaStil(p.var, aktifMi(p.no), false)}>
                {simge(p.no)}{p.no}
              </button>
            ))}
          </div>
          {liste.parcalar.some(p => p.no === "dua") && (
            <button onClick={() => dokun("dua")} style={{ ...parcaStil(true, aktifMi("dua"), true), width: "100%", marginTop: "6px", textAlign: "center" }}>
              {simge("dua")}Hatim duası
            </button>
          )}
        </>
      )}
      {liste.durum === "hazir" && tur === "sure" && (
        <div style={{ maxHeight: "300px", overflowY: "auto", overscrollBehavior: "contain", paddingRight: "2px",
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: "6px" }}>
          {(sureAramaAcik && sureSonuc
            ? sureSonuc.map(n => liste.parcalar.find(p => p.no === n)).filter(Boolean)
            : liste.parcalar).map(p => (
            <button key={p.no} disabled={!p.var} aria-label={`${sureAdi(p.no)} Sûresi${p.var ? "" : " — kayıtta yok"}`}
              title={p.var ? `${p.no}. ${sureAdi(p.no)}` : "Bu sûre kayıtta bulunmuyor"}
              onClick={() => p.var && dokun(p.no)} style={parcaStil(p.var, aktifMi(p.no), true)}>
              {simge(p.no)}<span style={{ opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{p.no}</span> {sureAdi(p.no)}
            </button>
          ))}
        </div>
      )}
      {liste.durum === "hazir" && tur === "ayet" && (
        <>
          <select value={ayetSure} onChange={e => setAyetSure(+e.target.value)} aria-label="Sûre"
            style={{ width: "100%", padding: "8px 10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontFamily: "inherit", fontSize: "13px", marginBottom: "8px" }}>
            {SURE_ADLARI.map((ad, i) => <option key={i} value={i + 1}>{i + 1}. {ad} · {AYET_SAYILARI[i]} âyet</option>)}
          </select>
          <div style={{ maxHeight: "220px", overflowY: "auto", overscrollBehavior: "contain", paddingRight: "2px",
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: "5px" }}>
            {ayetNolari.map(a => (
              <button key={a} aria-label={`${sureAdi(ayetSure)} ${a}. âyetten dinle`} onClick={() => dokun(ayetSure, a)}
                style={{ ...parcaStil(true, aktifMi(ayetSure, a), false), padding: "6px 0", fontSize: "12px" }}>
                {a}
              </button>
            ))}
          </div>
        </>
      )}

      {/* KALDIĞINIZ YER */}
      {!calan && son && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", padding: "8px 10px", borderRadius: "11px", border: `1px dashed ${ac}88`, background: `${ac}0a` }}>
          <History size={16} color={ac} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: "12.5px", color: theme.text, lineHeight: 1.3 }}>
            Kaldığınız yer
            <span style={{ display: "block", fontSize: "11.5px", color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {kariBul(son.kariId)?.ad} · {parcaAdi(son.tur, son.parca, son.ayet)}{son.zaman > 0 ? ` · ${sureYazisi(son.zaman)}` : ""}
            </span>
          </span>
          <button onClick={devamEt} style={{ ...dugmeStil(theme, true), padding: "7px 12px", fontSize: "12.5px" }}><Play size={13} /> Devam</button>
        </div>
      )}

      {/* ÇALAN */}
      {/* ÇALAR — küçük hapın görünümü (12 Kasım 2026, kullanıcı: "sürekli oynatma kısmında
          görünen play butonları güzel oldu; aynı şekilde Ekstralar'daki durdurma ve play
          butonlarına da alalım"): kesik çizgili kapsül, rahle amblemi (çalarken dalgalar
          atar), vurgu renkli yuvarlak oynat/duraklat, yanında yuvarlak sade düğmeler. */}
      {calan && (
        <div style={{
          marginTop: "12px", padding: "5px 5px 8px", borderRadius: "22px",
          border: `1.5px dashed ${ac}`, background: `linear-gradient(90deg, ${ac}12, ${theme.surface} 45%)`, backgroundColor: theme.surface,
          display: "flex", flexDirection: "column", gap: "6px",
        }}>
          <style>{DINLE_HAP_CSS}</style>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <DinleAmblemi ac={ac} zemin={theme.surface} calar={durum === "caliyor"} boy={40} />
            <div style={{ flex: 1, minWidth: 0, padding: "0 4px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {parcaAdi(calan.tur, calan.parca, calan.ayet)}
              </div>
              <div style={{ fontSize: "11.5px", color: durum === "hata" ? "#c0392b" : theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {durum === "hata" ? "Kayıt açılamadı · ▶ ile yeniden denenebilir"
                  : durum === "bitti" ? `${kariBul(calan.kariId)?.ad} · bitti`
                  : `${kariBul(calan.kariId)?.ad}${calan.tur === "ayet" && calan.ayet > 0 ? ` · ${calan.ayet} / ${AYET_SAYILARI[calan.parca - 1]}` : ""}`}
              </div>
            </div>
            <button onClick={() => dinle.atla(-1)} aria-label="Önceki" title="Önceki" style={yuvarlak(false)}><SkipBack size={15} /></button>
            <button onClick={() => (calarDurum ? dinle.duraklat() : dinle.devam())} aria-label={calarDurum ? "Duraklat" : "Dinle"} title={calarDurum ? "Duraklat" : "Dinle"}
              style={yuvarlak(true)}>
              {durum === "yukleniyor" ? <Loader2 size={16} className="vk-kd-don" /> : durum === "caliyor" ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: "2px" }} />}
            </button>
            <button onClick={() => dinle.atla(1)} aria-label="Sonraki" title="Sonraki" style={yuvarlak(false)}><SkipForward size={15} /></button>
            <button onClick={() => dinle.kapat()} aria-label="Kapat" title="Kapat" style={yuvarlak(false)}><X size={15} /></button>
          </div>
          {calan.tur !== "ayet" && <div style={{ padding: "0 8px" }}><Ilerleme theme={theme} dinle={dinle} /></div>}
        </div>
      )}

      {/* AYARLAR — sürekli çalma, otomatik kapanma */}
      <div style={{ marginTop: "10px", padding: "4px 10px", borderRadius: "11px", border: `1px solid ${theme.border}` }}>
        <div role="switch" aria-checked={!!dinle?.surekli} onClick={() => dinle && dinle.setSurekli(!dinle.surekli)}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", cursor: "pointer", borderBottom: `1px solid ${theme.border}` }}>
          <Repeat size={16} color={dinle?.surekli ? ac : theme.textSecondary} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text, lineHeight: 1.25 }}>
            Sürekli çalma
            <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>
              {tur === "ayet" ? "Sûre bitince sıradaki sûreye geçer" : `Bitince sıradaki ${tur === "cuz" ? "cüz" : "sûre"} çalar`}
            </span>
          </span>
          <IosSwitch acik={!!dinle?.surekli} theme={theme} boyut={0.72} />
        </div>
        {dinle && (
          <OtomatikDurdurmaSecici anahtarli theme={theme} uyku={dinle.uyku} baslik="Otomatik kapanma" eylem="kapanacak"
            aciklama="Seçilen süre sonunda dinleme durur; kaldığınız yer saklanır" />
        )}
      </div>
    </Kart>
  )
}
