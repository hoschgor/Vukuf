// RENKLİ TECVİD — Mücevher ("İşaretler ve Tecvid") panelindeki ayrı bölüm.
// Ana anahtar BAŞTA KAPALI. Her kuralın kendi anahtarı ve örneği var; örnekler Diyanet
// mushafının KENDİ metninden alındı (âyet numarasıyla) ve aynı kural motoruyla boyanıyor —
// yani panelde görülen renk, sayfada görülenin birebir aynısı.
import { useMemo } from "react"
import { TECVID_KURALLARI, ayetTecvid, kumele } from "../data/tecvid"
import { useTecvidAyar, tecvidAcikYaz, tecvidKuralYaz, tecvidVarsayilanaDon } from "../data/tecvidAyar"

// Örnekler kuran-mushaf.json'dan birebir alındı (kaynak âyet yanında).
// Not: örnek tek başına çözümlendiği için son kelimesi "âyet sonu" sayılır; seçilen
// örneklerde bu, gösterilen kuralı değiştirmiyor (doğrulandı).
const ORNEKLER = {
  ihfa:         { ref: "2:25",  metin: ["مِنْ", "تَحْتِهَا"] },
  idgamGunne:   { ref: "2:5",   metin: ["هُدًى", "مِنْ"] },
  idgamBila:    { ref: "2:5",   metin: ["مِنْ", "رَبِّهِمْ"] },
  iklab:        { ref: "2:18",  metin: ["صُمٌّ", "بُكْمٌ"] },
  gunne:        { ref: "2:20",  metin: ["اِنَّ"] },
  kalkale:      { ref: "113:1", metin: ["قُلْ", "اَعُوذُ", "بِرَبِّ", "الْفَلَقِ"] },   // âyet sonundaki vakıf işareti örnekte gösterilmiyor
  idgamDiger:   { ref: "2:256", metin: ["قَدْ", "تَبَيَّنَ"] },
  lamSemsi:     { ref: "1:1",   metin: ["الرَّحْمٰنِ"] },
  meddLazim:    { ref: "1:7",   metin: ["الضَّٓالّٖينَ"] },
  meddMuttasil: { ref: "2:19",  metin: ["السَّمَٓاءِ"] },
  meddMunfasil: { ref: "2:4",   metin: ["بِمَٓا", "اُنْزِلَ"] },
  meddAriz:     { ref: "1:1",   metin: ["الرَّحٖيمِ"] },
  meddTabii:    { ref: "2:2",   metin: ["ذٰلِكَ"] },
  okunmayan:    { ref: "2:10",  metin: ["بِمَا", "كَانُوا"] },
}

function Anahtar({ acik, onDegis, theme, etiket, kucuk = false }) {
  const w = kucuk ? 30 : 38, h = kucuk ? 17 : 21, d = h - 4
  return (
    <button
      type="button"
      role="switch"
      aria-checked={acik}
      aria-label={etiket}
      onClick={(e) => { e.stopPropagation(); onDegis(!acik) }}
      style={{
        flexShrink: 0, width: w, height: h, borderRadius: h, padding: 0,
        border: `1px solid ${acik ? theme.accent : theme.border}`,
        background: acik ? theme.accent : "transparent",
        position: "relative", cursor: "pointer", transition: "background 0.15s",
      }}
    >
      <span style={{
        position: "absolute", top: 1, left: acik ? w - d - 3 : 1,
        width: d, height: d, borderRadius: "50%",
        background: acik ? "#fff" : theme.textSecondary,
        transition: "left 0.15s",
      }} />
    </button>
  )
}

function Ornek({ id, renk, theme, arapcaFont, isMobile }) {
  const o = ORNEKLER[id]
  const parcalar = useMemo(() => {
    if (!o) return null
    const r = ayetTecvid(o.metin)
    return o.metin.map((w, wi) => kumele(w).map((k, ci) => ({ t: k.h + k.m, boyali: r[wi][ci] === id })))
  }, [o, id])
  if (!parcalar) return null
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap", marginTop: "3px" }}>
      <span dir="rtl" style={{ fontFamily: arapcaFont, fontSize: isMobile ? "19px" : "21px", lineHeight: 1.7, color: theme.text }}>
        {parcalar.map((kel, wi) => (
          <span key={wi}>
            {wi > 0 && " "}
            {kel.map((p, pi) => p.boyali ? <span key={pi} style={{ color: renk }}>{p.t}</span> : p.t)}
          </span>
        ))}
      </span>
      <span style={{ fontSize: "10px", color: theme.textSecondary, opacity: 0.8 }}>{o.ref}</span>
    </span>
  )
}

export default function RenkliTecvidBolumu({ theme, isMobile, arapcaFont }) {
  const ayar = useTecvidAyar()
  const acik = ayar.acik
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{
        fontSize: isMobile ? "10px" : "11px", letterSpacing: "1px",
        textTransform: "uppercase", color: theme.textSecondary,
        opacity: 0.75, marginBottom: "7px",
      }}>Renkli Tecvid</div>

      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "9px 10px", borderRadius: "10px",
        background: `${theme.accent}12`, border: `1px solid ${theme.accent}33`,
      }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", color: theme.text, fontSize: isMobile ? "12.5px" : "13.5px", fontWeight: 600 }}>
            Harfleri kurallarına göre renklendir
          </span>
          <span style={{ display: "block", color: theme.textSecondary, fontSize: isMobile ? "11px" : "12px", lineHeight: 1.4 }}>
            Kurallar, bu mushafın (Diyanet imlâsı) metninden çıkarılır. Renkler okumaya yardım içindir; aşağıdan tek tek açılıp kapatılabilir.
          </span>
        </span>
        <Anahtar acik={acik} onDegis={tecvidAcikYaz} theme={theme} etiket="Renkli tecvid" />
      </div>

      <div style={{ opacity: acik ? 1 : 0.55, transition: "opacity 0.15s", marginTop: "6px" }}>
        {TECVID_KURALLARI.map(k => {
          const kAcik = !!ayar.kurallar[k.id]
          return (
            <div key={k.id} style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: "7px 0", borderBottom: `1px solid ${theme.border}22`,
            }}>
              <span style={{
                width: "12px", height: "12px", borderRadius: "3px", flexShrink: 0, marginTop: "3px",
                background: k.renk, opacity: kAcik ? 1 : 0.35,
              }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", color: theme.text, fontSize: isMobile ? "12px" : "13px", fontWeight: 600 }}>{k.ad}</span>
                <span style={{ display: "block", color: theme.textSecondary, fontSize: isMobile ? "11px" : "12px", lineHeight: 1.4 }}>{k.aciklama}</span>
                <Ornek id={k.id} renk={k.renk} theme={theme} arapcaFont={arapcaFont} isMobile={isMobile} />
              </span>
              <span style={{ marginTop: "2px" }}>
                <Anahtar kucuk acik={kAcik} onDegis={(v) => tecvidKuralYaz(k.id, v)} theme={theme} etiket={k.ad} />
              </span>
            </div>
          )
        })}
        <div style={{ textAlign: "end", marginTop: "6px" }}>
          <button type="button" onClick={tecvidVarsayilanaDon} style={{
            background: "transparent", border: "none", padding: "4px 2px",
            color: theme.textSecondary, fontSize: isMobile ? "11px" : "12px",
            textDecoration: "underline", cursor: "pointer",
          }}>Kural seçimini ilk hâline döndür</button>
        </div>
      </div>
    </div>
  )
}
