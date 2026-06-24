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
  player,
  aktifAyet,
  onKelimeTikla,
  onAyetTikla,
  onSureTikla,
}) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const fontSize = isMobile ? yaziBoyutu : yaziBoyutu + 2
  const lineHeight = isMobile ? 2.6 : 2.4

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
  // Kural: sure-baslik ve besmele kendi bloğunda
  // Aralarındaki TÜM kelime+ayet-sonu elemanları TEK bir inline gruba girer
  // Böylece ayetler birbirinin devamında akar, satır CSS'e bırakılır
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
      // kelime ve ayet-sonu — hepsi aynı inline gruba
      mevcutInlineElemanlar.push(el)
    }
  })
  inlineGrupKapat()
  
  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      width: "100%",
      border: "2px solid red",
      margin: "0 auto",
      padding: isMobile ? "2px 12px" : "4px 32px",
      boxSizing: "border-box",
    }}>

      {/* Sayfa numarası */}
      <div style={{
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        marginBottom: isMobile ? 4 : 6,
        paddingTop: isMobile ? 2 : 4,
      }}>
        <div style={{ flex: 1, height: "0.5px", background: `${theme.accent}30` }} />
        <span style={{
          fontFamily: "'Scheherazade New', serif",
          fontSize: isMobile ? "9px" : "11px",
          color: theme.accent,
          opacity: 0.5,
          padding: "0 8px",
          letterSpacing: "2px",
        }}>
          {sayfaNo}
        </span>
        <div style={{ flex: 1, height: "0.5px", background: `${theme.accent}30` }} />
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
              marginTop: gi > 0 ? (isMobile ? 8 : 16) : 0,
              marginBottom: isMobile ? 4 : 8,
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
              marginBottom: isMobile ? 4 : 8,
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
                paddingTop: `${fontSize * 0.55}px`,
                marginBottom: isMobile ? 4 : 8,
                // Kelimeler arası boşluk — wordSpacing RTL'de çalışır
                wordSpacing: isMobile ? "3px" : "4px",
                // Satır kırılmasını engelleyen hiçbir şey olmamalı
                whiteSpace: "normal",
                overflowWrap: "break-word",
              }}
            >
              {grup.elemanlar.map((el) => {

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
                      onTikla={(kelime, e) => onKelimeTikla?.(kelime, el.sure, el.ayet, e)}
                    />
                  )
                }

                if (el.tip === "ayet-sonu") {
                  const arapcaSayi = arapcaRakamla(el.ayet.no)
                  const boyut = fontSize * 0.72

                  return (
                    <span
                      key={`ayet-sonu-${el.sure.id}-${el.ayet.no}`}
                      onClick={(e) => onAyetTikla?.(el.sure, el.ayet.no, e)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        margin: `0 ${isMobile ? 2 : 3}px`,
                        userSelect: "none",
                        verticalAlign: "middle",
                      }}
                      title={`${el.sure.isim} · ${el.ayet.no}. Âyet`}
                    >
                      <svg
                        width={boyut * 1.4}
                        height={boyut * 1.4}
                        viewBox="0 0 40 40"
                        style={{ display: "block" }}
                      >
                        <circle cx="20" cy="20" r="16"
                          fill={theme.accent} fillOpacity="0.06"
                          stroke={theme.accent} strokeWidth="1" strokeOpacity="0.35"
                        />
                        <circle cx="20" cy="20" r="12"
                          fill="none" stroke={theme.accent} strokeWidth="0.5" strokeOpacity="0.15"
                        />
                        {[0,45,90,135,180,225,270,315].map((deg, i) => {
                          const rad = deg * Math.PI / 180
                          return (
                            <line key={i}
                              x1={20 + Math.cos(rad)*14} y1={20 + Math.sin(rad)*14}
                              x2={20 + Math.cos(rad)*17} y2={20 + Math.sin(rad)*17}
                              stroke={theme.accent} strokeWidth="0.6" strokeOpacity="0.25"
                            />
                          )
                        })}
                        <text x="20" y="22"
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
          )
        }

        return null
      })}

      {/* Sayfa alt çizgisi — daha belirgin */}
      <div style={{
        marginTop: isMobile ? 8 : 16,
        height: "1px",
        background: `linear-gradient(to right, transparent, ${theme.accent}50, transparent)`,
        width: "100%",
      }} />
    </div>
  )
}