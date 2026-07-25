import { useState } from "react"
import { X, Bookmark, Trash2, ChevronRight, AlertTriangle, Pencil } from "lucide-react"

function tarihFormatla(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })
}

export default function KayitPaneli({ 
  theme,
  kayitlar,
  mevcutSayfa,
  scrollOran,
  onSayfaGit,
  onKayitEkle,
  onKayitGuncelle,
  onKayitSil,
  onKapat,
  onKonumSec
}) {
  const [mod, setMod] = useState("liste")
  const [duzenleId, setDuzenleId] = useState(null)
  const [baslik, setBaslik] = useState("")
  const [hepsiOnay, setHepsiOnay] = useState(0)

  const mevcutKayit = kayitlar?.find(k => k.sayfa === mevcutSayfa)

  function yeniBaslat() {
    setBaslik(`Sayfa ${mevcutSayfa}`)
    setMod("yeni")
  }

  function degistirBaslat(kayit) {
    setDuzenleId(kayit.id)
    setBaslik(kayit.baslik)
    setMod("degistir")
  }

  function kayitOlustur() {
    if (!baslik.trim()) return
    onKayitEkle?.(baslik.trim()) // ← onKayitEkle'yi çağır
    setMod("liste")
  }

  function kayitDegistir() {
    if (!baslik.trim() || !duzenleId) return
    onKayitGuncelle?.(duzenleId, baslik.trim()) // ← onKayitGuncelle'yi çağır
    setMod("liste")
    setDuzenleId(null)
  }

  function kayitSil(id) {
    onKayitSil?.(id) // ← onKayitSil'i çağır
  }

  function hepsiniSil() {
    if (hepsiOnay < 2) { setHepsiOnay(hepsiOnay + 1); return }
    // Tüm kayıtları sil
    kayitlar.forEach(k => onKayitSil?.(k.id))
    setHepsiOnay(0)
  }

  const s = {
    panel: {
      position: "fixed",
      top: "56px",
      right: "12px",
      zIndex: 400,
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: "16px",
      width: "300px",
      maxHeight: "70vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      overflow: "hidden",
    },
    buton: (aktif, tehlikeli) => ({
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: "5px", padding: "6px 12px", borderRadius: "20px",
      border: `1px solid ${tehlikeli ? "#e53e3e40" : theme.accent + "40"}`,
      background: aktif
        ? (tehlikeli ? "#e53e3e" : theme.accent)
        : (tehlikeli ? "#e53e3e12" : `${theme.accent}18`),
      color: aktif ? "#fff" : (tehlikeli ? "#e53e3e" : theme.accent),
      fontSize: "12px", fontWeight: "500", cursor: "pointer",
      transition: "all 0.15s",
    }),
    ikonButon: (tehlikeli) => ({
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "26px", height: "26px", borderRadius: "8px",
      border: `1px solid ${tehlikeli ? "#e53e3e30" : theme.border}`,
      background: tehlikeli ? "#e53e3e0a" : theme.bg,
      color: tehlikeli ? "#e53e3e" : theme.textSecondary,
      cursor: "pointer", flexShrink: 0,
      transition: "all 0.15s",
    }),
    input: {
      width: "100%", padding: "8px 12px", borderRadius: "10px",
      border: `1px solid ${theme.border}`,
      background: theme.bg, color: theme.text,
      fontSize: "13px", outline: "none",
      boxSizing: "border-box",
    },
  }

  return (
    <>
      <div onClick={onKapat} style={{ position: "fixed", inset: 0, zIndex: 399 }} />
      <div style={s.panel}>

        {/* Başlık */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bookmark size={15} color={theme.accent} />
            <span style={{ fontSize: "14px", fontWeight: "600", color: theme.text }}>
              Kayıtlar
            </span>
            {kayitlar?.length > 0 && (
              <span style={{
                fontSize: "11px", color: theme.accent,
                background: `${theme.accent}20`, borderRadius: "10px",
                padding: "1px 7px",
              }}>
                {kayitlar.length}
              </span>
            )}
          </div>
          <button onClick={onKapat} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSecondary }}>
            <X size={15} />
          </button>
        </div>

        {/* İçerik */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>

          {/* Mevcut sayfa aksiyonu */}
          <div style={{
            background: `${theme.accent}10`,
            border: `1px solid ${theme.accent}30`,
            borderRadius: "12px", padding: "12px",
            marginBottom: "14px",
          }}>
            <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px" }}>
              Sayfa {mevcutSayfa}
            </div>

            {mod === "liste" && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => { onKonumSec(); onKapat() }} style={s.buton(true, false)}>
                  <Bookmark size={11} /> Yeni
                </button>
                {mevcutKayit && (
                  <button onClick={() => degistirBaslat(mevcutKayit)} style={s.buton(false, false)}>
                    <Pencil size={11} /> Değiştir
                  </button>
                )}
              </div>
            )}

            {(mod === "yeni" || mod === "degistir") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  style={s.input}
                  value={baslik}
                  onChange={e => setBaslik(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (mod === "yeni" ? kayitOlustur() : kayitDegistir())}
                  placeholder="Kayıt adı..."
                  autoFocus
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={mod === "yeni" ? kayitOlustur : kayitDegistir} style={s.buton(true, false)}>
                    {mod === "yeni" ? "Oluştur" : "Kaydet"}
                  </button>
                  <button onClick={() => { setMod("liste"); setDuzenleId(null) }} style={s.buton(false, false)}>
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Kayıt listesi */}
          {!kayitlar || kayitlar.length === 0 ? (
            <div style={{ textAlign: "center", color: theme.textSecondary, fontSize: "13px", padding: "20px 0" }}>
              Henüz kayıt yok
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {kayitlar.map(k => (
                <div key={k.id} style={{
                  display: "flex", alignItems: "center",
                  background: k.sayfa === mevcutSayfa ? `${theme.accent}12` : theme.bg,
                  border: `1px solid ${k.sayfa === mevcutSayfa ? theme.accent + "40" : theme.border}`,
                  borderRadius: "10px", padding: "8px 10px",
                  gap: "8px",
                }}>
                  <div style={{
                    minWidth: "30px", height: "30px", borderRadius: "8px",
                    background: `${theme.accent}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: "700", color: theme.accent,
                    flexShrink: 0,
                  }}>
                    {k.sayfa}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "13px", fontWeight: "500", color: theme.text,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {k.baslik}
                    </div>
                    <div style={{ fontSize: "10px", color: theme.textSecondary, marginTop: "1px" }}>
                      {tarihFormatla(k.olusturma)}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    <button
                      onClick={() => degistirBaslat(k)}
                      title="Düzenle"
                      style={s.ikonButon(false)}
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => kayitSil(k.id)}
                      title="Sil"
                      style={s.ikonButon(true)}
                    >
                      <Trash2 size={11} />
                    </button>
                    <button
                      onClick={() => { onSayfaGit(k.sayfa, k.scrollY); onKapat() }}
                      title="Sayfaya git"
                      style={{ ...s.ikonButon(false), color: theme.accent, borderColor: `${theme.accent}40`, background: `${theme.accent}10` }}
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alt — tümünü sil */}
        {kayitlar && kayitlar.length > 1 && (
          <div style={{ borderTop: `1px solid ${theme.border}`, padding: "10px 16px" }}>
            {hepsiOnay === 0 && (
              <button onClick={hepsiniSil} style={{ ...s.buton(false, true), width: "100%" }}>
                <Trash2 size={11} /> Tüm kayıtları sil
              </button>
            )}
            {hepsiOnay === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#e53e3e" }}>
                  <AlertTriangle size={12} /> Tüm kayıtlar silinecek!
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={hepsiniSil} style={s.buton(true, true)}>Evet</button>
                  <button onClick={() => setHepsiOnay(0)} style={s.buton(false, false)}>İptal</button>
                </div>
              </div>
            )}
            {hepsiOnay === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#e53e3e" }}>
                  <AlertTriangle size={12} /> Son onay — geri alınamaz!
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={hepsiniSil} style={s.buton(true, true)}>Sil</button>
                  <button onClick={() => setHepsiOnay(0)} style={s.buton(false, false)}>İptal</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}