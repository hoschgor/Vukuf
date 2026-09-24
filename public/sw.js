/* ═══════════════════════════════════════════════════════════════════════════
 * VUKUF — SERVİS İŞÇİSİ
 * public/sw.js        (site kökünden servis edilmeli: kapsamı tüm origin)
 *
 * ── NİÇİN ELDE YAZILDI, vite-plugin-pwa DEĞİL ──────────────────────────────
 * Eklenti derleme anında bir "precache manifest" üretir ve oradaki her şeyi ilk
 * açılışta indirir. Bizim public/ klasörümüz ~62 MB (kitap metinleri 42 MB) —
 * bunu ilk açılışta indirtmek kabul edilemez. Ayrıca yeni bir bağımlılık ve
 * derleme sihri girmiş olurdu. Onun yerine ÇALIŞMA ZAMANI ÖNBELLEĞİ: kullanıcı
 * neyi açtıysa o çevrimdışı çalışır. Toplu indirme ayrı ve İSTEĞE BAĞLI olacak.
 *
 * ── ÖNBELLEK BÖLÜNMESİ — EN ÖNEMLİ KARAR ───────────────────────────────────
 * Üç ayrı önbellek var ve ikisi sürümlü, biri DEĞİL:
 *   vukuf-kabuk-<SURUM>   → index.html (gezinme yanıtı)
 *   vukuf-varlik-<SURUM>  → /assets/* (Vite'ın hash'li JS/CSS'i)
 *   vukuf-veri            → SÜRÜMSÜZ: json, font, görsel
 * Sebep: her yayında sürüm artınca kabuk ve varlık önbellekleri silinir (eski
 * kod kalmasın). Ama VERİ önbelleği silinmemeli — kullanıcının indirdiği 40 MB
 * kitap metni her güncellemede yeniden inmemeli. Veri tazeliği "bayatken
 * tazele" ile sağlanıyor: önbellekten anında veriliyor, arkada yenisi çekilip
 * üzerine yazılıyor.
 *
 * ── BAYAT KOD TUZAĞI ───────────────────────────────────────────────────────
 * Servis işçisinin bilinen bedeli: yeni sürüm yayınlanır, cihaz eskisini
 * çalıştırmaya devam eder, olmayan hatalar aranır. Üç önlem birlikte konuldu:
 *   1) `skipWaiting` KENDİLİĞİNDEN çağrılmıyor — kullanıcı okurken uygulamayı
 *      altından çekmek doğru değil. Sayfa "yeni sürüm var" çubuğu gösteriyor,
 *      dokununca SKIP_WAITING mesajı geliyor.
 *   2) Gezinme istekleri ÖNCE AĞDAN çekiliyor (network-first) — çevrimiçiyken
 *      her zaman en yeni index.html, dolayısıyla en yeni hash'li paket.
 *   3) Ayarlar > Veriler > Çevrimdışı'da "önbelleği temizle ve yenile" var.
 *
 * ⚠ YAYIN ÖNCESİ: aşağıdaki SURUM değerini artırın. Artırılmazsa yeni kabuk ve
 *   varlık önbelleği oluşmaz; hash'li dosya adları değiştiği için uygulama yine
 *   de çalışır ama eski varlıklar önbellekte birikir.
 * ═══════════════════════════════════════════════════════════════════════════ */

 const SURUM = "2026-09-24-2"

 const KABUK = `vukuf-kabuk-${SURUM}`
 const VARLIK = `vukuf-varlik-${SURUM}`
 const VERI = "vukuf-veri"          // SÜRÜMSÜZ — bilerek

 // Veri sayılan uzantılar (bayatken tazele ile yönetilir)
 const VERI_DESENI = /\.(json|webmanifest|ttf|otf|woff2?|png|jpe?g|svg|ico)$/i

 /* ── YÖNLENDİRME TUZAĞI ───────────────────────────────────────────────────
  * Sunucu `/` için yönlendirme yapıyorsa (nginx/Netlify/Vercel çok yapar) gelen
  * yanıtın `redirected` bayrağı true olur. Böyle bir yanıt önbelleğe konup sonra
  * bir GEZİNME isteğine verilirse tarayıcı onu reddeder:
  *   "a redirected response was used for a request whose redirect mode is not follow"
  * Sonuç: soğuk açılışta BEYAZ EKRAN — ama uygulama zaten açıkken her şey
  * çalışmaya devam eder, çünkü gezinme isteği hiç olmaz. Kullanıcının tarif
  * ettiği belirti tam olarak budur. Çözüm: bayrağı taşımayan yeni bir yanıt kur. */
 async function yonlendirmesiz(y) {
   if (!y || !y.redirected) return y
     const govde = await y.blob()
     return new Response(govde, { status: y.status, statusText: y.statusText, headers: y.headers })
 }

 /* Kabuk araması — ÜÇ anahtar ve iki gevşetme birden.
  * `ignoreVary`: sunucu `Vary: Accept-Encoding` gönderiyorsa, sonradan kurulan
  *   sentetik istek başlıkları tutmadığı için eşleşme SESSİZCE başarısız olur.
  * `ignoreSearch`: ana ekrandan açılış bazen `?` ekli bir adresle gelir.
  * Anahtar sırası: "/" → "/index.html" → isteğin kendisi. */
 async function kabukBul(istek) {
   const k = await caches.open(KABUK)
   const secenek = { ignoreVary: true, ignoreSearch: true }
   return (await k.match("/", secenek))
   || (await k.match("/index.html", secenek))
   || (istek ? await k.match(istek, secenek) : null)
   || null
 }

 /* Kabuğu ağdan alıp sakla. Hem kurulumda hem etkinleşmede hem de her başarılı
  * gezinmede çağrılıyor — kurulum anında ağ yoksa bile ilk çevrimiçi açılışta
  * telafi edilsin diye. Tek bir yere bırakmak, o yer başarısız olduğunda
  * uygulamayı kalıcı olarak çevrimdışı-çalışmaz bırakıyordu. */
 async function kabugaAl() {
   try {
     const y0 = await fetch(new Request("/", { cache: "reload" }))
     if (!y0 || !y0.ok) return false
       const y = await yonlendirmesiz(y0)
       const k = await caches.open(KABUK)
       await k.put("/", y.clone())
       await k.put("/index.html", y.clone())
       return true
   } catch { return false }
 }

 /* ── KURULUM ────────────────────────────────────────────────────────────── */
 self.addEventListener("install", (olay) => {
   olay.waitUntil(kabugaAl())
 })

 /* ── ETKİNLEŞME ───────────────────────────────────────────────────────────
  * Eski SÜRÜMLÜ önbellekler siliniyor; `vukuf-veri` korunuyor. */
 self.addEventListener("activate", (olay) => {
   olay.waitUntil((async () => {
     const adlar = await caches.keys()
     await Promise.all(adlar.map(ad => {
       if (!ad.startsWith("vukuf-")) return null
         if (ad === KABUK || ad === VARLIK || ad === VERI) return null
           return caches.delete(ad)
     }))
     await self.clients.claim()
     // Kurulum sırasında ağ yoksa kabuk boş kalmış olabilir; burada telafi et.
     if (!(await kabukBul(null))) await kabugaAl()
   })())
 })

 /* ── STRATEJİLER ─────────────────────────────────────────────────────────── */

 function saklanabilir(y) {
   // `basic` = aynı kaynaklı ve saydam. Opak (cors dışı) yanıtlar saklanmıyor:
   // içerikleri okunamaz, 404 bile "başarılı" görünür ve kotada şişerler.
   return y && y.ok && y.type === "basic"
 }

 // Gezinme: önce ağ, olmazsa önbellek. Çevrimiçiyken daima en yeni kabuk.
 async function agOnce(istek) {
   try {
     const ham = await fetch(istek)
     const y = await yonlendirmesiz(ham)
     if (saklanabilir(y)) {
       const k = await caches.open(KABUK)
       // İki anahtarla birden saklanıyor: hangi adresle açılırsa açılsın bulunsun.
       k.put("/", y.clone())
       k.put("/index.html", y.clone())
     }
     return y
   } catch {
     const bulunan = await kabukBul(istek)
     if (bulunan) return bulunan
       // Kabuk gerçekten yoksa boş ekran yerine AÇIKLAYICI bir sayfa göster —
       // "hiç gelmiyor" ile "önbellek boş" ayırt edilebilsin.
       return new Response(
         `<!doctype html><meta charset="utf-8">
         <meta name="viewport" content="width=device-width, initial-scale=1">
         <body style="margin:0;display:flex;align-items:center;justify-content:center;
         height:100vh;font:15px/1.6 -apple-system,system-ui,sans-serif;
         background:#f4ecd8;color:#2a2118;text-align:center;padding:24px">
         <div><b>Çevrimdışısınız</b><br>
         Uygulama kabuğu henüz saklanmamış.<br>
         Bir kez çevrimiçi açtıktan sonra burası da çalışacak.</div></body>`,
         { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
       )
   }
 }

 // Hash'li varlık: önce önbellek. Dosya adı içeriğe bağlı olduğu için tazelik
 // sorunu yok — adı değişmeyen dosyanın içeriği de değişmemiştir.
 async function oncePreOnbellek(istek, adi) {
   const k = await caches.open(adi)
   const bulunan = await k.match(istek)
   if (bulunan) return bulunan
     const y = await fetch(istek)
     if (saklanabilir(y)) k.put(istek, y.clone())
       return y
 }

 // Veri: bayatken tazele. Önbellekteki ANINDA veriliyor, arkada yenisi çekilip
 // üzerine yazılıyor. Böylece çevrimdışı çalışır, çevrimiçiyken de tazelenir.
 async function bayatIkenTazele(istek, adi) {
   const k = await caches.open(adi)
   const bulunan = await k.match(istek)
   const agdan = fetch(istek)
   .then(y => { if (saklanabilir(y)) k.put(istek, y.clone()); return y })
   .catch(() => null)
   if (bulunan) return bulunan
     const y = await agdan
     return y || Response.error()
 }

 /* ── YÖNLENDİRME ─────────────────────────────────────────────────────────── */
 self.addEventListener("fetch", (olay) => {
   const istek = olay.request
   if (istek.method !== "GET") return
     // Kısmi istekler (ses oynatıcının aradığı Range) elleçlenmiyor: yanlış
     // yönetilen bir Range yanıtı oynatıcıyı sessizce bozar. Ses önbelleği ayrı
     // bir adımda, kendi kurallarıyla gelecek.
     if (istek.headers.has("range")) return

       let url
       try { url = new URL(istek.url) } catch { return }
       // Dış kaynaklar (everyayah, qurancdn) bu adımda hiç dokunulmadan geçiyor.
       if (url.origin !== self.location.origin) return

         if (istek.mode === "navigate") { olay.respondWith(agOnce(istek)); return }
         if (url.pathname.startsWith("/assets/")) { olay.respondWith(oncePreOnbellek(istek, VARLIK)); return }
         if (VERI_DESENI.test(url.pathname)) { olay.respondWith(bayatIkenTazele(istek, VERI)); return }
 })

 /* ── SAYFAYLA HABERLEŞME ─────────────────────────────────────────────────── */
 self.addEventListener("message", (olay) => {
   const veri = olay.data || {}
   if (veri.tip === "SKIP_WAITING") {
     self.skipWaiting()
     return
   }
   if (veri.tip === "KABUK_DURUM") {
     // Panel "kabuk saklandı mı" diye soruyor — soğuk açılış teşhisi için.
     olay.waitUntil((async () => {
       const v = Boolean(await kabukBul(null))
       if (olay.ports && olay.ports[0]) olay.ports[0].postMessage({ kabuk: v })
     })())
     return
   }
   if (veri.tip === "SURUM") {
     // MessageChannel ile geldi: doğrudan cevapla.
     if (olay.ports && olay.ports[0]) olay.ports[0].postMessage({ surum: SURUM })
       return
   }
   // Toplu indirme (sonraki adım) buradan yürütülecek.
   if (veri.tip === "ON_YUKLE" && Array.isArray(veri.adresler)) {
     olay.waitUntil((async () => {
       const k = await caches.open(VERI)
       let tamam = 0, hata = 0
       for (const a of veri.adresler) {
         try {
           const y = await fetch(a, { cache: "no-cache" })
           if (saklanabilir(y)) { await k.put(a, y.clone()); tamam++ } else hata++
         } catch { hata++ }
         // Her dosyada ilerleme bildir — arayüz çubuğu bunu dinleyecek.
         const hepsi = await self.clients.matchAll()
         hepsi.forEach(c => c.postMessage({ tip: "ON_YUKLE_ILERLEME", tamam, hata, toplam: veri.adresler.length }))
       }
     })())
   }
 })
