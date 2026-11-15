/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — TEMA PANELİ: RENKLİ HAREKE + KELİME / KALIP RENKLENDİR (Kur'ân-ı Kerîm)
   src/components/HarekeRenkAyarlari.jsx

   15 Kasım 2026 — kullanıcı: "tema ayarlarına alt kısma renkli hareke seçeneği koyalım …
   Özel hareke … tüm harekeleri ayrı ayrı renklendirebilsin … Ek olarak kelime/kalıp
   renklendir kısmı ekleyelim, buton sonrasında kelime seçilsin ve tüm mushaf içinde o
   kelime ile eşleşen kısımlar seçilen renkte boyansın."
   Ayarlar: data/harekeRenk.js · çizim: data/harekeFont.js (yazı tipi kopyaları).
   Renk seçimi uygulama içi pencereyle (RenkSeciciPencere) — tarayıcınınki ekrandan taşıyordu.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useRef, useState } from "react"
import { RotateCcw, Pointer, X, Loader2 } from "lucide-react"
import IosSwitch from "./IosSwitch"
import RenkSeciciPencere from "./RenkSeciciPencere"
import { HAREKE_GRUPLARI, useHarekeFont, harekeFontKimligi } from "../data/harekeFont"
import {
  useRenkliHareke, renkliHarekeYaz, harekeRenkleri, harekeZitRengi,
  useKelimeRenkleri, kelimeRengiSil, kelimeRengiDegis,
} from "../data/harekeRenk"

const ESLESMELER = [
  { id: "tam", ad: "Aynı kelime", alt: "harekesi farklı olsa da" },
  { id: "harekeli", ad: "Harekesiyle", alt: "birebir aynı yazılış" },
  { id: "iceren", ad: "İçinde geçen", alt: "kalıp: harfleri içeren" },
]
export const KELIME_RENK_ESLESME_ANAHTAR = "vukuf-kelime-renk-yeni"

// Yuvarlak renk beneği → uygulama içi renk penceresi
function RenkBenegi({ renk, theme, baslik, onSec, boy = 26 }) {
  const ref = useRef(null)
  const [acik, setAcik] = useState(false)
  return (
    <>
      <button ref={ref} onClick={() => setAcik(true)} title={baslik} aria-label={baslik}
        style={{
          width: `${boy}px`, height: `${boy}px`, borderRadius: "50%", flexShrink: 0, padding: 0, cursor: "pointer",
          background: renk, border: `2px solid ${theme.surface}`, boxShadow: `0 0 0 1px ${theme.border}`,
        }} />
      <RenkSeciciPencere acik={acik} capa={ref.current} deger={renk} theme={theme} baslik={baslik}
        onSec={onSec} onKapat={() => setAcik(false)} />
    </>
  )
}

function Satir({ etiket, alt, acik, onDegis, theme }) {
  return (
    <div role="switch" aria-checked={acik} onClick={onDegis}
      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", cursor: "pointer" }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "12.5px", color: theme.text, fontWeight: 600 }}>{etiket}</span>
        {alt && <span style={{ display: "block", fontSize: "10.5px", color: theme.textSecondary, lineHeight: 1.35 }}>{alt}</span>}
      </span>
      <IosSwitch acik={acik} theme={theme} boyut={0.72} />
    </div>
  )
}

/**
 * arapcaStyle: Arapça yazı tipinin font-family yazısı · onKelimeSec(eslesme, renk): kelime seçme kipini aç
 */
export default function HarekeRenkAyarlari({ theme, arapcaStyle, onKelimeSec }) {
  const ayar = useRenkliHareke()
  const fontId = harekeFontKimligi(arapcaStyle)
  const font = useHarekeFont(fontId, ayar.acik && !!fontId)
  const { ortak, gruplar } = harekeRenkleri(ayar, theme)
  const zit = harekeZitRengi(theme)
  const kurallar = useKelimeRenkleri()
  const [eslesme, setEslesmeD] = useState(() => { try { return localStorage.getItem(KELIME_RENK_ESLESME_ANAHTAR) || "tam" } catch { return "tam" } })
  const setEslesme = (v) => { setEslesmeD(v); try { localStorage.setItem(KELIME_RENK_ESLESME_ANAHTAR, v) } catch { /* yoksay */ } }
  const [yeniRenk, setYeniRenk] = useState(() => theme.lugatHighlight || "#c0392b")
  const baslik = { fontSize: "11px", color: theme.textSecondary, marginBottom: "6px", letterSpacing: "1px" }

  return (
    <>
      {/* ── RENKLİ HAREKE ─────────────────────────────────────────── */}
      <div className="yp-renk" style={{ borderTop: `1px solid ${theme.border}`, marginTop: "10px", paddingTop: "10px" }}>
        <div style={baslik}>RENKLİ HAREKE</div>
        <Satir theme={theme} etiket="Harekeleri renklendir" acik={ayar.acik}
          alt={!fontId ? "Bu yazı tipinde kullanılamıyor" : "Üstün, esre, ötre, cezm, şedde, tenvin ve uzatma işaretleri"}
          onDegis={() => fontId && renkliHarekeYaz({ acik: !ayar.acik })} />
        {ayar.acik && fontId && (
          <>
            {font?.durum === "yukleniyor" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: theme.textSecondary, padding: "2px 0 6px" }}>
                <Loader2 size={12} className="vk-don" /> Hazırlanıyor…
              </div>
            )}
            {font?.durum === "yok" && (
              <div style={{ fontSize: "11px", color: "#c0392b", padding: "2px 0 6px", lineHeight: 1.4 }}>
                Bu yazı tipi için renkli hareke hazırlanamadı.
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
              <RenkBenegi renk={ortak} theme={theme} baslik="Hareke rengi" onSec={(r) => renkliHarekeYaz({ renk: r })} />
              <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text }}>
                Hareke rengi
                {!ayar.renk && <span style={{ display: "block", fontSize: "10.5px", color: theme.textSecondary }}>Temanın zıt rengi</span>}
              </span>
              {ayar.renk && ayar.renk !== zit && (
                <button onClick={() => renkliHarekeYaz({ renk: null })} title="Temanın zıt rengine dön"
                  style={{ fontSize: "11px", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>Sıfırla</button>
              )}
            </div>
            <Satir theme={theme} etiket="Özel hareke" acik={ayar.ozel}
              alt="Her hareke ayrı renkte; başta hepsi yukarıdaki renkte"
              onDegis={() => renkliHarekeYaz({ ozel: !ayar.ozel })} />
            {ayar.ozel && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "2px 0 4px" }}>
                {HAREKE_GRUPLARI.map(g => (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <RenkBenegi renk={gruplar[g.id]} theme={theme} baslik={g.ad} boy={22}
                      onSec={(r) => renkliHarekeYaz({ renkler: { ...ayar.renkler, [g.id]: r } })} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text }}>{g.ad}</span>
                    {ayar.renkler[g.id] && (
                      <button onClick={() => { const r = { ...ayar.renkler }; delete r[g.id]; renkliHarekeYaz({ renkler: r }) }}
                        title="Ortak renge dön" aria-label={`${g.ad} — ortak renge dön`}
                        style={{ display: "flex", padding: "3px", background: "none", border: "none", cursor: "pointer", color: theme.textSecondary }}>
                        <RotateCcw size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── KELİME / KALIP RENKLENDİR ─────────────────────────────── */}
      <div className="yp-renk" style={{ borderTop: `1px solid ${theme.border}`, marginTop: "10px", paddingTop: "10px" }}>
        <div style={baslik}>KELİME / KALIP RENKLENDİR</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
          {ESLESMELER.map(e => {
            const sec = eslesme === e.id
            return (
              <button key={e.id} onClick={() => setEslesme(e.id)} aria-pressed={sec} title={e.alt}
                style={{
                  padding: "4px 9px", borderRadius: "999px", fontSize: "11px", fontFamily: "inherit", cursor: "pointer",
                  border: `1px solid ${sec ? theme.accent : theme.border}`, background: sec ? theme.accent : "transparent",
                  color: sec ? "#fff" : theme.text,
                }}>{e.ad}</button>
            )
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <RenkBenegi renk={yeniRenk} theme={theme} baslik="Kelime rengi" onSec={setYeniRenk} />
          <button onClick={() => onKelimeSec?.(eslesme, yeniRenk)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "7px 10px", borderRadius: "9px", border: "none", cursor: "pointer", fontFamily: "inherit",
              background: theme.accent, color: "#fff", fontSize: "12.5px", fontWeight: 600,
            }}>
            <Pointer size={14} /> Kelime / kalıp seç
          </button>
        </div>
        <div style={{ fontSize: "10.5px", color: theme.textSecondary, lineHeight: 1.4, margin: "6px 2px 0" }}>
          {ESLESMELER.find(e => e.id === eslesme)?.alt} — seçilen kelimeyle eşleşen her yer bütün mushafta bu renkte görünür. Birden çok kelimeye sırayla dokunulup onaylanırsa kalıp, arka arkaya geçtiği yerlerde boyanır.
        </div>
        {kurallar.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
            {kurallar.map(k => (
              <div key={k.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                <RenkBenegi renk={k.renk} theme={theme} baslik="Kelime rengi" boy={22} onSec={(r) => kelimeRengiDegis(k.id, { renk: r })} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: "6px", overflow: "hidden" }}>
                  <span style={{ fontFamily: arapcaStyle, fontSize: "17px", color: k.renk, direction: "rtl", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{k.metin}</span>
                  <span style={{ fontSize: "10px", color: theme.textSecondary, whiteSpace: "nowrap" }}>{k.parcalar ? "Kalıp · " : ""}{ESLESMELER.find(e => e.id === k.eslesme)?.ad}</span>
                </span>
                <button onClick={() => kelimeRengiSil(k.id)} title="Kaldır" aria-label="Renklendirmeyi kaldır"
                  style={{ display: "flex", padding: "3px", background: "none", border: "none", cursor: "pointer", color: theme.textSecondary }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
