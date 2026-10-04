/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — GERİ DÖN DÜĞMESİ + DÖNÜŞ NOKTALARI LİSTESİ
   src/components/DonusDugmesi.jsx

   Kur'ân ve kitap okuma ekranlarında, bir atlamadan sonra (İçindekiler, arama,
   sayfaya git, işaret) SOL ALTTA (bar üstteyse sol üstte) beliren hap:
     [↶ Geri dön · Bakara 142]  [⌄ 3]  [✕]
   • "Geri dön" → en son bırakılan noktaya.
   • Sayı düğmesi (birden fazla nokta varsa) → "Dönüş noktaları" listesi; her
     satırda yer, nereden ayrıldığı ve ne zaman. Dokununca oraya gidilir.
   • ✕ → listeyi temizler (hap kaybolur).
   Sağ alttaki "Aramaya dön" hapıyla çakışmasın diye SOLDA duruyor.
   Ayrıntı: data/donusNoktalari.js

   KÖPRÜ DÜĞMESİ (4 Ekim 2026, kullanıcı: "buton renklendirmesini çok
   beğendim, diğer köprüler için de bu şekilde ama farklı konumda"): başka
   ekrana dönüş köprüleri ("Aramaya dön", "Tefeüle dön", "Okumaya dön") aynı
   çerçeveli görünümle SAĞDA. Eskiden dolu vurgu renginde tek satırdı.
   Her iki hap da ekrana hafif bir kayma + belirme ile giriyor.

   SÜRÜKLENEBİLİR + KONUM HAFIZASI (4 Ekim 2026). Kullanıcı: "geri dön düğmesi
   playerbar'ın üzerine çıkabiliyor; köprü düğmelerini kullanıcı sürükleyerek
   taşıyabilmeli, konum kaydedilsin; başlangıçta playerbar gibi öğeleri takip
   etsin, görünümlerine engel olmasın (meal penceresi gibi)."
     • VARSAYILAN YER ölçülen dolu alanlara göre: alttaki bar + oynatıcı
       yüksekliği (altPay) / üstteki (ustPay) — oynatıcı açılınca hap onun
       üstüne kayar, bar gizlenince aşağı iner (yumuşak geçişle).
     • SÜRÜKLE: hap 6 px'ten fazla kaydırılınca sürükleme başlar (basit dokunuş
       düğmeye tıklama olarak kalır; sürüklemeden sonraki tıklama yutulur).
       Bırakılan yer ekranın ORANI olarak saklanır (dönmede de anlamlı):
       localStorage "vukuf-hap-konum-geri" / "vukuf-hap-konum-kopru".
     • Saklanan yer de dolu alanlara SIKIŞTIRILIR: hap nereye bırakılmış olursa
       olsun oynatıcının/barın altında kalmaz, ekrandan taşmaz.
     • Sıfırlama: Ayarlar → Gezinme → "Düğme konumlarını sıfırla".
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { guvenliAlan } from "../data/hooks/useEkranIcinde"
import { CornerUpLeft, ChevronUp, ChevronDown, X, Search, List, Bookmark, Hash, BookOpen } from "lucide-react"
import { KAYNAK_ADI } from "../data/donusNoktalari"

const KAYNAK_SIMGE = { icindekiler: List, arama: Search, sayfa: Hash, isaret: Bookmark, ornek: BookOpen, geri: CornerUpLeft }

/* Giriş canlandırması — bir kez eklenen stil etiketi (hareket azaltma tercihine uyar) */
const GIRIS_CSS = `@keyframes vukuf-hap-gir{from{opacity:0;transform:translateY(var(--hap-kay,8px)) scale(.96)}to{opacity:1;transform:none}}
.vukuf-hap{animation:vukuf-hap-gir .22s cubic-bezier(.22,.61,.36,1) both}
@media (prefers-reduced-motion: reduce){.vukuf-hap{animation:none}}`
function girisStiliYukle() {
  if (typeof document === "undefined" || document.getElementById("vukuf-hap-stil")) return
  const st = document.createElement("style")
  st.id = "vukuf-hap-stil"
  st.textContent = GIRIS_CSS
  document.head.appendChild(st)
}
girisStiliYukle()

/* ── KONUM HAFIZASI ─────────────────────────────────────────────────────── */
const KONUM_ONEK = "vukuf-hap-konum-"
const konumAboneleri = new Set()
function konumOku(ad) {
  try {
    const k = JSON.parse(localStorage.getItem(KONUM_ONEK + ad) || "null")
    return k && typeof k.fx === "number" && typeof k.fy === "number" ? k : null
  } catch { return null }
}
export function hapKonumuVarMi() {
  return !!(konumOku("geri") || konumOku("kopru"))
}
export function hapKonumlariniSifirla() {
  try { localStorage.removeItem(KONUM_ONEK + "geri"); localStorage.removeItem(KONUM_ONEK + "kopru") } catch { /* yoksay */ }
  for (const f of konumAboneleri) f()
}

const ESIK = 6        // px — bunu aşmadan sürükleme başlamaz
const KENAR = 8       // px — dolu alanlardan / ekran kenarından en az boşluk

/* Sürüklenebilir hap konumu.
   yan: "sol" | "sag" (varsayılan yatay yer) · altta: varsayılan alt mı üst mü
   altPay / ustPay: alttaki / üstteki DOLU alanın yüksekliği (bar + oynatıcı)
   ek: varsayılan yerde ek kayma (iki hap üst üste gelmesin) */
function useHapKonumu({ ad, yan, altta, altPay = 0, ustPay = 0, ek = 0 }) {
  const ref = useRef(null)
  const [boyut, setBoyut] = useState({ w: 0, h: 0 })
  // Ekran ölçüsü HER ÇİZİMDE pencereden okunur (bkz. aşağıdaki "dönme" notu);
  // bu sayaç yalnız yeniden çizdirmek için.
  const [, setEkranSurum] = useState(0)
  const [kayitli, setKayitli] = useState(() => konumOku(ad))
  const [canli, setCanli] = useState(null)              // sürüklenirken {x, y}
  const [gecis, setGecis] = useState(false)             // ilk ölçümden sonra açılır (yanlış yerden kaymasın)
  const bilgi = useRef({ id: null, x0: 0, y0: 0, sx: 0, sy: 0, aday: false })
  const suruklendi = useRef(false)

  // Boyut (içerik değişince — liste sayısı, etiket uzunluğu)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const olc = () => {
      const r = el.getBoundingClientRect()
      setBoyut(b => (Math.abs(b.w - r.width) > 0.5 || Math.abs(b.h - r.height) > 0.5 ? { w: r.width, h: r.height } : b))
    }
    olc()
    let ro = null
    try { ro = new ResizeObserver(olc); ro.observe(el) } catch { ro = null }
    const t = requestAnimationFrame(() => setGecis(true))
    return () => { try { ro && ro.disconnect() } catch { /* yoksay */ }; cancelAnimationFrame(t) }
  }, [])
  /* ★ DÖNME (4 Ekim 2026, kullanıcı: "yatay moda çevrilince butonlar yatayda
     belirli sınırda sürüklenebiliyor"). Ekran ölçüsü bir duruma (state)
     yazılıyor ve yalnız `resize`ta tazeleniyordu; iOS dönmede `resize`ı
     innerWidth henüz ESKİ (dikey) değerdeyken gönderebiliyor → sınır dikeydeki
     ~430 px'te kalıyor, hap ekranın sol kısmında hapsoluyordu. ARTIK ölçü her
     çizimde ve sürüklemenin her adımında pencereden TAZE okunuyor; dönmeden
     sonra da birkaç kez (gecikmeli) yeniden çizdiriliyor. */
  useEffect(() => {
    const zamanlar = []
    const yenile = () => {
      setEkranSurum(n => n + 1)
      // iOS ölçüyü geç oturtuyor: oturduktan sonra bir kez daha
      zamanlar.push(setTimeout(() => setEkranSurum(n => n + 1), 350))
      zamanlar.push(setTimeout(() => setEkranSurum(n => n + 1), 900))
    }
    window.addEventListener("resize", yenile)
    window.addEventListener("orientationchange", yenile)
    const vv = window.visualViewport
    if (vv) vv.addEventListener("resize", yenile)
    const sifirla = () => setKayitli(null)
    konumAboneleri.add(sifirla)
    return () => {
      window.removeEventListener("resize", yenile)
      window.removeEventListener("orientationchange", yenile)
      if (vv) vv.removeEventListener("resize", yenile)
      zamanlar.forEach(clearTimeout)
      konumAboneleri.delete(sifirla)
    }
  }, [])

  // Sınırlar o anki pencereden (sürüklemede her adımda yeniden hesaplanır)
  const sinirHesapla = () => {
    const g = guvenliAlan()
    const vw = window.innerWidth, vh = window.innerHeight
    const minX = g.sol + KENAR, maxX = Math.max(minX, vw - g.sag - KENAR - boyut.w)
    const minY = Math.max(ustPay, g.ust) + KENAR
    const maxY = Math.max(minY, vh - Math.max(altPay, g.alt) - KENAR - boyut.h)
    return { minX, maxX, minY, maxY, vw, vh }
  }
  const { minX, maxX, minY, maxY, vw, vh } = sinirHesapla()
  const sik = (v, a, b) => Math.max(a, Math.min(b, v))
  let x, y
  if (canli) { x = canli.x; y = canli.y }
  else if (kayitli) { x = kayitli.fx * vw; y = kayitli.fy * vh }
  else {
    x = yan === "sol" ? minX + 6 : maxX - 6
    y = altta ? maxY - 2 - ek : minY + 2 + ek
  }
  x = sik(x, minX, maxX); y = sik(y, minY, maxY)

  // Sınırlar her çizimde güncel; pencere dinleyicileri bunları buradan okur
  const sinir = useRef({})
  sinir.current = sinirHesapla   // sürükleme adımlarında TAZE sınır için
  const canliRef = useRef(null)
  canliRef.current = canli

  /* Sürükleme PENCERE dinleyicileriyle izleniyor: fare hızlı çekilince imleç
     haptan çıkıyor ve hapın kendi olayları kesiliyordu; işaretçi yakalama
     (pointer capture) ise baştan alınırsa içteki düğmenin tıklaması kayboluyor. */
  const olaylar = {
    onPointerDown: (e) => {
      if (e.button != null && e.button > 0) return
      const b = { id: e.pointerId, x0: x, y0: y, sx: e.clientX, sy: e.clientY, aday: true }
      bilgi.current = b
      suruklendi.current = false
      const hareket = (ev) => {
        if (ev.pointerId !== b.id) return
        const dx = ev.clientX - b.sx, dy = ev.clientY - b.sy
        if (b.aday) {
          if (Math.hypot(dx, dy) <= ESIK) return
          b.aday = false
        }
        suruklendi.current = true
        if (ev.cancelable) ev.preventDefault()
        const s = sinir.current()
        setCanli({ x: sik(b.x0 + dx, s.minX, s.maxX), y: sik(b.y0 + dy, s.minY, s.maxY) })
      }
      const bitti = (ev) => {
        if (ev.pointerId !== b.id) return
        window.removeEventListener("pointermove", hareket)
        window.removeEventListener("pointerup", bitti)
        window.removeEventListener("pointercancel", bitti)
        const c = canliRef.current
        if (!b.aday && c && ev.type === "pointerup") {
          const s = sinir.current()
          const yeni = { fx: c.x / s.vw, fy: c.y / s.vh }
          try { localStorage.setItem(KONUM_ONEK + ad, JSON.stringify(yeni)) } catch { /* kota */ }
          setKayitli(yeni)
        }
        setCanli(null)
      }
      window.addEventListener("pointermove", hareket, { passive: false })
      window.addEventListener("pointerup", bitti)
      window.addEventListener("pointercancel", bitti)
    },
    // Sürüklemenin ardından gelen tıklama düğmeyi tetiklemesin
    onClickCapture: (e) => {
      if (suruklendi.current) { e.stopPropagation(); e.preventDefault() }
      suruklendi.current = false
    },
  }
  const stil = {
    position: "fixed", left: `${Math.round(x)}px`, top: `${Math.round(y)}px`,
    touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
    cursor: canli ? "grabbing" : undefined,
    transition: canli || !gecis ? "none" : "left .22s ease, top .22s ease",
  }
  // Liste nereye açılsın: hap ekranın alt yarısındaysa YUKARI, sol yarısındaysa sola yaslı
  return { ref, stil, olaylar, surukleniyor: !!canli, yukari: y + boyut.h / 2 > vh / 2, solda: x + boyut.w / 2 < vw / 2 }
}

/* Ortak hap kabuğu: yüzey zemin, vurgu çerçeve, yumuşak gölge */
const hapKabuk = (theme) => ({
  display: "flex", alignItems: "center", gap: "2px", maxWidth: "100%",
  background: theme.surface, border: `1px solid ${theme.accent}`, borderRadius: "22px",
  padding: "3px", boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
})
/* Ana eylem: soluk vurgu zeminli iç düğme — simge + iki satır (başlık / ayrıntı) */
const anaEylem = (theme) => ({
  display: "flex", alignItems: "center", gap: "7px", minWidth: 0,
  padding: "5px 11px 5px 9px", borderRadius: "19px", border: "none",
  background: `${theme.accent}14`, color: theme.accent, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
})
const kapatDugme = (theme) => ({
  display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", flexShrink: 0,
  borderRadius: "50%", border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer",
})
function IkiSatir({ theme, baslik, alt }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.15 }}>
      <span style={{ fontSize: "12.5px", fontWeight: 700, whiteSpace: "nowrap" }}>{baslik}</span>
      {alt && (
        <span style={{
          fontSize: "10.5px", color: theme.textSecondary, whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis", maxWidth: "170px",
        }}>{alt}</span>
      )}
    </span>
  )
}

/* KÖPRÜ DÜĞMESİ — başka ekrana dönüş (Aramaya / Tefeüle / Okumaya dön). SAĞDA.
   ustuste: "Geri dön" hapı da görünüyorsa varsayılan yerde bir sıra yukarı. */
export function KopruDugmesi({ theme, ikon: Ikon = CornerUpLeft, baslik, alt, onGit, onKapat, altta = true, altPay = 0, ustPay = 0, ustuste = false }) {
  const k = useHapKonumu({ ad: "kopru", yan: "sag", altta, altPay, ustPay, ek: ustuste ? 52 : 0 })
  return (
    <div ref={k.ref} className="vukuf-hap" {...k.olaylar} style={{
      ...k.stil, zIndex: k.surukleniyor ? 125 : 120,
      "--hap-kay": altta ? "8px" : "-8px", maxWidth: "min(260px, calc(100vw - 28px))",
      ...hapKabuk(theme),
      boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : hapKabuk(theme).boxShadow,
    }}>
      <button onClick={onGit} style={anaEylem(theme)} title={baslik}>
        <Ikon size={16} style={{ flexShrink: 0 }} />
        <IkiSatir theme={theme} baslik={baslik} alt={alt} />
      </button>
      {onKapat && (
        <button onClick={onKapat} title="Kapat" aria-label="Kapat" style={kapatDugme(theme)}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function zamanYazi(z) {
  const sn = Math.floor((Date.now() - (z || 0)) / 1000)
  if (sn < 60) return "az önce"
  const dk = Math.floor(sn / 60)
  if (dk < 60) return `${dk} dk önce`
  return `${Math.floor(dk / 60)} sa önce`
}

export default function DonusDugmesi({ theme, noktalar, onGit, onTemizle, altta = true, altPay = 0, ustPay = 0 }) {
  const [listeAcik, setListeAcik] = useState(false)
  if (!noktalar || !noktalar.length) return null
  return <DonusHapi {...{ theme, noktalar, onGit, onTemizle, altta, altPay, ustPay, listeAcik, setListeAcik }} />
}

/* Hap ayrı bileşen: konum kancası yalnız hap GÖRÜNÜRKEN çalışsın (boş listede
   erken dönüş kancaların sırasını bozmasın). */
function DonusHapi({ theme, noktalar, onGit, onTemizle, altta, altPay, ustPay, listeAcik, setListeAcik }) {
  const k = useHapKonumu({ ad: "geri", yan: "sol", altta, altPay, ustPay })
  const ac = theme.accent
  const sonIdx = noktalar.length - 1
  const son = noktalar[sonIdx]
  const git = (i) => { setListeAcik(false); onGit?.(i) }

  return (
    <>
      {listeAcik && (
        <div onClick={() => setListeAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 119 }} />
      )}
      <div ref={k.ref} className="vukuf-hap" {...k.olaylar} style={{
        ...k.stil,
        // Liste açıkken / sürüklenirken köprü hapının da üstünde kalsın
        zIndex: listeAcik || k.surukleniyor ? 122 : 120,
        "--hap-kay": altta ? "8px" : "-8px",
        maxWidth: "min(330px, calc(100vw - 28px))",
      }}>
        {/* HAP */}
        <div style={{ ...hapKabuk(theme), boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : hapKabuk(theme).boxShadow }}>
          <button onClick={() => git(sonIdx)} title={`Geri dön: ${son.etiket}`} style={anaEylem(theme)}>
            <CornerUpLeft size={16} style={{ flexShrink: 0 }} />
            <IkiSatir theme={theme} baslik="Geri dön" alt={son.etiket} />
          </button>
          {noktalar.length > 1 && (
            <button onClick={() => setListeAcik(v => !v)} aria-expanded={listeAcik}
              title="Dönüş noktaları" aria-label={`Dönüş noktaları (${noktalar.length})`}
              style={{
                display: "flex", alignItems: "center", gap: "2px", height: "32px", padding: "0 8px",
                borderRadius: "16px", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: listeAcik ? ac : "transparent", color: listeAcik ? "#fff" : theme.textSecondary,
                fontSize: "12px", fontWeight: 700,
              }}>
              {noktalar.length}
              {(k.yukari ? !listeAcik : listeAcik) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button onClick={() => { setListeAcik(false); onTemizle?.() }} title="Dönüş noktalarını temizle" aria-label="Kapat"
            style={kapatDugme(theme)}>
            <X size={14} />
          </button>
        </div>

        {/* LİSTE — en yeni üstte. Hap ekranın alt yarısındaysa YUKARI, üst
            yarısındaysa AŞAĞI açılır; sağ yarıdaysa sağa yaslanır. Sürükleme
            listeden başlamasın (kaydırılabilsin) diye olaylar burada durduruluyor. */}
        {listeAcik && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
            position: "absolute",
            ...(k.yukari ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
            ...(k.solda ? { left: 0 } : { right: 0 }),
            touchAction: "pan-y",
            width: "min(300px, calc(100vw - 28px))", maxHeight: "min(52vh, 360px)", overflowY: "auto",
            background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "14px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.25)", padding: "6px",
          }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", color: theme.textSecondary, padding: "4px 8px 6px" }}>
              DÖNÜŞ NOKTALARI
            </div>
            {noktalar.map((n, i) => ({ n, i })).reverse().map(({ n, i }) => {
              const Simge = KAYNAK_SIMGE[n.kaynak] || CornerUpLeft
              return (
                <button key={`${i}-${n.z}`} onClick={() => git(i)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "9px", textAlign: "left",
                    padding: "8px", borderRadius: "10px", border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: i === sonIdx ? `${ac}12` : "transparent", color: theme.text,
                  }}>
                  <Simge size={14} color={ac} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.etiket}</span>
                    <span style={{ display: "block", fontSize: "10.5px", color: theme.textSecondary }}>
                      {KAYNAK_ADI[n.kaynak] ? `${KAYNAK_ADI[n.kaynak]} ile ayrıldınız` : "Ayrıldığınız yer"} · {zamanYazi(n.z)}
                    </span>
                  </span>
                </button>
              )
            })}
            <button onClick={() => { setListeAcik(false); onTemizle?.() }}
              style={{
                width: "100%", marginTop: "4px", padding: "7px", borderRadius: "9px", cursor: "pointer",
                border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary,
                fontSize: "11.5px", fontWeight: 600, fontFamily: "inherit",
              }}>
              Listeyi temizle
            </button>
          </div>
        )}
      </div>
    </>
  )
}
