/* ═══════════════════════════════════════════════════════════════════════════
 *  VUKUF — ÇEVRİMDIŞI YÖNETİMİ (sayfa tarafı)
 *  src/data/cevrimdisi.js
 *
 *  `public/sw.js` ile konuşan ince katman. React yok, saf yardımcı.
 *
 *  ── GELİŞTİRME SUNUCUSUNDA KAYIT YAPILMIYOR ────────────────────────────────
 *  Servis işçisi `npm run dev` sırasında açıkken kaynak değişiklikleri önbelleğe
 *  takılır ve "değiştirdim ama olmadı" saatleri başlar. `import.meta.env.PROD`
 *  kontrolü bunu baştan keser. Ayrıca güvenli bağlam (HTTPS/localhost) şart —
 *  http://192.168.x.x gibi bir adreste `navigator.serviceWorker` hiç yoktur.
 *  ═══════════════════════════════════════════════════════════════════════════ */

export function destekVar() {
  try {
    return Boolean(
      typeof window !== "undefined" &&
      window.isSecureContext &&
      "serviceWorker" in navigator
    )
  } catch { return false }
}

/* Kayıt. `onGuncelleme(kayit)` YENİ bir sürüm hazır beklemeye geçtiğinde
 *  çağrılıyor — sayfa "yeni sürüm var" çubuğunu o zaman gösteriyor.
 *  `skipWaiting` BURADA ÇAĞRILMIYOR: kullanıcı okurken uygulamayı altından
 *  çekmek doğru değil, kararı ona bırakıyoruz. */
export async function swKaydet(onGuncelleme) {
  if (!destekVar()) return null
    try {
      const kayit = await navigator.serviceWorker.register("/sw.js", { scope: "/" })

      // Zaten bekleyen bir sürüm varsa (önceki ziyarette inmiş) hemen bildir.
      if (kayit.waiting && navigator.serviceWorker.controller) onGuncelleme?.(kayit)

        kayit.addEventListener("updatefound", () => {
          const yeni = kayit.installing
          if (!yeni) return
            yeni.addEventListener("statechange", () => {
              // `controller` yoksa bu İLK kurulumdur; güncelleme bildirimi gösterme.
              if (yeni.state === "installed" && navigator.serviceWorker.controller) {
                onGuncelleme?.(kayit)
              }
            })
        })
        return kayit
    } catch {
      return null
    }
}

/* Bekleyen sürüme geç ve sayfayı yenile.
 *  `controllerchange` bir kez dinleniyor — iki kez yenilenmeyi önlemek için
 *  bayrak kullanılıyor (bilinen bir tuzak: bazı tarayıcılar olayı tekrarlıyor). */
let yenileniyor = false
export function swGuncelle(kayit) {
  if (!kayit || !kayit.waiting) { window.location.reload(); return }
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (yenileniyor) return
      yenileniyor = true
      window.location.reload()
  })
  kayit.waiting.postMessage({ tip: "SKIP_WAITING" })
}

/* Çalışan servis işçisinin sürüm damgası. Panelde gösteriliyor ki "hangi kod
 *  çalışıyor" sorusu tahminle değil bakarak cevaplansın. */
export function swSurum(zamanAsimi = 1500) {
  return new Promise((coz) => {
    if (!destekVar() || !navigator.serviceWorker.controller) { coz(null); return }
    let bitti = false
    const kanal = new MessageChannel()
    kanal.port1.onmessage = (e) => {
      if (bitti) return
        bitti = true
        coz(e.data && e.data.surum ? e.data.surum : null)
    }
    setTimeout(() => { if (!bitti) { bitti = true; coz(null) } }, zamanAsimi)
    try {
      navigator.serviceWorker.controller.postMessage({ tip: "SURUM" }, [kanal.port2])
    } catch { if (!bitti) { bitti = true; coz(null) } }
  })
}

/* Kabuk saklandı mı? Soğuk açılış teşhisinin can alıcı sorusu: veri önbelleği
 *  doluyken bile kabuk boşsa uygulama çevrimdışı AÇILMAZ ama açıkken her şey
 *  çalışır — kullanıcının tarif ettiği belirti tam olarak budur. */
export function kabukDurumu(zamanAsimi = 1500) {
  return new Promise((coz) => {
    if (!destekVar() || !navigator.serviceWorker.controller) { coz(null); return }
    let bitti = false
    const kanal = new MessageChannel()
    kanal.port1.onmessage = (e) => {
      if (bitti) return
        bitti = true
        coz(Boolean(e.data && e.data.kabuk))
    }
    setTimeout(() => { if (!bitti) { bitti = true; coz(null) } }, zamanAsimi)
    try {
      navigator.serviceWorker.controller.postMessage({ tip: "KABUK_DURUM" }, [kanal.port2])
    } catch { if (!bitti) { bitti = true; coz(null) } }
  })
}

/* Önbellek dökümü: hangi önbellekte kaç kayıt var.
 *  BAYT SAYMIYORUZ bilerek — her yanıtın gövdesini okumak gerekirdi ve veri
 *  önbelleği onlarca MB olabilir. Toplam yer zaten `navigator.storage.estimate()`
 *  ile Depolama bölümünde gösteriliyor; burada "kaç dosya" yeterli. */
export async function onbellekDokumu() {
  try {
    const adlar = (await caches.keys()).filter(a => a.startsWith("vukuf-"))
    const satirlar = []
    for (const ad of adlar) {
      const k = await caches.open(ad)
      satirlar.push({ ad, adet: (await k.keys()).length })
    }
    return satirlar.sort((a, b) => b.adet - a.adet)
  } catch {
    return []
  }
}

/* Kill switch: bütün vukuf önbelleklerini sil, servis işçisini kaydından
 *  düşür, sayfayı yenile. "Bayat kod" şüphesi doğduğunda ilk başvurulacak yer.
 *  localStorage'a DOKUNMUYOR — kullanıcının işaretleri, notları, ayarları
 *  burada silinmez; onlar için Sıfırla bölümü var. */
export async function onbellegiTemizle() {
  let silinen = 0
  try {
    const adlar = (await caches.keys()).filter(a => a.startsWith("vukuf-"))
    for (const ad of adlar) { if (await caches.delete(ad)) silinen++ }
  } catch { /* yoksay */ }
  try {
    if (destekVar()) {
      const kayitlar = await navigator.serviceWorker.getRegistrations()
      await Promise.all(kayitlar.map(k => k.unregister()))
    }
  } catch { /* yoksay */ }
  return silinen
}

/* Toplu ön yükleme — servis işçisine adres listesi gönderir, ilerlemeyi
 *  `onIlerleme({tamam, hata, toplam})` ile bildirir. Dönen fonksiyon dinleyiciyi
 *  kaldırır. İndirme İŞÇİDE yürüyor: sayfa kapansa bile sürer. */
export function onYukle(adresler, onIlerleme) {
  if (!destekVar() || !navigator.serviceWorker.controller) return () => {}
  const dinle = (e) => {
    const d = e.data || {}
    if (d.tip === "ON_YUKLE_ILERLEME") onIlerleme?.(d)
  }
  navigator.serviceWorker.addEventListener("message", dinle)
  navigator.serviceWorker.controller.postMessage({ tip: "ON_YUKLE", adresler })
  return () => navigator.serviceWorker.removeEventListener("message", dinle)
}
