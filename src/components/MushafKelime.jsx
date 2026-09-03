import { useState } from "react"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

const VAKIF_CPS = new Set([0x615, 0x617, 0x06D8, 0x06D9, 0x08D6, 0x08D7, 0x08DE])
// HALKA İŞARETLERİ: KFGQPC bu kıraat/tecvid işaretlerini ◉ (noktalı-daire) çiziyor — fontta
// hepsi TEK ortak "ring" glifine düşüyor (fonttools ile KFGQPC cmap'inden tespit edildi). me_quran
// ise hepsini DOĞRU çiziyor (küçük alt/üst işaret, imâle elması vb.). Bir kelime bunlardan birini
// içeriyor VE aktif font KFGQPC ise → kelimenin TAMAMINI me_quran ile çiz: BÖLME YOK, harf bitişmesi
// korunur (ör. Bakara 2:245 يبصط [06E3], Hûd 11:41 مجرىها [06EA]). U+08D5 (üst küçük sad) İKİ fontta
// da YOK → tofu olmasın diye string'den çıkarılır (Bakara يبصط sonundaki ص işareti).
const HALKA_ISARET = new Set([0x06DF, 0x06E3, 0x06EA, 0x06EB, 0x06ED])
const OZEL_CPS = new Set([0x08D1, 0x08D2, 0x08D9])
const CIM_CPS = new Set([0x06DA])
const TUM_OZEL_CPS = new Set([...VAKIF_CPS, ...OZEL_CPS, ...CIM_CPS])
const CIM_RENK = '#f39c12'
const VAKIF_RENK = {
  0x615:  '#e67e22',
  0x617:  '#e74c3c',
  0x06D8: '#3498db',
  0x06D9: '#f39c12',
  0x06DA: '#2ecc71',
  0x06DB: '#9b59b6',
  0x06DC: '#1abc9c',
  0x08D6: '#95a5a6',
  0x08D7: '#3498db',
  0x08DE: '#3498db',
  0x08D5: '#c0392b',
}
const VAKIF_RENKLERI = {
  'ط': '#e67e22',
  'م': '#e74c3c',
  'ج': '#f39c12',
  'ص': '#2ecc71',
  'مع': '#9b59b6',
  'ق': '#3498db',
  'س': '#1abc9c',
  'لا': '#e67e22',
}
const OZEL_SEMBOL = {
  0x08D1: 'قصر',
  0x08D2: 'مد',
  0x08D9: 'ن',
  0x06DC: 'سكته',
  0x08D5: 'ص',
  0x06EB: 'اشمام',  // işmam
}
const OZEL_RENK = {
  0x08D1: '#c0392b',
  0x08D2: '#c0392b',
  0x08D9: '#c0392b',
  0x06DC: '#8e44ad',
  0x06EB: '#16a085',
}

function besmeleMi(kelimeId) {
  const [sure, ayet, kelime] = kelimeId.split(':').map(Number)
  if (sure === 1 && ayet === 1) return true
  if (sure === 27 && ayet === 30 && kelime >= 5 && kelime <= 8) return true
  return false
}

function vakifMi(seg) {
  return [...seg].some(c => VAKIF_CPS.has(c.codePointAt(0)))
}

function vakifRengiAl(vakifStr) {
  const cp = [...vakifStr][0]?.codePointAt(0)
  return VAKIF_RENK[cp] || '#e67e22'
}

function lafzatullahMi(arabic) {
  const temiz = arabic
    .replace(/[\u0671\u0622\u0623\u0625]/g, '\u0627')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .trim()
  return temiz === '\u0627\u0644\u0644\u0647' || temiz.includes('\u0644\u0644\u0647')
}



export default function MushafKelime({
  kelime,
  aktif = false,
  theme,
  arapcaFont,
  yaziBoyutu = 20,
  lineHeight = 2.4,
  harfAraligi = 0,
  onTikla,
  kayitKonumModu = false,
}) {
  const [hover, setHover] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const lafizkontrol = lafzatullahMi(kelime.arabic)
  const besmelekontrol = besmeleMi(kelime.id)
  const hasUpperIndicator = kelime.vakif || kelime.secde
  const vakifRengi = kelime.vakif ? vakifRengiAl(kelime.vakif) : null
  const efektifLineHeight = arapcaFont.toLowerCase().includes('me_quran') || arapcaFont.toLowerCase().includes('mequran')
  
  ? Math.max(lineHeight, 5.2)
  : lineHeight
  

  return (
    <span
      className="mushaf-kelime"
      onClick={(e) => onTikla?.(kelime, e)}
      onMouseEnter={() => { if (!kayitKonumModu) setHover(true) }}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: kayitKonumModu ? "crosshair" : "pointer",
        marginTop: hasUpperIndicator ? `${yaziBoyutu * 0.35}px` : "0",
        paddingLeft: isMobile ? `${2 + harfAraligi * 3}px` : "3px",
        paddingRight: isMobile ? `${2 + harfAraligi * 3}px` : "3px",
        paddingBottom: "2px",
        borderRadius: "3px",
        background: kayitKonumModu
          ? "transparent"
          : aktif
            ? `${theme.accent}22`
            : hover ? `${theme.accent}0a` : "transparent",
        boxShadow: kayitKonumModu ? "none" : aktif ? `inset 0 -2px 0 ${theme.accent}` : "none",
        transition: "background 0.15s",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        userSelect: "none",
        lineHeight: lineHeight,
        WebkitTapHighlightColor: kayitKonumModu ? "transparent" : undefined,
      }}
    >
      {/* Vakıf işareti */}
      {kelime.vakif && (
        <span
          style={{
            position: "absolute",
            top: `-${yaziBoyutu * 0.09}px`,
            left: isMobile ? "10px" : "3px",
            transform: "translateX(-10%)",
            fontSize: `${yaziBoyutu * 0.48}px`,
            color: vakifRengi,
            fontFamily: "'Scheherazade New', serif",
            fontWeight: "bold",
            lineHeight: 1,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          {kelime.vakif}
        </span>
      )}

      {/* Secde işareti */}
      {kelime.secde && (
        <span
          style={{
            position: "absolute",
            top: kelime.vakif ? `-${yaziBoyutu * 0.1}px` : `-${yaziBoyutu * 0.05}px`,
            right: kelime.vakif ? "auto" : "0",
            left: kelime.vakif ? "auto" : "40%",
            transform: kelime.vakif ? "translateX(120%)" : "translateX(-50%)",
            fontSize: `${yaziBoyutu * 0.32}px`,
            color: "#2e7d4f",
            fontFamily: "'Scheherazade New', serif",
            lineHeight: 1,
            pointerEvents: "none",
            zIndex: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" style={{ display: "inline-block" }}>
            <path
              d="M12 2 L14.5 8.5 L21.5 8.5 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2.5 8.5 L9.5 8.5 Z"
              fill="none" stroke="#2e7d4f" strokeWidth="1.5" strokeLinejoin="round"
            />
            <circle cx="12" cy="11" r="2.5" fill="#2e7d4f" />
          </svg>
          سَجْدَة
        </span>
      )}

      {/* Arapça metin */}
      <span
        style={{
          fontFamily: arapcaFont,
          fontSize: `${yaziBoyutu}px`,
          lineHeight: lineHeight,
          color: (lafizkontrol || besmelekontrol) ? (theme.lugatHighlight || theme.accent) : theme.text,
          display: "inline",
          opacity: aktif ? 1 : 0.95,
          verticalAlign: "middle",
          position: "relative",
        }}
      >
        {(() => {
          const isKfgqpc = arapcaFont.toLowerCase().includes('kfgqpc')

          if (arapcaFont.toLowerCase().includes('kufi') || arapcaFont.toLowerCase().includes('kûfi')) {
            return <span style={{ letterSpacing: 0 }}>{kelime.arabic}</span>
          }

          // HALKA işareti + KFGQPC → tüm kelimeyi me_quran ile çiz (bölme yok → bitişme korunur;
          // KFGQPC'nin ◉ halkası yerine me_quran'ın doğru işareti). 08D5 (iki fontta da yok) çıkarılır.
          if (isKfgqpc && [...kelime.arabic].some(c => HALKA_ISARET.has(c.codePointAt(0)))) {
            const temiz = [...kelime.arabic].filter(c => c.codePointAt(0) !== 0x08D5).join('')
            return <span style={{ fontFamily: "'me_quran', serif" }}>{temiz}</span>
          }

          const hasOzel = [...kelime.arabic].some(c => TUM_OZEL_CPS.has(c.codePointAt(0)))

          if (!hasOzel) {
            return <span>{kelime.arabic}</span>
          }

          const chars = [...kelime.arabic]
          const spans = []
          let normalBuf = ''
          let atla = false

          chars.forEach((c, i) => {
            if (atla) { atla = false; return }
            const cp = c.codePointAt(0)

            if (cp === 0x06DA) {
            if (normalBuf) { spans.push(<span key={`n-${i}`}>{normalBuf}</span>); normalBuf = '' }
            const nextCp = chars[i+1]?.codePointAt(0)
            const f = arapcaFont.toLowerCase()
            const cimTop = f.includes('nastaleeq')
              ? `-${yaziBoyutu * 0.4}px`
              : f.includes('indopak')
                ? `-${yaziBoyutu * 0.8}px`
                : f.includes('me_quran')
                  ? `${yaziBoyutu * 0.3}px`
                  : f.includes('kfgqpc')
                    ? `-${yaziBoyutu * 0}px`
                    : `-${yaziBoyutu * 0}px`
            if (nextCp === 0x06DB) {
              spans.push(<span key={i} style={{ position: 'absolute', top: cimTop, color: '#9b59b6' }}>{c}{chars[i+1]}</span>)
              atla = true
            } else {
              spans.push(<span key={i} style={{ position: 'absolute', top: cimTop, color: '#2ecc71' }}>{c}</span>)
            }
          } else if (cp === 0x06DB) {
              if (normalBuf) { spans.push(<span key={`n-${i}`}>{normalBuf}</span>); normalBuf = '' }
              spans.push(<span key={i} style={{ position: 'absolute', top: `-${yaziBoyutu * 0.25}px`, color: '#9b59b6' }}>{c}</span>)
            } else if (VAKIF_CPS.has(cp)) {
              if (normalBuf) { spans.push(<span key={`n-${i}`}>{normalBuf}</span>); normalBuf = '' }
              const fallbackGerekli = arapcaFont.toLowerCase().includes('kfgqpc')
                || arapcaFont.toLowerCase().includes('me_quran')
                || arapcaFont.toLowerCase().includes('mequran')
                || arapcaFont.toLowerCase().includes('nastaleeq')

              const vakifFontFamily = fallbackGerekli ? "'Scheherazade New', serif" : arapcaFont
              const f = arapcaFont.toLowerCase()
              const vakifTop = f.includes('me_quran')
                ? (cp === 0x0615 ? `-${yaziBoyutu * 0.2}px` : `${yaziBoyutu * 0.2}px`)  // me_quran: t vakfı normal, diğerleri aşağı
                : f.includes('nastaleeq')
                  ? `-${yaziBoyutu * 0.25}px`  // nastaleeq: normal top
                  : f.includes('indopak')
                    ? `-${yaziBoyutu * 1}px`  // indopak: yukarı
                    : `-${yaziBoyutu * 0}px`  // kfgqpc: normal

              const vakifLeft = f.includes('nastaleeq') ? '10px' : 'auto'
              const vakifTransform = f.includes('nastaleeq') ? 'none' : 'translateX(-50%)'

              spans.push(<span key={i} style={{ 
                position: 'absolute', 
                top: vakifTop,
                left: vakifLeft,
                transform: vakifTransform,
                color: vakifRengiAl(c), 
                fontFamily: vakifFontFamily,
                whiteSpace: 'nowrap',
              }}>{c}</span>)
            } else if (OZEL_CPS.has(cp)) {
              if (normalBuf) { spans.push(<span key={`n-${i}`}>{normalBuf}</span>); normalBuf = '' }
              spans.push(<span key={i} style={{
                position: 'absolute',
                bottom: `-${yaziBoyutu * 0.25}px`,
                right: 0,
                color: OZEL_RENK[cp] || '#c0392b',
                fontSize: `${yaziBoyutu * 0.45}px`,
                fontFamily: "'Scheherazade New', serif",
              }}>{OZEL_SEMBOL[cp] || c}</span>)
            } else {
              normalBuf += c
            }
          })

          if (normalBuf) spans.push(<span key="n-last">{normalBuf}</span>)

          return (
            <span style={{ position: 'relative', display: 'inline-block' }}>
              {spans}
            </span>
          )
        })()}
      </span>
    </span>
  )
}