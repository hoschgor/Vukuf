import { useState } from "react"
import { useApp } from "../AppContext"
import { Link } from "react-router-dom"
import { kategoriler } from "../data/kitaplar"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { Pencil, Check, GripVertical, GripHorizontal } from "lucide-react"

const kitapRenkleri = [
  "#8B4513", "#A0522D", "#6B3A2A", "#7B3F00",
  "#556B2F", "#2F4F4F", "#1C3A5E", "#4A235A",
  "#7D3C3C", "#2C5F2E",
]

function kitapSirtiRengi(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i)
  return kitapRenkleri[hash % kitapRenkleri.length]
}

function SortableKitap({ kitap, duzenlemeMode, theme }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: kitap.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={{ ...style, position: "relative" }}>
      {duzenlemeMode && (
        <div
          {...attributes}
          {...listeners}
          style={{
            position: "absolute",
            top: "2px",
            right: "2px",
            zIndex: 10,
            cursor: "grab",
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "80px" }}>
          <div
            style={{
              width: "60px",
              height: "88px",
              background: kitapSirtiRengi(kitap.id),
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
            <div style={{ position: "absolute", left: "6px", top: 0, bottom: 0, width: "2px", background: "rgba(0,0,0,0.2)" }} />
            <span style={{
              fontSize: "8px",
              color: "rgba(255,255,255,0.85)",
              textAlign: "center",
              lineHeight: "1.3",
              fontFamily: "PlayfairDisplay, serif",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
            }}>
              {kitap.baslik.length > 20 ? kitap.baslik.slice(0, 20) + "…" : kitap.baslik}
            </span>
          </div>
          <div style={{
            fontSize: "10px",
            color: theme.textSecondary,
            textAlign: "center",
            marginTop: "6px",
            lineHeight: "1.3",
            maxWidth: "80px",
          }}>
            {kitap.baslik.length > 25 ? kitap.baslik.slice(0, 25) + "…" : kitap.baslik}
          </div>
        </div>
      </Link>
    </div>
  )
}

function KitapRafi({ kitaplar, rafId, duzenlemeMode, theme, sensors, kitapSiralama, setKitapSiralama }) {
  if (kitaplar.length === 0) {
    return (
      <div style={{ padding: "20px", color: theme.textSecondary, fontSize: "13px", fontStyle: "italic" }}>
        Henüz eser eklenmemiş
      </div>
    )
  }

  const sirali = kitapSiralama[rafId]
    ? kitapSiralama[rafId].map(id => kitaplar.find(k => k.id === id)).filter(Boolean)
    : kitaplar

  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over?.id) {
      setKitapSiralama(prev => {
        const liste = prev[rafId] || kitaplar.map(k => k.id)
        const eskiIndex = liste.indexOf(active.id)
        const yeniIndex = liste.indexOf(over.id)
        const yeni = { ...prev, [rafId]: arrayMove(liste, eskiIndex, yeniIndex) }
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
            <SortableKitap key={kitap.id} kitap={kitap} duzenlemeMode={duzenlemeMode} theme={theme} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableAlimRafi({ alim, duzenlemeMode, theme, sensors, kitapSiralama, setKitapSiralama }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: alim.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [acik, setAcik] = useState(false)

  const tumKitaplar = alim.altKategoriler
    ? alim.altKategoriler.flatMap(a => a.kitaplar)
    : alim.kitaplar

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: "8px", background: theme.background, borderRadius: "8px", overflow: "hidden", border: `1px solid ${theme.border}` }}>
      <button
        onClick={() => setAcik(!acik)}
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
          borderBottom: acik ? `1px solid ${theme.border}` : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {duzenlemeMode && (
            <span
              {...attributes}
              {...listeners}
              onClick={e => e.stopPropagation()}
              style={{ cursor: "grab", color: theme.textSecondary, display: "flex" }}
            >
              <GripVertical size={16} />
            </span>
          )}
          <span>{alim.isim}</span>
        </div>
        <span style={{ fontSize: "11px", color: theme.textSecondary }}>
          {tumKitaplar.length > 0 ? `${tumKitaplar.length} eser` : "Yakında"} {acik ? "▲" : "▼"}
        </span>
      </button>

      {acik && (
        alim.altKategoriler ? (
          <div>
            {alim.altKategoriler.map(alt => (
              <div key={alt.id}>
                <div style={{ padding: "8px 16px", fontSize: "12px", color: theme.accent, fontWeight: "bold", letterSpacing: "1px", borderBottom: `1px solid ${theme.border}` }}>
                  {alt.baslik.toUpperCase()}
                </div>
                <KitapRafi kitaplar={alt.kitaplar} rafId={alt.id} duzenlemeMode={duzenlemeMode} theme={theme} sensors={sensors} kitapSiralama={kitapSiralama} setKitapSiralama={setKitapSiralama} />
                <div style={{ height: "8px", background: `linear-gradient(to bottom, ${theme.accent}40, ${theme.accent}20)`, borderTop: `2px solid ${theme.accent}60`, margin: "0 0 4px" }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <KitapRafi kitaplar={alim.kitaplar} rafId={alim.id} duzenlemeMode={duzenlemeMode} theme={theme} sensors={sensors} kitapSiralama={kitapSiralama} setKitapSiralama={setKitapSiralama} />
            <div style={{ height: "8px", background: `linear-gradient(to bottom, ${theme.accent}40, ${theme.accent}20)`, borderTop: `2px solid ${theme.accent}60`, margin: "4px 0 0" }} />
          </>
        )
      )}
    </div>
  )
}

function SortableKategori({ kategori, duzenlemeMode, theme, sensors, kitapSiralama, setKitapSiralama, acikKategori, setAcikKategori, alimSira, handleAlimDragEnd }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: kategori.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: "32px", background: theme.surface, borderRadius: "16px", overflow: "hidden", border: `1px solid ${theme.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <button
        onClick={() => setAcikKategori(acikKategori === kategori.id ? null : kategori.id)}
        style={{
          width: "100%",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${theme.accent}25, ${theme.accent}10)`,
          borderBottom: acikKategori === kategori.id ? `1px solid ${theme.border}` : "none",
          cursor: "pointer",
          color: theme.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {duzenlemeMode && (
            <span
              {...attributes}
              {...listeners}
              onClick={e => e.stopPropagation()}
              style={{ cursor: "grab", color: theme.accent, display: "flex" }}
            >
              <GripVertical size={20} />
            </span>
          )}
          <span style={{ fontSize: "20px", fontFamily: "PlayfairDisplay, serif", letterSpacing: "2px", color: theme.accent }}>
            {kategori.baslik.toUpperCase()}
          </span>
        </div>
        <span style={{ fontSize: "12px", color: theme.textSecondary }}>
          {kategori.alimler.length} alim {acikKategori === kategori.id ? "▲" : "▼"}
        </span>
      </button>

      {acikKategori === kategori.id && (
        <div style={{ padding: "16px" }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleAlimDragEnd(e, kategori.id)}>
            <SortableContext
              items={alimSira[kategori.id] || kategori.alimler.map(a => a.id)}
              strategy={verticalListSortingStrategy}
            >
              {(alimSira[kategori.id] || kategori.alimler.map(a => a.id))
                .map(alimId => kategori.alimler.find(a => a.id === alimId))
                .filter(Boolean)
                .map(alim => (
                  <SortableAlimRafi
                    key={alim.id}
                    alim={alim}
                    duzenlemeMode={duzenlemeMode}
                    theme={theme}
                    sensors={sensors}
                    kitapSiralama={kitapSiralama}
                    setKitapSiralama={setKitapSiralama}
                  />
                ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}

export default function Kutuphane() {
  const { theme } = useApp()
  const [acikKategori, setAcikKategori] = useState(null)
  const [duzenlemeMode, setDuzenlemeMode] = useState(false)

  const [kategoriSira, setKategoriSira] = useState(() => {
    const kayitli = localStorage.getItem("vukuf-kategori-sira")
    return kayitli ? JSON.parse(kayitli) : kategoriler.map(k => k.id)
  })

  const [alimSira, setAlimSira] = useState(() => {
    const kayitli = localStorage.getItem("vukuf-alim-sira")
    return kayitli ? JSON.parse(kayitli) : Object.fromEntries(kategoriler.map(k => [k.id, k.alimler.map(a => a.id)]))
  })

  const [kitapSiralama, setKitapSiralama] = useState(() => {
    const kayitli = localStorage.getItem("vukuf-kitap-sira")
    return kayitli ? JSON.parse(kayitli) : {}
  })

  const siralanmisKategoriler = kategoriSira.map(id => kategoriler.find(k => k.id === id)).filter(Boolean)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleKategoriDragEnd(event) {
    const { active, over } = event
    if (active.id !== over?.id) {
      setKategoriSira(prev => {
        const eskiIndex = prev.indexOf(active.id)
        const yeniIndex = prev.indexOf(over.id)
        const yeni = arrayMove(prev, eskiIndex, yeniIndex)
        localStorage.setItem("vukuf-kategori-sira", JSON.stringify(yeni))
        return yeni
      })
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

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", color: theme.text, letterSpacing: "1px", fontFamily: "PlayfairDisplay, serif" }}>
          Kitaplık
        </h1>
        <button
          onClick={() => setDuzenlemeMode(!duzenlemeMode)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "8px",
            background: duzenlemeMode ? `${theme.accent}20` : "transparent",
            border: `1px solid ${duzenlemeMode ? theme.accent : theme.border}`,
            color: duzenlemeMode ? theme.accent : theme.textSecondary,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          {duzenlemeMode ? <Check size={15} /> : <Pencil size={15} />}
          {duzenlemeMode ? "Bitti" : "Rafları Düzenle"}
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleKategoriDragEnd}>
        <SortableContext items={kategoriSira} strategy={verticalListSortingStrategy}>
          {siralanmisKategoriler.map(kategori => (
            <SortableKategori
              key={kategori.id}
              kategori={kategori}
              duzenlemeMode={duzenlemeMode}
              theme={theme}
              sensors={sensors}
              kitapSiralama={kitapSiralama}
              setKitapSiralama={setKitapSiralama}
              acikKategori={acikKategori}
              setAcikKategori={setAcikKategori}
              alimSira={alimSira}
              handleAlimDragEnd={handleAlimDragEnd}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}