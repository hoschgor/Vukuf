/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — NAMAZ & HATİM TAKİBİ (Ekstralar'ın en altı)
   src/components/NamazHatimTakibi.jsx

   4 Kasım 2026 — kullanıcı: "En alta Namaz & Hatim kontrolü ya da takibi kısmı açıp,
   kaza namazları, günlük namazlar için ve hatim takibi ya da planı için bir bölüm
   yapabiliriz. Hatim için grup ile seçeneği oluşturup, cüz dağıtma vs işlemi
   yapılabilir, tabii zamanlama seçeneği de sunulur. Başlangıç - bitiş zamanı vs."
   Üç sekme:
     • GÜNLÜK — bugünün beş vakti + vitir işaretlenir; son 7 gün görünür, geçmiş bir
       günün kılınamayan farzları tek dokunuşla kazaya eklenir.
     • KAZA — vakit vakit kalan sayılar; "Kıldım" bir düşer, + / − düzeltir, toplu gün
       eklenebilir.
     • HATİM — kendi hatim planı (başlangıç–bitiş, 30 cüz, günlük hedef, plana göre
       ileride/geride, sıradaki cüzü Kur'ân'da açma); GRUP HATMİ (bağlantıyla,
       sunucusuz): kişiler, hatim sayısı, tarih aralığı, cüz dağıtımı (sırayla /
       dönüşümlü / elle), kişiye özel davet bağlantısı; davet edilen kişi kendi
       cüzlerini işaretleyip "okudum" bağlantısını geri gönderir (data/takip.js).
   Kayıtlar yalnız bu cihazda; yedeğe girer (data/vukufVeri.js → "takip").
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ListChecks, Check, Plus, Minus, BookOpen, Users, Share2, Trash2, Pencil, X, CalendarRange, Copy, Send,
} from "lucide-react"
import { Kart, useBolum, dugmeStil } from "./EkstraKart"
import * as T from "../data/takip"

// Kalıcı durum: değişiklik anında cihaza yazılır (efekt yok → açılışta üstüne yazma olmaz)
function useKayit(anahtar, ilk) {
  const [deger, setDeger] = useState(ilk)
  const degistir = (fn) => setDeger(o => { const y = typeof fn === "function" ? fn(o) : fn; T.yaz(anahtar, y); return y })
  return [deger, degistir]
}

// İki dokunuşla onaylanan düğme (silme, sıfırlama)
function OnayDugmesi({ theme, children, onay = "Emin misiniz? Bir daha dokunun", tikla, stil }) {
  const [bekliyor, setBekliyor] = useState(false)
  const t = useRef(0)
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <button onClick={() => {
      if (bekliyor) { clearTimeout(t.current); setBekliyor(false); tikla(); return }
      setBekliyor(true); t.current = setTimeout(() => setBekliyor(false), 3000)
    }} style={{ ...dugmeStil(theme, false), ...(bekliyor ? { borderColor: "#c0392b", color: "#c0392b" } : null), ...stil }}>
      {bekliyor ? onay : children}
    </button>
  )
}

const kucukDugme = (theme, aktif = false) => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px",
  padding: "5px 9px", borderRadius: "8px", fontSize: "12px", fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
  border: `1px solid ${aktif ? theme.accent : theme.border}`, background: aktif ? theme.accent : "transparent",
  color: aktif ? "#fff" : theme.text,
})
const altBaslik = (theme) => ({ fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", color: theme.textSecondary, margin: "14px 0 6px" })
const kutu = (theme) => ({ border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "10px 12px", background: theme.background })

function IlerlemeCubugu({ theme, oran, hedefOran = null }) {
  return (
    <div style={{ position: "relative", height: "8px", borderRadius: "999px", background: `${theme.accent}1f`, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, width: `${Math.round(oran * 100)}%`, background: theme.accent, borderRadius: "999px", transition: "width .3s ease" }} />
      {hedefOran != null && hedefOran > 0 && hedefOran < 1 && (
        <div title="Plana göre bugüne kadar" style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${hedefOran * 100}% - 1px)`, width: "2px", background: theme.text, opacity: 0.45 }} />
      )}
    </div>
  )
}

function PlanSatiri({ theme, pd }) {
  if (!pd.basladi) return <div style={{ fontSize: "12px", color: theme.textSecondary }}>Plan {pd.sure} gün; başlamasına {pd.basaKalan} gün var.</div>
  const durum = pd.kalanCuz === 0 ? null
    : pd.fark > 0 ? <span style={{ color: "#2e9e5b" }}>plana göre {pd.fark} cüz ileride</span>
    : pd.fark < 0 ? <span style={{ color: "#c0392b" }}>plana göre {-pd.fark} cüz geride</span>
    : <span>plana uygun</span>
  return (
    <div style={{ fontSize: "12px", color: theme.textSecondary, lineHeight: 1.5 }}>
      {pd.kalanCuz === 0 ? "Bütün cüzler okundu." : <>
        Kalan {pd.kalanGun} gün · günde ≈ <strong style={{ color: theme.text }}>{pd.gunluk >= 1 ? pd.gunluk.toFixed(pd.gunluk % 1 ? 1 : 0) + " cüz" : Math.ceil(pd.gunlukSayfa) + " sayfa"}</strong>
        {pd.gunluk >= 1 && <> (≈ {Math.ceil(pd.gunlukSayfa)} sayfa)</>}{durum && <> · {durum}</>}
      </>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function NamazHatimTakibi({ theme }) {
  const navigate = useNavigate()
  // Bağlantıyla gelen davet/bildirim — durumlar okunmadan ÖNCE işlenir
  const [gelenMesajlar, setGelenMesajlar] = useState(() => T.gelenleriIsle())
  const bolum = useBolum("takip")
  const [sekme, setSekme] = useKayit(T.SEKME_ANAHTAR, T.oku(T.SEKME_ANAHTAR, "gunluk"))
  const [gunluk, setGunluk] = useKayit(T.GUNLUK_ANAHTAR, T.oku(T.GUNLUK_ANAHTAR, {}))
  const [kaza, setKaza] = useKayit(T.KAZA_ANAHTAR, (() => {
    const k = T.oku(T.KAZA_ANAHTAR, {})
    return { ...T.BOS_KAZA, ...k, kalan: { ...T.BOS_KAZA.kalan, ...(k.kalan || {}) } }
  })())
  const [hatim, setHatim] = useKayit(T.HATIM_ANAHTAR, T.oku(T.HATIM_ANAHTAR, null))
  const [gruplar, setGruplar] = useKayit(T.GRUP_ANAHTAR, T.oku(T.GRUP_ANAHTAR, []))
  const [davetler, setDavetler] = useKayit(T.DAVET_ANAHTAR, T.oku(T.DAVET_ANAHTAR, []))

  // Uygulama açıkken başka bir bağlantı gelirse (aynı sayfada) yeniden işle
  useEffect(() => {
    const f = () => {
      const m = T.gelenleriIsle()
      if (!m.length) return
      setGruplar(T.oku(T.GRUP_ANAHTAR, [])); setDavetler(T.oku(T.DAVET_ANAHTAR, []))
      setGelenMesajlar(o => [...o, ...m]); setSekme("hatim")
    }
    window.addEventListener("focus", f)
    return () => window.removeEventListener("focus", f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const kuranCuzAc = (cuz) => {
    try {
      localStorage.setItem("vukuf-kuran-hedef", JSON.stringify({ cuz }))
      localStorage.setItem("vukuf-donus", "takip")
    } catch { /* yoksay */ }
    navigate("/kuran")
  }

  // Kapalıyken başlıkta kısa özet
  const bugun = T.gunAnahtari()
  const bugunKilinan = T.FARZLAR.filter(n => gunluk[bugun]?.[n.k]).length
  const kazaToplam = Object.values(kaza.kalan).reduce((a, b) => a + (b || 0), 0)
  const hatimOkunan = hatim ? hatim.okunan.filter(Boolean).length : 0
  const ozet = [
    `Bugün ${bugunKilinan}/5`,
    kazaToplam ? `kaza ${kazaToplam}` : null,
    hatim ? `hatim ${hatimOkunan}/30` : null,
    gruplar.length || davetler.length ? `${gruplar.length + davetler.length} grup` : null,
  ].filter(Boolean).join(" · ")

  const SEKMELER = [["gunluk", "Günlük"], ["kaza", "Kaza"], ["hatim", "Hatim"]]
  return (
    <Kart theme={theme} Ikon={ListChecks} baslik="Namaz & Hatim Takibi" alt="Günlük namazlar, kaza ve hatim planı" bolum={bolum} ozet={ozet}>
      <div role="tablist" style={{ display: "flex", gap: "4px", padding: "3px", borderRadius: "11px", border: `1px solid ${theme.border}`, background: theme.background, marginBottom: "12px" }}>
        {SEKMELER.map(([id, ad]) => (
          <button key={id} role="tab" aria-selected={sekme === id} onClick={() => setSekme(id)}
            style={{
              flex: 1, padding: "7px 6px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: "13px", fontWeight: sekme === id ? 700 : 500,
              background: sekme === id ? theme.accent : "transparent", color: sekme === id ? "#fff" : theme.text,
            }}>{ad}</button>
        ))}
      </div>
      {sekme === "gunluk" && <Gunluk theme={theme} gunluk={gunluk} setGunluk={setGunluk} setKaza={setKaza} />}
      {sekme === "kaza" && <Kaza theme={theme} kaza={kaza} setKaza={setKaza} />}
      {sekme === "hatim" && (
        <Hatim theme={theme} hatim={hatim} setHatim={setHatim} gruplar={gruplar} setGruplar={setGruplar}
          davetler={davetler} setDavetler={setDavetler} kuranCuzAc={kuranCuzAc}
          gelenMesajlar={gelenMesajlar} gelenKapat={() => setGelenMesajlar([])} />
      )}
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "12px", lineHeight: 1.5 }}>
        Kayıtlar yalnız bu cihazda saklanır; Ayarlar → Veriler bölümündeki yedeğe dahildir.
      </div>
    </Kart>
  )
}

// ── GÜNLÜK ───────────────────────────────────────────────────────────────────
const GUN_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]
function Gunluk({ theme, gunluk, setGunluk, setKaza }) {
  const bugun = T.gunAnahtari()
  const gunler = useMemo(() => Array.from({ length: 7 }, (_, i) => T.gunEkle(bugun, -i)), [bugun])
  const degistir = (gun, k) => setGunluk(g => {
    const y = { ...g, [gun]: { ...(g[gun] || {}), [k]: !(g[gun] || {})[k] } }
    // 60 günden eski kayıtlar budanır (yer kaplamasın)
    const sinir = T.gunEkle(bugun, -60)
    for (const a of Object.keys(y)) if (a < sinir) delete y[a]
    return y
  })
  const eksikFarzlar = (gun) => T.FARZLAR.filter(n => !(gunluk[gun] || {})[n.k])
  const kazayaEkle = (gun) => {
    const eksik = eksikFarzlar(gun)
    if (!eksik.length) return
    setKaza(k => {
      const kalan = { ...k.kalan }
      eksik.forEach(n => { kalan[n.k] = (kalan[n.k] || 0) + 1 })
      return { ...k, kalan }
    })
    setGunluk(g => ({ ...g, [gun]: { ...(g[gun] || {}), _kaza: eksik.map(n => n.k) } }))
  }
  const bugunKayit = gunluk[bugun] || {}
  return (
    <div>
      <div style={{ fontSize: "12.5px", color: theme.textSecondary, marginBottom: "8px" }}>Bugün kılınan namazlar işaretlenebilir.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
        {T.NAMAZLAR.map(n => {
          const ok = !!bugunKayit[n.k]
          return (
            <button key={n.k} aria-pressed={ok} onClick={() => degistir(bugun, n.k)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px 6px",
                borderRadius: "10px", cursor: "pointer", fontFamily: "inherit", fontSize: "13.5px", fontWeight: 600,
                border: `1px solid ${ok ? theme.accent : theme.border}`, background: ok ? `${theme.accent}1f` : "transparent",
                color: ok ? theme.accent : n.vacip ? theme.textSecondary : theme.text,
              }}>
              <span style={{
                width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                border: `1.5px solid ${ok ? theme.accent : theme.border}`, background: ok ? theme.accent : "transparent",
              }}>{ok && <Check size={12} color="#fff" strokeWidth={3} />}</span>
              {n.ad}
            </button>
          )
        })}
      </div>

      <div style={altBaslik(theme)}>SON 7 GÜN</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {gunler.map((gun, i) => {
          const t = T.anahtardanTarih(gun)
          const kayit = gunluk[gun] || {}
          const eksik = eksikFarzlar(gun)
          return (
            <div key={gun} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderTop: i ? `1px solid ${theme.border}66` : "none" }}>
              <span style={{ width: "62px", flexShrink: 0, fontSize: "12px", color: i ? theme.text : theme.accent, fontWeight: i ? 500 : 700 }}>
                {i === 0 ? "Bugün" : i === 1 ? "Dün" : `${GUN_KISA[t.getDay()]} ${t.getDate()}`}
              </span>
              <span style={{ display: "flex", gap: "5px" }}>
                {T.NAMAZLAR.map(n => {
                  const ok = !!kayit[n.k]
                  const kazada = Array.isArray(kayit._kaza) && kayit._kaza.includes(n.k)
                  return (
                    <button key={n.k} onClick={() => degistir(gun, n.k)} title={`${n.ad}${ok ? " · kılındı" : kazada ? " · kazaya eklendi" : ""}`}
                      aria-label={`${n.ad} ${ok ? "kılındı" : "işaretlenmedi"}`}
                      style={{
                        width: "20px", height: "20px", borderRadius: "50%", padding: 0, cursor: "pointer",
                        border: `1.5px solid ${ok ? theme.accent : kazada ? "#c0392b88" : theme.border}`,
                        background: ok ? theme.accent : "transparent", opacity: n.vacip ? 0.75 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{ok && <Check size={11} color="#fff" strokeWidth={3} />}</button>
                  )
                })}
              </span>
              <span style={{ flex: 1 }} />
              {i > 0 && eksik.length > 0 && !kayit._kaza && (
                <button onClick={() => kazayaEkle(gun)} style={{ ...kucukDugme(theme), fontSize: "11px", padding: "3px 7px" }}>
                  Kazaya ekle ({eksik.length})
                </button>
              )}
              {kayit._kaza && <span style={{ fontSize: "11px", color: theme.textSecondary }}>kazaya eklendi</span>}
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", lineHeight: 1.5 }}>
        Sıra: Sabah, Öğle, İkindi, Akşam, Yatsı, Vitir. Geçmiş bir günün işaretlenmemiş farzları "Kazaya ekle" ile kaza sayılarına eklenir.
      </div>
    </div>
  )
}

// ── KAZA ─────────────────────────────────────────────────────────────────────
function Kaza({ theme, kaza, setKaza }) {
  const [topluGun, setTopluGun] = useState("")
  const toplam = Object.values(kaza.kalan).reduce((a, b) => a + (b || 0), 0)
  const ayarla = (k, d, kilindi = false) => setKaza(o => {
    const simdi = o.kalan[k] || 0
    if (d < 0 && simdi <= 0) return o
    return { ...o, kalan: { ...o.kalan, [k]: Math.max(0, simdi + d) }, kilinan: (o.kilinan || 0) + (kilindi ? 1 : 0) }
  })
  const topluEkle = () => {
    const n = Math.max(0, Math.min(36500, parseInt(topluGun, 10) || 0))
    if (!n) return
    setKaza(o => { const kalan = { ...o.kalan }; T.NAMAZLAR.forEach(x => { kalan[x.k] = (kalan[x.k] || 0) + n }); return { ...o, kalan } })
    setTopluGun("")
  }
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <div style={{ ...kutu(theme), flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: theme.textSecondary }}>Kalan</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: theme.accent, fontVariantNumeric: "tabular-nums" }}>{toplam.toLocaleString("tr-TR")}</div>
        </div>
        <div style={{ ...kutu(theme), flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: theme.textSecondary }}>Kılınan</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: theme.text, fontVariantNumeric: "tabular-nums" }}>{(kaza.kilinan || 0).toLocaleString("tr-TR")}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {T.NAMAZLAR.map((n, i) => (
          <div key={n.k} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 0", borderTop: i ? `1px solid ${theme.border}66` : "none" }}>
            <span style={{ width: "58px", fontSize: "13.5px", fontWeight: 600, color: theme.text }}>{n.ad}</span>
            <span style={{ flex: 1, fontSize: "17px", fontWeight: 700, color: (kaza.kalan[n.k] || 0) ? theme.accent : theme.textSecondary, fontVariantNumeric: "tabular-nums" }}>
              {(kaza.kalan[n.k] || 0).toLocaleString("tr-TR")}
            </span>
            <button aria-label={`${n.ad} sayısını bir azalt`} title="Bir azalt (düzeltme)" onClick={() => ayarla(n.k, -1)} style={{ ...kucukDugme(theme), padding: "5px 7px" }}><Minus size={14} /></button>
            <button aria-label={`${n.ad} sayısını bir artır`} title="Bir artır" onClick={() => ayarla(n.k, 1)} style={{ ...kucukDugme(theme), padding: "5px 7px" }}><Plus size={14} /></button>
            <button onClick={() => ayarla(n.k, -1, true)} disabled={!(kaza.kalan[n.k] || 0)}
              style={{ ...kucukDugme(theme, true), opacity: (kaza.kalan[n.k] || 0) ? 1 : 0.45 }}>
              <Check size={13} /> Kıldım
            </button>
          </div>
        ))}
      </div>
      <div style={altBaslik(theme)}>TOPLU EKLEME</div>
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
        <input type="number" inputMode="numeric" min="1" value={topluGun} onChange={e => setTopluGun(e.target.value)} placeholder="Gün sayısı"
          aria-label="Gün sayısı"
          style={{ width: "110px", padding: "7px 9px", borderRadius: "9px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontFamily: "inherit", fontSize: "13px" }} />
        <button onClick={topluEkle} disabled={!(parseInt(topluGun, 10) > 0)} style={{ ...kucukDugme(theme), opacity: parseInt(topluGun, 10) > 0 ? 1 : 0.5 }}>
          Her vakte ekle
        </button>
      </div>
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", lineHeight: 1.5 }}>
        Girilen gün sayısı beş vakte ve vitire ayrı ayrı eklenir. "Kıldım" kalan sayıyı bir düşürür ve kılınanlara ekler; − ve + yalnız düzeltme içindir.
      </div>
      <div style={{ marginTop: "10px" }}>
        <OnayDugmesi theme={theme} tikla={() => setKaza({ ...T.BOS_KAZA, kalan: { ...T.BOS_KAZA.kalan } })} stil={{ fontSize: "12px", padding: "6px 10px" }}>
          <Trash2 size={13} /> Kaza sayılarını sıfırla
        </OnayDugmesi>
      </div>
    </div>
  )
}

// ── HATİM ────────────────────────────────────────────────────────────────────
function Hatim({ theme, hatim, setHatim, gruplar, setGruplar, davetler, setDavetler, kuranCuzAc, gelenMesajlar, gelenKapat }) {
  const [yeniGrup, setYeniGrup] = useState(false)
  const [acikGrup, setAcikGrup] = useState(null)
  const [bilgi, setBilgi] = useState("")
  const bildir = (m) => { setBilgi(m); setTimeout(() => setBilgi(""), 2600) }
  const paylas = async (metin) => {
    const s = await T.metinPaylas(metin)
    if (s === "kopyalandi") bildir("Mesaj kopyalandı; istenen uygulamaya yapıştırılabilir")
    else if (s === "olmadi") bildir("Paylaşılamadı")
  }
  const kopyala = async (metin) => { try { await navigator.clipboard.writeText(metin); bildir("Mesaj kopyalandı") } catch { bildir("Kopyalanamadı") } }
  const grup = acikGrup ? gruplar.find(g => g.id === acikGrup) : null
  return (
    <div>
      {gelenMesajlar.length > 0 && (
        <div role="status" style={{ ...kutu(theme), borderColor: theme.accent, background: `${theme.accent}12`, marginBottom: "10px", display: "flex", gap: "8px" }}>
          <div style={{ flex: 1, fontSize: "12.5px", color: theme.text, lineHeight: 1.5 }}>{gelenMesajlar.map((m, i) => <div key={i}>{m}</div>)}</div>
          <button onClick={gelenKapat} aria-label="Kapat" style={{ background: "none", border: "none", color: theme.textSecondary, cursor: "pointer", padding: 2, display: "flex" }}><X size={15} /></button>
        </div>
      )}
      {bilgi && <div aria-live="polite" style={{ fontSize: "12px", color: theme.accent, marginBottom: "8px" }}>{bilgi}</div>}

      {grup ? (
        <GrupDetay theme={theme} grup={grup} kapat={() => setAcikGrup(null)} paylas={paylas} kopyala={kopyala}
          guncelle={(fn) => setGruplar(l => l.map(g => (g.id === grup.id ? fn(g) : g)))}
          sil={() => { setGruplar(l => l.filter(g => g.id !== grup.id)); setAcikGrup(null) }} />
      ) : yeniGrup ? (
        <YeniGrup theme={theme} vazgec={() => setYeniGrup(false)}
          kur={(g) => { setGruplar(l => [g, ...l]); setYeniGrup(false); setAcikGrup(g.id) }} />
      ) : (
        <>
          <div style={{ ...altBaslik(theme), marginTop: 0 }}>KENDİ HATMİM</div>
          <KendiHatmim theme={theme} hatim={hatim} setHatim={setHatim} kuranCuzAc={kuranCuzAc} />

          {davetler.length > 0 && <div style={altBaslik(theme)}>KATILDIĞIM GRUP HATİMLERİ</div>}
          {davetler.map(d => (
            <Davet key={d.i + d.k} theme={theme} davet={d} kuranCuzAc={kuranCuzAc} paylas={paylas}
              guncelle={(fn) => setDavetler(l => l.map(x => (x.i === d.i && x.k === d.k ? fn(x) : x)))}
              sil={() => setDavetler(l => l.filter(x => !(x.i === d.i && x.k === d.k)))} />
          ))}

          <div style={altBaslik(theme)}>KURDUĞUM GRUP HATİMLERİ</div>
          {gruplar.length === 0 && (
            <div style={{ fontSize: "12.5px", color: theme.textSecondary, marginBottom: "8px", lineHeight: 1.5 }}>
              Bir grup hatmi kurulduğunda cüzler kişilere dağıtılır ve her kişiye kendi cüzlerinin bağlantısı gönderilebilir.
            </div>
          )}
          {gruplar.map(g => {
            const okunan = Object.keys(g.okunan || {}).length
            const toplam = g.dagitim.length
            return (
              <button key={g.id} onClick={() => setAcikGrup(g.id)}
                style={{ ...kutu(theme), width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: theme.text, marginBottom: "8px", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Users size={16} color={theme.accent} />
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>{g.ad}</span>
                  <span style={{ fontSize: "12px", color: theme.textSecondary }}>{okunan}/{toplam}</span>
                </div>
                <IlerlemeCubugu theme={theme} oran={okunan / toplam} />
                <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "5px" }}>
                  {g.kisiler.length} kişi · {T.tarihYazi(g.bas, false)} – {T.tarihYazi(g.bitis)}
                </div>
              </button>
            )
          })}
          <button onClick={() => setYeniGrup(true)} style={{ ...dugmeStil(theme, false), width: "100%" }}><Users size={15} /> Yeni grup hatmi</button>
        </>
      )}
    </div>
  )
}

// Kendi hatmim: plan + 30 cüz
function KendiHatmim({ theme, hatim, setHatim, kuranCuzAc }) {
  const bugun = T.gunAnahtari()
  const [bas, setBas] = useState(bugun)
  const [bitis, setBitis] = useState(T.gunEkle(bugun, 29))
  if (!hatim) {
    return (
      <div style={kutu(theme)}>
        <div style={{ fontSize: "12.5px", color: theme.text, marginBottom: "8px", lineHeight: 1.5 }}>Başlangıç ve bitiş tarihi seçilerek bir hatim planı kurulabilir.</div>
        <TarihAraligi theme={theme} bas={bas} bitis={bitis} setBas={setBas} setBitis={setBitis} />
        <button onClick={() => setHatim({ bas, bitis, okunan: new Array(T.CUZ).fill(false), biten: 0 })}
          disabled={T.gunFarki(bas, bitis) < 0} style={{ ...dugmeStil(theme, true), width: "100%", marginTop: "10px" }}>
          <CalendarRange size={15} /> Planı başlat
        </button>
      </div>
    )
  }
  const okunanSayisi = hatim.okunan.filter(Boolean).length
  const pd = T.planDurumu({ bas: hatim.bas, bitis: hatim.bitis, okunanSayisi })
  const siradaki = hatim.okunan.findIndex(x => !x)
  return (
    <div style={kutu(theme)}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
        <span style={{ fontSize: "20px", fontWeight: 700, color: theme.accent }}>{okunanSayisi}<span style={{ fontSize: "13px", color: theme.textSecondary }}> / 30 cüz</span></span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: "11.5px", color: theme.textSecondary }}>{T.tarihYazi(hatim.bas, false)} – {T.tarihYazi(hatim.bitis)}</span>
      </div>
      <IlerlemeCubugu theme={theme} oran={okunanSayisi / T.CUZ} hedefOran={pd.basladi ? pd.hedef / T.CUZ : null} />
      <div style={{ marginTop: "6px" }}><PlanSatiri theme={theme} pd={pd} /></div>
      <CuzIzgarasi theme={theme} adet={T.CUZ} okundu={(i) => hatim.okunan[i]}
        tikla={(i) => setHatim(h => ({ ...h, okunan: h.okunan.map((x, j) => (j === i ? !x : x)) }))} />
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
        {siradaki >= 0 ? (
          <button onClick={() => kuranCuzAc(siradaki + 1)} style={kucukDugme(theme, true)}><BookOpen size={14} /> {siradaki + 1}. cüzü Kur'ân'da aç</button>
        ) : (
          <button onClick={() => setHatim(h => ({ ...h, okunan: new Array(T.CUZ).fill(false), biten: (h.biten || 0) + 1, bas: bugun, bitis: T.gunEkle(bugun, Math.max(0, T.gunFarki(h.bas, h.bitis))) }))}
            style={kucukDugme(theme, true)}><Check size={14} /> Hatim tamamlandı · yeni hatme başla</button>
        )}
        <OnayDugmesi theme={theme} tikla={() => setHatim(null)} stil={{ fontSize: "12px", padding: "5px 9px" }}><Trash2 size={13} /> Planı sil</OnayDugmesi>
      </div>
      {(hatim.biten || 0) > 0 && <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "6px" }}>Tamamlanan hatim: {hatim.biten}</div>}
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", lineHeight: 1.5 }}>Okunan cüze dokunularak işaretlenir; ince çizgi plana göre bugüne kadar okunmuş olması gereken yeri gösterir.</div>
    </div>
  )
}

function TarihAraligi({ theme, bas, bitis, setBas, setBitis }) {
  const girdi = { flex: 1, minWidth: 0, padding: "7px 8px", borderRadius: "9px", border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontFamily: "inherit", fontSize: "13px" }
  return (
    <div>
      <div style={{ display: "flex", gap: "8px" }}>
        <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px", fontSize: "11px", color: theme.textSecondary }}>
          Başlangıç<input type="date" value={bas} onChange={e => e.target.value && setBas(e.target.value)} style={girdi} />
        </label>
        <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px", fontSize: "11px", color: theme.textSecondary }}>
          Bitiş<input type="date" value={bitis} min={bas} onChange={e => e.target.value && setBitis(e.target.value)} style={girdi} />
        </label>
      </div>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "7px" }}>
        {[7, 15, 30, 40, 60].map(n => {
          const sec = T.gunFarki(bas, bitis) + 1 === n
          return <button key={n} onClick={() => setBitis(T.gunEkle(bas, n - 1))} style={{ ...kucukDugme(theme, sec), padding: "3px 8px", fontSize: "11.5px" }}>{n} gün</button>
        })}
      </div>
    </div>
  )
}

function CuzIzgarasi({ theme, adet, okundu, tikla, etiket = (i) => String(T.cuzNo(i)), kisi = null, kisiRengi = null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(38px, 1fr))", gap: "5px", marginTop: "10px" }}>
      {Array.from({ length: adet }, (_, i) => {
        const ok = okundu(i)
        return (
          <button key={i} onClick={() => tikla(i)} aria-pressed={!!ok}
            title={`${T.cuzNo(i)}. cüz${kisi ? ` · ${kisi(i)}` : ""}${ok ? " · okundu" : ""}`}
            style={{
              position: "relative", height: "34px", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit",
              fontSize: "12.5px", fontWeight: 700, fontVariantNumeric: "tabular-nums",
              border: `1px solid ${ok ? theme.accent : theme.border}`, background: ok ? theme.accent : theme.surface,
              color: ok ? "#fff" : theme.text,
              boxShadow: kisiRengi ? `inset 0 -3px 0 ${kisiRengi(i)}` : "none",
            }}>{etiket(i)}</button>
        )
      })}
    </div>
  )
}

// Katılımcının cihazında: kendisine düşen cüzler
function Davet({ theme, davet, guncelle, sil, kuranCuzAc, paylas }) {
  const okunan = davet.okunan || {}
  const okunanlar = davet.c.filter(i => okunan[i])
  const kalanGun = T.gunFarki(T.gunAnahtari(), davet.s)
  const siradaki = davet.c.find(i => !okunan[i])
  return (
    <div style={{ ...kutu(theme), marginBottom: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Users size={16} color={theme.accent} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "14px", fontWeight: 600, color: theme.text }}>{davet.g}</span>
          <span style={{ display: "block", fontSize: "11.5px", color: theme.textSecondary }}>
            {davet.k} · {T.tarihYazi(davet.b, false)} – {T.tarihYazi(davet.s)}{kalanGun >= 0 ? ` · ${kalanGun} gün kaldı` : " · süre doldu"}
          </span>
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" }}>
        {davet.c.map(i => {
          const ok = !!okunan[i]
          return (
            <button key={i} aria-pressed={ok} onClick={() => guncelle(d => ({ ...d, okunan: { ...(d.okunan || {}), [i]: !ok } }))}
              style={{ ...kucukDugme(theme, ok) }}>{ok && <Check size={13} />}{T.cuzEtiketi(i, davet.n || 1)}</button>
          )
        })}
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
        {siradaki != null && <button onClick={() => kuranCuzAc(T.cuzNo(siradaki))} style={kucukDugme(theme)}><BookOpen size={14} /> {T.cuzNo(siradaki)}. cüzü aç</button>}
        <button onClick={() => paylas(T.bildirimMesaji(davet, okunanlar))} disabled={!okunanlar.length}
          style={{ ...kucukDugme(theme, true), opacity: okunanlar.length ? 1 : 0.5 }}><Send size={13} /> Okuduğumu bildir</button>
        <OnayDugmesi theme={theme} tikla={sil} stil={{ fontSize: "12px", padding: "5px 9px" }}><Trash2 size={13} /></OnayDugmesi>
      </div>
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", lineHeight: 1.5 }}>Okunan cüze dokunularak işaretlenir; "Okuduğumu bildir" grubu kuran kişiye bir bağlantı gönderir, açtığında liste güncellenir.</div>
    </div>
  )
}

// Yeni grup hatmi formu
function YeniGrup({ theme, kur, vazgec }) {
  const bugun = T.gunAnahtari()
  const [ad, setAd] = useState("")
  const [bas, setBas] = useState(bugun)
  const [bitis, setBitis] = useState(T.gunEkle(bugun, 6))
  const [hatimSayisi, setHatimSayisi] = useState(1)
  const [kisiMetni, setKisiMetni] = useState("")
  const [yontem, setYontem] = useState("sirayla")
  const kisiler = kisiMetni.split(/\n|,/).map(s => s.trim()).filter(Boolean).slice(0, 120)
  const toplam = hatimSayisi * T.CUZ
  const girdi = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "9px", border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontFamily: "inherit", fontSize: "13.5px" }
  const etiket = { display: "block", fontSize: "11.5px", color: theme.textSecondary, margin: "10px 0 4px" }
  return (
    <div style={kutu(theme)}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Users size={16} color={theme.accent} />
        <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: theme.text }}>Yeni grup hatmi</span>
        <button onClick={vazgec} aria-label="Vazgeç" style={{ background: "none", border: "none", color: theme.textSecondary, cursor: "pointer", display: "flex", padding: 2 }}><X size={16} /></button>
      </div>
      <label style={etiket}>Grup adı</label>
      <input value={ad} onChange={e => setAd(e.target.value)} placeholder="Ör. Aile hatmi" style={girdi} maxLength={60} />
      <label style={etiket}>Tarih</label>
      <TarihAraligi theme={theme} bas={bas} bitis={bitis} setBas={setBas} setBitis={setBitis} />
      <label style={etiket}>Hatim sayısı</label>
      <div style={{ display: "flex", gap: "5px" }}>
        {[1, 2, 3, 5].map(n => <button key={n} onClick={() => setHatimSayisi(n)} style={{ ...kucukDugme(theme, hatimSayisi === n), minWidth: "38px" }}>{n}</button>)}
      </div>
      <label style={etiket}>Katılımcılar (her satıra bir ad)</label>
      <textarea value={kisiMetni} onChange={e => setKisiMetni(e.target.value)} rows={4} placeholder={"Ahmet\nAyşe\nMehmet"} style={{ ...girdi, resize: "vertical" }} />
      <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "4px" }}>
        {kisiler.length ? `${kisiler.length} kişi · kişi başı ≈ ${(toplam / kisiler.length).toFixed(toplam % kisiler.length ? 1 : 0)} cüz` : `${toplam} cüz dağıtılacak`}
      </div>
      <label style={etiket}>Dağıtım</label>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        <button onClick={() => setYontem("sirayla")} style={kucukDugme(theme, yontem === "sirayla")}>Sırayla (bitişik cüzler)</button>
        <button onClick={() => setYontem("donusumlu")} style={kucukDugme(theme, yontem === "donusumlu")}>Dönüşümlü</button>
      </div>
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "4px", lineHeight: 1.5 }}>Grup kurulduktan sonra cüzler elle de yeniden dağıtılabilir.</div>
      <button disabled={!kisiler.length || T.gunFarki(bas, bitis) < 0}
        onClick={() => kur({
          id: T.yeniKimlik(), ad: ad.trim() || "Grup hatmi", bas, bitis, hatimSayisi, kisiler,
          dagitim: T.dagit(toplam, kisiler.length, yontem), okunan: {}, kuruldu: bugun,
        })}
        style={{ ...dugmeStil(theme, true), width: "100%", marginTop: "12px", opacity: kisiler.length ? 1 : 0.5 }}>
        <Check size={15} /> Grubu kur ve cüzleri dağıt
      </button>
    </div>
  )
}

// Grubu kuranın cihazında: grup ayrıntısı
const KISI_RENKLERI = ["#c0843a", "#3a7bc0", "#2e9e5b", "#a0479b", "#c0392b", "#3aa6a6", "#7a6a2e", "#5b5bc4"]
function GrupDetay({ theme, grup, guncelle, sil, kapat, paylas, kopyala }) {
  const [duzenle, setDuzenle] = useState(false)
  const okunan = grup.okunan || {}
  const toplam = grup.dagitim.length
  const okunanSayisi = Object.keys(okunan).filter(k => okunan[k]).length
  const pd = T.planDurumu({ bas: grup.bas, bitis: grup.bitis, okunanSayisi, toplam })
  const renk = (k) => KISI_RENKLERI[k % KISI_RENKLERI.length]
  const cuzTikla = (i) => guncelle(g => {
    const o = { ...(g.okunan || {}) }
    if (o[i]) delete o[i]; else o[i] = true
    return { ...g, okunan: o }
  })
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <button onClick={kapat} style={kucukDugme(theme)}>‹ Hatimler</button>
        <span style={{ flex: 1, minWidth: 0, fontSize: "15px", fontWeight: 700, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{grup.ad}</span>
      </div>
      <div style={kutu(theme)}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
          <span style={{ fontSize: "20px", fontWeight: 700, color: theme.accent }}>{okunanSayisi}<span style={{ fontSize: "13px", color: theme.textSecondary }}> / {toplam} cüz</span></span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: "11.5px", color: theme.textSecondary }}>{T.tarihYazi(grup.bas, false)} – {T.tarihYazi(grup.bitis)}</span>
        </div>
        <IlerlemeCubugu theme={theme} oran={okunanSayisi / toplam} hedefOran={pd.basladi ? pd.hedef / toplam : null} />
        <div style={{ marginTop: "6px" }}><PlanSatiri theme={theme} pd={pd} /></div>
        {grup.hatimSayisi > 1 && <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "4px" }}>{grup.hatimSayisi} hatim · {toplam} cüz</div>}
      </div>

      <div style={altBaslik(theme)}>KİŞİLER</div>
      {grup.kisiler.map((ad, k) => {
        const cuzler = []
        grup.dagitim.forEach((x, i) => { if (x === k) cuzler.push(i) })
        const okunanlar = cuzler.filter(i => okunan[i]).length
        return (
          <div key={k} style={{ ...kutu(theme), marginBottom: "6px", padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: renk(k), flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: "13.5px", fontWeight: 600, color: theme.text }}>{ad}</span>
              <span style={{ fontSize: "11.5px", color: theme.textSecondary }}>{okunanlar}/{cuzler.length}</span>
              <button onClick={() => paylas(T.davetMesaji(grup, k))} disabled={!cuzler.length} aria-label={`${ad} için davet bağlantısını paylaş`} title="Davet bağlantısını paylaş"
                style={{ ...kucukDugme(theme), padding: "4px 7px" }}><Share2 size={13} /></button>
              <button onClick={() => kopyala(T.davetMesaji(grup, k))} disabled={!cuzler.length} aria-label={`${ad} için mesajı kopyala`} title="Mesajı kopyala"
                style={{ ...kucukDugme(theme), padding: "4px 7px" }}><Copy size={13} /></button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
              {cuzler.length ? cuzler.map(i => (
                <button key={i} onClick={() => cuzTikla(i)} aria-pressed={!!okunan[i]}
                  style={{ ...kucukDugme(theme, !!okunan[i]), padding: "3px 7px", fontSize: "11.5px" }}>
                  {okunan[i] && <Check size={11} />}{grup.hatimSayisi > 1 ? T.cuzEtiketi(i, grup.hatimSayisi) : `${T.cuzNo(i)}. cüz`}
                </button>
              )) : <span style={{ fontSize: "11.5px", color: theme.textSecondary }}>Cüz atanmadı</span>}
            </div>
          </div>
        )
      })}

      <div style={altBaslik(theme)}>CÜZLER</div>
      {duzenle ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {grup.dagitim.map((k, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: theme.text }}>
              <span style={{ width: "110px", flexShrink: 0 }}>{T.cuzEtiketi(i, grup.hatimSayisi)}</span>
              <select value={k} onChange={e => { const v = Number(e.target.value); guncelle(g => ({ ...g, dagitim: g.dagitim.map((x, j) => (j === i ? v : x)) })) }}
                style={{ flex: 1, minWidth: 0, padding: "5px 8px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontFamily: "inherit", fontSize: "12.5px" }}>
                {grup.kisiler.map((ad, j) => <option key={j} value={j}>{ad}</option>)}
              </select>
            </label>
          ))}
          <button onClick={() => setDuzenle(false)} style={{ ...dugmeStil(theme, true), marginTop: "6px" }}><Check size={14} /> Dağıtım tamam</button>
          <div style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.5 }}>Dağıtım değiştiyse kişilere yeni davet bağlantısı gönderilmesi gerekir.</div>
        </div>
      ) : (
        <>
          <CuzIzgarasi theme={theme} adet={toplam} okundu={(i) => okunan[i]} tikla={cuzTikla}
            etiket={(i) => (grup.hatimSayisi > 1 ? `${Math.floor(i / T.CUZ) + 1}·${T.cuzNo(i)}` : String(T.cuzNo(i)))}
            kisi={(i) => grup.kisiler[grup.dagitim[i]]} kisiRengi={(i) => renk(grup.dagitim[i])} />
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
            <button onClick={() => setDuzenle(true)} style={kucukDugme(theme)}><Pencil size={13} /> Dağıtımı düzenle</button>
            <OnayDugmesi theme={theme} tikla={sil} stil={{ fontSize: "12px", padding: "5px 9px" }}><Trash2 size={13} /> Grubu sil</OnayDugmesi>
          </div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", lineHeight: 1.5 }}>
            Cüzün altındaki renk kime düştüğünü gösterir; dokunulunca okundu olarak işaretlenir. Katılımcıların "okudum" bağlantıları bu cihazda açılınca işaretler kendiliğinden güncellenir.
          </div>
        </>
      )}
    </div>
  )
}
