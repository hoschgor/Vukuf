/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — PAYLAŞIM İÇİN DOKUNULAN KELİME / CÜMLE
   src/data/paylasimSecim.js

   Okuma ekranında "Paylaş" seçiliyken metne dokunulunca: dokunulan harften kelime ve
   o kelimenin CÜMLESİ bulunur (18 Ekim 2026, kullanıcı kararı: önce cümle; paylaşma
   penceresinde "yalnız kelime"ye geçilebilir).
   • Satır: en yakın [data-satir="<sayfa>-<satır>"] öğesi.
   • <sup> içindekiler (dipnot numarası, haşiye "H") metne katılmaz.
   • Cümle sınırı sesli okumadakiyle AYNI kuralla (sesliOkuma.js cumleBol: "Hz.",
     "bk. s. 45", "(a.s.m.) buyurmuş" gibi yerlerde bölmez).
   Dönen: { sayfa, satir, kelime, cumle, kelimeAralik, cumleAralik } (Range'ler vurgu için)
   ═══════════════════════════════════════════════════════════════════════════ */

import { cumleBol } from "./sesliOkuma"

function duzMetin(kok) {
  const tw = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT)
  const parcalar = []
  let duz = "", n
  while ((n = tw.nextNode())) {
    if (n.parentElement && n.parentElement.closest("sup")) continue
    const t = n.nodeValue || ""
    for (let i = 0; i < t.length; i++) {
      const ch = /\s/.test(t[i]) ? " " : t[i]
      if (ch === " " && (duz.endsWith(" ") || !duz.length)) continue
      parcalar.push([n, i]); duz += ch
    }
  }
  return { duz, parcalar }
}

const KELIME_HARF = /[\p{L}\p{M}\p{N}'’ʼ\-]/u

function aralik(parcalar, bas, son) {
  if (bas >= son || !parcalar[bas] || !parcalar[son - 1]) return null
  try {
    const r = document.createRange()
    const [bn, bo] = parcalar[bas], [sn, so] = parcalar[son - 1]
    r.setStart(bn, bo); r.setEnd(sn, so + 1)
    return r
  } catch { return null }
}

export function dokunulanSecim(x, y, hedef) {
  let dugum = null, ofs = 0
  try {
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y)
      if (p) { dugum = p.offsetNode; ofs = p.offset }
    } else if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y)
      if (r) { dugum = r.startContainer; ofs = r.startOffset }
    }
  } catch { /* yoksay */ }
  const el = (dugum && (dugum.nodeType === 3 ? dugum.parentElement : dugum))?.closest?.("[data-satir]")
    || hedef?.closest?.("[data-satir]")
  if (!el) return null
  const anahtar = el.getAttribute("data-satir") || ""
  const tire = anahtar.lastIndexOf("-")
  const sayfa = Number(anahtar.slice(0, tire)), satir = Number(anahtar.slice(tire + 1))
  if (!Number.isFinite(sayfa) || !Number.isFinite(satir)) return null
  // Konum alınamadıysa dokunulan öğenin ilk harfi
  if (!(dugum && dugum.nodeType === 3 && el.contains(dugum)) && hedef && el.contains(hedef)) {
    const tw0 = document.createTreeWalker(hedef, NodeFilter.SHOW_TEXT)
    dugum = tw0.nextNode(); ofs = 0
  }
  const { duz, parcalar } = duzMetin(el)
  if (!duz.trim()) return null
  let k = 0
  if (dugum && dugum.nodeType === 3 && el.contains(dugum)) {
    const dugumler = []
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let n
    while ((n = tw.nextNode())) dugumler.push(n)
    const sira = dugumler.indexOf(dugum)
    const i = parcalar.findIndex(([d, j]) => { const s = dugumler.indexOf(d); return s > sira || (s === sira && j >= ofs) })
    k = i < 0 ? duz.length - 1 : i
  }
  // Boşluğa/noktalamaya dokunulduysa soldaki harfe kay
  if (!KELIME_HARF.test(duz[k] || "") && k > 0 && KELIME_HARF.test(duz[k - 1] || "")) k--

  // KELİME
  let kb = k, ks = k
  while (kb > 0 && KELIME_HARF.test(duz[kb - 1])) kb--
  while (ks < duz.length && KELIME_HARF.test(duz[ks])) ks++
  while (kb < ks && /['’ʼ\-]/.test(duz[kb])) kb++
  while (ks > kb && /['’ʼ\-]/.test(duz[ks - 1])) ks--
  const kelime = duz.slice(kb, ks)

  // CÜMLE
  let cb = 0, cs = duz.length, t = 0
  for (const c of cumleBol(duz)) {
    const son = t + c.length
    if (k >= t && k < son) { cb = t; cs = son; break }
    t = son
  }
  while (cb < cs && /\s/.test(duz[cb])) cb++
  while (cs > cb && /\s/.test(duz[cs - 1])) cs--
  const cumle = duz.slice(cb, cs)

  return {
    sayfa, satir, kelime, cumle,
    kelimeAralik: aralik(parcalar, kb, ks),
    cumleAralik: aralik(parcalar, cb, cs),
  }
}

/* Paylaşılan bağlantıyla gelince: satırda cümlenin BAŞI (ilk kelimeler) bulunur, içinde
   geçtiği cümlenin tamamı döner (vurgu için). Bulunamazsa gelen parça aynen döner. */
export function cumleyeGenislet(el, parca) {
  if (!el || !parca) return parca
  const { duz } = duzMetin(el)
  const kat = (t) => t.replace(/İ/g, "i").toLocaleLowerCase("tr").replace(/[’ʼ]/g, "'")
  const i = kat(duz).indexOf(kat(String(parca).replace(/\s+/g, " ").trim()))
  if (i < 0) return parca
  let t = 0
  for (const c of cumleBol(duz)) {
    const son = t + c.length
    if (i >= t && i < son) return c.trim() || parca
    t = son
  }
  return parca
}
