/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — BİLDİRİM PANELİ  (src/components/BildirimPaneli.jsx)

   Alttan açılan sayfa. Üç hâli var:
     liste   → hatırlatmalar, "+" ile yeni, satıra dokununca düzenle
     form    → yeni/var olan hatırlatmanın bütün ayarları
     duzenle → çoklu seçim; seçilenleri veya tümünü silme

   Motor ayrı dosyada (useBildirim.js) — bu bileşen yalnız arayüz. Başka bir
   PWA'ya taşınırken ikisi birlikte alınır, tek bağımlılığı `theme` nesnesi.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react"
import {
  X, Plus, Pencil, Trash2, Bell, BellOff, Check, ChevronLeft, AlertTriangle,
} from "lucide-react"
import useBildirim, { GUN_ADLARI, sonrakiZaman, zamanMetni } from "../data/hooks/useBildirim"
import IosSwitch from "./IosSwitch"

const BOS_FORM = {
  baslik: "", metin: "", saat: "08:00",
  tekrar: "gunluk", gunler: [], tarih: "", acik: true,
}

function bugunISO() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
}

function tekrarMetni(b) {
  if (b.tekrar === "birkez") return b.tarih ? `bir kez · ${b.tarih}` : "bir kez"
  if (!b.gunler || b.gunler.length === 0 || b.gunler.length === 7) return "her gün"
  return b.gunler.map(g => GUN_ADLARI[g]).join(", ")
}

export default function BildirimPaneli({ acik, kapat, theme }) {
  const bd = useBildirim()
  const [gorunum, setGorunum] = useState("liste")      // liste | form | duzenle
  const [form, setForm] = useState(BOS_FORM)
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [secili, setSecili] = useState([])
  const [silOnay, setSilOnay] = useState(false)
  const [denemeDurum, setDenemeDurum] = useState("")
  const [tanilamaAcik, setTanilamaAcik] = useState(false)
  const [kopyaDurum, setKopyaDurum] = useState("")     // "" | "kopyalandı" | "acik"

  const siraliListe = useMemo(() => {
    // Sıralama: önce AÇIK olanlar, sonra en yakın zamana göre. Kapalılar altta.
    const simdi = Date.now()
    return [...bd.liste].sort((a, b) => {
      if ((a.acik !== false) !== (b.acik !== false)) return a.acik === false ? 1 : -1
      const ta = sonrakiZaman(a, simdi) ?? Infinity
      const tb = sonrakiZaman(b, simdi) ?? Infinity
      if (ta !== tb) return ta - tb
      return String(a.saat).localeCompare(String(b.saat))
    })
  }, [bd.liste])

  if (!acik) return null

  const izinYok = bd.izin !== "granted"
  // iOS'ta ana ekrana eklenmemişse bildirim API'si hiç yok; kullanıcıya
  // "izin ver" demek boşuna, yapması gereken şey farklı.
  const iosKurulumGerek = bd.ortam.ios && !bd.ortam.standalone

  function formuAc(b) {
    if (b) {
      setForm({
        baslik: b.baslik || "", metin: b.metin || "", saat: b.saat || "08:00",
        tekrar: b.tekrar || "gunluk", gunler: b.gunler || [],
        tarih: b.tarih || "", acik: b.acik !== false,
      })
      setDuzenlenenId(b.id)
    } else {
      setForm({ ...BOS_FORM, tarih: bugunISO() })
      setDuzenlenenId(null)
    }
    setGorunum("form")
  }

  function formuKaydet() {
    if (duzenlenenId) bd.guncelle(duzenlenenId, form)
    else bd.ekle(form)
    setGorunum("liste")
    setDuzenlenenId(null)
  }

  function gunCevir(g) {
    setForm(f => {
      const v = f.gunler.includes(g) ? f.gunler.filter(x => x !== g) : [...f.gunler, g]
      return { ...f, gunler: v.sort() }
    })
  }

  function seciliCevir(id) {
    setSecili(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  }

  async function denemeYap() {
    setDenemeDurum("gonderiliyor")
    const s = await bd.deneme()
    setDenemeDurum(
      s === "gonderildi" ? "Gönderildi — bildirim gelmediyse cihaz ayarlarını kontrol edin."
      : s === "denied" ? "İzin reddedilmiş. Tarayıcı/site ayarlarından açmanız gerekiyor."
      : s === "yok" || s === "api-yok" ? "Bu ortamda bildirim API'si yok. iPhone'da bu, uygulamanın ana ekrandan (standalone) açılmadığı anlamına gelir."
      : s === "izin-yok" ? "İzin verilmedi."
      : s === "default" ? "İzin penceresi kapatıldı ya da hiç açılmadı."
      : "Gönderilemedi — tanılamadaki hata satırına bakın.")
    setTanilamaAcik(true)     // hata varsa sebebi hemen görünsün
  }

  // ── Ortak stiller ─────────────────────────────────────────────────────────
  const dugme = (tur = "sade") => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px",
    padding: "9px 14px", borderRadius: "10px", cursor: "pointer",
    fontSize: "13px", fontWeight: 500, border: `1px solid ${theme.border}`,
    background: tur === "vurgu" ? theme.accent : tur === "tehlike" ? "#c0392b18" : "transparent",
    color: tur === "vurgu" ? "#fff" : tur === "tehlike" ? "#c0392b" : theme.text,
    borderColor: tur === "tehlike" ? "#c0392b55" : theme.border,
  })
  const girdi = {
    width: "100%", padding: "10px 12px", borderRadius: "10px",
    border: `1px solid ${theme.border}`, background: theme.background,
    color: theme.text, fontSize: "14px", fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  }
  const etiket = { fontSize: "12px", color: theme.textSecondary, marginBottom: "5px", display: "block" }

  return (
    <>
      <div onClick={kapat}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 300 }} />

      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 301,
        background: theme.surface,
        borderTop: `1px solid ${theme.border}`,
        borderRadius: "20px 20px 0 0",
        padding: "8px 18px calc(18px + env(safe-area-inset-bottom))",
        boxShadow: "0 -8px 30px rgba(0,0,0,0.22)",
        animation: "vukufSheetUp 0.28s cubic-bezier(.22,.61,.36,1)",
        maxWidth: "520px", margin: "0 auto",
        maxHeight: "82vh", overflowY: "auto",
      }}>
        <style>{`@keyframes vukufSheetUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
        <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: theme.border, margin: "6px auto 12px" }} />

        {/* ── Başlık çubuğu ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          {gorunum !== "liste" && (
            <button onClick={() => { setGorunum("liste"); setSecili([]); setSilOnay(false) }}
              style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSecondary, display: "flex", padding: "2px" }}>
              <ChevronLeft size={20} />
            </button>
          )}
          <div style={{ fontSize: "15px", fontWeight: 600, color: theme.text, flex: 1 }}>
            {gorunum === "form" ? (duzenlenenId ? "Hatırlatmayı Düzenle" : "Yeni Hatırlatma")
              : gorunum === "duzenle" ? "Düzenle / Sil" : "Bildirimler"}
          </div>

          {gorunum === "liste" && (
            <>
              {bd.liste.length > 0 && (
                <button onClick={() => { setGorunum("duzenle"); setSecili([]) }}
                  title="Düzenle" aria-label="Düzenle"
                  style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSecondary, display: "flex", padding: "6px" }}>
                  <Pencil size={17} />
                </button>
              )}
              <button onClick={() => formuAc(null)}
                title="Yeni hatırlatma" aria-label="Yeni hatırlatma"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer",
                  background: theme.accent, color: "#fff", border: "none",
                }}>
                <Plus size={18} />
              </button>
            </>
          )}
          <button onClick={kapat} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSecondary, display: "flex", padding: "4px" }}>
            <X size={18} />
          </button>
        </div>

        {/* ── İZİN / ORTAM UYARISI ──────────────────────────────────────── */}
        {gorunum === "liste" && (izinYok || iosKurulumGerek) && (
          <div style={{
            display: "flex", gap: "9px", alignItems: "flex-start",
            background: `${theme.accent}10`, border: `1px solid ${theme.accent}30`,
            borderRadius: "12px", padding: "11px 12px", marginBottom: "12px",
          }}>
            <AlertTriangle size={16} style={{ color: theme.accent, flexShrink: 0, marginTop: "1px" }} />
            <div style={{ fontSize: "12.5px", color: theme.text, lineHeight: 1.5, flex: 1 }}>
              {iosKurulumGerek ? (
                <>iPhone/iPad'de bildirim için uygulamanın <b>Ana Ekrana Eklenmiş</b> olması
                  şart. Safari'de Paylaş → “Ana Ekrana Ekle” yapıp uygulamayı oradan açın.</>
              ) : !bd.ortam.bildirimVar ? (
                <>Bu tarayıcı bildirim desteklemiyor.</>
              ) : bd.izin === "denied" && bd.ortam.ios ? (
                // iOS'ta reddedilen izin GERİ ALINAMAZ: ne uygulama içinden, ne
                // iOS Ayarlar'dan — reddedilmiş web app o listede hiç görünmez.
                // Tek yol kurulumu yenilemek. Yanlış tavsiye ("ayarlardan açın")
                // kullanıcıyı olmayan bir menüde arattırıyordu.
                <>
                  <b>İzin reddedilmiş.</b> iPhone'da bu karar geri alınamıyor —
                  iOS Ayarlar'da da görünmez. Sıfırlamak için:
                  <div style={{ marginTop: "6px", lineHeight: 1.6 }}>
                    1. Ana ekrandaki Vukuf simgesini basılı tutup <b>kaldırın</b>.<br />
                    2. Safari'de siteyi açın → Paylaş → <b>Ana Ekrana Ekle</b>.<br />
                    3. Uygulamayı ana ekrandan açıp buradan <b>İzin ver</b> deyin.
                  </div>
                  <div style={{ marginTop: "6px", opacity: 0.85 }}>
                    İzin penceresinde “İzin Verme” demek ya da pencereyi kapatmak da
                    reddetme sayılıyor — o yüzden ilk soruşta izin verin.
                  </div>
                </>
              ) : bd.izin === "denied" ? (
                <>Bildirim izni reddedilmiş. Tarayıcı ayarlarından bu siteye izin vermeniz gerekiyor.</>
              ) : (
                <>
                  Hatırlatmaların gelmesi için bildirim izni gerekiyor.
                  <button onClick={bd.izinIste} style={{ ...dugme("vurgu"), marginTop: "8px", padding: "7px 12px" }}>
                    <Bell size={14} /> İzin ver
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── LİSTE ─────────────────────────────────────────────────────── */}
        {gorunum === "liste" && (
          <>
            {siraliListe.length === 0 ? (
              <div style={{ textAlign: "center", padding: "26px 10px", color: theme.textSecondary }}>
                <BellOff size={26} style={{ opacity: 0.5, marginBottom: "8px" }} />
                <div style={{ fontSize: "13px" }}>Henüz hatırlatma yok.</div>
                <div style={{ fontSize: "12px", marginTop: "4px", opacity: 0.8 }}>
                  Sağ üstteki <b>+</b> ile ekleyebilirsiniz.
                </div>
              </div>
            ) : siraliListe.map(b => {
              const kapali = b.acik === false
              const sonraki = sonrakiZaman(b)
              return (
                <div key={b.id} onClick={() => formuAc(b)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "11px 4px", cursor: "pointer",
                    borderBottom: `1px solid ${theme.border}`,
                    opacity: kapali ? 0.5 : 1,
                  }}>
                  <div style={{
                    fontSize: "21px", fontWeight: 600, color: kapali ? theme.textSecondary : theme.accent,
                    fontVariantNumeric: "tabular-nums", minWidth: "58px",
                  }}>
                    {b.saat}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "14px", color: theme.text, fontWeight: 500,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {b.baslik || "Vukuf"}
                    </div>
                    <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "2px" }}>
                      {tekrarMetni(b)}
                      {!kapali && sonraki ? ` · ${zamanMetni(sonraki)}` : ""}
                    </div>
                    {b.kacirildi && (
                      <div onClick={(e) => { e.stopPropagation(); bd.kacaniTemizle(b.id) }}
                        title="İşareti kaldır"
                        style={{
                          display: "inline-block", marginTop: "4px", fontSize: "10.5px",
                          color: "#c0392b", background: "#c0392b15",
                          border: "1px solid #c0392b35", borderRadius: "999px", padding: "1px 7px",
                        }}>
                        kaçtı — {zamanMetni(b.kacanZaman)}
                      </div>
                    )}
                  </div>
                  <div onClick={(e) => { e.stopPropagation(); bd.acKapa(b.id) }}>
                    <IosSwitch acik={!kapali} theme={theme} boyut={0.85} />
                  </div>
                </div>
              )
            })}

            {/* Deneme + dürüst durum notu */}
            <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: `1px solid ${theme.border}` }}>
              <button onClick={denemeYap} style={dugme()}>
                <Bell size={14} /> Deneme bildirimi gönder
              </button>
              {denemeDurum && denemeDurum !== "gonderiliyor" && (
                <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "7px", lineHeight: 1.5 }}>
                  {denemeDurum}
                </div>
              )}
              <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "10px", lineHeight: 1.55, opacity: 0.85 }}>
                Hatırlatmalar <b>uygulama açıkken</b> tam saatinde gelir. Uygulama
                tamamen kapalıyken tarayıcıların zamanlanmış bildirim desteği yok;
                o aralıkta geçen hatırlatmalar “kaçtı” diye işaretlenir.
              </div>

              {/* ── TANILAMA ────────────────────────────────────────────
                  "Bildirim gelmiyor" şikâyetinin sebebi neredeyse hep aşağıdaki
                  satırlardan biridir. Tahmin ettirmemek için ÖLÇÜLEN değerler
                  olduğu gibi gösteriliyor; kullanıcı kopyalayıp gönderebilsin. */}
              <button
                onClick={() => setTanilamaAcik(a => !a)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: theme.textSecondary, fontSize: "11px",
                  padding: "10px 0 0", textDecoration: "underline", opacity: 0.8,
                }}
              >
                {tanilamaAcik ? "Tanılamayı gizle" : "Tanılama (çalışmıyorsa aç)"}
              </button>

              {tanilamaAcik && (() => {
                const t = bd.tanilama()
                const satirlar = [
                  ["Bildirim API'si", t.bildirimVar ? "var" : "YOK"],
                  ["İzin", t.izin],
                  ["Service worker API", t.swVar ? "var" : "YOK"],
                  ["Service worker kaydı", t.swDurum],
                  ["Güvenli bağlam (https)", t.guvenliBaglam ? "evet" : "HAYIR"],
                  ["Ana ekrandan açık (standalone)", t.standalone ? "evet" : "HAYIR"],
                  ["iOS cihaz", t.ios ? (t.iosSurum ? `evet · ${t.iosSurum}` : "evet") : "hayır"],
                  ["Push API", t.pushVar ? "var" : "yok"],
                  ["Zamanlanmış bildirim API'si", t.tetikleyiciVar ? "var" : "yok (hiçbir tarayıcıda yok)"],
                  ["Saat dilimi", t.saatDilimi],
                  ["Son hata", t.sonHata],
                ]
                const dokum = satirlar.map(([a, b]) => `${a}: ${b}`).join("\n")
                return (
                  <div style={{
                    marginTop: "8px", padding: "10px 12px", borderRadius: "10px",
                    background: theme.background, border: `1px solid ${theme.border}`,
                    // Kopyalama düğmesi çalışmazsa kullanıcı elle seçebilsin.
                    userSelect: "text", WebkitUserSelect: "text",
                  }}>
                    {satirlar.map(([ad, deger]) => {
                      const kotu = ["YOK", "HAYIR", "denied", "kayıt başarısız"].includes(String(deger))
                      return (
                        <div key={ad} style={{
                          display: "flex", justifyContent: "space-between", gap: "10px",
                          fontSize: "11.5px", padding: "2px 0", lineHeight: 1.5,
                        }}>
                          <span style={{ color: theme.textSecondary, flexShrink: 0 }}>{ad}</span>
                          <span style={{
                            color: kotu ? "#c0392b" : theme.text,
                            fontWeight: kotu ? 600 : 400,
                            textAlign: "right", wordBreak: "break-word", minWidth: 0,
                          }}>{String(deger)}</span>
                        </div>
                      )
                    })}
                    {/* Kopyalama iki yollu. navigator.clipboard iOS'ta sessizce
                        REDDEDİLEBİLİYOR (söz reddi try/catch'e düşmez, o yüzden
                        .catch şart) — o durumda gizli bir textarea seçilip eski
                        execCommand denenir, o da olmazsa metin ekranda açılır ve
                        kullanıcı elle seçer. Kullanıcı ekran görüntüsü göndermek
                        zorunda kalmasın diye. */}
                    <button
                      onClick={() => {
                        const yedek = () => {
                          try {
                            const ta = document.createElement("textarea")
                            ta.value = dokum
                            ta.style.position = "fixed"; ta.style.opacity = "0"
                            document.body.appendChild(ta)
                            ta.focus(); ta.select()
                            const oldu = document.execCommand && document.execCommand("copy")
                            document.body.removeChild(ta)
                            setKopyaDurum(oldu ? "kopyalandı" : "acik")
                          } catch { setKopyaDurum("acik") }
                        }
                        try {
                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(dokum)
                              .then(() => setKopyaDurum("kopyalandı"))
                              .catch(yedek)
                          } else yedek()
                        } catch { yedek() }
                      }}
                      style={{ ...dugme(), marginTop: "9px", padding: "6px 10px", fontSize: "11.5px" }}
                    >
                      {kopyaDurum === "kopyalandı" ? "Kopyalandı" : "Panoya kopyala"}
                    </button>

                    {kopyaDurum === "acik" && (
                      <textarea
                        readOnly
                        value={dokum}
                        onFocus={(e) => e.target.select()}
                        style={{
                          width: "100%", marginTop: "8px", minHeight: "150px",
                          padding: "8px", borderRadius: "8px", boxSizing: "border-box",
                          border: `1px solid ${theme.border}`, background: theme.surface,
                          color: theme.text, fontSize: "11px", lineHeight: 1.5,
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        }}
                      />
                    )}
                  </div>
                )
              })()}
            </div>
          </>
        )}

        {/* ── DÜZENLE / SİL ─────────────────────────────────────────────── */}
        {gorunum === "duzenle" && (
          <>
            <div style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "8px" }}>
              Silmek istediklerinizi seçin.
            </div>
            {siraliListe.map(b => {
              const s = secili.includes(b.id)
              return (
                <div key={b.id} onClick={() => seciliCevir(b.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "11px",
                    padding: "10px 4px", cursor: "pointer",
                    borderBottom: `1px solid ${theme.border}`,
                  }}>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0,
                    border: `1.5px solid ${s ? theme.accent : theme.border}`,
                    background: s ? theme.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {s && <Check size={13} color="#fff" />}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: theme.text, minWidth: "52px", fontVariantNumeric: "tabular-nums" }}>
                    {b.saat}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13.5px", color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.baslik || "Vukuf"}
                    </div>
                    <div style={{ fontSize: "11px", color: theme.textSecondary }}>{tekrarMetni(b)}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); bd.sil(b.id); setSecili(x => x.filter(i => i !== b.id)) }}
                    title="Bunu sil" aria-label="Bunu sil"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", display: "flex", padding: "6px" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
              <button
                onClick={() => setSecili(secili.length === siraliListe.length ? [] : siraliListe.map(b => b.id))}
                style={dugme()}>
                {secili.length === siraliListe.length && siraliListe.length > 0 ? "Seçimi bırak" : "Tümünü seç"}
              </button>
              <button
                disabled={secili.length === 0}
                onClick={() => { bd.sil(secili); setSecili([]) }}
                style={{ ...dugme("tehlike"), opacity: secili.length === 0 ? 0.45 : 1, cursor: secili.length === 0 ? "default" : "pointer" }}>
                <Trash2 size={14} /> Seçilenleri sil{secili.length ? ` (${secili.length})` : ""}
              </button>
            </div>

            {/* Tümünü silme AYRI ve İKİ ADIMLI: tek dokunuşla bütün listeyi
                kaybetmek geri alınamaz bir iş, onay istiyor. */}
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${theme.border}` }}>
              {!silOnay ? (
                <button onClick={() => setSilOnay(true)} style={dugme("tehlike")}>
                  <Trash2 size={14} /> Tümünü sil
                </button>
              ) : (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12.5px", color: theme.text }}>
                    {siraliListe.length} hatırlatmanın hepsi silinsin mi?
                  </span>
                  <button onClick={() => { bd.hepsiniSil(); setSilOnay(false); setSecili([]); setGorunum("liste") }}
                    style={dugme("tehlike")}>Evet, sil</button>
                  <button onClick={() => setSilOnay(false)} style={dugme()}>Vazgeç</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── FORM ──────────────────────────────────────────────────────── */}
        {gorunum === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
            <div>
              <label style={etiket}>Saat</label>
              <input type="time" value={form.saat}
                onChange={(e) => setForm(f => ({ ...f, saat: e.target.value }))}
                style={{ ...girdi, fontSize: "20px", fontWeight: 600, letterSpacing: "1px" }} />
            </div>

            <div>
              <label style={etiket}>Başlık</label>
              <input type="text" value={form.baslik} placeholder="Vukuf" maxLength={60}
                onChange={(e) => setForm(f => ({ ...f, baslik: e.target.value }))}
                style={girdi} />
            </div>

            <div>
              <label style={etiket}>Bildirim yazısı</label>
              <textarea value={form.metin} rows={2} maxLength={200}
                placeholder="Ör. Günlük okuma vakti"
                onChange={(e) => setForm(f => ({ ...f, metin: e.target.value }))}
                style={{ ...girdi, resize: "vertical", lineHeight: 1.5 }} />
            </div>

            <div>
              <label style={etiket}>Tekrar</label>
              <div style={{ display: "flex", gap: "7px" }}>
                {[["gunluk", "Belirli günler"], ["birkez", "Bir kez"]].map(([id, ad]) => (
                  <button key={id} onClick={() => setForm(f => ({ ...f, tekrar: id }))}
                    style={{
                      ...dugme(form.tekrar === id ? "vurgu" : "sade"),
                      flex: 1, padding: "8px 10px",
                    }}>
                    {ad}
                  </button>
                ))}
              </div>
            </div>

            {form.tekrar === "gunluk" ? (
              <div>
                <label style={etiket}>
                  Günler {form.gunler.length === 0 ? "— hiçbiri seçilmezse HER GÜN" : ""}
                </label>
                <div style={{ display: "flex", gap: "5px" }}>
                  {GUN_ADLARI.map((ad, i) => {
                    const s = form.gunler.includes(i)
                    return (
                      <button key={i} onClick={() => gunCevir(i)}
                        style={{
                          flex: 1, padding: "8px 0", borderRadius: "9px", cursor: "pointer",
                          fontSize: "12px", fontWeight: 500,
                          border: `1px solid ${s ? theme.accent : theme.border}`,
                          background: s ? `${theme.accent}20` : "transparent",
                          color: s ? theme.accent : theme.textSecondary,
                        }}>
                        {ad}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label style={etiket}>Tarih</label>
                <input type="date" value={form.tarih} min={bugunISO()}
                  onChange={(e) => setForm(f => ({ ...f, tarih: e.target.value }))}
                  style={girdi} />
              </div>
            )}

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "4px 2px",
            }}>
              <span style={{ fontSize: "14px", color: theme.text }}>Etkin</span>
              <div onClick={() => setForm(f => ({ ...f, acik: !f.acik }))}>
                <IosSwitch acik={form.acik} theme={theme} />
              </div>
            </div>

            {/* Kaydettikten sonra ne zaman çalacağı — kullanıcı tahmin etmesin. */}
            {(() => {
              const t = sonrakiZaman({ ...form, acik: true })
              return (
                <div style={{ fontSize: "12px", color: theme.textSecondary }}>
                  {t ? <>İlk bildirim: <b style={{ color: theme.text }}>{zamanMetni(t)}</b></>
                     : "Bu ayarlarla çalacak bir zaman yok (tarihi geçmiş olabilir)."}
                </div>
              )
            })()}

            <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
              <button onClick={formuKaydet} style={{ ...dugme("vurgu"), flex: 1, padding: "11px" }}>
                <Check size={15} /> {duzenlenenId ? "Kaydet" : "Ekle"}
              </button>
              {duzenlenenId && (
                <button onClick={() => { bd.sil(duzenlenenId); setGorunum("liste"); setDuzenlenenId(null) }}
                  style={dugme("tehlike")}>
                  <Trash2 size={15} /> Sil
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
