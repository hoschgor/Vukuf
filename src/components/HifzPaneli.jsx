/* VUKUF — HIFZ ÇUBUĞU (okuma ekranının üstünde)
   src/components/HifzPaneli.jsx

   Hıfz modu AYRI BİR EKRAN DEĞİL: çalışma mushafın kendi sayfası üzerinde
   yürüyor, çünkü hıfzın büyük kısmı sayfa görüntüsüne dayanıyor — âyetin
   sayfadaki yeri de ezberin parçası. Bu yüzden denetimler sayfayı kapatmayan
   ince bir şerit hâlinde; tam ayar paneli ancak dişliye basınca açılıyor.

   Bileşen SUNUM tarafı: kapsam/kademe/zincir durumunu KuranOkuma tutuyor,
   burada yalnız düğmeler var. */

import { useState } from "react"
import {
  X, Settings2, ChevronLeft, ChevronRight, Play, Pause, Square, Check, Eye,
  Minus, Plus, Crosshair, CalendarCheck,
} from "lucide-react"
import { KADEMELER, BIRIMLER, kademeBul } from "../data/hifz"

export default function HifzPaneli({
  acik, kapat, theme, isMobile, altBosluk = 96,
  etiket,                 // "Bakara 1-7" gibi
  kademe, onKademe,
  birim, onBirim,         // "kelime" | "ayet"
  zincir, onZincir,
  aktifSira, toplam,      // zincirde kaçıncı âyetteyiz
  onOnceki, onSonraki,
  onOdakla,               // çalışılan âyeti ekrana yeniden hizala
  onPanel,                // /hifz ekranı (tekrar takvimi)
  tekrarSayisi, onTekrarSayisi,
  onCal, onDurdur, calisiyor, sesAcik,
  onEzberledim, ezberliMi,
  onHepsiniAc,
  ipucu = 0,
  bekleyenTekrar = 0,
}) {
  const [ayarAcik, setAyarAcik] = useState(false)
  if (!acik) return null

  const ac = theme.accent
  const kucuk = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
    height: "30px", padding: "0 10px", borderRadius: "999px", flexShrink: 0,
    border: `1px solid ${theme.border}`, background: "transparent",
    color: theme.textSecondary, cursor: "pointer",
    fontSize: "12px", fontWeight: 600, fontFamily: "inherit", touchAction: "manipulation",
  }
  const vurgulu = { ...kucuk, border: `1px solid ${ac}`, background: ac, color: "#fff" }
  const yuvarlak = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0, padding: 0,
    border: "none", background: "transparent", color: theme.textSecondary,
    cursor: "pointer", touchAction: "manipulation",
  }
  // Perde kademesi YALNIZ kelime biriminde anlamlı: âyet biriminde âyet ya tam
  // açık ya tam kapalı olduğu için "yarısı/ilk kelime" diye bir ara durum yok.
  const kademeVar = birim !== "ayet"

  return (
    <>
      <div style={{
        position: "fixed", left: "50%", transform: "translateX(-50%)",
        bottom: altBosluk > 0 ? `${altBosluk + 8}px` : "calc(env(safe-area-inset-bottom) + 8px)",
        width: isMobile ? "calc(100% - 16px)" : "min(620px, 94vw)",
        zIndex: 93,
        background: theme.surface,
        border: `1px solid ${ac}55`,
        borderRadius: "14px",
        boxShadow: "0 6px 26px rgba(0,0,0,0.22)",
        padding: "8px 10px 10px",
        boxSizing: "border-box",
      }}>
        {/* ÜST SATIR — ne çalışıyoruz + sayaçlar + dişli/kapat */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{
            flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontSize: "12.5px", fontWeight: 600, color: ac,
          }}>
            {etiket}
            {zincir && toplam > 0 && (
              <span style={{ color: theme.textSecondary, fontWeight: 500, marginLeft: "6px" }}>
                · {aktifSira}/{toplam}
              </span>
            )}
          </span>
          {ipucu > 0 && (
            <span title="Bu çalışmada aldığınız ipucu" style={{
              display: "flex", alignItems: "center", gap: "3px",
              fontSize: "11px", color: theme.textSecondary, flexShrink: 0,
            }}><Eye size={12} />{ipucu}</span>
          )}
          {/* Tekrar takvimi — /hifz ekranına köprü. Rozet, bugün bekleyen
              âyet sayısı; düğmenin kendisi sayı olmasa da duruyor. */}
          <button onClick={onPanel} title="Hıfz ekranı — tekrar takvimi ve ilerleme"
            style={{ ...yuvarlak, position: "relative", color: bekleyenTekrar > 0 ? ac : theme.textSecondary }}>
            <CalendarCheck size={16} />
            {bekleyenTekrar > 0 && (
              <span style={{
                position: "absolute", top: "-2px", right: "-3px",
                minWidth: "15px", height: "15px", borderRadius: "999px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9.5px", fontWeight: 700, color: "#fff", background: ac,
                padding: "0 3px", boxSizing: "border-box",
              }}>{bekleyenTekrar}</span>
            )}
          </button>
          <button onClick={() => setAyarAcik(v => !v)} title="Hıfz ayarları" style={yuvarlak}>
            <Settings2 size={15} />
          </button>
          <button onClick={kapat} title="Hıfz modundan çık" style={yuvarlak}>
            <X size={15} />
          </button>
        </div>

        {/* ALT SATIR — sarmalı: dar ekranda ikinci satıra iniyor */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
          {/* Perde kademesi */}
          {kademeVar && (
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button onClick={() => onKademe?.(-1)} title="Daha çok göster" style={yuvarlak}><Minus size={14} /></button>
              <span style={{
                minWidth: isMobile ? "76px" : "88px", textAlign: "center",
                fontSize: "12px", fontWeight: 600, color: theme.text,
              }}>{kademeBul(kademe).ad}</span>
              <button onClick={() => onKademe?.(1)} title="Daha çok gizle" style={yuvarlak}><Plus size={14} /></button>
            </div>
          )}

          {/* Zincirde gezinme — RTL: sağ ok "önceki", sol ok "sonraki" */}
          {zincir && (
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button onClick={onOnceki} title="Önceki âyet" style={yuvarlak}><ChevronRight size={16} /></button>
              <button onClick={onSonraki} title="Sonraki âyet" style={yuvarlak}><ChevronLeft size={16} /></button>
            </div>
          )}

          {/* ODAKLA — perde açıkken sayfada gezinildiğinde çalışılan âyet
              ekrandan kaçabiliyor; bu düğme onu geri getiriyor. */}
          <button onClick={onOdakla} title="Çalışılan âyeti ekrana getir" style={yuvarlak}>
            <Crosshair size={15} />
          </button>

          <div style={{ flex: 1 }} />

          {/* SES — tek düğme oynat/duraklat; etkinken yanında DURDUR çıkıyor
              (şeridi boş yere kalabalıklaştırmasın diye yalnız o zaman). */}
          <button onClick={onCal} style={calisiyor ? vurgulu : kucuk}
            title={calisiyor ? "Duraklat" : "Kâri sesiyle tekrar et"}>
            {calisiyor ? <Pause size={13} /> : <Play size={13} />} {tekrarSayisi}×
          </button>
          {sesAcik && (
            <button onClick={onDurdur} style={yuvarlak} title="Sesi durdur">
              <Square size={13} />
            </button>
          )}
          <button onClick={onEzberledim} style={ezberliMi ? vurgulu : kucuk}
            title="Bu aralığı ezberledim olarak işaretle (tekrar takvimine girer)">
            <Check size={14} /> Ezberledim
          </button>
        </div>

        {/* AYARLAR — dişliyle açılır, şeridin içinde büyür */}
        {ayarAcik && (
          <div style={{ marginTop: "10px", paddingTop: "9px", borderTop: `1px solid ${theme.border}` }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: theme.textSecondary, margin: "0 0 6px" }}>
              Neyi gizleyelim
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
              {BIRIMLER.map(b => (
                <button key={b.id} onClick={() => onBirim?.(b.id)} style={birim === b.id ? vurgulu : kucuk}>{b.ad}</button>
              ))}
            </div>

            {kademeVar && (
              <>
                <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: theme.textSecondary, margin: "0 0 6px" }}>
                  Perde kademesi
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {KADEMELER.map(k => (
                    <button key={k.id} onClick={() => onKademe?.(k.id)} style={kademe === k.id ? vurgulu : kucuk}>{k.ad}</button>
                  ))}
                </div>
              </>
            )}

            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: theme.textSecondary, margin: "0 0 6px" }}>
              Yöntem
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
              <button onClick={() => onZincir?.(true)} style={zincir ? vurgulu : kucuk}>Zincir</button>
              <button onClick={() => onZincir?.(false)} style={!zincir ? vurgulu : kucuk}>Tüm aralık</button>
              {[1, 3, 5, 7].map(n => (
                <button key={n} onClick={() => onTekrarSayisi?.(n)} style={tekrarSayisi === n ? vurgulu : kucuk}>{n}× tekrar</button>
              ))}
              <button onClick={onHepsiniAc} style={kucuk}>İpuçlarını sıfırla</button>
            </div>
            <p style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.6, margin: "6px 0 0" }}>
              <b>Kelime</b>: âyetin baştan bir kısmı açık kalır. <b>Âyet</b>: âyet
              ya tümüyle açık ya tümüyle perdeli. <b>Zincir</b>: sıradaki âyet
              açık, öncesi perdeli, sonrası kapalı — klasik usul. <b>Tüm
              aralık</b>: hepsi aynı kademede. Perdeli bir yere dokunursanız
              orası açılır ve ipucu olarak sayılır.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
