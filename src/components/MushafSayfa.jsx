import MushafKelime from "./MushafKelime"
import MushafAyetRozeti from "./MushafAyetRozeti"
import KitapAyraci from "./KitapAyraci"
import SecdeKenar from "./SecdeKenar"
import SureBasligi from "./SureBasligi"
import Besmele from "./Besmele"
import SureSonu from "./SureSonu"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import { useRef, useEffect, memo } from "react"

function arapcaRakamla(sayi) {
  const rakamlar = '٠١٢٣٤٥٦٧٨٩'
  return String(sayi).split('').map(d => rakamlar[parseInt(d)] || d).join('')
}

function MushafSayfa({
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
  onKayitTikla,
  sayfaKayitlari = [],
  onYukseklikOlcum,
  kayitKonumModu = false,
  odakAyet = null,
  odakSure = null,
  odakAyrac = null,
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
    if (el.tip === "sure-baslik" || el.tip === "besmele" || el.tip === "sure-sonu") {
      inlineGrupKapat()
      gruplar.push({ tip: "block", eleman: el })
    } else {
      mevcutInlineElemanlar.push(el)
    }
  })
  inlineGrupKapat()

  const sayfaRef = useRef(null)
  const sonYukRef = useRef(0)

  // Yükseklik ölçümünü yalnız GERÇEKTEN değişince bildir (her render'da değil).
  useEffect(() => {
    if (sayfaRef.current && onYukseklikOlcum) {
      const h = sayfaRef.current.offsetHeight
      if (Math.abs(h - sonYukRef.current) > 0.5) {
        sonYukRef.current = h
        onYukseklikOlcum(sayfaNo, h)
      }
    }
  })

  return (
    <div ref={sayfaRef} style={{
      position: "relative",
      width: "100%",
      margin: "0 auto",
      padding: isMobile ? "2px 12px" : "2px 32px",
      boxSizing: "border-box",
    }}>
      {sayfaKayitlari.map((kayit) => (
        <div
          key={kayit.id}
          style={{
            position: "absolute",
            top: `${(kayit.scrollY || 0) * 100}%`,   // ref yüksekliğine göre %
            right: "4px",
            zIndex: 50,
            pointerEvents: "auto",
            transform: "translateY(-50%)",
          }}
        >
          <KitapAyraci
            kayit={kayit}
            theme={theme}
            onTikla={() => onKayitTikla?.(kayit)}
            vurgulu={odakAyrac === kayit.id}
          />
        </div>
      ))}
      {/* Sayfa numarası */}
      <div style={{
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        marginBottom: isMobile ? 1 : 2,
        paddingTop: isMobile ? 1 : 2,
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
                player={player}
                vurgulu={odakSure?.id === grup.eleman.sure.id}
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

        // BLOCK: sure-sonu
        if (grup.tip === "block" && grup.eleman.tip === "sure-sonu") {
          return (
            <div key={`sure-sonu-${grup.eleman.sure.id}-${gi}`} style={{
              width: "100%",
              marginTop: fontSize * 0.15,
              marginBottom: fontSize * 0.15,
              clear: "both",
            }}>
              <SureSonu
                theme={theme}
                sure={grup.eleman.sure}
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
                paddingBottom: arapcaFont.toLowerCase().includes('me_quran')
                  ? `${fontSize * 0.1}px`
                  : `${fontSize * 0.1}px`,
                marginBottom: fontSize * (isMobile ? 0.15 : 0.2), // ÇOK AZALTILDI (20'den 0.15'e)
                wordSpacing: "normal",
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
                    aktifAyet?.ayetNo === el.ayet.no &&
                    !aktifAyet?.besmeleIcin

                  return (
                    <MushafKelime
                      key={el.kelime.id}
                      data-sure={el.sure.id}
                      data-ayet={el.ayet.no}
                      kelime={el.kelime}
                      position={el.position || (index + 1)}
                      aktif={aktif}
                      theme={theme}
                      arapcaFont={arapcaFont}
                      yaziBoyutu={fontSize}
                      lineHeight={lineHeight}
                      harfAraligi={harfAraligi}
                      kayitKonumModu={kayitKonumModu}
                      onTikla={(kelime, e) => {
                        if (kayitKonumModu) return
                        onKelimeTikla?.(kelime, el.sure, el.ayet, e)
                      }}
                    />
                  )
                }

                if (el.tip === "ayet-sonu") {
                  return (
                    <span
                      key={`ayet-sonu-${el.sure.id}-${el.ayet.no}`}
                      data-sure={el.sure.id}      // EKLENDİ
                      data-ayet={el.ayet.no}      // EKLENDİ
                      onClick={(e) => {
                        if (kayitKonumModu) return
                        onAyetTikla?.(el.sure, el.ayet.no, e)
                      }}
                      style={{
                        display: "inline-block",
                        WebkitTapHighlightColor: kayitKonumModu ? "transparent" : undefined,
                        cursor: kayitKonumModu ? "crosshair" : "pointer",
                        margin: `0 ${isMobile ? 1 : 2}px`,
                        userSelect: "none",
                        verticalAlign: "middle",
                        lineHeight: lineHeight,
                      }}
                      title={`${el.sure.isim} · ${el.ayet.no}. Âyet`}
                    >
                      <MushafAyetRozeti
                        sayi={el.ayet.no}
                        size={fontSize * 1.4}
                        ac={theme.ayetNoRengi || theme.accent}
                        aktif={odakAyet?.sureNo === el.sure.id && odakAyet?.ayetNo === el.ayet.no}
                      />
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

// ── PERFORMANS: Sayfayı yalnız KENDİ içeriği değişince yeniden çiz.
// Üst bileşen (KuranOkuma) her kaydırma/ses tick'inde yeniden render olunca, memo olmadan
// görünen TÜM sayfalar yeniden çiziliyordu → "yazı geç yükleniyor" jank'ı. Aşağıdaki
// karşılaştırma, fonksiyon prop'larının kimliğini (her render'da değişir) YOK SAYAR; vurgu/
// odak/oynatma değişimlerinde ise yalnız İLGİLİ sayfayı (o sûreyi içeren) yeniden çizer.
function sayfadaSureVar(elemanlar, sureNo) {
  return sureNo != null && (elemanlar || []).some(e => e.sure && e.sure.id === sureNo)
}

function mushafSayfaEsit(a, b) {
  if (
    a.sayfaNo !== b.sayfaNo ||
    a.elemanlar !== b.elemanlar ||
    a.sureler !== b.sureler ||
    a.theme !== b.theme ||
    a.arapcaFont !== b.arapcaFont ||
    a.yaziBoyutu !== b.yaziBoyutu ||
    a.satirAraligi !== b.satirAraligi ||
    a.harfAraligi !== b.harfAraligi ||
    a.kayitKonumModu !== b.kayitKonumModu
  ) return false

  // sayfaKayitlari her render'da YENİ dizi (filter) → referansla değil DEĞERLE karşılaştır
  const kayitImza = (arr) => (arr || []).map(k => `${k.id}:${k.scrollY || 0}:${k.baslik || ""}`).join("|")
  if (kayitImza(a.sayfaKayitlari) !== kayitImza(b.sayfaKayitlari)) return false

  // Okunan âyet vurgusu + oynatma durumu → yalnız ilgili sûreyi içeren sayfa
  const aK = a.aktifAyet ? `${a.aktifAyet.sureNo}:${a.aktifAyet.ayetNo}:${a.aktifAyet.besmeleIcin || 0}` : ""
  const bK = b.aktifAyet ? `${b.aktifAyet.sureNo}:${b.aktifAyet.ayetNo}:${b.aktifAyet.besmeleIcin || 0}` : ""
  const durumDegisti = (a.player && a.player.durum) !== (b.player && b.player.durum)
  if (aK !== bK || durumDegisti) {
    if (sayfadaSureVar(b.elemanlar, a.aktifAyet && a.aktifAyet.sureNo) ||
        sayfadaSureVar(b.elemanlar, b.aktifAyet && b.aktifAyet.sureNo)) return false
  }

  // Odak âyet (ok ile gidilen) → ilgili sayfa
  const oaA = a.odakAyet ? `${a.odakAyet.sureNo}:${a.odakAyet.ayetNo}` : ""
  const oaB = b.odakAyet ? `${b.odakAyet.sureNo}:${b.odakAyet.ayetNo}` : ""
  if (oaA !== oaB) {
    if (sayfadaSureVar(b.elemanlar, a.odakAyet && a.odakAyet.sureNo) ||
        sayfadaSureVar(b.elemanlar, b.odakAyet && b.odakAyet.sureNo)) return false
  }

  // Odak sûre (menüden gidilen sûre başlığı vurgusu) → ilgili sayfa
  const osA = a.odakSure ? `${a.odakSure.id}:${a.odakSure.nonce || 0}` : ""
  const osB = b.odakSure ? `${b.odakSure.id}:${b.odakSure.nonce || 0}` : ""
  if (osA !== osB) {
    if (sayfadaSureVar(b.elemanlar, a.odakSure && a.odakSure.id) ||
        sayfadaSureVar(b.elemanlar, b.odakSure && b.odakSure.id)) return false
  }

  // Kayıt ayracı vurgusu → yalnız o ayracı içeren sayfa
  if (a.odakAyrac !== b.odakAyrac) {
    const kayitlar = b.sayfaKayitlari || []
    if (kayitlar.some(k => k.id === a.odakAyrac || k.id === b.odakAyrac)) return false
  }

  return true  // fonksiyon prop'ları ve player kimliği yok sayılır → gereksiz render yok
}

export default memo(MushafSayfa, mushafSayfaEsit)
