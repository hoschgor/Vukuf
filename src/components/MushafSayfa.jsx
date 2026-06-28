import MushafKelime from "./MushafKelime"
import SecdeKenar from "./SecdeKenar"
import SureBasligi from "./SureBasligi"
import Besmele from "./Besmele"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

function arapcaRakamla(sayi) {
  const rakamlar = '٠١٢٣٤٥٦٧٨٩'
  return String(sayi).split('').map(d => rakamlar[parseInt(d)] || d).join('')
}

export default function MushafSayfa({
  sayfaNo,
  elemanlar = [],
  sureler = [],
  theme,
  arapcaFont,
  yaziBoyutu = 20,
  satirAraligi, 
  harfAraligi,
  player,
  aktifAyet,
  onKelimeTikla,
  onAyetTikla,
  onSureTikla,
}) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const fontSize = isMobile ? yaziBoyutu : yaziBoyutu + 2
  const lineHeight = satirAraligi || (isMobile ? 2.2 : 2.0) // Azaltıldı

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

  // ── Elemanları grupla
  const gruplar = []
  let mevcutInlineElemanlar = []

  const inlineGrupKapat = () => {
    if (mevcutInlineElemanlar.length > 0) {
      gruplar.push({ tip: "inline", elemanlar: [...mevcutInlineElemanlar] })
      mevcutInlineElemanlar = []
    }
  }

  elemanlar.forEach((el) => {
    if (el.tip === "sure-baslik" || el.tip === "besmele") {
      inlineGrupKapat()
      gruplar.push({ tip: "block", eleman: el })
    } else {
      mevcutInlineElemanlar.push(el)
    }
  })
  inlineGrupKapat()
  
  return (
    <div style={{
      position: "relative",
      width: "100%",
      margin: "0 auto",
      padding: isMobile ? "2px 12px" : "2px 32px",
      boxSizing: "border-box",
    }}>

      {/* Sayfa numarası */}
      <div style={{
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        marginBottom: isMobile ? 1 : 2,
        paddingTop: isMobile ? 1 : 2, // Azaltıldı
      }}>
        <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${theme.accent}40, transparent)` }} />
        <span style={{
          fontFamily: "'Scheherazade New', serif",
          fontSize: isMobile ? "8px" : "10px", // Azaltıldı
          color: theme.accent,
          opacity: 0.4,
          padding: "0 6px",
          letterSpacing: "1px",
        }}>
          {sayfaNo}
        </span>
        <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${theme.accent}40, transparent)` }} />
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

      {/* Gruplar */}
      {gruplar.map((grup, gi) => {

        // BLOCK: sure başlığı
        if (grup.tip === "block" && grup.eleman.tip === "sure-baslik") {
          return (
            <div key={`baslik-${grup.eleman.sure.id}-${gi}`} style={{
              width: "100%",
              marginTop: gi > 0 ? fontSize * 0.3 : 0, // Azaltıldı
              marginBottom: fontSize * 0.15, // Azaltıldı
              clear: "both",
            }}>
              <SureBasligi
                sure={grup.eleman.sure}
                theme={theme}
                yaziBoyutu={fontSize}
                onTikla={(e) => onSureTikla?.(grup.eleman.sure, e)}
              />
            </div>
          )
        }

        // BLOCK: besmele
        if (grup.tip === "block" && grup.eleman.tip === "besmele") {
          const sureDetay = sureler.find(s => s.id === grup.eleman.sure.id)
          return (
            <div key={`besmele-${grup.eleman.sure.id}-${gi}`} style={{
              width: "100%",
              marginBottom: fontSize * 0.15, // Azaltıldı
              clear: "both",
            }}>
              <Besmele
                theme={theme}
                sureId={grup.eleman.sure.id}
                sureNo={grup.eleman.sure.id}
                ayetSayisi={sureDetay?.ayetSayisi}
                player={player}
                yaziBoyutu={fontSize}
              />
            </div>
          )
        }

        // INLINE: tüm kelimeler ve ayet sonları tek akışta
        if (grup.tip === "inline") {
          return (
            <div
              key={`inline-${gi}`}
              style={{
                direction: "rtl",
                textAlign: "center",
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                fontFamily: arapcaFont,
                color: theme.text,
                paddingTop: `${fontSize * 0.15}px`, // Azaltıldı
                paddingBottom: `${fontSize * 0.1}px`, // Azaltıldı
                marginBottom: fontSize * (isMobile ? 0.15 : 0.2), // ÇOK AZALTILDI (20'den 0.15'e)
                wordSpacing: isMobile ? "2px" : "3px",
                whiteSpace: "normal",
                overflowWrap: "break-word",
                display: "block",
                width: "100%",
              }}
            >
              {grup.elemanlar.map((el, index) => {
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
                      lineHeight={lineHeight}
                      harfAraligi={harfAraligi}
                      onTikla={(kelime, e) => onKelimeTikla?.(kelime, el.sure, el.ayet, e)}
                    />
                  )
                }

                if (el.tip === "ayet-sonu") {
                  const arapcaSayi = arapcaRakamla(el.ayet.no)
                  const boyut = fontSize * 0.65 // Azaltıldı

                  return (
                    <span
                      key={`ayet-sonu-${el.sure.id}-${el.ayet.no}`}
                      onClick={(e) => onAyetTikla?.(el.sure, el.ayet.no, e)}
                      style={{
                        display: "inline-block",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        margin: `0 ${isMobile ? 1 : 2}px`,
                        userSelect: "none",
                        verticalAlign: "middle",
                        lineHeight: lineHeight,
                      }}
                      title={`${el.sure.isim} · ${el.ayet.no}. Âyet`}
                    >
                      <svg
                        width={boyut * 1.3}
                        height={boyut * 1.3}
                        viewBox="0 0 40 40"
                        style={{
                          display: "inline-block",
                          verticalAlign: "middle",
                        }}
                      >
                        <circle cx="20" cy="20" r="16"
                          fill={theme.accent} fillOpacity="0.04"
                          stroke={theme.accent} strokeWidth="0.8" strokeOpacity="0.25"
                        />
                        <circle cx="20" cy="20" r="12"
                          fill="none" stroke={theme.accent} strokeWidth="0.4" strokeOpacity="0.1"
                        />
                        {[0,45,90,135,180,225,270,315].map((deg, i) => {
                          const rad = deg * Math.PI / 180
                          return (
                            <line key={i}
                              x1={20 + Math.cos(rad)*14} y1={20 + Math.sin(rad)*14}
                              x2={20 + Math.cos(rad)*17} y2={20 + Math.sin(rad)*17}
                              stroke={theme.accent} strokeWidth="0.4" strokeOpacity="0.15"
                            />
                          )
                        })}
                        <text x="20" y="22"
                          textAnchor="middle"
                          fontFamily="'Scheherazade New', serif"
                          fontSize={isMobile ? "8" : "10"} // Azaltıldı
                          fontWeight="500"
                          fill={theme.accent} fillOpacity="0.6"
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
          )
        }

        return null
      })}

      {/* Sayfa alt çizgisi */}
      <div style={{
        marginTop: isMobile ? 2 : 4, // Azaltıldı
        height: "0px",
        background: `linear-gradient(to right, transparent, ${theme.accent}60, transparent)`,
        width: "100%",
      }} />
    </div>
  )
}