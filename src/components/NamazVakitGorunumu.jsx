/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — NAMAZ VAKTİ GÖRÜNÜMÜ (cami sahnesi + vakit ızgarası + tarih)
   src/components/NamazVakitGorunumu.jsx

   14 Kasım 2026 — kullanıcı: "Ekstralar bölümündeki Namaz vakitleri için oluşturulan kart,
   kütüphanede üst kısma istek dahilinde alınabilsin … Kütüphanede kartta görünecekler ise,
   Şehir İsmi, alt kısımda cami ve vakitler (kerahat vakitleri ve mübarek günler sayacı
   dahil), miladi ve hicri gün görüntülensin. Sonraki vakitlere tıklama işlevi aynı şekilde
   çalışsın fakat bilgi vermeye gerek yok."
   Ekstralar → Namaz Vakitleri kartındaki gövde buraya taşındı; aynı görünüm Kitaplık'taki
   kartta da (components/NamazKutuphaneKarti.jsx) kullanılıyor. `ipucu`: vakit ızgarasının
   altındaki satır (Ekstralar verir, Kitaplık vermez).
   ═══════════════════════════════════════════════════════════════════════════ */

import CamiVakit from "./CamiVakit"
import {
  VAKITLER, vakitAni, ramazanHedefi, ramazanMi, kerahatDurumu, kerahatAraliklari, gokDurumu, yaklasanGunler,
} from "../data/namazVakitleri"

// Süre yazısı: "1 sa 13 dk 42 sn" — saniye küçük ve soluk
export function SureYazisi({ ms }) {
  const top = Math.max(0, Math.floor(Math.abs(ms) / 1000))
  const sa = Math.floor(top / 3600), dk = Math.floor((top % 3600) / 60), sn = top % 60
  const ana = [sa ? `${sa} sa` : "", sa || dk ? `${dk} dk` : ""].filter(Boolean).join(" ")
  return (
    <>
      <span style={{ whiteSpace: "nowrap" }}>{ana}</span>
      <span style={{ whiteSpace: "nowrap", display: "inline-block", fontSize: "0.5em", fontWeight: 600, opacity: 0.75, marginLeft: ana ? "0.35em" : 0 }}>
        {String(sn).padStart(ana ? 2 : 1, "0")} sn
      </span>
    </>
  )
}

/**
 * @param d               durumHesapla(liste) sonucu (d.bugun dolu olmalı)
 * @param seciliVakit     dokunulan vakit anahtarı (null = yaklaşan vakit)
 * @param setSeciliVakit
 * @param ipucu           ızgaranın altındaki satır (yoksa hiç çizilmez)
 * @param hava            { derece, tur, gunduz } — caminin göğünde (data/havaDurumu.js)
 */
export default function NamazVakitGorunumu({ theme, d, seciliVakit, setSeciliVakit, ipucu = null, hava = null }) {
  const sonrakiKalan = d?.sonraki ? d.sonraki.an - Date.now() : null
  const ramazan = ramazanHedefi(d)
  const kerahat = d?.bugun ? kerahatDurumu(d.bugun) : null
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Cami: mihrabında yaklaşan (ya da dokunulan) vakit ve kalan / geçen süre */}
      {(() => {
        const sec = seciliVakit && VAKITLER.find(v => v.k === seciliVakit)
        // Caminin solundaki gökyüzünde günün kerahat aralıkları; içindeysek sağda bildirim.
        // Ramazan'da (kerahat yokken) sağda sahur ve iftar saatleri.
        const araliklar = kerahatAraliklari(d.bugun)
        const gok = gokDurumu(d)
        const sol = (
          <>
            <span style={{ fontSize: "0.88em", fontWeight: 700, color: theme.textSecondary, marginBottom: "0.2em", lineHeight: 1.05 }}>Kerahat Vakitleri</span>
            {araliklar.map(a => (
              <span key={a.k} title={`${a.ad} · ${a.basSaat}–${a.bitSaat}`}
                style={{ display: "block", marginBottom: "0.12em", opacity: a.gecti && !a.aktif ? 0.55 : 1, color: a.aktif ? theme.accent : theme.textSecondary }}>
                <span style={{ display: "block", fontSize: "0.88em" }}>{a.kisa}</span>
                <span style={{ display: "block", fontWeight: a.aktif ? 700 : 600, color: a.aktif ? theme.accent : theme.text, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{a.basSaat}–{a.bitSaat}</span>
              </span>
            ))}
          </>
        )
        const ramGun = d.bugun && Date.now() >= vakitAni(d.bugun, d.bugun.Aksam) && d.yarin ? d.yarin : d.bugun
        /* SAĞ KÖŞE (12 Kasım 2026, kullanıcı: "cami üzerine (sağ tarafa) en yakın mübarek günü
           ve kaldığı günü yazalım. Kerahat vaktine 1 saatten az kalmışsa, vakit içindeyken
           yazdığımız yere 'xx dk xx sn kaldı' diye yazalım"). Üstte kerahat bildirimi (içindeyken
           ya da başlamasına 1 saatten az kalmışken; saniyeli geri sayım) ya da Ramazan'da sahur/
           iftar; altta en yakın mübarek gün ve kalan gün. */
        const simdiMs = Date.now()
        const dkSn = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)} dk ${String(t % 60).padStart(2, "0")} sn` }
        const yaklasanKerahat = !kerahat ? araliklar.find(a => a.bas > simdiMs && a.bas - simdiMs <= 3600000) : null
        const mubarek = yaklasanGunler(1)[0] || null
        const kerahatKutusu = (icinde, k) => (
          <span role="status" style={{
            display: "flex", flexDirection: "column", alignItems: "flex-end", padding: "0.3em 0.45em", borderRadius: "0.6em",
            border: `1px ${icinde ? "solid" : "dashed"} ${theme.accent}`, background: icinde ? `${theme.accent}14` : "transparent",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3em", fontWeight: 700, color: theme.accent, whiteSpace: "nowrap" }}>
              {icinde && <span className="vk-kerahat-nokta" style={{ width: "0.55em", height: "0.55em", borderRadius: "50%", background: theme.accent }} />}
              {icinde ? "Kerahat vakti" : "Kerahat vaktine"}
            </span>
            <span style={{ fontSize: "0.9em", whiteSpace: "nowrap" }}>{k.kisa} · {icinde ? `bitiş ${k.bitSaat}` : k.basSaat}</span>
            <span style={{ color: theme.text, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{dkSn((icinde ? k.bit : k.bas) - simdiMs)} kaldı</span>
          </span>
        )
        const ust = kerahat ? kerahatKutusu(true, kerahat)
          : yaklasanKerahat ? kerahatKutusu(false, yaklasanKerahat)
          : ramGun && ramazanMi(ramGun) ? (
            <>
              <span style={{ display: "block", fontSize: "0.88em" }}>Sahur</span>
              <span style={{ display: "block", fontWeight: 600, color: theme.text, fontVariantNumeric: "tabular-nums", marginBottom: "0.25em" }}>{ramGun.Imsak}</span>
              <span style={{ display: "block", fontSize: "0.88em" }}>İftar</span>
              <span style={{ display: "block", fontWeight: 600, color: theme.text, fontVariantNumeric: "tabular-nums" }}>{ramGun.Aksam}</span>
            </>
          ) : null
        const gunYazisi = mubarek && (
          <span title={`${mubarek.ad}${mubarek.gece ? " (akşamı)" : ""}`} style={{ display: "block", marginTop: ust ? "0.35em" : 0 }}>
            <span style={{ display: "block", fontSize: "0.88em", fontWeight: 700, color: theme.textSecondary, lineHeight: 1.05 }}>{mubarek.ad}</span>
            <span style={{ display: "block", fontWeight: 600, color: mubarek.kalanGun === 0 ? theme.accent : theme.text, whiteSpace: "nowrap" }}>
              {mubarek.kalanGun === 0 ? "Bugün" : mubarek.kalanGun === 1 ? "Yarın" : `${mubarek.kalanGun} gün kaldı`}
            </span>
          </span>
        )
        const sag = (ust || gunYazisi) ? <>{ust}{gunYazisi}</> : null
        if (sec) {
          const fark = vakitAni(d.bugun, d.bugun[sec.k]) - Date.now()
          return (
            <CamiVakit theme={theme} sol={sol} sag={sag} gok={gok} hava={hava}
              ust={<><strong style={{ color: theme.text }}>{sec.ad}</strong> · {d.bugun[sec.k]}</>}
              buyuk={<SureYazisi ms={fark} />}
              alt={fark > 0 ? "kaldı" : "geçti"} />
          )
        }
        // Ramazan: iftara / sahura kalan (kendiliğinden)
        if (ramazan) {
          return (
            <CamiVakit theme={theme} sol={sol} sag={sag} gok={gok} hava={hava}
              ust={<>{ramazan.tur === "iftar" ? "İftara kalan" : "Sahura kalan"}: <span style={{ whiteSpace: "nowrap" }}><strong style={{ color: theme.text }}>{ramazan.ad}</strong> · {ramazan.saat}</span></>}
              buyuk={<SureYazisi ms={ramazan.an - Date.now()} />}
              alt="kaldı" />
          )
        }
        return (
          <CamiVakit theme={theme} sol={sol} sag={sag} gok={gok} hava={hava}
            ust={d.sonraki ? <>{d.sonraki.yarin ? "Yarın" : "Yaklaşan vakit"}: <span style={{ whiteSpace: "nowrap" }}><strong style={{ color: theme.text }}>{d.sonraki.ad}</strong> · {d.sonraki.saat}</span></> : "Günün vakitleri"}
            buyuk={d.sonraki ? <SureYazisi ms={sonrakiKalan} /> : null}
            alt={d.sonraki ? "kaldı" : null} />
        )
      })()}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
        {VAKITLER.map(v => {
          const sira = d.sonraki && !d.sonraki.yarin && d.sonraki.k === v.k
          const simdi = d.simdiki === v.k
          const secili = seciliVakit === v.k
          return (
            <button key={v.k} aria-pressed={secili}
              title={secili ? "Yaklaşan vakte dön" : `${v.ad} vaktine kalan / geçen süre`}
              onClick={() => setSeciliVakit(secili || sira ? null : v.k)}
              style={{
                padding: "8px 6px", borderRadius: "10px", textAlign: "center", cursor: "pointer", fontFamily: "inherit",
                border: secili ? `2px solid ${theme.accent}` : `1px solid ${sira ? theme.accent : theme.border}`,
                margin: secili ? 0 : "1px",
                background: secili ? `${theme.accent}22` : simdi ? `${theme.accent}18` : sira ? `${theme.accent}0a` : "transparent",
              }}>
              <div style={{ fontSize: "11.5px", color: theme.textSecondary }}>{v.ad}</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: secili || sira || simdi ? theme.accent : theme.text, fontVariantNumeric: "tabular-nums" }}>{d.bugun[v.k]}</div>
            </button>
          )
        })}
      </div>      {ipucu}
      {d.bugun.HicriTarihUzun && (
        <div style={{ fontSize: "12px", color: theme.textSecondary, textAlign: "center" }}>
          {d.bugun.MiladiTarihUzun} · {d.bugun.HicriTarihUzun}
        </div>
      )}
    </div>
  )
}
