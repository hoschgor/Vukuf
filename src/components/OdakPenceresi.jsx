/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — ODAK PENCERESİ (gözlük)
   src/components/OdakPenceresi.jsx

   4 Kasım 2026 — kullanıcı: "Amacımız başka sayfadan okumaya odaklanabilmek, istersek
   sürekli odak açık kalabilmeli, okunan ayetleri ya da yazıları ekranda gösterecek,
   sonraki ayet ya da cümleye geçtiğinde keskin, göz yoran bir şekilde kaymak yerine
   yavaşça ama güzel bir denge ile takip edecek."

   Uygulama kökünde (App.jsx) durur; okuma Kur'ân / kitap ekranının DIŞINDA sürerken
   küçük oynatıcıdaki gözlükle açılır (ya da "Sürekli odak" açıksa kendiliğinden).
     • KUR'ÂN — çalan sûrenin bütün âyetleri: Arapça (âyet rozetiyle) ve meal; ikisi ayrı
       ayrı açılıp kapanır. Okunan âyet tam renkte, ötekiler soluk.
     • SESLİ OKUMA — okunan cümle ve çevresi (kitabın sayfa metninden).
   TAKİP — okunan öğe "rahat bant"ın (ekranın ~%16–%62'si) dışına çıkınca göz hizasına
   (~%36) yavaşça (0,8–1,8 sn, yumuşak başlayıp yumuşak biten) kayar; bant içindeyken
   kımıldamaz → sürekli titreşen bir ekran değil, arada bir sakin bir kayış.
   Kullanıcı kendisi kaydırırsa takip askıya alınır; "Okunan yere dön" geri getirir.
   Kur'ân ekranına dönülünce (ya da kitapta sesli okuma denetimi açılınca) pencere kapanır;
   orada aynı işi mushafın kendi takibi görüyor.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { useLocation } from "react-router-dom"
import { Glasses, X, SkipBack, SkipForward, Play, Pause, Pin, PinOff, LocateFixed, Type, Loader2 } from "lucide-react"
import { useApp } from "../AppContext"
import { useOynatici } from "../data/oynatici"
import { sesliOkuyucu, sesKilidiAc } from "../data/sesliOkuma"
import { sureAdi } from "../data/sureAdlari"
import AyetRozeti from "./AyetRozeti"
import {
  useOdak, odakAc, odakKapat, surekliAyarla, hizayaGetir, odakBandi, mushafYukle, mealYukle, ayetMetni,
  BOYUT_ANAHTAR, GORUNUM_ANAHTAR,
} from "../data/odak"

const BOYUTLAR = [16, 18, 21, 24]
const okuJSON = (a, y) => { try { const v = JSON.parse(localStorage.getItem(a) || "null"); return v == null ? y : v } catch { return y } }
const yazJSON = (a, v) => { try { localStorage.setItem(a, JSON.stringify(v)) } catch { /* yoksay */ } }
const SURUYOR = ["okuyor", "duraklatildi", "hazirlaniyor"]

export default function OdakPenceresi() {
  const odak = useOdak()
  const player = useOynatici()
  const d = useSyncExternalStore(sesliOkuyucu.abone, sesliOkuyucu.durum, sesliOkuyucu.durum)
  const location = useLocation()
  const kuranSuruyor = !!player && player.durum !== "kapali"
  const sesliSuruyor = SURUYOR.includes(d.durum)
  const kuranEkrani = location.pathname === "/kuran"

  // Elle kapatılan kaynak o okuma bitene dek "sürekli"yle yeniden açılmaz
  const kapatildi = useRef({ kuran: false, sesli: false })
  useEffect(() => { if (!kuranSuruyor) kapatildi.current.kuran = false }, [kuranSuruyor])
  useEffect(() => { if (!sesliSuruyor) kapatildi.current.sesli = false }, [sesliSuruyor])

  // Sürekli odak: okuma ekran dışında sürüyorsa kendiliğinden aç
  useEffect(() => {
    if (!odak.surekli || odak.acik) return
    if (kuranSuruyor && !kuranEkrani && !kapatildi.current.kuran) odakAc("kuran")
    else if (sesliSuruyor && !d.kontrolAcik && !kapatildi.current.sesli) odakAc("sesli")
  }, [odak.surekli, odak.acik, kuranSuruyor, kuranEkrani, sesliSuruyor, d.kontrolAcik])

  // Kaynak bitti / okuma ekranına dönüldü → kapan
  const gorunur = odak.acik && (odak.kaynak === "kuran" ? kuranSuruyor && !kuranEkrani : sesliSuruyor && !d.kontrolAcik)
  useEffect(() => { if (odak.acik && !gorunur) odakKapat() }, [odak.acik, gorunur])

  const kapat = useCallback(() => { if (odak.kaynak) kapatildi.current[odak.kaynak] = true; odakKapat() }, [odak.kaynak])
  useEffect(() => {
    if (!gorunur) return
    const t = (e) => { if (e.key === "Escape") kapat() }
    window.addEventListener("keydown", t)
    return () => window.removeEventListener("keydown", t)
  }, [gorunur, kapat])

  if (!gorunur) return null
  return odak.kaynak === "kuran"
    ? <KuranOdak player={player} surekli={odak.surekli} kapat={kapat} />
    : <SesliOdak d={d} surekli={odak.surekli} kapat={kapat} />
}

// ── TAKİP ────────────────────────────────────────────────────────────────────
function useTakip(kapRef, aktifAnahtar, hazir) {
  const { konum } = useOdak()                      // kullanıcının seçtiği karşılama çizgisi
  const [askida, setAskida] = useState(false)
  const durdurRef = useRef(() => {})
  const ilkRef = useRef(true)
  const hizala = useCallback((zorla, anlik) => {
    const kap = kapRef.current
    if (!kap || aktifAnahtar == null) return
    const el = kap.querySelector(`[data-odak="${aktifAnahtar}"]`)
    if (!el) return
    durdurRef.current()
    durdurRef.current = hizayaGetir(kap, el, { zorla, ...odakBandi(konum), ...(anlik ? { sure: 1 } : null) })
  }, [kapRef, aktifAnahtar, konum])
  // İlk açılış: anında; sonraki geçişler: yumuşak ve yalnız gerekirse
  useLayoutEffect(() => {
    if (!hazir || askida) return
    hizala(ilkRef.current, ilkRef.current)
    ilkRef.current = false
  }, [aktifAnahtar, hazir, askida, hizala])
  // Kullanıcı kendisi kaydırınca takip askıya alınır
  useEffect(() => {
    const kap = kapRef.current
    if (!kap) return
    const elle = () => { durdurRef.current(); setAskida(true) }
    kap.addEventListener("wheel", elle, { passive: true })
    kap.addEventListener("touchmove", elle, { passive: true })
    return () => { kap.removeEventListener("wheel", elle); kap.removeEventListener("touchmove", elle) }
  }, [kapRef])
  useEffect(() => () => durdurRef.current(), [])
  const takibeDon = () => { setAskida(false); requestAnimationFrame(() => hizala(true, false)) }
  return { askida, takibeDon }
}

// ── KABUK ────────────────────────────────────────────────────────────────────
function Kabuk({ baslik, alt, surekli, kapat, kapRef, askida, takibeDon, calar, hazirlaniyor, onceki, oynat, sonraki, araclar, children }) {
  const { theme } = useApp()
  const ac = theme.accent
  const [boyutIdx, setBoyutIdx] = useState(() => Math.min(BOYUTLAR.length - 1, Math.max(0, okuJSON(BOYUT_ANAHTAR, 1))))
  const boyut = BOYUTLAR[boyutIdx]
  const kucukDugme = (aktif) => ({
    width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    border: "none", cursor: "pointer", background: aktif ? `${ac}22` : "transparent", color: aktif ? ac : theme.textSecondary, flexShrink: 0,
  })
  return (
    <div role="dialog" aria-modal="true" aria-label={`Odak · ${baslik}`}
      style={{
        position: "fixed", inset: 0, zIndex: 160, background: theme.background, color: theme.text,
        display: "flex", flexDirection: "column", animation: "vkOdakGir .45s ease-out",
      }}>
      <style>{`@keyframes vkOdakGir { from { opacity: 0 } to { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { [aria-label^="Odak"] { animation: none !important } }`}</style>
      {/* Üst şerit */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "calc(env(safe-area-inset-top) + 10px) 12px 8px", borderBottom: `1px solid ${theme.border}66` }}>
        <span style={{ width: "34px", height: "34px", borderRadius: "10px", background: `${ac}18`, color: ac, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Glasses size={18} />
        </span>
        <span style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
          <span style={{ display: "block", fontSize: "15px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{baslik}</span>
          {alt && <span style={{ display: "block", fontSize: "12px", color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{alt}</span>}
        </span>
        {araclar}
        <button onClick={() => { const y = (boyutIdx + 1) % BOYUTLAR.length; setBoyutIdx(y); yazJSON(BOYUT_ANAHTAR, y) }}
          aria-label="Yazı boyutu" title="Yazı boyutu" style={kucukDugme(false)}><Type size={17} /></button>
        <button onClick={() => surekliAyarla(!surekli)} aria-pressed={surekli}
          aria-label={surekli ? "Sürekli odak açık" : "Sürekli odak kapalı"}
          title={surekli ? "Sürekli odak açık — okuma ekran dışında sürdükçe bu pencere kendiliğinden açılır" : "Sürekli odak: okuma ekran dışında sürdükçe bu pencere kendiliğinden açılsın"}
          style={kucukDugme(surekli)}>{surekli ? <Pin size={17} /> : <PinOff size={17} />}</button>
        <button onClick={kapat} aria-label="Odağı kapat" title="Kapat" style={kucukDugme(false)}><X size={19} /></button>
      </div>

      {/* Metin — kenarları yumuşakça solan kaydırma alanı */}
      <div ref={kapRef} style={{
        flex: 1, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 9%, #000 86%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, transparent 0, #000 9%, #000 86%, transparent 100%)",
        "--odak-boyut": `${boyut}px`,
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "30vh 18px 52vh", boxSizing: "border-box" }}>{children(boyut)}</div>
      </div>

      {/* Alt denetim */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: "18px", padding: "10px 12px calc(env(safe-area-inset-bottom) + 12px)", borderTop: `1px solid ${theme.border}66` }}>
        {askida && (
          <button onClick={takibeDon} style={{
            position: "absolute", left: "50%", bottom: "calc(100% + 10px)", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "999px", cursor: "pointer",
            border: `1px solid ${ac}`, background: theme.surface, color: ac, fontFamily: "inherit", fontSize: "13px", fontWeight: 600,
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)", whiteSpace: "nowrap",
          }}><LocateFixed size={15} /> Okunan yere dön</button>
        )}
        <button onClick={onceki} aria-label="Önceki" title="Önceki" style={{ ...kucukDugme(false), width: "44px", height: "44px", color: theme.text }}><SkipBack size={20} /></button>
        <button onClick={oynat} aria-label={calar ? "Duraklat" : "Devam et"} title={calar ? "Duraklat" : "Devam et"}
          style={{ width: "56px", height: "56px", borderRadius: "50%", border: "none", cursor: "pointer", background: ac, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${ac}55` }}>
          {hazirlaniyor ? <Loader2 size={22} style={{ animation: "vkOdakDon 1s linear infinite" }} /> : calar ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: "3px" }} />}
        </button>
        <button onClick={sonraki} aria-label="Sonraki" title="Sonraki" style={{ ...kucukDugme(false), width: "44px", height: "44px", color: theme.text }}><SkipForward size={20} /></button>
        <style>{`@keyframes vkOdakDon { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

// Okunan / okunmayan öğe kabı
function Oge({ anahtar, aktif, gecti, children }) {
  const { theme } = useApp()
  const ac = theme.accent
  return (
    <div data-odak={anahtar} style={{
      position: "relative", padding: "14px 16px", margin: "4px 0", borderRadius: "14px",
      background: aktif ? `${ac}10` : "transparent",
      boxShadow: aktif ? `inset 3px 0 0 ${ac}` : "none",
      opacity: aktif ? 1 : gecti ? 0.38 : 0.55,
      transition: "opacity .8s ease, background .8s ease, box-shadow .8s ease",
    }}>{children}</div>
  )
}

// ── KUR'ÂN ───────────────────────────────────────────────────────────────────
function KuranOdak({ player, surekli, kapat }) {
  const { theme } = useApp()
  const ac = theme.accent
  const kapRef = useRef(null)
  const [mushaf, setMushaf] = useState(null)
  const [meal, setMeal] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [gorunum, setGorunum] = useState(() => ({ arapca: true, meal: true, ...okuJSON(GORUNUM_ANAHTAR, {}) }))
  useEffect(() => {
    let iptal = false
    mealYukle().then(m => { if (!iptal) setMeal(m || {}) })
    mushafYukle().then(m => { if (!iptal) { setMushaf(m); setYukleniyor(false) } })
    return () => { iptal = true }
  }, [])
  const gorunumDegis = (k) => setGorunum(g => {
    const y = { ...g, [k]: !g[k] }
    if (!y.arapca && !y.meal) y[k === "arapca" ? "meal" : "arapca"] = true      // ikisi birden kapanmasın
    yazJSON(GORUNUM_ANAHTAR, y)
    return y
  })

  const a = player.aktifAyet
  const sureNo = a ? (a.besmeleIcin || a.sureNo) : null
  const besmele = !!(a && a.besmeleIcin)
  const sure = mushaf && sureNo ? mushaf.find(s => s.id === sureNo) : null
  const ayetSayisi = sure ? sure.ayetler.length : null
  const aktif = besmele ? "besmele" : a ? `${a.sureNo}:${a.ayetNo}` : null
  const fatiha1 = mushaf ? ayetMetni(mushaf[0]?.ayetler?.[0]) : ""
  const calar = player.durum === "caliyor"
  const kari = (player.KARILAR || []).find(x => x.id === player.kariId)?.label || ""
  const { askida, takibeDon } = useTakip(kapRef, aktif, !!meal && (!gorunum.arapca || !yukleniyor))

  const ayetler = sure ? sure.ayetler : (sureNo && meal ? Object.keys(meal[sureNo] || {}).map(n => ({ no: Number(n) })) : [])
  const mealOf = (no) => meal?.[sureNo]?.[no] || ""
  const secip = (k, ad) => (
    <button onClick={() => gorunumDegis(k)} aria-pressed={!!gorunum[k]}
      style={{ padding: "5px 9px", borderRadius: "999px", fontSize: "12px", fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
        border: `1px solid ${gorunum[k] ? ac : theme.border}`, background: gorunum[k] ? `${ac}18` : "transparent", color: gorunum[k] ? ac : theme.textSecondary, flexShrink: 0 }}>{ad}</button>
  )
  return (
    <Kabuk baslik={sureNo ? `${sureAdi(sureNo)} Sûresi` : "Kur'ân-ı Kerîm"}
      alt={[besmele ? "Besmele" : a ? `${a.ayetNo}. âyet${ayetSayisi ? ` / ${ayetSayisi}` : ""}` : null, calar ? kari : "Duraklatıldı"].filter(Boolean).join(" · ")}
      surekli={surekli} kapat={kapat} kapRef={kapRef} askida={askida} takibeDon={takibeDon}
      calar={calar} onceki={() => player.oncekiAyet()} sonraki={() => player.sonrakiAyet()}
      oynat={() => (calar ? player.duraklat() : player.devamEt())}
      araclar={<span style={{ display: "flex", gap: "4px" }}>{secip("arapca", "Arapça")}{secip("meal", "Meal")}</span>}>
      {(boyut) => (
        <>
          {gorunum.arapca && yukleniyor && (
            <div style={{ textAlign: "center", fontSize: "12.5px", color: theme.textSecondary, marginBottom: "10px" }}>Arapça metin hazırlanıyor…</div>
          )}
          {besmele && (
            <Oge anahtar="besmele" aktif>
              {gorunum.arapca && fatiha1 && <p lang="ar" dir="rtl" style={{ margin: 0, textAlign: "center", fontFamily: "'KFGQPC Uthmanic', serif", fontSize: `${boyut * 1.6}px`, lineHeight: 2 }}>{fatiha1}</p>}
              {gorunum.meal && <p style={{ margin: "6px 0 0", textAlign: "center", fontSize: `${boyut}px`, lineHeight: 1.65 }}>Rahmân ve Rahîm olan Allah'ın adıyla.</p>}
            </Oge>
          )}
          {ayetler.map(ay => {
            const k = `${sureNo}:${ay.no}`
            const bu = !besmele && k === aktif
            const gecti = !besmele && a && a.sureNo === sureNo && ay.no < a.ayetNo
            const ar = gorunum.arapca && sure ? ayetMetni(ay) : ""
            const m = gorunum.meal ? mealOf(ay.no) : ""
            return (
              <Oge key={k} anahtar={k} aktif={bu} gecti={gecti}>
                {ar && (
                  <p lang="ar" dir="rtl" style={{ margin: 0, textAlign: "right", fontFamily: "'KFGQPC Uthmanic', serif", fontSize: `${boyut * 1.6}px`, lineHeight: 2.05, color: theme.text }}>
                    {ar}{" "}
                    <span style={{ display: "inline-block", verticalAlign: "middle" }}><AyetRozeti theme={theme} sayi={ay.no} size={boyut * 2.2} ac={theme.ayetNoRengi || ac} /></span>
                  </p>
                )}
                {m && (
                  <p style={{ margin: ar ? "6px 0 0" : 0, fontSize: `${boyut}px`, lineHeight: 1.65, color: theme.text }}>
                    <span style={{ color: ac, fontWeight: 700, marginRight: "6px" }}>{ay.no}.</span>{m}
                  </p>
                )}
              </Oge>
            )
          })}
        </>
      )}
    </Kabuk>
  )
}

// ── SESLİ OKUMA ──────────────────────────────────────────────────────────────
function birimYazisi(b) {
  if (!b) return { metin: "", tur: "metin" }
  if (b.tip === "kari") return { metin: "Hafız tilâveti", tur: "not" }
  if (b.tip === "uyari") return { metin: "Arapça ibare", tur: "not" }
  if (b.tip === "ayet") return { metin: String(b.soyle || ""), tur: "etiket" }
  if (b.tip === "meal") return { metin: String(b.soyle || "").replace(/^Meali:\s*/, ""), tur: "metin" }
  if (b.tip === "arapca") return { metin: String(b.goster || b.soyle || ""), tur: "arapca" }
  const ek = (b.ek || []).map(e => e.goster).filter(Boolean).join(" ")
  return { metin: [b.goster || b.soyle || "", ek].filter(Boolean).join(" "), tur: b.tip === "baslik" ? "baslik" : "metin" }
}
function SesliOdak({ d, surekli, kapat }) {
  const { theme } = useApp()
  const ac = theme.accent
  const kapRef = useRef(null)
  const liste = sesliOkuyucu.liste ? sesliOkuyucu.liste() : []
  const sira = d.sira || 0
  // Pencere: okunanın biraz öncesinden (başlangıç sabit kalır → liste yukarıdan kaymaz)
  const basRef = useRef(Math.max(0, sira - 12))
  if (sira < basRef.current) basRef.current = Math.max(0, sira - 12)
  const bitis = Math.min(liste.length, sira + 40)
  const okuyor = d.durum === "okuyor"
  const hazirlaniyor = d.durum === "hazirlaniyor" || (okuyor && d.bekliyor)
  const bilgi = sesliOkuyucu.bilgi ? sesliOkuyucu.bilgi() : {}
  const { askida, takibeDon } = useTakip(kapRef, d.birim ? String(sira) : null, liste.length > 0)
  return (
    <Kabuk baslik={bilgi.kitapAdi || "Sesli okuma"}
      alt={[d.birim?.sayfa ? `s. ${d.birim.sayfa}` : null, okuyor ? "Sesli okuma" : hazirlaniyor ? "Hazırlanıyor…" : "Duraklatıldı"].filter(Boolean).join(" · ")}
      surekli={surekli} kapat={kapat} kapRef={kapRef} askida={askida} takibeDon={takibeDon}
      calar={okuyor && !hazirlaniyor} hazirlaniyor={hazirlaniyor}
      onceki={() => sesliOkuyucu.geri()} sonraki={() => sesliOkuyucu.ileri()}
      oynat={() => { if (okuyor) sesliOkuyucu.duraklat(); else { sesKilidiAc(); sesliOkuyucu.devam() } }}>
      {(boyut) => liste.slice(basRef.current, bitis).map((b, j) => {
        const i = basRef.current + j
        const y = birimYazisi(b)
        if (!y.metin) return null
        const stil = y.tur === "arapca"
          ? { fontFamily: "'KFGQPC Uthmanic', serif", fontSize: `${boyut * 1.45}px`, lineHeight: 2, direction: "rtl", textAlign: "right" }
          : y.tur === "baslik" ? { fontSize: `${boyut * 1.15}px`, fontWeight: 700, textAlign: "center", lineHeight: 1.5 }
          : y.tur === "etiket" ? { fontSize: `${boyut * 0.8}px`, color: ac, fontWeight: 700, letterSpacing: "0.02em" }
          : y.tur === "not" ? { fontSize: `${boyut * 0.8}px`, color: theme.textSecondary, fontStyle: "italic" }
          : { fontSize: `${boyut}px`, lineHeight: 1.7 }
        return (
          <Oge key={i} anahtar={String(i)} aktif={i === sira} gecti={i < sira}>
            <p lang={y.tur === "arapca" ? "ar" : undefined} style={{ margin: 0, color: theme.text, ...stil }}>{y.metin}</p>
          </Oge>
        )
      })}
    </Kabuk>
  )
}
