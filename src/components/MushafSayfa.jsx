import MushafKelime from "./MushafKelime"
import SecdeKenar from "./SecdeKenar"
import SureBasligi from "./SureBasligi"
import Besmele from "./Besmele"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

function arapcaRakamla(sayi) {
  const rakamlar = '٠١٢٣٤٥٦٧٨٩'
  return String(sayi)
    .split('')
    .map(d => rakamlar[parseInt(d)] || d)
    .join('')
}

export default function MushafSayfa({
  sayfaNo,
  elemanlar = [],
  sureler = [],
  theme,
  arapcaFont,
  yaziBoyutu = 20,
  player,
  aktifAyet,
  onKelimeTikla,
  onAyetTikla,
  onSureTikla,
}) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  
  // ── PİXEL BAZINDA BOŞLUK KONTROLÜ ──
  const PADDING = {
    // Sayfa içi boşluklar
    page: {
      mobile: { top: 2, right: 12, bottom: 2, left: 12 },
      desktop: { top: 4, right: 36, bottom: 4, left: 36 },
    },
    // Sayfa numarası
    pageNumber: {
      mobile: { marginBottom: 2, paddingY: 2 },
      desktop: { marginBottom: 4, paddingY: 4 },
    },
    // Sure başlığı
    baslik: {
      mobile: { marginBottom: 4 },
      desktop: { marginBottom: 8 },
    },
    // Besmele
    besmele: {
      mobile: { marginBottom: 2 },
      desktop: { marginBottom: 4 },
    },
    // Ayet sonu
    ayetSonu: {
      mobile: { marginX: 1, marginY: 0 },
      desktop: { marginX: 2, marginY: 0 },
    },
    // Sayfa alt çizgisi
    footer: {
      mobile: { marginTop: 4, height: 0.5 },
      desktop: { marginTop: 8, height: 0.5 },
    },
    // Sayfa arası (bir sonraki sayfaya geçiş)
    between: {
      mobile: 4,
      desktop: 8,
    }
  }

  const secdeAyetleriMap = new Map()
  elemanlar.forEach(el => {
    if (el.tip === "kelime" && el.kelime.secde) {
      const key = `${el.sure.id}:${el.ayet.no}`
      if (!secdeAyetleriMap.has(key)) {
        secdeAyetleriMap.set(key, { sureNo: el.sure.id, ayetNo: el.ayet.no })
      }
    }
  })
  const secdeAyetleri = [...secdeAyetleriMap.values()]

  // Responsive seçimler
  const pagePadding = isMobile ? PADDING.page.mobile : PADDING.page.desktop
  const pageNumber = isMobile ? PADDING.pageNumber.mobile : PADDING.pageNumber.desktop
  const baslik = isMobile ? PADDING.baslik.mobile : PADDING.baslik.desktop
  const besmele = isMobile ? PADDING.besmele.mobile : PADDING.besmele.desktop
  const ayetSonu = isMobile ? PADDING.ayetSonu.mobile : PADDING.ayetSonu.desktop
  const footer = isMobile ? PADDING.footer.mobile : PADDING.footer.desktop
  const between = isMobile ? PADDING.between.mobile : PADDING.between.desktop

  // 📱 Responsive font
  const fontSize = isMobile ? yaziBoyutu : yaziBoyutu + 2
  const lineHeight = isMobile ? 2.2 : 2.0

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "720px",
        margin: "0 auto",
        paddingTop: pagePadding.top,
        paddingRight: pagePadding.right,
        paddingBottom: pagePadding.bottom,
        paddingLeft: pagePadding.left,
        boxSizing: "border-box",
        marginBottom: between,
      }}
    >
      {/* ── Sayfa numarası ── */}
      <div style={{
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        paddingTop: pageNumber.paddingY,
        paddingBottom: pageNumber.paddingY,
        marginBottom: pageNumber.marginBottom,
      }}>
        <div style={{
          flex: 1,
          maxWidth: isMobile ? "24px" : "48px",
          height: "0.5px",
          background: `${theme.accent}20`,
        }} />
        
        <span style={{
          fontFamily: "'Scheherazade New', serif",
          fontSize: isMobile ? "9px" : "11px",
          color: theme.accent,
          opacity: 0.4,
          padding: "0 6px",
          letterSpacing: "1px",
        }}>
          {sayfaNo}
        </span>
        
        <div style={{
          flex: 1,
          maxWidth: isMobile ? "24px" : "48px",
          height: "0.5px",
          background: `${theme.accent}20`,
        }} />
      </div>

      {/* Secde kenar rozeti */}
      {secdeAyetleri.length > 0 && (
        <SecdeKenar
          secdeAyetleri={secdeAyetleri}
          theme={theme}
          arapcaFont={arapcaFont}
          onTikla={(ayet) => {
            const sure = sureler.find(s => s.id === ayet.sureNo)
            if (sure) onAyetTikla?.(sure, ayet.ayetNo, null)
          }}
        />
      )}

      {/* ── Sayfa içeriği ── */}
      <div
        style={{
          direction: "rtl",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-start",
          alignItems: "baseline",
          columnGap: isMobile ? "2px" : "3px",
          rowGap: "0px",
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
          fontFamily: arapcaFont,
          color: theme.text,
        }}
      >
        {elemanlar.map((el, idx) => {
          if (el.tip === "sure-baslik") {
            return (
              <div
                key={`baslik-${el.sure.id}`}
                style={{ 
                  width: "100%", 
                  marginBottom: baslik.marginBottom,
                }}
              >
                <SureBasligi
                  sure={el.sure}
                  theme={theme}
                  onTikla={(e) => onSureTikla?.(el.sure, e)}
                />
              </div>
            )
          }

          if (el.tip === "besmele") {
            const sureDetay = sureler.find(s => s.id === el.sure.id)
            return (
              <div
                key={`besmele-${el.sure.id}`}
                style={{ 
                  width: "100%", 
                  marginBottom: besmele.marginBottom,
                }}
              >
                <Besmele
                  theme={theme}
                  sureId={el.sure.id}
                  sureNo={el.sure.id}
                  ayetSayisi={sureDetay?.ayetSayisi}
                  player={player}
                />
              </div>
            )
          }

          if (el.tip === "kelime") {
            const aktif =
              aktifAyet?.sureNo === el.sure.id &&
              aktifAyet?.ayetNo === el.ayet.no

            return (
              <MushafKelime
                key={el.kelime.id}
                kelime={el.kelime}
                aktif={aktif}
                theme={theme}
                arapcaFont={arapcaFont}
                yaziBoyutu={fontSize}
                onTikla={(kelime, e) =>
                  onKelimeTikla?.(kelime, el.sure, el.ayet, e)
                }
              />
            )
          }

          if (el.tip === "ayet-sonu") {
            const arapcaSayi = arapcaRakamla(el.ayet.no)
            const boyut = fontSize * 0.7
            
            return (
              <span
                key={`ayet-sonu-${el.sure.id}-${el.ayet.no}`}
                onClick={(e) => onAyetTikla?.(el.sure, el.ayet.no, e)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  cursor: "pointer",
                  margin: `${ayetSonu.marginY}px ${ayetSonu.marginX}px`,
                  userSelect: "none",
                  opacity: 0.85,
                  verticalAlign: "middle",
                  transform: "translateY(-1px)",
                }}
                title={`${el.sure.isim} · ${el.ayet.no}. Âyet`}
              >
                <svg
                  width={boyut * 1.4}
                  height={boyut * 1.4}
                  viewBox="0 0 40 40"
                  style={{ display: "block", transition: "all 0.15s ease" }}
                >
                  <circle
                    cx="20" cy="20" r="16"
                    fill={theme.accent} fillOpacity="0.06"
                    stroke={theme.accent} strokeWidth="1" strokeOpacity="0.35"
                  />
                  <circle
                    cx="20" cy="20" r="12"
                    fill="none" stroke={theme.accent} strokeWidth="0.5" strokeOpacity="0.15"
                  />
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                    const rad = (deg * Math.PI) / 180
                    const r1 = 14; const r2 = 17
                    const x1 = 20 + Math.cos(rad) * r1
                    const y1 = 20 + Math.sin(rad) * r1
                    const x2 = 20 + Math.cos(rad) * r2
                    const y2 = 20 + Math.sin(rad) * r2
                    return (
                      <line
                        key={i}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={theme.accent} strokeWidth="0.6" strokeOpacity="0.25"
                      />
                    )
                  })}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                    const rad = (deg * Math.PI) / 180
                    const r = i % 2 === 0 ? 11 : 7
                    const x = 20 + Math.cos(rad) * r
                    const y = 20 + Math.sin(rad) * r
                    if (i % 2 === 0) {
                      return (
                        <circle
                          key={i}
                          cx={x} cy={y} r="1"
                          fill={theme.accent} fillOpacity="0.25"
                        />
                      )
                    }
                    return null
                  })}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const deg = i * 30 + 15
                    const rad = (deg * Math.PI) / 180
                    const r = 15
                    const x = 20 + Math.cos(rad) * r
                    const y = 20 + Math.sin(rad) * r
                    return (
                      <circle
                        key={`dot-${i}`}
                        cx={x} cy={y} r="0.6"
                        fill={theme.accent} fillOpacity="0.2"
                      />
                    )
                  })}
                  <text
                    x="20" y="22"
                    textAnchor="middle"
                    fontFamily="'Scheherazade New', serif"
                    fontSize={isMobile ? "9" : "11"}
                    fontWeight="500"
                    fill={theme.accent} fillOpacity="0.7"
                    dominantBaseline="middle"
                  >
                    {arapcaSayi}
                  </text>
                </svg>
              </span>
            )
          }

          return null
        })}
      </div>

      {/* ── Sayfa alt çizgisi ── */}
      <div style={{
        marginTop: footer.marginTop,
        height: footer.height,
        background: `${theme.border}`,
        opacity: 0.12,
        width: "100%",
      }} />
    </div>
  )
}