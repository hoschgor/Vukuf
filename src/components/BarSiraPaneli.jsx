import { useState, useEffect } from "react"
import {
  DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
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

// ════════════════════════════════════════════════════════════════
// BAR SATIR DAĞITIMI (ortak yardımcı)
// Alt bar tek satıra sığmazsa tarayıcının doğal sarması 1. satırı tıka basa doldurup
// son satırı neredeyse boş bırakır. Bunun yerine:
//   1) açgözlü paketleme ile GEREKEN satır sayısı (L) bulunur,
//   2) dinamik programlama ile öğeler tam L satıra, satır genişlikleri birbirine
//      en yakın olacak şekilde bölünür (hedef genişlikten sapmanın karesi en küçük),
//   3) kırma noktalarında hangi order değerine ayraç konacağı döner.
//
// birim : [{ o: order, w: genişlik }]  — GÖRSEL sırada, aynı order'ı paylaşanlar birleşik
// ic    : barın iç (padding hariç) genişliği
// bos   : öğeler arası yatay boşluk
// dönüş : { cokSatir, kes: [order, ...] }
// ════════════════════════════════════════════════════════════════
export function barSatirDagit(birim, ic, bos, gercekSatir = 0) {
  const n = birim.length
  if (n < 2 || !(ic > 0)) return { cokSatir: false, kes: [] }
  // 1) doğal satır sayısı (genişlik hesabından). Ayrıca DOM'da gerçekten kaç satıra
  //    indiği ölçülmüşse (gercekSatir) büyüğü alınır — hesap eksik kalırsa sağ/sol
  //    yaslaması bırakılmayıp barda kocaman boşluk kalmasın.
  let L = 1, gen = 0, adet = 0
  for (const b of birim) {
    const ek = adet ? bos + b.w : b.w
    if (adet && gen + ek > ic + 0.5) { L++; adet = 1; gen = b.w }
    else { adet++; gen += ek }
  }
  // Genişlik hesabı "tek satır" diyor ama DOM gerçekten sarmışsa: yaslamayı yine de bırak
  // (ortada kocaman boşluk kalmasın) ama AYRAÇ EKLEME. Ayraç eklersek bir sonraki ölçümde
  // gerçek satır okunamayacağı için karar geri döner ve açılıp kapanan bir salınım olur.
  if (L < 2) return gercekSatir >= 2 ? { cokSatir: true, kes: [] } : { cokSatir: false, kes: [] }
  // 2) kümülatif genişlikler → i..j aralığının genişliği
  const kum = [0]
  for (let i = 0; i < n; i++) kum.push(kum[i] + birim[i].w)
  const gW = (i, j) => kum[j] - kum[i] + bos * (j - i - 1)
  const hedef = (kum[n] + bos * (n - L)) / L
  const INF = Infinity
  let onc = new Array(n + 1).fill(INF); onc[0] = 0
  const iz = []
  for (let l = 1; l <= L; l++) {
    const cur = new Array(n + 1).fill(INF)
    const geri = new Array(n + 1).fill(-1)
    for (let j = l; j <= n; j++) {
      for (let i = l - 1; i < j; i++) {
        if (onc[i] === INF) continue
        const w = gW(i, j)
        if (w > ic + 0.5) continue
        const fark = hedef - w
        const c = onc[i] + fark * fark
        if (c < cur[j]) { cur[j] = c; geri[j] = i }
      }
    }
    iz.push(geri); onc = cur
  }
  if (onc[n] === INF) return { cokSatir: true, kes: [] }
  // 3) geri izleme → satır uzunlukları → kırma order'ları
  const uzun = []
  let j = n
  for (let l = L; l >= 1; l--) { const i = iz[l - 1][j]; uzun.unshift(j - i); j = i }
  const kes = []
  let idx = 0
  for (let i = 0; i < uzun.length - 1; i++) {
    idx += uzun[i]
    if (idx > 0 && idx < n) kes.push(Math.round((birim[idx - 1].o + birim[idx].o) / 2))
  }
  return { cokSatir: true, kes }
}

// Bar DOM'undan ölçüm alıp barSatirDagit'i çalıştırır. el = bar elemanı.
// Ayraçlar (data-bar-kes) ve görünmez öğeler ölçüme girmez; aynı order'lı çocuklar
// (ör. oto-kaydırma düğmesi + hız kutusu) tek birim sayılır ki araları bölünmesin.
export function barSatirOlc(el) {
  if (!el) return { cokSatir: false, kes: [] }
  const st = getComputedStyle(el)
  const bos = parseFloat(st.columnGap) || 0
  const ic = el.clientWidth - (parseFloat(st.paddingLeft) || 0) - (parseFloat(st.paddingRight) || 0)
  const cocuk = [...el.children].filter(x => x.dataset && x.dataset.barKes !== "1" && (x.offsetWidth || x.offsetHeight))
  const ayracVar = [...el.children].some(x => x.dataset && x.dataset.barKes === "1")
  // Ayraç YOKKEN (yani doğal sarma) DOM'daki gerçek satır sayısını da ölç: öğe yükseklikleri
  // farklı olduğundan offsetTop değil, DİKEY MERKEZ kümelenir (align-items: center).
  // Ayraç varken bu ölçüm kendi sonucumuzu geri okur → kullanılmaz (kilitlenme olmasın).
  let gercekSatir = 0
  if (!ayracVar && cocuk.length > 1) {
    const merkez = cocuk.map(x => x.offsetTop + x.offsetHeight / 2).sort((a, b) => a - b)
    gercekSatir = 1
    for (let i = 1; i < merkez.length; i++) if (merkez[i] - merkez[i - 1] > 3) gercekSatir++
  }
  const ham = cocuk
    .map(x => ({ o: parseInt(getComputedStyle(x).order, 10) || 0, w: x.offsetWidth }))
    .sort((a, b) => a.o - b.o)
  const birim = []
  for (const g of ham) {
    const s = birim[birim.length - 1]
    if (s && s.o === g.o) s.w += bos + g.w
    else birim.push({ o: g.o, w: g.w })
  }
  return barSatirDagit(birim, ic, bos, gercekSatir)
}

function SiraSatiri({ k, bilgi, taraf, onTaraf, theme, isMobile }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: k })
  const o = bilgi[k]
  if (!o) return null
  const Ikon = o.Ikon
  const yasBtn = (deger, Simge) => (
    <button
      // Bu düğmeler sürüklemeyi BAŞLATMASIN (satırın tamamı sürükleme tutamağı oldu).
      // MouseSensor onMouseDown, TouchSensor onTouchStart dinler → ikisi de durdurulur.
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
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
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        display: "flex", alignItems: "center", gap: "8px",
        padding: "7px 8px", borderRadius: "8px",
        background: theme.background,
        border: `1px solid ${isDragging ? theme.accent : theme.border}`,
        boxShadow: isDragging ? "0 6px 18px rgba(0,0,0,0.25)" : "none",
        marginBottom: "5px", position: "relative", zIndex: isDragging ? 5 : 1,
        // Satırın TAMAMI sürükleme tutamağı; yazı seçilmesin ki sürükleme kesilmesin
        cursor: isDragging ? "grabbing" : "grab",
        // manipulation → dikey kaydırma tarayıcıya kalır; sürükleme basılı tutmayla başlar.
        // (6 nokta tutamağı "none" alır → oradan anında ve kaydırmasız sürüklenir.)
        touchAction: "manipulation",
        userSelect: "none", WebkitUserSelect: "none", msUserSelect: "none",
        WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ color: theme.textSecondary, display: "flex", flexShrink: 0, touchAction: "none" }}>
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

  // PointerSensor DEĞİL, MouseSensor + TouchSensor: PointerSensor dokunmayı da mesafeyle
  // yakaladığı için parmak 5px kayar kaymaz sürükleme başlıyor ve liste AŞAĞI YUKARI
  // KAYDIRILAMIYORDU. Ayrım yapınca fare mesafeyle, dokunma ise kısa basılı tutmayla
  // başlar; parmak beklemeden kayarsa (tolerance) sürükleme iptal olur → kaydırma serbest.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 170, tolerance: 6 } }),
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
        className="vukuf-panel"
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
        <div data-panel-surukle="1" style={{ overflowY: "auto", overscrollBehavior: "contain", padding: "10px 14px", flex: 1 }}>
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
