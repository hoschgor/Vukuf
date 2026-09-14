import { useState, useRef } from "react"
import { Play, Pause, X, Link2, Type, Brackets } from "lucide-react"
import kelimeMapping from "../data/kelime-mapping.json"
import { tecvidAyikla, ozelOkuyusAyikla } from "./MushafKelime"

// Bizim kelime id'miz → quran.com kelime sırası.
// NEDEN GEREKLİ: kelime sesleri (WBW mp3) quran.com'un kelime numaralarına göre
// dosyalanmış. Bizim bölünmemiz bazı yerlerde farklı (ör. Bakara 40'ta bizde
// "يَا" + "بَنٖي" iki kelime, onlarda tek), dolayısıyla BİZİM sıramızla dosya
// istemek o âyette yanlış kelimeyi çaldırır. Eşleme varsa ondan okunur.
function eslenenSira(kelimeId) {
  if (!kelimeId) return null
  const eslenen = kelimeMapping[kelimeId]
  if (!eslenen) return null
  const p = String(eslenen).split(":")
  const n = parseInt(p[2], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

const WBW_BASE = "https://audio.qurancdn.com/wbw"

function kelimeMp3(sureNo, ayetNo, position) {
  const pos = position && position > 0 ? position : 1
  const s = String(sureNo).padStart(3, "0")
  const a = String(ayetNo).padStart(3, "0")
  const k = String(pos).padStart(3, "0")
  return `${WBW_BASE}/${s}_${a}_${k}.mp3`
}

// Baloncuktaki Arapça yazı boyutu. Tecvid simgelerinin konumu buna oranlıdır
// (mushaf sayfasındaki formülün aynısı), bu yüzden tek yerde tutuluyor.
const ARAPCA_BOYUT = 26

export default function KelimePopup({
  kelime, konum, player, sureNo, ayetNo, theme, onKapat,
  // MUSHAFTA SEÇİLİ FONTUN AYNISI. Eskiden burada "'KFGQPC Uthmanic Script HAFS'"
  // yazılıydı — projede BÖYLE BİR AİLE YÜKLENMİYOR (yüklenen ad 'KFGQPC Uthmanic').
  // Yani baloncuk sessizce jenerik `serif`e düşüyordu; onarılmış fontun bütün
  // kazanımları (uni0656 alt-elif konturu, Osmanlı işaretleri) baloncukta yoktu:
  // aşağı uzatmalar bozuk, işaretler noktalı-daire ◌ olarak çiziliyordu.
  arapcaFont = "'KFGQPC Uthmanic', serif",
  // SARF — kelime-sarf.json kaydı: { tur, kip, cati, sahis, cins, sayi, etiket, zamir }
  // Kaynak Quranic Arabic Corpus morfolojisi; yazılıştan ÇIKARILMIYOR, etiketli
  // kaynaktan bağlanıyor (تَقُولُ hem "o (kadın) der" hem "sen dersin" olabilir —
  // tahminle ayrılamaz). Yoksa satır hiç çizilmez.
  sarf = null,
}) {
  const [kelimeCaliyor, setKelimeCaliyor] = useState(false)
  const kelimeAudioRef = useRef(null)

  if (!kelime) return null

  // ── BİRLEŞİK KELİME ─────────────────────────────────────────────
  // quran.com'un TEK kelime saydığı yeri biz iki kelimeye bölmüşsek (176 grup),
  // baloncuk bunları tek birim gösterir: Arapça zaten birleşik geliyor (kelime.ham),
  // burada bir de kaç parçadan oluştuğu söylenir ve SES doğru sıradan çalınır.
  const uyeler = Array.isArray(kelime.grupUyeleri) ? kelime.grupUyeleri : null
  const birlesik = !!(uyeler && uyeler.length > 1)
  // Ses sırası: önce eşleme tablosu (doğrusu bu), yoksa gelen konum.
  const sesSirasi =
    eslenenSira(kelime.id) ||
    (birlesik ? eslenenSira(uyeler[0]) : null) ||
    kelime.position ||
    null

  // ── TECVİD / KIRAAT İŞARETLERİ ──────────────────────────────────
  // Mushaf sayfasıyla AYNI işlev (MushafKelime'den geliyor): işaret metinden
  // çıkarılır, kuralı belirten küçük renkli simge overlay olarak çizilir.
  // Çıkarılmazsa fontlar bu kodları bozuk ◌ (noktalı daire) glifine düşürüyor —
  // baloncukta görülen "minik yuvarlak" tam olarak buydu.
  const { metin: tecvidsiz, tecvidler } = tecvidAyikla({
    id: kelime.id,
    arabic: kelime.ham,
  })
  // ── ÖZEL OKUYUŞ (kasr / medd / nûn-i sağîre) ────────────────────
  // U+08D1 ve U+08D2'nin Unicode glifi GERÇEKTEN daire (LARGE CIRCLE BELOW).
  // Yani font bozuk çizmiyor; baloncukta görünen yuvarlak buydu. Sayfadaki gibi
  // metinden çıkarılıp yerine قصر / مد / ن etiketi çiziliyor. Ayırma işlevi
  // MushafKelime'de, tablolarla aynı yerde — üç ayrı kopya tutulmuyor.
  const { metin: arapcaMetin, ozeller } = ozelOkuyusAyikla(tecvidsiz)
  // Etiketler alta yazılıyor; kutunun alt dolgusu ona göre büyür.
  const altEtiketVar = ozeller.length > 0

  const ayetCaliniyor =
    player?.durum === "caliyor" &&
    player?.aktifAyet?.sureNo === sureNo &&
    player?.aktifAyet?.ayetNo === ayetNo

  const ayetDuraklatildi =
    player?.durum === "duraklatildi" &&
    player?.aktifAyet?.sureNo === sureNo &&
    player?.aktifAyet?.ayetNo === ayetNo

  function kelimeTikla() {
    if (!sesSirasi) return

    if (kelimeCaliyor) {
      kelimeAudioRef.current?.pause()
      setKelimeCaliyor(false)
      return
    }

    // Ana player'ı duraklat
    if (player?.durum === "caliyor") player.duraklat()

    const audio = new Audio(kelimeMp3(sureNo, ayetNo, sesSirasi))
    kelimeAudioRef.current = audio
    setKelimeCaliyor(true)

    audio.play().catch(() => setKelimeCaliyor(false))
    audio.addEventListener("ended", () => setKelimeCaliyor(false))
    audio.addEventListener("error", () => setKelimeCaliyor(false))
  }

  function ayetTikla() {
    if (!player) return
    if (ayetCaliniyor) {
      player.duraklat()
    } else if (ayetDuraklatildi) {
      player.devamEt()
    } else {
      // Kelime sesini durdur
      if (kelimeAudioRef.current) {
        kelimeAudioRef.current.pause()
        setKelimeCaliyor(false)
      }
      player.ayetCal(sureNo, ayetNo)
    }
  }

  const butonStil = (aktif) => ({
    display: "flex", alignItems: "center", gap: "5px",
    padding: "5px 10px", borderRadius: "20px", cursor: "pointer",
    border: `1px solid ${theme.accent}40`,
    background: aktif ? theme.accent : `${theme.accent}18`,
    color: aktif ? "#fff" : theme.accent,
    fontSize: "11px", fontWeight: "500",
    transition: "all 0.15s",
  })

  const anlamlar = kelime.anlamlar?.length ? kelime.anlamlar : null

  // Çekim etiketi YALNIZ fiillerde ve YALNIZ tam çıkarılmışsa gösterilir.
  // (Fiil olup şahıs bilgisi olmayan kayıtlarda `etiket` üretilmiyor —
  // yarım bilgi göstermektense hiç göstermemek evlâ.)
  const sarfEtiket = sarf?.tur === "fiil" && sarf?.etiket ? sarf.etiket : null

  return (
    <>
      {/* Backdrop */}
      <div onClick={onKapat} style={{ position: "fixed", inset: 0, zIndex: 299 }} />

      {/* Popup */}
      <div style={{
        position: "fixed",
        left: konum.x,
        top: konum.y,
        zIndex: 300,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "14px 16px",
        maxWidth: "260px",
        minWidth: "180px",
        maxHeight: "35vh",
        overflowY: "auto",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      }}>

        {/* ── Üst: Arapça + okunuş + kapat ─────────────────────────────
            Okunuş Arapçanın ALTINA, aynı blokta duruyor: ayrı bir satır gibi
            değil, başlığın parçası gibi okunsun diye. */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "8px", gap: "8px",
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {/* Arapça kutusu — tecvid simgeleri buna göre konumlanır.
                ALT DOLGU ŞART: alt-elif (U+0656), kasr/med halkaları (U+08D1/08D2)
                ve bazı harflerin kuyruğu taban çizgisinin ALTINA taşıyor. Baloncuk
                `overflowY:auto` olduğu için dolgu olmadan bunlar kırpılıyordu —
                mushaf sayfasındaki aşağı-uzatma düzeltmesinin baloncuktaki karşılığı. */}
            <div style={{
              position: "relative",
              display: "inline-block",
              paddingTop: `${ARAPCA_BOYUT * 0.30}px`,
              paddingBottom: `${ARAPCA_BOYUT * (altEtiketVar ? 0.72 : 0.34)}px`,
              lineHeight: 1,
            }}>
              <span style={{
                fontFamily: arapcaFont,
                fontSize: `${ARAPCA_BOYUT}px`,
                color: theme.accent,
                direction: "rtl",
                lineHeight: 1.05,
                display: "inline-block",
                whiteSpace: "nowrap",
              }}>
                {arapcaMetin}
              </span>

              {/* Tecvid simgeleri — mushaf sayfasındaki konum formülünün aynısı:
                  kutunun DİKEY MERKEZİNE göre, ait olduğu harfin hizasında. */}
              {tecvidler.map((t, ti) => (
                <span
                  key={`tv-${ti}`}
                  title={t.ad}
                  style={{
                    position: "absolute",
                    left: `${t.sol ?? 50}%`,
                    top: "50%",
                    transform: `translate(-50%, -50%) translateY(${t.yer === "ust" ? "-" : ""}${ARAPCA_BOYUT * (t.yer === "ust" ? 0.66 : 0.56)}px)`,
                    fontSize: `${ARAPCA_BOYUT * 0.34}px`,
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

              {/* Özel okuyuş etiketleri — kelimenin ALTINDA, ait olduğu harfin
                  hizasında. Sayfadaki ile aynı renk ve aynı kısaltmalar. */}
              {ozeller.map((oz, oi) => (
                <span
                  key={`oz-${oi}`}
                  title={oz.ad}
                  style={{
                    position: "absolute",
                    left: `${oz.sol ?? 50}%`,
                    bottom: `${ARAPCA_BOYUT * 0.06}px`,
                    transform: "translateX(-50%)",
                    fontSize: `${ARAPCA_BOYUT * 0.42}px`,
                    lineHeight: 1,
                    color: oz.renk,
                    fontFamily: "'Scheherazade New', serif",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    zIndex: 3,
                  }}
                >
                  {oz.sembol}
                </span>
              ))}
            </div>

            {/* Okunuş — Arapçanın hemen altında, soluk ve küçük: bilgi olarak var
                ama gözü anlamdan çalmıyor. Sözlükte okunuş yoksa satır hiç çizilmez. */}
            {kelime.okunus && (
              <div style={{
                fontSize: "11.5px",
                color: theme.textSecondary,
                fontStyle: "italic",
                letterSpacing: "0.2px",
                lineHeight: 1.3,
                marginTop: "1px",
                wordBreak: "break-word",
              }}>
                {kelime.okunus}
              </div>
            )}
          </div>

          <button onClick={onKapat} style={{
            background: "none", border: "none",
            cursor: "pointer", color: theme.textSecondary,
            display: "flex", padding: "2px", flexShrink: 0,
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Rozetler: birleşik kelime + fiil çekimi. Aynı satırda, sarabilir. */}
        {(birlesik || sarfEtiket || kelime.obek) && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px",
          }}>
            {/* Birleşik kelime — iki kelime tek anlam taşıyor, okuyucu da bunları
                tek birim sayar; kullanıcı "aynı anlam iki kez çıktı" sanmasın. */}
            {birlesik && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                fontSize: "10px", color: theme.accent,
                background: `${theme.accent}14`,
                border: `1px solid ${theme.accent}30`,
                borderRadius: "999px", padding: "2px 7px",
              }}>
                <Link2 size={10} />
                {uyeler.length} kelime birlikte
              </span>
            )}

            {/* ÖBEK ANLAMI — komşu kelimeyle PAYLAŞILAN anlam.
                quran.com öbeğin karşılığını öbeğin ilk kelimesine yazıyor
                (`فِي` → «yeryüzünde»); bu yüzden aynı anlam komşu kelimede de
                görünüyor. Anlamı değiştirmek yerine (ölçüldü: aynı edat başka
                yerde bambaşka işlevde) durumu AÇIKLIYORUZ. */}
            {kelime.obek && (
              <span
                title={`Bu anlam ${kelime.obek.uyeSayisi} kelimenin tamamına ait: ${kelime.obek.ar}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  fontSize: "10px", color: theme.textSecondary,
                  background: `${theme.textSecondary}12`,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "999px", padding: "2px 7px",
                }}
              >
                <Brackets size={10} />
                {kelime.obek.uyeSayisi} kelimelik öbeğin anlamı
              </span>
            )}

            {/* FİİL ÇEKİMİ — "De ki" ile "Dediler ki"yi, eril ile dişili ayırt
                ettiren satır. Vurgu renginde DEĞİL, soluk: asıl iş anlamda,
                bu yardımcı bilgi. */}
            {sarfEtiket && (
              <span
                title="Fiil çekimi (şahıs · sayı · cins · kip)"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  fontSize: "10px", color: theme.textSecondary,
                  background: `${theme.textSecondary}12`,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "999px", padding: "2px 7px",
                }}
              >
                <Type size={10} />
                {sarfEtiket}
              </span>
            )}
          </div>
        )}

        {/* Anlamlar — madde işareti olarak "1." yerine içi dolu sağ ok.
            Satır başı hizalı kalsın diye her madde flex satırı; ok sabit
            genişlikte, metin sarınca ok hizasının altına kaymaz. */}
        <div style={{
          fontSize: "13px", color: theme.text,
          lineHeight: "1.7", marginBottom: "12px",
        }}>
          {anlamlar
            ? anlamlar.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "7px" }}>
                  {/* Ok METİN GLİFİ DEĞİL, SVG. Sebebi ölçüldü: ▸ / ▶ gibi glifler
                      fonttan fonta hem boyut hem taban çizgisi bakımından çok
                      değişiyor; ok ya küçük kalıyor ya satırın ortasına oturmuyordu.
                      SVG'de boyut kesin, dikey ortalama da kutuyu ilk satırın
                      yüksekliğine (1.7em) sabitleyip içinde ortalayarak yapılıyor. */}
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      width: "10px",
                      height: "1.7em",          // ilk satırın kutu yüksekliği
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      userSelect: "none",
                    }}
                  >
                    <svg width="10" height="12" viewBox="0 0 10 12">
                      <polygon points="0,0 10,6 0,12" fill={theme.accent} />
                    </svg>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>{a}</span>
                </div>
              ))
            : <span style={{ color: theme.textSecondary, fontSize: "12px" }}>
                Anlam bulunamadı
              </span>
          }
        </div>

        {/* Alt: ses butonları */}
        <div style={{
          borderTop: `1px solid ${theme.border}`,
          paddingTop: "10px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "8px",
        }}>
          {/* Kelime sesi */}
          <button onClick={kelimeTikla} style={butonStil(kelimeCaliyor)}
            title={kelimeCaliyor ? "Durdur" : "Kelimeyi dinle"}>
            {kelimeCaliyor ? <Pause size={10} /> : <Play size={10} />}
            Kelime
          </button>

          {/* Ayet sesi */}
          <button onClick={ayetTikla} style={butonStil(ayetCaliniyor)}
            title={ayetCaliniyor ? "Duraklat" : "Âyeti dinle"}>
            {ayetCaliniyor ? <Pause size={10} /> : <Play size={10} />}
            Âyet
          </button>
        </div>
      </div>
    </>
  )
}
