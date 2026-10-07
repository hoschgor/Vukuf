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
  MouseSensor,
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
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Pencil, Check, GripVertical, GripHorizontal, Search, X, BookOpen, Sparkles,
  ChevronLeft, ChevronRight, ChevronDown, Eye, EyeOff, Plus, Trash2, Clock, Star, FolderPlus, RotateCcw,
} from "lucide-react"

// ════════════════════════════════════════════════════════════════
// SÜRÜKLEME ERGONOMİSİ
// Düzenleme modu AÇIKKEN satırın/kartın TAMAMI sürükleme tutamağıdır (yalnız 6 nokta
// simgesi değil) ve yazılar seçilemez — seçim başlarsa sürükleme kesiliyordu.
// Düzenleme modu KAPALIYKEN hiçbir şey değişmez: props boş döner, stil eklenmez.
//
// Satırın içindeki gerçek denetimler (arama düğmesi, göz, yeniden adlandırma girdisi,
// sil...) sürüklemeyi başlatmasın diye olay hedefi currentTarget'a kadar yürünür;
// yol üzerinde etkileşimli bir eleman ya da data-nodrag varsa sürükleme başlatılmaz.
// ════════════════════════════════════════════════════════════════
const SURUKLEME_DISI = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"])

function surukleEngel(e) {
  let n = e.target
  while (n && n !== e.currentTarget) {
    if (n.tagName && SURUKLEME_DISI.has(n.tagName)) return true
    if (n.dataset && n.dataset.nodrag === "1") return true
    n = n.parentNode
  }
  return false
}

// hepsi=true → hedef ayrımı yapılmaz (ör. kitap kartı: içeriğin tamamı <a>)
function surukleProps(aktif, attributes, listeners, hepsi = false) {
  if (!aktif) return {}
  if (hepsi) return { ...attributes, ...listeners }
  const sarmalanmis = {}
  for (const k in listeners) {
    const fn = listeners[k]
    sarmalanmis[k] = (e) => { if (surukleEngel(e)) return; if (fn) fn(e) }
  }
  return { ...attributes, ...sarmalanmis }
}

const surukleStil = (aktif) => aktif ? {
  cursor: "grab",
  // manipulation → dikey kaydırma tarayıcıda kalır (liste rahat gezilir); sürükleme kısa
  // basılı tutmayla başlar. 6 nokta tutamağı "none" alır → oradan anında sürüklenir.
  touchAction: "manipulation",
  userSelect: "none", WebkitUserSelect: "none", msUserSelect: "none",
  WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent",
} : {}

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

// Kapak görsellerini bir kez ön belleğe al (coverflow'da tekrar tekrar
// yüklenip animasyonu takmasın). Image nesneleri referansta tutulur → GC etmez.
const _kapakCache = []
let _kapakOnbellek = false
// Dinamik raf'ta ortadaki kitabın indeksi — kitaba girip geri dönünce raf aynı kalsın (oturum içi)
const _dinamikAktif = {}
function kapaklariOnbellekle(urls) {
  if (_kapakOnbellek) return
  _kapakOnbellek = true
  urls.forEach(u => {
    if (!u) return
    try { const img = new Image(); img.decoding = "async"; img.src = u; _kapakCache.push(img) } catch {}
  })
}

// ════════════════════════════════════════════════════════════════
// KİTAPLIK DOLABI (7 Ekim 2026)
// Yalnız GÖRÜNÜM değişti; veri, sıralama, gizleme, arama, özel raflar aynen duruyor.
// Her üst raf bir "bölme": iç (arka pano + kitap sırtları + kenarda kandil/mum),
// raf tahtası ve önüne çakılı başlık levhası. Açılan rafın içeriği (âlimler, kitaplar,
// dinamik akış) levhanın altında, tam genişlikte bir ÇEKMECE olarak açılır.
// Geniş ekranda bir satırda birden çok bölme durur; çekmece CSS `order` ile o satırın
// SONUNA yerleşir (DOM sırası değişmez → sürükle-bırak ve durumlar etkilenmez).
// Kandil ve mumlar kenarlarda: ileride rafa resim gelirse ortası boş kalır.
// ════════════════════════════════════════════════════════════════
const DAMAR_Y = "repeating-linear-gradient(90deg,rgba(0,0,0,0.07) 0 1px,transparent 1px 6px,rgba(255,255,255,0.035) 6px 7px,transparent 7px 13px), "
const DAMAR_D = "repeating-linear-gradient(180deg,rgba(0,0,0,0.06) 0 2px,transparent 2px 9px,rgba(255,255,255,0.03) 9px 10px,transparent 10px 17px), "
const AHSAP = {
  koyu: {
    kasaAcik: DAMAR_Y + "linear-gradient(180deg,#a8705a 0%,#7a4836 45%,#552f23 100%)",
    kasa: DAMAR_Y + "linear-gradient(180deg,#62382b 0%,#45241b 100%)",
    duz: DAMAR_Y + "#6e4031",
    sutun: DAMAR_D + "linear-gradient(90deg,#26120d 0%,#5c3326 20%,#a06a52 42%,#7e4b38 60%,#3e2018 84%,#1f0e0a 100%)",
    disler: "repeating-linear-gradient(90deg,#a8705a 0 6px,transparent 6px 11px)",
    tahta: DAMAR_Y + "linear-gradient(180deg,#b07a60 0%,#7e4b38 30%,#4e2a1f 100%)",
    levhaZemin: DAMAR_Y + "linear-gradient(180deg,#5e3528,#45241b)",
    ic: "repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0 1px,transparent 1px 9px,rgba(0,0,0,0.12) 9px 10px,transparent 10px 17px), linear-gradient(180deg,#160a07,#2c1610)",
    isik: "radial-gradient(circle, rgba(246,184,94,0.30), rgba(246,184,94,0.08) 45%, rgba(246,184,94,0) 70%)",
    gold: "#d9b45a", altin: "rgba(217,180,90,0.75)", alev: "#f6b85e", mum: "#efe2c4",
  },
  acik: {
    kasaAcik: DAMAR_Y + "linear-gradient(180deg,#d29c68 0%,#a87444 45%,#7e522e 100%)",
    kasa: DAMAR_Y + "linear-gradient(180deg,#9a6840 0%,#6e4626 100%)",
    duz: DAMAR_Y + "#9a6840",
    sutun: DAMAR_D + "linear-gradient(90deg,#5a3a1e 0%,#8e5f38 20%,#d29c68 42%,#ad7848 60%,#7a502c 84%,#4e3218 100%)",
    disler: "repeating-linear-gradient(90deg,#d29c68 0 6px,transparent 6px 11px)",
    tahta: DAMAR_Y + "linear-gradient(180deg,#dba674 0%,#ad7848 30%,#734a29 100%)",
    levhaZemin: DAMAR_Y + "linear-gradient(180deg,#9a6840,#6e4626)",
    ic: "repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0 1px,transparent 1px 9px,rgba(0,0,0,0.12) 9px 10px,transparent 10px 17px), linear-gradient(180deg,#2e1a0c,#4a2e18)",
    isik: "radial-gradient(circle, rgba(240,160,64,0.34), rgba(240,160,64,0.08) 45%, rgba(240,160,64,0) 70%)",
    gold: "#c99b45", altin: "rgba(214,170,84,0.8)", alev: "#f0a040", mum: "#f4ead2",
  },
}
// Temanın zemini koyuysa koyu ceviz, açıksa meşe tonları
function ahsapPaleti(theme) {
  const h = String(theme?.background || "#000").replace("#", "")
  const tam = h.length === 3 ? h.split("").map(c => c + c).join("") : h.slice(0, 6)
  const n = parseInt(tam, 16)
  if (Number.isNaN(n)) return AHSAP.koyu
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5 ? AHSAP.koyu : AHSAP.acik
}

const IC_KAPALI = 64            // kapalı bölmenin iç yüksekliği (kısa kitap şeridi)
const IC_ACIK_MOBIL = 132
const IC_ACIK_GENIS = 146
const RAF_MIN_EN = 300          // geniş ekranda bir bölmenin en dar hâli → sütun sayısı
const DERILER = ["#4a1720", "#1d2b3d", "#3d2a18", "#24301f", "#2c2440", "#3d1f24", "#22333a", "#4a3320"]

function sayiKaristir(s) {
  let h = 0
  for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

// ogeler: [{ id, ad, n }] — n: âlimin eser sayısı (sırt kalınlığı) ya da 1 (tek kitap)
function sirtListesi(ogeler, tam) {
  return ogeler.slice(0, tam ? 40 : 16).map(o => {
    const h = sayiKaristir(o.id)
    return {
      id: o.id, ad: o.ad, veri: o.veri,
      en: tam ? [9, 9, 12, 14, 16][Math.min(4, Math.max(1, o.n || 1))] : 9 + (h % 4) * 2,
      boy: tam ? 72 + (h % 20) : 62 + (h % 22),            // iç yüksekliğin yüzdesi
      renk: kitapSirtiRengi(o.id),
    }
  })
}
const susSirtlar = (rafId, adet = 6) =>
  Array.from({ length: adet }, (_, i) => ({ id: `${rafId}-${i}`, ad: "", n: 2 }))

function SemseIkon({ renk, boy = 20 }) {
  return (
    <svg width={boy} height={boy} viewBox="-50 -50 100 100" style={{ flexShrink: 0 }} aria-hidden="true">
      <g fill="none" stroke={renk} strokeWidth="5" strokeLinejoin="round">
        <rect x="-28" y="-28" width="56" height="56" />
        <rect x="-28" y="-28" width="56" height="56" transform="rotate(45)" />
      </g>
      <circle r="11" fill="none" stroke={renk} strokeWidth="4.5" />
    </svg>
  )
}

// Kur'ân bölmesinde ön kapak: asıl kapak görseli (net küçültülmüş kopya)
function RafKapakGorsel({ src }) {
  const net = useNetKapak(src, 54, 82, "cover")
  return (
    <span style={{
      width: "54px", height: "82px", flexShrink: 0, marginLeft: "auto", borderRadius: "2px 4px 4px 2px",
      background: `url(${net}) center/cover no-repeat`,
      boxShadow: "-3px 4px 8px rgba(0,0,0,0.5), inset 3px 0 0 rgba(0,0,0,0.25)",
    }} />
  )
}

function RafKapakSemse({ p, tohum }) {
  const deri = DERILER[sayiKaristir(tohum) % DERILER.length]
  return (
    <span style={{
      width: "54px", height: "82px", flexShrink: 0, marginLeft: "auto", borderRadius: "2px 4px 4px 2px",
      background: `linear-gradient(135deg, ${deri}, rgba(0,0,0,0.55)), ${deri}`,
      boxShadow: "-3px 4px 8px rgba(0,0,0,0.5), inset 3px 0 0 rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ width: "42px", height: "70px", border: `1px solid ${p.gold}`, borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <SemseIkon renk={p.gold} boy={26} />
      </span>
    </span>
  )
}

// Bölmenin içi: arka pano, kenar ışıkları, kitap sırtları, (açıkken) ön kapak
function RafIci({ p, yuk, tam, detay, sirtlar, kapak, onSirt, canli }) {
  const zincir = Math.max(8, Math.round(yuk * 0.36))
  const mumH = Math.min(58, yuk - 8)
  const mumW = Math.round(mumH * 40 / 58)
  const alevSinif = canli ? "vk-alev" : undefined
  return (
    <div style={{
      position: "relative", height: `${yuk}px`, flexShrink: 0, overflow: "hidden",
      background: p.ic, boxShadow: "inset 0 10px 16px rgba(0,0,0,0.55)", transition: "height 0.3s ease",
    }}>
      <div style={{ position: "absolute", left: "-30px", top: tam ? "-10px" : "-62px", width: "150px", height: "150px", borderRadius: "50%", background: p.isik, pointerEvents: "none", transition: "top 0.3s ease" }} />
      <div style={{ position: "absolute", right: "-36px", bottom: "-44px", width: "170px", height: "160px", borderRadius: "50%", background: p.isik, pointerEvents: "none" }} />

      {/* Sol: zincirle asılı kandil */}
      <svg width="26" height={zincir + 31} viewBox={`0 0 26 ${zincir + 31}`} aria-hidden="true"
        style={{ position: "absolute", left: "9px", top: 0, pointerEvents: "none" }}
        fill="none" stroke={p.gold} strokeWidth="1.1" strokeLinejoin="round">
        <path d={`M13 0 V${zincir}`} strokeDasharray="2 2" />
        <g transform={`translate(0 ${zincir})`}>
          <path d="M9 0h8l-1 3h-6z" fill={p.gold} fillOpacity="0.4" />
          <path d="M8 3 Q2 13 8 22 h10 Q24 13 18 3 Z" fill={p.alev} fillOpacity="0.35" />
          <path className={alevSinif} d="M13 8 q-3.5 5 0 9 q3.5-4 0-9z" fill={p.alev} stroke="none" />
          <path d="M8 22h10l-2 4h-6z" fill={p.gold} fillOpacity="0.4" />
          <path d="M13 26v4" />
        </g>
      </svg>

      {/* Orta: kitap sırtları (sığmazsa orantılı incelir) + açıkken ön kapak */}
      <div style={{ position: "absolute", left: "40px", right: "52px", top: "6px", bottom: 0, display: "flex", alignItems: "flex-end", gap: "2px", overflow: "hidden" }}>
        {sirtlar.map(s => {
          const tiklanir = detay && onSirt && s.ad
          return (
            <span
              key={s.id}
              title={s.ad || undefined}
              className={tiklanir ? "vk-sirt" : undefined}
              data-nodrag={tiklanir ? "1" : undefined}
              onClick={tiklanir ? (e) => { e.stopPropagation(); onSirt(s) } : undefined}
              style={{
                flex: `0 1 ${s.en}px`, minWidth: "4px", height: `${s.boy}%`,
                borderRadius: "1.5px 1.5px 0 0",
                background: `linear-gradient(${p.altin},${p.altin}) 0 7px / 100% 2px no-repeat, linear-gradient(${p.altin},${p.altin}) 0 calc(100% - 8px) / 100% 2px no-repeat, linear-gradient(rgba(0,0,0,0.22),rgba(0,0,0,0.22)), ${s.renk}`,
                boxShadow: "inset -2px 0 0 rgba(0,0,0,0.28), inset 1px 0 0 rgba(255,255,255,0.07)",
                cursor: tiklanir ? "pointer" : "inherit",
                transition: "transform 0.2s",
              }}
            />
          )
        })}
        {detay && kapak?.tip === "gorsel" && kapak.src && <RafKapakGorsel src={kapak.src} />}
        {detay && kapak?.tip === "semse" && <RafKapakSemse p={p} tohum={kapak.tohum} />}
      </div>

      {/* Sağ: pirinç şamdanda iki mum */}
      <svg width={mumW} height={mumH} viewBox="0 0 40 58" aria-hidden="true"
        style={{ position: "absolute", right: "8px", bottom: 0, pointerEvents: "none" }}
        stroke={p.gold} strokeWidth="1" strokeLinejoin="round">
        <path className={alevSinif} d="M13 4 q-3 5 0 8 q3-3 0-8z" fill={p.alev} stroke="none" />
        <path d="M13 12 v3" />
        <rect x="10" y="15" width="6" height="28" rx="1" fill={p.mum} stroke="none" />
        <path className={canli ? "vk-alev vk-alev2" : undefined} d="M28 14 q-2.6 4.4 0 7 q2.6-2.6 0-7z" fill={p.alev} stroke="none" />
        <path d="M28 21 v3" />
        <rect x="25.5" y="24" width="5" height="19" rx="1" fill={p.mum} stroke="none" />
        <path d="M5 43 h30 l-3 4 H8 z" fill={p.gold} fillOpacity="0.55" />
        <path d="M17 47 h6 v4 h-6 z M11 51 h18 l1 3 H10 z" fill={p.gold} fillOpacity="0.45" />
      </svg>
    </div>
  )
}

// Bölme = iç + raf tahtası + başlık levhası. Sürükleme düğümü bölmenin tamamı.
function RafBolmesi({ p, theme, isMobile, acik, satirAcik, gizli, sirtlar, kapak, onSirt, onToggle,
  setNodeRef, sortStil, suruklemeProps, duzenlemeMode, sira, children }) {
  const tam = acik || satirAcik
  const yuk = tam ? (isMobile ? IC_ACIK_MOBIL : IC_ACIK_GENIS) : IC_KAPALI
  return (
    <div
      ref={setNodeRef}
      onClick={onToggle}
      {...suruklemeProps}
      style={{
        ...sortStil, order: sira, minWidth: 0, position: "relative",
        display: "flex", flexDirection: "column", cursor: "pointer",
        opacity: gizli ? 0.55 : 1,
        ...surukleStil(duzenlemeMode),
      }}
    >
      <RafIci p={p} yuk={yuk} tam={tam} detay={acik && !duzenlemeMode} sirtlar={sirtListesi(sirtlar, tam)} kapak={kapak} onSirt={onSirt} canli={tam} />
      <div style={{ height: "10px", flexShrink: 0, background: p.tahta, boxShadow: "inset 0 2px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.35)" }} />
      <div style={{ flexGrow: 1, background: p.levhaZemin, padding: "5px 7px 7px" }}>
        <div style={{
          minHeight: "44px", height: "100%", boxSizing: "border-box", borderRadius: "6px",
          background: theme.surface, color: theme.text,
          border: `1px solid ${acik ? theme.accent : "rgba(0,0,0,0.25)"}`,
          boxShadow: acik ? `0 0 0 2px ${theme.accent}40` : "inset 0 1px 0 rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
          padding: "4px 10px",
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// Dolabın yan sütunu: üstte/altta başlık, gövdede yuvarlak ışık alan ahşap
function DolapSutunu({ p, en }) {
  return (
    <div style={{ width: `${en}px`, flexShrink: 0, display: "flex", flexDirection: "column" }} aria-hidden="true">
      <div style={{ height: "14px", margin: "0 -3px", background: p.kasaAcik, borderRadius: "0 0 3px 3px" }} />
      <div style={{ flexGrow: 1, margin: en > 16 ? "0 4px" : "0 2px", background: p.sutun }} />
      <div style={{ height: "18px", margin: "0 -3px", background: p.kasaAcik, borderRadius: "3px 3px 0 0" }} />
    </div>
  )
}

// Açılan rafın içeriği: o satırın altında, tam genişlikte çekmece
function RafCekmecesi({ theme, sira, children }) {
  return (
    <div style={{
      order: sira, gridColumn: "1 / -1", minWidth: 0,
      background: theme.surface, borderRadius: "4px",
      boxShadow: "inset 0 10px 12px -8px rgba(0,0,0,0.55)",
    }}>
      {children}
    </div>
  )
}

const rafAdiStil = (theme, isMobile) => ({
  fontSize: isMobile ? "15px" : "16px", fontFamily: "PlayfairDisplay, serif", letterSpacing: "1.5px",
  color: theme.accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
})

function SayacOk({ theme, acik, children }) {
  return (
    <span style={{ fontSize: "12px", color: theme.textSecondary, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
      {children}
      <ChevronDown size={15} style={{ transform: acik ? "rotate(180deg)" : "none", transition: "transform 0.25s" }} />
    </span>
  )
}

function SortableKitap({ kitap, duzenlemeMode, theme, alimId }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: kitap.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      // Düzenleme modunda kartın TAMAMI sürüklenir (kapak dahil); mod kapalıyken hiç değişmez
      {...surukleProps(duzenlemeMode, attributes, listeners, true)}
      style={{ ...style, position: "relative", ...surukleStil(duzenlemeMode) }}
    >
      {duzenlemeMode && (
        <div
          style={{
            // Tutamaktan başlayan dokunuşta kaydırma yok → anında sürükleme
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
        // Düzenleme modunda tarayıcının kendi bağlantı/görsel sürüklemesi devreye girmesin
        draggable={duzenlemeMode ? false : undefined}
        style={{ textDecoration: "none" }}
      >
        <KucukKapak kitap={kitap} theme={theme} alimId={alimId} duzenlemeMode={duzenlemeMode} />
      </Link>
    </div>
  )
}

/* ── KAPAĞI NET ÇİZ (28 Eylül 2026) ────────────────────────────────────────
   Kullanıcı: "Kur'ân-ı Kerîm görseli %100 yakınlaştırmada kötü, %110'da güzel;
   yalnız web'de; pencereyi yarım ekrana alınca başka bir yakınlaştırmada bozuluyor".
   Kur'ân kapağı <img> DEĞİL, CSS arka planı (`url() center/cover`) — ilk
   denemedeki düzeltme yalnız <img> kapakları kapsadığı için ona hiç değmemişti
   (konsoldaki görsel araması boş döndü, bu yüzden anlaşıldı).
   Sebep: büyük görsel küçük kutuya TEK ADIMDA ve kesirli bir oranla küçültülüyor;
   tarayıcı arka plan görselini hızlı örneklemeyle çiziyor, altın desenlerde
   bozulma kalıyor. Oran yakınlaştırmayla / pencere eniyle değiştiği için bazı
   değerlerde temiz, bazılarında bozuk görünüyor.
   ÇÖZÜM: görsel bir kez tuvalde YARIYA YARIYA (her adım yüksek kaliteli) kutunun
   GERÇEK PİKSEL ölçüsüne küçültülüyor, bu kopya kullanılıyor — tarayıcıya
   neredeyse 1:1 çizim kalıyor. `mod`: "contain" (img) | "cover" (arka plan).
   Piksel yoğunluğu değişince (yakınlaştırma) yeniden üretiliyor. Sonuç modül
   ömrünce önbellekte; hata olursa (CORS, bellek) asıl görsele düşülüyor. */
const netKapakBellek = new Map()
function netKapakUret(src, kutuW, kutuH, mod, dpr) {
  if (!src || !kutuW || !kutuH) return Promise.resolve(null)
  const anahtar = `${src}|${kutuW}x${kutuH}|${mod}|${dpr}`
  if (netKapakBellek.has(anahtar)) return netKapakBellek.get(anahtar)
  const s = new Promise(coz => {
    const im = new Image()
    im.decoding = "async"
    im.onload = () => {
      try {
        const nw = im.naturalWidth, nh = im.naturalHeight
        if (!nw || !nh) return coz(null)
        const olcek = (mod === "cover" ? Math.max(kutuW / nw, kutuH / nh) : Math.min(kutuW / nw, kutuH / nh)) * dpr
        const hw = Math.max(1, Math.round(nw * olcek)), hh = Math.max(1, Math.round(nh * olcek))
        if (nw < hw * 1.4) return coz(null)                       // zaten gereken boya yakın: dokunma
        let kaynak = im, w = nw, h = nh
        while (w / 2 >= hw * 1.001) {
          const c = document.createElement("canvas")
          c.width = Math.round(w / 2); c.height = Math.round(h / 2)
          const x = c.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"
          x.drawImage(kaynak, 0, 0, c.width, c.height)
          kaynak = c; w = c.width; h = c.height
        }
        const son = document.createElement("canvas")
        son.width = hw; son.height = hh
        const x = son.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"
        x.drawImage(kaynak, 0, 0, hw, hh)
        son.toBlob(b => coz(b ? URL.createObjectURL(b) : null), "image/png")
      } catch { coz(null) }
    }
    im.onerror = () => coz(null)
    im.src = src
  })
  netKapakBellek.set(anahtar, s)
  return s
}
// Piksel yoğunluğu: tarayıcı yakınlaştırması ve ekran değişince güncellenir
function usePikselYogunlugu() {
  const [dpr, setDpr] = useState(() => (typeof window !== "undefined" && window.devicePixelRatio) || 1)
  useEffect(() => {
    const guncelle = () => setDpr(window.devicePixelRatio || 1)
    window.addEventListener("resize", guncelle)
    return () => window.removeEventListener("resize", guncelle)
  }, [])
  return Math.round(dpr * 100) / 100
}
function useNetKapak(src, kutuW, kutuH, mod = "contain") {
  const dpr = usePikselYogunlugu()
  const [net, setNet] = useState(null)
  useEffect(() => {
    let iptal = false
    // Genişlik geçişinde (0,3 sn) her ara ölçü için üretmemek: kısa bekleme
    const z = setTimeout(() => {
      netKapakUret(src, kutuW, kutuH, mod, dpr).then(u => { if (!iptal) setNet(u) })
    }, 120)
    return () => { iptal = true; clearTimeout(z) }
  }, [src, kutuW, kutuH, mod, dpr])
  return net || src
}

// 80×128 küçük kapak + başlık (grid görünümü)
function KucukKapak({ kitap, theme, alimId, duzenlemeMode }) {
  const kapakSrc = useNetKapak(kitap.gorsel, 80, 128)
  // IZGARA GÖRÜNÜMÜNDE SABİT ÇERÇEVE YOK — burada `contain` kalıyor.
  // Bir ara karma raflarda `cover` yapılmıştı (dinamik moddaki gibi); NETLİK BOZULDU.
  // Sebep ölçek yönü: kutu burada yalnız 80×128 ve `cover`, görseli kutuyu DOLDURACAK
  // kadar BÜYÜTMEK zorunda kalabiliyor — Tesbihat gibi küçük kapaklarda bu, yukarı
  // ölçekleme yani yumuşama demek. `contain` ise hep küçülterek sığdırır, küçültme
  // keskin kalır. Dinamik modda kutu 242-312px olduğu için orada aynı sorun yok.
  // Kullanıcı kararı: ızgarada küçük eserin küçük görünmesi zaten sorun değil.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "80px" }}>
      {kitap.gorsel ? (
        // Görsel: şekle duyarlı gölge (drop-shadow, alfayı takip eder) → tam kapak da,
        // saydam kenarlı kapak da doğru gölge alır; dikdörtgen kutu gölgesi yok.
        <img
          src={kapakSrc}
          alt={kitap.baslik}
          draggable={duzenlemeMode ? false : undefined}
          style={{
            width: "80px",
            height: "128px",
            objectFit: "contain",
            borderRadius: "2px 6px 6px 2px",
            filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.38))",
            cursor: duzenlemeMode ? "default" : "pointer",
            transition: "transform 0.2s",
            display: "block",
            outline: duzenlemeMode ? `2px dashed rgba(255,255,255,0.5)` : "none",
          }}
          onMouseEnter={(e) => !duzenlemeMode && (e.currentTarget.style.transform = "translateY(-6px)")}
          onMouseLeave={(e) => !duzenlemeMode && (e.currentTarget.style.transform = "translateY(0)")}
        />
      ) : (
        <div
          style={{
            width: "80px",
            height: "128px",
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
      )}
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
  // KARMA RAFTA SABİT ÇERÇEVE (YALNIZ DİNAMİK MOD). `alimId` yalnızca bir âlimin/
  // külliyatın KENDİ rafında doludur; Son/Sık Okunanlar ve özel raflar farklı eserleri
  // bir araya getirdiği için orada boştur. O rafların kapak PNG'leri farklı en-boy
  // oranlarında (ve kimi saydam kenarlı) olduğundan `contain` her kapağı KENDİ oranına
  // göre küçültüyor, akan raf dalgalı görünüyordu. Karma rafta `cover`: her kapak
  // çerçeveyi doldurur, hepsi aynı boyda durur. Kendi rafında `contain` KALIYOR —
  // oradaki kapaklar zaten aynı dizinin parçası ve kırpılmamaları önemli (saydam
  // kenarlı kapaklarda drop-shadow alfayı takip ediyor).
  // IZGARA GÖRÜNÜMÜ BU KURALIN DIŞINDA: orada kutu 80×128 ve `cover` küçük kapakları
  // büyütüp yumuşatıyordu (bkz. KucukKapak notu). Burada kutu 242-312px, görseller
  // her hâlükârda küçültülerek yerleşiyor, netlik bozulmuyor.
  const sabitCerceve = !alimId
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
      {kitap.gorsel ? (
        // Görsel: şekle duyarlı gölge (drop-shadow) → boyuttan bağımsız tutarlı gölge
        <img
          src={kitap.gorsel}
          alt={kitap.baslik}
          style={{
            width: `${coverW}px`,
            height: `${coverH}px`,
            objectFit: sabitCerceve ? "cover" : "contain",
            objectPosition: "center",
            borderRadius: "3px 9px 9px 3px",
            filter: "drop-shadow(4px 9px 16px rgba(0,0,0,0.45))",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: `${coverW}px`,
            height: `${coverH}px`,
            background: kitapSirtiRengi(kitap.id),
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
        </div>
      )}
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

  const [aktif, setAktif] = useState(() => (typeof _dinamikAktif[rafId] === "number" ? _dinamikAktif[rafId] : 0))
  const [dx, setDx] = useState(0)
  const [suruk, setSuruk] = useState(false)
  const drag = useRef({ startX: 0, startY: 0, active: false, moved: false, axis: null })
  const konteynerRef = useRef(null)

  const coverW = isMobile ? 242 : 312
  const coverH = Math.round(coverW * 1.5)
  const aralik = isMobile ? 158 : 214
  const konteynerH = coverH + 96

  // Kitap sayısı değişirse indeksi aralıkta tut (sıfırlama YOK — geri dönünce raf korunur)
  useEffect(() => { setAktif(a => Math.max(0, Math.min(kitapSayisi - 1, a))); setDx(0) }, [rafId, kitapSayisi])
  // Ortadaki kitabı hatırla (oturum içi; kitaba girip geri gelince aynı yerde açılır)
  useEffect(() => { _dinamikAktif[rafId] = aktif }, [rafId, aktif])

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
                // NAVBAR'IN ALTINDA KALMALI. Burası 100'dü; Navbar da sticky ve
                // zIndex 100. Eşit z-index'te DOM'da SONRA gelen kazandığı için
                // kaydırırken kapaklar barın üstüne biniyordu. Taban 40'a çekildi:
                // kapakların kendi aralarındaki sıralama (ortadaki en üstte) aynen
                // korunuyor, 40→14 aralığında; raf içeriğinin üstünde, barın altında.
                zIndex: 40 - Math.round(abs * 10),
                transition: suruk ? "none" : "transform 0.34s cubic-bezier(.22,.61,.36,1), filter 0.34s, opacity 0.34s",
                cursor: "pointer",
                pointerEvents: abs > 1.7 ? "none" : "auto",
                willChange: "transform, filter, opacity",
                backfaceVisibility: "hidden",
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
      data-nodrag="1"
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

  // Bölmedeki âlim sırtına dokunulunca bu raf açılır (kaydırma alimeOdakla'da)
  useEffect(() => {
    const ac = (e) => {
      if (e.detail !== alim.id) return
      setAcik(true)
      try { localStorage.setItem(`vukuf-alim-rafi-${alim.id}`, JSON.stringify(true)) } catch {}
    }
    window.addEventListener("vukuf-alim-ac", ac)
    return () => window.removeEventListener("vukuf-alim-ac", ac)
  }, [alim.id])

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
    <div id={`alim-raf-${alim.id}`} ref={setNodeRef} style={{ ...style, gridColumn: gorunur ? "1 / -1" : undefined, minWidth: 0, marginBottom: "8px", background: theme.background, borderRadius: "8px", overflow: "hidden", border: `1px solid ${theme.border}`, scrollMarginTop: "80px" }}>
      <button
        onClick={toggleAlimRafi}
        {...surukleProps(duzenlemeMode, attributes, listeners)}
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
          ...surukleStil(duzenlemeMode),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {duzenlemeMode && (
            <span style={{ color: theme.textSecondary, display: "flex", touchAction: "none" }}>
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
  gizlemeMod, gizli, onGizle, yer, onAlimSec }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: kategori.id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined }
  const isMobile = useMediaQuery("(max-width: 768px)")
  const kuranRef = useRef(null)
  const acik = acikKategori === kategori.id

  const aramaAcik = kategoriArama[kategori.id] !== undefined

  // Bölmedeki sırtlar: âlimler (kalınlık eser sayısına göre), sıralama kullanıcınınki
  const alimSirtlari = (alimSira[kategori.id] || kategori.alimler.map(a => a.id))
    .map(id => kategori.alimler.find(a => a.id === id))
    .filter(Boolean)
    .map(a => ({
      id: a.id, ad: a.isim,
      n: a.altKategoriler ? a.altKategoriler.reduce((t, x) => t + x.kitaplar.length, 0) : (a.kitaplar || []).length,
    }))
  const sirtlar = alimSirtlari.length ? alimSirtlari : susSirtlar(kategori.id, 5)
  const kapak = kategori.kuran?.gorsel ? { tip: "gorsel", src: kategori.kuran.gorsel } : { tip: "semse", tohum: kategori.id }

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
  // Kur'ân kapağı arka plan görseli — yüksek kaliteli küçültülmüş kopya (bkz. useNetKapak)
  const kuranKapakSrc = useNetKapak(kategori.kuran?.gorsel, kuranW, kuranH, "cover")

  const toggle = () => {
    const yeni = acik ? null : kategori.id
    setAcikKategori(yeni)
    localStorage.setItem("vukuf-acik-kategori", JSON.stringify(yeni))
  }

  return (
    <>
      <RafBolmesi
        p={yer.p} theme={theme} isMobile={isMobile} acik={acik} satirAcik={yer.satirAcik} gizli={gizli}
        sirtlar={sirtlar} kapak={kapak}
        onSirt={alimSirtlari.length && !duzenlemeMode ? (s) => onAlimSec(kategori.id, s.id) : undefined}
        onToggle={toggle}
        setNodeRef={setNodeRef} sortStil={style}
        suruklemeProps={surukleProps(duzenlemeMode, attributes, listeners)}
        duzenlemeMode={duzenlemeMode} sira={yer.sira}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          {duzenlemeMode && (
            <span style={{ color: theme.accent, display: "flex", touchAction: "none", flexShrink: 0 }}>
              <GripVertical size={18} />
            </span>
          )}
          {gizlemeMod && <GozBtn gizli={gizli} onClick={() => onGizle(kategori.id)} theme={theme} />}
          {!duzenlemeMode && !gizlemeMod && <SemseIkon renk={theme.accent} />}
          <span style={rafAdiStil(theme, isMobile)}>
            {kategori.baslik.toLocaleUpperCase('tr-TR')}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {acik && (
            <button
              onClick={handleAramaClick}
              aria-label="Bu rafta ara"
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
          <SayacOk theme={theme} acik={acik}>
            {kategori.kuran ? null : `${kategori.alimler.length} ${kategori.id === "risale" ? "Eser Türü" : "alim"}`}
          </SayacOk>
        </div>
      </RafBolmesi>

      {acik && (
        <RafCekmecesi theme={theme} sira={yer.cekmeceSira}>
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
                          ? `url(${kuranKapakSrc}) center/cover no-repeat`
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
                strategy={isMobile ? verticalListSortingStrategy : rectSortingStrategy}
              >
                {/* Geniş ekranda âlimler yan yana; açılan âlim satırın tamamını kaplar */}
                <div style={isMobile ? undefined : { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", columnGap: "10px", alignItems: "start" }}>
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
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
        </RafCekmecesi>
      )}
    </>
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
        {...surukleProps(duzenlemeMode, attributes, listeners)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${theme.border}`, gap: "10px", cursor: duzenAd != null ? "default" : "pointer", ...surukleStil(duzenlemeMode) }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
          {duzenlemeMode && (
            <span style={{ color: theme.textSecondary, display: "flex", flexShrink: 0, touchAction: "none" }}>
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
        data-nodrag="1"
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
// Açık/kapalı durumu üst bileşende (ozelAcik) — çekmecenin hangi satıra düşeceği orada hesaplanıyor.
// Anahtar aynı: `vukuf-ozel-acik-<id>`, varsayılan açık.
function OzelKategori({ raf, havuz, theme, dinamikMod, duzenlemeMode, gizlemeMod, gizli, onGizle,
  onSil, onRename, onAltEkle, onAltSil, onAltRename, onKitapEkleAc, onKitapCikar, sensors, onAltSira,
  acik, onToggle, yer }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: raf.id })
  const sstyle = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined }
  const isMobile = useMediaQuery("(max-width: 768px)")
  const navigate = useNavigate()
  const [isimDuzen, setIsimDuzen] = useState(null)
  const [silOnay, setSilOnay] = useState(false)
  const [altDuzen, setAltDuzen] = useState({})
  const [aramaAcik, setAramaAcik] = useState(false)
  const [arama, setArama] = useState("")

  const toggle = () => onToggle(raf.id)
  const toplam = (raf.altRaflar || []).reduce((n, a) => n + (a.kitapIdler || []).length, 0)
  const rafKitaplari = (raf.altRaflar || []).flatMap(a => (a.kitapIdler || []).map(id => havuz.get(id)).filter(Boolean))
  const sirtlar = rafKitaplari.length
    ? rafKitaplari.map(k => ({ id: k.id, ad: k.baslik, n: 1, veri: k }))
    : susSirtlar(raf.id, 4)
  const aramaAktif = aramaAcik && arama.trim() !== ""
  const q = aramaAktif ? normHarf(arama) : ""

  const isimKaydet = () => { if (isimDuzen != null && isimDuzen.trim()) onRename(raf.id, isimDuzen.trim()); setIsimDuzen(null) }

  return (
    <>
      <RafBolmesi
        p={yer.p} theme={theme} isMobile={isMobile} acik={acik} satirAcik={yer.satirAcik} gizli={gizli}
        sirtlar={sirtlar} kapak={{ tip: "semse", tohum: raf.id }}
        onSirt={rafKitaplari.length && !duzenlemeMode ? (s) => s.veri && navigate(kitapYolu(s.veri)) : undefined}
        onToggle={isimDuzen != null ? undefined : toggle}
        setNodeRef={setNodeRef} sortStil={sstyle}
        suruklemeProps={surukleProps(duzenlemeMode, attributes, listeners)}
        duzenlemeMode={duzenlemeMode} sira={yer.sira}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          {duzenlemeMode && (
            <span style={{ color: theme.accent, display: "flex", flexShrink: 0, touchAction: "none" }}>
              <GripVertical size={18} />
            </span>
          )}
          {gizlemeMod && <GozBtn gizli={gizli} onClick={() => onGizle(raf.id)} theme={theme} />}
          {duzenlemeMode && <FolderPlus size={18} color={theme.accent} style={{ flexShrink: 0 }} />}
          {!duzenlemeMode && !gizlemeMod && <SemseIkon renk={theme.accent} />}
          {duzenlemeMode && isimDuzen != null ? (
            <input
              value={isimDuzen}
              autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => setIsimDuzen(e.target.value)}
              onBlur={isimKaydet}
              onKeyDown={e => { if (e.key === "Enter") isimKaydet() }}
              style={{ fontSize: "16px", fontFamily: "PlayfairDisplay, serif", color: theme.accent, background: theme.background, border: `1px solid ${theme.accent}`, borderRadius: "6px", padding: "2px 8px", flex: 1, minWidth: 0 }}
            />
          ) : (
            <span style={rafAdiStil(theme, isMobile)}>
              {raf.baslik.toLocaleUpperCase('tr-TR')}
            </span>
          )}
          {duzenlemeMode && isimDuzen == null && (
            <span data-nodrag="1" onClick={e => { e.stopPropagation(); setIsimDuzen(raf.baslik) }} style={{ display: "flex", cursor: "pointer", color: theme.textSecondary, flexShrink: 0 }}>
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
              <span data-nodrag="1" onClick={e => { e.stopPropagation(); setSilOnay(true); setTimeout(() => setSilOnay(false), 3000) }} style={{ display: "flex", cursor: "pointer", color: "#c0392b" }}>
                <Trash2 size={16} />
              </span>
            )
          )}
          <SayacOk theme={theme} acik={acik}>{toplam} kitap</SayacOk>
        </div>
      </RafBolmesi>

      {acik && (
        <RafCekmecesi theme={theme} sira={yer.cekmeceSira}>
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
        </RafCekmecesi>
      )}
    </>
  )
}

// ── Otomatik raf (Son / Sık Okunanlar)
//
// AÇIKLIK DURUMU ARTIK KENDİNE AİT DEĞİL, `acikKategori` ORTAK DURUMUNDA.
// Eskiden bu iki raf kendi `acik` bayrağını tutuyor ve varsayılanı `true` idi;
// sonuç olarak (1) kütüphane ikisi birden açık açılıyor, (2) içlerindeki
// DinamikRaf mount olunca kendini `scrollIntoView` ile ortaya çekiyor, yani
// sayfa kullanıcı istemeden bu raflara odaklanıyor, (3) bir Kısım rafı zaten
// açıkken bunlar da açık kalabiliyordu. Kısım rafları tek bir `acikKategori`
// üzerinden çalıştığı için "aynı anda tek raf" kuralı onlarda zaten vardı;
// Son/Sık de aynı duruma bağlanınca üç sorun da kendiliğinden bitiyor:
// başlangıçta kapalı (kayıtlı değer yoksa null), ikisi aynı anda açılamaz,
// bir Kısım açıkken de açılamaz. Eski `vukuf-otom-acik-*` anahtarları artık
// okunmuyor (kullanıcıda `true` kalmış olabilir, onu da böylece yok sayıyoruz).
function OtomatikKategori({ rafId, baslik, Ikon, kitaplar: liste, theme, dinamikMod, duzenlemeMode, gizlemeMod, gizli, onGizle, acikKategori, setAcikKategori, yer }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rafId })
  const sstyle = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined }
  const isMobile = useMediaQuery("(max-width: 768px)")
  const navigate = useNavigate()
  const acik = acikKategori === rafId
  const [aramaAcik, setAramaAcik] = useState(false)
  const [arama, setArama] = useState("")
  const toggle = () => {
    const yeni = acik ? null : rafId
    setAcikKategori(yeni)
    try { localStorage.setItem("vukuf-acik-kategori", JSON.stringify(yeni)) } catch {}
    if (acik) { setAramaAcik(false); setArama("") }   // kapanınca arama da sıfırlansın
  }
  const q = aramaAcik && arama.trim() ? normHarf(arama) : ""
  const gosterilen = q ? liste.filter(k => normHarf(k.baslik).includes(q)) : liste

  const sirtlar = liste.length ? liste.map(k => ({ id: k.id, ad: k.baslik, n: 1, veri: k })) : susSirtlar(rafId, 4)

  return (
    <>
      <RafBolmesi
        p={yer.p} theme={theme} isMobile={isMobile} acik={acik} satirAcik={yer.satirAcik} gizli={gizli}
        sirtlar={sirtlar} kapak={{ tip: "semse", tohum: rafId }}
        onSirt={liste.length && !duzenlemeMode ? (s) => s.veri && navigate(kitapYolu(s.veri)) : undefined}
        onToggle={toggle}
        setNodeRef={setNodeRef} sortStil={sstyle}
        suruklemeProps={surukleProps(duzenlemeMode, attributes, listeners)}
        duzenlemeMode={duzenlemeMode} sira={yer.sira}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          {duzenlemeMode && (
            <span style={{ color: theme.accent, display: "flex", flexShrink: 0, touchAction: "none" }}>
              <GripVertical size={18} />
            </span>
          )}
          {gizlemeMod && <GozBtn gizli={gizli} onClick={() => onGizle(rafId)} theme={theme} />}
          <Ikon size={18} color={theme.accent} style={{ flexShrink: 0 }} />
          <span style={rafAdiStil(theme, isMobile)}>
            {baslik.toLocaleUpperCase('tr-TR')}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {acik && <RafArama theme={theme} acik={aramaAcik} setAcik={(v) => { setAramaAcik(v); if (!v) setArama("") }} deger={arama} setDeger={setArama} />}
          <SayacOk theme={theme} acik={acik}>{liste.length} kitap</SayacOk>
        </div>
      </RafBolmesi>
      {acik && (
        <RafCekmecesi theme={theme} sira={yer.cekmeceSira}>
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
        </RafCekmecesi>
      )}
    </>
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
  const [gizliAramaDahil, setGizliAramaDahil] = useState(false)   // aramada gizli bölümleri de göster
  const [gizliUyari, setGizliUyari] = useState(false)             // gizli sonuca tıklanınca kısa not
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
  const ahsap = ahsapPaleti(theme)

  // Özel rafların açıklığı (her biri bağımsız; varsayılan açık) — çekmece yerleşimi için burada
  const [ozelAcik, setOzelAcik] = useState({})
  const ozelAcikMi = (id) => {
    if (id in ozelAcik) return ozelAcik[id]
    try { const v = localStorage.getItem(`vukuf-ozel-acik-${id}`); return v ? JSON.parse(v) : true } catch { return true }
  }
  function ozelToggle(id) {
    const y = !ozelAcikMi(id)
    setOzelAcik(prev => ({ ...prev, [id]: y }))
    try { localStorage.setItem(`vukuf-ozel-acik-${id}`, JSON.stringify(y)) } catch {}
  }

  // Dolabın sütun sayısı: ızgara eninden (telefonda 1, geniş ekranda ekrana göre)
  const izgaraRef = useRef(null)
  const [sutunSayisi, setSutunSayisi] = useState(1)
  const izgaraAralik = isMobile ? 10 : 14
  useEffect(() => {
    const el = izgaraRef.current
    if (!el) return
    const hesapla = () => {
      const w = el.clientWidth
      const n = Math.max(1, Math.floor((w + izgaraAralik) / (RAF_MIN_EN + izgaraAralik)))
      setSutunSayisi(s => (s === n ? s : n))
    }
    hesapla()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", hesapla)
      return () => window.removeEventListener("resize", hesapla)
    }
    const ro = new ResizeObserver(hesapla)
    ro.observe(el)
    return () => ro.disconnect()
  }, [izgaraAralik])

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

  // Tüm kapak görsellerini bir kez ön belleğe al
  useEffect(() => {
    const urls = kitaplar.map(k => k.gorsel).filter(Boolean)
    if (kuranKitap?.gorsel) urls.push(kuranKitap.gorsel)
    kapaklariOnbellekle(urls)
  }, [kuranKitap])

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

  // Yerleşim: bölme i → order 2i; açık bölmenin çekmecesi → satırının son bölmesinden hemen sonra.
  // Aynı satırda açık bölmesi olan satırın bütün bölmeleri yüksek (kitaplarıyla) görünür.
  const rafAcikMi = (id) => (ozelMap.has(id) ? ozelAcikMi(id) : acikKategori === id)
  const acikSatirlar = new Set()
  gorunenIdler.forEach((id, i) => { if (rafAcikMi(id)) acikSatirlar.add(Math.floor(i / sutunSayisi)) })
  const yerlesim = (i) => {
    const satir = Math.floor(i / sutunSayisi)
    const satirSonu = Math.min(gorunenIdler.length - 1, satir * sutunSayisi + sutunSayisi - 1)
    return { p: ahsap, sira: i * 2, cekmeceSira: satirSonu * 2 + 1, satirAcik: acikSatirlar.has(satir) }
  }

  // PointerSensor DEĞİL, MouseSensor + TouchSensor: PointerSensor dokunmayı da mesafeyle
  // yakaladığı için düzenleme modunda parmak birkaç piksel kayar kaymaz sürükleme başlıyor,
  // sayfa AŞAĞI YUKARI KAYDIRILAMIYORDU. Ayrım yapınca fare mesafeyle, dokunma kısa basılı
  // tutmayla başlar; parmak beklemeden kayarsa (tolerance) sürükleme iptal → kaydırma serbest.
  // (BarSiraPaneli ile aynı değerler — tüm sıralama menüleri aynı hissiyatta olsun.)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 170, tolerance: 6 } }),
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

  // Aramadan âlim seçilince: kategori açıldıktan sonra o âlimin rafına kaydır + kısa vurgu
  function alimeOdakla(alimId) {
    let deneme = 0
    const t = setInterval(() => {
      const el = document.getElementById(`alim-raf-${alimId}`)
      if (el) {
        clearInterval(t)
        el.scrollIntoView({ block: "center", behavior: "smooth" })
        const eskiGolge = el.style.boxShadow
        el.style.transition = "box-shadow 0.4s"
        el.style.boxShadow = `0 0 0 3px ${theme.accent}`
        setTimeout(() => { el.style.boxShadow = eskiGolge || "none" }, 1400)
      } else if (deneme++ > 15) {
        clearInterval(t)
      }
    }, 80)
  }

  // Bölmedeki âlim sırtı: âlimin rafını aç ve ona kaydır (aramadaki âlim seçimiyle aynı)
  function alimSirtSec(kategoriId, alimId) {
    if (acikKategori !== kategoriId) {
      setAcikKategori(kategoriId)
      try { localStorage.setItem("vukuf-acik-kategori", JSON.stringify(kategoriId)) } catch {}
    }
    window.dispatchEvent(new CustomEvent("vukuf-alim-ac", { detail: alimId }))
    alimeOdakla(alimId)
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
    setGizliRaflar([]); setOzelRaflar([]); setIstatistik({}); setOzelAcik({})
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
      // Dolap ekranı doldurur, kenarlarda küçük pay (eskiden 900 px ile sınırlıydı)
      position: "relative", maxWidth: "1920px", margin: "0 auto",
      padding: isMobile ? "34px 10px 40px" : "40px 20px 48px",
      userSelect: "none", WebkitUserSelect: "none",
    }}>
      <style>{`
        @keyframes vukuf-raf-ac {
          from { opacity: 0; transform: scale(0.965) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes vk-alev {
          0%, 100% { transform: scale(1, 1); opacity: 1; }
          30% { transform: scale(0.94, 1.08); opacity: 0.92; }
          60% { transform: scale(1.04, 0.95); opacity: 1; }
        }
        .vk-alev { transform-box: fill-box; transform-origin: 50% 100%; animation: vk-alev 2.4s ease-in-out infinite; }
        .vk-alev2 { animation-duration: 3.1s; animation-delay: -1.2s; }
        @media (hover: hover) { .vk-sirt:hover { transform: translateY(-5px); } }
        @media (prefers-reduced-motion: reduce) { .vk-alev { animation: none; } }
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
          <h1 style={{ fontSize: "28px", color: theme.textSecondary, letterSpacing: "1px", fontFamily: "PlayfairDisplay, serif", display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="1.15em" height="1.15em" viewBox="0 0 24 26" fill="none" stroke={theme.textSecondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <line x1="2.5" y1="3" x2="21.5" y2="3" />
              <line x1="2.5" y1="23" x2="21.5" y2="23" />
              <line x1="2.5" y1="3" x2="2.5" y2="23" />
              <rect x="5" y="6" width="3" height="14" rx="0.6" />
              <rect x="10" y="6" width="3" height="14" rx="0.6" />
              <rect x="15" y="6" width="3" height="14" rx="0.6" />
            </svg>
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
                onChange={(e) => { setGenelArama(e.target.value); if (gizliUyari) setGizliUyari(false) }}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "14px", color: theme.text }}
                autoFocus
              />
              {gizliRaflar.length > 0 && (
                <button onClick={() => setGizliAramaDahil(v => !v)}
                  title={gizliAramaDahil ? "Gizli bölümler dahil" : "Gizli bölümler hariç"}
                  style={{ display: "flex", alignItems: "center", color: gizliAramaDahil ? theme.accent : theme.textSecondary, background: gizliAramaDahil ? `${theme.accent}15` : "none", border: "none", borderRadius: "6px", cursor: "pointer", padding: "3px" }}>
                  {gizliAramaDahil ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              )}
              {genelArama && (
                <button onClick={() => setGenelArama("")} style={{ display: "flex", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {genelArama && (
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {gizliUyari && (
                  <div style={{ padding: "10px 16px", fontSize: "12px", color: theme.accent, background: `${theme.accent}12`, borderBottom: `1px solid ${theme.border}` }}>
                    Bu bölüm gizli — kütüphanede görünür yapıldığında açılabilir.
                  </div>
                )}
                {(() => {
                  const aramaKucuk = trLower(genelArama)
                  const sonuclar = []
                  kategoriler.forEach(kategori => {
                    const rafGizli = gizliRaflar.includes(kategori.id)
                    if (rafGizli && !gizliAramaDahil) return          // gizli bölüm aramada gösterilmez
                    kategori.alimler.forEach(alim => {
                      if (trLower(alim.isim).includes(aramaKucuk)) {
                        sonuclar.push({ tip: "alim", isim: alim.isim, kategori: kategori.baslik, alimId: alim.id, kategoriId: kategori.id, gizli: rafGizli })
                      }
                      const kitaplarL = alim.altKategoriler ? alim.altKategoriler.flatMap(a => a.kitaplar) : alim.kitaplar
                      kitaplarL.forEach(kitap => {
                        if (trLower(kitap.baslik).includes(aramaKucuk)) {
                          sonuclar.push({ tip: "kitap", baslik: kitap.baslik, yazar: alim.isim, kategori: kategori.baslik, kitapId: kitap.id, dosya: kitap.dosya, gizli: rafGizli })
                        }
                      })
                    })
                  })
                  if (sonuclar.length === 0) {
                    return <div style={{ padding: "20px", textAlign: "center", color: theme.textSecondary, fontSize: "14px" }}>Sonuç bulunamadı</div>
                  }
                  return sonuclar.map((s, i) => (
                    <div key={i}>
                      {s.tip === "kitap" && !s.gizli ? (
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
                          onClick={() => {
                            if (s.gizli) { setGizliUyari(true); return }
                            setGenelArama(""); setGenelAramaAcik(false); setAcikKategori(s.kategoriId); alimeOdakla(s.alimId)
                          }}
                          style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", color: s.gizli ? theme.textSecondary : theme.text, borderBottom: `1px solid ${theme.border}`, cursor: "pointer", transition: "background 0.15s", opacity: s.gizli ? 0.7 : 1 }}
                          onMouseEnter={(e) => e.currentTarget.style.background = `${theme.accent}10`}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          {s.gizli ? <EyeOff size={16} color={theme.textSecondary} /> : (s.tip === "kitap" ? <BookOpen size={16} color={theme.accent} /> : <Search size={16} color={theme.accent} />)}
                          <div>
                            <div style={{ fontSize: "14px" }}>{s.tip === "kitap" ? s.baslik : s.isim}</div>
                            <div style={{ fontSize: "11px", color: theme.textSecondary }}>{s.tip === "kitap" ? `${s.yazar} · ${s.kategori}` : s.kategori}{s.gizli ? " · gizli" : ""}</div>
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

      {/* ═══ KİTAPLIK DOLABI: taç + yan sütunlar + kaide; içinde bölmeler ═══ */}
      <div style={{ boxShadow: "0 18px 30px -12px rgba(0,0,0,0.5)", borderRadius: "5px 5px 4px 4px" }}>
        <div style={{ height: isMobile ? "11px" : "14px", margin: "0 -4px", borderRadius: "5px 5px 0 0", background: ahsap.kasaAcik, boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.3)" }} />
        <div style={{ height: isMobile ? "20px" : "28px", position: "relative", background: ahsap.kasa }}>
          <div style={{ position: "absolute", left: "10px", right: "10px", bottom: "4px", height: "6px", background: ahsap.disler }} />
        </div>
        <div style={{ height: "6px", background: ahsap.kasaAcik, boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.35)" }} />

        <div style={{ display: "flex", background: ahsap.kasa }}>
          <DolapSutunu p={ahsap} en={isMobile ? 12 : 24} />
          <div
            ref={izgaraRef}
            style={{
              flex: 1, minWidth: 0, display: "grid",
              gridTemplateColumns: `repeat(${sutunSayisi}, minmax(0, 1fr))`,
              columnGap: `${izgaraAralik}px`, rowGap: `${izgaraAralik}px`,
              alignItems: "stretch",
              background: ahsap.duz, padding: `0 0 ${izgaraAralik}px`,
            }}
          >
      {/* Tüm üst seviye raflar — tek birleşik sürüklenebilir liste */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleUstDragEnd}>
        <SortableContext items={gorunenIdler} strategy={rectSortingStrategy}>
          {gorunenIdler.map((id, i) => {
            const gizli = gizliRaflar.includes(id)
            const yer = yerlesim(i)
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
                  yer={yer}
                  onAlimSec={alimSirtSec}
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
                  acik={ozelAcikMi(id)}
                  onToggle={ozelToggle}
                  yer={yer}
                />
              )
            }
            if (id === "son-okunanlar") {
              return (
                <OtomatikKategori
                  key={id} rafId="son-okunanlar" baslik="Son Okunanlar" Ikon={Clock} kitaplar={sonListe}
                  theme={theme} dinamikMod={dinamikMod} duzenlemeMode={duzenlemeMode}
                  gizlemeMod={gizlemeMod} gizli={gizli} onGizle={gizleToggle}
                  acikKategori={acikKategori} setAcikKategori={setAcikKategori}
                  yer={yer}
                />
              )
            }
            if (id === "sik-okunanlar") {
              return (
                <OtomatikKategori
                  key={id} rafId="sik-okunanlar" baslik="Sık Okunanlar" Ikon={Star} kitaplar={sikListe}
                  theme={theme} dinamikMod={dinamikMod} duzenlemeMode={duzenlemeMode}
                  gizlemeMod={gizlemeMod} gizli={gizli} onGizle={gizleToggle}
                  acikKategori={acikKategori} setAcikKategori={setAcikKategori}
                  yer={yer}
                />
              )
            }
            return null
          })}
        </SortableContext>
      </DndContext>
          </div>
          <DolapSutunu p={ahsap} en={isMobile ? 12 : 24} />
        </div>

        <div style={{ height: "8px", margin: "0 -3px", background: ahsap.kasaAcik }} />
        <div style={{ height: isMobile ? "16px" : "22px", margin: "0 3px", borderRadius: "0 0 4px 4px", background: ahsap.kasa, boxShadow: "inset 0 2px 0 rgba(0,0,0,0.3)" }} />
      </div>

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
