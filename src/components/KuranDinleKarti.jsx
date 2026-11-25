/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — EKSTRALAR → KUR'AN DİNLE KARTI
   src/components/KuranDinleKarti.jsx

   11 Kasım 2026 — kullanıcı: "Kâri eğer cüz cüz okuyorsa, o kâri seçildiğinde cüz
   seçenek olarak verilir. Âyet âyet okuyorsa âyet, sûre sûre okuyorsa sûre. Diğer
   seçeneklerin üzeri kapalı (koyu renkli bir belirteç) olarak verilir ki kullanıcı
   bunun sistemde mevcut olmadığını anlasın." "Otomatik kapanma ayarı burada da
   buton ile yapılsın."
   • Kâri seçilir → Cüz / Sûre / Âyet seçeneklerinden o kârinin kaydı olanlar açık,
     olmayanlar çizgili koyu belirteçle kapalı. Kayıtta eksik olan tek tek cüz/sûreler
     de aynı belirteçle kapalı (ör. bir arşiv kaydında bulunmayan sûre).
   • Parçaya dokunulunca çalar; çalan parçaya yeniden dokunulunca duraklar/sürer.
   • Sürekli çalma (anahtar): parça bitince sıradaki. Otomatik kapanma (anahtar + süre).
   • Kaldığınız yer: son dinlenen parça (uzun kayıtlarda dakikasıyla) — "Devam" ile sürer.
   Ses uygulama kökünde (data/kuranDinle.jsx); sayfadan çıkınca küçük hap görünür.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Headphones, Play, Pause, X, Loader2, ExternalLink, Repeat, RotateCcw, History, Search, Pencil, Check, Eye, EyeOff, ChevronDown, ChevronUp, Plus, ChevronLeft, Share2, ListMusic, ListPlus, Trash2, Hourglass } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Kart, useBolum, dugmeStil } from "./EkstraKart"
import IosSwitch from "./IosSwitch"
import OtomatikDurdurmaSecici from "./OtomatikDurdurmaSecici"
import { sureAdi, SURE_ADLARI } from "../data/sureAdlari"
import {
  useKuranDinle, KARILER, TURLER, AYET_SAYILARI, kariBul, kaynakBilgisi, parcaAdi,
  useParcaListesi, useDinleZamani, sureYazisi, sonKonumOku,
  useEkKariler, ekKariEkle, ekKariSil, way2Dizin, way2Ara, rivayetAdi, sureAra,
  useKariDuzen, kariDuzenYaz, kariGizleDegis, kariSirala,
  useCalmaListesi, calmaListesiYaz, listeSirasi,
} from "../data/kuranDinle"
import PaylasimPenceresi from "./PaylasimPenceresi"
import { OncekiSimgesi, SonrakiSimgesi, OnSaniyeSimgesi, DurdurSimgesi, AmblemDugmesi } from "./CerceveliSimge"
import { DINLE_PAYLASIM_ANAHTAR } from "../data/paylasim"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
// Çalar paneli küçük hapla aynı görünüm (12 Kasım 2026): rahle amblemi + yuvarlak düğmeler
import { DinleAmblemi, DINLE_HAP_CSS, useHapIlerleme, hapIlerlemeYaz } from "./MiniKuranDinle"
import EkstraSesDugmesi from "./EkstraSesDugmesi"

const KARI_ANAHTAR = "vukuf-kuran-dinle-kari"
const TUR_ANAHTAR = "vukuf-kuran-dinle-tur"           // { kariId: "cuz" | "sure" | "ayet" }
const oku = (k, v) => { try { const x = JSON.parse(localStorage.getItem(k) || "null"); return x ?? v } catch { return v } }
const yaz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* yoksay */ } }

// Mevcut olmayan seçenekler için koyu, çizgili belirteç
const kapaliZemin = (theme) =>
  `repeating-linear-gradient(135deg, ${theme.text}45 0 5px, ${theme.text}26 5px 10px)`

const besmeleli = (s) => s !== 1 && s !== 9

/* ÇALAR EKLERİ (15 Kasım 2026) — kullanıcı: "oynatıcıda fazlalık butonları ok işareti ile
   gizleyelim, açıldığında 10 sn ileri - geri düğmesi ve paylaşma düğmesi olsun." Ses düğmesi de
   buraya alındı (ana satır sadeleşsin). Kendi bileşeni: zaman her saniye değiştiği için yalnız
   bu küçük satır yeniden çizilir. */
function CalarEkleri({ theme, dinle, stil, onPaylas }) {
  const z = useDinleZamani()
  const atla10 = (y) => dinle.sar(Math.max(0, (z.su || 0) + y * 10))
  const onluk = (yon, etiket, tikla) => (
    <button onClick={tikla} aria-label={etiket} title={etiket} style={stil}>
      <OnSaniyeSimgesi yon={yon} ac={theme.accent} />
    </button>
  )
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "0 4px" }}>
      {onluk(-1, "10 saniye geri", () => atla10(-1))}
      {onluk(1, "10 saniye ileri", () => atla10(1))}
      <EkstraSesDugmesi theme={theme} stil={stil} cerceve="yildiz" />
      <button onClick={() => onPaylas(Math.floor(z.su || 0))} aria-label="Paylaş" title="Paylaş" style={stil}><Share2 size={15} /></button>
    </div>
  )
}

function Ilerleme({ theme, dinle }) {
  const z = useDinleZamani()
  const [suruk, setSuruk] = useState(null)
  const su = suruk ?? z.su
  const toplam = z.toplam || 0
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "11px", color: theme.textSecondary, minWidth: "38px", fontVariantNumeric: "tabular-nums" }}>{sureYazisi(su)}</span>
      <input type="range" min="0" max={toplam || 1} step="1" value={Math.min(su, toplam || 1)} disabled={!toplam}
        aria-label="Konum"
        onChange={(e) => setSuruk(+e.target.value)}
        onPointerUp={() => { if (suruk != null) { dinle.sar(suruk); setSuruk(null) } }}
        onKeyUp={() => { if (suruk != null) { dinle.sar(suruk); setSuruk(null) } }}
        onBlur={() => { if (suruk != null) { dinle.sar(suruk); setSuruk(null) } }}
        style={{ flex: 1, minWidth: 0, accentColor: theme.accent }} />
      <span style={{ fontSize: "11px", color: theme.textSecondary, minWidth: "38px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{toplam ? sureYazisi(toplam) : "–:––"}</span>
    </div>
  )
}

/* ÇALMA LİSTESİ ÇİPİ (16 Kasım 2026) — kullanıcı: "Playlist içindeki parçalar sürüklenerek yer
   değiştirebilsin". Çipin kendisi sürüklenir (dokunmatikte kısa basılı tutup); × listeden çıkarır. */
function ListeCipi({ n, sira, ad, vr, theme, onSil }) {
  const ac = theme.accent
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(n) })
  return (
    <span ref={setNodeRef} {...attributes} {...listeners} title="Sırasını değiştirmek için sürükleyin"
      style={{
        display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 4px 3px 8px", borderRadius: "999px",
        border: `1px solid ${isDragging ? ac : theme.border}`, background: theme.surface, fontSize: "11.5px", color: theme.text,
        opacity: vr ? 1 : 0.55, cursor: isDragging ? "grabbing" : "grab", touchAction: "manipulation", userSelect: "none",
        transform: CSS.Transform.toString(transform), transition, position: "relative", zIndex: isDragging ? 5 : "auto",
        boxShadow: isDragging ? "0 8px 20px rgba(0,0,0,0.2)" : "none",
      }}>
      <span style={{ color: ac, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{sira}</span> {ad}
      <button onClick={onSil} onPointerDown={(e) => e.stopPropagation()}
        aria-label={`${ad} listeden çıkarılsın`} title="Listeden çıkar"
        style={{ display: "flex", padding: "1px", background: "none", border: "none", cursor: "pointer", color: theme.textSecondary }}>
        <X size={12} />
      </button>
    </span>
  )
}

/* KÂRİ ÇİPİ (14 Kasım 2026) — düzenleme kipinde sürüklenerek sıralanır (dnd-kit, ızgara);
   göz ile gizlenir; aramadan eklenen (kesik çizgili) × ile listeden çıkarılır. */
function KariCipi({ k, sec, calarK, gizli, duzenle, theme, onSec, onGizle, onSil }) {
  const ac = theme.accent
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: k.id, disabled: !duzenle })
  const alt = k.ek && k.alt !== "Hafs" ? k.alt : null
  const ortak = {
    display: "inline-flex", alignItems: "center", gap: "5px", fontFamily: "inherit", fontSize: "12.5px",
    color: sec ? "#fff" : theme.text, fontWeight: sec ? 600 : 500,
  }
  const cerceve = {
    display: "inline-flex", alignItems: "center", borderRadius: "999px",
    border: `1px ${k.ek ? "dashed" : "solid"} ${sec || isDragging ? ac : theme.border}`, background: sec ? ac : theme.surface,
    opacity: gizli ? 0.45 : 1,
    transform: CSS.Transform.toString(transform), transition,
    boxShadow: isDragging ? "0 8px 20px rgba(0,0,0,0.2)" : "none", position: "relative", zIndex: isDragging ? 5 : "auto",
  }
  if (!duzenle) {
    return (
      <span ref={setNodeRef} style={cerceve}>
        <button onClick={() => onSec(k.id)} aria-pressed={sec}
          title={k.ek ? `${k.ad} · ${k.alt} · way2quran` : TURLER.filter(t => k.kaynaklar[t.id]).map(t => t.ad).join(" · ")}
          style={{ ...ortak, padding: "6px 11px", border: "none", background: "none", cursor: "pointer", borderRadius: "999px" }}>
          {calarK && <span aria-hidden="true" className="vk-kerahat-nokta" style={{ width: 6, height: 6, borderRadius: "50%", background: sec ? "#fff" : ac }} />}
          {k.ad}
          {alt && <span style={{ fontSize: "10.5px", opacity: 0.8 }}>· {alt}</span>}
        </button>
      </span>
    )
  }
  const kucuk = (etiket, Ikon, tikla, renk) => (
    <button type="button" onClick={(e) => { e.stopPropagation(); tikla() }}
      onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
      aria-label={etiket} title={etiket}
      style={{ display: "flex", alignItems: "center", padding: "6px 7px", border: "none", background: "none", cursor: "pointer", color: renk }}>
      <Ikon size={13} />
    </button>
  )
  return (
    <span ref={setNodeRef} {...attributes} {...listeners}
      style={{ ...cerceve, cursor: "grab", touchAction: "manipulation", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ ...ortak, padding: "6px 2px 6px 11px" }}>
        {k.ad}
        {alt && <span style={{ fontSize: "10.5px", opacity: 0.8 }}>· {alt}</span>}
        {gizli && <span style={{ fontSize: "10px", opacity: 0.8, marginLeft: "2px" }}>gizli</span>}
      </span>
      {kucuk(gizli ? `${k.ad} — göster` : `${k.ad} — gizle`, gizli ? EyeOff : Eye, () => onGizle(k.id), sec ? "#fff" : gizli ? theme.textSecondary : ac)}
      {k.ek && kucuk(`${k.ad} — listeden çıkar`, X, () => onSil(k.id), sec ? "#fff" : theme.textSecondary)}
      {!k.ek && <span style={{ width: "4px" }} />}
    </span>
  )
}

/* WAY2QURAN KÂRİ ARAMASI (12 Kasım 2026) — kayıtlı kâriler değişmez; buradan seçilen kâri
   "ek kâri" olur. 14 Kasım 2026: ek kâri artık KÂRİ listesinin içine girer (kesik çizgili
   çip); düzenleme kipinde × ile çıkarılır. Dizin ilk açılışta indirilir (~100 KB).
   listede: zaten listede olan kimlikler (düğme "Listede" yazar, dokununca yalnız seçer). */
function KariArama({ theme, onSec, onKapat, listede }) {
  const ac = theme.accent
  const [sorgu, setSorgu] = useState("")
  const [dizin, setDizin] = useState(null)
  const [durum, setDurum] = useState("yukleniyor")      // yukleniyor | hazir | yok
  const [deneme, setDeneme] = useState(0)
  useEffect(() => {
    let iptal = false
    setDurum("yukleniyor")
    way2Dizin().then(d => { if (!iptal) { setDizin(d); setDurum("hazir") } }).catch(() => { if (!iptal) setDurum("yok") })
    return () => { iptal = true }
  }, [deneme])
  const sonuc = useMemo(() => (dizin && sorgu.trim().length >= 2 ? way2Ara(dizin, sorgu, 40) : []), [dizin, sorgu])
  // Dizin değeri: 114 | [sûre no…] | { n: 114 | […], f: {…} }
  const sayiOf = (v) => {
    const n = v && typeof v === "object" && !Array.isArray(v) ? v.n : v
    return Array.isArray(n) ? n.length : Number(n) || 0
  }
  return (
    <div style={{ margin: "0 0 12px", padding: "10px", borderRadius: "14px", border: `1px solid ${ac}55`, background: `${ac}08` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Search size={15} color={theme.textSecondary} style={{ flexShrink: 0 }} />
        <input value={sorgu} onChange={e => setSorgu(e.target.value)} autoFocus placeholder="Kâri adı (ör. Alafasy, Minshawi)"
          aria-label="Kâri ara" enterKeyHint="search"
          style={{ flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontFamily: "inherit", fontSize: "13px" }} />
        <button onClick={onKapat} aria-label="Aramayı kapat" title="Kapat"
          style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <X size={15} />
        </button>
      </div>
      <div style={{ fontSize: "11px", color: theme.textSecondary, margin: "6px 2px 0", lineHeight: 1.45 }}>
        {durum === "yukleniyor" && <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Loader2 size={12} className="vk-don" /> Kâri dizini hazırlanıyor…</span>}
        {durum === "yok" && (
          <span>Kâri dizini şu an alınamadı. <button onClick={() => setDeneme(x => x + 1)} style={{ background: "none", border: "none", padding: 0, color: ac, cursor: "pointer", fontFamily: "inherit", fontSize: "11px", textDecoration: "underline" }}>Tekrar dene</button></span>
        )}
        {durum === "hazir" && sorgu.trim().length < 2 && `${dizin.length.toLocaleString("tr-TR")} kâri arasında aranabilir · kayıtlar way2quran.com'dan çalınır`}
        {durum === "hazir" && sorgu.trim().length >= 2 && !sonuc.length && "Bu adla bir kâri bulunamadı."}
      </div>
      {sonuc.length > 0 && (
        <div style={{ marginTop: "8px", maxHeight: "260px", overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column", gap: "4px" }}>
          {sonuc.map(x => {
            const rivayetler = Object.entries(x.r)
            return (
              <div key={x.s} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.surface }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.a}</div>
                </div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {rivayetler.map(([rv, v]) => {
                    const varMi = listede && listede.has(`way2:${x.s}:${rv}`)
                    return (
                      <button key={rv} onClick={() => onSec({ slug: x.s, ad: x.a, rivayet: rv, kapsam: v })}
                        title={`${x.a} · ${rivayetAdi(rv)} · ${sayiOf(v)} sûre${varMi ? " · listede" : " · listeye ekle"}`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "3px",
                          padding: "5px 9px", borderRadius: "999px", cursor: "pointer", fontFamily: "inherit", fontSize: "11.5px", fontWeight: 600, whiteSpace: "nowrap",
                          border: `1px solid ${ac}`, background: varMi ? "transparent" : ac, color: varMi ? ac : "#fff",
                        }}>
                        {varMi ? <Check size={12} /> : <Plus size={12} />}
                        {rivayetler.length > 1 ? rivayetAdi(rv) : varMi ? "Listede" : "Ekle"}
                        <span style={{ fontWeight: 400, opacity: 0.85 }}> · {sayiOf(v)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function KuranDinleKarti({ theme }) {
  const dinle = useKuranDinle()
  const hapIlerleme = useHapIlerleme()
  const bolum = useBolum("kuran-dinle")
  const ac = theme.accent
  const [kariId, setKariIdD] = useState(() => (kariBul(oku(KARI_ANAHTAR, null)) ? oku(KARI_ANAHTAR, null) : KARILER[0].id))
  const [turlar, setTurlar] = useState(() => oku(TUR_ANAHTAR, {}) || {})
  const ekKariler = useEkKariler()          // aramadan eklenenler (değişince yeniden çizilsin)
  const [aramaAcik, setAramaAcik] = useState(false)
  // KÂRİ LİSTESİ DÜZENİ (14 Kasım 2026): kayıtlı + eklenen kâriler tek listede; sıra, gizli, çekmece
  const duzen = useKariDuzen()
  const [kariDuzenle, setKariDuzenle] = useState(false)
  const tumKariler = useMemo(() => [...KARILER, ...ekKariler], [ekKariler])
  const kariSira = useMemo(() => kariSirala(duzen.sira, tumKariler.map(k => k.id)), [duzen.sira, tumKariler])
  const kariMap = useMemo(() => new Map(tumKariler.map(k => [k.id, k])), [tumKariler])
  const sirali = useMemo(() => kariSira.map(id => kariMap.get(id)).filter(Boolean), [kariSira, kariMap])
  const gorunen = useMemo(() => sirali.filter(k => !duzen.gizli.includes(k.id)), [sirali, duzen.gizli])
  const cekmeceKapali = duzen.kapali && !kariDuzenle
  const listedeKimlikler = useMemo(() => new Set(ekKariler.map(k => k.id)), [ekKariler])
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 170, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  // Sûre araması (Sûre ve Âyet kipinde) — 12 Kasım 2026
  const [sureAramaAcik, setSureAramaAcik] = useState(false)
  const [sureSorgu, setSureSorgu] = useState("")
  const sureSonuc = useMemo(() => (sureSorgu.trim() ? sureAra(sureSorgu) : null), [sureSorgu])
  const kari = kariBul(kariId) || KARILER[0]
  const ilkTur = TURLER.find(t => kari.kaynaklar[t.id])?.id
  const tur = turlar[kari.id] && kari.kaynaklar[turlar[kari.id]] ? turlar[kari.id] : ilkTur
  const setKari = (id) => { setKariIdD(id); yaz(KARI_ANAHTAR, id) }
  // Seçili kâri gizlenirse (ya da listeden çıkarılırsa) görünen ilk kâriye geçilir
  useEffect(() => {
    if (kariDuzenle || !gorunen.length) return
    if (!gorunen.some(k => k.id === kari.id)) setKari(gorunen[0].id)
  }, [kariDuzenle, gorunen, kari.id])   // eslint-disable-line react-hooks/exhaustive-deps
  const kariGizle = (id) => {
    // Son görünen kâri gizlenemez (liste boş kalmasın)
    if (!duzen.gizli.includes(id) && gorunen.length <= 1) return
    kariGizleDegis(id)
  }
  const kariCikar = (id) => {
    if (id === kari.id) { const b = gorunen.find(k => k.id !== id) || KARILER[0]; setKari(b.id) }
    ekKariSil(id)
  }
  const kariSuruk = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const a = kariSira.indexOf(active.id), b = kariSira.indexOf(over.id)
    if (a < 0 || b < 0) return
    kariDuzenYaz({ sira: arrayMove(kariSira, a, b) })
  }
  const setTur = (t) => { const y = { ...turlar, [kari.id]: t }; setTurlar(y); yaz(TUR_ANAHTAR, y) }

  /* PARÇA LİSTESİ ÇEKMECESİ (15 Kasım 2026) — kullanıcı: "Sure - cüz - ayet listesini çekmeceye
     alalım, ara butonuna basılırsa sadece arama sonuçları görünsün, çekmece açılırsa tamamı
     görünsün." Kapalı başlar; açık/kapalı cihazda saklanır. */
  const [listeAcik, setListeAcikD] = useState(() => oku("vukuf-kuran-dinle-liste-acik", false) === true)
  const setListeAcik = (v) => { setListeAcikD(v); yaz("vukuf-kuran-dinle-liste-acik", !!v) }
  // ÇALMA LİSTESİ (15 Kasım 2026) — data/kuranDinle.jsx; sûre ve cüz için ayrı
  const cl = useCalmaListesi()
  const lt = tur === "ayet" ? null : cl[tur]
  /* LİSTEYE EKLEME (16 Kasım 2026) — kullanıcı: "Listeye ekle butonunu kaldıralım, bunun yerine
     yukarıdaki ok işareti açılırsa kısım bölümü açılacak ya, oradan ekleriz." Çalma listesi açıkken
     KISIMLAR çekmecesinden dokunulan parça listeye eklenir/çıkar — çalarken ve "Kalanını sıraya göre
     ekle" basılıyken de (çekmece açılınca). */
  const secimKipi = cl.acik && !!lt       // parçaya dokunmak listeye ekler/çıkarır
  /* SÜRÜKLEME İPUCU — "Sıra değiştirmek için çiplerin sürükleneceği bilgisini 5 sn erase ile verelim
     ama kutu boyutunu bozmadan yapalım": başlıktaki "N parça" yazısının YERİNDE (tek satır) 5 sn
     görünür, sonra soldan sağa silinerek "N parça"ya döner — panelin boyu değişmez. Liste ikinci
     parçayı alınca (ya da panel açılınca) bir kez. */
  const coklu = !!lt && lt.parcalar.length > 1
  const [suruklemeIpucu, setSuruklemeIpucu] = useState(false)
  useEffect(() => {
    if (!cl.acik || !coklu) { setSuruklemeIpucu(false); return }
    setSuruklemeIpucu(true)
    const t = setTimeout(() => setSuruklemeIpucu(false), 5000)
    return () => clearTimeout(t)
  }, [cl.acik, coklu, tur])
  const listeyeDokun = (no) => {
    const l = lt.parcalar.includes(no) ? lt.parcalar.filter(x => x !== no) : [...lt.parcalar, no]
    calmaListesiYaz({ [tur]: { ...lt, parcalar: l } })
  }
  const listeSirasiNo = (no) => (cl.acik && lt ? lt.parcalar.indexOf(no) + 1 : 0)
  // Paylaşma (15 Kasım 2026) — kâri + parça; detaylı paylaşımda dinlenen saniye
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [paylasVeri, setPaylasVeri] = useState(null)
  const [ekAcik, setEkAcik] = useState(false)          // çalardaki fazlalık düğmeler
  const kartRef = useRef(null)

  // GELEN PAYLAŞIM (15 Kasım 2026): data/paylasim.js "?d=…" bağlantısını buraya bırakır
  useEffect(() => {
    let g = null
    try { g = JSON.parse(localStorage.getItem(DINLE_PAYLASIM_ANAHTAR) || "null"); localStorage.removeItem(DINLE_PAYLASIM_ANAHTAR) } catch { g = null }
    if (!g || !dinle) return
    if (!kariBul(g.kariId) && String(g.kariId).startsWith("way2:")) {
      const [, slug, rivayet] = String(g.kariId).split(":")
      if (slug && rivayet) ekKariEkle({ slug, rivayet, ad: g.ad || slug })
    }
    if (!kariBul(g.kariId)) return
    setKari(g.kariId)
    setTurlar(t => { const y = { ...t, [g.kariId]: g.tur }; yaz(TUR_ANAHTAR, y); return y })
    if (g.tur === "ayet") setAyetSure(g.parca)
    // Tarayıcı dokunuşsuz sesli başlatmaya izin vermezse "duraklatıldı" kalır, ▶ ile o saniyeden sürer
    dinle.baslat({ kariId: g.kariId, tur: g.tur, parca: g.parca, ayet: g.ayet, zaman: g.zaman || 0 })
    setTimeout(() => { try { kartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) } catch { /* yoksay */ } }, 350)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const liste = useParcaListesi(kari, tur)
  const calan = dinle?.calan || null
  const durum = dinle?.durum || "kapali"
  const buKari = calan && calan.kariId === kari.id && calan.tur === tur
  const [ayetSure, setAyetSure] = useState(() => (calan && calan.tur === "ayet" ? calan.parca : 1))
  useEffect(() => { if (buKari && calan.tur === "ayet") setAyetSure(calan.parca) }, [buKari, calan?.parca])   // eslint-disable-line react-hooks/exhaustive-deps

  const [son, setSon] = useState(() => sonKonumOku())
  useEffect(() => { if (!calan) setSon(sonKonumOku()) }, [calan, durum])

  const calarDurum = durum === "caliyor" || durum === "yukleniyor"
  const ozet = calan
    ? `${kariBul(calan.kariId)?.ad} · ${parcaAdi(calan.tur, calan.parca, calan.ayet)} · ${durum === "caliyor" ? "çalıyor" : durum === "yukleniyor" ? "yükleniyor" : durum === "hata" ? "açılamadı" : durum === "bitti" ? "bitti" : "duraklatıldı"}`
    : son ? `Kaldığınız yer: ${kariBul(son.kariId)?.ad} · ${parcaAdi(son.tur, son.parca, son.ayet)}` : undefined

  const dokun = (parca, ayet = null) => {
    if (!dinle) return
    const ayni = calan && calan.kariId === kari.id && calan.tur === tur && calan.parca === parca &&
      (tur !== "ayet" || calan.ayet === ayet || (ayet === 1 && calan.ayet === 0))
    if (ayni && durum !== "hata" && durum !== "bitti") { calarDurum ? dinle.duraklat() : dinle.devam(); return }
    if (tur === "ayet") dinle.baslat({ kariId: kari.id, tur, parca, ayet: ayet === 1 && besmeleli(parca) ? 0 : ayet })
    else dinle.baslat({ kariId: kari.id, tur, parca })
  }
  const devamEt = () => {
    if (!son || !dinle) return
    setKari(son.kariId)
    setTurlar(t => { const y = { ...t, [son.kariId]: son.tur }; yaz(TUR_ANAHTAR, y); return y })
    dinle.baslat(son)
  }

  const kaynak = kaynakBilgisi(kari.kaynaklar[tur])
  // Küçük haptaki yuvarlak düğmeler (MiniKuranDinle / MiniRadyo ile aynı ölçü ve renk)
  const yuvarlak = (vurgu) => ({
    width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    border: "none", background: vurgu ? ac : "transparent", color: vurgu ? "#fff" : theme.textSecondary,
  })
  const varSayisi = liste.parcalar.filter(p => p.var && p.no !== "dua").length
  const toplamSayi = tur === "cuz" ? 30 : 114

  // ── parça düğmesi biçimi
  const parcaStil = (vr, aktif, genis, listede = 0) => ({
    position: "relative", padding: genis ? "7px 9px" : "8px 0", borderRadius: "9px", fontFamily: "inherit",
    fontSize: genis ? "12.5px" : "13px", fontWeight: aktif ? 700 : 500, textAlign: genis ? "left" : "center",
    cursor: vr ? "pointer" : "not-allowed", minWidth: 0,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    border: `1px solid ${aktif ? ac : theme.border}`,
    background: aktif ? ac : vr ? "transparent" : kapaliZemin(theme),
    color: aktif ? "#fff" : vr ? theme.text : theme.textSecondary,
    opacity: vr ? 1 : 0.6,
    ...(listede > 0 && !aktif ? { borderColor: ac, boxShadow: `inset 0 0 0 1px ${ac}`, background: `${ac}14` } : {}),
    ...(listede > 0 ? { paddingRight: genis ? "26px" : "14px" } : {}),
  })
  // Çalma listesindeki sıra rozeti
  const sira = (no) => {
    const n = listeSirasiNo(no)
    if (!n) return null
    return (
      <span aria-label={`listede ${n}.`} style={{
        position: "absolute", top: "50%", right: "3px", transform: "translateY(-50%)",
        minWidth: "15px", height: "15px", padding: "0 3px", borderRadius: "8px", boxSizing: "border-box",
        background: ac, color: "#fff", fontSize: "9px", fontWeight: 700, lineHeight: "15px", textAlign: "center",
      }}>{n}</span>
    )
  }
  const parcaTikla = (no) => (secimKipi ? listeyeDokun(no) : dokun(no))
  const aktifMi = (no, ayet = null) => buKari && calan.parca === no && (tur !== "ayet" || calan.ayet === ayet || (ayet === 1 && calan.ayet === 0))
  const simge = (no, ayet) => (aktifMi(no, ayet)
    ? (durum === "yukleniyor" ? <Loader2 size={11} className="vk-don" style={{ marginRight: 3, verticalAlign: "-1px" }} />
      : durum === "caliyor" ? <Pause size={11} style={{ marginRight: 3, verticalAlign: "-1px" }} /> : null)
    : null)

  const ayetSayisi = AYET_SAYILARI[ayetSure - 1] || 0
  const ayetNolari = useMemo(() => Array.from({ length: ayetSayisi }, (_, i) => i + 1), [ayetSayisi])

  return (
    <div ref={kartRef} style={{ scrollMarginTop: "70px" }}>
    <Kart theme={theme} Ikon={Headphones} baslik="Kur'an Dinle" alt="Hafızlardan cüz, sûre ve âyet kayıtları" bolum={bolum} ozet={ozet}>
      {/* KÂRİ (14 Kasım 2026) — sağda: çekmece (aç/kapat), arama, düzenle. Kayıtlı ve aramadan
          eklenen kâriler TEK listede; düzenleme kipinde sürüklenerek sıralanır, gözle gizlenir,
          eklenenler × ile çıkarılır. Çekmece kapalıyken yalnız seçili kâri görünür. */}
      {(() => {
        const dugme = (etiket, Ikon, tikla, basili = false) => (
          <button onClick={tikla} aria-pressed={basili} aria-label={etiket} title={etiket}
            style={{
              width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              background: basili ? `${ac}33` : "transparent", color: basili ? ac : theme.textSecondary,
            }}>
            <Ikon size={16} />
          </button>
        )
        const gizliSayi = sirali.length - gorunen.length
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px", margin: "2px 0 6px 2px" }}>
            <span style={{ fontSize: "11px", letterSpacing: "0.5px", color: theme.textSecondary, minWidth: 0 }}>
              KÂRİ
              <span style={{ letterSpacing: 0, marginLeft: "6px", opacity: 0.85 }}>
                {kariDuzenle ? `${sirali.length} kâri${gizliSayi ? ` · ${gizliSayi} gizli` : ""}` : cekmeceKapali ? `${gorunen.length} kâri` : ""}
              </span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
              {!kariDuzenle && dugme(cekmeceKapali ? "Kâri listesini aç" : "Kâri listesini kapat (yalnız seçili kalsın)", cekmeceKapali ? ChevronDown : ChevronUp, () => kariDuzenYaz({ kapali: !duzen.kapali }), false)}
              {!kariDuzenle && dugme("Başka kâri ara (way2quran)", Search, () => setAramaAcik(v => !v), aramaAcik)}
              {dugme(kariDuzenle ? "Düzenlemeyi bitir" : "Kâri listesini düzenle (sırala, gizle)", kariDuzenle ? Check : Pencil, () => { setKariDuzenle(v => !v); setAramaAcik(false) }, kariDuzenle)}
            </span>
          </div>
        )
      })()}
      {aramaAcik && !kariDuzenle && (
        <KariArama theme={theme} listede={listedeKimlikler} onKapat={() => setAramaAcik(false)}
          onSec={(e) => { const id = ekKariEkle(e); if (duzen.gizli.includes(id)) kariGizleDegis(id); setKari(id); setAramaAcik(false) }} />
      )}
      {kariDuzenle && (
        <div style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.45, margin: "0 2px 8px" }}>
          Sıralamak için çipler sürüklenebilir (dokunmatikte kısa basılı tutup). Göz simgesi kâriyi listeden gizler; aramadan eklenenler çarpı ile çıkarılır.
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={kariSuruk}>
        <SortableContext items={kariSira} strategy={rectSortingStrategy}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            {(kariDuzenle ? sirali : cekmeceKapali ? gorunen.filter(k => k.id === kari.id) : gorunen).map(k => (
              <KariCipi key={k.id} k={k} theme={theme} duzenle={kariDuzenle}
                sec={k.id === kari.id} gizli={duzen.gizli.includes(k.id)}
                calarK={!!(calan && calan.kariId === k.id && durum === "caliyor")}
                onSec={setKari} onGizle={kariGizle} onSil={kariCikar} />
            ))}
            {cekmeceKapali && gorunen.length > 1 && (
              <button onClick={() => kariDuzenYaz({ kapali: false })} aria-label="Kâri listesini aç" title="Kâri listesini aç"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 11px", borderRadius: "999px",
                  border: `1px dashed ${theme.border}`, background: "transparent", color: theme.textSecondary,
                  fontFamily: "inherit", fontSize: "12px", cursor: "pointer",
                }}>
                <ChevronDown size={13} /> {gorunen.length - 1} kâri daha
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* KISIMLAR (15 Kasım 2026) — kullanıcı: "114 Sûre yanındaki arama butonu kısmını üste
          alalım, 'Bölümler' ya da 'Kısımlar' ya da daha uygun bir ad ile bu 3 kutuyu da gizlenecek
          şekilde dahil edelim." Başlık satırı: KISIMLAR · seçili biçim; sağda sûre araması ve
          çekmece oku. Çekmece kapalıyken Cüz/Sûre/Âyet kutuları da listeyle birlikte gizlenir. */}
      {(() => {
        const turAdi = TURLER.find(t => t.id === tur)?.ad || ""
        const ozetYazi = liste.durum === "hazir" && tur !== "ayet" && varSayisi < toplamSayi && !liste.yedek
          ? `${varSayisi} / ${toplamSayi} ${tur === "cuz" ? "cüz" : "sûre"}`
          : tur === "cuz" ? "30 cüz" : tur === "sure" ? "114 sûre" : sureAdi(ayetSure)
        const dugme = (etiket, icerik, tikla, basili) => (
          <button onClick={tikla} aria-pressed={basili} aria-label={etiket} title={etiket}
            style={{
              width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              background: basili ? `${ac}33` : "transparent", color: basili ? ac : theme.textSecondary,
            }}>
            {icerik}
          </button>
        )
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px", margin: "2px 0 6px 2px" }}>
            <button onClick={() => setListeAcik(!listeAcik)} aria-expanded={listeAcik}
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: "6px", padding: 0, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <span style={{ fontSize: "11px", letterSpacing: "0.5px", color: theme.textSecondary, flexShrink: 0 }}>KISIMLAR</span>
              <span style={{ fontSize: "11px", color: theme.textSecondary, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ color: ac, fontWeight: 600 }}>{turAdi}</span> · {ozetYazi}
              </span>
            </button>
            <span style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
              {(tur === "sure" || tur === "ayet") && dugme("Sûre ara", <Search size={16} />, () => { setSureAramaAcik(v => !v); setSureSorgu("") }, sureAramaAcik)}
              {dugme(listeAcik ? "Kısımları kapat" : "Kısımları ve listeyi aç", listeAcik ? <ChevronUp size={16} /> : <ChevronDown size={16} />, () => setListeAcik(!listeAcik), false)}
            </span>
          </div>
        )
      })()}
      {listeAcik && (
        <>
          <div role="radiogroup" aria-label="Okuma biçimi" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "4px" }}>
            {TURLER.map(t => {
              const vr = !!kari.kaynaklar[t.id]
              const sec = vr && t.id === tur
              return (
                <button key={t.id} role="radio" aria-checked={sec} aria-disabled={!vr} disabled={!vr}
                  onClick={() => vr && setTur(t.id)}
                  title={vr ? `${t.ad} ${t.id === "ayet" ? "âyet" : t.id === "cuz" ? "cüz" : "sûre"} dinle` : `${kari.ad} için ${t.ad.toLocaleLowerCase("tr-TR")} kaydı bulunmuyor`}
                  style={{
                    padding: "8px 4px", borderRadius: "10px", fontFamily: "inherit", fontSize: "13px",
                    fontWeight: sec ? 700 : 500, cursor: vr ? "pointer" : "not-allowed",
                    border: `1px solid ${sec ? ac : theme.border}`,
                    background: sec ? ac : vr ? "transparent" : kapaliZemin(theme),
                    color: sec ? "#fff" : vr ? theme.text : theme.textSecondary,
                    opacity: vr ? 1 : 0.65, lineHeight: 1.15,
                  }}>
                  {t.ad}
                  {!vr && <span style={{ display: "block", fontSize: "9.5px", letterSpacing: "0.3px", marginTop: "1px" }}>kayıt yok</span>}
                </button>
              )
            })}
          </div>
          {kaynak && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "11px", color: theme.textSecondary, margin: "6px 2px 8px" }}>
              <span style={{ minWidth: 0 }}>
                {liste.durum === "hazir" && tur !== "ayet" && varSayisi < toplamSayi && !liste.yedek
                  ? `Bu kayıtta ${varSayisi} / ${toplamSayi} ${tur === "cuz" ? "cüz" : "sûre"} var`
                  : tur === "ayet" ? "Sûre seçilip başlanacak âyete dokunulabilir" : tur === "cuz" ? "Tam hatim · 30 cüz" : "114 sûre"}
              </span>
              <a href={kaynak.sayfa} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: theme.textSecondary, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                {kaynak.ad} <ExternalLink size={11} />
              </a>
            </div>
          )}
        </>
      )}
      {/* SÛRE ARAMASI — ad (Türkçe büyük/küçük harf, şapka, tire fark etmez) ya da numara */}
      {sureAramaAcik && (tur === "sure" || tur === "ayet") && (
        <div style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input value={sureSorgu} onChange={e => setSureSorgu(e.target.value)} autoFocus enterKeyHint="search"
              placeholder="Sûre adı ya da numarası (ör. Âl-i İmrân, Yâsîn, 36)" aria-label="Sûre ara"
              onKeyDown={e => {
                if (e.key === "Enter" && sureSonuc && sureSonuc.length) {
                  if (tur === "ayet") { setAyetSure(sureSonuc[0]); setSureAramaAcik(false); setSureSorgu(""); setListeAcik(true) }
                }
                if (e.key === "Escape") { setSureAramaAcik(false); setSureSorgu("") }
              }}
              style={{ flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontFamily: "inherit", fontSize: "13px" }} />
            {sureSorgu && (
              <button onClick={() => setSureSorgu("")} aria-label="Aramayı temizle"
                style={{ width: "28px", height: "28px", borderRadius: "50%", border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
          {sureSonuc && !sureSonuc.length && (
            <div style={{ fontSize: "11px", color: theme.textSecondary, margin: "6px 2px 0" }}>Bu adla bir sûre bulunamadı.</div>
          )}
          {/* Âyet kipinde: bulunan sûreler düğme olarak — dokununca o sûrenin âyetleri açılır */}
          {tur === "ayet" && sureSonuc && sureSonuc.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "6px" }}>
              {sureSonuc.slice(0, 12).map(n => (
                <button key={n} onClick={() => { setAyetSure(n); setSureAramaAcik(false); setSureSorgu(""); setListeAcik(true) }}
                  style={{ ...parcaStil(true, n === ayetSure, true), padding: "5px 9px", flex: "0 0 auto" }}>
                  <span style={{ opacity: 0.6 }}>{n}</span> {sureAdi(n)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PARÇALAR */}
      {liste.durum === "yukleniyor" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 4px", fontSize: "12.5px", color: theme.textSecondary }}>
          <Loader2 size={15} className="vk-don" /> Kayıt listesi hazırlanıyor…
        </div>
      )}
      {liste.durum === "hata" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "10px", borderRadius: "10px", border: `1px solid ${theme.border}`, fontSize: "12.5px", color: theme.textSecondary }}>
          <span>Kayıt listesi şu an alınamadı.</span>
          <button onClick={liste.tekrar} style={{ ...dugmeStil(theme, false), padding: "6px 10px", fontSize: "12px" }}><RotateCcw size={13} /> Tekrar dene</button>
        </div>
      )}
      {liste.durum === "hazir" && listeAcik && tur === "cuz" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(46px, 1fr))", gap: "6px" }}>
            {liste.parcalar.filter(p => p.no !== "dua").map(p => (
              <button key={p.no} disabled={!p.var} aria-label={`${p.no}. Cüz${p.var ? "" : " — kayıtta yok"}`}
                title={p.var ? `${p.no}. Cüz` : "Bu cüz kayıtta bulunmuyor"}
                onClick={() => p.var && parcaTikla(p.no)} style={parcaStil(p.var, aktifMi(p.no), false, listeSirasiNo(p.no))}>
                {simge(p.no)}{p.no}{sira(p.no)}
              </button>
            ))}
          </div>
          {liste.parcalar.some(p => p.no === "dua") && (
            <button onClick={() => parcaTikla("dua")} style={{ ...parcaStil(true, aktifMi("dua"), true, listeSirasiNo("dua")), width: "100%", marginTop: "6px", textAlign: "center" }}>
              {simge("dua")}Hatim duası{sira("dua")}
            </button>
          )}
        </>
      )}
      {liste.durum === "hazir" && tur === "sure" && (listeAcik || (sureAramaAcik && sureSonuc)) && (
        <div style={{ maxHeight: "300px", overflowY: "auto", overscrollBehavior: "contain", paddingRight: "2px",
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: "6px" }}>
          {(sureAramaAcik && sureSonuc
            ? sureSonuc.map(n => liste.parcalar.find(p => p.no === n)).filter(Boolean)
            : liste.parcalar).map(p => (
            <button key={p.no} disabled={!p.var} aria-label={`${sureAdi(p.no)} Sûresi${p.var ? "" : " — kayıtta yok"}`}
              title={p.var ? `${p.no}. ${sureAdi(p.no)}` : "Bu sûre kayıtta bulunmuyor"}
              onClick={() => p.var && parcaTikla(p.no)} style={parcaStil(p.var, aktifMi(p.no), true, listeSirasiNo(p.no))}>
              {simge(p.no)}<span style={{ opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{p.no}</span> {sureAdi(p.no)}{sira(p.no)}
            </button>
          ))}
        </div>
      )}
      {liste.durum === "hazir" && listeAcik && tur === "ayet" && (
        <>
          <select value={ayetSure} onChange={e => setAyetSure(+e.target.value)} aria-label="Sûre"
            style={{ width: "100%", padding: "8px 10px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontFamily: "inherit", fontSize: "13px", marginBottom: "8px" }}>
            {SURE_ADLARI.map((ad, i) => <option key={i} value={i + 1}>{i + 1}. {ad} · {AYET_SAYILARI[i]} âyet</option>)}
          </select>
          <div style={{ maxHeight: "220px", overflowY: "auto", overscrollBehavior: "contain", paddingRight: "2px",
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: "5px" }}>
            {ayetNolari.map(a => (
              <button key={a} aria-label={`${sureAdi(ayetSure)} ${a}. âyetten dinle`} onClick={() => dokun(ayetSure, a)}
                style={{ ...parcaStil(true, aktifMi(ayetSure, a), false), padding: "6px 0", fontSize: "12px" }}>
                {a}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ÇALMA LİSTESİ PANELİ — listenin altında: seçilenler, "Kalanını sıraya göre ekle", çal, temizle */}
      {cl.acik && lt && liste.durum === "hazir" && (() => {
        const ad = (n) => (tur === "cuz" ? (n === "dua" ? "Hatim duası" : `${n}. Cüz`) : sureAdi(n))
        const sirasi = listeSirasi(tur, cl)
        const varMi = (n) => liste.parcalar.some(p => p.no === n && p.var)
        const ilk = sirasi.find(varMi)
        const kalanSayi = sirasi.length - lt.parcalar.length
        return (
          <div style={{ marginTop: "10px", padding: "8px 10px", borderRadius: "12px", border: `1px solid ${ac}66`, background: `${ac}0a` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <ListMusic size={15} color={ac} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: "12px", fontWeight: 600, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Çalma listesi · {tur === "cuz" ? "Cüz" : "Sûre"}
                <span style={{ fontWeight: 400, color: theme.textSecondary, marginLeft: "6px", whiteSpace: "nowrap" }}>
                  {suruklemeIpucu
                    ? <span className="vk-cl-ipucu" style={{ color: ac }}>sıra için çipler sürüklenebilir</span>
                    : (sirasi.length ? `${sirasi.length} parça` : "boş")}
                </span>
                <style>{`@keyframes vk-cl-sil { 0%, 82% { clip-path: inset(0 0 0 0) } 100% { clip-path: inset(0 0 0 100%) } }
.vk-cl-ipucu { display: inline-block; animation: vk-cl-sil 5s linear forwards }
@media (prefers-reduced-motion: reduce) { .vk-cl-ipucu { animation: none } }`}</style>
              </span>
              {lt.parcalar.length > 0 && (
                <button onClick={() => calmaListesiYaz({ [tur]: { parcalar: [], kalan: false } })} title="Listeyi temizle" aria-label="Listeyi temizle"
                  style={{ display: "flex", padding: "4px", background: "none", border: "none", cursor: "pointer", color: theme.textSecondary }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {lt.parcalar.length === 0 ? (
              <div style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.45, marginBottom: "8px" }}>
                {`Listeye eklemek istediğiniz ${tur === "cuz" ? "cüzlere" : "sûrelere"} KISIMLAR listesinden sırayla dokunabilirsiniz.`}
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
                  if (!over || active.id === over.id) return
                  const ids = lt.parcalar.map(String)
                  const a = ids.indexOf(String(active.id)), b = ids.indexOf(String(over.id))
                  if (a < 0 || b < 0) return
                  calmaListesiYaz({ [tur]: { ...lt, parcalar: arrayMove(lt.parcalar, a, b) } })
                }}>
                  <SortableContext items={lt.parcalar.map(String)} strategy={rectSortingStrategy}>
                    {lt.parcalar.map((n, i) => (
                      <ListeCipi key={n} n={n} sira={i + 1} ad={ad(n)} vr={varMi(n)} theme={theme}
                        onSil={() => calmaListesiYaz({ [tur]: { ...lt, parcalar: lt.parcalar.filter(x => x !== n) } })} />
                    ))}
                  </SortableContext>
                </DndContext>
                {lt.kalan && kalanSayi > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: "999px", border: `1px dashed ${ac}`, fontSize: "11.5px", color: ac }}>
                    + kalan {kalanSayi} {tur === "cuz" ? "cüz" : "sûre"} sırayla
                  </span>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {/* Kalanını sıraya göre ekle: basılıyken liste kapanır, düğme çerçeveli görünür;
                  yeniden basılınca liste açılır, ekleme sürer */}
              <button onClick={() => {
                const k = !lt.kalan
                calmaListesiYaz({ [tur]: { ...lt, kalan: k } })
                setListeAcik(!k)
              }} aria-pressed={lt.kalan}
                title={lt.kalan ? "Kapatılırsa liste yeniden açılır; KISIMLAR okuyla da açılıp ekleme yapılabilir" : "Listede olmayan bütün parçalar doğal sırayla arkaya eklenir"}
                style={{
                  flex: "1 1 170px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  padding: "7px 10px", borderRadius: "10px", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", fontWeight: 600,
                  border: `1.5px solid ${lt.kalan ? ac : theme.border}`, background: lt.kalan ? `${ac}22` : "transparent",
                  color: lt.kalan ? ac : theme.text, boxShadow: lt.kalan ? `0 0 0 3px ${ac}33` : "none",
                }}>
                {lt.kalan ? <Check size={14} /> : <ListPlus size={14} />} Kalanını sıraya göre ekle
              </button>
              <button disabled={!ilk} onClick={() => ilk !== undefined && dinle && dinle.baslat({ kariId: kari.id, tur, parca: ilk })}
                style={{ ...dugmeStil(theme, true), flex: "0 0 auto", padding: "7px 12px", fontSize: "12px", opacity: ilk !== undefined ? 1 : 0.5, cursor: ilk !== undefined ? "pointer" : "not-allowed" }}>
                <Play size={13} /> Listeyi çal
              </button>
            </div>
          </div>
        )
      })()}

      {/* KALDIĞINIZ YER */}
      {!calan && son && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", padding: "8px 10px", borderRadius: "11px", border: `1px dashed ${ac}88`, background: `${ac}0a` }}>
          <History size={16} color={ac} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: "12.5px", color: theme.text, lineHeight: 1.3 }}>
            Kaldığınız yer
            <span style={{ display: "block", fontSize: "11.5px", color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {kariBul(son.kariId)?.ad} · {parcaAdi(son.tur, son.parca, son.ayet)}{son.zaman > 0 ? ` · ${sureYazisi(son.zaman)}` : ""}
            </span>
          </span>
          <button onClick={devamEt} style={{ ...dugmeStil(theme, true), padding: "7px 12px", fontSize: "12.5px" }}><Play size={13} /> Devam</button>
        </div>
      )}

      {/* ÇALAN */}
      {/* ÇALAR — küçük hapın görünümü (12 Kasım 2026, kullanıcı: "sürekli oynatma kısmında
          görünen play butonları güzel oldu; aynı şekilde Ekstralar'daki durdurma ve play
          butonlarına da alalım"): kesik çizgili kapsül, rahle amblemi (çalarken dalgalar
          atar), vurgu renkli yuvarlak oynat/duraklat, yanında yuvarlak sade düğmeler. */}
      {calan && (
        <div style={{
          marginTop: "12px", padding: "5px 5px 8px", borderRadius: "22px",
          border: `1.5px dashed ${ac}`, background: `linear-gradient(90deg, ${ac}12, ${theme.surface} 45%)`, backgroundColor: theme.surface,
          display: "flex", flexDirection: "column", gap: "6px",
        }}>
          <style>{DINLE_HAP_CSS}</style>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {/* Baştaki amblem oynat/duraklat; önceki/sonraki yıldız çerçeveli, kapatma "tamamen durdur"
                (15 Kasım 2026 — Kur'ân oynatıcısıyla aynı dil; components/CerceveliSimge.jsx) */}
            <AmblemDugmesi calar={durum === "caliyor"} yukleniyor={durum === "yukleniyor"} ac={ac} etiket="Kur'an Dinle"
              onClick={() => (calarDurum ? dinle.duraklat() : dinle.devam())}>
              {({ isaret }) => <DinleAmblemi ac={ac} zemin={theme.surface} calar={durum === "caliyor"} boy={40} isaret={isaret} />}
            </AmblemDugmesi>
            <div style={{ flex: 1, minWidth: 0, padding: "0 4px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {parcaAdi(calan.tur, calan.parca, calan.ayet)}
              </div>
              <div style={{ fontSize: "11.5px", color: durum === "hata" ? "#c0392b" : theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {durum === "hata" ? "Kayıt açılamadı · amblemle yeniden denenebilir"
                  : durum === "bitti" ? `${kariBul(calan.kariId)?.ad} · bitti`
                  : `${kariBul(calan.kariId)?.ad}${calan.tur === "ayet" && calan.ayet > 0 ? ` · ${calan.ayet} / ${AYET_SAYILARI[calan.parca - 1]}` : ""}`}
              </div>
            </div>
            <button onClick={() => dinle.atla(-1)} aria-label="Önceki" title="Önceki" style={yuvarlak(false)}><OncekiSimgesi ac={ac} /></button>
            <button onClick={() => dinle.atla(1)} aria-label="Sonraki" title="Sonraki" style={yuvarlak(false)}><SonrakiSimgesi ac={ac} /></button>
            {/* Fazlalık düğmeler okla (15 Kasım 2026): ±10 sn, ses, paylaş */}
            <button onClick={() => setEkAcik(v => !v)} aria-expanded={ekAcik} aria-label={ekAcik ? "Diğer düğmeleri gizle" : "Diğer düğmeler"} title={ekAcik ? "Diğer düğmeleri gizle" : "Diğer düğmeler"}
              style={{ ...yuvarlak(false), width: "26px", color: ekAcik ? ac : theme.textSecondary }}>
              <ChevronLeft size={16} style={{ transition: "transform .2s", transform: ekAcik ? "rotate(-90deg)" : "none" }} />
            </button>
            <button onClick={() => dinle.kapat()} aria-label="Durdur ve kapat" title="Durdur ve kapat" style={yuvarlak(false)}><DurdurSimgesi ac={ac} /></button>
          </div>
          {ekAcik && (
            <CalarEkleri theme={theme} dinle={dinle} stil={yuvarlak(false)}
              onPaylas={(zaman) => setPaylasVeri({
                tip: "dinle", kariId: calan.kariId, kariAd: kariBul(calan.kariId)?.ad || "",
                tur: calan.tur, parca: calan.parca, ayet: calan.ayet, zaman,
              })} />
          )}
          {calan.tur !== "ayet" && <div style={{ padding: "0 8px" }}><Ilerleme theme={theme} dinle={dinle} /></div>}
        </div>
      )}

      {/* AYARLAR — sürekli çalma, otomatik kapanma */}
      <div style={{ marginTop: "10px", padding: "4px 10px", borderRadius: "11px", border: `1px solid ${theme.border}` }}>
        <div role="switch" aria-checked={!!dinle?.surekli} onClick={() => dinle && dinle.setSurekli(!dinle.surekli)}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", cursor: "pointer", borderBottom: `1px solid ${theme.border}` }}>
          <Repeat size={16} color={dinle?.surekli ? ac : theme.textSecondary} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text, lineHeight: 1.25 }}>
            Sürekli çalma
            <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>
              {tur === "ayet" ? "Sûre bitince sıradaki sûreye geçer" : `Bitince sıradaki ${tur === "cuz" ? "cüz" : "sûre"} çalar`}
            </span>
          </span>
          <IosSwitch acik={!!dinle?.surekli} theme={theme} boyut={0.72} />
        </div>
        {/* Başka sayfadaki hapta ilerleme (çizgi / küçük hâlde halka) */}
        <div role="switch" aria-checked={hapIlerleme} onClick={() => hapIlerlemeYaz(!hapIlerleme)}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", cursor: "pointer", borderBottom: `1px solid ${theme.border}` }}>
          <Hourglass size={16} color={hapIlerleme ? ac : theme.textSecondary} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text, lineHeight: 1.25 }}>
            Hapta ilerleme
            <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>
              {hapIlerleme ? "Başka sayfadaki küçük oynatıcıda ilerleme görünür (küçültülünce halka)" : "Başka sayfadaki küçük oynatıcıda ilerleme gösterilmez"}
            </span>
          </span>
          <IosSwitch acik={hapIlerleme} theme={theme} boyut={0.72} />
        </div>
        <div role="switch" aria-checked={cl.acik} aria-disabled={tur === "ayet"}
          onClick={() => { if (tur === "ayet") return; const a = !cl.acik; calmaListesiYaz({ acik: a }); if (a) { setListeAcik(!(lt && lt.kalan)); setSureAramaAcik(false) } }}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", cursor: tur === "ayet" ? "not-allowed" : "pointer", borderBottom: `1px solid ${theme.border}`, opacity: tur === "ayet" ? 0.55 : 1 }}>
          <ListMusic size={16} color={cl.acik && tur !== "ayet" ? ac : theme.textSecondary} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: theme.text, lineHeight: 1.25 }}>
            Çalma listesi
            <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>
              {tur === "ayet" ? "Sûre ya da cüz kipinde kullanılabilir"
                : cl.acik ? `${tur === "cuz" ? "Cüzlere" : "Sûrelere"} dokunarak listeye eklenebilir; liste sırayla çalar`
                  : `Birden fazla ${tur === "cuz" ? "cüz" : "sûre"} seçilip sırayla dinlenebilir`}
            </span>
          </span>
          <IosSwitch acik={cl.acik && tur !== "ayet"} theme={theme} boyut={0.72} />
        </div>
        {dinle && (
          <OtomatikDurdurmaSecici anahtarli theme={theme} uyku={dinle.uyku} baslik="Otomatik kapanma" eylem="kapanacak"
            aciklama="Seçilen süre sonunda dinleme durur; kaldığınız yer saklanır" />
        )}
      </div>
      {/* Kart içi taşma/dönüşüm pencereyi kırpmasın diye gövdeye */}
      {paylasVeri && createPortal(
        <PaylasimPenceresi acik veri={paylasVeri} theme={theme} isMobile={isMobile} kapat={() => setPaylasVeri(null)} />,
        document.body,
      )}
    </Kart>
    </div>
  )
}
