import { useEffect, useState } from "react"
import { Sun, Moon, Pencil } from "lucide-react"
import { useApp, temaTonu } from "../AppContext"
import { themes } from "../styles/themes"

/* ═══════════════════════════════════════════════════════════════════════════
   TEMA SEÇİCİ — CAMİ + MİHRAP + TEZHİP ROZETLERİ (28 Eylül 2026)
   Üç yerde AYNI bileşen:
     • Navbar → AYARLAR → Tema         (duzen="kart")
     • OkumaEkrani → tema paneli        (duzen="satir": dar, 240 px panel)
     • KuranOkuma → tema paneli         (duzen="satir")

   Kullanıcı kararı: "çoğu uygulama bu kartları kullanıyor, bize özgü olmalı".
   Beş taslaktan ikisi seçildi ve birleştirildi:
     ÜSTTE  CAMİ silüeti, ortasında MİHRAP — CANLI ÖNİZLEME — seçili temanın kendi
            renkleriyle besmele, âyet halkası, meal yerine içeriksiz çizgiler
            (uydurma meal yok), lügat rengi, ad kartuşta. Renkler geçişli değişir.
     ALTTA  her tema sekiz yapraklı bir TEZHİP ROZETİ: dış yapraklar zemin,
            iç yapraklar yüzey, çizgiler vurgu, göbek âyet no rengi. Seçili
            rozetin çevresinde yavaş dönen kesikli halka (hareket azaltma
            tercihinde durur).

   Ton anahtarı: Aydınlık · Karanlık · Otomatik (mantık AppContext'te).
   Otomatik'te iki rozet grubu; her tonun favorisi halkalı. Öbür tonun bir
   rozetine dokunulunca önizleme onu gösterir ve "… uygulanacak" notu çıkar.
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


// Rozet halkasının dönüşü ve dokunma geri bildirimi — bir kez eklenir.
const STIL = `
@keyframes vukufRozetDon { to { transform: rotate(360deg) } }
.vukuf-rozet-halka { transform-origin: 32px 32px; animation: vukufRozetDon 26s linear infinite }
.vukuf-rozet-dugme svg.vukuf-rozet { transition: transform .15s ease }
.vukuf-rozet-dugme:active svg.vukuf-rozet { transform: scale(.93) }
@media (prefers-reduced-motion: reduce) { .vukuf-rozet-halka { animation: none } }
`

const GECIS = "fill .35s ease, stroke .35s ease"

/* ── CAMİ ÖNİZLEME ───────────────────────────────────────────────────────
   Kullanıcı: "mihrap çok geniş oldu, üst kısmı camiye benzetip orta kısma
   mihrap çiz; çiçekleri bölüm içlerine al". viewBox 300×262, genişliğe göre
   ölçeklenir. Parçalar ve renkleri (hepsi seçili temadan):
     kubbe · yan kubbeler · kasnak pencereleri · iki kalem minare  → yüzey + vurgu
     cephe (gövde)                                                → yüzey / kenarlık
     kitabe (tema adı)                                            → zemin + vurgu çerçeve
     ORTADA MİHRAP nişi                                           → ZEMİN — içinde besmele,
       âyet halkası, meal yerine içeriksiz çizgiler (uydurma meal yok), lügat parçası
     ROZETLER: ana kubbede, iki yan kanatta ve mihrap köşeliklerinde — seçicideki
       çiçeğin aynısı (RozetSekli), temanın kendi renkleriyle
   Boyamalar `style` ile: tema değişince renkler CSS geçişiyle döner. */
function RozetSekli({ cx, cy, r, t }) {
  const k = r / 32
  const dis = [], ic = []
  for (let i = 0; i < 8; i++) {
    dis.push(<ellipse key={"d" + i} cx="32" cy="13" rx="7.5" ry="12" transform={`rotate(${i * 45} 32 32)`}
      style={{ fill: t.background, stroke: t.border, strokeWidth: 1.2, transition: GECIS }} />)
    ic.push(<ellipse key={"i" + i} cx="32" cy="17.5" rx="4" ry="7" transform={`rotate(${i * 45 + 22.5} 32 32)`}
      style={{ fill: t.surface, stroke: t.accent, strokeWidth: 1.1, transition: GECIS }} />)
  }
  return (
    <g transform={`translate(${cx - r} ${cy - r}) scale(${k})`}>
      {dis}{ic}
      <circle cx="32" cy="32" r="10" style={{ fill: t.background, stroke: t.accent, strokeWidth: 1.6, transition: GECIS }} />
      <circle cx="32" cy="32" r="4" style={{ fill: t.ayetNoRengi, transition: GECIS }} />
    </g>
  )
}

/* Yatık hilal (alem): ağzı SAĞ ÜSTE bakan, 45° eğik. Yerel koordinatta ağız
   +x yönünde: dış çember (0,0) R, iç çember (0.45R,0) 0.82R; iki büyük yay
   kesişim noktalarında birleşiyor. OTURUŞ (kullanıcı örnekleriyle): hilal
   direğin TAM ÜSTÜNDE ORTALI — dış çemberin EN ALT noktası direk ucuna
   (ux,uy) değiyor; o nokta hilalin dolu sırtında kaldığı için (boynuzlar
   ağız yönünden ±54°, alt nokta ağızdan 135° uzakta) direk gövdeye girer. */
function hilalYolu(ux, uy, R, aci = -45) {
  const d = 0.45 * R, r2 = 0.82 * R
  const kx = (R * R - r2 * r2 + d * d) / (2 * d)
  const ky = Math.sqrt(Math.max(0, R * R - kx * kx))
  const cx = ux, cy = uy - R * 0.96   // hafif gömülü: direk ile hilal arasında boşluk kalmasın
  return {
    d: `M${kx} ${-ky} A${R} ${R} 0 1 0 ${kx} ${ky} A${r2} ${r2} 0 1 1 ${kx} ${-ky} Z`,
    transform: `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${aci})`,
  }
}

function CamiOnizleme({ t, ad }) {
  const f = (fill, stroke, sw, ek) => ({ fill, stroke, strokeWidth: sw, transition: GECIS, ...ek })
  const yuzey = f(t.surface, t.border, 1.2)
  const hat = f(t.surface, t.accent, 1.1)
  const minare = (x) => (
    <g>
      {/* gövde, iki şerefe, külah, alem */}
      <rect x={x - 6} y="46" width="12" height="206" style={yuzey} />
      <rect x={x - 9} y="84" width="18" height="4" rx="1" style={hat} />
      <rect x={x - 9} y="128" width="18" height="4" rx="1" style={hat} />
      <path d={`M${x - 6} 46 L${x} 12 L${x + 6} 46 Z`} style={f(t.accent, t.accent, 1, { fillOpacity: 0.85 })} />
      <line x1={x} y1="12" x2={x} y2="6" style={f("none", t.accent, 1.1)} />
      {/* yatık hilal */}
      <path {...hilalYolu(x, 6.4, 3.1)} style={f(t.accent, "none", 0)} />
    </g>
  )
  const pencere = (x, y, g, h) => (
    <path d={`M${x} ${y + h} L${x} ${y + g / 2} Q${x} ${y}, ${x + g / 2} ${y - 2} Q${x + g} ${y}, ${x + g} ${y + g / 2} L${x + g} ${y + h} Z`}
      style={f(t.background, t.accent, 0.9)} />
  )
  return (
    <svg viewBox="0 -2 300 262" width="100%" role="img" aria-label={`${ad} önizlemesi`}
      style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 4px 10px rgba(0,0,0,.12))" }}>
      {minare(24)}
      {minare(276)}

      {/* yan kubbeler + ana kubbe (kasnağıyla) + alem */}
      <path d="M50 112 A30 24 0 0 1 110 112 Z" style={hat} />
      <path d="M190 112 A30 24 0 0 1 250 112 Z" style={hat} />
      <rect x="98" y="88" width="104" height="24" style={yuzey} />
      {[108, 128, 162, 182].map(x => <g key={x}>{pencere(x, 94, 10, 14)}</g>)}
      <path d="M94 90 A56 50 0 0 1 206 90 Z" style={hat} />
      {/* kubbe alemi: direk + iki top + yatık hilal */}
      <line x1="150" y1="40" x2="150" y2="21" style={f("none", t.accent, 1.4)} />
      <circle cx="150" cy="32" r="2.8" style={f(t.accent, "none", 0)} />
      <circle cx="150" cy="25" r="2" style={f(t.accent, "none", 0)} />
      <path {...hilalYolu(150, 21.5, 7)} style={f(t.accent, "none", 0)} />
      <RozetSekli cx={150} cy={68} r={13} t={t} />

      {/* cephe */}
      <rect x="40" y="112" width="220" height="140" style={yuzey} />

      {/* kitabe: tema adı */}
      <rect x="100" y="118" width="100" height="20" rx="2" style={f(t.background, t.accent, 1)} />
      <text x="150" y="132.5" textAnchor="middle"
        style={{ fill: t.text, transition: GECIS, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>
        {ad}
      </text>

      {/* yan kanatlar: rozet + kemerli pencere */}
      <RozetSekli cx={65} cy={168} r={15} t={t} />
      <RozetSekli cx={235} cy={168} r={15} t={t} />
      {pencere(55, 200, 20, 40)}
      {pencere(225, 200, 20, 40)}

      {/* MİHRAP: çerçeve (pîştak) + sivri kemerli niş */}
      <rect x="88" y="144" width="124" height="108" style={f(t.surface, t.accent, 1.1)} />
      <path d="M99 252 L99 190 C99 170, 128 162, 150 150 C172 162, 201 170, 201 190 L201 252 Z"
        style={f(t.background, t.accent, 1.1)} />
      <RozetSekli cx={100} cy={156} r={7} t={t} />
      <RozetSekli cx={200} cy={156} r={7} t={t} />

      {/* niş içi: besmele, âyet halkası, içeriksiz meal çizgileri, lügat parçası */}
      <text x="150" y="199" textAnchor="middle" direction="rtl"
        style={{ fill: t.text, transition: GECIS, fontFamily: "'Scheherazade New', serif", fontSize: 23 }}>
        بِسْمِ اللّٰهِ
      </text>
      <circle cx="150" cy="220" r="3.6" style={f("none", t.ayetNoRengi, 1.5)} />
      <rect x="110" y="230" width="80" height="4" rx="2" style={f(t.textSecondary, "none", 0, { opacity: 0.45 })} />
      <rect x="116" y="239" width="24" height="4" rx="2" style={f(t.textSecondary, "none", 0, { opacity: 0.45 })} />
      <rect x="144" y="239" width="18" height="4" rx="2" style={f(t.lugatHighlight, "none", 0)} />
      <rect x="166" y="239" width="18" height="4" rx="2" style={f(t.textSecondary, "none", 0, { opacity: 0.45 })} />

      {/* zemin çizgisi */}
      <line x1="4" y1="252.5" x2="296" y2="252.5" style={f("none", t.border, 1.4)} />
    </svg>
  )
}

/* ── TEZHİP ROZETİ ───────────────────────────────────────────────────────
   Dış 8 yaprak: zemin / kenarlık · iç 8 yaprak (yarım adım dönük): yüzey /
   vurgu · göbek: zemin + âyet no rengi. Seçiliyse kesikli halka (panel
   vurgusuyla — rozetin kendi rengiyle değil, hangi temada olunursa görünsün). */
function Rozet({ t, secili, boyut, halkaRengi }) {
  const dis = [], ic = []
  for (let i = 0; i < 8; i++) {
    dis.push(<ellipse key={"d" + i} cx="32" cy="13" rx="7.5" ry="12" transform={`rotate(${i * 45} 32 32)`}
      style={{ fill: t.background, stroke: t.border, strokeWidth: 1.2 }} />)
    ic.push(<ellipse key={"i" + i} cx="32" cy="17.5" rx="4" ry="7" transform={`rotate(${i * 45 + 22.5} 32 32)`}
      style={{ fill: t.surface, stroke: t.accent, strokeWidth: 0.9 }} />)
  }
  return (
    <svg className="vukuf-rozet" width={boyut} height={boyut} viewBox="0 0 64 64" aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}>
      {secili && (
        <circle className="vukuf-rozet-halka" cx="32" cy="32" r="31.5" fill="none"
          stroke={halkaRengi} strokeWidth="1.6" strokeDasharray="3.2 3" />
      )}
      {dis}{ic}
      <circle cx="32" cy="32" r="10" style={{ fill: t.background, stroke: t.accent, strokeWidth: 1.5 }} />
      <circle cx="32" cy="32" r="4" style={{ fill: t.ayetNoRengi }} />
    </svg>
  )
}

/**
 * @param theme    görünen (uygulanmış) tema — panelin kendi renkleri için
 * @param duzen    "kart" (Ayarlar, geniş) | "satir" (dar okuma paneli)
 * @param onOzel   Özel'e dokunulunca (düzenleme panelini açar)
 * @param onSec    (id, uygulandiMi) — hazır temaya dokunulunca, seçimden SONRA
 * @param kalemBoyu satir düzeninde Özel kalem simgesinin boyu (okuma barı ölçeği)
 * (sutun eski düzenden kalma; kabul ediliyor, kullanılmıyor)
 */
export default function TemaSecici({ theme, duzen = "kart", onOzel, onSec, kalemBoyu }) {
  const {
    currentTheme, setCurrentTheme, customTheme,
    tonModu, tonSec, tonFavori, sistemTonu,
  } = useApp()
  const dar = duzen === "satir"
  const oto = tonModu === "oto"
  const gruplar = oto ? ["acik", "koyu"] : [tonModu]
  const ozelTon = temaTonu(customTheme)

  // Otomatik'te öbür tonun rozetine dokununca tema hemen uygulanmıyor; önizleme
  // yine de onu göstersin. Görünen tema ya da mod değişince sıfırlanır.
  const [onizId, setOnizId] = useState(null)
  useEffect(() => { setOnizId(null) }, [currentTheme, tonModu])
  const gosterilen = onizId || currentTheme
  const gt = gosterilen === "custom" ? customTheme : (themes[gosterilen] || theme)
  const gAd = gosterilen === "custom" ? "Özel" : gt.name
  const gAciklama = gosterilen === "custom" ? "Kişisel renk ayarları" : (gt.aciklama || "")
  const bekleyenTon = onizId ? temaTonu(gt) : null

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
    setOnizId(uygulandi ? null : id)
    onSec && onSec(id, uygulandi)
  }

  const seciliMi = (id, ton) => (oto ? tonFavori[ton] === id : currentTheme === id)
  const boyut = dar ? 44 : 54

  return (
    <div>
      <style>{STIL}</style>
      <TonAnahtari theme={theme} tonModu={tonModu} tonSec={tonSec} dar={dar} />

      {/* ── Cami önizleme (ortada mihrap) — YALNIZ Ayarlar'da. Okuma panelleri
          dar ve zaten arkalarında sayfanın kendisi görünüyor; orada cami yok,
          liste satırlarında soldaki küçük kutu yerine tezhip çiçeği var. ── */}
      {!dar && <>
      <div style={{ maxWidth: "290px", margin: "18px auto 0", padding: "0 4px" }}>
        <CamiOnizleme t={gt} ad={gAd} />
      </div>
      <div style={{
        textAlign: "center", fontSize: dar ? "10.5px" : "11.5px", color: theme.textSecondary,
        margin: "6px 4px 0", minHeight: "1.3em", lineHeight: 1.35,
      }}>
        {bekleyenTon
          ? <>Cihaz {TON_ADI[bekleyenTon].toLocaleLowerCase("tr")} tona geçince uygulanacak</>
          : gAciklama}
      </div>
      </>}

      {oto && (
        <div style={{ fontSize: "11px", color: theme.textSecondary, margin: "10px 2px 0", lineHeight: 1.4, textAlign: dar ? "left" : "center" }}>
          Cihazın ayarına uyar — şu an <b style={{ color: theme.text, fontWeight: 600 }}>{TON_ADI[sistemTonu]}</b>.
          Her ton için bir tema seç.
        </div>
      )}

      {/* ── Rozetler ── */}
      {gruplar.map(ton => (
        <div key={ton} style={{ marginTop: dar ? "12px" : "16px" }}>
          {oto && (
            <div style={{
              fontSize: "10.5px", letterSpacing: "1px", color: theme.textSecondary,
              margin: "0 2px 8px", display: "flex", alignItems: "center", gap: "6px",
            }}>
              {ton === "acik" ? <Sun size={11} /> : <Moon size={11} />}
              {ton === "acik" ? "AYDINLIKTA" : "KARANLIKTA"}
              {ton === sistemTonu && <span style={{ color: theme.accent, letterSpacing: 0 }}>· şu an</span>}
            </div>
          )}
          {dar ? (
            /* Okuma paneli: önceki satır düzeni — soldaki önizleme kutusu yerine rozet */
            <div>
              {ogeler(ton).map(x => {
                const secili = seciliMi(x.id, ton)
                const ad = x.ozel ? "Özel" : x.t.name
                return (
                  <button
                    key={x.id}
                    className="vukuf-rozet-dugme"
                    onClick={() => sec(x.id)}
                    aria-label={ad}
                    aria-pressed={secili}
                    style={{
                      width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "10px",
                      padding: "6px 8px", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit",
                      color: secili ? theme.accent : theme.text,
                      background: secili ? `${theme.accent}15` : "transparent",
                      border: "none", cursor: "pointer", marginBottom: "2px",
                    }}
                  >
                    <span style={{ flexShrink: 0, padding: "2px" }}>
                      <Rozet t={x.t} secili={secili} boyut={32} halkaRengi={theme.accent} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <span style={{ display: "block", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ad}
                        {oto && currentTheme === x.id && <span style={{ fontSize: "9.5px", color: theme.accent, marginLeft: "6px" }}>şu an</span>}
                      </span>
                      <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>{x.aciklama}</span>
                    </span>
                    {x.ozel
                      ? <Pencil size={kalemBoyu || 12} color={theme.textSecondary} />
                      : secili && <span style={{ fontSize: "10px", color: theme.accent }}>✓</span>}
                  </button>
                )
              })}
            </div>
          ) : (
          <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${dar ? 62 : 74}px, 1fr))`,
              gap: dar ? "10px 2px" : "14px 4px",
            }}>
              {ogeler(ton).map(x => {
                const secili = seciliMi(x.id, ton)
                const ad = x.ozel ? "Özel" : x.t.name
                return (
                  <button
                    key={x.id}
                    className="vukuf-rozet-dugme"
                    onClick={() => sec(x.id)}
                    title={`${ad} — ${x.aciklama}`}
                    aria-label={ad}
                    aria-pressed={secili}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                      padding: "4px 0", background: "none", border: "none", cursor: "pointer",
                      fontFamily: "inherit", minWidth: 0, position: "relative",
                    }}
                  >
                    <Rozet t={x.t} secili={secili} boyut={boyut} halkaRengi={theme.accent} />
                    {x.ozel && (
                      <span style={{
                        position: "absolute", top: `${boyut - 12}px`, left: "50%", marginLeft: `${boyut / 2 - 12}px`,
                        width: "18px", height: "18px", borderRadius: "50%", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        background: theme.surface, border: `1px solid ${theme.border}`,
                      }}>
                        <Pencil size={10} color={theme.textSecondary} />
                      </span>
                    )}
                    <span style={{
                      fontSize: dar ? "10.5px" : "11.5px", maxWidth: "100%",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      color: secili ? theme.accent : theme.textSecondary,
                      fontWeight: secili ? 600 : 400,
                    }}>{ad}</span>
                    {oto && currentTheme === x.id && (
                      <span style={{ fontSize: "9.5px", color: theme.accent, marginTop: "-4px" }}>şu an</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
