import { useState, useEffect } from "react"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import { useApp } from "../AppContext"
import { Link } from "react-router-dom"
import { kategoriler, kitapFontGetir } from "../data/kitaplar"
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
import { Pencil, Check, GripVertical, GripHorizontal, Search, X, BookOpen } from "lucide-react"

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
              fontFamily: kitapFontGetir(alimId) || "PlayfairDisplay, serif",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
            }}>
              {kitap.baslik.length > 20 ? kitap.baslik.slice(0, 20) + "…" : kitap.baslik}
            </span>
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
      </Link>
    </div>
  )
}

function KitapRafi({ kitaplar, rafId, duzenlemeMode, theme, sensors, kitapSiralama, setKitapSiralama, alimId }) {
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
            <SortableKitap key={kitap.id} kitap={kitap} duzenlemeMode={duzenlemeMode} theme={theme} alimId={alimId} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableAlimRafi({ alim, duzenlemeMode, theme, sensors, kitapSiralama, setKitapSiralama, kitapArama, setKitapArama }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: alim.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  
  // ── Alim Rafı açık/kapalı durumu (localStorage'dan oku)
  const [acik, setAcik] = useState(() => {
    const kayitli = localStorage.getItem(`vukuf-alim-rafi-${alim.id}`)
    return kayitli ? JSON.parse(kayitli) : false
  })
  
  const kitapAramaAcik = kitapArama[alim.id] !== undefined

  const tumKitaplar = alim.altKategoriler
    ? alim.altKategoriler.flatMap(a => a.kitaplar)
    : alim.kitaplar

  // ── Alim Rafı açma/kapama
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
        // Arama açılırken rafı da aç
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
        
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
  
          {/* Eser sayısı — her zaman görünsün */}
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

          {/* Mercek SADECE âlim bölümü AÇIKken göster */}
          {acik && (
            <button
              onClick={handleKitapAramaClick}
              style={{
                cursor: "grab", 
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
            </button>
          )}
        </div>
      </button>

      {acik && (
        <>
          {kitapAramaAcik && (
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.border}`, background: `${theme.accent}05` }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: theme.background,
                border: `1px solid ${theme.accent}40`,
                borderRadius: "24px",
                padding: "8px 16px",
              }}>
                <Search size={14} color={theme.accent} />
                <input
                  type="text"
                  placeholder="📚 Kitap ismi giriniz..."
                  value={kitapArama[alim.id] || ""}
                  onChange={(e) => setKitapArama(prev => ({ ...prev, [alim.id]: e.target.value }))}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "13px",
                    color: theme.text,
                  }}
                  autoFocus
                />
                {kitapArama[alim.id] && (
                  <button
                    onClick={() => setKitapArama(prev => ({ ...prev, [alim.id]: "" }))}
                    style={{
                      display: "flex",
                      color: theme.textSecondary,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Kitap listesi - filtreli (aynı kalacak) */}
          {alim.altKategoriler ? (
            <div>
              {alim.altKategoriler.map(alt => {
                const filtrelenmisKitaplar = kitapAramaAcik && kitapArama[alim.id]
                  ? alt.kitaplar.filter(kitap => 
                      kitap.baslik.toLowerCase().includes(kitapArama[alim.id].toLowerCase())
                    )
                  : alt.kitaplar

                if (filtrelenmisKitaplar.length === 0 && kitapArama[alim.id]) return null

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
                    />
                    <div style={{ height: "8px", background: `linear-gradient(to bottom, ${theme.accent}40, ${theme.accent}20)`, borderTop: `2px solid ${theme.accent}60`, margin: "0 0 4px" }} />
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <KitapRafi 
                kitaplar={kitapAramaAcik && kitapArama[alim.id]
                  ? alim.kitaplar.filter(kitap => 
                      kitap.baslik.toLowerCase().includes(kitapArama[alim.id].toLowerCase())
                    )
                  : alim.kitaplar
                } 
                rafId={alim.id} 
                duzenlemeMode={duzenlemeMode} 
                theme={theme} 
                sensors={sensors} 
                kitapSiralama={kitapSiralama} 
                setKitapSiralama={setKitapSiralama} 
                alimId={alim.id}
              />
              <div style={{ height: "8px", background: `linear-gradient(to bottom, ${theme.accent}40, ${theme.accent}20)`, borderTop: `2px solid ${theme.accent}60`, margin: "4px 0 0" }} />
            </>
          )}
        </>
      )}
    </div>
  )
}

function SortableKategori({ kategori, 
  duzenlemeMode, 
  theme, 
  sensors, 
  kitapSiralama, 
  setKitapSiralama, 
  acikKategori, 
  setAcikKategori, 
  alimSira, 
  handleAlimDragEnd, 
  kategoriArama, 
  setKategoriArama,
  kitapArama,
  setKitapArama }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: kategori.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  
  // Arama panelinin açık olup olmadığını kontrol et
  const aramaAcik = kategoriArama[kategori.id] !== undefined

  // Arama butonuna tıklama handler'ı
  const handleAramaClick = (e) => {
    e.stopPropagation()
    
    if (aramaAcik) {
      // Arama açıksa: SADECE aramayı kapat, kategori açık kalsın
      const newState = { ...kategoriArama }
      delete newState[kategori.id]
      setKategoriArama(newState)
    } else {
      // Arama kapalıysa: Önce kategoriyi aç (kapalıysa), sonra aramayı aç
      if (acikKategori !== kategori.id) {
        setAcikKategori(kategori.id)
        localStorage.setItem("vukuf-acik-kategori", JSON.stringify(kategori.id))
      }
      // Arama panelini aç
      setKategoriArama(prev => ({ ...prev, [kategori.id]: "" }))
    }
  }

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: "32px", background: theme.surface, borderRadius: "16px", overflow: "hidden", border: `1px solid ${theme.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div
        onClick={() => {
        const yeni = acikKategori === kategori.id ? null : kategori.id
        setAcikKategori(yeni)
        localStorage.setItem("vukuf-acik-kategori", JSON.stringify(yeni))
      }}
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
              style={{ cursor: "grab", touchAction: "none", color: theme.accent, display: "flex" }}
            >
              <GripVertical size={20} />
            </span>
          )}
          <span style={{ fontSize: "20px", fontFamily: "PlayfairDisplay, serif", letterSpacing: "2px", color: theme.accent }}>
            {kategori.baslik.toLocaleUpperCase('tr-TR')}
          </span>
        </div>
        
        {/* Sağ taraf - alim sayısı ve arama butonu */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Arama butonu - SADECE KATEGORİ AÇIKKEN GÖSTER */}
          {acikKategori === kategori.id && (
            <button
              onClick={handleAramaClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                borderRadius: "20px",
                background: aramaAcik ? theme.accent : `${theme.accent}15`,
                color: aramaAcik ? "#fff" : theme.text,
                border: `1px solid ${aramaAcik ? theme.accent : theme.border}`,
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
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
        <>
          {/* Arama paneli - sadece aramaAcik true ise göster */}
          {aramaAcik && (
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: theme.background,
                border: `1px solid ${theme.accent}40`,
                borderRadius: "24px",
                padding: "8px 16px",
              }}>
                <Search size={14} color={theme.accent} />
                <input
                  type="text"
                  placeholder=""
                  value={kategoriArama[kategori.id] || ""}
                  onChange={(e) => setKategoriArama(prev => ({ ...prev, [kategori.id]: e.target.value }))}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "13px",
                    color: theme.text,
                  }}
                  autoFocus={aramaAcik} // Sadece yeni açıldığında focus
                />
                {kategoriArama[kategori.id] && (
                  <button
                    onClick={() => setKategoriArama(prev => ({ ...prev, [kategori.id]: "" }))}
                    style={{
                      display: "flex",
                      color: theme.textSecondary,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", marginLeft: "8px" }}>
                Âlim ismi giriniz...
              </div>
            </div>
          )}

          {/* İçerik - her zaman göster */}
          <div style={{ padding: "16px" }}>
            {/* Kur'an-ı Kerîm özel rafı */}
            {kategori.kuran && (
              <Link to="/kuran" style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "80px" }}>
                  <div
                    style={{
                      width: "60px", height: "88px",
                      background: kategori.kuran.gorsel
                        ? `url(${kategori.kuran.gorsel}) center/cover no-repeat`
                        : kitapSirtiRengi(kategori.kuran.id),
                      borderRadius: "2px 6px 6px 2px",
                      boxShadow: `inset -3px 0 6px rgba(0,0,0,0.3), inset 3px 0 4px rgba(255,255,255,0.1), 2px 2px 6px rgba(0,0,0,0.3)`,
                      cursor: "pointer",
                      transition: "transform 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-6px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    {!kategori.kuran.gorsel && (
                      <span style={{
                        fontSize: "8px", color: "white", textAlign: "center",
                        fontFamily: "PlayfairDisplay, serif", lineHeight: 1.3,
                        wordBreak: "break-word",
                      }}>
                        {kategori.kuran.baslik}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: "10px", color: theme.textSecondary,
                    textAlign: "center", marginTop: "6px", width: "80px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    Kur'ân-ı Kerîm
                  </span>
                </div>
              </Link>
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
                    const arama = kategoriArama[kategori.id] || ""
                    return arama === "" ? true : alim.isim.toLowerCase().includes(arama.toLowerCase())
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
                    />
                  ))
                }
              </SortableContext>
            </DndContext>
          </div>
        </>
      )}
    </div>
  )
}

export default function Kutuphane() {
  const { theme } = useApp()
  const [acikKategori, setAcikKategori] = useState(() => {
  const kayitli = localStorage.getItem("vukuf-acik-kategori")
  return kayitli ? JSON.parse(kayitli) : null
})
  const [duzenlemeMode, setDuzenlemeMode] = useState(false)
  const [genelArama, setGenelArama] = useState("")
  const [genelAramaAcik, setGenelAramaAcik] = useState(false)
  const [kategoriArama, setKategoriArama] = useState({})
  const [kitapArama, setKitapArama] = useState({}) // YENİ
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

  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    if (!isMobile) return
    const viewport = window.visualViewport
    if (!viewport) return
    const zoomSifirla = () => {
      if (viewport.scale > 1) {
        const meta = document.querySelector('meta[name="viewport"]')
        if (meta) {
          meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
          setTimeout(() => {
            meta.content = 'width=device-width, initial-scale=1.0, user-scalable=yes'
          }, 50)
        }
      }
    }
    viewport.addEventListener('resize', zoomSifirla)
    return () => viewport.removeEventListener('resize', zoomSifirla)
  }, [isMobile])

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

  // Genel arama butonuna tıklama handler'ı
  const handleGenelAramaClick = () => {
    if (genelAramaAcik) {
      // Arama açıksa: SADECE aramayı kapat, değeri temizle
      setGenelAramaAcik(false)
      setGenelArama("")
    } else {
      // Arama kapalıysa: Aç
      setGenelAramaAcik(true)
    }
  }

  return (
    // Ana container — her zaman seçimi engelle
    <div style={{ 
      maxWidth: "900px", 
      margin: "0 auto", 
      padding: "40px 24px", 
      userSelect: "none",
      WebkitUserSelect: "none",
    }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "28px", color: theme.text, letterSpacing: "1px", fontFamily: "PlayfairDisplay, serif" }}>
            Kitaplık
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Genel Arama Butonu */}
            <button
              onClick={handleGenelAramaClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "20px",
                background: genelAramaAcik ? theme.accent : `${theme.accent}15`,
                color: genelAramaAcik ? "#fff" : theme.text,
                border: `1px solid ${genelAramaAcik ? theme.accent : theme.border}`,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Search size={15} />
              <span>{genelAramaAcik ? "" : ""}</span>
            </button>
            
            {/* Düzenle Butonu */}
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
              {duzenlemeMode ? "Bitti" : "Düzenle"}
            </button>
          </div>
        </div>

        {/* Genel arama paneli - sadece genelAramaAcik true ise göster */}
        {genelAramaAcik && (
          <div style={{
            marginBottom: "16px",
            background: theme.surface,
            border: `1px solid ${theme.accent}40`,
            borderRadius: "16px",
            overflow: "hidden",
          }}>
            {/* Arama input alanı */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: theme.background,
              borderBottom: `1px solid ${theme.border}`,
              padding: "12px 16px",
            }}>
              <Search size={16} color={theme.accent} />
              <input
                type="text"
                placeholder=""
                value={genelArama}
                onChange={(e) => setGenelArama(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "14px",
                  color: theme.text,
                }}
                autoFocus
              />
              {genelArama && (
                <button
                  onClick={() => setGenelArama("")}
                  style={{
                    display: "flex",
                    color: theme.textSecondary,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Arama sonuçları */}
            {genelArama && (
              <div style={{
                maxHeight: "400px",
                overflowY: "auto",
              }}>
                {(() => {
                  const aramaKucuk = genelArama.toLowerCase()
                  const sonuclar = []

                  kategoriler.forEach(kategori => {
                    kategori.alimler.forEach(alim => {
                      // Alim adı eşleşiyor mu
                      if (alim.isim.toLowerCase().includes(aramaKucuk)) {
                        sonuclar.push({
                          tip: "alim",
                          isim: alim.isim,
                          kategori: kategori.baslik,
                          alimId: alim.id,
                          kategoriId: kategori.id,
                        })
                      }
                      // Kitaplar
                      const kitaplar = alim.altKategoriler
                        ? alim.altKategoriler.flatMap(a => a.kitaplar)
                        : alim.kitaplar
                      kitaplar.forEach(kitap => {
                        if (kitap.baslik.toLowerCase().includes(aramaKucuk)) {
                          sonuclar.push({
                            tip: "kitap",
                            baslik: kitap.baslik,
                            yazar: alim.isim,
                            kategori: kategori.baslik,
                            kitapId: kitap.id,
                            dosya: kitap.dosya,
                          })
                        }
                      })
                    })
                  })

                  if (sonuclar.length === 0) {
                    return (
                      <div style={{ padding: "20px", textAlign: "center", color: theme.textSecondary, fontSize: "14px" }}>
                        Sonuç bulunamadı
                      </div>
                    )
                  }

                  return sonuclar.map((s, i) => (
                    <div key={i}>
                      {s.tip === "kitap" ? (
                        <Link
                          to={`/kitap/${s.kitapId}`}
                          onClick={() => {
                            setGenelArama("")
                            setGenelAramaAcik(false)
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            color: theme.text,
                            borderBottom: `1px solid ${theme.border}`,
                            transition: "background 0.15s",
                            textDecoration: "none",
                          }}
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
                          onClick={() => {
                            // Alime tıklayınca ilgili kategoriyi aç ve alimi göster
                            setGenelArama("")
                            setGenelAramaAcik(false)
                            setAcikKategori(s.kategoriId)
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            color: theme.text,
                            borderBottom: `1px solid ${theme.border}`,
                            cursor: "pointer",
                            transition: "background 0.15s",
                          }}
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

            {/* Arama ipucu */}
            {!genelArama && (
              <div style={{
                padding: "16px",
                textAlign: "center",
                fontSize: "12px",
                color: theme.textSecondary,
              }}>
                🔍 Kitap veya Âlim ismi giriniz...
              </div>
            )}
          </div>
        )}
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
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}