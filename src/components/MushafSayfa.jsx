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
  
  // 📱 Responsive ayarlar
  const responsive = {
    // Padding
    paddingX: isMobile ? 16 : 48,
    paddingY: isMobile ? 4 : 8,
    
    // Font
    fontSize: isMobile ? yaziBoyutu : yaziBoyutu + 2,
    lineHeight: isMobile ? 2.4 : 2.2,
    
    // Boşluklar
    baslikMargin: isMobile ? 4 : 8,
    besmeleMargin: isMobile ? 2 : 4,
    sayfaNumaraMargin: isMobile ? 2 : 6,
    
    // Kelime aralığı
    kelimeGap: isMobile ? 2 : 3,
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

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "680px",
        margin: "0 auto",
        padding: `${responsive.paddingY}px ${responsive.paddingX}px 4px`,
        boxSizing: "border-box",
      }}
    >
      {/* ── Sayfa numarası ── */}
      <div style={{
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: `${responsive.sayfaNumaraMargin}px 0`,
        marginBottom: responsive.sayfaNumaraMargin,
      }}>
        <div style={{
          flex: 1,
          maxWidth: isMobile ? "30px" : "60px",
          height: "1px",
          background: `${theme.accent}25`,
        }} />
        
        <span style={{
          fontFamily: "'Scheherazade New', serif",
          fontSize: isMobile ? "10px" : "12px",
          color: theme.accent,
          opacity: 0.5,
          padding: "0 8px",
          letterSpacing: "1px",
        }}>
          {sayfaNo}
        </span>
        
        <div style={{
          flex: 1,
          maxWidth: isMobile ? "30px" : "60px",
          height: "1px",
          background: `${theme.accent}25`,
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
          columnGap: `${responsive.kelimeGap}px`,
          rowGap: "0px",
          // 📱 Sabit satır aralığı
          lineHeight: responsive.lineHeight,
          fontSize: responsive.fontSize,
          fontFamily: arapcaFont,
        }}
      >
        {elemanlar.map((el, idx) => {
          if (el.tip === "sure-baslik") {
            return (
              <div
                key={`baslik-${el.sure.id}`}
                style={{ width: "100%", marginBottom: responsive.baslikMargin }}
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
                style={{ width: "100%", marginBottom: responsive.besmeleMargin }}
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
                yaziBoyutu={responsive.fontSize}
                onTikla={(kelime, e) =>
                  onKelimeTikla?.(kelime, el.sure, el.ayet, e)
                }
              />
            )
          }

          if (el.tip === "ayet-sonu") {
            const arapcaSayi = arapcaRakamla(el.ayet.no)
            const boyut = responsive.fontSize * 0.7
            
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
                  margin: "0 2px",
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
                    fill={theme.accent} fillOpacity="0.08"
                    stroke={theme.accent} strokeWidth="1.2" strokeOpacity="0.4"
                  />
                  <circle
                    cx="20" cy="20" r="12"
                    fill="none" stroke={theme.accent} strokeWidth="0.6" strokeOpacity="0.2"
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
                        stroke={theme.accent} strokeWidth="0.8" strokeOpacity="0.3"
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
                          cx={x} cy={y} r="1.2"
                          fill={theme.accent} fillOpacity="0.3"
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
                        cx={x} cy={y} r="0.8"
                        fill={theme.accent} fillOpacity="0.25"
                      />
                    )
                  })}
                  <text
                    x="20" y="22"
                    textAnchor="middle"
                    fontFamily="'Scheherazade New', serif"
                    fontSize={isMobile ? "10" : "12"}
                    fontWeight="500"
                    fill={theme.accent} fillOpacity="0.8"
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
        marginTop: isMobile ? "4px" : "8px",
        height: "0.5px",
        background: `${theme.border}`,
        opacity: 0.15,
      }} />
    </div>
  )
}