import { useState } from "react"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

const VAKIF_CPS = new Set([0x615, 0x617, 0x06D8, 0x06D9, 0x08D6, 0x08D7, 0x08DE])
// ── TECVİD / KIRAAT İŞARETLERİ (font-bağımsız, kendi çizimimiz) ────────────────────────────
// KFGQPC bu işaretlerin HEPSİNİ tek bir bozuk ◉ (noktalı-daire) glifine düşürüyor (fonttools ile
// KFGQPC cmap'inden tespit edildi). Başka fonta (me_quran) düşmek kelimenin görüntüsünü bozuyor.
// ÇÖZÜM: işareti string'den ÇIKAR (kelime TEK span'de, aktif fontta, bitişmesi bozulmadan kalır) ve
// kuralı belirten KÜÇÜK RENKLİ SİMGEYİ mutlak-konumlu overlay olarak çiz. Overlay akışa girmediği
// için ne satır kırılımını ne de sayfa yüksekliğini etkiler.
// Simgeler mushaf geleneğindeki kısa gösterimlerdir (alt/üst küçük harf, imâle elması, işmâm halkası).
const TECVID_ISARET = {
  // Bakara 2:245 يبصط — kıraat farkı: sîn ile de okunur (altta küçük س), sâd ile de (üstte küçük ص)
  0x06E3: { sembol: 'س', yer: 'alt', renk: '#c0392b', ad: 'Kıraat farkı: sîn ile okunuş' },
  0x08D5: { sembol: 'ص', yer: 'ust', renk: '#c0392b', ad: 'Kıraat farkı: sâd ile okunuş' },
  // Hûd 11:41 مجرىها — Hafs'ta tek imâle yeri. Mushaf işareti: harfin altında küçük elmas (معين).
  0x06EA: { sembol: '◆', yer: 'alt', renk: '#8e44ad', ad: 'İmâle' },
  // Yûsuf 12:11 تأمنا — işmâm. Mushaf işareti: üstte küçük halka.
  0x06EB: { sembol: '○', yer: 'ust', renk: '#16a085', ad: 'İşmâm' },
  // Hûd 11:42 اركب معنا — idgâm-ı mütecâniseyn (bâ, mîm'e idgâm olur): altta küçük م
  0x06ED: { sembol: 'م', yer: 'alt', renk: '#2980b9', ad: 'İdgâm-ı mütecâniseyn' },
  // Vasl hâlinde okunmayan harf: üstte küçük halka-sıfır
  0x06DF: { sembol: '٥', yer: 'ust', renk: '#7f8c8d', ad: 'Vasılda okunmaz' },
}
const TECVID_CPS = new Set(Object.keys(TECVID_ISARET).map(Number))
// Birleşik (harekeler/işaretler) — taban harf saymak için: bunlar harf DEĞİL.
const BIRLESIK_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/
const OZEL_CPS = new Set([0x08D1, 0x08D2, 0x08D9])
const CIM_CPS = new Set([0x06DA])
const TUM_OZEL_CPS = new Set([...VAKIF_CPS, ...OZEL_CPS, ...CIM_CPS])
// ── PAYLAŞIM GÖRSELİ İÇİN TEMİZLEME ────────────────────────────────────────────────────────
// Aşağıdaki işaretlerin HİÇBİRİ sayfada aktif fontla akış içinde çizilmiyor: hepsi ya string'den
// çıkarılıp mutlak-konumlu overlay olarak (kendi rengi/fontuyla) çiziliyor, ya da ayrı bir span'e
// alınıyor. Canvas'a (Görsel Oluştur) ham metin verilince bu işaretler fontun bozuk glifine
// düşüyordu: KFGQPC'de ◉ halkası, başka fontlarda boş kutu (□) veya kopuk boşluk.
// Bu yüzden görsel üretirken metinden ÇIKARILIRLAR. Harflere ve harekelere dokunulmaz,
// hiçbir renk/biçim değişikliği yapılmaz — sadece bu işaretler atılır.
export const GORSEL_CIKAR_CPS = new Set([...TECVID_CPS, ...VAKIF_CPS, ...OZEL_CPS, ...CIM_CPS, 0x06DB])
export function gorselIcinTemizle(metin) {
  return [...String(metin || "")]
    .filter(c => !GORSEL_CIKAR_CPS.has(c.codePointAt(0)))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
}

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
  // Kelimedeki tecvid/kıraat işaretleri: string'den çıkarılır, simge olarak overlay çizilir.
  // İşaret, string'de BAĞLI OLDUĞU HARFTEN SONRA geldiği için o ana kadar sayılan TABAN harf
  // sayısıyla yatay konumu bulunur → simge kelimenin ortasına değil, ait olduğu harfin üzerine/
  // altına gelir (ör. Bakara 2:245'te üstteki ص "tı" harfinin, alttaki س "sad"ın hizasında).
  // U+0656 (subscript alef) = harfin ALTINA küçük dik çizgi (kasra uzatması / uzun "î").
  // KFGQPC bu glifi ÇİFT ESRE (kasratan) gibi çiziyor → hatalı görünüyor. me_quran/Indopak
  // doğru (tek dik çizgi) çiziyor. Bu yüzden YALNIZ KFGQPC'de bu işaret string'den çıkarılıp
  // altta dik çizgi olarak overlay çizilir; diğer fontlarda dokunulmaz (onlar doğru çiziyor).
  const kfgqpcMi = arapcaFont.toLowerCase().includes('kfgqpc')
  const tecvidler = []
  const uzatmalar = []          // U+0656 konumları (yalnız KFGQPC'de)
  let temizArabic = kelime.arabic
  const uzatmaVar = kfgqpcMi && kelime.arabic.includes('ٖ')
  if ([...kelime.arabic].some(c => TECVID_CPS.has(c.codePointAt(0))) || uzatmaVar) {
    const kalan = []
    let taban = 0
    for (const c of kelime.arabic) {
      const cp = c.codePointAt(0)
      const t = TECVID_ISARET[cp]
      if (t) { tecvidler.push({ ...t, taban }); continue }   // işaret metinden çıkar
      if (uzatmaVar && cp === 0x0656) { uzatmalar.push({ taban }); continue }  // dik çizgi overlay olacak
      kalan.push(c)
      if (!BIRLESIK_RE.test(c)) taban++                       // yalnız taban (harf) say
    }
    temizArabic = kalan.join('')
    const toplam = Math.max(1, taban)
    // oran: sağdan (RTL başlangıcı) itibaren harfin merkezi → soldan yüzde konumu
    for (const tv of tecvidler) {
      const oran = Math.min(1, Math.max(0, (tv.taban - 0.5) / toplam))
      tv.sol = (1 - oran) * 100
    }
    for (const uz of uzatmalar) {
      const oran = Math.min(1, Math.max(0, (uz.taban - 0.5) / toplam))
      uz.sol = (1 - oran) * 100
    }
  }
  const uzatmaRengi = (lafzatullahMi(kelime.arabic) || besmeleMi(kelime.id))
    ? (theme.lugatHighlight || theme.accent) : theme.text
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

      {/* Tecvid / kıraat kuralı simgeleri — MUTLAK konumlu (akışa girmez: satır kırılımını ve
          sayfa yüksekliğini etkilemez). Kelimenin altına/üstüne ortalı, küçük ve renkli. */}
      {tecvidler.map((t, ti) => (
        <span
          key={`tv-${ti}`}
          title={t.ad}
          style={{
            position: "absolute",
            left: `${t.sol ?? 50}%`,
            // Kutu yüksekliği satır aralığına göre değiştiğinden ÜST/ALT kenara değil, kutunun
            // DİKEY MERKEZİNE (harflerin bulunduğu yer) göre konumlandırılır → satır aralığı
            // ayarı değişse de simge kelimeye aynı uzaklıkta kalır.
            top: "50%",
            transform: `translate(-50%, -50%) translateY(${t.yer === "ust" ? "-" : ""}${yaziBoyutu * (t.yer === "ust" ? 0.74 : 0.62)}px)`,
            fontSize: `${yaziBoyutu * 0.34}px`,
            lineHeight: 1,
            color: t.renk,
            fontFamily: "'Scheherazade New', serif",
            fontWeight: 700,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 3,
          }}
        >
          {t.sembol}
        </span>
      ))}

      {/* U+0656 uzatma çizgisi (yalnız KFGQPC) — harfin ALTINA küçük, hafif eğik dik çizgi.
          Metin renginde (tecvid kuralı değil, olağan imlâ). Tecvid simgeleriyle aynı mantıkla
          kutunun DİKEY MERKEZİNE göre konumlanır → satır aralığı değişse de harfe aynı uzaklıkta. */}
      {uzatmalar.map((uz, ui) => (
        <span
          key={`uz-${ui}`}
          style={{
            position: "absolute",
            left: `${uz.sol ?? 50}%`,
            top: "50%",
            transform: `translate(-50%, -50%) translateY(${yaziBoyutu * 0.46}px) rotate(6deg)`,
            width: `${Math.max(1.4, yaziBoyutu * 0.05)}px`,
            height: `${yaziBoyutu * 0.27}px`,
            borderRadius: `${yaziBoyutu * 0.05}px`,
            background: uzatmaRengi,
            opacity: aktif ? 1 : 0.95,
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      ))}

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
            return <span style={{ letterSpacing: 0 }}>{temizArabic}</span>
          }

          // NOT: tecvid işaretleri temizArabic'te YOK (yukarıda çıkarıldı) → kelime tek parça,
          // aktif fontta, bitişmesi bozulmadan çizilir; kural simgesi aşağıda overlay olarak gelir.
          const hasOzel = [...temizArabic].some(c => TUM_OZEL_CPS.has(c.codePointAt(0)))

          if (!hasOzel) {
            return <span>{temizArabic}</span>
          }

          const chars = [...temizArabic]
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