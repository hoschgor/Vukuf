import { useState, useEffect } from "react"
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core"
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X, RotateCcw, Save, AlignLeft, AlignRight, ArrowLeft, Settings } from "lucide-react"

// ════════════════════════════════════════════════════════════════
// BAR SIRA PANELİ — alt bar butonlarının sırasını ve sol/sağ yaslamasını
// sürükle-bırak ile düzenleyen ortak panel. KuranOkuma ve OkumaEkrani aynı
// bileşeni kullanır ki davranış tek yerden değişsin.
//
// ogeler : [{ key, label, Ikon }]           — sıralanabilir bar öğeleri
// sira   : ["key", ...]                     — kayıtlı sıra
// taraf  : { key: "sol" | "sag" }           — kayıtlı yaslama
// acikMi : (key) => boolean                 — öğe şu an barda görünüyor mu (önizlemede soluk)
// onKaydet(yeniSira, yeniTaraf)             — Kaydet'e basılınca
// ════════════════════════════════════════════════════════════════

function SiraSatiri({ k, bilgi, taraf, onTaraf, theme, isMobile }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: k })
  const o = bilgi[k]
  if (!o) return null
  const Ikon = o.Ikon
  const yasBtn = (deger, Simge) => (
    <button
      onClick={(e) => { e.stopPropagation(); onTaraf(k, deger) }}
      title={deger === "sol" ? "Sola yasla" : "Sağa yasla"}
      style={{
        display: "flex", alignItems: "center", padding: "4px",
        borderRadius: "5px", cursor: "pointer",
        border: `1px solid ${taraf === deger ? theme.accent : theme.border}`,
        background: taraf === deger ? `${theme.accent}1e` : "transparent",
        color: taraf === deger ? theme.accent : theme.textSecondary,
      }}
    ><Simge size={12} /></button>
  )
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        display: "flex", alignItems: "center", gap: "8px",
        padding: "7px 8px", borderRadius: "8px",
        background: theme.background,
        border: `1px solid ${isDragging ? theme.accent : theme.border}`,
        boxShadow: isDragging ? "0 6px 18px rgba(0,0,0,0.25)" : "none",
        marginBottom: "5px", position: "relative", zIndex: isDragging ? 5 : 1,
      }}
    >
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: "grab", touchAction: "none", color: theme.textSecondary, display: "flex", flexShrink: 0 }}
      >
        <GripVertical size={16} />
      </span>
      {Ikon && <Ikon size={15} color={theme.accent} style={{ flexShrink: 0 }} />}
      <span style={{
        flex: 1, minWidth: 0, color: theme.text,
        fontSize: isMobile ? "12px" : "13px",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{o.label}</span>
      <span style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
        {yasBtn("sol", AlignLeft)}
        {yasBtn("sag", AlignRight)}
      </span>
    </div>
  )
}

export default function BarSiraPaneli({
  acik, kapat, ogeler, sira, taraf, acikMi, onKaydet, theme, isMobile,
}) {
  const bilgi = Object.fromEntries(ogeler.map(o => [o.key, o]))
  const varsayilanSira  = ogeler.map(o => o.key)
  const varsayilanTaraf = Object.fromEntries(ogeler.map(o => [o.key, o.taraf || "sol"]))

  const [siraTaslak, setSiraTaslak]   = useState(sira)
  const [tarafTaslak, setTarafTaslak] = useState(taraf)
  const [sifirlaOnay, setSifirlaOnay] = useState(false)

  // Panel her açılışta kayıtlı değerlerden başlar
  useEffect(() => {
    if (acik) { setSiraTaslak(sira); setTarafTaslak(taraf); setSifirlaOnay(false) }
  }, [acik])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (!acik) return null

  return (
    <div
      onClick={kapat}
      style={{
        position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: isMobile ? "340px" : "410px",
          maxHeight: "84vh", display: "flex", flexDirection: "column",
          background: theme.background, border: `1px solid ${theme.border}`,
          borderRadius: "14px", boxShadow: "0 12px 40px rgba(0,0,0,0.35)", overflow: "hidden",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", borderBottom: `1px solid ${theme.border}`,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "7px", color: theme.text, fontSize: isMobile ? "14px" : "15px", fontWeight: 600 }}>
            <GripVertical size={16} color={theme.accent} /> Buton Sıralaması
          </span>
          <button onClick={kapat} style={{
            background: "transparent", border: "none", color: theme.textSecondary,
            cursor: "pointer", padding: "4px", display: "flex",
          }} aria-label="Kapat"><X size={17} /></button>
        </div>

        {/* Canlı önizleme — sol/sağ ayrılmış; kapalı butonlar soluk */}
        <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: theme.textSecondary, opacity: 0.7, marginBottom: "6px" }}>Önizleme</div>
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 8px", borderRadius: "9px",
            background: `${theme.accent}0d`, border: `1px solid ${theme.border}`,
          }}>
            {["sol", "sag"].map(t => (
              <span key={t} style={{
                display: "flex", alignItems: "center", gap: "6px",
                ...(t === "sag" ? { marginLeft: "auto" } : {}),
              }}>
                {siraTaslak.filter(k => (tarafTaslak[k] || "sol") === t).map(k => {
                  const o = bilgi[k]; if (!o || !o.Ikon) return null
                  const I = o.Ikon
                  return <I key={k} size={15} color={theme.accent} style={{ opacity: acikMi(k) ? 1 : 0.22 }} />
                })}
              </span>
            ))}
          </div>
          <div style={{ fontSize: "10px", color: theme.textSecondary, opacity: 0.65, marginTop: "5px" }}>
            Soluk simgeler kapalı butonlardır.
          </div>
        </div>

        {/* Sürüklenebilir liste */}
        <div style={{ overflowY: "auto", padding: "10px 14px", flex: 1 }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (over && active.id !== over.id) {
                setSiraTaslak(prev => arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id)))
              }
            }}
          >
            <SortableContext items={siraTaslak} strategy={verticalListSortingStrategy}>
              {siraTaslak.map(k => (
                <SiraSatiri
                  key={k}
                  k={k}
                  bilgi={bilgi}
                  taraf={tarafTaslak[k] || "sol"}
                  onTaraf={(key, deger) => setTarafTaslak(prev => ({ ...prev, [key]: deger }))}
                  theme={theme}
                  isMobile={isMobile}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Sıfırla (çift onay) / Kaydet */}
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${theme.border}`, display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              if (!sifirlaOnay) { setSifirlaOnay(true); return }
              setSiraTaslak(varsayilanSira); setTarafTaslak(varsayilanTaraf); setSifirlaOnay(false)
            }}
            style={{
              flex: 1, padding: "10px 8px", borderRadius: "9px", cursor: "pointer",
              border: `1px solid ${sifirlaOnay ? "#c0392b" : theme.border}`,
              background: sifirlaOnay ? "#c0392b12" : "transparent",
              color: sifirlaOnay ? "#c0392b" : theme.textSecondary,
              fontSize: isMobile ? "12px" : "13px", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
            }}
          >
            <RotateCcw size={14} />
            {sifirlaOnay ? "Emin misin?" : "Sıfırla"}
          </button>
          <button
            onClick={() => onKaydet(siraTaslak, tarafTaslak)}
            style={{
              flex: 1, padding: "10px 8px", borderRadius: "9px", border: "none",
              background: theme.accent, color: "#fff", cursor: "pointer",
              fontSize: isMobile ? "12px" : "13px", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
            }}
          >
            <Save size={14} /> Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}
