import MushafKelime from "./MushafKelime"
import SecdeKenar from "./SecdeKenar"
import SureBasligi from "./SureBasligi"
import Besmele from "./Besmele"

/**
 * MushafSayfa
 * ───────────
 * Konum: src/components/MushafSayfa.jsx
 *
 * Tek bir mushaf sayfasını render eder.
 * Kelimeler flex-wrap ile akar — CSS satır kırar, sayfa sabit kalır.
 * Zoom değişse de sayfa içeriği değişmez, sadece font boyutu değişir.
 */
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
  // Secde ayetlerini topla
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
        padding: "24px 48px 32px",
        boxSizing: "border-box",
      }}
    >
      {/* Sayfa numarası */}
      <div style={{
        textAlign: "center",
        fontSize: "11px",
        color: theme.textSecondary,
        marginBottom: "16px",
        letterSpacing: "2px",
      }}>
        {sayfaNo}
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

      {/* Sayfa içeriği */}
      <div
        style={{
          direction: "rtl",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-start",
          alignItems: "baseline",
          columnGap: "4px",
          rowGap: "0px",
        }}
      >
        {elemanlar.map((el, idx) => {
          if (el.tip === "sure-baslik") {
            return (
              <div
                key={`baslik-${el.sure.id}`}
                style={{ width: "100%", marginBottom: "8px" }}
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
                style={{ width: "100%", marginBottom: "8px" }}
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
                yaziBoyutu={yaziBoyutu}
                onTikla={(kelime, e) =>
                  onKelimeTikla?.(kelime, el.sure, el.ayet, e)
                }
              />
            )
          }

          if (el.tip === "ayet-sonu") {
            const arapcaSayi = arapcaRakamla(el.ayet.no)
            const boyut = yaziBoyutu * 0.75
            
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
                  opacity: 0.9,
                  verticalAlign: "middle",
                  transform: "translateY(-1px)",
                }}
                title={`${el.sure.isim} · ${el.ayet.no}. Âyet`}
              >
                {/* ── SVG Ayet Gülü ── */}
                <svg
                  width={boyut * 1.4}
                  height={boyut * 1.4}
                  viewBox="0 0 40 40"
                  style={{
                    display: "block",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Ana daire */}
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill={theme.accent}
                    fillOpacity="0.08"
                    stroke={theme.accent}
                    strokeWidth="1.2"
                    strokeOpacity="0.4"
                  />
                  
                  {/* İç içe daireler */}
                  <circle
                    cx="20"
                    cy="20"
                    r="12"
                    fill="none"
                    stroke={theme.accent}
                    strokeWidth="0.6"
                    strokeOpacity="0.2"
                  />
                  
                  {/* Işınlar - 8 kollu yıldız */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                    const rad = (deg * Math.PI) / 180
                    const r1 = 14
                    const r2 = 17
                    const x1 = 20 + Math.cos(rad) * r1
                    const y1 = 20 + Math.sin(rad) * r1
                    const x2 = 20 + Math.cos(rad) * r2
                    const y2 = 20 + Math.sin(rad) * r2
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={theme.accent}
                        strokeWidth="0.8"
                        strokeOpacity="0.3"
                      />
                    )
                  })}
                  
                  {/* Ana yıldız - 8 köşeli */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                    const rad = (deg * Math.PI) / 180
                    const r = i % 2 === 0 ? 11 : 7
                    const x = 20 + Math.cos(rad) * r
                    const y = 20 + Math.sin(rad) * r
                    if (i % 2 === 0) {
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="1.2"
                          fill={theme.accent}
                          fillOpacity="0.3"
                        />
                      )
                    }
                    return null
                  })}
                  
                  {/* Noktalar - 12 küçük inci */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const deg = i * 30 + 15
                    const rad = (deg * Math.PI) / 180
                    const r = 15
                    const x = 20 + Math.cos(rad) * r
                    const y = 20 + Math.sin(rad) * r
                    return (
                      <circle
                        key={`dot-${i}`}
                        cx={x}
                        cy={y}
                        r="0.8"
                        fill={theme.accent}
                        fillOpacity="0.25"
                      />
                    )
                  })}
                  
                  {/* Ayet numarası */}
                  <text
                    x="20"
                    y="22"
                    textAnchor="middle"
                    fontFamily="'Scheherazade New', serif"
                    fontSize="12"
                    fontWeight="500"
                    fill={theme.accent}
                    fillOpacity="0.8"
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

      {/* Sayfa alt çizgisi */}
      <div style={{
        marginTop: "20px",
        height: "1px",
        background: `${theme.border}`,
        opacity: 0.4,
      }} />
    </div>
  )
}