/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — DEPOLAMA GÖRÜNÜMÜ (Ayarlar → Veriler → Depolama)
   src/components/DepolamaGorunumu.jsx

   11 Ekim 2026, kullanıcı: "kısımların harcadığı belleği ve en son da toplam
   bellek ve ayrılan bellek aynı şekilde gösterilsin; Geçmiş'in yeri görünsün."

   DÜZEN:
     1) Üstte kullanılan toplam (büyük rakam) + ayrılan yerin yüzde kaçı + ince çubuk
     2) Bölüm çubuğu: toplamın bölümlere dağılımı (yığılmış tek çubuk, aralarda
        2 px boşluk). Bir parçaya dokununca / üstüne gelince satırı vurgulanır.
     3) Bölüm satırları (renk işareti + ad + açıklama + boyut + %), boş bölümler
        gizli. "Kişisel veriler" açılır: Geçmiş sayfası, notlar, hıfz… ayrı ayrı.
     4) Aynı satır düzeninde: Toplam kullanılan · Ayrılan alan · Boş alan
     5) Kalıcı depolama durumu
   RENKLER: bölüme SABİT bağlı (büyüklük sırasına göre değişmez). Altı ayırt
   edici renk + iki nötr (uygulama dosyaları, tarayıcı payı). Renk körlüğü ve
   ayırt edilebilirlik betikle doğrulandı (açık: sepya yüzeyde, koyu: koyu
   yüzeyde). Açık temada üç renk 3:1 altında kalıyor → her parçanın adı ve
   değeri satırlarda yazılı (renk tek başına bilgi taşımıyor).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react"
import { ChevronDown, RotateCw } from "lucide-react"
import { depolamaOlc, boyutYaz } from "../data/depolamaOlcum"
import { temaTonu } from "../AppContext"

const RENK = {
  // 7. renk (17 Ekim 2026): "Sesli okuma sesleri" — mor, öbür altısından ayırt edilir
  acik: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#8257d6"],
  koyu: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9b78ea"],
}
const NOTR = { acik: ["#9a948a", "#c4beb3"], koyu: ["#7c766c", "#55504a"] }

function yuzdeYaz(oran) {
  if (!(oran > 0)) return "%0"
  const v = oran * 100
  if (v < 0.1) return "%0,1'den az"
  return `%${v.toLocaleString("tr-TR", { maximumFractionDigits: v < 10 ? 1 : 0 })}`
}

export default function DepolamaGorunumu({ theme, tazele = 0, kalici, onKaliciYap }) {
  const ton = temaTonu(theme)
  const [olcum, setOlcum] = useState(null)
  const [ilerleme, setIlerleme] = useState(0)
  const [yeniden, setYeniden] = useState(0)
  const [secili, setSecili] = useState(null)
  const [acikBolum, setAcikBolum] = useState(null)        // alt satırları açık bölüm (kişisel / sesli okuma)

  useEffect(() => {
    let iptal = false
    setIlerleme(0)
    depolamaOlc(o => { if (!iptal) setIlerleme(o) })
      .then(s => { if (!iptal) setOlcum(s) })
      .catch(() => { if (!iptal) setOlcum({ bolumler: [], toplam: 0, kota: 0, hata: "yok" }) })
    return () => { iptal = true }
  }, [tazele, yeniden])

  const renkVer = (b) => b.notr
    ? NOTR[ton][b.id === "diger" ? 1 : 0]
    : RENK[ton][b.yuva % RENK[ton].length]

  if (!olcum) {
    return (
      <div style={{ padding: "14px 4px", fontSize: "12px", color: theme.textSecondary }}>
        Ölçülüyor{ilerleme > 0 && ilerleme < 1 ? ` · ${Math.round(ilerleme * 100)}%` : "…"}
        <div style={{ height: "4px", borderRadius: "2px", marginTop: "8px", background: `${theme.accent}1a`, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.max(4, ilerleme * 100)}%`, background: theme.accent, transition: "width .2s ease" }} />
        </div>
      </div>
    )
  }

  const { bolumler, toplam, kota, hata } = olcum
  const dolu = bolumler.filter(b => b.bayt > 0 || b.id === "kisisel")
  const kotaOran = kota > 0 ? toplam / kota : 0
  const bos = kota > 0 ? Math.max(0, kota - toplam) : 0

  const satirStil = (vurgulu) => ({
    display: "flex", alignItems: "center", gap: "10px",
    padding: "9px 10px", borderRadius: "10px",
    background: vurgulu ? `${theme.accent}12` : "transparent",
    transition: "background .15s ease",
  })
  const deger = { flexShrink: 0, textAlign: "right", fontVariantNumeric: "tabular-nums" }

  return (
    <div>
      {/* 1) ÖZET */}
      <div style={{
        padding: "14px 14px 12px", borderRadius: "12px", marginBottom: "10px",
        background: `${theme.accent}0d`, border: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "10.5px", letterSpacing: "0.08em", color: theme.textSecondary, fontWeight: 600 }}>
              KULLANILAN
            </div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: theme.text, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>
              {boyutYaz(toplam)}
            </div>
            <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "2px" }}>
              {kota > 0
                ? <>Ayrılan <b style={{ color: theme.text }}>{boyutYaz(kota)}</b> alanın {kotaOran * 100 < 0.1 ? "%0,1'inden azı" : `${yuzdeYaz(kotaOran)}'i`}</>
                : hata === "guvensiz" ? "Ayrılan alan bu adreste ölçülemiyor (HTTPS gerekli)"
                  : "Tarayıcı ayrılan alanı bildirmiyor"}
            </div>
          </div>
          <button onClick={() => { setOlcum(null); setYeniden(n => n + 1) }}
            title="Yeniden ölç" aria-label="Yeniden ölç"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px",
              borderRadius: "50%", border: `1px solid ${theme.border}`, background: "transparent",
              color: theme.textSecondary, cursor: "pointer", flexShrink: 0,
            }}>
            <RotateCw size={13} />
          </button>
        </div>
        {kota > 0 && (
          <div style={{ height: "6px", borderRadius: "3px", marginTop: "10px", background: `${theme.accent}22`, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "3px", background: theme.accent,
              width: `${Math.min(100, Math.max(1.5, kotaOran * 100))}%`,
            }} />
          </div>
        )}
      </div>

      {/* 2) BÖLÜM ÇUBUĞU — toplamın dağılımı */}
      {toplam > 0 && (
        <div role="img" aria-label="Kullanılan alanın bölümlere dağılımı"
          onMouseLeave={() => setSecili(null)}
          style={{ display: "flex", gap: "2px", height: "14px", margin: "4px 2px 8px" }}>
          {dolu.filter(b => b.bayt > 0).map(b => (
            <div key={b.id}
              title={`${b.ad}: ${b.yaklasik ? "≈" : ""}${boyutYaz(b.bayt)}`}
              onMouseEnter={() => setSecili(b.id)}
              onClick={() => setSecili(s => (s === b.id ? null : b.id))}
              style={{
                flexGrow: b.bayt, flexBasis: 0, minWidth: "4px",
                background: renkVer(b), borderRadius: "4px", cursor: "pointer",
                opacity: secili && secili !== b.id ? 0.3 : 1,
                transition: "opacity .15s ease",
              }} />
          ))}
        </div>
      )}

      {/* 3) BÖLÜM SATIRLARI */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {dolu.map(b => {
          const acilir = !!(b.alt && b.alt.length > 0)
          const kisiselAcik = acikBolum === b.id
          const satir = (
            <div style={satirStil(secili === b.id)}>
              <span aria-hidden="true" style={{ width: "10px", height: "10px", borderRadius: "3px", background: renkVer(b), flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 600, color: theme.text }}>
                  {b.ad}
                  {acilir && <ChevronDown size={13} style={{ color: theme.textSecondary, transform: kisiselAcik ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />}
                </span>
                <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary, lineHeight: 1.35, marginTop: "1px" }}>
                  {b.aciklama}{b.adet ? ` · ${b.adet} dosya` : ""}
                </span>
              </span>
              <span style={deger}>
                <span style={{ display: "block", fontSize: "13px", fontWeight: 600, color: theme.text }}>
                  {b.yaklasik && b.bayt > 0 ? "≈" : ""}{boyutYaz(b.bayt)}
                </span>
                <span style={{ display: "block", fontSize: "10.5px", color: theme.textSecondary }}>
                  {toplam > 0 ? yuzdeYaz(b.bayt / toplam) : ""}
                </span>
              </span>
            </div>
          )
          return (
            <div key={b.id}
              onMouseEnter={() => setSecili(b.id)} onMouseLeave={() => setSecili(null)}>
              {acilir ? (
                <button onClick={() => setAcikBolum(v => (v === b.id ? null : b.id))} aria-expanded={kisiselAcik}
                  style={{ display: "block", width: "100%", padding: 0, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  {satir}
                </button>
              ) : satir}
              {acilir && kisiselAcik && (
                <div style={{ margin: "0 0 6px 30px", borderLeft: `2px solid ${renkVer(b)}55`, paddingLeft: "10px" }}>
                  {b.alt.map(a => (
                    <div key={a.id} style={{ display: "flex", alignItems: "baseline", gap: "8px", padding: "5px 6px 5px 0" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "12px", color: theme.text, fontWeight: a.id === "gecmis-sayfasi" ? 600 : 500 }}>{a.ad}</span>
                        <span style={{ display: "block", fontSize: "10.5px", color: theme.textSecondary, lineHeight: 1.35 }}>{a.aciklama}</span>
                      </span>
                      <span style={{ ...deger, fontSize: "12px", color: theme.text }}>{boyutYaz(a.bayt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 4) TOPLAM · AYRILAN · BOŞ — aynı satır düzeninde */}
      <div style={{ height: "1px", background: theme.border, margin: "8px 4px" }} />
      {[
        { ad: "Toplam kullanılan", aciklama: "Bütün bölümler", bayt: toplam, kalin: true },
        ...(kota > 0 ? [
          { ad: "Ayrılan alan", aciklama: "Tarayıcının bu uygulamaya ayırdığı en çok yer", bayt: kota },
          { ad: "Boş alan", aciklama: "Daha indirilebilecek kadar", bayt: bos },
        ] : []),
      ].map(s => (
        <div key={s.ad} style={satirStil(false)}>
          <span aria-hidden="true" style={{ width: "10px", flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: "13px", fontWeight: s.kalin ? 700 : 600, color: theme.text }}>{s.ad}</span>
            <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary, lineHeight: 1.35, marginTop: "1px" }}>{s.aciklama}</span>
          </span>
          <span style={{ ...deger, fontSize: "13px", fontWeight: s.kalin ? 700 : 600, color: s.kalin ? theme.accent : theme.text }}>
            {boyutYaz(s.bayt)}
          </span>
        </div>
      ))}

      {/* 5) KALICI DEPOLAMA */}
      <div style={{
        marginTop: "8px", padding: "10px 12px", borderRadius: "10px",
        border: `1px solid ${theme.border}`, background: theme.background,
        fontSize: "12px", color: theme.textSecondary, lineHeight: 1.55,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: "160px" }}>
            Kalıcı depolama: <b style={{ color: theme.text }}>{kalici === null || kalici === undefined ? "bilinmiyor" : kalici ? "açık" : "kapalı"}</b>
          </span>
          {kalici === false && onKaliciYap && (
            <button onClick={onKaliciYap} style={{
              padding: "5px 10px", borderRadius: "8px", fontSize: "11px",
              background: "transparent", border: `1px solid ${theme.accent}`,
              color: theme.accent, fontFamily: "inherit", cursor: "pointer",
            }}>Kalıcı yap</button>
          )}
        </div>
        <div style={{ marginTop: "4px", fontSize: "11px" }}
        >
          Veriler yalnız bu tarayıcıda durur; uygulamayı silmek ya da site verilerini
          temizlemek hepsini götürür. Önbellek boyutları (≈) indirme boyutundan hesaplanır.
        </div>
      </div>
    </div>
  )
}
