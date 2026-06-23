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
 *
 * Kullanım:
 *   <MushafSayfa
 *     sayfaNo={1}
 *     elemanlar={[...]}     ← buildSayfaElemanlari() çıktısı
 *     sureler={[...]}       ← tüm sure listesi (besmele için ayetSayisi lazım)
 *     theme={theme}
 *     arapcaFont="..."
 *     yaziBoyutu={20}
 *     player={player}
 *     aktifAyet={{ sureNo, ayetNo }}
 *     onKelimeTikla={(kelime, sure, ayet, e) => ...}
 *     onAyetTikla={(sure, ayetNo, e) => ...}
 *     onSureTikla={(sure, e) => ...}
 *   />
 *
 * elemanlar dizisi şu tipleri içerir:
 *   { tip: "sure-baslik", sure }
 *   { tip: "besmele", sure }
 *   { tip: "kelime", sure, ayet, kelime }
 *   { tip: "ayet-sonu", sure, ayet }
 */
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
  // Bu sayfadaki secde ayetlerini topla (tekrarsız)
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
      {/* Sayfa numarası — üst orta */}
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
            // O ayetin sure bilgisini bul
            const sure = sureler.find(s => s.id === ayet.sureNo)
            if (sure) onAyetTikla?.(sure, ayet.ayetNo, null)
          }}
        />
      )}

      {/* Sayfa içeriği — kelimeler serbest akar */}
      <div
        style={{
          direction: "rtl",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
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
            return (
              <span
                key={`ayet-sonu-${el.sure.id}-${el.ayet.no}`}
                onClick={(e) => onAyetTikla?.(el.sure, el.ayet.no, e)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Scheherazade New', serif",
                  fontSize: `${yaziBoyutu * 0.85}px`,
                  color: theme.accent,
                  cursor: "pointer",
                  padding: "0 2px",
                  lineHeight: 2.2,
                  userSelect: "none",
                  opacity: 0.8,
                }}
                title={`${el.sure.isim} · ${el.ayet.no}. Âyet`}
              >
                ‎﴿{el.ayet.no}﴾
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
