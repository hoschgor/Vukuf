/* VUKUF — ORTAK AYAR ÖĞELERİ
   src/components/AyarOgeleri.jsx

   Kullanıcı (7 Ekim 2026): "butonları daha kullanışlı yapalım, benzeri buton
   yapılandırmasını hıfz modunda yapmıştık." Hıfz panelindeki bölünmüş düğme
   (Secim) ve aç/kapa satırı (Anahtar) buraya alındı; izleme/meal ayarları ve
   görsel oluşturma paneli aynı öğeleri kullanıyor.

   NİÇİN ŞERİT DEĞİL: eski hâlde seçenekler yana kayan tek satırdı; telefonda
   sağdakiler kesik görünüyor ("Sonsu…", "Yıl…"), var olduğu bile fark
   edilmiyordu. Secim çok seçenekte SATIRA SARIYOR: hepsi aynı anda görünür. */

import { useEffect, useRef, useState } from "react"
import { Plus, X, Check, Loader2, Pipette } from "lucide-react"

/* Bölünmüş düğme. Az seçenekte (≤4) eşit sütunlar, çokta satıra sarılır.
   secenekler: [{ id, ad, Ikon?, alt? }] — alt: düğmede küçük ikinci satır */
export function Secim({ theme, secenekler, deger, onSec, kucuk, sutun }) {
  const ac = theme.accent
  const esit = sutun ? true : secenekler.length <= 4
  const sut = sutun || secenekler.length
  return (
    <div role="radiogroup" style={{
      display: esit ? "grid" : "flex", flexWrap: "wrap",
      gridTemplateColumns: esit ? `repeat(${sut}, minmax(0, 1fr))` : undefined,
      gap: "3px", padding: "3px", borderRadius: "11px",
      background: `${ac}0f`, border: `1px solid ${theme.border}`,
    }}>
      {secenekler.map(s => {
        const sec = deger === s.id
        const I = s.Ikon
        return (
          <button key={String(s.id)} role="radio" aria-checked={sec} onClick={() => onSec?.(s.id)}
            disabled={s.kapali} title={s.baslik || undefined}
            style={{
              flex: esit ? undefined : "1 1 auto",
              display: "flex", flexDirection: s.alt ? "column" : "row",
              alignItems: "center", justifyContent: "center", gap: s.alt ? "1px" : "5px",
              minHeight: kucuk ? "28px" : "32px", padding: s.alt ? "4px 8px" : "0 10px", borderRadius: "8px",
              border: "none", cursor: s.kapali ? "not-allowed" : "pointer", fontFamily: "inherit",
              fontSize: kucuk ? "11.5px" : "12px", fontWeight: 600, whiteSpace: "nowrap",
              background: sec ? ac : "transparent", color: sec ? "#fff" : theme.textSecondary,
              boxShadow: sec ? "0 1px 4px rgba(0,0,0,0.15)" : "none", opacity: s.kapali ? 0.4 : 1,
              touchAction: "manipulation", transition: "background .15s ease, color .15s ease",
            }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              {I && <I size={13} />}{s.ad}
            </span>
            {s.alt && <span style={{ fontSize: "9.5px", fontWeight: 500, opacity: 0.75 }}>{s.alt}</span>}
          </button>
        )
      })}
    </div>
  )
}

/* Aç/kapa satırı: başlık + açıklama solda, anahtar sağda. Satırın tamamı dokunulabilir. */
export function Anahtar({ theme, acik, onDegis, baslik, aciklama, ikon: Ikon, kapali }) {
  const ac = theme.accent
  const etkin = acik && !kapali
  return (
    <button onClick={() => !kapali && onDegis?.(!acik)} role="switch" aria-checked={etkin} disabled={kapali}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "10px", textAlign: "left",
        padding: "8px 10px", borderRadius: "10px", cursor: kapali ? "not-allowed" : "pointer", fontFamily: "inherit",
        border: `1px solid ${theme.border}`, background: "transparent", color: theme.text,
        marginBottom: "6px", touchAction: "manipulation", opacity: kapali ? 0.45 : 1,
      }}>
      {Ikon && <Ikon size={15} color={etkin ? ac : theme.textSecondary} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "12.5px", fontWeight: 600 }}>{baslik}</span>
        {aciklama && <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary, lineHeight: 1.45, marginTop: "1px" }}>{aciklama}</span>}
      </span>
      <span aria-hidden="true" style={{
        width: "34px", height: "20px", borderRadius: "999px", flexShrink: 0, position: "relative",
        background: etkin ? ac : `${theme.textSecondary}44`, transition: "background .15s ease",
      }}>
        <span style={{
          position: "absolute", top: "2px", left: etkin ? "16px" : "2px",
          width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left .15s ease",
        }} />
      </span>
    </button>
  )
}

/* Küçük bölüm başlığı (+ isteğe bağlı simge ve sağda not) */
export function AyarBaslik({ theme, children, ikon: Ikon, not, ust = 12 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: `${ust}px 0 6px` }}>
      {Ikon && <Ikon size={13} color={theme.accent} />}
      <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: theme.textSecondary }}>{children}</span>
      {not && <span style={{ marginLeft: "auto", fontSize: "10.5px", color: theme.textSecondary, opacity: 0.8 }}>{not}</span>}
    </div>
  )
}

/* Desen (renk geçişi) için küçük önizleme resmi — bir kez çizilir */
const desenBellek = new Map()
export function desenOnizleme(d) {
  if (!d || typeof d.ciz !== "function") return ""
  if (desenBellek.has(d.id)) return desenBellek.get(d.id)
  let url = ""
  try {
    const cv = document.createElement("canvas")
    cv.width = 96; cv.height = 96
    d.ciz(cv.getContext("2d"), 96, 96)
    url = cv.toDataURL("image/png")
  } catch { url = "" }
  desenBellek.set(d.id, url)
  return url
}

/* ARKA PLAN IZGARASI — küçük resimli kutular, satıra sarılır.
   ogeler: [{ id, ad, resim (url), secili, sira? (rozet), onSil? }]
   ekle: { onDosyalar(files), ekleniyor, coklu } — ilk kutu "Resim ekle" */
export function ArkaPlanIzgara({ theme, ogeler, onSec, ekle }) {
  const ac = theme.accent
  const kutu = (secili) => ({
    position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: "10px",
    overflow: "hidden", padding: 0, cursor: "pointer", fontFamily: "inherit",
    border: secili ? `2px solid ${ac}` : `1px solid ${theme.border}`,
    boxShadow: secili ? `0 0 0 2px ${ac}33` : "none",
    background: `${ac}0d`,
  })
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: "8px" }}>
      {ekle && (
        <label style={{
          ...kutu(false), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "3px", color: ac, borderStyle: "dashed", opacity: ekle.ekleniyor ? 0.6 : 1,
        }}>
          {ekle.ekleniyor ? <Loader2 size={18} className="ayar-spin" /> : <Plus size={18} />}
          <span style={{ fontSize: "10px", fontWeight: 600 }}>{ekle.ekleniyor ? "Ekleniyor" : "Resim ekle"}</span>
          <input type="file" accept="image/*" multiple={ekle.coklu !== false} disabled={ekle.ekleniyor}
            onChange={(e) => {
              const fs = Array.from((e.target && e.target.files) || [])
              try { e.target.value = "" } catch { /* yoksay */ }
              if (fs.length) ekle.onDosyalar(fs)
            }}
            style={{ display: "none" }} />
          <style>{`@keyframes ayar-spin{to{transform:rotate(360deg)}}.ayar-spin{animation:ayar-spin .9s linear infinite}`}</style>
        </label>
      )}
      {ogeler.map(o => (
        <div key={o.id} style={{ position: "relative" }}>
          <button onClick={() => onSec?.(o.id)} aria-pressed={!!o.secili} title={o.ad} style={kutu(o.secili)}>
            {o.resim
              ? <img src={o.resim} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : <span style={{ fontSize: "10px", color: theme.textSecondary }}>{o.ad}</span>}
            <span style={{
              position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 4px 3px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.65))",
              fontSize: "9.5px", fontWeight: 700, color: "#fff", textAlign: "center",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{o.ad}</span>
            {o.secili && (
              <span style={{
                position: "absolute", top: "4px", left: "4px", width: "18px", height: "18px", borderRadius: "50%",
                background: ac, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              }}><Check size={11} /></span>
            )}
          </button>
          {o.onSil && (
            <button onClick={o.onSil} aria-label={`${o.ad} kaldır`} title="Kaldır" style={{
              position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", padding: 0,
              borderRadius: "50%", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.6)", color: "#fff",
            }}><X size={12} /></button>
          )}
        </div>
      ))}
    </div>
  )
}

/* Galerideki resimlerin nesne adresleri (önizleme ve çizim için). ids değişince
   tazelenir, bileşen sökülünce bırakılır. */
export function useGaleriUrlleri(ids, blobAl) {
  const anahtar = (ids || []).join(",")
  const [urller, setUrller] = useState({})
  const eldeRef = useRef({})              // şu an gösterilen adresler
  useEffect(() => {
    let iptal = false
    const yeni = {}
    ;(async () => {
      for (const id of (ids || [])) {
        const b = await blobAl(id)
        if (iptal) break
        if (b) yeni[id] = URL.createObjectURL(b)
      }
      if (iptal) { Object.values(yeni).forEach(u => URL.revokeObjectURL(u)); return }
      // Eskiler YENİLER çizildikten sonra bırakılır (arada kırık resim görünmesin)
      const eski = eldeRef.current
      eldeRef.current = yeni
      setUrller(yeni)
      setTimeout(() => Object.values(eski).forEach(u => { try { URL.revokeObjectURL(u) } catch { /* yoksay */ } }), 1500)
    })()
    return () => { iptal = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar])
  useEffect(() => () => {
    Object.values(eldeRef.current).forEach(u => { try { URL.revokeObjectURL(u) } catch { /* yoksay */ } })
  }, [])
  return urller
}

/* RENK SEÇİCİ — Otomatik · Özel (tarayıcı paleti) · son kullanılanlar · öneriler.
   Görsel oluşturmadaki yazı rengi satırının ortak hâli (8 Ekim 2026: izleme
   modunda da yazı rengi seçilebilsin diye buraya alındı).
   deger: null = otomatik | "#rrggbb". oneriler: [{ id, ad, renk }] */
export function RenkSecici({ theme, deger, onSec, oneriler = [], sonRenkler = [], onSonEkle, otomatikYok }) {
  const ac = theme.accent
  const ozelMi = !!deger && !oneriler.some(r => r.renk === deger) && !sonRenkler.includes(deger)
  const hap = (sec) => ({
    position: "relative", display: "inline-flex", alignItems: "center", gap: "5px",
    padding: "6px 11px", borderRadius: "999px", cursor: "pointer", fontFamily: "inherit",
    border: `1px solid ${sec ? ac : theme.border}`, background: sec ? `${ac}1e` : "transparent",
    color: sec ? ac : theme.textSecondary, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap",
    overflow: "hidden",
  })
  const kutu = (renk, sec) => ({
    width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0, cursor: "pointer", padding: 0,
    background: renk, border: sec ? `3px solid ${ac}` : `1px solid ${theme.border}`,
    boxShadow: sec ? `0 0 0 2px ${ac}33` : "none",
  })
  const ayrac = <span style={{ width: "1px", height: "22px", background: theme.border, flexShrink: 0 }} />
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
      {!otomatikYok && <button onClick={() => onSec(null)} style={hap(deger === null)}>Otomatik</button>}
      <label title="Özel renk seç" style={hap(ozelMi)}>
        <Pipette size={13} /> Özel
        <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: deger || "#f6f1e6", border: `1px solid ${theme.border}` }} />
        <input type="color" value={deger || "#f6f1e6"}
          onChange={e => onSec(e.target.value)}
          onBlur={e => onSonEkle && onSonEkle(e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", border: "none", padding: 0 }} />
      </label>
      {sonRenkler.length > 0 && ayrac}
      {sonRenkler.map(r => (
        <button key={`son-${r}`} onClick={() => onSec(r)} title={`Son kullanılan: ${r}`} style={kutu(r, deger === r)} />
      ))}
      {oneriler.length > 0 && ayrac}
      {oneriler.map(r => (
        <button key={r.id} onClick={() => { onSec(r.renk); onSonEkle && onSonEkle(r.renk) }} title={r.ad} style={kutu(r.renk, deger === r.renk)} />
      ))}
    </div>
  )
}
