/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — İPUCU KATMANI (uygulama geneli şık tooltip)
   src/components/IpucuKatmani.jsx

   15 Ekim 2026, kullanıcı: "OkumaEkranı ya da KuranOkuma'daki bar öğeleri için hover
   efektini tooltip ile versek nasıl olur? Sûre menüsü yazısı çok sade kalıyor; hover
   ile bilgi verdiğimiz yerlerde tooltip kullansak?"

   NASIL ÇALIŞIR — dosyalara tek tek dokunmadan:
     App'te BİR KEZ çizilir. Fare bir öğenin üstüne gelince (ya da klavyeyle odaklanınca)
     öğenin `title`'ını okur, tarayıcının sade kutusunu bastırır ve yerine temaya uygun
     bir balon gösterir. Yani bugün `title` verilmiş HER düğme (bar, oynatıcı, popup…)
     kendiliğinden yeni ipucuyu kullanır.
       • title="Sûre menüsü"                         → tek satır
       • title="Ayarlar — yazı, tema ve bar"          → " — " sonrası ikinci, soluk satır
       • data-ipucu="…" / data-ipucu-alt="…"          → title yerine açıkça verilebilir
       • data-ipucu-tus="M"                           → sağda küçük tuş rozeti (kısayol)
       • data-ipucu-yok                               → o öğe (ve içi) için kapalı
   Erişilebilirlik: title kaldırılırken öğenin adı yoksa (yalnız simgeli düğme)
   aria-label olarak korunur — ekran okuyucu yine okur.

   DAVRANIŞ: yalnız FARE ve klavye odağında. Dokunmatikte çıkmaz (dokunuşu bozmasın).
   İlk ipucu 450 ms bekler; bir ipucu kapandıktan sonraki 600 ms içinde komşu düğmeye
   geçilirse beklemeden açılır (bar boyunca gezinirken akıcı). Tıklayınca, kaydırınca
   ya da Esc'ye basınca kapanır. Üstte kalan öğede alta, altta kalanda üste açılır;
   ekran kenarına taşmaz.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useApp } from "../AppContext"

const ILK_GECIKME = 450
const SICAK_GECIKME = 40
const SICAK_SURE = 600
const KENAR = 8
const ARA = 9

function metinCoz(el) {
  // React title'ı yeniden yazmış olabilir (değişen ipucu) → önce title, sonra saklanan
  const t = el.getAttribute("title")
  if (t !== null) {
    if (t.trim()) el.setAttribute("data-ipucu-baslik", t)
    el.removeAttribute("title")                    // tarayıcının kendi kutusu çıkmasın
    // Yalnız simgeli düğmenin adı title'dan geliyordu → aria-label olarak koru
    if (t.trim() && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !(el.textContent || "").trim()) {
      el.setAttribute("aria-label", t)
    }
  }
  const acik = el.getAttribute("data-ipucu")
  const ham = (acik !== null ? acik : el.getAttribute("data-ipucu-baslik")) || ""
  if (!ham.trim()) return null
  let ust = ham.trim(), alt = el.getAttribute("data-ipucu-alt") || ""
  if (!alt) {
    const i = ust.indexOf(" — ")
    if (i > 0) { alt = ust.slice(i + 3).trim(); ust = ust.slice(0, i).trim() }
  }
  return { ust, alt, tus: el.getAttribute("data-ipucu-tus") || "" }
}

function hedefBul(dugum) {
  if (!dugum || dugum.nodeType !== 1) return null
  if (dugum.closest("[data-ipucu-yok]")) return null
  return dugum.closest("[title], [data-ipucu], [data-ipucu-baslik]")
}

export default function IpucuKatmani() {
  const { theme } = useApp()
  const [ipucu, setIpucu] = useState(null)          // { el, ust, alt, tus }
  const [konum, setKonum] = useState(null)          // { x, y, alta, okX }
  const balonRef = useRef(null)
  const zamanRef = useRef(0)
  const sonKapanisRef = useRef(0)
  const aktifRef = useRef(null)

  useEffect(() => {
    const kapat = () => {
      clearTimeout(zamanRef.current)
      if (aktifRef.current) sonKapanisRef.current = performance.now()
      aktifRef.current = null
      setIpucu(null); setKonum(null)
    }
    const ac = (el) => {
      clearTimeout(zamanRef.current)
      const icerik = metinCoz(el)
      if (!icerik) { kapat(); return }
      const sicak = performance.now() - sonKapanisRef.current < SICAK_SURE || !!aktifRef.current
      zamanRef.current = setTimeout(() => {
        if (!el.isConnected) return
        aktifRef.current = el
        setKonum(null)
        setIpucu({ el, ...icerik })
      }, sicak ? SICAK_GECIKME : ILK_GECIKME)
    }
    const uzerine = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return
      const el = hedefBul(e.target)
      if (!el) { if (aktifRef.current && !aktifRef.current.contains(e.target)) kapat(); else clearTimeout(zamanRef.current); return }
      if (el === aktifRef.current) return
      if (aktifRef.current) { sonKapanisRef.current = performance.now(); aktifRef.current = null; setIpucu(null) }
      ac(el)
    }
    const disina = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return
      const el = hedefBul(e.target)
      if (!el) return
      // Aynı öğenin içinde başka bir parçaya geçiliyorsa kapatma
      if (e.relatedTarget && el.contains(e.relatedTarget)) return
      kapat()
    }
    const odak = (e) => {
      const el = hedefBul(e.target)
      if (!el) return
      let gorunur = false
      try { gorunur = el.matches(":focus-visible") || e.target.matches(":focus-visible") } catch { gorunur = false }
      if (gorunur) ac(el)
    }
    const tus = (e) => { if (e.key === "Escape") kapat() }
    const opts = { capture: true, passive: true }
    document.addEventListener("pointerover", uzerine, opts)
    document.addEventListener("pointerout", disina, opts)
    document.addEventListener("pointerdown", kapat, opts)
    document.addEventListener("focusin", odak, opts)
    document.addEventListener("focusout", kapat, opts)
    document.addEventListener("keydown", tus, opts)
    window.addEventListener("scroll", kapat, opts)
    window.addEventListener("wheel", kapat, opts)
    window.addEventListener("blur", kapat)
    window.addEventListener("resize", kapat)
    return () => {
      clearTimeout(zamanRef.current)
      document.removeEventListener("pointerover", uzerine, opts)
      document.removeEventListener("pointerout", disina, opts)
      document.removeEventListener("pointerdown", kapat, opts)
      document.removeEventListener("focusin", odak, opts)
      document.removeEventListener("focusout", kapat, opts)
      document.removeEventListener("keydown", tus, opts)
      window.removeEventListener("scroll", kapat, opts)
      window.removeEventListener("wheel", kapat, opts)
      window.removeEventListener("blur", kapat)
      window.removeEventListener("resize", kapat)
    }
  }, [])

  // Konum: balon çizildikten sonra ölçülür; öğe kaybolursa (menü açıldı vb.) kapanır
  useEffect(() => {
    if (!ipucu) return
    const yerlestir = () => {
      const el = ipucu.el, b = balonRef.current
      if (!el.isConnected || !b) { setIpucu(null); setKonum(null); aktifRef.current = null; return }
      const r = el.getBoundingClientRect()
      if (!r.width && !r.height) { setIpucu(null); setKonum(null); aktifRef.current = null; return }
      const bw = b.offsetWidth, bh = b.offsetHeight
      const vw = window.innerWidth, vh = window.innerHeight
      // Ekranın üst yarısındaki öğede alta, alt yarısındakinde üste; sığmazsa ters yön
      let alta = r.top + r.height / 2 < vh / 2
      if (alta && r.bottom + ARA + bh > vh - KENAR) alta = false
      if (!alta && r.top - ARA - bh < KENAR) alta = true
      const merkez = r.left + r.width / 2
      const x = Math.min(vw - KENAR - bw, Math.max(KENAR, merkez - bw / 2))
      const y = alta ? r.bottom + ARA : r.top - ARA - bh
      setKonum({ x, y, alta, okX: Math.min(bw - 12, Math.max(12, merkez - x)) })
    }
    const id = requestAnimationFrame(yerlestir)
    const bekci = setInterval(() => { if (!ipucu.el.isConnected) { setIpucu(null); setKonum(null); aktifRef.current = null } }, 300)
    return () => { cancelAnimationFrame(id); clearInterval(bekci) }
  }, [ipucu])

  if (!ipucu || typeof document === "undefined") return null
  const ac = theme.accent
  const zemin = theme.surface || theme.background
  const kenar = theme.border || "rgba(0,0,0,0.12)"
  return createPortal(
    <div
      ref={balonRef}
      role="tooltip"
      style={{
        position: "fixed", left: konum ? konum.x : -9999, top: konum ? konum.y : -9999, zIndex: 100000,
        pointerEvents: "none", maxWidth: "min(280px, calc(100vw - 16px))",
        background: zemin, color: theme.text, border: `1px solid ${kenar}`,
        borderRadius: "10px", padding: ipucu.alt ? "7px 11px 8px" : "6px 11px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.10)",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        opacity: konum ? 1 : 0,
        transform: konum ? "none" : "translateY(3px)",
        transition: "opacity .14s ease, transform .14s ease",
        visibility: konum ? "visible" : "hidden",
      }}
    >
      {/* Ok: balonla aynı zemin ve kenar */}
      {konum && (
        <span style={{
          position: "absolute", left: konum.okX - 5, width: 10, height: 10,
          background: zemin, border: `1px solid ${kenar}`, transform: "rotate(45deg)",
          ...(konum.alta
            ? { top: -6, borderRight: "none", borderBottom: "none" }
            : { bottom: -6, borderLeft: "none", borderTop: "none" }),
        }} />
      )}
      <span style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 3, alignSelf: "stretch", minHeight: 12, borderRadius: 2, background: ac, flexShrink: 0 }} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "12.5px", fontWeight: 650, lineHeight: 1.3, letterSpacing: "0.1px" }}>{ipucu.ust}</span>
          {ipucu.alt && (
            <span style={{ display: "block", fontSize: "11.5px", color: theme.textSecondary, lineHeight: 1.35, marginTop: "2px" }}>{ipucu.alt}</span>
          )}
        </span>
        {ipucu.tus && (
          <kbd style={{
            marginLeft: "2px", flexShrink: 0, fontFamily: "inherit", fontSize: "10.5px", fontWeight: 700,
            padding: "1px 6px", borderRadius: "5px", border: `1px solid ${kenar}`,
            background: `${ac}14`, color: theme.textSecondary,
          }}>{ipucu.tus}</kbd>
        )}
      </span>
    </div>,
    document.body,
  )
}
