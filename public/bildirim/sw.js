/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — BİLDİRİM SERVICE WORKER
   Konum: public/bildirim/sw.js      (kapsam: /bildirim/)

   NEDEN AYRI DOSYA VE DAR KAPSAM:
   Bildirim göstermek için bir ServiceWorkerRegistration nesnesi şart
   (`registration.showNotification`). Ama bu SW'yi "/" kapsamına kaydedersek
   uygulamanın ileride ekleyeceği asıl PWA service worker'ının (vite-plugin-pwa
   vb.) YERİNİ ALIR — aynı kapsamda iki SW duramaz. Onun için dosya /bildirim/
   altında duruyor ve kapsamı oradan ibaret: sayfaları KONTROL ETMİYOR, yalnız
   bildirim gösterip tıklamayı karşılıyor. Böylece asıl SW'ye hiç dokunmuyoruz
   ve bu dosya başka bir projeye olduğu gibi taşınabiliyor.

   Buraya ZAMANLAMA KONULMADI, bilerek: tarayıcıda "şu saatte bildir" diyen bir
   API yok. Chrome'un Notification Triggers denemesi (TimestampTrigger) hiç
   yayına alınmadan bırakıldı. Uygulama kapalıyken bildirim göndermenin tek yolu
   sunucudan Web Push'tır; aşağıdaki `push` dinleyicisi o gün için hazır duruyor.
   ═══════════════════════════════════════════════════════════════════════════ */

self.addEventListener("install", () => {
  // Yeni sürüm hemen devreye girsin; beklemede kalıp eski sürümle çalışmasın.
  self.skipWaiting()
})

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim())
})

// ── Sayfadan gelen istek ────────────────────────────────────────────────────
// Sayfa zaten `registration.showNotification` çağırabiliyor; bu dinleyici,
// gerektiğinde SW üzerinden göstermek isteyen çağrılar için yedek yol.
self.addEventListener("message", (e) => {
  const d = e.data || {}
  if (d.tip !== "bildirim-goster") return
  e.waitUntil(self.registration.showNotification(d.baslik || "Vukuf", secenek(d)))
})

function secenek(d) {
  const s = {
    body: d.metin || "",
    data: { yol: d.yol || "/" },
    // tag + renotify: aynı hatırlatma iki kez düşerse üst üste yığılmaz, tazelenir.
    tag: d.tag || undefined,
    renotify: d.tag ? true : undefined,
    requireInteraction: false,
  }
  if (d.ikon) s.icon = d.ikon
  if (d.rozet) s.badge = d.rozet
  if (Array.isArray(d.titresim)) s.vibrate = d.titresim
  return s
}

// ── Bildirime tıklama ───────────────────────────────────────────────────────
// Açık bir pencere varsa ona odaklan, yoksa yenisini aç. Odaklanma denemesi
// başarısız olursa (bazı tarayıcılarda izin verilmiyor) yeni pencereye düşülür;
// yoksa tıklama hiçbir şey yapmıyormuş gibi görünüyor.
self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  const yol = (e.notification.data && e.notification.data.yol) || "/"
  e.waitUntil((async () => {
    const pencereler = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
    for (const c of pencereler) {
      if (!("focus" in c)) continue
      try {
        await c.focus()
        if (yol && yol !== "/" && c.navigate) { try { await c.navigate(yol) } catch { /* yoksay */ } }
        return
      } catch { /* sıradaki pencereyi dene */ }
    }
    if (self.clients.openWindow) { try { await self.clients.openWindow(yol) } catch { /* yoksay */ } }
  })())
})

// ── Web Push (İLERİSİ İÇİN) ─────────────────────────────────────────────────
// Uygulama KAPALIYKEN bildirim ancak buradan gelebilir. Çalışması için sunucu
// tarafı gerekir: VAPID anahtar çifti, abonelikleri saklayan bir uç ve saati
// gelince push gönderen bir zamanlayıcı (cron). Sunucu eklenene kadar bu
// dinleyici hiç tetiklenmez — durması zararsız, eklenince hazır.
self.addEventListener("push", (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { metin: e.data ? e.data.text() : "" } }
  e.waitUntil(self.registration.showNotification(d.baslik || "Vukuf", secenek(d)))
})
