/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — GERİ (KİTAPLIĞA DÖN) İKONU
   src/components/GeriIkonu.jsx

   Okuma barındaki geri düğmesinin simgesi. Hem mushaf (KuranOkuma) hem Risale
   (OkumaEkrani) barı kullanıyor; tek kaynak olsun diye ayrı dosyada.

   ── NİÇİN OK DEĞİL DE RAF + OK ────────────────────────────────────────────
   Düğme her iki ekranda da KİTAPLIĞA dönüyor, "bir önceki sayfaya" değil. Düz
   bir sola ok bunu söylemiyor; kullanıcı da "Kitaplık ve ok çizebiliriz" dedi.
   Soldaki köşeli ayraç, Kitaplık başlığındaki raf motifinin aynısı (üst/alt
   raf + sol dikme), içinde iki dolu kitap. Ok rafın İÇİNE doğru giriyor: "rafa dön".

   ── KÜÇÜK BOYUTTA OKUNURLUK ───────────────────────────────────────────────
   Barda simge 16-21px arası çiziliyor; bu ölçekte ince ayrıntı çamura dönüyor.
   O yüzden: kitap İÇİ BOŞ değil DOLU (16px'te ince kontur kayboluyor, dolu
   dikdörtgen sağlam bir iz bırakıyor); rafta tek kitap var (iki kitap 16px'te
   birleşip leke oluyordu); ok, rafın çizgilerinden daha KALIN (1.9 / 1.6) —
   göz önce oku, sonra rafı seçiyor. Beş ayrı taslak 16/17/18/21px'te ekranda
   karşılaştırılarak seçildi.

   `boyut` px cinsinden kenar uzunluğu. Renk `currentColor`tan gelir, yani
   düğmenin rengini (aktif/pasif) kendiliğinden izler.
   ═══════════════════════════════════════════════════════════════════════════ */

// `size` takma adı: bar sıralama panelinde simgeler `<Ikon size={n} />` diye
// çağrılıyor. İki ayrı sarmalayıcı yazmamak için ikisi de kabul ediliyor.
export default function GeriIkonu({ boyut, size = 17 }) {
  const kenar = boyut ?? size
  return (
    <svg
      width={kenar}
      height={kenar}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      // translateY(1px) + scale(1.04): kullanıcının elle yaptığı son ince ayar.
      // Simge lucide komşularının yanında bir tık küçük ve yüksek duruyordu;
      // ölçüm bandın içinde çıksa da göz farkı görüyordu. Bu, çizimi değiştirmeden
      // yalnız boyamayı kaydırdığı için düğme kutusunu ve satır genişliğini
      // etkilemiyor — yani bar hizasını bozmadan görsel denge sağlıyor.
      style={{ display: "block", flexShrink: 0, transform: "translateY(1px) scale(1.04)" }}
    >
      {/* Raf: üst raf, alt raf, sol dikme (Kitaplık başlığındaki motifin aynısı).
          YÜKSEKLİK KOMŞU SİMGELERE GÖRE ÖLÇÜLEREK AYARLANDI. Gerçek lucide
          simgeleriyle aynı satırda, aynı ölçekte çizilip mürekkep kutuları
          ölçüldü: 30px kutuda ayraç 26, oynat 26, ara 24, tüy 24, liste 18 →
          ortalama ~23.6px. Raf bir ara 4.7-19.3'e çekilmişti; o hâlde mürekkep
          20px kalıyor ve simge komşularının yanında KÜÇÜK duruyordu. 3.6-20.4
          ile mürekkep 23.4px — bandın tam ortası. Dikeyde zaten ortalı (çizimin
          tamamı 12 ekseninde simetrik; kontrollü ölçümde ağırlık merkezi 30.50,
          komşularınki 29.36-30.61). */}
      <path d="M2.6 3.6 H11.8 M2.6 20.4 H11.8 M2.6 3.6 V20.4" strokeWidth="1.9" />
      {/* İki kitap, ikisi de DOLU — küçük boyutta konturlu hâlleri kayboluyordu.
          Aralarındaki 1.2 birimlik boşluk 16px'te bile ikisini ayrı tutuyor. */}
      <rect x="4.7" y="6.8" width="2.4" height="10.4" rx="0.6" fill="currentColor" stroke="none" />
      <rect x="8.3" y="6.8" width="2.4" height="10.4" rx="0.6" fill="currentColor" stroke="none" />
      {/* Ok: rafın içine doğru; raf çizgilerinden kalın ki önce o okunsun */}
      <path d="M21.2 12 H14.6" strokeWidth="2" />
      <path d="M17.1 9 L14.2 12 l2.9 3" strokeWidth="2" />
    </svg>
  )
}
