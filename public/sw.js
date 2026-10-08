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

const SURUM = "09-10-2026-1"

const KABUK = `vukuf-kabuk-${SURUM}`
const VARLIK = `vukuf-varlik-${SURUM}`
const VERI = "vukuf-veri"          // SÜRÜMSÜZ — bilerek
const SES = "vukuf-ses"            // SÜRÜMSÜZ ve AYRI — aşağıdaki nota bak

// Veri sayılan uzantılar (bayatken tazele ile yönetilir)
const VERI_DESENI = /\.(json|webmanifest|ttf|otf|woff2?|png|jpe?g|svg|ico)$/i

/* ── YÖNLENDİRME TUZAĞI ───────────────────────────────────────────────────
   Sunucu `/` için yönlendirme yapıyorsa (nginx/Netlify/Vercel çok yapar) gelen
   yanıtın `redirected` bayrağı true olur. Böyle bir yanıt önbelleğe konup sonra
   bir GEZİNME isteğine verilirse tarayıcı onu reddeder:
     "a redirected response was used for a request whose redirect mode is not follow"
   Sonuç: soğuk açılışta BEYAZ EKRAN — ama uygulama zaten açıkken her şey
   çalışmaya devam eder, çünkü gezinme isteği hiç olmaz. Kullanıcının tarif
   ettiği belirti tam olarak budur. Çözüm: bayrağı taşımayan yeni bir yanıt kur. */
async function yonlendirmesiz(y) {
  if (!y || !y.redirected) return y
  const govde = await y.blob()
  return new Response(govde, { status: y.status, statusText: y.statusText, headers: y.headers })
}

/* Kabuk araması — ÜÇ anahtar ve iki gevşetme birden.
   `ignoreVary`: sunucu `Vary: Accept-Encoding` gönderiyorsa, sonradan kurulan
     sentetik istek başlıkları tutmadığı için eşleşme SESSİZCE başarısız olur.
   `ignoreSearch`: ana ekrandan açılış bazen `?` ekli bir adresle gelir.
   Anahtar sırası: "/" → "/index.html" → isteğin kendisi. */
async function kabukBul(istek) {
  const k = await caches.open(KABUK)
  const secenek = { ignoreVary: true, ignoreSearch: true }
  return (await k.match("/", secenek))
      || (await k.match("/index.html", secenek))
      || (istek ? await k.match(istek, secenek) : null)
      || null
}

/* Kabuğu ağdan alıp sakla. Hem kurulumda hem etkinleşmede hem de her başarılı
   gezinmede çağrılıyor — kurulum anında ağ yoksa bile ilk çevrimiçi açılışta
   telafi edilsin diye. Tek bir yere bırakmak, o yer başarısız olduğunda
   uygulamayı kalıcı olarak çevrimdışı-çalışmaz bırakıyordu. */
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

/* ── UYGULAMA PARÇALARINI ÖNDEN AL (29 Eylül 2026) ────────────────────────
   Sayfalar artık ayrı parçalar (App.jsx → lazy): açılış yalnız Kitaplık'ı
   indiriyor. Ama /assets yalnız İSTENDİĞİNDE önbelleğe alınıyordu — hiç
   açılmamış bir sayfanın (ör. Kur'ân) parçası önbellekte olmaz, çevrimdışı
   açılamazdı. Derleme `varlik-listesi.json` üretiyor (vite.config.js);
   kurulumda listedeki HER dosya bu sürümün varlık önbelleğine alınıyor.
   Böylece bir kez çevrimiçi açılan sürüm tamamen çevrimdışı çalışır.
   İndirilen miktar eskisiyle aynı (eskiden tek paket hepsini içeriyordu);
   fark, telefonun artık hepsini açılışta AYRIŞTIRMAMASI.
   Hata kurulumu DÜŞÜRMEZ: liste yoksa (geliştirme, eski derleme) eski
   davranış — istendikçe önbelleğe alma — sürer. */
const LISTE = "/varlik-listesi.json"
async function varliklariAl() {
  try {
    const y = await fetch(new Request(LISTE, { cache: "no-store" }))
    if (!y || !y.ok) return
    const tur = (y.headers.get("content-type") || "").toLowerCase()
    if (tur.includes("text/html")) return              // SPA yönlendirmesi: liste yok
    const { dosyalar } = await y.json()
    if (!Array.isArray(dosyalar)) return
    const k = await caches.open(VARLIK)
    // Aynı anda en çok 6 istek — telefonda ağı boğmasın
    const kuyruk = dosyalar.filter(d => typeof d === "string" && d.startsWith("/assets/"))
    const isci = async () => {
      while (kuyruk.length) {
        const d = kuyruk.shift()
        try {
          if (await k.match(d)) continue
          const v = await fetch(new Request(d, { cache: "reload" }))
          const vt = (v.headers.get("content-type") || "").toLowerCase()
          if (saklanabilir(v) && !vt.includes("text/html")) await k.put(d, v)
        } catch { /* tek dosya düşerse ötekiler sürsün */ }
      }
    }
    await Promise.all(Array.from({ length: 6 }, isci))
  } catch { /* liste okunamadı — istendikçe önbelleğe alma sürer */ }
}

/* ── KURULUM ────────────────────────────────────────────────────────────── */
self.addEventListener("install", (olay) => {
  olay.waitUntil(Promise.all([kabugaAl(), varliklariAl()]))
})

/* ── ETKİNLEŞME ───────────────────────────────────────────────────────────
   Eski SÜRÜMLÜ önbellekler siliniyor; `vukuf-veri` korunuyor. */
self.addEventListener("activate", (olay) => {
  olay.waitUntil((async () => {
    const adlar = await caches.keys()
    await Promise.all(adlar.map(ad => {
      if (!ad.startsWith("vukuf-")) return null
      if (ad === KABUK || ad === VARLIK || ad === VERI || ad === SES) return null
      return caches.delete(ad)
    }))
    await self.clients.claim()
    // Kurulum sırasında ağ yoksa kabuk boş kalmış olabilir; burada telafi et.
    if (!(await kabukBul(null))) await kabugaAl()
    // Parçalar için de aynı telafi (önbellekte olanlar atlanıyor, ucuz)
    await varliklariAl()
  })())
})

/* ── STRATEJİLER ─────────────────────────────────────────────────────────── */

/* ── KÂRİ SESLERİ ─────────────────────────────────────────────────────────
   Sesler DIŞ KAYNAKTAN (everyayah.com) geliyor ve iki ayrı kuralı çiğniyor:

   1) `type === "basic"` ŞARTI TUTMUYOR. CORS'lu bir dış yanıtın türü "cors"tur.
      Aşağıdaki `saklanabilir()` yalnız "basic" kabul ettiği için, toplu indirme
      SESSİZCE HİÇBİR ŞEY SAKLAMAZDI — ilerleme çubuğu dolar, önbellek boş kalırdı.
      Bu yüzden sesler için ayrı bir ölçüt var. "opaque" YİNE kabul edilmiyor:
      içeriği okunamaz, 404 bile başarılı görünür ve kotada şişer.

   2) OYNATICI KISMİ İSTEK (Range) GÖNDERİYOR. `<audio>` bir mp3'ü çoğu zaman
      `Range: bytes=0-` ile ister ve buna 200 yerine 206 + `Content-Range` bekler.
      Önbellekteki tam yanıtı olduğu gibi vermek Safari'de sessizce başarısız
      olur. Bu yüzden istek Range taşıyorsa yanıt burada DİLİMLENİP 206 olarak
      kuruluyor.

   Önbellek AYRI (`vukuf-ses`): yüzlerce MB olabiliyor, kullanıcı metinleri
   silmeden sesleri silebilsin ve kota hesabı karışmasın diye. */
const SES_KOKU = "https://everyayah.com/"

function sesMi(url) {
  return String(url).startsWith(SES_KOKU)
}

function saklanabilirSes(y) {
  return y && y.ok && (y.type === "basic" || y.type === "cors")
}

async function menzilYaniti(yanit, menzilBasligi) {
  const tampon = await yanit.arrayBuffer()
  const toplam = tampon.byteLength
  const m = /bytes=(\d*)-(\d*)/.exec(menzilBasligi || "")
  let bas = m && m[1] ? parseInt(m[1], 10) : 0
  let son = m && m[2] ? parseInt(m[2], 10) : toplam - 1
  if (!Number.isFinite(bas) || bas < 0) bas = 0
  if (!Number.isFinite(son) || son >= toplam) son = toplam - 1
  if (bas > son) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${toplam}` } })
  }
  const parca = tampon.slice(bas, son + 1)
  return new Response(parca, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": yanit.headers.get("content-type") || "audio/mpeg",
      "Content-Length": String(parca.byteLength),
      "Content-Range": `bytes ${bas}-${son}/${toplam}`,
      "Accept-Ranges": "bytes",
    },
  })
}

async function sesVer(istek) {
  const k = await caches.open(SES)
  // Anahtar Range'SİZ: aynı dosya farklı aralıklarla istendiğinde hep aynı
  // kayda düşsün diye tam adresle aranıyor.
  const bulunan = await k.match(istek.url, { ignoreVary: true })
  const menzil = istek.headers.get("range")
  if (bulunan) return menzil ? menzilYaniti(bulunan, menzil) : bulunan.clone()
  try { return await fetch(istek) } catch { return Response.error() }
}

function saklanabilir(y) {
  // `basic` = aynı kaynaklı ve saydam. Opak (cors dışı) yanıtlar saklanmıyor:
  // içerikleri okunamaz, 404 bile "başarılı" görünür ve kotada şişerler.
  return y && y.ok && y.type === "basic"
}

/* SUNUCUDA YOK MU — iki biçimde gelebiliyor:
     1) Dürüst 404/410.
     2) SPA yönlendirmesi: bazı barındırıcılar (Vercel/Netlify/nginx
        `try_files … /index.html`) olmayan HER adrese 200 ile index.html
        döndürüyor. Bir .json/.ttf adresine HTML gelmesi bu demek; saklanırsa
        dosya "indirildi" sayılıyor ama açıldığında JSON diye HTML okunuyor.
   Her iki durumda da dosya SAKLANMIYOR ve sayfaya "yok" olarak bildiriliyor. */
function sunucudaYok(adres, y) {
  if (!y) return false
  if (y.status === 404 || y.status === 410) return true
  if (!y.ok) return false
  let yol = ""
  try { yol = new URL(adres, self.location.origin).pathname } catch { return false }
  const tur = (y.headers.get("content-type") || "").toLowerCase()
  return VERI_DESENI.test(yol) && tur.includes("text/html")
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
  // `ignoreVary`: toplu indirmede kayıtlar DİZGE adresle konuyor; sonradan
  // gelen gerçek isteğin başlıkları farklı olduğu için Vary eşleşmesi sessizce
  // başarısız olabilirdi — dosya önbellekte olduğu hâlde "yok" sayılırdı.
  const bulunan = await k.match(istek, { ignoreVary: true })
  const agdan = fetch(istek)
    .then(y => {
      // SPA yönlendirmesinin döndürdüğü index.html veri adresi altına saklanmasın.
      if (saklanabilir(y) && !sunucudaYok(istek.url, y)) k.put(istek, y.clone())
      return y
    })
    .catch(() => null)
  if (bulunan) return bulunan
  const y = await agdan
  return y || Response.error()
}

/* ── YÖNLENDİRME ─────────────────────────────────────────────────────────── */
self.addEventListener("fetch", (olay) => {
  const istek = olay.request
  if (istek.method !== "GET") return

  // SES ÖNCE: Range başlığı ve dış kaynak atlamalarından ÖNCE bakılıyor,
  // çünkü ses istekleri her ikisini de taşıyor.
  if (sesMi(istek.url)) { olay.respondWith(sesVer(istek)); return }

  // Aynı kaynaklı kısmi istekler elleçlenmiyor.
  if (istek.headers.has("range")) return

  let url
  try { url = new URL(istek.url) } catch { return }
  // Diğer dış kaynaklar (ör. qurancdn kelime sesi) dokunulmadan geçiyor.
  if (url.origin !== self.location.origin) return

  if (istek.mode === "navigate") { olay.respondWith(agOnce(istek)); return }
  // Parça listesi her zaman ağdan (veri önbelleğine girip bayatlamasın)
  if (url.pathname === LISTE) return
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
      const kVeri = await caches.open(VERI)
      const kSes = await caches.open(SES)
      let tamam = 0, hata = 0
      // Sunucuda OLMAYAN adresler ayrı bildiriliyor: sayfa bunları sayaçtan
      // düşüyor. Yoksa hiç inemeyecek bir dosya sayacı sonsuza dek eksik tutar
      // (içindekiler dosyası her kitapta yok).
      const yok = []
      for (const a of veri.adresler) {
        try {
          const ses = sesMi(a)
          // Dış kaynaktan CORS'lu indirme: `mode: "cors"` açıkça isteniyor ki
          // yanıt "opaque" değil "cors" olsun ve içeriği doğrulanabilsin.
          const y = await fetch(a, ses ? { mode: "cors", cache: "no-cache" } : { cache: "no-cache" })
          if (!ses && sunucudaYok(a, y)) {
            yok.push(a); hata++
            // Eski sürüm işçi SPA'nın index.html'ini bu adresle saklamış olabilir;
            // o bayat kayıt da temizleniyor ki sayaç onu "hazır" saymasın.
            await kVeri.delete(a, { ignoreVary: true })
          }
          else {
            const uygun = ses ? saklanabilirSes(y) : saklanabilir(y)
            if (uygun) { await (ses ? kSes : kVeri).put(a, y.clone()); tamam++ } else hata++
          }
        } catch { hata++ }
        // Her dosyada ilerleme bildir — arayüz çubuğu bunu dinleyecek.
        const hepsi = await self.clients.matchAll()
        hepsi.forEach(c => c.postMessage({ tip: "ON_YUKLE_ILERLEME", tamam, hata, yok, toplam: veri.adresler.length }))
      }
    })())
  }
})
