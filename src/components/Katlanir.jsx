/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KATLANIR BÖLÜM (accordion satırı)
   src/components/Katlanir.jsx

   Ayarlar panelindeki bölümleri açılır çekmeceye çevirir: başlık satırı her
   zaman görünür, içerik yalnız açıkken çizilir.

   ── TASARIM KARARLARI ──────────────────────────────────────────────────────
   • ÖZET BAŞLIKTA. Sağdaki küçük yazı ("38.4 GB ayrıldı", "61 kayıt") bölümü
     AÇMADAN önemli sayıyı gösterir. Amaç, kullanıcının bilgiye ulaşmak için
     çekmece açmak zorunda kalmaması — panel sade dursun ama kör olmasın.
   • YÜKSEKLİK ANİMASYONU YOK, bilerek. İçeriğin yüksekliği önceden bilinmediği
     için `max-height` ile animasyon ya içeriği kırpar ya da abartılı bir tavan
     ister; ikisi de daha önce bu projede sorun çıkardı (Arama.jsx'teki sonuç
     çekmecesinde 2000px sınırı uzun listeleri kesiyordu). Onun yerine içerik
     açılırken kısa bir opaklık + kayma geçişi var; ölçüye hiç dokunulmuyor.
   • İÇERİK KAPALIYKEN HİÇ ÇİZİLMİYOR (`{acik && children}`). Böylece kapalı
     bölümlerdeki efektler/ölçümler de çalışmıyor — panel hafif kalıyor.
   • Kapsayıcı `AltSayfa` her render'da kaydırılabilirliği yeniden ölçtüğü için
     açılıp kapanma onun sürükleme davranışını bozmaz; burada ek iş gerekmiyor.
   ═══════════════════════════════════════════════════════════════════════════ */

import { ChevronDown } from "lucide-react"

export default function Katlanir({ theme, ikon: Ikon, baslik, ozet, acik, onAc, children }) {
  return (
    <div style={{ borderBottom: `1px solid ${theme.border}` }}>
      <button
        onClick={onAc}
        aria-expanded={acik}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "9px",
          padding: "13px 4px", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          color: acik ? theme.accent : theme.text,
        }}
      >
        {Ikon && <Ikon size={14} style={{ flexShrink: 0, opacity: 0.8 }} />}
        <span style={{ flex: 1, minWidth: 0, fontSize: "14px", fontWeight: 500 }}>
          {baslik}
        </span>
        {ozet && (
          <span style={{
            flexShrink: 0, fontSize: "11px", color: theme.textSecondary,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: "45%",
          }}>{ozet}</span>
        )}
        <ChevronDown
          size={16}
          style={{
            flexShrink: 0, color: theme.textSecondary,
            transform: acik ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {acik && (
        <div className="katlanir-ic" style={{ padding: "0 2px 14px" }}>
          {children}
        </div>
      )}

      <style>{`
        @keyframes katlanir-ac { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }
        .katlanir-ic { animation: katlanir-ac 0.18s ease }
      `}</style>
    </div>
  )
}
