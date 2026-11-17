/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — AYARLAR → DÜĞME BOYUTU
   src/components/DugmeBoyutuAyari.jsx

   17 Kasım 2026 — kullanıcı: "Devamlı oynatma butonları ya da menü butonları vs için boyut
   ayarı yapılabilsin, ana menüden değiştirilsin, rahat tıklanabilir olmalı ve ekranı
   kaplamamalı. Web sürümü için daha da büyük olabilir, ekranda zaten küçük kalıyor."

   İki sürgü (%80–%160), her birinin altında canlı örnek ve "Otomatik" düğmesi:
   • Yüzen düğmeler — oynatıcı hapları (radyo, Kur'ân dinle, sesli okuma, mini oynatıcı ve
     küçük hâlleri), Geri dön / köprü düğmeleri, Diyanet TV şeridi, üst çubuktaki düğmeler.
   • Okuma barı ve menüsü — okuma ekranlarındaki "Boyut ayarları → Arayüz" ile aynı değer.
   Değerler ve otomatik kural: data/arayuzOlcegi.js
   ═══════════════════════════════════════════════════════════════════════════ */

import { OLCEK_EN_AZ, OLCEK_EN_COK, olcekYaz, useOlcekAyari, genisEkran } from "../data/arayuzOlcegi"
import { DonusSimgesi, DurdurSimgesi, SonrakiSimgesi } from "./CerceveliSimge"
import { List, Search, Settings2, Play } from "lucide-react"

const yuzde = (v) => `%${Math.round(v * 100)}`

function Surgu({ theme, baslik, aciklama, tur, ornek }) {
  const { deger, oto } = useOlcekAyari(tur)
  const ac = theme.accent
  const y = ((deger - OLCEK_EN_AZ) / (OLCEK_EN_COK - OLCEK_EN_AZ)) * 100
  return (
    <div style={{ padding: "10px 4px 12px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span style={{ flex: 1, fontSize: "15px", color: theme.text, fontWeight: 500 }}>{baslik}</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: ac, fontVariantNumeric: "tabular-nums" }}>{yuzde(deger)}</span>
      </div>
      <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "2px", lineHeight: 1.45 }}>{aciklama}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
        <input type="range" min={OLCEK_EN_AZ} max={OLCEK_EN_COK} step="0.05" value={deger}
          aria-label={`${baslik} boyutu`}
          onChange={(e) => olcekYaz(tur, parseFloat(e.target.value))}
          style={{ flex: 1, minWidth: 0, accentColor: ac, background: `linear-gradient(90deg, ${ac} ${y}%, ${theme.border} ${y}%)`, height: "6px", borderRadius: "3px" }} />
        <button onClick={() => olcekYaz(tur, null)} aria-pressed={oto}
          title={genisEkran() ? "Geniş ekranda daha büyük, telefonda normal" : "Bu ekranda %100"}
          style={{
            flexShrink: 0, padding: "6px 11px", borderRadius: "999px", cursor: "pointer", fontFamily: "inherit",
            fontSize: "12px", fontWeight: 600,
            border: `1.5px solid ${oto ? ac : theme.border}`, background: oto ? `${ac}18` : "transparent",
            color: oto ? ac : theme.textSecondary,
          }}>Otomatik</button>
      </div>
      {/* Canlı örnek */}
      <div aria-hidden="true" style={{
        marginTop: "12px", padding: "12px", borderRadius: "12px", background: theme.background,
        border: `1px dashed ${theme.border}`, display: "flex", justifyContent: "center", overflow: "hidden",
      }}>
        {ornek(deger)}
      </div>
    </div>
  )
}

export default function DugmeBoyutuAyari({ theme }) {
  const ac = theme.accent
  const hapOrnek = (o) => (
    <div style={{ display: "flex", alignItems: "center", gap: `${Math.round(10 * o)}px`, flexWrap: "wrap", justifyContent: "center" }}>
      {/* oynatıcı hapı */}
      <span style={{
        display: "inline-flex", alignItems: "center", gap: `${Math.round(4 * o)}px`, padding: `${Math.round(4 * o)}px`,
        borderRadius: "999px", background: theme.surface, border: `1.5px dashed ${ac}`, boxShadow: "0 4px 14px rgba(0,0,0,0.16)",
      }}>
        <DonusSimgesi bolum="radyo" ac={ac} boy={Math.round(38 * o)} />
        <span style={{ fontSize: `${(12.5 * o).toFixed(1)}px`, fontWeight: 700, color: theme.text, padding: `0 ${Math.round(4 * o)}px` }}>Radyo</span>
        <SonrakiSimgesi ac={ac} boy={Math.round(30 * o)} />
        <DurdurSimgesi ac={ac} boy={Math.round(30 * o)} />
      </span>
      {/* küçük hâl */}
      <span style={{
        width: `${Math.round(46 * o)}px`, height: `${Math.round(46 * o)}px`, borderRadius: "50%", display: "inline-flex",
        alignItems: "center", justifyContent: "center", background: theme.surface, border: `1px solid ${ac}`, color: ac,
        boxShadow: "0 4px 14px rgba(0,0,0,0.16)",
      }}><Play size={Math.round(18 * o)} fill={ac} /></span>
    </div>
  )
  const barOrnek = (o) => (
    <div style={{
      display: "flex", alignItems: "center", gap: `${Math.round(4 * o)}px`, padding: `${Math.round(5 * o)}px ${Math.round(8 * o)}px`,
      borderRadius: `${Math.round(12 * o)}px`, background: theme.surface, border: `1px solid ${theme.border}`,
    }}>
      {[List, Search, Settings2].map((I, i) => (
        <span key={i} style={{
          minWidth: `${Math.round(46 * o)}px`, display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "2px",
          padding: `${Math.round(5 * o)}px ${Math.round(3 * o)}px`, color: i === 0 ? ac : theme.textSecondary,
        }}>
          <I size={Math.round(18 * o)} />
          <span style={{ fontSize: `${Math.max(9, Math.round(9.5 * o))}px` }}>{["Fihrist", "Ara", "Ayarlar"][i]}</span>
        </span>
      ))}
    </div>
  )
  return (
    <div>
      <div style={{ fontSize: "12px", color: theme.textSecondary, lineHeight: 1.5, margin: "0 4px 2px" }}>
        Düğmeler rahat dokunulacak kadar büyütülebilir ya da ekranı daha az kaplasın diye küçültülebilir.
        "Otomatik"te geniş ekranda (bilgisayarda) daha büyük, telefonda normal boyut kullanılır. Ayar bu cihazda saklanır.
      </div>
      <Surgu theme={theme} tur="hap" baslik="Yüzen düğmeler"
        aciklama="Radyo, Kur'ân dinleme, sesli okuma ve oynatıcı hapları; küçük hâlleri; Geri dön ve köprü düğmeleri; Diyanet TV penceresinin şeridi; en üstteki menü, yardım ve ayarlar düğmeleri."
        ornek={hapOrnek} />
      <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "2px 0" }} />
      <Surgu theme={theme} tur="bar" baslik="Okuma barı ve menüsü"
        aciklama="Kur'ân-ı Kerîm ve eser okuma ekranlarındaki bar, menü ve kaydırma menüsü. Okuma ekranlarındaki Boyut ayarları → Arayüz ile aynıdır."
        ornek={barOrnek} />
    </div>
  )
}
