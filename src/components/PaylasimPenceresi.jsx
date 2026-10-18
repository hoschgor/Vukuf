/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — PAYLAŞMA PENCERESİ + "PAYLAŞILAN YER" NOTU
   src/components/PaylasimPenceresi.jsx

   18 Ekim 2026 (kullanıcı): seçilen cümle/kelime ya da âyet için paylaşma ekranı —
   WhatsApp, Facebook ya da başka bir uygulama; istenirse bağlantı kopyalanır.
   Telefonda alttan açılan pencere (tutamaktan aşağı çekince kapanır), geniş ekranda
   ortada kutu. Dışına dokununca / Esc ile kapanır.

   veri:
     { tip: "kitap", kitapId, kitapAdi, sayfa, satir, cumle, kelime }
     { tip: "ayet",  sureNo, ayetNo, sureAdi }
   Mesaj ve bağlantı data/paylasim.js'te kuruluyor (biçim orada anlatıldı).

   Marka logoları çizilmedi: düğmeler genel simge + uygulamanın adı + tanıdık rengiyle.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react"
import { X, Link2, Copy, Check, Share2, MessageCircle, Send, ThumbsUp, AtSign, Mail, MessageSquare, BookOpen } from "lucide-react"
import { paylasimMesaji, PAYLASIM_HEDEFLERI, panoyaKopyala } from "../data/paylasim"

// Önizlemede adres okunur biçimde (%C3%BC → ü); kopyalanan/gönderilen adres değişmez
const okunurAdres = (u) => { try { return decodeURIComponent(String(u).replace(/\+/g, " ")) } catch { return u } }
const IKONLAR = { whatsapp: MessageCircle, telegram: Send, facebook: ThumbsUp, x: AtSign, eposta: Mail, sms: MessageSquare }

export default function PaylasimPenceresi({ acik, veri, kapat, theme, isMobile }) {
  const ac = theme.accent
  const [secim, setSecim] = useState("cumle")
  const [bildirim, setBildirim] = useState("")
  const [cekme, setCekme] = useState(0)
  const cekmeRef = useRef(null)
  const bildirimZaman = useRef(0)

  useEffect(() => {
    if (!acik) return
    setSecim("cumle"); setBildirim(""); setCekme(0)
    const tus = (e) => { if (e.key === "Escape") kapat() }
    window.addEventListener("keydown", tus)
    return () => { window.removeEventListener("keydown", tus); clearTimeout(bildirimZaman.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, veri])

  const kelimeVar = veri?.tip === "kitap" && veri.kelime && veri.cumle && veri.kelime.trim() !== veri.cumle.trim()
  const m = useMemo(() => paylasimMesaji(veri ? { ...veri, secim } : null), [veri, secim])
  const sistemPaylasimi = typeof navigator !== "undefined" && typeof navigator.share === "function"

  if (!acik || !veri) return null

  const bildir = (t) => {
    setBildirim(t)
    clearTimeout(bildirimZaman.current)
    bildirimZaman.current = setTimeout(() => setBildirim(""), 2200)
  }
  const kopyala = async (metin, etiket) => {
    const ok = await panoyaKopyala(metin)
    bildir(ok ? etiket : "Kopyalanamadı; metin seçilerek kopyalanabilir")
  }
  const hedefeGit = async (h) => {
    if (h.panoya) {
      const ok = await panoyaKopyala(m.metin)
      if (ok) bildir("Mesaj kopyalandı; Facebook'ta yapıştırılabilir")
    }
    const adres = h.ac(m)
    if (h.uygulama) { window.location.href = adres; return }
    const w = window.open(adres, "_blank", "noopener,noreferrer")
    if (!w) window.location.href = adres          // açılır pencere engellendiyse aynı sekmede
  }
  const sistemdenPaylas = async () => {
    try {
      // Bazı uygulamalar text + url'yi ayrı alanlarda alıyor; bağlantı url'de, metin text'te
      await navigator.share({ title: m.konu, text: m.govde, url: m.baglanti })
    } catch (e) {
      if (e && e.name === "AbortError") return     // kullanıcı vazgeçti
      kopyala(m.metin, "Mesaj kopyalandı")
    }
  }

  const cekBas = (e) => { cekmeRef.current = { y: e.clientY, id: e.pointerId }; try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* yoksay */ } }
  const cekKaydir = (e) => { const c = cekmeRef.current; if (c && c.id === e.pointerId) setCekme(Math.max(0, e.clientY - c.y)) }
  const cekBirak = () => { const d = cekme; cekmeRef.current = null; if (d > 90) kapat(); else setCekme(0) }

  const baslik = veri.tip === "ayet" ? "Âyeti paylaş" : (secim === "kelime" && kelimeVar ? "Kelimeyi paylaş" : "Cümleyi paylaş")

  const hedefDugmesi = (key, ad, Ikon, renk, tikla) => (
    <button key={key} onClick={tikla} className="vukuf-paylas-hedef"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
        padding: "10px 4px 8px", borderRadius: "12px", border: "none", background: "transparent",
        cursor: "pointer", color: theme.text, fontFamily: "inherit", minWidth: 0,
      }}>
      <span style={{
        width: "44px", height: "44px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        background: renk ? renk : `${ac}18`, color: renk ? "#fff" : ac,
        boxShadow: renk ? "0 2px 8px rgba(0,0,0,0.14)" : "none",
      }}>
        <Ikon size={20} />
      </span>
      <span style={{ fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{ad}</span>
    </button>
  )

  return (
    <div onClick={kapat}
      style={{
        position: "fixed", inset: 0, zIndex: 170, background: "rgba(0,0,0,0.28)",
        display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
        animation: "vukufPaylasSol .18s ease-out",
      }}>
      <style>{`
        @keyframes vukufPaylasSol { from { background: rgba(0,0,0,0) } to { background: rgba(0,0,0,0.28) } }
        @keyframes vukufPaylasYukari { from { transform: translateY(24px); opacity: .6 } to { transform: none; opacity: 1 } }
        .vukuf-paylas-hedef:hover { background: ${ac}0d !important; }
        @media (prefers-reduced-motion: reduce) { .vukuf-paylas-kutu { animation: none !important } }
      `}</style>
      <div className="vukuf-paylas-kutu" role="dialog" aria-modal="true" aria-label={baslik}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "100%" : "min(460px, 92vw)", maxHeight: isMobile ? "88dvh" : "84vh",
          background: theme.surface, color: theme.text,
          borderRadius: isMobile ? "18px 18px 0 0" : "16px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          transform: cekme ? `translateY(${cekme}px)` : undefined,
          transition: cekme ? "none" : "transform .2s ease",
          animation: "vukufPaylasYukari .22s ease-out",
          paddingBottom: isMobile ? "max(10px, env(safe-area-inset-bottom))" : "6px",
        }}>
        {isMobile && (
          <div onPointerDown={cekBas} onPointerMove={cekKaydir} onPointerUp={cekBirak} onPointerCancel={cekBirak}
            style={{ padding: "8px 0 2px", display: "flex", justifyContent: "center", touchAction: "none", cursor: "grab" }}>
            <span style={{ width: "38px", height: "4px", borderRadius: "2px", background: theme.border }} />
          </div>
        )}

        {/* Başlık */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: isMobile ? "6px 16px 8px" : "14px 16px 8px" }}>
          <Share2 size={17} color={ac} />
          <span style={{ flex: 1, fontSize: "15px", fontWeight: 700 }}>{baslik}</span>
          <button onClick={kapat} aria-label="Kapat" title="Kapat"
            style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "0 16px 6px" }}>
          {/* Önizleme */}
          <div style={{
            background: theme.background, border: `1px solid ${theme.border}`, borderRadius: "12px",
            padding: "12px 14px", marginBottom: "10px",
          }}>
            {veri.tip === "ayet" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <BookOpen size={18} color={ac} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "15px", fontWeight: 600 }}>{m.govde}</span>
              </div>
            ) : (
              <>
                <div style={{
                  fontSize: "15px", lineHeight: 1.6, maxHeight: "9.6em", overflowY: "auto",
                  fontFamily: "inherit", overflowWrap: "anywhere",
                }}>
                  “{secim === "kelime" && kelimeVar ? veri.kelime : veri.cumle}”
                </div>
                <div style={{ fontSize: "12.5px", color: theme.textSecondary, marginTop: "6px" }}>
                  — {[veri.kitapAdi, veri.sayfa ? `s. ${veri.sayfa}` : ""].filter(Boolean).join(", ")}
                </div>
              </>
            )}
            <div style={{
              marginTop: "8px", fontSize: "11.5px", color: ac, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              direction: "ltr",
            }} title={m.baglanti}>{okunurAdres(m.baglanti)}</div>
          </div>

          {/* Cümle | Yalnız kelime */}
          {kelimeVar && (
            <div role="radiogroup" aria-label="Paylaşılacak kısım" style={{
              display: "flex", gap: "4px", padding: "3px", borderRadius: "10px", background: theme.background,
              border: `1px solid ${theme.border}`, marginBottom: "10px",
            }}>
              {[["cumle", "Cümle"], ["kelime", "Yalnız kelime"]].map(([id, ad]) => (
                <button key={id} role="radio" aria-checked={secim === id} onClick={() => setSecim(id)}
                  style={{
                    flex: 1, padding: "7px 8px", borderRadius: "8px", border: "none", cursor: "pointer",
                    fontSize: "13px", fontFamily: "inherit", fontWeight: secim === id ? 700 : 500,
                    background: secim === id ? ac : "transparent", color: secim === id ? "#fff" : theme.text,
                  }}>{ad}</button>
              ))}
            </div>
          )}

          {/* Uygulamalar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "2px", marginBottom: "8px" }}>
            {PAYLASIM_HEDEFLERI.map(h => hedefDugmesi(h.id, h.ad, IKONLAR[h.id] || Share2, h.renk, () => hedefeGit(h)))}
            {sistemPaylasimi && hedefDugmesi("diger", "Diğer", Share2, null, sistemdenPaylas)}
          </div>

          {/* Kopyalama */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
            <button onClick={() => kopyala(m.baglanti, "Bağlantı kopyalandı")}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "11px 12px", borderRadius: "12px", border: "none", background: ac, color: "#fff",
                fontSize: "14px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
              }}>
              <Link2 size={16} /> Bağlantıyı kopyala
            </button>
            <button onClick={() => kopyala(m.metin, "Mesaj kopyalandı")} title="Metin, kaynak ve bağlantı birlikte"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                padding: "11px 12px", borderRadius: "12px", border: `1px solid ${ac}66`, background: "transparent", color: ac,
                fontSize: "14px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
              }}>
              <Copy size={15} /> Mesajı kopyala
            </button>
          </div>
          <div aria-live="polite" style={{
            minHeight: "22px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            fontSize: "12.5px", color: ac, opacity: bildirim ? 1 : 0, transition: "opacity .2s",
          }}>
            {bildirim && <Check size={14} />}{bildirim}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── "PAYLAŞILAN YER" NOTU ───────────────────────────────────────────────────
   Bağlantıyla gelen kişiye, varılan yerin üstünde birkaç saniye görünen kısa kart
   (kullanıcı kararı: «Paylaşılan yer» bilgisi + köprü ana sayfaya). Dokununca kapanır. */
export function PaylasimNotu({ metin, theme, ust = 12, sure = 6500, kapat }) {
  const [gorunur, setGorunur] = useState(true)
  useEffect(() => {
    const t1 = setTimeout(() => setGorunur(false), sure)
    const t2 = setTimeout(() => kapat?.(), sure + 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const ac = theme.accent
  return (
    <div role="status" onClick={() => { setGorunur(false); setTimeout(() => kapat?.(), 300) }}
      style={{
        position: "fixed", left: "50%", top: `calc(${ust}px + env(safe-area-inset-top))`, zIndex: 150,
        transform: `translateX(-50%) translateY(${gorunur ? 0 : -8}px)`, opacity: gorunur ? 1 : 0,
        transition: "opacity .35s ease, transform .35s ease",
        display: "flex", alignItems: "center", gap: "10px", maxWidth: "min(420px, calc(100vw - 24px))",
        padding: "9px 14px 9px 10px", borderRadius: "14px", cursor: "pointer",
        background: theme.surface, border: `1px solid ${ac}`, boxShadow: "0 6px 22px rgba(0,0,0,0.2)",
        animation: "vukufPaylasNotBelir .35s ease-out",
      }}>
      <style>{`@keyframes vukufPaylasNotBelir { from { opacity: 0; transform: translateX(-50%) translateY(-8px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }`}</style>
      <span style={{ width: "30px", height: "30px", borderRadius: "50%", background: `${ac}1a`, color: ac, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Share2 size={15} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.25 }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: theme.text }}>Size paylaşılan yer</span>
        {metin ? <span style={{ fontSize: "12px", color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{metin}</span> : null}
      </span>
    </div>
  )
}
