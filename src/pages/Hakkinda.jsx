import { useApp } from "../AppContext"
import { useEffect, useId, useState } from "react"
import { Mail, BookOpen, Globe, Sparkles } from "lucide-react"
import MealPopup from "../components/MealPopup"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

/* ═══════════════════════════════════════════════════════════════════════════
   HAKKINDA (8 Ekim 2026)
   Kullanıcı: "Meal penceresini bizdeki gibi yapalım, sayfayı güzelleştirelim;
   sayfa besmele ile başlasın, sonra Hakkında yazsın."
   • Âyete dokununca Kur'ân ekranındaki MealPopup açılıyor (aynı tezhipli pencere,
     aynı konum/boyut ayarları). Aynı âyete tekrar dokununca ya da ✕ ile kapanıyor.
   • Arapça metinler ve mealleri dosyanın önceki hâlindekilerle AYNEN aynı.
   ═══════════════════════════════════════════════════════════════════════════ */

const BESMELE = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
const TEVFIK = "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ"

// Meal penceresine giden bilgi: sûre (hat glifi için no + ad), âyet no, meal
const AYETLER = {
  [BESMELE]: { sure: { id: 0, isim: "Besmele-i Şerîfe" }, ayetNo: null, besmeleMi: true, meal: "Rahman ve Rahim olan Allah'ın adıyla." },
  [TEVFIK]:  { sure: { id: 11, isim: "Hûd" }, ayetNo: 88, besmeleMi: false, meal: "Başarım, ancak Allah'ın yardımıyladır." },
}

// Tezhip ayracı (MealPopup'taki şemse ve dal süsleriyle aynı dil): ortada altı yapraklı
// rozet, iki yanında rûmî kıvrımlar, uçlara doğru solarak incelen çizgi ve küçük badem taneleri
function Ayrac({ ac, en = 240 }) {
  const id = useId().replace(/:/g, "")
  const c = en / 2
  const kanat = (
    <g>
      {/* rûmî kıvrım: rozetten dışa doğru S kıvrımı, ucunda helezon */}
      <path d={`M${c - 9} 12 C${c - 15} 12 ${c - 17} 6.6 ${c - 22} 6.8 C${c - 26} 7 ${c - 26.6} 11 ${c - 23.6} 11.6 C${c - 21.6} 12 ${c - 21} 9.8 ${c - 22.6} 9.4`}
        fill="none" stroke={ac} strokeWidth="0.9" strokeOpacity="0.8" strokeLinecap="round" />
      <path d={`M${c - 9} 12 C${c - 15} 12 ${c - 17} 17.4 ${c - 22} 17.2`} fill="none" stroke={ac} strokeWidth="0.8" strokeOpacity="0.55" strokeLinecap="round" />
      {/* solan çizgi */}
      <path d={`M${c - 27} 12 H6`} stroke={`url(#${id}-sol)`} strokeWidth="0.9" />
      {/* badem taneleri */}
      <path d={`M${c - 40} 12 l3 -1.8 3 1.8 -3 1.8 z`} fill={ac} fillOpacity="0.55" />
      <circle cx={c - 52} cy="12" r="1" fill={ac} fillOpacity="0.4" />
      <circle cx={c - 60} cy="12" r="0.7" fill={ac} fillOpacity="0.3" />
    </g>
  )
  return (
    <svg width={en} height="24" viewBox={`0 0 ${en} 24`} aria-hidden="true" style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
      <defs>
        {/* yatay çizginin yüksekliği 0 → nesne kutusu birimi çalışmaz; kullanıcı birimi */}
        <linearGradient id={`${id}-sol`} gradientUnits="userSpaceOnUse" x1="6" x2={c - 27} y1="12" y2="12">
          <stop offset="0" stopColor={ac} stopOpacity="0" />
          <stop offset="1" stopColor={ac} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {kanat}
      <g transform={`translate(${en} 0) scale(-1 1)`}>{kanat}</g>
      {/* altı yapraklı rozet */}
      <g transform={`translate(${c} 12)`}>
        {/* sekiz yapraklı gül-rozet (yapraklar merkezden dışa; birbirini kesmez) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(d => (
          <path key={d} d={d % 90 === 0 ? "M0 -3 C2 -4.8 1.7 -8 0 -9.6 C-1.7 -8 -2 -4.8 0 -3 Z" : "M0 -3 C1.4 -4.2 1.2 -6.4 0 -7.4 C-1.2 -6.4 -1.4 -4.2 0 -3 Z"}
            transform={`rotate(${d})`} fill={ac} fillOpacity={d % 90 === 0 ? 0.22 : 0.12} stroke={ac} strokeWidth="0.7" strokeOpacity="0.8" />
        ))}
        <circle r="2.4" fill="none" stroke={ac} strokeWidth="0.8" strokeOpacity="0.9" />
        <circle r="1.1" fill={ac} />
      </g>
    </svg>
  )
}

// Köşe süsü (besmele çerçevesi için)
function Kose({ ac, style }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" style={{ position: "absolute", ...style }}>
      <path d="M2 14 V2 H14" fill="none" stroke={ac} strokeWidth="1" strokeOpacity="0.7" />
      <path d="M5 11 V5 H11" fill="none" stroke={ac} strokeWidth="0.8" strokeOpacity="0.45" />
      <circle cx="2" cy="2" r="1.6" fill={ac} fillOpacity="0.8" />
    </svg>
  )
}

export default function Hakkinda() {
  const { theme, arapcaFont } = useApp()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [secili, setSecili] = useState(null)
  const ac = theme.accent

  const ayetTikla = (metin) => { setSecili(s => (s === metin ? null : metin)); setIpucu(false) }
  // "Mealini görmek için…" ipucu 3 sn sonra yavaşça kaybolur (yeri korunur, sayfa zıplamaz)
  const [ipucu, setIpucu] = useState(true)
  useEffect(() => { const t = setTimeout(() => setIpucu(false), 3000); return () => clearTimeout(t) }, [])
  const veri = secili ? AYETLER[secili] : null
  const arapcaYazi = arapcaFont || "'KFGQPC Uthmanic', 'Amiri', 'Traditional Arabic', serif"

  const ayetStil = (aktif) => ({
    cursor: "pointer", display: "inline-block", transition: "opacity 0.2s, transform 0.2s",
    borderRadius: "10px", padding: "0 6px",
    background: aktif ? `${ac}14` : "transparent",
  })

  const kaynak = (Ikon, ad, alt, link) => (
    <div style={{
      display: "flex", gap: "12px", alignItems: "flex-start",
      padding: "12px 14px", borderRadius: "12px",
      background: theme.background, border: `1px solid ${theme.border}`,
    }}>
      <span style={{
        width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `${ac}18`, color: ac,
      }}><Ikon size={17} /></span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "14.5px", fontWeight: 600, color: theme.text }}>
          {link ? (
            <a href={link.href} target="_blank" rel="noopener noreferrer"
              style={{ color: ac, textDecoration: "none", borderBottom: `1px solid ${ac}55` }}>{ad}</a>
          ) : ad}
          {link?.not && <span style={{ fontWeight: 400, color: theme.textSecondary }}> {link.not}</span>}
        </div>
        <div style={{ fontSize: "12.5px", color: theme.textSecondary, marginTop: "3px", lineHeight: 1.55 }}>{alt}</div>
      </div>
    </div>
  )

  return (
    <div style={{
      maxWidth: "760px", margin: "0 auto",
      padding: isMobile ? "28px 14px 120px" : "48px 24px 120px",
      minHeight: "100vh", background: theme.background, position: "relative",
    }}>
      <div style={{
        background: theme.surface, borderRadius: "20px",
        padding: isMobile ? "30px 20px 26px" : "44px 44px 34px",
        border: `1px solid ${theme.border}`,
        boxShadow: "0 6px 28px rgba(0,0,0,0.08)",
        position: "relative",
      }}>
        {/* İç ince çerçeve */}
        <div aria-hidden="true" style={{ position: "absolute", inset: "7px", borderRadius: "15px", border: `1px solid ${ac}22`, pointerEvents: "none" }} />

        {/* ── BESMELE — sayfanın başı ─────────────────────────────────── */}
        <div style={{ position: "relative", padding: isMobile ? "18px 10px 14px" : "22px 20px 16px", margin: "0 auto", maxWidth: "560px" }}>
          <Kose ac={ac} style={{ left: 0, top: 0 }} />
          <Kose ac={ac} style={{ right: 0, top: 0, transform: "scaleX(-1)" }} />
          <Kose ac={ac} style={{ left: 0, bottom: 0, transform: "scaleY(-1)" }} />
          <Kose ac={ac} style={{ right: 0, bottom: 0, transform: "scale(-1,-1)" }} />
          <div style={{
            fontFamily: arapcaYazi, direction: "rtl", textAlign: "center",
            color: theme.arabicHighlight, lineHeight: 1.9,
            // Telefonda tek satıra sığsın: ekran enine göre küçülür
            fontSize: isMobile ? "clamp(20px, 7.2vw, 32px)" : "38px", whiteSpace: "nowrap",
          }}>
            <span
              onClick={() => ayetTikla(BESMELE)}
              style={ayetStil(secili === BESMELE)}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.75" }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
            >
              {BESMELE}
            </span>
          </div>
        </div>
        <div aria-hidden={!ipucu} style={{ textAlign: "center", fontSize: "11.5px", color: theme.textSecondary, marginTop: "6px", opacity: ipucu ? 0.85 : 0, transition: "opacity 0.8s ease" }}>
          Mealini görmek için âyete dokunabilirsiniz
        </div>

        {/* ── BAŞLIK ─────────────────────────────────────────────────── */}
        <div style={{ marginTop: "26px" }}>
          <Ayrac ac={ac} />
          <h1 style={{
            fontSize: isMobile ? "26px" : "30px", color: ac,
            fontFamily: "PlayfairDisplay, serif", margin: "14px 0 0",
            textAlign: "center", letterSpacing: "1px",
          }}>
            Hakkında
          </h1>
        </div>

        {/* ── AÇIKLAMA ───────────────────────────────────────────────── */}
        <p style={{
          margin: "20px auto 0", maxWidth: "560px",
          color: theme.text, fontSize: "15.5px", lineHeight: 1.9, textAlign: "center",
        }}>
          Vukuf; İslâm âlimlerinin istifade edilmesi ümit edilen seçkin eserlerini ve diğer
          islâmî eserleri kolaylıkla okuyabilmeyi ve inceleyebilmeyi amaçlayarak derlenmiştir.
          Herhangi bir ticarî amacı yoktur.
        </p>

        {/* ── KAYNAKLAR ──────────────────────────────────────────────── */}
        <div style={{ marginTop: "32px" }}>
          <h2 style={{
            fontSize: "12px", letterSpacing: "1.5px", color: ac,
            margin: "0 0 12px", fontFamily: "PlayfairDisplay, serif", textAlign: "center",
          }}>
            {"Yararlanılan Kişi ve Kaynaklar".toLocaleUpperCase("tr-TR")}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "10px" }}>
            {kaynak(BookOpen, "3ondokuz",
              "Risale-i Nûr, Kur'ân-ı Kerîm, Muhtelif Eserler, Evrad, Ezkâr ve Riyâzü's-Sâlihîn kaynakları; Arapça yazı fontu",
              { href: "https://instagram.com/3ondokuz" })}
            {kaynak(Globe, "Necati Aksu",
              "İmam Gazzâlî Eserleri, Abdülkâdir Geylânî Eserleri",
              { href: "https://necatiaksu.net/" })}
          </div>
        </div>

        {/* ── KATKI ──────────────────────────────────────────────────── */}
        <div style={{
          marginTop: "24px", padding: "14px 16px", borderRadius: "12px",
          background: `${ac}0d`, border: `1px dashed ${ac}55`,
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "center",
          fontSize: "13.5px", color: theme.text, textAlign: "center",
        }}>
          <Mail size={16} color={ac} />
          <span>Dokümanlarla katkıda bulunmak için:</span>
          <a href="mailto:hoschgor@gmail.com" style={{ color: ac, textDecoration: "none", borderBottom: `1px solid ${ac}55`, fontWeight: 600 }}>
            hoschgor@gmail.com
          </a>
        </div>

        {/* ── KAPANIŞ: ve mâ tevfîkî illâ billâh ──────────────────────── */}
        <div style={{ marginTop: "34px" }}>
          <Ayrac ac={ac} en={180} />
          <div style={{
            fontFamily: arapcaYazi, direction: "rtl", textAlign: "center",
            color: theme.arabicHighlight, lineHeight: 1.9, marginTop: "10px",
            fontSize: isMobile ? "24px" : "28px",
          }}>
            <span
              onClick={() => ayetTikla(TEVFIK)}
              style={ayetStil(secili === TEVFIK)}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.75" }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
            >
              {TEVFIK}
            </span>
          </div>
        </div>

        {/* ── ALT BİLGİ ──────────────────────────────────────────────── */}
        <div style={{
          marginTop: "22px", paddingTop: "16px", borderTop: `1px solid ${theme.border}`,
          display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", flexWrap: "wrap",
          fontSize: "12px", color: theme.textSecondary,
        }}>
          <Sparkles size={13} color={ac} />
          <span>Geliştirilmeye devam ediyor</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>Vukuf v1.0.0 · 2026</span>
        </div>
      </div>

      {/* Meal penceresi — Kur'ân ekranındakinin aynısı */}
      <MealPopup
        acik={!!veri}
        sure={veri?.sure}
        ayetNo={veri?.ayetNo}
        meal={veri?.meal}
        besmeleMi={veri?.besmeleMi}
        theme={theme}
        isMobile={isMobile}
        altBosluk={0}
        onKapat={() => setSecili(null)}
      />
    </div>
  )
}
