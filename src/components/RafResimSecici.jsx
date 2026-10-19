/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — ÖZEL RAF RESMİ SEÇİCİ
   src/components/RafResimSecici.jsx

   19 Ekim 2026, kullanıcı: "Özel raflara resim eklenebilmesi için bir ayar yapalım."
   Kararlar (kullanıcı seçti):
     • Kaynak: kısım raflarındaki HAZIR resimler + cihazdan yüklenen resim
     • Yer: kitaplık DÜZENLEME modunda özel rafın üzerindeki resim düğmesi
     • Kırpma: raf biçimli önizlemede resim sürüklenerek görünen kısım seçilir
     • Yedek: yüklenen resim küçültülüp sıkıştırılır (≈ 100–250 KB) ve özel rafın kaydına
       (localStorage "vukuf-ozel-raflar") yazılır → yedeğe kendiliğinden girer.

   Kaydedilen: raf.resim = { src, konum: "X% Y%", ozel?: true }
     src  → hazır resim yolu ("/raflar/kuran.webp") ya da küçültülmüş resmin data: adresi
   Raf resimli görünümde (Kitaplık → Raf görünümü → Resimli) gösterilir; kısım raflarındaki
   renk eşitleme süzgeci bu resme de uygulanır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react"
import { X, ImagePlus, Trash2, Check, Move } from "lucide-react"

const AZAMI_EN = 1400, AZAMI_BOY = 1000          // küçültme sınırı (raf ~4:1 → yatay öncelikli)
const AZAMI_BAYT = 320 * 1024                     // data: adresi bundan büyükse yeniden sıkıştırılır

/* Dosya → küçültülmüş data: adresi. WebP denenir; Safari WebP kodlayamazsa (PNG döner) JPEG. */
async function resmiKucult(dosya) {
  const url = URL.createObjectURL(dosya)
  try {
    const img = await new Promise((coz, red) => {
      const i = new Image()
      i.onload = () => coz(i)
      i.onerror = () => red(new Error("Resim açılamadı"))
      i.src = url
    })
    let olcek = Math.min(1, AZAMI_EN / img.naturalWidth, AZAMI_BOY / img.naturalHeight)
    let son = ""
    for (let deneme = 0; deneme < 4; deneme++) {
      const w = Math.max(1, Math.round(img.naturalWidth * olcek)), h = Math.max(1, Math.round(img.naturalHeight * olcek))
      const cv = document.createElement("canvas")
      cv.width = w; cv.height = h
      const cx = cv.getContext("2d")
      cx.drawImage(img, 0, 0, w, h)
      const kalite = 0.8 - deneme * 0.1
      let d = cv.toDataURL("image/webp", kalite)
      if (!d.startsWith("data:image/webp")) d = cv.toDataURL("image/jpeg", kalite)
      son = d
      if (d.length * 0.75 <= AZAMI_BAYT) break
      olcek *= 0.8
    }
    return son
  } finally { URL.revokeObjectURL(url) }
}

const yuzde = (s, i) => {
  const p = String(s || "50% 50%").split(/\s+/)[i]
  const v = parseFloat(p)
  return Number.isFinite(v) ? v : 50
}

export default function RafResimSecici({ acik, raf, hazirlar = [], oran = 4.2, theme, isMobile, kapat, kaydet }) {
  const ac = theme.accent
  const [secim, setSecim] = useState(null)            // { src, konum, ozel? }
  const [isleniyor, setIsleniyor] = useState(false)
  const [hata, setHata] = useState("")
  const kutuRef = useRef(null)
  const imgRef = useRef(null)
  const dosyaRef = useRef(null)
  const surukleRef = useRef(null)

  useEffect(() => {
    if (!acik) return
    setSecim(raf?.resim?.src ? { ...raf.resim } : null)
    setHata(""); setIsleniyor(false)
    const tus = (e) => { if (e.key === "Escape") kapat() }
    window.addEventListener("keydown", tus)
    return () => window.removeEventListener("keydown", tus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, raf?.id])

  if (!acik || !raf) return null

  const dosyaSecildi = async (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ""
    if (!f) return
    if (!/^image\//.test(f.type)) { setHata("Lütfen bir resim dosyası seçiniz."); return }
    setIsleniyor(true); setHata("")
    try {
      const src = await resmiKucult(f)
      setSecim({ src, konum: "50% 50%", ozel: true })
    } catch {
      setHata("Resim açılamadı; başka bir dosya denenebilir.")
    } finally { setIsleniyor(false) }
  }

  /* SÜRÜKLEME: resim kutudan taşan yönde (genelde dikey) kaydırılır → object-position yüzdesi */
  const bas = (e) => {
    if (!secim || !imgRef.current || !kutuRef.current) return
    const img = imgRef.current, kutu = kutuRef.current.getBoundingClientRect()
    const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1
    const o = Math.max(kutu.width / iw, kutu.height / ih)
    const s = {
      id: e.pointerId, x0: e.clientX, y0: e.clientY,
      px: yuzde(secim.konum, 0), py: yuzde(secim.konum, 1),
      tx: iw * o - kutu.width, ty: ih * o - kutu.height,     // taşan piksel
    }
    surukleRef.current = s
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* yoksay */ }
  }
  const kaydir = (e) => {
    const s = surukleRef.current
    if (!s || s.id !== e.pointerId) return
    const nx = s.tx > 1 ? Math.max(0, Math.min(100, s.px - ((e.clientX - s.x0) / s.tx) * 100)) : 50
    const ny = s.ty > 1 ? Math.max(0, Math.min(100, s.py - ((e.clientY - s.y0) / s.ty) * 100)) : 50
    setSecim(v => v && ({ ...v, konum: `${Math.round(nx)}% ${Math.round(ny)}%` }))
  }
  const birak = () => { surukleRef.current = null }

  const kaydetTikla = () => {
    const ok = kaydet(secim ? { src: secim.src, konum: secim.konum || "50% 50%", ...(secim.ozel ? { ozel: true } : {}) } : null)
    if (ok === false) { setHata("Cihazda yer kalmadı; daha küçük bir resim denenebilir ya da başka bir özel rafın resmi kaldırılabilir."); return }
    kapat()
  }

  return (
    <div onClick={kapat} style={{
      position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.32)",
      display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
    }}>
      <div role="dialog" aria-modal="true" aria-label={`Raf resmi — ${raf.baslik}`} onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "100%" : "min(560px, 92vw)", maxHeight: isMobile ? "90dvh" : "88vh", overflowY: "auto",
          background: theme.surface, color: theme.text, borderRadius: isMobile ? "18px 18px 0 0" : "16px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.25)", padding: "14px 16px",
          paddingBottom: isMobile ? "max(14px, env(safe-area-inset-bottom))" : "14px",
        }}>
        {/* Başlık */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <ImagePlus size={18} color={ac} />
          <span style={{ flex: 1, minWidth: 0, fontSize: "15px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Raf resmi · {raf.baslik}
          </span>
          <button onClick={kapat} aria-label="Kapat" title="Kapat"
            style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>

        {/* ÖNİZLEME — rafın iç oranında; resim sürüklenerek kırpma yeri seçilir */}
        <div ref={kutuRef}
          onPointerDown={bas} onPointerMove={kaydir} onPointerUp={birak} onPointerCancel={birak}
          style={{
            position: "relative", width: "100%", aspectRatio: `${oran} / 1`, borderRadius: "8px", overflow: "hidden",
            background: "#2b1d12", boxShadow: "inset 0 10px 16px rgba(0,0,0,0.55)",
            cursor: secim ? "grab" : "default", touchAction: secim ? "none" : "auto", userSelect: "none",
            border: `3px solid #5a3d24`,
          }}>
          {secim ? (
            <>
              <img ref={imgRef} src={secim.src} alt="" draggable={false}
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
                  objectPosition: secim.konum || "50% 50%", pointerEvents: "none",
                  filter: "saturate(0.8) sepia(0.14) brightness(1.03) contrast(0.95)",
                }} />
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.06) 26%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.42) 100%)" }} />
              <span style={{
                position: "absolute", right: "8px", bottom: "8px", display: "flex", alignItems: "center", gap: "5px",
                padding: "3px 8px", borderRadius: "999px", background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: "11px", pointerEvents: "none",
              }}><Move size={12} /> Sürüklenebilir</span>
            </>
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#d8c4a4", fontSize: "13px", textAlign: "center", padding: "0 12px" }}>
              Henüz resim seçilmedi; aşağıdan hazır bir resim ya da cihazdan bir resim seçilebilir.
            </div>
          )}
        </div>
        <div style={{ fontSize: "11.5px", color: theme.textSecondary, margin: "6px 2px 12px", lineHeight: 1.5 }}>
          Resim, önizlemede sürüklenerek rafta görünecek kısmı seçilebilir. Raf resimleri Kitaplık'ın "Resimli" görünümünde gösterilir.
        </div>

        {/* CİHAZDAN */}
        <input ref={dosyaRef} type="file" accept="image/*" onChange={dosyaSecildi} style={{ display: "none" }} />
        <button onClick={() => dosyaRef.current?.click()} disabled={isleniyor}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            padding: "10px 12px", borderRadius: "12px", border: `1px dashed ${ac}`, background: `${ac}0d`, color: ac,
            fontSize: "14px", fontWeight: 600, fontFamily: "inherit", cursor: isleniyor ? "wait" : "pointer", marginBottom: "12px",
          }}>
          <ImagePlus size={17} /> {isleniyor ? "Resim hazırlanıyor…" : "Cihazdan resim seç"}
        </button>

        {/* HAZIR RESİMLER */}
        {hazirlar.length > 0 && (
          <>
            <div style={{ fontSize: "12px", fontWeight: 700, color: theme.textSecondary, margin: "0 2px 6px", letterSpacing: "0.03em" }}>HAZIR RESİMLER</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 3}, minmax(0, 1fr))`, gap: "8px", marginBottom: "12px" }}>
              {hazirlar.map(h => {
                const secili = secim && secim.src === h.src
                return (
                  <button key={h.src} onClick={() => setSecim({ src: h.src, konum: h.konum || "50% 50%" })} title={h.ad}
                    style={{
                      position: "relative", padding: 0, border: `2px solid ${secili ? ac : "transparent"}`, borderRadius: "8px",
                      overflow: "hidden", cursor: "pointer", aspectRatio: "2.6 / 1", background: "#2b1d12",
                    }}>
                    <img src={h.src} alt="" loading="lazy" draggable={false}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: h.konum || "50% 50%", display: "block", filter: "saturate(0.8) sepia(0.14)" }} />
                    <span style={{
                      position: "absolute", left: 0, right: 0, bottom: 0, padding: "2px 6px", fontSize: "11px", color: "#fff",
                      background: "linear-gradient(transparent, rgba(0,0,0,0.6))", textAlign: "left",
                    }}>{h.ad}</span>
                    {secili && (
                      <span style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", background: ac, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={13} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {hata && <div style={{ color: "#c0392b", fontSize: "12.5px", margin: "0 2px 10px", lineHeight: 1.5 }}>{hata}</div>}

        {/* EYLEMLER */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {secim && (
            <button onClick={() => setSecim(null)} title="Raftan resmi kaldır"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 12px", borderRadius: "12px", border: "none", background: "transparent", color: "#c0392b", fontSize: "13.5px", fontFamily: "inherit", cursor: "pointer" }}>
              <Trash2 size={15} /> Resmi kaldır
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button onClick={kapat}
            style={{ padding: "10px 14px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary, fontSize: "14px", fontFamily: "inherit", cursor: "pointer" }}>
            Vazgeç
          </button>
          <button onClick={kaydetTikla} disabled={isleniyor}
            style={{ padding: "10px 16px", borderRadius: "12px", border: "none", background: ac, color: "#fff", fontSize: "14px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}
