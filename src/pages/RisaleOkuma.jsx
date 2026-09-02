import { useEffect, useState, useCallback } from "react"
import RisaleLugatPopup from "./RisaleLugatPopup"
import YuklemeEkrani from "../components/YuklemeEkrani"

// Risale okuyucu: kitap JSON'unu render eder, k'li kelimeler tıklanabilir,
// tıklanınca lügat + (kv varsa) kavram popup'ı açılır.
//
// Veri konumu: public/risale/ altında olmalı (Vite public/ kökten servis eder):
//   public/risale/kitaplar-json/index.json     (kitap listesi)
//   public/risale/kitaplar-json/<dosya>.json   (her kitap)
//   public/risale/lugat/risale-lugat.json      (kelime -> anlam)
//   public/risale/kavramlar/kavramlar.json     (kv -> [{terim,aciklama,kaynaklar}])
//
// props: { theme, dosya? }  dosya verilirse o kitabı açar; yoksa kitap listesi gösterir.

const BASE = "/risale"

// Lügat + kavramlar tüm kitaplarda ortak; bir kez çekip modül düzeyinde sakla.
let _lugatCache = null
let _kavramCache = null

async function lugatYukle() {
  if (_lugatCache) return _lugatCache
  const r = await fetch(`${BASE}/lugat/risale-lugat.json`)
  _lugatCache = await r.json()
  return _lugatCache
}
async function kavramYukle() {
  if (_kavramCache) return _kavramCache
  const r = await fetch(`${BASE}/kavramlar/kavramlar.json`)
  _kavramCache = await r.json()
  return _kavramCache
}

export default function RisaleOkuma({ theme, dosya: dosyaProp = null }) {
  const [index, setIndex] = useState(null)
  const [dosya, setDosya] = useState(dosyaProp)
  const [kitap, setKitap] = useState(null)
  const [lugat, setLugat] = useState(null)
  const [kavramlar, setKavramlar] = useState(null)
  const [secili, setSecili] = useState(null)   // { kelime, anlam, kavram, konum }
  const [yukleniyor, setYukleniyor] = useState(false)

  // Kitap listesi (dosya verilmediyse)
  useEffect(() => {
    if (dosya) return
    fetch(`${BASE}/kitaplar-json/index.json`)
      .then(r => r.json()).then(setIndex).catch(() => setIndex([]))
  }, [dosya])

  // Ortak veriler
  useEffect(() => {
    lugatYukle().then(setLugat)
    kavramYukle().then(setKavramlar)
  }, [])

  // Seçilen kitabı yükle
  useEffect(() => {
    if (!dosya) { setKitap(null); return }
    setYukleniyor(true)
    fetch(`${BASE}/kitaplar-json/${encodeURIComponent(dosya)}`)
      .then(r => r.json())
      .then(k => { setKitap(k); setYukleniyor(false) })
      .catch(() => { setKitap(null); setYukleniyor(false) })
  }, [dosya])

  const kelimeTikla = useCallback((e, run) => {
    if (!run.k) return
    const anlam = lugat?.[run.k] || ""
    const kavram = run.kv && kavramlar?.[run.kv] ? kavramlar[run.kv] : null
    // Popup'ı ekran içinde konumla
    const pw = 300, ph = 220
    let x = e.clientX + 8
    let y = e.clientY + 8
    if (x + pw > window.innerWidth) x = window.innerWidth - pw - 10
    if (y + ph > window.innerHeight) y = e.clientY - ph - 8
    if (y < 8) y = 8
    setSecili({ kelime: run.t, anlam, kavram, konum: { x, y } })
  }, [lugat, kavramlar])

  // --- Kitap listesi görünümü ---
  if (!dosya) {
    return (
      <div style={{ padding: "16px", color: theme.text }}>
        <h2 style={{ color: theme.accent, marginBottom: "12px" }}>Risale-i Nur Külliyatı</h2>
        {!index && <YuklemeEkrani theme={theme} yukseklik="55vh" arkaplan={false} />}
        <div style={{ display: "grid", gap: "8px" }}>
          {index?.map(k => (
            <button key={k.bookId} onClick={() => setDosya(k.dosya)}
              style={{
                textAlign: "left", padding: "12px 14px", cursor: "pointer",
                background: theme.surface, border: `1px solid ${theme.border}`,
                borderRadius: "10px", color: theme.text,
              }}>
              <div style={{ fontWeight: 600 }}>{k.baslik}</div>
              <div style={{ fontSize: "12px", color: theme.textSecondary }}>{k.yazar}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // --- Okuma görünümü ---
  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "16px 18px" }}>
      {dosyaProp == null && (
        <button onClick={() => { setDosya(null); setKitap(null) }}
          style={{
            marginBottom: "12px", background: `${theme.accent}18`, color: theme.accent,
            border: `1px solid ${theme.accent}40`, borderRadius: "20px",
            padding: "6px 14px", fontSize: "12px", cursor: "pointer",
          }}>
          ← Kitaplar
        </button>
      )}

      {yukleniyor && <YuklemeEkrani theme={theme} yukseklik="60vh" arkaplan={false} />}

      {kitap && (
        <>
          <h1 style={{ color: theme.accent, fontSize: "24px", marginBottom: "2px" }}>
            {kitap.baslik}
          </h1>
          {kitap.yazar && (
            <div style={{ color: theme.textSecondary, fontSize: "13px", marginBottom: "18px" }}>
              {kitap.yazar}
            </div>
          )}

          {kitap.paragraflar.map((p, pi) => (
            <p key={pi} style={{
              color: theme.text, fontSize: "16px", lineHeight: "1.9",
              margin: "0 0 12px", textAlign: "justify",
            }}>
              {p.run.map((run, ri) =>
                run.k ? (
                  <span key={ri}
                    onClick={(e) => kelimeTikla(e, run)}
                    style={{
                      cursor: "pointer",
                      borderBottom: `1px dotted ${theme.accent}80`,
                      color: run.kv ? theme.accent : "inherit",
                    }}>
                    {run.t}
                  </span>
                ) : (
                  <span key={ri}>{run.t}</span>
                )
              )}
            </p>
          ))}
        </>
      )}

      {secili && (
        <RisaleLugatPopup
          kelime={secili}
          konum={secili.konum}
          theme={theme}
          onKapat={() => setSecili(null)}
        />
      )}
    </div>
  )
}
