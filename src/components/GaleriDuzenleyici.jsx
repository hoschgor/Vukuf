/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — GALERİM (slayt gösterisi düzenleyicisi)
   src/components/GaleriDuzenleyici.jsx

   13 Ekim 2026, kullanıcı: "Slayt gösterisi için olan resimler fazla ise ekranda
   çok yer kaplıyor. Bir seçenek gibi sunalım; seçenek aktif olduğunda resimleri
   düzenlemek için bir düğme olsun, çok fazla düğme olmadan. Video da eklenebilsin
   (sesi kullanılmadan arka plan olarak); video ve resim birlikte kullanılabilsin,
   sırası düzenlenebilsin. Bütün düzenleme o kısım açıkken yapılsın."

   PARÇALAR (izleme modu ayarları ve görsel oluşturma ortak kullanır):
     • GaleriKolaj   — arka plan ızgarasındaki TEK "Galerim" kutusunun içi:
                       ilk dört öğeden kolaj + öğe sayısı. Resimler artık ızgarada
                       tek tek dizilmiyor.
     • GaleriOzeti   — Galerim seçiliyken ızgaranın altında tek satır:
                       "4 resim · 1 video · Süreyle 8 sn" + [Düzenle]
     • GaleriDuzenleyici — alttan açılan sayfa: küçük resim ızgarası (basılı tutup
       sürükleyerek sıralama, köşedeki ✕ ile kaldırma → "Geri al"), sonda "Ekle"
       kutusu, altında slayt gösterimi ayarları. Başka düğme yok.

   Galeri sırası `izleme.galeri` dizisidir (iki mod ortak); dosyalar IndexedDB'de
   (data/izlemeGaleri.js). Kaldırılan öğe 5 sn "Geri al" süresince silinmez.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react"
import { X, Plus, Loader2, Film, Pencil, Timer, Layers, Shuffle, GripHorizontal, Image as ImageIcon } from "lucide-react"
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useIzlemeAyar, ayarOku, ayarYaz } from "../data/izlemeAyar"
import { galeriyeEkle, galeridenSil, galeriBlobu, AZAMI_VIDEO_MB } from "../data/izlemeGaleri"
import { GECISLER } from "../data/izlemeSahne"
import { Secim, AyarBaslik, useGaleriOgeleri } from "./AyarOgeleri"

export const SLAYT_SECENEKLERI = [4, 8, 15, 30, 60]

function boyutYaz(b) {
  if (!(b > 0)) return ""
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`
  return `${(b / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`
}
function sureYaz(sn) {
  if (!(sn > 0) || !isFinite(sn)) return ""
  const s = Math.round(sn)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/* "3 resim · 1 video" */
export function galeriSayimi(galeri, ogeler) {
  let resim = 0, video = 0
  for (const id of galeri) { const o = ogeler[id]; if (!o) continue; if (o.video) video++; else resim++ }
  const p = []
  if (resim) p.push(`${resim} resim`)
  if (video) p.push(`${video} video`)
  return p.join(" · ")
}

/* Küçük medya: resim ya da videonun ilk karesi (video OYNATILMAZ). */
function Kucuk({ oge, onSure }) {
  if (!oge) return null
  const ortak = { width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }
  if (oge.video) {
    // "#t=0.1": iOS'ta ilk karenin gösterilmesi için
    return <video src={`${oge.url}#t=0.1`} muted playsInline preload="metadata" style={ortak}
      onLoadedMetadata={e => onSure?.(e.currentTarget.duration)} />
  }
  return <img src={oge.url} alt="" draggable={false} style={ortak} />
}

/* ── ARKA PLAN IZGARASINDAKİ "GALERİM" KUTUSUNUN İÇİ ─────────────────────── */
export function GaleriKolaj({ theme, galeri, ogeler }) {
  const ac = theme.accent
  const ilk = galeri.filter(id => ogeler[id]).slice(0, 4)
  if (!galeri.length) {
    return (
      <span style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: "3px", color: ac,
      }}>
        <Plus size={18} />
        <span style={{ fontSize: "9.5px", fontWeight: 700, lineHeight: 1.15, textAlign: "center" }}>Resim<br />video</span>
      </span>
    )
  }
  const n = ilk.length
  return (
    <span style={{
      position: "absolute", inset: 0, display: "grid", gap: "1px", background: `${ac}55`,
      gridTemplateColumns: n >= 2 ? "1fr 1fr" : "1fr", gridTemplateRows: n >= 3 ? "1fr 1fr" : "1fr",
    }}>
      {ilk.map((id, i) => (
        <span key={id} style={{
          position: "relative", overflow: "hidden", display: "block",
          gridColumn: n === 3 && i === 0 ? "1 / span 2" : undefined,
        }}>
          <Kucuk oge={ogeler[id]} />
        </span>
      ))}
      {galeri.length > 1 && (
        <span style={{
          position: "absolute", top: "4px", right: "4px", minWidth: "18px", height: "18px", padding: "0 5px",
          borderRadius: "9px", background: "rgba(0,0,0,0.62)", color: "#fff", fontSize: "10px", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
        }}>{galeri.length}</span>
      )}
    </span>
  )
}

/* ── GALERİM SEÇİLİYKEN TEK SATIRLIK ÖZET ────────────────────────────────── */
export function GaleriOzeti({ theme, galeri, ogeler, iz, not, onDuzenle }) {
  const ac = theme.accent
  const sayim = galeriSayimi(galeri, ogeler) || `${galeri.length} öğe`
  const slayt = galeri.length >= 2
    ? (iz.slaytKip === "ayet" ? "âyet değişince" : `${iz.slaytSure} sn`)
    : null
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px", marginTop: "10px",
      padding: "9px 10px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: `${ac}0b`,
    }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: theme.text }}>
          {galeri.length >= 2 ? "Slayt gösterisi" : "Galerim"}
        </span>
        <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary, marginTop: "1px", lineHeight: 1.35 }}>
          {sayim}{slayt ? ` · ${slayt}` : ""}{not ? ` · ${not}` : ""}
        </span>
      </span>
      <button onClick={onDuzenle} style={{
        display: "flex", alignItems: "center", gap: "6px", flexShrink: 0,
        padding: "7px 12px", borderRadius: "999px", border: "none", cursor: "pointer",
        background: ac, color: "#fff", fontSize: "12px", fontWeight: 700, fontFamily: "inherit",
      }}>
        <Pencil size={13} /> Düzenle
      </button>
    </div>
  )
}

/* ── SIRALANABİLİR KUTU ──────────────────────────────────────────────────── */
function Kutu({ id, sira, oge, theme, onKaldir, kapak }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const [sure, setSure] = useState(0)
  const ac = theme.accent
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      aria-label={`${sira}. ${oge?.video ? "video" : "resim"}${kapak ? " (kapak)" : ""} — taşımak için basılı tutup sürükleyin`}
      style={{
        position: "relative", aspectRatio: "1 / 1", borderRadius: "12px", overflow: "hidden",
        background: `${ac}14`, border: `1px solid ${theme.border}`,
        transform: CSS.Transform.toString(transform), transition,
        zIndex: isDragging ? 5 : 0, touchAction: "manipulation", cursor: isDragging ? "grabbing" : "grab",
        boxShadow: isDragging ? "0 10px 26px rgba(0,0,0,0.35)" : "none",
        scale: isDragging ? "1.05" : "1",
        WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none",
      }}>
      {oge ? <Kucuk oge={oge} onSure={setSure} />
        : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader2 size={16} color={ac} className="gd-don" />
          </span>}
      {/* üst ve alt gölge — rozetler her resimde okunsun */}
      <span aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(rgba(0,0,0,0.38), transparent 32%, transparent 64%, rgba(0,0,0,0.5))",
      }} />
      <span style={{
        position: "absolute", top: "6px", left: "6px", minWidth: "20px", height: "20px", padding: "0 5px",
        borderRadius: "10px", background: ac, color: "#fff", fontSize: "11px", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
      }}>{sira}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onKaldir() }}
        onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
        aria-label={`${sira}. öğeyi kaldır`} title="Kaldır"
        style={{
          position: "absolute", top: "5px", right: "5px", width: "24px", height: "24px", padding: 0,
          borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(0,0,0,0.55)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><X size={13} /></button>
      {(oge?.video || kapak) && (
        <span style={{
          position: "absolute", left: "6px", bottom: "6px", right: "6px", display: "flex", alignItems: "center",
          gap: "4px", color: "#fff", fontSize: "10.5px", fontWeight: 700, pointerEvents: "none",
        }}>
          {oge?.video && <><Film size={12} />{sureYaz(sure)}</>}
          {kapak && <span style={{ marginLeft: "auto", opacity: 0.9 }}>kapak</span>}
        </span>
      )}
    </div>
  )
}

/* ── DÜZENLEYİCİ ─────────────────────────────────────────────────────────── */
export default function GaleriDuzenleyici({ acik, kapat, theme, isMobile, baglam = "izleme", onEklendi }) {
  const [ayar, guncelle] = useIzlemeAyar()
  const iz = ayar.izleme
  const galeri = iz.galeri || []
  const ogeler = useGaleriOgeleri(acik ? galeri : [], galeriBlobu)
  const [ekleniyor, setEkleniyor] = useState(false)
  const [bilgi, setBilgi] = useState("")
  const [geriAl, setGeriAl] = useState(null)       // { id, sira } — kaldırılan, henüz silinmeyen
  const geriAlRef = useRef(null)
  const zamanRef = useRef(null)
  const ac = theme.accent

  const sensorler = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 170, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Bekleyen kaldırmayı kesinleştir (süre dolunca ya da sayfa kapanınca)
  const kesinlestir = () => {
    const g = geriAlRef.current
    if (!g) return
    geriAlRef.current = null
    clearTimeout(zamanRef.current)
    setGeriAl(null)
    if (!(ayarOku().izleme.galeri || []).includes(g.id)) galeridenSil(g.id)
  }
  useEffect(() => { if (!acik) kesinlestir() }, [acik])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => kesinlestir(), [])                // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!acik) return
    const tus = (e) => { if (e.key === "Escape") { e.stopPropagation(); kapat?.() } }
    document.addEventListener("keydown", tus, true)
    return () => document.removeEventListener("keydown", tus, true)
  }, [acik, kapat])

  const toplamBoyut = useMemo(() => galeri.reduce((t, id) => t + (ogeler[id]?.boyut || 0), 0), [galeri, ogeler])

  if (!acik) return null

  const sirala = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const i = galeri.indexOf(active.id), j = galeri.indexOf(over.id)
    if (i < 0 || j < 0) return
    guncelle("izleme", { galeri: arrayMove(galeri, i, j) })
  }
  const kaldir = (id) => {
    kesinlestir()                                  // önceki bekleyen varsa şimdi silinir
    const sira = galeri.indexOf(id)
    const kalan = galeri.filter(x => x !== id)
    guncelle("izleme", kalan.length ? { galeri: kalan }
      : { galeri: [], ...(iz.arka === "galeri" ? { arka: "zumrut" } : {}) })
    geriAlRef.current = { id, sira }
    setGeriAl({ id, sira })
    clearTimeout(zamanRef.current)
    zamanRef.current = setTimeout(kesinlestir, 5000)
  }
  const geriGetir = () => {
    const g = geriAlRef.current
    if (!g) return
    geriAlRef.current = null
    clearTimeout(zamanRef.current)
    setGeriAl(null)
    const simdi = [...(ayarOku().izleme.galeri || [])]
    simdi.splice(Math.min(g.sira, simdi.length), 0, g.id)
    guncelle("izleme", { galeri: simdi })
  }
  const ekle = async (dosyalar) => {
    setEkleniyor(true); setBilgi("")
    try {
      const yeni = await galeriyeEkle(dosyalar)
      if (yeni.length) {
        const mevcut = ayarOku().izleme.galeri || []
        ayarYaz("izleme", { galeri: [...mevcut, ...yeni] })
        onEklendi?.(yeni)
      }
      const at = yeni.atlanan || []
      if (at.some(a => a.sebep === "buyuk")) setBilgi(`${AZAMI_VIDEO_MB} MB'tan büyük videolar eklenemedi.`)
      else if (at.length) setBilgi("Bazı dosyalar okunamadı, eklenemedi.")
    } finally { setEkleniyor(false) }
  }

  const sayim = galeriSayimi(galeri, ogeler)
  const videoVar = galeri.some(id => ogeler[id]?.video)
  const ipucu = { fontSize: "11px", color: theme.textSecondary, lineHeight: 1.5, margin: "8px 2px 0" }

  return (
    <>
      <style>{`@keyframes gd-don{to{transform:rotate(360deg)}}.gd-don{animation:gd-don .9s linear infinite}
@keyframes gd-gir{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <div onClick={kapat} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.45)" }} />
      <div role="dialog" aria-label="Galerim" style={{
        position: "fixed", zIndex: 1201,
        ...(isMobile
          ? { left: 0, right: 0, bottom: 0, maxHeight: "88dvh", borderRadius: "18px 18px 0 0" }
          : { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "min(580px, 94vw)", maxHeight: "84vh", borderRadius: "18px" }),
        background: theme.surface, color: theme.text, boxShadow: "0 -8px 40px rgba(0,0,0,0.35)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        animation: isMobile ? "gd-gir .22s ease" : undefined,
        paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : 0,
      }}>
        {/* BAŞLIK */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px 10px", borderBottom: `1px solid ${theme.border}` }}>
          <span style={{
            width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0, display: "flex",
            alignItems: "center", justifyContent: "center", background: `${ac}18`, color: ac,
          }}><ImageIcon size={17} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: "15px", fontWeight: 700 }}>Galerim</span>
            <span style={{ display: "block", fontSize: "11.5px", color: theme.textSecondary, marginTop: "1px" }}>
              {galeri.length ? [sayim, boyutYaz(toplamBoyut)].filter(Boolean).join(" · ") : "Henüz resim ya da video yok"}
            </span>
          </span>
          <button onClick={kapat} style={{
            padding: "8px 16px", borderRadius: "999px", border: "none", cursor: "pointer",
            background: ac, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: "inherit",
          }}>Bitti</button>
        </div>

        {/* GÖVDE */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "14px 16px 16px" }}>
          <DndContext sensors={sensorler} collisionDetection={closestCenter} onDragEnd={sirala}>
            <SortableContext items={galeri} strategy={rectSortingStrategy}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 3 : 4}, minmax(0, 1fr))`, gap: "8px" }}>
                {galeri.map((id, i) => (
                  <Kutu key={id} id={id} sira={i + 1} oge={ogeler[id]} theme={theme}
                    kapak={baglam === "gorsel" && i === 0 && galeri.length > 1}
                    onKaldir={() => kaldir(id)} />
                ))}
                {/* EKLE */}
                <label style={{
                  aspectRatio: "1 / 1", borderRadius: "12px", border: `1.5px dashed ${ac}88`, cursor: ekleniyor ? "default" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
                  color: ac, background: `${ac}08`, opacity: ekleniyor ? 0.65 : 1,
                }}>
                  {ekleniyor ? <Loader2 size={20} className="gd-don" /> : <Plus size={20} />}
                  <span style={{ fontSize: "11px", fontWeight: 700 }}>{ekleniyor ? "Ekleniyor" : "Ekle"}</span>
                  {!ekleniyor && <span style={{ fontSize: "9.5px", color: theme.textSecondary }}>resim · video</span>}
                  <input type="file" accept="image/*,video/*" multiple disabled={ekleniyor} style={{ display: "none" }}
                    onChange={(e) => {
                      const fs = Array.from((e.target && e.target.files) || [])
                      try { e.target.value = "" } catch { /* yoksay */ }
                      if (fs.length) ekle(fs)
                    }} />
                </label>
              </div>
            </SortableContext>
          </DndContext>

          {galeri.length > 1 && (
            <div style={{ ...ipucu, display: "flex", alignItems: "center", gap: "6px" }}>
              <GripHorizontal size={13} style={{ flexShrink: 0 }} />
              Sırayı değiştirmek için basılı tutup sürükleyebilirsiniz.
            </div>
          )}
          {bilgi && <div style={{ ...ipucu, color: "#c0392b" }}>{bilgi}</div>}

          {/* GÖSTERİM — iki ya da daha fazla öğe varken */}
          {galeri.length >= 2 && (
            <>
              <AyarBaslik theme={theme} ikon={Layers} ust={16}>Değişim</AyarBaslik>
              <Secim theme={theme} kucuk deger={iz.slaytKip === "ayet" ? "ayet" : "sure"} onSec={v => guncelle("izleme", { slaytKip: v })}
                secenekler={[{ id: "sure", ad: "Süreyle", Ikon: Timer }, { id: "ayet", ad: "Âyet değişince", Ikon: Layers }]} />
              {iz.slaytKip !== "ayet" && (
                <>
                  <AyarBaslik theme={theme} ikon={Timer}>Her resim</AyarBaslik>
                  <Secim theme={theme} kucuk deger={Number(iz.slaytSure)} onSec={v => guncelle("izleme", { slaytSure: v })}
                    secenekler={SLAYT_SECENEKLERI.map(sn => ({ id: sn, ad: `${sn} sn` }))} />
                </>
              )}
              <AyarBaslik theme={theme} ikon={Shuffle}>Geçiş</AyarBaslik>
              <Secim theme={theme} kucuk deger={iz.slaytGecis} onSec={v => guncelle("izleme", { slaytGecis: v })} secenekler={GECISLER} />
            </>
          )}

          <p style={ipucu}>
            {videoVar
              ? (iz.slaytKip === "ayet"
                ? "Videolar sessiz oynar; âyet sürdükçe başa sararak devam eder."
                : "Videolar sessiz oynar ve kendi süresince ekranda kalır.")
              : "Videolar da eklenebilir; sesleri kullanılmaz, arka planda sessiz oynar."}
            {baglam === "gorsel" && galeri.length > 1 ? " Fotoğrafta ilk öğe (kapak) kullanılır; slayt videoda oynar." : ""}
            {" "}Galeri izleme modu ve görsel oluşturmada ortaktır.
          </p>
        </div>

        {/* GERİ AL */}
        {geriAl && (
          <div style={{
            position: "absolute", left: "50%", bottom: isMobile ? "calc(16px + env(safe-area-inset-bottom))" : "16px",
            transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "12px",
            padding: "9px 10px 9px 16px", borderRadius: "999px", background: "rgba(20,18,16,0.92)", color: "#fff",
            fontSize: "12.5px", boxShadow: "0 6px 20px rgba(0,0,0,0.35)", whiteSpace: "nowrap",
          }}>
            Kaldırıldı
            <button onClick={geriGetir} style={{
              padding: "5px 12px", borderRadius: "999px", border: "none", cursor: "pointer",
              background: ac, color: "#fff", fontSize: "12px", fontWeight: 700, fontFamily: "inherit",
            }}>Geri al</button>
          </div>
        )}
      </div>
    </>
  )
}
