import { Sun, Moon, Pencil, Check } from "lucide-react"
import { useApp, temaTonu } from "../AppContext"
import { themes } from "../styles/themes"

/* ═══════════════════════════════════════════════════════════════════════════
   TEMA SEÇİCİ (28 Eylül 2026) — üç yerde AYNI bileşen
     • Navbar → AYARLAR → Tema         (duzen="kart": canlı önizleme kartları)
     • OkumaEkrani → tema paneli        (duzen="satir": dar panel, küçük önizleme)
     • KuranOkuma → tema paneli         (duzen="satir")
   Eskiden üç dosyada ayrı ayrı elle yazılmış tema listesi vardı ve renkleri
   themes.js'ten kopmuştu (ör. Kahve hâlâ eski #251b04 noktasıyla görünüyordu).
   Artık her örnek DOĞRUDAN themes.js'teki değerlerle çiziliyor.

   Üstte ton anahtarı: Aydınlık · Karanlık · Otomatik (mantık AppContext'te).
   Altta yalnız seçili tonun temaları; Otomatik'te iki grup ayrı başlıkla —
   her tonun favorisi ayrı işaretli, cihazın şu anki tonu "şu an" etiketli.
   ═══════════════════════════════════════════════════════════════════════════ */

// Sıra ve açıklamalar themes.js'ten (tek kaynak): yeni tema eklemek için
// yalnız oraya bir nesne yazmak yeter, seçici kendiliğinden gösterir.
const TEMALAR = Object.entries(themes).map(([id, t]) => ({ id, aciklama: t.aciklama || "" }))

const TON_ADI = { acik: "Aydınlık", koyu: "Karanlık" }

// "Otomatik" simgesi: yarısı dolu daire. lucide'ın SunMoon'u sürüme göre
// bulunmayabildiği için satır içi çiziliyor (bağımlılıksız).
function OtoSimge({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </svg>
  )
}

// dar=true (240 px okuma paneli): simge üstte, ad altta — yan yana "Aydınlık"
// sığmıyor ve "Aydı…" diye kesiliyordu.
function TonAnahtari({ theme, tonModu, tonSec, dar }) {
  const secenekler = [
    { id: "acik", ad: "Aydınlık", Simge: Sun },
    { id: "koyu", ad: "Karanlık", Simge: Moon },
    { id: "oto",  ad: "Otomatik", Simge: OtoSimge },
  ]
  return (
    <div role="radiogroup" aria-label="Tema tonu" style={{
      display: "flex", gap: "3px", padding: "3px", borderRadius: "11px",
      background: theme.background, border: `1px solid ${theme.border}`,
    }}>
      {secenekler.map(({ id, ad, Simge }) => {
        const sec = tonModu === id
        return (
          <button
            key={id}
            role="radio"
            aria-checked={sec}
            onClick={() => tonSec(id)}
            style={{
              flex: 1, minWidth: 0,
              display: "flex", flexDirection: dar ? "column" : "row",
              alignItems: "center", justifyContent: "center", gap: dar ? "2px" : "5px",
              padding: dar ? "5px 2px" : "7px 4px", borderRadius: "8px",
              fontSize: dar ? "10.5px" : "12px", fontWeight: sec ? 600 : 400, fontFamily: "inherit",
              color: sec ? theme.accent : theme.textSecondary,
              background: sec ? theme.surface : "transparent",
              // Açık temada surface = background olabiliyor → seçili hâl kenarla da belli olsun
              border: `1px solid ${sec ? `${theme.accent}55` : "transparent"}`,
              boxShadow: sec ? "0 1px 3px rgba(0,0,0,0.16)" : "none",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            <Simge size={dar ? 15 : 14} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{ad}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Büyük önizleme kartı (Ayarlar) ───────────────────────────────────────
   Kart temanın KENDİ renkleriyle çizilir: zemin, Arapça satır (yazı rengi),
   âyet süsü halkası (âyet no rengi), meal yerine İÇERİKSİZ çizgiler (ikincil
   yazı rengi) ve vurgu çubuğu. Meal metni bilerek yazılmıyor — örnek diye
   uydurma meal koymayalım. Alt şerit temanın yüzey (surface) rengi. */
function TemaKarti({ id, t, secili, suAn, ozel, onClick, theme }) {
  return (
    <button
      onClick={onClick}
      title={t.name}
      style={{
        display: "flex", flexDirection: "column", padding: 0, overflow: "hidden",
        borderRadius: "12px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
        background: t.background,
        border: `1px solid ${t.border}`,
        outline: secili ? `2px solid ${theme.accent}` : "none",
        outlineOffset: "2px",
        minWidth: 0, boxSizing: "border-box",
      }}
    >
      <div style={{ padding: "9px 10px 8px", width: "100%", boxSizing: "border-box" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px",
          direction: "rtl",
        }}>
          <span style={{
            fontFamily: "'Scheherazade New', serif", fontSize: "18px", lineHeight: 1.35,
            color: t.text, whiteSpace: "nowrap",
          }}>بِسْمِ اللّٰهِ</span>
          <span aria-hidden="true" style={{
            width: "11px", height: "11px", borderRadius: "50%", flexShrink: 0,
            border: `1.5px solid ${t.ayetNoRengi || t.accent}`,
          }} />
        </div>
        <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ height: "4px", width: "94%", borderRadius: "2px", background: t.textSecondary, opacity: 0.45 }} />
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ height: "4px", width: "58%", borderRadius: "2px", background: t.textSecondary, opacity: 0.45 }} />
            <div style={{ height: "4px", width: "18px", borderRadius: "2px", background: t.accent }} />
          </div>
        </div>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: "6px", width: "100%", boxSizing: "border-box",
        padding: "6px 10px", background: t.surface, borderTop: `1px solid ${t.border}`,
      }}>
        <span style={{
          flex: 1, minWidth: 0, fontSize: "12.5px", fontWeight: 600, color: t.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{ozel ? "Özel" : t.name}</span>
        {suAn && (
          <span style={{ fontSize: "9.5px", color: t.accent, letterSpacing: "0.3px", flexShrink: 0 }}>şu an</span>
        )}
        {ozel
          ? <Pencil size={12} color={t.textSecondary} style={{ flexShrink: 0 }} />
          : secili && <Check size={13} color={t.accent} strokeWidth={3} style={{ flexShrink: 0 }} />}
      </div>
    </button>
  )
}

/* ── Dar panel satırı (okuma ekranları) ───────────────────────────────────
   Soldaki küçük sayfa aynı fikrin minyatürü: zemin, yazı çizgisi, ikincil
   çizgi, vurgu noktası. */
function TemaSatiri({ t, aciklama, secili, suAn, ozel, onClick, theme, kalemBoyu }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "10px",
        padding: "7px 8px", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit",
        color: secili ? theme.accent : theme.text,
        background: secili ? `${theme.accent}15` : "transparent",
        border: "none", cursor: "pointer", marginBottom: "2px",
      }}
    >
      <div aria-hidden="true" style={{
        width: "40px", height: "30px", borderRadius: "6px", flexShrink: 0,
        background: t.background, border: `1.5px solid ${secili ? theme.accent : t.border}`,
        padding: "6px 6px 0", display: "flex", flexDirection: "column", gap: "3px",
        boxSizing: "border-box",
      }}>
        <div style={{ height: "3px", width: "100%", borderRadius: "2px", background: t.text, opacity: 0.85 }} />
        <div style={{ height: "3px", width: "70%", borderRadius: "2px", background: t.textSecondary, opacity: 0.55 }} />
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <div style={{ height: "3px", width: "40%", borderRadius: "2px", background: t.textSecondary, opacity: 0.55 }} />
          <div style={{ height: "3px", width: "8px", borderRadius: "2px", background: t.accent }} />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ozel ? "Özel" : t.name}
          {suAn && <span style={{ fontSize: "9.5px", color: theme.accent, marginLeft: "6px" }}>şu an</span>}
        </div>
        <div style={{ fontSize: "10px", color: theme.textSecondary }}>{aciklama}</div>
      </div>
      {ozel
        ? <Pencil size={kalemBoyu || 12} color={theme.textSecondary} />
        : secili && <span style={{ fontSize: "10px", color: theme.accent }}>✓</span>}
    </button>
  )
}

/**
 * @param theme    görünen (uygulanmış) tema — panelin kendi renkleri için
 * @param duzen    "kart" (Ayarlar) | "satir" (dar okuma paneli)
 * @param sutun    kart düzeninde sütun sayısı
 * @param onOzel   Özel'e dokunulunca (düzenleme panelini açar)
 * @param onSec    (id, uygulandiMi) — hazır temaya dokunulunca, seçimden SONRA
 * @param kalemBoyu satir düzeninde Özel kalem simgesinin boyu (okuma barı ölçeği)
 */
export default function TemaSecici({ theme, duzen = "kart", sutun = 2, onOzel, onSec, kalemBoyu }) {
  const {
    currentTheme, setCurrentTheme, customTheme,
    tonModu, tonSec, tonFavori, sistemTonu,
  } = useApp()

  const oto = tonModu === "oto"
  const gruplar = oto ? ["acik", "koyu"] : [tonModu]
  const ozelTon = temaTonu(customTheme)

  function ogeler(ton) {
    const liste = TEMALAR
      .filter(x => themes[x.id] && temaTonu(themes[x.id]) === ton)
      .map(x => ({ ...x, t: themes[x.id] }))
    // Özel: Otomatik'te yalnız kendi tonunun grubunda (iki kez görünmesin);
    // elle seçilmiş tonda her zaman sonda — oluşturma/düzenleme kapısı kaybolmasın.
    if (!oto || ozelTon === ton) {
      liste.push({ id: "custom", aciklama: "Kişisel renk ayarları", t: customTheme, ozel: true })
    }
    return liste
  }

  function sec(id) {
    if (id === "custom") { onOzel && onOzel(); return }
    const uygulandi = !oto || temaTonu(themes[id]) === sistemTonu
    setCurrentTheme(id)
    onSec && onSec(id, uygulandi)
  }

  const seciliMi = (id, ton) => (oto ? tonFavori[ton] === id : currentTheme === id)

  return (
    <div>
      <TonAnahtari theme={theme} tonModu={tonModu} tonSec={tonSec} dar={duzen === "satir"} />

      {oto && (
        <div style={{ fontSize: "11px", color: theme.textSecondary, margin: "7px 2px 0", lineHeight: 1.4 }}>
          Cihazın ayarına uyar — şu an <b style={{ color: theme.text, fontWeight: 600 }}>{TON_ADI[sistemTonu]}</b>.
          Her ton için bir tema seç.
        </div>
      )}

      {gruplar.map(ton => (
        <div key={ton} style={{ marginTop: "10px" }}>
          {oto && (
            <div style={{
              fontSize: "10.5px", letterSpacing: "1px", color: theme.textSecondary,
              margin: "0 2px 6px", display: "flex", alignItems: "center", gap: "6px",
            }}>
              {ton === "acik" ? <Sun size={11} /> : <Moon size={11} />}
              {ton === "acik" ? "AYDINLIKTA" : "KARANLIKTA"}
              {ton === sistemTonu && <span style={{ color: theme.accent, letterSpacing: 0 }}>· şu an</span>}
            </div>
          )}

          {duzen === "kart" ? (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${sutun}, minmax(0, 1fr))`, gap: "8px" }}>
              {ogeler(ton).map(x => (
                <TemaKarti
                  key={x.id} id={x.id} t={x.t} ozel={x.ozel} theme={theme}
                  secili={seciliMi(x.id, ton)}
                  suAn={oto && currentTheme === x.id}
                  onClick={() => sec(x.id)}
                />
              ))}
            </div>
          ) : (
            <div>
              {ogeler(ton).map(x => (
                <TemaSatiri
                  key={x.id} t={x.t} aciklama={x.aciklama} ozel={x.ozel} theme={theme}
                  secili={seciliMi(x.id, ton)}
                  suAn={oto && currentTheme === x.id}
                  kalemBoyu={kalemBoyu}
                  onClick={() => sec(x.id)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
