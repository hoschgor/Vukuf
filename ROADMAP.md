# vukuf — Mushaf Projesi Yol Haritası

Proje dizini: `/home/hosgoer/Projeler/vukuf/src`

---

## Tamamlanan Dosyalar

| Dosya | Hedef Konum | Durum |
|-------|-------------|-------|
| `useAudioPlayer.js` | `src/data/hooks/useAudioPlayer.js` | ✅ Hazır |
| `PlayerBar.jsx` | `src/components/PlayerBar.jsx` | ✅ Hazır (sadeleştirildi) |
| `Besmele.jsx` | `src/components/Besmele.jsx` | ✅ Güncellendi (ses butonu eklendi) |
| `KariSecici.jsx` | `src/components/KariSecici.jsx` | ✅ Hazır |

---

## Sıradaki Adımlar

### Aşama 1 — Ses Sistemi ✅
| Dosya | Hedef Konum | Durum |
|-------|-------------|-------|
| `useAudioPlayer.js` | `src/data/hooks/useAudioPlayer.js` | ✅ Hazır |
| `PlayerBar.jsx` | `src/components/PlayerBar.jsx` | ✅ Hazır |
| `Besmele.jsx` | `src/components/Besmele.jsx` | ✅ Güncellendi |
| `KariSecici.jsx` | `src/components/KariSecici.jsx` | ✅ Hazır |

### Aşama 2 — Meal & Kelime Popup
| Dosya | Hedef Konum | Durum |
|-------|-------------|-------|
| `KelimePopup.jsx` | `src/components/KelimePopup.jsx` | ✅ Hazır |
| `AyetPopup.jsx` | `src/components/AyetPopup.jsx` | ✅ Hazır |

### Aşama 3 — Veri Hazırlama
| Dosya | Hedef Konum | Durum |
|-------|-------------|-------|
| `kuran_mushaf_hazirla.py` | `src/data/kuran_mushaf_hazirla.py` | ✅ Hazır |
| `kuran-mushaf.json` | `src/data/kuran-mushaf.json` | ✅ Hazır |
| `sayfa-harita.json` | `src/data/sayfa-harita.json` | ✅ Hazır |

### Aşama 4 — Mushaf Layout
| Dosya | Hedef Konum | Durum |
|-------|-------------|-------|
| `MushafKelime.jsx` | `src/components/MushafKelime.jsx` | 🔲 Sırada |
| `MushafSayfa.jsx` | `src/components/MushafSayfa.jsx` | 🔲 Sırada |
| `SecdeKenar.jsx` | `src/components/SecdeKenar.jsx` | 🔲 Sırada |
| `KuranOkuma.jsx` | `src/pages/KuranOkuma.jsx` | 🔲 Yeniden yazılacak |

### Aşama 5 — Detaylar
| Özellik | Notlar | Durum |
|---------|--------|-------|
| Cüz / hizb gösterimi | Sayfa köşesinde küçük | 🔲 Sırada |
| Son okunan yer | localStorage | 🔲 Sırada |
| Yer imi entegrasyonu | Mevcut sistemle birleşecek | 🔲 Sırada |
| Çift sayfa modu | Tablet/desktop | 🔲 Sırada |

---

## Dosya Konumları (Özet)

```
src/
├── data/
│   └── hooks/
│       ├── useMediaQuery.js          ← mevcut, dokunulmadı
│       └── useAudioPlayer.js         ← YENİ
├── components/
│   ├── AyetNo.jsx                    ← mevcut, dokunulmadı
│   ├── Navbar.jsx                    ← mevcut, dokunulmadı
│   ├── SureBasligi.jsx               ← mevcut, dokunulmadı
│   ├── Besmele.jsx                   ← GÜNCELLENDİ (ses butonu)
│   ├── PlayerBar.jsx                 ← YENİ
│   ├── KariSecici.jsx                ← YENİ
│   ├── KelimePopup.jsx               ← sırada
│   ├── AyetPopup.jsx                 ← sırada
│   ├── MushafKelime.jsx              ← sırada
│   ├── MushafSayfa.jsx               ← sırada
│   └── SecdeKenar.jsx                ← sırada
└── pages/
    └── KuranOkuma.jsx                ← en son yeniden yazılacak
```

---

## KuranOkuma.jsx — Entegrasyon Notu

KariSecici ayarlar paneline şöyle eklenir:

```jsx
import KariSecici from "../components/KariSecici"

// AyarlarPanel içinde:
<KariSecici
  kariId={player.kariId}
  setKariId={player.setKariId}
  theme={theme}
  barKonum={barKonum}
/>
```

PlayerBar şöyle kullanılır:

```jsx
import PlayerBar from "../components/PlayerBar"

<PlayerBar
  player={player}
  sureler={kuranIslenmiş}
  theme={theme}
  barKonum={barKonum}
/>
```

Besmele şöyle güncellenir:

```jsx
<Besmele
  theme={theme}
  sureId={satir.sure.id}
  sureNo={satir.sure.id}
  ayetSayisi={satir.sure.ayetSayisi}
  player={player}
/>
```

---

## useAudioPlayer — API Özeti

```js
import useAudioPlayer, { KARILAR } from "../data/hooks/useAudioPlayer"

const player = useAudioPlayer()

// Erişilebilir değerler:
player.durum        // "caliyor" | "duraklatildi" | "kapali"
player.aktifAyet    // { sureNo, ayetNo } | null
player.kariId       // "Alafasy_128kbps" | ...
player.hata         // string | null

// Fonksiyonlar:
player.ayetCal(sureNo, ayetNo)
player.sureCal(sureNo, toplamAyetSayisi, baslangicAyet?)
player.besmeleCal()
player.duraklat()
player.devamEt()
player.durdur()
player.oncekiAyet()
player.sonrakiAyet()
player.setKariId(id)
```

---

## Kelime Objesi Yapısı (kuran-mushaf.json)

```json
{
  "id": "2:5:3",
  "arabic": "هُدٗى",
  "okunus": "huden",
  "anlam": "hidayet",
  "vakif": "م",
  "secde": null
}
```

### Vakıf Tipleri
| İşaret | Anlam |
|--------|-------|
| `م` | Mecburi vakıf (lazım) |
| `ط` | Mutlak vakıf |
| `ج` | Caiz vakıf |
| `ز` | Mürur (geçmek daha iyi) |
| `ص` | Sıla (vasledilmeli) |
| `ق` | Kıl (okumaya devam) |
| `∴` | Muanaka (birinde durul) |
| `null` | Vakıf yok |

### Secde Ayetleri (15 adet)
| Sure | Ayet |
|------|------|
| 7 | 206 |
| 13 | 15 |
| 16 | 50 |
| 17 | 109 |
| 19 | 58 |
| 22 | 18 |
| 22 | 77 |
| 25 | 60 |
| 27 | 26 |
| 32 | 15 |
| 38 | 24 |
| 41 | 38 |
| 53 | 62 |
| 84 | 21 |
| 96 | 19 |

---

## Notlar
- Sayfa sistemi zoom'dan bağımsız olacak — satır bilgisi JSON'da sabit tutulacak
- everyayah.com API key gerektirmiyor, URL formatı: `/{kariId}/{sure3}{ayet3}.mp3`
- Muanaka vakfı (`∴`) iki kelime arasında ortak — veri yapısında özel işlem gerekebilir
- Kari seçimi globaldir — PlayerBar değil, AyarlarPanel > KariSecici üzerinden yapılır
