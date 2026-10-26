/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — AŞAĞI ÇEKİP KAPATMA (alttan açılan paneller için ortak)
   src/data/hooks/useCekKapat.js

   Kullanıcı (26 Ekim 2026): "Biraz aşağı sürükleyip belirli bir noktayı geçip
   bırakırsam panel kapanmalı, hemen yukarıdayken bıraktığımda kapanmamalı.
   Aşağı çekip vazgeçip yukarı geri sürüklediğimde az sürüklesem de açık
   kalmalı. Bunu bilinen ve uygulanan mantıkta yeniden düzenlemeliyiz."

   Önceden her panelin kendi kuralı vardı:
     • AltSayfa (Ayarlar, Yardım): ESKİ hız = başlangıçtan bırakışa ORTALAMA →
       kısa ve çabuk bir dokunuş "fiske" sayılıp kapatıyordu.
     • LügatArama, PaylaşımPenceresi: yalnız konum (> 90 px) → geri çekip
       vazgeçerken 90 px'in altına inilmemişse yine kapanıyordu.
   ŞİMDİ hepsi bu kancayı kullanıyor; karar BIRAKMA ANINDA (iOS / Material alt
   sayfalarındaki gibi):
     1) Bırakış hızı yalnız SON ~100 ms'deki hareketten (parmak durup
        bırakılırsa 0).
     2) Yukarı doğru hareketle bırakıldıysa → AÇIK KALIR (vazgeçildi).
     3) Aşağı belirgin fiske (≥ HIZ_ESIGI) ve en az FISKE_EN_AZ px → kapanır.
     4) Aksi hâlde konum: panel boyunun %25'i (ESIK_EN_AZ…ESIK_EN_COK px)
        aşıldıysa kapanır, değilse yerine döner.
   Sistem sürüklemeyi keserse (pointercancel) her zaman yerine döner.
   Yukarı çekmede direnç (¼). Kapanışta panel aşağı kayarak çıkar, sonra kapat().

   KULLANIM:
     const ck = useCekKapat({ kapat, kutuRef })
     <div ref={kutuRef} style={{ transform: ck.donusum, transition: ck.gecis }}>
       <div {...ck.tutamak} style={{ touchAction: "none" }}>…tutamak…</div>
   ck.esikGecildi → tutamağı vurgulamak için ("bırakılırsa kapanır").
   Sökülmeden açılıp kapanan pencerede açılışta ck.sifirla() çağrılır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react"

export const CEK_KAPANMA_SURESI = 220   // ms — çıkış geçişi
const ESIK_ORAN = 0.25                  // panel boyunun bu kadarı aşağı inilirse kapanır…
const ESIK_EN_AZ = 90                   // …ama en az bu kadar px
const ESIK_EN_COK = 160                 // …ve en çok bu kadar px
const HIZ_ESIGI = 0.65                  // px/ms — aşağı fiske ile kapanma
const GERI_HIZ = 0.15                   // px/ms — bu hızla yukarı gidiyorsa "vazgeçildi"
const FISKE_EN_AZ = 30                  // px — fiske sayılması için en az iniş
const HIZ_PENCERESI = 100               // ms — bırakış hızı bu son süredeki hareketten
const YUKARI_DIRENC = 0.25

/* Saf karar (sınamak için ayrı): dy ≥ 0 px, hiz px/ms (+ aşağı), esik px */
export function kapanmaKarari({ dy, hiz, esik, suruklendi = true, iptal = false }) {
  if (iptal || !suruklendi) return false
  if (hiz <= -GERI_HIZ) return false
  if (hiz >= HIZ_ESIGI && dy >= FISKE_EN_AZ) return true
  return dy >= esik
}
export const cekEsigi = (boy) => Math.min(ESIK_EN_COK, Math.max(ESIK_EN_AZ, (boy || 400) * ESIK_ORAN))

export function useCekKapat({ kapat, kutuRef, sure = CEK_KAPANMA_SURESI } = {}) {
  const [kayma, setKayma] = useState(0)
  const [surukleniyor, setSurukleniyor] = useState(false)
  const [kapaniyor, setKapaniyor] = useState(false)
  const bilgi = useRef({ id: null, basY: 0, esik: ESIK_EN_AZ, ornekler: [] })
  const suruklendi = useRef(false)
  const zaman = useRef(null)
  const kapatRef = useRef(kapat)
  kapatRef.current = kapat

  useEffect(() => () => { if (zaman.current) clearTimeout(zaman.current) }, [])

  const kapanmayaBasla = useCallback(() => {
    if (zaman.current) return
    setKapaniyor(true)
    zaman.current = setTimeout(() => { zaman.current = null; kapatRef.current?.() }, sure)
  }, [sure])

  const basla = (e) => {
    if (kapaniyor || bilgi.current.id != null) return
    if (e.button != null && e.button !== 0) return
    const boy = kutuRef && kutuRef.current ? kutuRef.current.offsetHeight : 0
    bilgi.current = { id: e.pointerId, basY: e.clientY, esik: cekEsigi(boy), ornekler: [{ t: performance.now(), y: e.clientY }] }
    suruklendi.current = false
    setSurukleniyor(true)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* eski tarayıcı */ }
  }
  const hareket = (e) => {
    const b = bilgi.current
    if (b.id !== e.pointerId) return
    const simdi = performance.now()
    b.ornekler.push({ t: simdi, y: e.clientY })
    while (b.ornekler.length > 2 && simdi - b.ornekler[1].t > HIZ_PENCERESI) b.ornekler.shift()
    const dy = e.clientY - b.basY
    if (Math.abs(dy) > 3) suruklendi.current = true
    setKayma(dy > 0 ? dy : dy * YUKARI_DIRENC)
  }
  const birakisHizi = (simdi, y) => {
    let ilk = null
    for (const n of bilgi.current.ornekler) { if (simdi - n.t <= HIZ_PENCERESI) { ilk = n; break } }
    if (!ilk) return 0
    const dt = simdi - ilk.t
    return dt > 8 ? (y - ilk.y) / dt : 0
  }
  const bitir = (e, iptal) => {
    const b = bilgi.current
    if (b.id !== e.pointerId) return
    const dy = Math.max(0, e.clientY - b.basY)
    const hiz = birakisHizi(performance.now(), e.clientY)
    b.id = null
    setSurukleniyor(false)
    if (kapanmaKarari({ dy, hiz, esik: b.esik, suruklendi: suruklendi.current, iptal })) kapanmayaBasla()
    else setKayma(0)
  }

  // Açık/kapalı prop'uyla yaşayan (sökülmeyen) pencereler yeniden açılırken
  // önceki kapanışın durumu kalmasın diye (LügatArama, PaylaşımPenceresi)
  const sifirla = useCallback(() => {
    if (zaman.current) { clearTimeout(zaman.current); zaman.current = null }
    bilgi.current.id = null
    setKapaniyor(false); setSurukleniyor(false); setKayma(0)
  }, [])

  return {
    kayma, surukleniyor, kapaniyor, kapanmayaBasla, sifirla,
    esikGecildi: surukleniyor && kayma >= bilgi.current.esik,
    // Panelin transform / transition değerleri (kapanışta aşağı kayarak çıkar)
    donusum: kapaniyor ? "translateY(100%)" : kayma ? `translateY(${kayma}px)` : undefined,
    gecis: surukleniyor ? "none" : `transform ${sure}ms cubic-bezier(.22,.61,.36,1)`,
    tutamak: {
      onPointerDown: basla,
      onPointerMove: hareket,
      onPointerUp: (e) => bitir(e, false),
      onPointerCancel: (e) => bitir(e, true),
      // Sürükledikten sonra tutamaktaki bir öğe tıklanmış sayılmasın
      onClickCapture: (e) => {
        if (suruklendi.current) { e.stopPropagation(); e.preventDefault() }
        suruklendi.current = false
      },
    },
  }
}
