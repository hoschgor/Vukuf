import { useState, useEffect, useRef, useMemo } from "react"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import { useApp } from "../AppContext"
import { Link, useNavigate } from "react-router-dom"
import { kategoriler, kitaplar, kitapFontGetir } from "../data/kitaplar"
import {
  okumaKayitOku, okumaKayitSil, kitapHavuzu, kuranKitabiGetir,
  sonOkunanlar, sikOkunanlar, ozelRaflarOku, ozelRaflarYaz,
  gizliRaflarOku, gizliRaflarYaz, yeniId, normHarf,
} from "../data/okumaKayit"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Pencil, Check, GripVertical, GripHorizontal, Search, X, BookOpen, Sparkles,
  ChevronLeft, ChevronRight, Eye, EyeOff, Plus, Trash2, Clock, Star, FolderPlus, RotateCcw,
} from "lucide-react"

const kitapRenkleri = [
  "#8B4513", "#A0522D", "#6B3A2A", "#7B3F00",
  "#556B2F", "#2F4F4F", "#1C3A5E", "#4A235A",
  "#7D3C3C", "#2C5F2E",
]

function kitapSirtiRengi(id) {
  let hash = 0
  for (let i = 0; i < (id || "").length; i++) hash += id.charCodeAt(i)
  return kitapRenkleri[hash % kitapRenkleri.length]
}

// Türkçe-duyarlı küçük harf (İ/ı düzeltmeli)
// Arama eşleştirmesi: aksan/şapka + büyük-küçük duyarsız (normHarf)
const trLower = normHarf
// Kur'an → /kuran, diğerleri → /kitap/:id
const kitapYolu = (k) => (k && (k.kuran || k.id === "kuran")) ? "/kuran" : `/kitap/${k?.id}`

// Sayfa ilk yüklendikten sonra true olur → coverflow auto-scroll yalnızca
// kullanıcı bir rafı SONRADAN açınca çalışsın (yüklemede sayfa zıplamasın)
let sayfaYuklendi = false

function SortableKitap({ kitap, duzenlemeMode, theme, alimId }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: kitap.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={{ ...style, position: "relative" }}>
      {duzenlemeMode && (
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: "grab",
            touchAction: "none",
            position: "absolute",
            top: "2px",
            right: "2px",
            zIndex: 10,
            color: "rgba(255,255,255,0.8)",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "3px",
            padding: "1px",
            display: "flex",
          }}
        >
          <GripHorizontal size={12} />
        </div>
      )}
      <Link
        to={duzenlemeMode ? "#" : `/kitap/${kitap.id}`}
        onClick={e => duzenlemeMode && e.preventDefault()}
        style={{ textDecoration: "none" }}
      >
        <KucukKapak kitap={kitap} theme={theme} alimId={alimId} duzenlemeMode={duzenlemeMode} />
      </Link>
    </div>
  )
}

// 80×128 küçük kapak + başlık (grid görünümü)
function KucukKapak({ kitap, theme, alimId, duzenlemeMode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "80px" }}>
      <div
        style={{
          width: "80px",
          height: "128px",
          background: kitap.gorsel ? `url(${kitap.gorsel}) center/cover no-repeat` : kitapSirtiRengi(kitap.id),
          borderRadius: "2px 6px 6px 2px",
          boxShadow: `inset -3px 0 6px rgba(0,0,0,0.3), inset 3px 0 4px rgba(255,255,255,0.1), 2px 2px 6px rgba(0,0,0,0.3)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px",
          cursor: duzenlemeMode ? "default" : "pointer",
          transition: "transform 0.2s",
          position: "relative",
          overflow: "hidden",
          outline: duzenlemeMode ? `2px dashed rgba(255,255,255,0.5)` : "none",
        }}
        onMouseEnter={(e) => !duzenlemeMode && (e.currentTarget.style.transform = "translateY(-6px)")}
        onMouseLeave={(e) => !duzenlemeMode && (e.currentTarget.style.transform = "translateY(0)")}
      >
        {!kitap.gorsel && (
          <>
            <div style={{ position: "absolute", left: "6px", top: 0, bottom: 0, width: "2px", background: "rgba(0,0,0,0.2)" }} />
            <span style={{
              fontSize: "8px",
              color: "rgba(255,255,255,0.85)",
              textAlign: "center",
              lineHeight: "1.3",
              fontFamily: kitapFontGetir(alimId) || "PlayfairDisplay, serif",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
            }}>
              {kitap.baslik.length > 20 ? kitap.baslik.slice(0, 20) + "…" : kitap.baslik}
            </span>
          </>
        )}
      </div>
      <div style={{
        fontSize: "10px",
        fontFamily: kitapFontGetir(alimId) || "inherit",
        color: theme.textSecondary,
        textAlign: "center",
        marginTop: "6px",
        lineHeight: "1.3",
        maxWidth: "80px",
      }}>
        {kitap.baslik.length > 25 ? kitap.baslik.slice(0, 25) + "…" : kitap.baslik}
      </div>
    </div>
  )
}

// Grid kartı (özel/otomatik raflar — DnD yok, silme opsiyonu var)
function KitapKart({ kitap, theme, alimId, onSil }) {
  return (
    <div style={{ position: "relative" }}>
      {onSil && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSil() }}
          title="Raftan çıkar"
          style={{
            position: "absolute", top: "-4px", right: "-4px", zIndex: 10,
            width: "20px", height: "20px", borderRadius: "50%",
            background: "#c0392b", color: "#fff", border: "2px solid " + theme.surface,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0,
          }}
        >
          <X size={12} />
        </button>
      )}
      <Link to={kitapYolu(kitap)} style={{ textDecoration: "none" }}>
        <KucukKapak kitap={kitap} theme={theme} alimId={alimId} />
      </Link>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DİNAMİK RAF — coverflow
// ─────────────────────────────────────────────────────────────
function DinamikKapak({ kitap, alimId, coverW, coverH }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          width: `${coverW}px`,
          height: `${coverH}px`,
          background: kitap.gorsel ? `url(${kitap.gorsel}) center/cover no-repeat` : kitapSirtiRengi(kitap.id),
          borderRadius: "3px 9px 9px 3px",
          boxShadow: `inset -5px 0 10px rgba(0,0,0,0.3), inset 5px 0 6px rgba(255,255,255,0.12), 5px 10px 26px rgba(0,0,0,0.42)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!kitap.gorsel && (
          <>
            <div style={{ position: "absolute", left: "10px", top: 0, bottom: 0, width: "3px", background: "rgba(0,0,0,0.2)" }} />
            <span style={{
              fontSize: `${Math.round(coverW * 0.075)}px`,
              color: "rgba(255,255,255,0.9)",
              textAlign: "center",
              lineHeight: "1.4",
              fontFamily: kitapFontGetir(alimId) || "PlayfairDisplay, serif",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
            }}>
              {kitap.baslik.length > 24 ? kitap.baslik.slice(0, 24) + "…" : kitap.baslik}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function DinamikRaf({ kitaplar: liste, rafId, theme, alimId, kitapSiralama }) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const navigate = useNavigate()
  const sirali = (kitapSiralama && kitapSiralama[rafId])
    ? kitapSiralama[rafId].map(id => liste.find(k => k.id === id)).filter(Boolean)
    : liste
  const kitapSayisi = sirali.length

  const [aktif, setAktif] = useState(0)
  const [dx, setDx] = useState(0)
  const [suruk, setSuruk] = useState(false)
  const drag = useRef({ startX: 0, startY: 0, active: false, moved: false, axis: null })
  const konteynerRef = useRef(null)

  const coverW = isMobile ? 242 : 312
  const coverH = Math.round(coverW * 1.5)
  const aralik = isMobile ? 158 : 214
  const konteynerH = coverH + 96

  useEffect(() => { setAktif(0); setDx(0) }, [rafId, kitapSayisi])

  useEffect(() => {
    if (!kitapSayisi || !sayfaYuklendi) return
    const t = setTimeout(() => {
      try { konteynerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }) } catch {}
    }, 90)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clamp = (v) => Math.max(0, Math.min(kitapSayisi - 1, v))

  function bitir(finalD) {
    const esik = aralik * 0.3
    if (finalD <= -esik) setAktif(a => clamp(a + 1))
    else if (finalD >= esik) setAktif(a => clamp(a - 1))
    setDx(0); setSuruk(false)
  }

  function onMouseDown(e) {
    if (e.button !== 0) return
    drag.current = { startX: e.clientX, startY: e.clientY, active: true, moved: false, axis: "x" }
    setSuruk(true)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }
  function onMouseMove(e) {
    if (!drag.current.active) return
    const d = e.clientX - drag.current.startX
    if (Math.abs(d) > 4) drag.current.moved = true
    setDx(d)
  }
  function onMouseUp(e) {
    if (!drag.current.active) return
    drag.current.active = false
    window.removeEventListener("mousemove", onMouseMove)
    window.removeEventListener("mouseup", onMouseUp)
    bitir(e.clientX - drag.current.startX)
  }

  useEffect(() => {
    const el = konteynerRef.current
    if (!el) return
    function ts(e) {
      const t = e.touches[0]
      drag.current = { startX: t.clientX, startY: t.clientY, active: true, moved: false, axis: null }
    }
    function tm(e) {
      if (!drag.current.active) return
      const t = e.touches[0]
      const dX = t.clientX - drag.current.startX
      const dY = t.clientY - drag.current.startY
      if (!drag.current.axis) {
        if (Math.abs(dX) > 6 || Math.abs(dY) > 6) {
          drag.current.axis = Math.abs(dX) >= Math.abs(dY) ? "x" : "y"
          if (drag.current.axis === "x") setSuruk(true)
        }
      }
      if (drag.current.axis === "x") {
        if (e.cancelable) e.preventDefault()
        if (Math.abs(dX) > 4) drag.current.moved = true
        setDx(dX)
      } else if (drag.current.axis === "y") {
        if (drag.current.active) { drag.current.active = false; setDx(0); setSuruk(false) }
      }
    }
    function te(e) {
      if (!drag.current.active) return
      drag.current.active = false
      const t = e.changedTouches[0]
      bitir(t.clientX - drag.current.startX)
    }
    el.addEventListener("touchstart", ts, { passive: true })
    el.addEventListener("touchmove", tm, { passive: false })
    el.addEventListener("touchend", te)
    el.addEventListener("touchcancel", te)
    return () => {
      el.removeEventListener("touchstart", ts)
      el.removeEventListener("touchmove", tm)
      el.removeEventListener("touchend", te)
      el.removeEventListener("touchcancel", te)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitapSayisi, aralik])

  if (!kitapSayisi) {
    return (
      <div style={{ padding: "20px", color: theme.textSecondary, fontSize: "13px", fontStyle: "italic" }}>
        Henüz eser eklenmemiş
      </div>
    )
  }

  const cur = Math.min(aktif, kitapSayisi - 1)
  const merkez = sirali[cur]

  function kapakTikla(i, merkezMi, e) {
    if (drag.current.moved) { if (e) e.preventDefault(); return }
    if (merkezMi) navigate(kitapYolu(sirali[i]))
    else setAktif(clamp(i))
  }

  return (
    <div style={{ padding: "12px 8px 6px" }}>
      <div
        ref={konteynerRef}
        onMouseDown={onMouseDown}
        style={{
          position: "relative",
          height: `${konteynerH}px`,
          overflow: "hidden",
          touchAction: "pan-y",
          cursor: suruk ? "grabbing" : "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {sirali.map((kitap, i) => {
          const offset = i - cur
          const eff = offset + dx / aralik
          const abs = Math.min(Math.abs(eff), 3)
          if (abs >= 2.6) return null
          const scale = Math.max(0.5, 1 - abs * 0.2)
          const blur = abs < 0.4 ? 0 : Math.min(abs * 1.5, 3.4)
          const opacity = Math.max(0.4, 1 - abs * 0.26)
          const merkezMi = Math.abs(eff) < 0.4
          return (
            <div
              key={kitap.id}
              onClick={(e) => kapakTikla(i, merkezMi, e)}
              style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                width: `${coverW}px`,
                marginLeft: `${-coverW / 2}px`,
                transform: `translateX(${eff * aralik}px) scale(${scale})`,
                transformOrigin: "center top",
                filter: blur ? `blur(${blur}px)` : "none",
                opacity,
                zIndex: 100 - Math.round(abs * 10),
                transition: suruk ? "none" : "transform 0.34s cubic-bezier(.22,.61,.36,1), filter 0.34s, opacity 0.34s",
                cursor: "pointer",
                pointerEvents: abs > 1.7 ? "none" : "auto",
              }}
            >
              <DinamikKapak kitap={kitap} alimId={alimId} coverW={coverW} coverH={coverH} />
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: "8px", minHeight: "38px" }}>
        <Link to={kitapYolu(merkez)} style={{ textDecoration: "none" }}>
          <div style={{
            fontSize: isMobile ? "15px" : "17px",
            fontFamily: kitapFontGetir(alimId) || "PlayfairDisplay, serif",
            color: theme.text,
            lineHeight: 1.3,
            padding: "0 44px",
          }}>
            {merkez.baslik}
          </div>
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "10px" }}>
        <button
          onClick={() => setAktif(a => clamp(a - 1))}
          disabled={cur === 0}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "34px", height: "34px", borderRadius: "50%",
            background: cur === 0 ? "transparent" : `${theme.accent}15`,
            border: `1px solid ${cur === 0 ? theme.border : theme.accent}55`,
            color: cur === 0 ? theme.border : theme.accent,
            cursor: cur === 0 ? "default" : "pointer",
          }}
        >
          <ChevronLeft size={19} />
        </button>
        <span style={{ fontSize: "12px", color: theme.textSecondary, minWidth: "48px", textAlign: "center" }}>
          {cur + 1} / {kitapSayisi}
        </span>
        <button
          onClick={() => setAktif(a => clamp(a + 1))}
          disabled={cur === kitapSayisi - 1}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "34px", height: "34px", borderRadius: "50%",
            background: cur === kitapSayisi - 1 ? "transparent" : `${theme.accent}15`,
            border: `1px solid ${cur === kitapSayisi - 1 ? theme.border : theme.accent}55`,
            color: cur === kitapSayisi - 1 ? theme.border : theme.accent,
            cursor: cur === kitapSayisi - 1 ? "default" : "pointer",
          }}
        >
          <ChevronRight size={19} />
        </button>
      </div>
    </div>
  )
}

// Özel/otomatik raflarda kitap satırı (DnD yok; dinamikse coverflow, değilse grid)
function RafSatiri({ kitaplar: liste, rafId, theme, dinamikMod, alimId, duzenlemeMode, onKitapSil }) {
  if (!liste || !liste.length) {
    return <div style={{ padding: "16px", color: theme.textSecondary, fontSize: "13px", fontStyle: "italic" }}>Kitap yok</div>
  }
  if (dinamikMod && !duzenlemeMode) {
    return <DinamikRaf kitaplar={liste} rafId={rafId} theme={theme} alimId={alimId} kitapSiralama={null} />
  }
  return (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", padding: "16px 16px 4px" }}>
      {liste.map(k => (
        <KitapKart
          key={k.id}
          kitap={k}
          theme={theme}
          alimId={alimId}
          onSil={duzenlemeMode && onKitapSil ? () => onKitapSil(k.id) : undefined}
        />
      ))}
    </div>
  )
}

function KitapRafi({ kitaplar: liste, rafId, duzenlemeMode, theme, sensors, kitapSiralama, setKitapSiralama, alimId, dinamikMod }) {
  if (liste.length === 0) {
    return (
      <div style={{ padding: "20px", color: theme.textSecondary, fontSize: "13px", fontStyle: "italic" }}>
        Henüz eser eklenmemiş
      </div>
    )
  }

  if (dinamikMod && !duzenlemeMode) {
    return (
      <DinamikRaf kitaplar={liste} rafId={rafId} theme={theme} alimId={alimId} kitapSiralama={kitapSiralama} />
    )
  }

  const sirali = kitapSiralama[rafId]
    ? kitapSiralama[rafId].map(id => liste.find(k => k.id === id)).filter(Boolean)
    : liste

  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over?.id) {
      setKitapSiralama(prev => {
        const l = prev[rafId] || liste.map(k => k.id)
        const eskiIndex = l.indexOf(active.id)
        const yeniIndex = l.indexOf(over.id)
        const yeni = { ...prev, [rafId]: arrayMove(l, eskiIndex, yeniIndex) }
        localStorage.setItem("vukuf-kitap-sira", JSON.stringify(yeni))
        return yeni
      })
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sirali.map(k => k.id)} strategy={horizontalListSortingStrategy}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", padding: "20px 16px 0" }}>
          {sirali.map(kitap => (
            <SortableKitap key={kitap.id} kitap={kitap} duzenlemeMode={duzenlemeMode} theme={theme} alimId={alimId} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// Göz (gizle/göster) düğmesi
function GozBtn({ gizli, onClick, theme }) {
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={gizli ? "Rafı göster" : "Rafı gizle"}
      style={{ display: "flex", alignItems: "center", cursor: "pointer", color: gizli ? theme.textSecondary : theme.accent, padding: "2px" }}
    >
      {gizli ? <EyeOff size={18} /> : <Eye size={18} />}
    </span>
  )
}

function SortableAlimRafi({ alim, duzenlemeMode, theme, sensors, kitapSiralama, setKitapSiralama, kitapArama, setKitapArama, dinamikMod, disArama }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: alim.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const [acik, setAcik] = useState(() => {
    const kayitli = localStorage.getItem(`vukuf-alim-rafi-${alim.id}`)
    return kayitli ? JSON.parse(kayitli) : false
  })

  const kitapAramaAcik = kitapArama[alim.id] !== undefined

  // Kısım aramasından gelen terim (dis) varsa raf zorla açılır ve kitaplar süzülür
  const dis = (disArama || "").trim()
  const filtreTerim = dis || (kitapArama[alim.id] || "")
  const gorunur = acik || dis !== ""

  const tumKitaplar = alim.altKategoriler
    ? alim.altKategoriler.flatMap(a => a.kitaplar)
    : alim.kitaplar

  const toggleAlimRafi = () => {
    const yeniDurum = !acik
    setAcik(yeniDurum)
    localStorage.setItem(`vukuf-alim-rafi-${alim.id}`, JSON.stringify(yeniDurum))
  }

  const handleKitapAramaClick = (e) => {
    e.stopPropagation()
    if (kitapAramaAcik) {
      const newState = { ...kitapArama }
      delete newState[alim.id]
      setKitapArama(newState)
    } else {
      if (!acik) {
        setAcik(true)
        localStorage.setItem(`vukuf-alim-rafi-${alim.id}`, JSON.stringify(true))
      }
      setKitapArama(prev => ({ ...prev, [alim.id]: "" }))
    }
  }

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: "8px", background: theme.background, borderRadius: "8px", overflow: "hidden", border: `1px solid ${theme.border}` }}>
      <button
        onClick={toggleAlimRafi}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: `${theme.accent}10`,
          color: theme.text,
          fontSize: "14px",
          fontFamily: "PlayfairDisplay, serif",
          cursor: "pointer",
          borderBottom: gorunur ? `1px solid ${theme.border}` : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {duzenlemeMode && (
            <span
              {...attributes}
              {...listeners}
              onClick={e => e.stopPropagation()}
              style={{ cursor: "grab", touchAction: "none", color: theme.textSecondary, display: "flex" }}
            >
              <GripVertical size={16} />
            </span>
          )}
          <span>{alim.isim}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{
            fontSize: "11px",
            color: theme.textSecondary,
            background: `${theme.accent}15`,
            borderRadius: "10px",
            padding: "1px 7px",
            flexShrink: 0,
          }}>
            {tumKitaplar.length}
          </span>

          {gorunur && (
            <span
              onClick={handleKitapAramaClick}
              style={{
                touchAction: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                borderRadius: "20px",
                background: kitapAramaAcik ? theme.accent : `${theme.accent}15`,
                color: kitapAramaAcik ? "#fff" : theme.text,
                border: `1px solid ${kitapAramaAcik ? theme.accent : theme.border}`,
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Search size={13} />
            </span>
          )}
        </div>
      </button>

      {gorunur && (
        <div style={{ animation: dinamikMod ? "vukuf-raf-ac 0.38s cubic-bezier(.22,.61,.36,1)" : "none" }}>
          {kitapAramaAcik && (
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.border}`, background: `${theme.accent}05` }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                background: theme.background, border: `1px solid ${theme.accent}40`,
                borderRadius: "24px", padding: "8px 16px",
              }}>
                <Search size={14} color={theme.accent} />
                <input
                  type="text"
                  placeholder="📚 Kitap ismi giriniz..."
                  value={kitapArama[alim.id] || ""}
                  onChange={(e) => setKitapArama(prev => ({ ...prev, [alim.id]: e.target.value }))}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "13px", color: theme.text }}
                  autoFocus
                />
                {kitapArama[alim.id] && (
                  <button
                    onClick={() => setKitapArama(prev => ({ ...prev, [alim.id]: "" }))}
                    style={{ display: "flex", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "2px" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {alim.altKategoriler ? (
            <div>
              {alim.altKategoriler.map(alt => {
                const filtrelenmisKitaplar = filtreTerim
                  ? alt.kitaplar.filter(kitap => trLower(kitap.baslik).includes(trLower(filtreTerim)))
                  : alt.kitaplar

                if (filtrelenmisKitaplar.length === 0 && filtreTerim) return null

                return (
                  <div key={alt.id}>
                    <div style={{ padding: "8px 16px", fontSize: "12px", color: theme.accent, fontWeight: "bold", letterSpacing: "1px", borderBottom: `1px solid ${theme.border}` }}>
                      {alt.baslik.toLocaleUpperCase('tr-TR')}
                    </div>
                    <KitapRafi
                      kitaplar={filtrelenmisKitaplar}
                      rafId={alt.id}
                      duzenlemeMode={duzenlemeMode}
                      theme={theme}
                      sensors={sensors}
                      kitapSiralama={kitapSiralama}
                      setKitapSiralama={setKitapSiralama}
                      alimId={alim.id}
                      dinamikMod={dinamikMod}
                    />
                    <div style={{ height: "8px", background: `linear-gradient(to bottom, ${theme.accent}40, ${theme.accent}20)`, borderTop: `2px solid ${theme.accent}60`, margin: "0 0 4px" }} />
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <KitapRafi
                kitaplar={filtreTerim
                  ? alim.kitaplar.filter(kitap => trLower(kitap.baslik).includes(trLower(filtreTerim)))
                  : alim.kitaplar
                }
                rafId={alim.id}
                duzenlemeMode={duzenlemeMode}
                theme={theme}
                sensors={sensors}
                kitapSiralama={kitapSiralama}
                setKitapSiralama={setKitapSiralama}
                alimId={alim.id}
                dinamikMod={dinamikMod}
              />
              <div style={{ height: "8px", background: `linear-gradient(to bottom, ${theme.accent}40, ${theme.accent}20)`, borderTop: `2px solid ${theme.accent}60`, margin: "4px 0 0" }} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SortableKategori({ kategori,
  duzenlemeMode, theme, sensors, kitapSiralama, setKitapSiralama,
  acikKategori, setAcikKategori, alimSira, handleAlimDragEnd,
  kategoriArama, setKategoriArama, kitapArama, setKitapArama, dinamikMod,
  gizlemeMod, gizli, onGizle }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: kategori.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const isMobile = useMediaQuery("(max-width: 768px)")
  const kuranRef = useRef(null)

  const aramaAcik = kategoriArama[kategori.id] !== undefined

  useEffect(() => {
    if (dinamikMod && kategori.kuran && acikKategori === kategori.id && sayfaYuklendi) {
      const t = setTimeout(() => {
        try { kuranRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }) } catch {}
      }, 100)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acikKategori, dinamikMod])

  const handleAramaClick = (e) => {
    e.stopPropagation()
    if (aramaAcik) {
      const newState = { ...kategoriArama }
      delete newState[kategori.id]
      setKategoriArama(newState)
    } else {
      if (acikKategori !== kategori.id) {
        setAcikKategori(kategori.id)
        localStorage.setItem("vukuf-acik-kategori", JSON.stringify(kategori.id))
      }
      setKategoriArama(prev => ({ ...prev, [kategori.id]: "" }))
    }
  }

  const kuranW = dinamikMod ? (isMobile ? 242 : 312) : 80
  const kuranH = dinamikMod ? Math.round(kuranW * 1.5) : 128

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: "32px", background: theme.surface, borderRadius: "16px", overflow: "hidden", border: `1px solid ${theme.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", opacity: gizli ? 0.55 : 1 }}>
      <div
        onClick={() => {
          const yeni = acikKategori === kategori.id ? null : kategori.id
          setAcikKategori(yeni)
          localStorage.setItem("vukuf-acik-kategori", JSON.stringify(yeni))
        }}
        style={{
          width: "100%", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: `linear-gradient(135deg, ${theme.accent}25, ${theme.accent}10)`,
          borderBottom: acikKategori === kategori.id ? `1px solid ${theme.border}` : "none",
          cursor: "pointer", color: theme.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {duzenlemeMode && (
            <span
              {...attributes}
              {...listeners}
              onClick={e => e.stopPropagation()}
              style={{ cursor: "grab", touchAction: "none", color: theme.accent, display: "flex" }}
            >
              <GripVertical size={20} />
            </span>
          )}
          {gizlemeMod && <GozBtn gizli={gizli} onClick={() => onGizle(kategori.id)} theme={theme} />}
          <span style={{ fontSize: "20px", fontFamily: "PlayfairDisplay, serif", letterSpacing: "2px", color: theme.accent }}>
            {kategori.baslik.toLocaleUpperCase('tr-TR')}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {acikKategori === kategori.id && (
            <button
              onClick={handleAramaClick}
              style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px",
                background: aramaAcik ? theme.accent : `${theme.accent}15`,
                color: aramaAcik ? "#fff" : theme.text,
                border: `1px solid ${aramaAcik ? theme.accent : theme.border}`,
                fontSize: "12px", cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <Search size={13} />
            </button>
          )}
          <span style={{ fontSize: "12px", color: theme.textSecondary }}>
            {kategori.kuran
              ? (acikKategori === kategori.id ? "▲" : "▼")
              : `${kategori.alimler.length} alim ${acikKategori === kategori.id ? "▲" : "▼"}`
            }
          </span>
        </div>
      </div>

      {acikKategori === kategori.id && (
        <div style={{ animation: dinamikMod ? "vukuf-raf-ac 0.4s cubic-bezier(.22,.61,.36,1)" : "none" }}>
          {aramaAcik && (
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                background: theme.background, border: `1px solid ${theme.accent}40`,
                borderRadius: "24px", padding: "8px 16px",
              }}>
                <Search size={14} color={theme.accent} />
                <input
                  type="text"
                  placeholder=""
                  value={kategoriArama[kategori.id] || ""}
                  onChange={(e) => setKategoriArama(prev => ({ ...prev, [kategori.id]: e.target.value }))}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "13px", color: theme.text }}
                  autoFocus={aramaAcik}
                />
                {kategoriArama[kategori.id] && (
                  <button
                    onClick={() => setKategoriArama(prev => ({ ...prev, [kategori.id]: "" }))}
                    style={{ display: "flex", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "2px" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", marginLeft: "8px" }}>
                Âlim veya kitap ismi giriniz...
              </div>
            </div>
          )}

          <div style={{ padding: "16px" }}>
            {kategori.kuran && (
              <div style={{ display: "flex", justifyContent: dinamikMod ? "center" : "flex-start", padding: dinamikMod ? "10px 0 6px" : 0 }}>
                <Link to="/kuran" style={{ textDecoration: "none" }}>
                  <div ref={kuranRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: `${kuranW}px`, transition: "width 0.3s" }}>
                    <div
                      style={{
                        width: `${kuranW}px`, height: `${kuranH}px`,
                        background: kategori.kuran.gorsel
                          ? `url(${kategori.kuran.gorsel}) center/cover no-repeat`
                          : kitapSirtiRengi(kategori.kuran.id),
                        borderRadius: dinamikMod ? "3px 9px 9px 3px" : "2px 6px 6px 2px",
                        boxShadow: dinamikMod
                          ? `inset -5px 0 10px rgba(0,0,0,0.3), inset 5px 0 6px rgba(255,255,255,0.12), 5px 10px 26px rgba(0,0,0,0.42)`
                          : `inset -3px 0 6px rgba(0,0,0,0.3), inset 3px 0 4px rgba(255,255,255,0.1), 2px 2px 6px rgba(0,0,0,0.3)`,
                        cursor: "pointer",
                        transition: "transform 0.2s, width 0.3s, height 0.3s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-6px)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                    >
                      {!kategori.kuran.gorsel && (
                        <span style={{
                          fontSize: dinamikMod ? "14px" : "8px", color: "white", textAlign: "center",
                          fontFamily: "PlayfairDisplay, serif", lineHeight: 1.3, wordBreak: "break-word", padding: "6px",
                        }}>
                          {kategori.kuran.baslik}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: dinamikMod ? "16px" : "10px", color: theme.textSecondary,
                      textAlign: "center", marginTop: "8px", maxWidth: `${kuranW}px`,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      fontFamily: dinamikMod ? "PlayfairDisplay, serif" : "inherit",
                    }}>
                      Kur'ân-ı Kerîm
                    </span>
                  </div>
                </Link>
              </div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleAlimDragEnd(e, kategori.id)}>
              <SortableContext
                items={alimSira[kategori.id] || kategori.alimler.map(a => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {(alimSira[kategori.id] || kategori.alimler.map(a => a.id))
                  .map(alimId => kategori.alimler.find(a => a.id === alimId))
                  .filter(Boolean)
                  .filter(alim => {
                    const arama = (kategoriArama[kategori.id] || "").trim()
                    if (arama === "") return true
                    const q = trLower(arama)
                    // Alim adı VEYA içindeki bir kitabın adı eşleşiyorsa göster (alt bölümlerde arama)
                    if (trLower(alim.isim).includes(q)) return true
                    const kitaplarA = alim.altKategoriler ? alim.altKategoriler.flatMap(a => a.kitaplar) : (alim.kitaplar || [])
                    return kitaplarA.some(k => trLower(k.baslik).includes(q))
                  })
                  .map(alim => (
                    <SortableAlimRafi
                      key={alim.id}
                      alim={alim}
                      duzenlemeMode={duzenlemeMode}
                      theme={theme}
                      sensors={sensors}
                      kitapSiralama={kitapSiralama}
                      setKitapSiralama={setKitapSiralama}
                      kitapArama={kitapArama}
                      setKitapArama={setKitapArama}
                      dinamikMod={dinamikMod}
                      disArama={(() => {
                        const arama = (kategoriArama[kategori.id] || "").trim()
                        if (!arama) return ""
                        // Alim adının kendisi eşleşiyorsa tüm kitaplarını göster (kitap süzme yok)
                        return trLower(alim.isim).includes(trLower(arama)) ? "" : arama
                      })()}
                    />
                  ))
                }
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}
    </div>
  )
}

// Özel rafın alt rafı — tıklayınca açılır (dinamikte varsayılan kapalı)
function OzelAltRaf({ raf, alt, liste, theme, dinamikMod, duzenlemeMode, aramaAktif,
  altDuzen, setAltDuzen, onAltRename, onAltSil, onKitapEkleAc, onKitapCikar, silinebilir }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: alt.id })
  const sstyle = { transform: CSS.Transform.toString(transform), transition }
  const [acik, setAcik] = useState(() => {
    try { const v = localStorage.getItem(`vukuf-ozelalt-${alt.id}`); if (v != null) return JSON.parse(v) } catch {}
    return !dinamikMod
  })
  const [aramaAcik, setAramaAcik] = useState(false)
  const [arama, setArama] = useState("")
  const gorunur = aramaAktif || acik || aramaAcik
  const toggle = () => { const y = !acik; setAcik(y); try { localStorage.setItem(`vukuf-ozelalt-${alt.id}`, JSON.stringify(y)) } catch {} }
  const duzenAd = altDuzen[alt.id]
  const altKaydet = () => { if (duzenAd != null && duzenAd.trim()) onAltRename(raf.id, alt.id, duzenAd.trim()); setAltDuzen(p => { const n = { ...p }; delete n[alt.id]; return n }) }
  const q = aramaAcik && arama.trim() ? normHarf(arama) : ""
  const gosterilen = q ? liste.filter(k => normHarf(k.baslik).includes(q)) : liste

  return (
    <div ref={setNodeRef} style={sstyle}>
      <div
        onClick={duzenAd != null ? undefined : toggle}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${theme.border}`, gap: "10px", cursor: duzenAd != null ? "default" : "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
          {duzenlemeMode && (
            <span
              {...attributes}
              {...listeners}
              onClick={e => e.stopPropagation()}
              style={{ cursor: "grab", touchAction: "none", color: theme.textSecondary, display: "flex", flexShrink: 0 }}
            >
              <GripVertical size={14} />
            </span>
          )}
          {duzenlemeMode && duzenAd != null ? (
            <input
              value={duzenAd}
              autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => setAltDuzen(p => ({ ...p, [alt.id]: e.target.value }))}
              onBlur={altKaydet}
              onKeyDown={e => { if (e.key === "Enter") altKaydet() }}
              style={{ fontSize: "12px", color: theme.accent, background: theme.background, border: `1px solid ${theme.accent}`, borderRadius: "6px", padding: "2px 8px", flex: 1, minWidth: 0 }}
            />
          ) : (
            <span style={{ fontSize: "12px", color: theme.accent, fontWeight: "bold", letterSpacing: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {alt.baslik.toLocaleUpperCase('tr-TR')}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {duzenlemeMode && duzenAd == null && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onKitapEkleAc(raf.id, alt.id) }}
                style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", background: `${theme.accent}15`, color: theme.accent, border: `1px solid ${theme.accent}40`, borderRadius: "20px", padding: "3px 10px", cursor: "pointer" }}
              >
                <Plus size={13} /> Kitap
              </button>
              <span onClick={e => { e.stopPropagation(); setAltDuzen(p => ({ ...p, [alt.id]: alt.baslik })) }} style={{ display: "flex", cursor: "pointer", color: theme.textSecondary }}>
                <Pencil size={13} />
              </span>
              {silinebilir && (
                <span onClick={e => { e.stopPropagation(); onAltSil(raf.id, alt.id) }} style={{ display: "flex", cursor: "pointer", color: "#c0392b" }}>
                  <Trash2 size={13} />
                </span>
              )}
            </>
          )}
          {duzenAd == null && <RafArama theme={theme} acik={aramaAcik} setAcik={(v) => { setAramaAcik(v); if (!v) setArama("") }} deger={arama} setDeger={setArama} />}
          <span style={{ fontSize: "11px", color: theme.textSecondary }}>{liste.length} {gorunur ? "▲" : "▼"}</span>
        </div>
      </div>
      {aramaAcik && (
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: theme.background, border: `1px solid ${theme.accent}40`, borderRadius: "24px", padding: "8px 14px" }}>
            <Search size={14} color={theme.accent} />
            <input
              value={arama} onChange={e => setArama(e.target.value)} placeholder="Bu alt rafta kitap ara..." autoFocus
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "13px", color: theme.text }}
            />
            {arama && (
              <button onClick={() => setArama("")} style={{ display: "flex", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
      {gorunur && q && gosterilen.length === 0 && (
        <div style={{ padding: "14px 16px", color: theme.textSecondary, fontSize: "13px", fontStyle: "italic" }}>Sonuç yok</div>
      )}
      {gorunur && !(q && gosterilen.length === 0) && (
        <RafSatiri
          kitaplar={gosterilen}
          rafId={`ozel-${alt.id}`}
          theme={theme}
          dinamikMod={dinamikMod}
          duzenlemeMode={duzenlemeMode}
          onKitapSil={(kid) => onKitapCikar(raf.id, alt.id, kid)}
        />
      )}
      <div style={{ height: "8px", background: `linear-gradient(to bottom, ${theme.accent}40, ${theme.accent}20)`, borderTop: `2px solid ${theme.accent}60`, margin: "0 0 4px" }} />
    </div>
  )
}

// Raf içi arama (özel/otomatik raflarda kitap başlığına göre)
function RafArama({ deger, setDeger, theme, acik, setAcik }) {
  return (
    <>
      <span
        onClick={(e) => { e.stopPropagation(); acik ? setAcik(false) : setAcik(true) }}
        title="Rafta ara"
        style={{
          display: "flex", alignItems: "center", padding: "4px 8px", borderRadius: "20px", cursor: "pointer",
          background: acik ? theme.accent : `${theme.accent}15`, color: acik ? "#fff" : theme.accent,
          border: `1px solid ${acik ? theme.accent : theme.border}`,
        }}
      >
        <Search size={13} />
      </span>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// ÖZEL RAF (kullanıcı oluşturur; birden fazla alt raf + kitap)
// ─────────────────────────────────────────────────────────────
function OzelKategori({ raf, havuz, theme, dinamikMod, duzenlemeMode, gizlemeMod, gizli, onGizle,
  onSil, onRename, onAltEkle, onAltSil, onAltRename, onKitapEkleAc, onKitapCikar, sensors, onAltSira }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: raf.id })
  const sstyle = { transform: CSS.Transform.toString(transform), transition }
  const [acik, setAcik] = useState(() => {
    try { const v = localStorage.getItem(`vukuf-ozel-acik-${raf.id}`); return v ? JSON.parse(v) : true } catch { return true }
  })
  const [isimDuzen, setIsimDuzen] = useState(null)
  const [silOnay, setSilOnay] = useState(false)
  const [altDuzen, setAltDuzen] = useState({})
  const [aramaAcik, setAramaAcik] = useState(false)
  const [arama, setArama] = useState("")

  const toggle = () => { const y = !acik; setAcik(y); try { localStorage.setItem(`vukuf-ozel-acik-${raf.id}`, JSON.stringify(y)) } catch {} }
  const toplam = (raf.altRaflar || []).reduce((n, a) => n + (a.kitapIdler || []).length, 0)
  const aramaAktif = aramaAcik && arama.trim() !== ""
  const q = aramaAktif ? normHarf(arama) : ""

  const isimKaydet = () => { if (isimDuzen != null && isimDuzen.trim()) onRename(raf.id, isimDuzen.trim()); setIsimDuzen(null) }

  return (
    <div ref={setNodeRef} style={{ ...sstyle, marginBottom: "32px", background: theme.surface, borderRadius: "16px", overflow: "hidden", border: `1px solid ${theme.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", opacity: gizli ? 0.55 : 1 }}>
      <div
        onClick={toggle}
        style={{
          width: "100%", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: `linear-gradient(135deg, ${theme.accent}25, ${theme.accent}10)`,
          borderBottom: acik ? `1px solid ${theme.border}` : "none", cursor: "pointer", color: theme.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          {duzenlemeMode && (
            <span
              {...attributes}
              {...listeners}
              onClick={e => e.stopPropagation()}
              style={{ cursor: "grab", touchAction: "none", color: theme.accent, display: "flex", flexShrink: 0 }}
            >
              <GripVertical size={20} />
            </span>
          )}
          {gizlemeMod && <GozBtn gizli={gizli} onClick={() => onGizle(raf.id)} theme={theme} />}
          {duzenlemeMode && <FolderPlus size={18} color={theme.accent} style={{ flexShrink: 0 }} />}
          {duzenlemeMode && isimDuzen != null ? (
            <input
              value={isimDuzen}
              autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => setIsimDuzen(e.target.value)}
              onBlur={isimKaydet}
              onKeyDown={e => { if (e.key === "Enter") isimKaydet() }}
              style={{ fontSize: "18px", fontFamily: "PlayfairDisplay, serif", color: theme.accent, background: theme.background, border: `1px solid ${theme.accent}`, borderRadius: "6px", padding: "2px 8px", flex: 1, minWidth: 0 }}
            />
          ) : (
            <span style={{ fontSize: "18px", fontFamily: "PlayfairDisplay, serif", letterSpacing: "1px", color: theme.accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {raf.baslik.toLocaleUpperCase('tr-TR')}
            </span>
          )}
          {duzenlemeMode && isimDuzen == null && (
            <span onClick={e => { e.stopPropagation(); setIsimDuzen(raf.baslik) }} style={{ display: "flex", cursor: "pointer", color: theme.textSecondary }}>
              <Pencil size={14} />
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {acik && <RafArama theme={theme} acik={aramaAcik} setAcik={(v) => { setAramaAcik(v); if (!v) setArama("") }} deger={arama} setDeger={setArama} />}
          {duzenlemeMode && (
            silOnay ? (
              <button
                onClick={e => { e.stopPropagation(); onSil(raf.id) }}
                style={{ fontSize: "12px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "8px", padding: "4px 10px", cursor: "pointer" }}
              >
                Sil?
              </button>
            ) : (
              <span onClick={e => { e.stopPropagation(); setSilOnay(true); setTimeout(() => setSilOnay(false), 3000) }} style={{ display: "flex", cursor: "pointer", color: "#c0392b" }}>
                <Trash2 size={16} />
              </span>
            )
          )}
          <span style={{ fontSize: "12px", color: theme.textSecondary }}>{toplam} kitap {acik ? "▲" : "▼"}</span>
        </div>
      </div>

      {acik && (
        <div style={{ animation: dinamikMod ? "vukuf-raf-ac 0.4s cubic-bezier(.22,.61,.36,1)" : "none", padding: "6px 0 10px" }}>
          {aramaAcik && (
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", background: theme.background, border: `1px solid ${theme.accent}40`, borderRadius: "24px", padding: "8px 14px" }}>
                <Search size={14} color={theme.accent} />
                <input
                  value={arama} onChange={e => setArama(e.target.value)} placeholder="Bu rafta kitap ara..." autoFocus
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "13px", color: theme.text }}
                />
                {arama && (
                  <button onClick={() => setArama("")} style={{ display: "flex", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => { const { active, over } = e; if (over && active.id !== over.id) onAltSira(raf.id, active.id, over.id) }}
          >
            <SortableContext items={(raf.altRaflar || []).map(a => a.id)} strategy={verticalListSortingStrategy}>
              {(raf.altRaflar || []).map(alt => {
                let liste = (alt.kitapIdler || []).map(id => havuz.get(id)).filter(Boolean)
                if (q) liste = liste.filter(k => normHarf(k.baslik).includes(q))
                if (aramaAktif && liste.length === 0) return null
                return (
                  <OzelAltRaf
                    key={alt.id}
                    raf={raf}
                    alt={alt}
                    liste={liste}
                    theme={theme}
                    dinamikMod={dinamikMod}
                    duzenlemeMode={duzenlemeMode}
                    aramaAktif={aramaAktif}
                    altDuzen={altDuzen}
                    setAltDuzen={setAltDuzen}
                    onAltRename={onAltRename}
                    onAltSil={onAltSil}
                    onKitapEkleAc={onKitapEkleAc}
                    onKitapCikar={onKitapCikar}
                    silinebilir={raf.altRaflar.length > 1}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
          {aramaAktif && (raf.altRaflar || []).every(alt => {
            let l = (alt.kitapIdler || []).map(id => havuz.get(id)).filter(Boolean)
            return l.filter(k => normHarf(k.baslik).includes(q)).length === 0
          }) && (
            <div style={{ padding: "14px 16px", color: theme.textSecondary, fontSize: "13px", fontStyle: "italic" }}>Sonuç yok</div>
          )}
          {duzenlemeMode && (
            <div style={{ padding: "8px 16px" }}>
              <button
                onClick={() => onAltEkle(raf.id)}
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", background: "transparent", color: theme.accent, border: `1px dashed ${theme.accent}`, borderRadius: "10px", padding: "8px 14px", cursor: "pointer" }}
              >
                <Plus size={15} /> Alt raf ekle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Otomatik raf (Son / Sık Okunanlar)
function OtomatikKategori({ rafId, baslik, Ikon, kitaplar: liste, theme, dinamikMod, duzenlemeMode, gizlemeMod, gizli, onGizle }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rafId })
  const sstyle = { transform: CSS.Transform.toString(transform), transition }
  const [acik, setAcik] = useState(() => {
    try { const v = localStorage.getItem(`vukuf-otom-acik-${rafId}`); return v ? JSON.parse(v) : true } catch { return true }
  })
  const [aramaAcik, setAramaAcik] = useState(false)
  const [arama, setArama] = useState("")
  const toggle = () => { const y = !acik; setAcik(y); try { localStorage.setItem(`vukuf-otom-acik-${rafId}`, JSON.stringify(y)) } catch {} }
  const q = aramaAcik && arama.trim() ? normHarf(arama) : ""
  const gosterilen = q ? liste.filter(k => normHarf(k.baslik).includes(q)) : liste

  return (
    <div ref={setNodeRef} style={{ ...sstyle, marginBottom: "32px", background: theme.surface, borderRadius: "16px", overflow: "hidden", border: `1px solid ${theme.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", opacity: gizli ? 0.55 : 1 }}>
      <div
        onClick={toggle}
        style={{
          width: "100%", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: `linear-gradient(135deg, ${theme.accent}25, ${theme.accent}10)`,
          borderBottom: acik ? `1px solid ${theme.border}` : "none", cursor: "pointer", color: theme.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {duzenlemeMode && (
            <span
              {...attributes}
              {...listeners}
              onClick={e => e.stopPropagation()}
              style={{ cursor: "grab", touchAction: "none", color: theme.accent, display: "flex", flexShrink: 0 }}
            >
              <GripVertical size={20} />
            </span>
          )}
          {gizlemeMod && <GozBtn gizli={gizli} onClick={() => onGizle(rafId)} theme={theme} />}
          <Ikon size={18} color={theme.accent} />
          <span style={{ fontSize: "18px", fontFamily: "PlayfairDisplay, serif", letterSpacing: "1px", color: theme.accent }}>
            {baslik.toLocaleUpperCase('tr-TR')}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {acik && <RafArama theme={theme} acik={aramaAcik} setAcik={(v) => { setAramaAcik(v); if (!v) setArama("") }} deger={arama} setDeger={setArama} />}
          <span style={{ fontSize: "12px", color: theme.textSecondary }}>{liste.length} kitap {acik ? "▲" : "▼"}</span>
        </div>
      </div>
      {acik && (
        <div style={{ animation: dinamikMod ? "vukuf-raf-ac 0.4s cubic-bezier(.22,.61,.36,1)" : "none", padding: "6px 0 10px" }}>
          {aramaAcik && (
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", background: theme.background, border: `1px solid ${theme.accent}40`, borderRadius: "24px", padding: "8px 14px" }}>
                <Search size={14} color={theme.accent} />
                <input
                  value={arama} onChange={e => setArama(e.target.value)} placeholder="Bu rafta kitap ara..." autoFocus
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "13px", color: theme.text }}
                />
                {arama && (
                  <button onClick={() => setArama("")} style={{ display: "flex", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
          {gosterilen.length === 0
            ? <div style={{ padding: "14px 16px", color: theme.textSecondary, fontSize: "13px", fontStyle: "italic" }}>Sonuç yok</div>
            : <RafSatiri kitaplar={gosterilen} rafId={rafId} theme={theme} dinamikMod={dinamikMod} duzenlemeMode={false} />}
        </div>
      )}
    </div>
  )
}

// ── Kitap seçici modal (tüm kitaplar arasından çoklu seçim)
function KitapSecici({ theme, tumKitaplar, mevcutIdler, onKapat, onEkle }) {
  const [q, setQ] = useState("")
  const [secili, setSecili] = useState(() => new Set())
  const mevcut = new Set(mevcutIdler || [])
  const filt = tumKitaplar.filter(k => trLower(k.baslik).includes(trLower(q)))
  const toggle = (id) => setSecili(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <>
      <div onClick={onKapat} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 500 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "18px",
        zIndex: 600, width: "min(440px, 92vw)", maxHeight: "82vh", display: "flex", flexDirection: "column",
        boxShadow: "0 12px 40px rgba(0,0,0,0.3)", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={{ fontSize: "16px", color: theme.text, fontFamily: "PlayfairDisplay, serif" }}>Kitap Seç</h3>
          <button onClick={onKapat} style={{ display: "flex", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: theme.background, border: `1px solid ${theme.accent}40`, borderRadius: "24px", padding: "8px 14px" }}>
            <Search size={15} color={theme.accent} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Kitap ismi giriniz..."
              autoFocus
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "14px", color: theme.text }}
            />
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filt.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: theme.textSecondary, fontSize: "14px" }}>Sonuç yok</div>
          )}
          {filt.map(k => {
            const ekli = mevcut.has(k.id)
            const sec = secili.has(k.id)
            return (
              <div
                key={k.id}
                onClick={() => !ekli && toggle(k.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px",
                  borderBottom: `1px solid ${theme.border}`, cursor: ekli ? "default" : "pointer",
                  background: sec ? `${theme.accent}12` : "transparent", opacity: ekli ? 0.5 : 1,
                }}
              >
                <div style={{
                  width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0,
                  border: `2px solid ${sec || ekli ? theme.accent : theme.border}`,
                  background: sec || ekli ? theme.accent : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {(sec || ekli) && <Check size={13} color="#fff" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "14px", color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.baslik}</div>
                  {ekli && <div style={{ fontSize: "11px", color: theme.textSecondary }}>zaten ekli</div>}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display: "flex", gap: "10px", padding: "14px 16px", borderTop: `1px solid ${theme.border}` }}>
          <button onClick={onKapat} style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "transparent", border: `1px solid ${theme.border}`, color: theme.textSecondary, cursor: "pointer", fontSize: "14px" }}>İptal</button>
          <button
            onClick={() => onEkle([...secili])}
            disabled={secili.size === 0}
            style={{ flex: 2, padding: "11px", borderRadius: "10px", background: secili.size ? theme.accent : `${theme.accent}55`, border: "none", color: "#fff", cursor: secili.size ? "pointer" : "default", fontSize: "14px", fontWeight: 600 }}
          >
            Ekle{secili.size ? ` (${secili.size})` : ""}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Yeni raf isim modalı
function YeniRafModal({ theme, isim, setIsim, onIptal, onDevam }) {
  return (
    <>
      <div onClick={onIptal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 500 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "18px",
        zIndex: 600, width: "min(400px, 92vw)", padding: "20px", boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", color: theme.text, fontFamily: "PlayfairDisplay, serif" }}>Yeni Raf</h3>
          <button onClick={onIptal} style={{ display: "flex", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <input
          value={isim}
          onChange={e => setIsim(e.target.value)}
          placeholder="Raf ismi (ör. Favorilerim)"
          autoFocus
          onKeyDown={e => { if (e.key === "Enter" && isim.trim()) onDevam() }}
          style={{ width: "100%", background: theme.background, border: `1px solid ${theme.accent}40`, borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: theme.text, outline: "none", marginBottom: "16px" }}
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onIptal} style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "transparent", border: `1px solid ${theme.border}`, color: theme.textSecondary, cursor: "pointer", fontSize: "14px" }}>İptal</button>
          <button
            onClick={() => isim.trim() && onDevam()}
            disabled={!isim.trim()}
            style={{ flex: 2, padding: "11px", borderRadius: "10px", background: isim.trim() ? theme.accent : `${theme.accent}55`, border: "none", color: "#fff", cursor: isim.trim() ? "pointer" : "default", fontSize: "14px", fontWeight: 600 }}
          >
            Kitap seç →
          </button>
        </div>
      </div>
    </>
  )
}

export default function Kutuphane() {
  const { theme } = useApp()
  const [acikKategori, setAcikKategori] = useState(() => {
    const kayitli = localStorage.getItem("vukuf-acik-kategori")
    return kayitli ? JSON.parse(kayitli) : null
  })
  const [duzenlemeMode, setDuzenlemeMode] = useState(false)
  const [dinamikMod, setDinamikMod] = useState(() => localStorage.getItem("vukuf-dinamik-mod") === "1")
  const [gizlemeMod, setGizlemeMod] = useState(false)
  const [genelArama, setGenelArama] = useState("")
  const [genelAramaAcik, setGenelAramaAcik] = useState(false)
  const [kategoriArama, setKategoriArama] = useState({})
  const [kitapArama, setKitapArama] = useState({})

  const [gizliRaflar, setGizliRaflar] = useState(() => gizliRaflarOku())
  const [ozelRaflar, setOzelRaflar] = useState(() => ozelRaflarOku())
  const [istatistik, setIstatistik] = useState(() => okumaKayitOku())

  const [yeniRafAcik, setYeniRafAcik] = useState(false)
  const [yeniRafIsim, setYeniRafIsim] = useState("")
  const [seciciAcik, setSeciciAcik] = useState(false)
  const [seciciHedef, setSeciciHedef] = useState(null)
  const [sifirlaSayac, setSifirlaSayac] = useState(0)
  const [gizliSifirlaSayac, setGizliSifirlaSayac] = useState(0)

  // Üst seviye rafların (Kısım + özel + Son/Sık) tek birleşik sıralaması
  const [ustSira, setUstSira] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("vukuf-ust-sira") || "null")
      if (Array.isArray(s)) return s
    } catch {}
    let kat = kategoriler.map(k => k.id)
    try {
      const ks = JSON.parse(localStorage.getItem("vukuf-kategori-sira") || "null")
      if (Array.isArray(ks)) kat = [...ks.filter(id => kategoriler.some(k => k.id === id)), ...kat.filter(id => !ks.includes(id))]
    } catch {}
    return [...kat, ...ozelRaflarOku().map(r => r.id), "son-okunanlar", "sik-okunanlar"]
  })
  const [alimSira, setAlimSira] = useState(() => {
    const kayitli = localStorage.getItem("vukuf-alim-sira")
    return kayitli ? JSON.parse(kayitli) : Object.fromEntries(kategoriler.map(k => [k.id, k.alimler.map(a => a.id)]))
  })
  const [kitapSiralama, setKitapSiralama] = useState(() => {
    const kayitli = localStorage.getItem("vukuf-kitap-sira")
    return kayitli ? JSON.parse(kayitli) : {}
  })

  const isMobile = useMediaQuery("(max-width: 768px)")

  const kuranKitap = useMemo(() => kuranKitabiGetir(kategoriler), [])
  const havuz = useMemo(() => kitapHavuzu(kitaplar, kuranKitap), [kuranKitap])
  const tumKitaplarSecim = useMemo(() => (kuranKitap ? [kuranKitap, ...kitaplar] : kitaplar), [kuranKitap])
  const sonListe = useMemo(() => sonOkunanlar(istatistik, havuz, 8), [istatistik, havuz])
  const sikListe = useMemo(() => sikOkunanlar(istatistik, havuz, 8), [istatistik, havuz])

  // Sayfa yüklendi bayrağı (coverflow auto-scroll için)
  useEffect(() => {
    const t = setTimeout(() => { sayfaYuklendi = true }, 600)
    return () => { clearTimeout(t); sayfaYuklendi = false }
  }, [])

  // Dinamik mod düğmesi Navbar'da — event ile senkron
  useEffect(() => {
    const handler = (e) => {
      const val = typeof e.detail === "boolean" ? e.detail : (localStorage.getItem("vukuf-dinamik-mod") === "1")
      setDinamikMod(val)
      if (val) setDuzenlemeMode(false)
    }
    window.addEventListener("vukuf-dinamik", handler)
    return () => window.removeEventListener("vukuf-dinamik", handler)
  }, [])

  useEffect(() => {
    if (!isMobile) return
    const viewport = window.visualViewport
    if (!viewport) return
    const zoomSifirla = () => {
      if (viewport.scale > 1) {
        const meta = document.querySelector('meta[name="viewport"]')
        if (meta) {
          meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
          setTimeout(() => { meta.content = 'width=device-width, initial-scale=1.0, user-scalable=yes' }, 50)
        }
      }
    }
    viewport.addEventListener('resize', zoomSifirla)
    return () => viewport.removeEventListener('resize', zoomSifirla)
  }, [isMobile])

  // ── Birleşik üst seviye raf listesi (Kısım + özel + Son/Sık)
  const kategoriMap = useMemo(() => new Map(kategoriler.map(k => [k.id, k])), [])
  const ozelMap = useMemo(() => new Map(ozelRaflar.map(r => [r.id, r])), [ozelRaflar])

  const varsayilanUst = [
    ...kategoriler.map(k => k.id),
    ...ozelRaflar.map(r => r.id),
    "son-okunanlar", "sik-okunanlar",
  ]
  const mevcutIdler = new Set([
    ...kategoriler.map(k => k.id),
    ...ozelRaflar.map(r => r.id),
    ...(sonListe.length ? ["son-okunanlar"] : []),
    ...(sikListe.length ? ["sik-okunanlar"] : []),
  ])
  // Tam sıra (gizliler dahil) → kalıcılık ve DnD için
  const tamSira = [
    ...ustSira.filter(id => mevcutIdler.has(id)),
    ...varsayilanUst.filter(id => mevcutIdler.has(id) && !ustSira.includes(id)),
  ]
  const hepsiGoster = duzenlemeMode && gizlemeMod
  const gorunenIdler = tamSira.filter(id => hepsiGoster || !gizliRaflar.includes(id))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleUstDragEnd(event) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oi = tamSira.indexOf(active.id)
      const ni = tamSira.indexOf(over.id)
      if (oi < 0 || ni < 0) return
      const yeni = arrayMove(tamSira, oi, ni)
      setUstSira(yeni)
      localStorage.setItem("vukuf-ust-sira", JSON.stringify(yeni))
    }
  }

  function handleAlimDragEnd(event, kategoriId) {
    const { active, over } = event
    if (active.id !== over?.id) {
      setAlimSira(prev => {
        const liste = prev[kategoriId] || []
        const eskiIndex = liste.indexOf(active.id)
        const yeniIndex = liste.indexOf(over.id)
        const yeni = { ...prev, [kategoriId]: arrayMove(liste, eskiIndex, yeniIndex) }
        localStorage.setItem("vukuf-alim-sira", JSON.stringify(yeni))
        return yeni
      })
    }
  }

  const handleGenelAramaClick = () => {
    if (genelAramaAcik) { setGenelAramaAcik(false); setGenelArama("") }
    else setGenelAramaAcik(true)
  }

  // ── Gizleme
  function gizleToggle(id) {
    setGizliRaflar(prev => {
      const yeni = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      gizliRaflarYaz(yeni)
      return yeni
    })
  }

  // ── Özel raf işlemleri
  function ozelKaydet(liste) { setOzelRaflar(liste); ozelRaflarYaz(liste) }
  function ustSiraKaydet(yeni) { setUstSira(yeni); localStorage.setItem("vukuf-ust-sira", JSON.stringify(yeni)) }
  function rafSil(rafId) {
    ozelKaydet(ozelRaflar.filter(r => r.id !== rafId))
    ustSiraKaydet(ustSira.filter(id => id !== rafId))
  }
  function rafRename(rafId, baslik) { ozelKaydet(ozelRaflar.map(r => r.id === rafId ? { ...r, baslik } : r)) }
  function altEkle(rafId) {
    ozelKaydet(ozelRaflar.map(r => r.id === rafId
      ? { ...r, altRaflar: [...(r.altRaflar || []), { id: yeniId("alt"), baslik: "Yeni Bölüm", kitapIdler: [] }] }
      : r))
  }
  function altSil(rafId, altId) {
    ozelKaydet(ozelRaflar.map(r => r.id === rafId ? { ...r, altRaflar: r.altRaflar.filter(a => a.id !== altId) } : r))
  }
  function altRename(rafId, altId, baslik) {
    ozelKaydet(ozelRaflar.map(r => r.id === rafId ? { ...r, altRaflar: r.altRaflar.map(a => a.id === altId ? { ...a, baslik } : a) } : r))
  }
  function altRafSira(rafId, aktifId, ustId) {
    ozelKaydet(ozelRaflar.map(r => {
      if (r.id !== rafId) return r
      const ids = r.altRaflar.map(a => a.id)
      const oi = ids.indexOf(aktifId), ni = ids.indexOf(ustId)
      if (oi < 0 || ni < 0) return r
      return { ...r, altRaflar: arrayMove(r.altRaflar, oi, ni) }
    }))
  }
  function kitapEkle(rafId, altId, ids) {
    ozelKaydet(ozelRaflar.map(r => r.id === rafId ? {
      ...r, altRaflar: r.altRaflar.map(a => a.id === altId
        ? { ...a, kitapIdler: [...a.kitapIdler, ...ids.filter(id => !a.kitapIdler.includes(id))] }
        : a)
    } : r))
  }
  function kitapCikar(rafId, altId, kitapId) {
    ozelKaydet(ozelRaflar.map(r => r.id === rafId ? {
      ...r, altRaflar: r.altRaflar.map(a => a.id === altId ? { ...a, kitapIdler: a.kitapIdler.filter(id => id !== kitapId) } : a)
    } : r))
  }
  function kitapEkleAc(rafId, altId) { setSeciciHedef({ tip: "mevcut", rafId, altId }); setSeciciAcik(true) }

  function yeniRafOlustur(isim, ids) {
    const raf = { id: yeniId("ozel"), baslik: isim || "Yeni Raf", altRaflar: [{ id: yeniId("alt"), baslik: "Kitaplar", kitapIdler: ids }] }
    ozelKaydet([...ozelRaflar, raf])
    // Sıraya Son/Sık'tan hemen önce yerleştir
    const arr = tamSira.slice()
    const idx = arr.indexOf("son-okunanlar")
    if (idx >= 0) arr.splice(idx, 0, raf.id); else arr.push(raf.id)
    ustSiraKaydet(arr)
  }

  function seciciOnayla(ids) {
    const h = seciciHedef
    if (h?.tip === "yeni-kitaplar") { yeniRafOlustur(yeniRafIsim, ids); setYeniRafIsim("") }
    else if (h?.tip === "mevcut") { kitapEkle(h.rafId, h.altId, ids) }
    setSeciciAcik(false); setSeciciHedef(null)
  }

  const seciciMevcut = useMemo(() => {
    if (seciciHedef?.tip !== "mevcut") return []
    const raf = ozelRaflar.find(r => r.id === seciciHedef.rafId)
    const alt = raf?.altRaflar.find(a => a.id === seciciHedef.altId)
    return alt?.kitapIdler || []
  }, [seciciHedef, ozelRaflar])

  // ── Sıfırla (3 onay)
  function sifirlaBas() {
    if (sifirlaSayac < 2) { setSifirlaSayac(s => s + 1); return }
    ;["vukuf-ust-sira", "vukuf-kategori-sira", "vukuf-alim-sira", "vukuf-kitap-sira", "vukuf-acik-kategori"].forEach(k => { try { localStorage.removeItem(k) } catch {} })
    gizliRaflarYaz([]); ozelRaflarYaz([]); okumaKayitSil()
    setUstSira([...kategoriler.map(k => k.id), "son-okunanlar", "sik-okunanlar"])
    setAlimSira(Object.fromEntries(kategoriler.map(k => [k.id, k.alimler.map(a => a.id)])))
    setKitapSiralama({})
    setAcikKategori(null)
    setGizliRaflar([]); setOzelRaflar([]); setIstatistik({})
    setSifirlaSayac(0)
  }

  function duzenleToggle() {
    setDuzenlemeMode(d => {
      if (d) { setSifirlaSayac(0); setGizlemeMod(false) }
      return !d
    })
  }

  const btnStil = (aktif) => ({
    display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "20px",
    background: aktif ? theme.accent : `${theme.accent}15`, color: aktif ? "#fff" : theme.text,
    border: `1px solid ${aktif ? theme.accent : theme.border}`, fontSize: "13px", cursor: "pointer", transition: "all 0.2s",
  })

  return (
    <div style={{
      position: "relative", maxWidth: "900px", margin: "0 auto", padding: "40px 24px",
      userSelect: "none", WebkitUserSelect: "none",
    }}>
      <style>{`
        @keyframes vukuf-raf-ac {
          from { opacity: 0; transform: scale(0.965) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Dinamik mod ipucu — Kitaplık başlığının üstünde (yer açmadan) */}
      {dinamikMod && (
        <div style={{
          position: "absolute", top: "14px", left: isMobile ? "25px" : "180px", right: "24px",
          fontSize: isMobile ? "11px" : "15px", color: theme.textSecondary,
          display: "flex", alignItems: "center", gap: "8px",
          animation: "fadeOut 5s forwards", pointerEvents: "none",
        }}>
          <Sparkles size={13} color={theme.accent} />
          Kapakları sağa-sola sürükleyerek kitaplar arasında gezinebilirsiniz.
        </div>
      )}

      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h1 style={{ fontSize: "28px", color: theme.text, letterSpacing: "1px", fontFamily: "PlayfairDisplay, serif" }}>
            Kitaplık
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={handleGenelAramaClick} style={btnStil(genelAramaAcik)}>
              <Search size={15} />
            </button>

            <button onClick={duzenleToggle} style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "8px",
              background: duzenlemeMode ? `${theme.accent}20` : "transparent",
              border: `1px solid ${duzenlemeMode ? theme.accent : theme.border}`,
              color: duzenlemeMode ? theme.accent : theme.textSecondary, fontSize: "13px", cursor: "pointer",
            }}>
              {duzenlemeMode ? <Check size={15} /> : <Pencil size={15} />}
              {duzenlemeMode ? "Bitti" : "Düzenle"}
            </button>
          </div>
        </div>

        {/* Düzenleme araç çubuğu: Raf Ekle + Göz + Sıfırla */}
        {duzenlemeMode && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
            <button
              onClick={() => { setYeniRafIsim(""); setYeniRafAcik(true) }}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", background: `${theme.accent}15`, color: theme.accent, border: `1px solid ${theme.accent}`, fontSize: "13px", cursor: "pointer" }}
            >
              <FolderPlus size={15} /> Raf Ekle
            </button>

            {/* Göz — raf gizleme yönetimi */}
            <button
              onClick={() => { setGizlemeMod(m => !m); setGizliSifirlaSayac(0) }}
              title="Rafları gizle / göster"
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "10px",
                background: gizlemeMod ? theme.accent : `${theme.accent}15`,
                color: gizlemeMod ? "#fff" : theme.accent,
                border: `1px solid ${theme.accent}`, fontSize: "13px", cursor: "pointer",
              }}
            >
              {gizlemeMod ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>

            {/* Gizlenenleri tümüyle göster (2 onay) — yalnızca gizleme modunda ve gizli raf varsa */}
            {gizlemeMod && gizliRaflar.length > 0 && (
              <button
                onClick={() => {
                  if (gizliSifirlaSayac < 1) { setGizliSifirlaSayac(1); return }
                  gizliRaflarYaz([]); setGizliRaflar([]); setGizliSifirlaSayac(0)
                }}
                title="Tüm gizli rafları göster"
                style={{
                  display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "10px",
                  background: gizliSifirlaSayac > 0 ? theme.accent : "transparent",
                  color: gizliSifirlaSayac > 0 ? "#fff" : theme.accent,
                  border: `1px solid ${theme.accent}`, fontSize: "13px", cursor: "pointer",
                }}
              >
                <RotateCcw size={14} />
                {gizliSifirlaSayac === 0 ? "Gizlileri göster" : "Emin misin? (1/2 — tekrar bas)"}
              </button>
            )}

            <button
              onClick={sifirlaBas}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px",
                background: sifirlaSayac > 0 ? "#c0392b" : "transparent",
                color: sifirlaSayac > 0 ? "#fff" : "#c0392b",
                border: `1px solid #c0392b`, fontSize: "13px", cursor: "pointer",
              }}
            >
              <RotateCcw size={15} />
              {sifirlaSayac === 0 ? "Sıfırla" : `Emin misin? (${sifirlaSayac}/3 — tekrar bas)`}
            </button>
            {sifirlaSayac > 0 && (
              <button onClick={() => setSifirlaSayac(0)} style={{ fontSize: "12px", background: "none", border: "none", color: theme.textSecondary, cursor: "pointer", textDecoration: "underline" }}>
                vazgeç
              </button>
            )}
          </div>
        )}

        {gizlemeMod && (
          <div style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Eye size={13} color={theme.accent} />
            Göz simgesine dokunarak rafları gizleyebilir/gösterebilirsiniz. Gizli raflar bu modda soluk görünür.
          </div>
        )}

        {genelAramaAcik && (
          <div style={{ marginBottom: "16px", background: theme.surface, border: `1px solid ${theme.accent}40`, borderRadius: "16px", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: theme.background, borderBottom: `1px solid ${theme.border}`, padding: "12px 16px" }}>
              <Search size={16} color={theme.accent} />
              <input
                type="text" placeholder="" value={genelArama}
                onChange={(e) => setGenelArama(e.target.value)}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "14px", color: theme.text }}
                autoFocus
              />
              {genelArama && (
                <button onClick={() => setGenelArama("")} style={{ display: "flex", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {genelArama && (
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {(() => {
                  const aramaKucuk = trLower(genelArama)
                  const sonuclar = []
                  kategoriler.forEach(kategori => {
                    kategori.alimler.forEach(alim => {
                      if (trLower(alim.isim).includes(aramaKucuk)) {
                        sonuclar.push({ tip: "alim", isim: alim.isim, kategori: kategori.baslik, alimId: alim.id, kategoriId: kategori.id })
                      }
                      const kitaplarL = alim.altKategoriler ? alim.altKategoriler.flatMap(a => a.kitaplar) : alim.kitaplar
                      kitaplarL.forEach(kitap => {
                        if (trLower(kitap.baslik).includes(aramaKucuk)) {
                          sonuclar.push({ tip: "kitap", baslik: kitap.baslik, yazar: alim.isim, kategori: kategori.baslik, kitapId: kitap.id, dosya: kitap.dosya })
                        }
                      })
                    })
                  })
                  if (sonuclar.length === 0) {
                    return <div style={{ padding: "20px", textAlign: "center", color: theme.textSecondary, fontSize: "14px" }}>Sonuç bulunamadı</div>
                  }
                  return sonuclar.map((s, i) => (
                    <div key={i}>
                      {s.tip === "kitap" ? (
                        <Link
                          to={`/kitap/${s.kitapId}`}
                          onClick={() => { setGenelArama(""); setGenelAramaAcik(false) }}
                          style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", color: theme.text, borderBottom: `1px solid ${theme.border}`, transition: "background 0.15s", textDecoration: "none" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = `${theme.accent}10`}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <BookOpen size={16} color={theme.accent} />
                          <div>
                            <div style={{ fontSize: "14px" }}>{s.baslik}</div>
                            <div style={{ fontSize: "11px", color: theme.textSecondary }}>{s.yazar} · {s.kategori}</div>
                          </div>
                        </Link>
                      ) : (
                        <div
                          onClick={() => { setGenelArama(""); setGenelAramaAcik(false); setAcikKategori(s.kategoriId) }}
                          style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", color: theme.text, borderBottom: `1px solid ${theme.border}`, cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = `${theme.accent}10`}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <Search size={16} color={theme.accent} />
                          <div>
                            <div style={{ fontSize: "14px" }}>{s.isim}</div>
                            <div style={{ fontSize: "11px", color: theme.textSecondary }}>{s.kategori}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            )}

            {!genelArama && (
              <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: theme.textSecondary }}>
                🔍 Kitap veya Âlim ismi giriniz...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tüm üst seviye raflar — tek birleşik sürüklenebilir liste */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleUstDragEnd}>
        <SortableContext items={gorunenIdler} strategy={verticalListSortingStrategy}>
          {gorunenIdler.map(id => {
            const gizli = gizliRaflar.includes(id)
            if (kategoriMap.has(id)) {
              const kategori = kategoriMap.get(id)
              return (
                <SortableKategori
                  key={id}
                  kategori={kategori}
                  duzenlemeMode={duzenlemeMode}
                  theme={theme}
                  sensors={sensors}
                  kategoriArama={kategoriArama}
                  setKategoriArama={setKategoriArama}
                  kitapSiralama={kitapSiralama}
                  setKitapSiralama={setKitapSiralama}
                  acikKategori={acikKategori}
                  setAcikKategori={setAcikKategori}
                  alimSira={alimSira}
                  handleAlimDragEnd={handleAlimDragEnd}
                  kitapArama={kitapArama}
                  setKitapArama={setKitapArama}
                  dinamikMod={dinamikMod}
                  gizlemeMod={gizlemeMod}
                  gizli={gizli}
                  onGizle={gizleToggle}
                />
              )
            }
            if (ozelMap.has(id)) {
              return (
                <OzelKategori
                  key={id}
                  raf={ozelMap.get(id)}
                  havuz={havuz}
                  theme={theme}
                  dinamikMod={dinamikMod}
                  duzenlemeMode={duzenlemeMode}
                  gizlemeMod={gizlemeMod}
                  gizli={gizli}
                  onGizle={gizleToggle}
                  onSil={rafSil}
                  onRename={rafRename}
                  onAltEkle={altEkle}
                  onAltSil={altSil}
                  onAltRename={altRename}
                  onKitapEkleAc={kitapEkleAc}
                  onKitapCikar={kitapCikar}
                  sensors={sensors}
                  onAltSira={altRafSira}
                />
              )
            }
            if (id === "son-okunanlar") {
              return (
                <OtomatikKategori
                  key={id} rafId="son-okunanlar" baslik="Son Okunanlar" Ikon={Clock} kitaplar={sonListe}
                  theme={theme} dinamikMod={dinamikMod} duzenlemeMode={duzenlemeMode}
                  gizlemeMod={gizlemeMod} gizli={gizli} onGizle={gizleToggle}
                />
              )
            }
            if (id === "sik-okunanlar") {
              return (
                <OtomatikKategori
                  key={id} rafId="sik-okunanlar" baslik="Sık Okunanlar" Ikon={Star} kitaplar={sikListe}
                  theme={theme} dinamikMod={dinamikMod} duzenlemeMode={duzenlemeMode}
                  gizlemeMod={gizlemeMod} gizli={gizli} onGizle={gizleToggle}
                />
              )
            }
            return null
          })}
        </SortableContext>
      </DndContext>

      {/* Modallar */}
      {yeniRafAcik && (
        <YeniRafModal
          theme={theme}
          isim={yeniRafIsim}
          setIsim={setYeniRafIsim}
          onIptal={() => { setYeniRafAcik(false); setYeniRafIsim("") }}
          onDevam={() => { setYeniRafAcik(false); setSeciciHedef({ tip: "yeni-kitaplar" }); setSeciciAcik(true) }}
        />
      )}
      {seciciAcik && (
        <KitapSecici
          theme={theme}
          tumKitaplar={tumKitaplarSecim}
          mevcutIdler={seciciMevcut}
          onKapat={() => { setSeciciAcik(false); setSeciciHedef(null) }}
          onEkle={seciciOnayla}
        />
      )}
    </div>
  )
}
