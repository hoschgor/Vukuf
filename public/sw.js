/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — SERVİS İŞÇİSİ
   public/sw.js        (site kökünden servis edilmeli: kapsamı tüm origin)

   ── NİÇİN ELDE YAZILDI, vite-plugin-pwa DEĞİL ──────────────────────────────
   Eklenti derleme anında bir "precache manifest" üretir ve oradaki her şeyi ilk
   açılışta indirir. Bizim public/ klasörümüz ~62 MB (kitap metinleri 42 MB) —
   bunu ilk açılışta indirtmek kabul edilemez. Ayrıca yeni bir bağımlılık ve
   derleme sihri girmiş olurdu. Onun yerine ÇALIŞMA ZAMANI ÖNBELLEĞİ: kullanıcı
   neyi açtıysa o çevrimdışı çalışır. Toplu indirme ayrı ve İSTEĞE BAĞLI olacak.

   ── ÖNBELLEK BÖLÜNMESİ — EN ÖNEMLİ KARAR ───────────────────────────────────
   Üç ayrı önbellek var ve ikisi sürümlü, biri DEĞİL:
     vukuf-kabuk-<SURUM>   → index.html (gezinme yanıtı)
     vukuf-varlik-<SURUM>  → /assets/* (Vite'ın hash'li JS/CSS'i)
     vukuf-veri            → SÜRÜMSÜZ: json, font, görsel
   Sebep: her yayında sürüm artınca kabuk ve varlık önbellekleri silinir (eski
   kod kalmasın). Ama VERİ önbelleği silinmemeli — kullanıcının indirdiği 40 MB
   kitap metni her güncellemede yeniden inmemeli. Veri tazeliği "bayatken
   tazele" ile sağlanıyor: önbellekten anında veriliyor, arkada yenisi çekilip
   üzerine yazılıyor.

   ── BAYAT KOD TUZAĞI ───────────────────────────────────────────────────────
   Servis işçisinin bilinen bedeli: yeni sürüm yayınlanır, cihaz eskisini
   çalıştırmaya devam eder, olmayan hatalar aranır. Üç önlem birlikte konuldu:
     1) `skipWaiting` KENDİLİĞİNDEN çağrılmıyor — kullanıcı okurken uygulamayı
        altından çekmek doğru değil. Sayfa "yeni sürüm var" çubuğu gösteriyor,
        dokununca SKIP_WAITING mesajı geliyor.
     2) Gezinme istekleri ÖNCE AĞDAN çekiliyor (network-first) — çevrimiçiyken
        her zaman en yeni index.html, dolayısıyla en yeni hash'li paket.
     3) Ayarlar > Veriler > Çevrimdışı'da "önbelleği temizle ve yenile" var.

   ⚠ YAYIN ÖNCESİ: aşağıdaki SURUM değerini artırın. Artırılmazsa yeni kabuk ve
     varlık önbelleği oluşmaz; hash'li dosya adları değiştiği için uygulama yine
     de çalışır ama eski varlıklar önbellekte birikir.
   ═══════════════════════════════════════════════════════════════════════════ */

const SURUM = "2026-09-24-1"

const KABUK = `vukuf-kabuk-${SURUM}`
const VARLIK = `vukuf-varlik-${SURUM}`
const VERI = "vukuf-veri"          // SÜRÜMSÜZ — bilerek

// Veri sayılan uzantılar (bayatken tazele ile yönetilir)
const VERI_DESENI = /\.(json|webmanifest|ttf|otf|woff2?|png|jpe?g|svg|ico)$/i

/* ── KURULUM ──────────────────────────────────────────────────────────────
   Yalnız kabuk alınıyor. `cache: "reload"` önemli: tarayıcının kendi HTTP
   önbelleğinden eski bir index.html almasın, ağdan taze çeksin. */
self.addEventListener("install", (olay) => {
  olay.waitUntil(
    caches.open(KABUK)
      .then(k => k.add(new Request("/", { cache: "reload" })))
      .catch(() => {})     // çevrimdışı kurulumda sessizce geç
  )
})

/* ── ETKİNLEŞME ───────────────────────────────────────────────────────────
   Eski SÜRÜMLÜ önbellekler siliniyor; `vukuf-veri` korunuyor. */
self.addEventListener("activate", (olay) => {
  olay.waitUntil((async () => {
    const adlar = await caches.keys()
    await Promise.all(adlar.map(ad => {
      if (!ad.startsWith("vukuf-")) return null
      if (ad === KABUK || ad === VARLIK || ad === VERI) return null
      return caches.delete(ad)
    }))
    await self.clients.claim()
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
    const y = await fetch(istek)
    if (saklanabilir(y)) {
      const k = await caches.open(KABUK)
      k.put("/", y.clone())
    }
    return y
  } catch {
    const k = await caches.open(KABUK)
    return (await k.match("/")) || (await k.match(istek)) || Response.error()
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
