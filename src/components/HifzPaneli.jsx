/* VUKUF — HIFZ ÇUBUĞU (okuma ekranının üstünde)
   src/components/HifzPaneli.jsx

   Hıfz modu AYRI BİR EKRAN DEĞİL: çalışma mushafın kendi sayfası üzerinde
   yürüyor, çünkü hıfzın büyük kısmı sayfa görüntüsüne dayanıyor — âyetin
   sayfadaki yeri de ezberin parçası. Bu yüzden denetimler sayfayı kapatmayan
   ince bir şerit hâlinde; tam ayar paneli ancak dişliye basınca açılıyor.

   Bileşen SUNUM tarafı: kapsam/kademe/zincir durumunu KuranOkuma tutuyor,
   burada yalnız düğmeler var. */

import { useState } from "react"
import {
  X, Settings2, ChevronLeft, ChevronRight, Play, Pause, Square, Check, Eye, Volume2,
  Minus, Plus, Crosshair, CalendarCheck,
} from "lucide-react"
import {
  KADEMELER, BIRIMLER, kademeBul,
  EZBER_TERCIHLERI, SAYFA_KISIMLARI, YONLER, TEKRAR_YONTEMLERI, DONUS_BASLARI,
  SURE_SIRALARI, sureListesiSirala, manuelOneriler, hifzOku, ayarGuncelle,
} from "../data/hifz"
import { normHarf } from "../data/okumaKayit"

export default function HifzPaneli({
  acik, kapat, theme, isMobile, altBosluk = 96,
  etiket,                 // "Bakara 1-7" gibi
  kademe, onKademe,
  birim, onBirim,         // "kelime" | "ayet"
  // EZBER PLANI (30 Eylül 2026) — kuralları data/hifz.js "EZBER PLANI"nda
  ezber = "sayfa", onEzber,          // "sayfa" | "sure" | "donus"
  kismi = "tam", onKismi,            // sayfanın tamamı / üst / alt yarısı
  yon = "yukari", onYon,             // yeni âyetlerin geliş sırası
  tekrarYontem = "duz", onTekrarYontem,
  bagla = true, onBagla,             // bağlamada komşu âyetle başla
  donusBas = "son", onDonusBas,      // dönüş: cüz sonundan / başından
  donusYer = null, donusSira = 0, donusToplam = 0, onDonusGit,
  kisaSureler = [], seciliSure, onSureSec,
  sureSira = "orijinal", onSureSira,   // kısa sûre listesinin sırası
  onSureEzber,                         // (id, isaretle) — listeden ✓ ekle/kaldır
  sureListesi = [], manuel = { sure: 1, bas: 1, son: 7 }, onManuel,   // manuel aralık
  dokunAc = true, onDokunAc,     // perdeli yere dokununca orası açılsın mı
  dokunSes = false, onDokunSes,  // dokunulan kelime okunsun mu
  zincir, onZincir,
  aktifSira, toplam,      // zincirde kaçıncı âyetteyiz
  onOnceki, onSonraki,
  onOdakla,               // çalışılan âyeti ekrana yeniden hizala
  onPanel,                // /hifz ekranı (tekrar takvimi)
  tekrarSayisi, onTekrarSayisi,
  onCal, onDurdur, calisiyor, sesAcik,
  onEzberledim, ezberliMi,
  onHepsiniAc,
  ipucu = 0,
  bekleyenTekrar = 0,
}) {
  const [ayarAcik, setAyarAcik] = useState(false)
  // Manuel aralık FORMU — "Uygula"ya basılana kadar kapsam değişmesin
  // (her tuş vuruşunda perde ve odak yeniden kurulmasın)
  // MANUEL ARAMA — arama ekranı gibi: yazdıkça öneriler (bkz. hifz.js manuelOneriler)
  const [aramaMetni, setAramaMetni] = useState("")
  // Ezberlenen (✓) sûreleri listede gizle — kullanıcı: "göz yoruyorsa kaldırabilirsin"
  const [ezberGizle, setEzberGizle] = useState(() => !!hifzOku().ayarlar.ezberGizle)
  if (!acik) return null

  const ac = theme.accent
  const kucuk = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
    height: "30px", padding: "0 10px", borderRadius: "999px", flexShrink: 0,
    border: `1px solid ${theme.border}`, background: "transparent",
    color: theme.textSecondary, cursor: "pointer",
    fontSize: "12px", fontWeight: 600, fontFamily: "inherit", touchAction: "manipulation",
  }
  const vurgulu = { ...kucuk, border: `1px solid ${ac}`, background: ac, color: "#fff" }
  const yuvarlak = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0, padding: 0,
    border: "none", background: "transparent", color: theme.textSecondary,
    cursor: "pointer", touchAction: "manipulation",
  }
  // Perde kademesi YALNIZ kelime biriminde anlamlı: âyet biriminde âyet ya tam
  // açık ya tam kapalı olduğu için "yarısı/ilk kelime" diye bir ara durum yok.
  const kademeVar = birim !== "ayet"
  // Başlıklar Türkçe büyük harfle (CSS text-transform "i"yi "I" yapıyordu: "TERCIHI")
  const baslikStil = { fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", color: theme.textSecondary, margin: "0 0 6px" }
  const Baslik = ({ children }) => <p style={baslikStil}>{String(children).toLocaleUpperCase("tr")}</p>
  const satirStil = { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }

  return (
    <>
      <div style={{
        position: "fixed", left: "50%", transform: "translateX(-50%)",
        bottom: altBosluk > 0 ? `${altBosluk + 8}px` : "calc(env(safe-area-inset-bottom) + 8px)",
        width: isMobile ? "calc(100% - 16px)" : "min(620px, 94vw)",
        zIndex: 93,
        background: theme.surface,
        border: `1px solid ${ac}55`,
        borderRadius: "14px",
        boxShadow: "0 6px 26px rgba(0,0,0,0.22)",
        padding: "8px 10px 10px",
        boxSizing: "border-box",
      }}>
        {/* ÜST SATIR — ne çalışıyoruz + sayaçlar + dişli/kapat */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{
            flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontSize: "12.5px", fontWeight: 600, color: ac,
          }}>
            {etiket}
            {zincir && toplam > 0 && (
              <span style={{ color: theme.textSecondary, fontWeight: 500, marginLeft: "6px" }}>
                · {aktifSira}/{toplam}
              </span>
            )}
          </span>
          {ipucu > 0 && (
            <span title="Bu çalışmada aldığınız ipucu" style={{
              display: "flex", alignItems: "center", gap: "3px",
              fontSize: "11px", color: theme.textSecondary, flexShrink: 0,
            }}><Eye size={12} />{ipucu}</span>
          )}
          {/* Tekrar takvimi — /hifz ekranına köprü. Rozet, bugün bekleyen
              âyet sayısı; düğmenin kendisi sayı olmasa da duruyor. */}
          <button onClick={onPanel} title="Hıfz ekranı — tekrar takvimi ve ilerleme"
            style={{ ...yuvarlak, position: "relative", color: bekleyenTekrar > 0 ? ac : theme.textSecondary }}>
            <CalendarCheck size={16} />
            {bekleyenTekrar > 0 && (
              <span style={{
                position: "absolute", top: "-2px", right: "-3px",
                minWidth: "15px", height: "15px", borderRadius: "999px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9.5px", fontWeight: 700, color: "#fff", background: ac,
                padding: "0 3px", boxSizing: "border-box",
              }}>{bekleyenTekrar}</span>
            )}
          </button>
          <button onClick={() => setAyarAcik(v => !v)} title="Hıfz ayarları" style={yuvarlak}>
            <Settings2 size={15} />
          </button>
          <button onClick={kapat} title="Hıfz modundan çık" style={yuvarlak}>
            <X size={15} />
          </button>
        </div>

        {/* DÖNÜŞ SATIRI — dönüş ezberinde dizide gezinme (RTL: sağ ok önceki) */}
        {ezber === "donus" && donusYer && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px",
            padding: "4px 6px", borderRadius: "10px", background: `${ac}10`,
          }}>
            <button onClick={() => onDonusGit?.(donusSira - 1)} disabled={donusSira <= 0}
              title="Dizide önceki sayfa" style={{ ...yuvarlak, opacity: donusSira <= 0 ? 0.35 : 1 }}>
              <ChevronRight size={16} />
            </button>
            <span style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: "12px", color: theme.text }}>
              <b style={{ color: ac }}>{donusYer.donus}. dönüş</b> · {donusYer.cuz}. cüz · s. {donusYer.sayfa}
              <span style={{ color: theme.textSecondary, marginLeft: "6px" }}>({donusSira + 1}/{donusToplam})</span>
            </span>
            <button onClick={() => onDonusGit?.(donusSira + 1)} disabled={donusSira >= donusToplam - 1}
              title="Dizide sonraki sayfa" style={{ ...yuvarlak, opacity: donusSira >= donusToplam - 1 ? 0.35 : 1 }}>
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* ALT SATIR — sarmalı: dar ekranda ikinci satıra iniyor */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
          {/* Perde kademesi */}
          {kademeVar && (
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button onClick={() => onKademe?.(-1)} title="Daha çok göster" style={yuvarlak}><Minus size={14} /></button>
              <span style={{
                minWidth: isMobile ? "76px" : "88px", textAlign: "center",
                fontSize: "12px", fontWeight: 600, color: theme.text,
              }}>{kademeBul(kademe).ad}</span>
              <button onClick={() => onKademe?.(1)} title="Daha çok gizle" style={yuvarlak}><Plus size={14} /></button>
            </div>
          )}

          {/* Zincirde gezinme — RTL: sağ ok "önceki", sol ok "sonraki" */}
          {zincir && (
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button onClick={onOnceki} title="Önceki âyet" style={yuvarlak}><ChevronRight size={16} /></button>
              <button onClick={onSonraki} title="Sonraki âyet" style={yuvarlak}><ChevronLeft size={16} /></button>
            </div>
          )}

          {/* ODAKLA — perde açıkken sayfada gezinildiğinde çalışılan âyet
              ekrandan kaçabiliyor; bu düğme onu geri getiriyor. */}
          <button onClick={onOdakla} title="Çalışılan âyeti ekrana getir" style={yuvarlak}>
            <Crosshair size={15} />
          </button>

          <div style={{ flex: 1 }} />

          {/* SES — tek düğme oynat/duraklat; etkinken yanında DURDUR çıkıyor
              (şeridi boş yere kalabalıklaştırmasın diye yalnız o zaman). */}
          <button onClick={onCal} style={calisiyor ? vurgulu : kucuk}
            title={calisiyor ? "Duraklat" : tekrarYontem === "baglama" ? "Bağlama usulüyle kâri sesinden çalış" : "Kâri sesiyle tekrar et"}>
            {calisiyor ? <Pause size={13} /> : <Play size={13} />} {tekrarSayisi}×{tekrarYontem === "baglama" ? " bağla" : ""}
          </button>
          {sesAcik && (
            <button onClick={onDurdur} style={yuvarlak} title="Sesi durdur">
              <Square size={13} />
            </button>
          )}
          <button onClick={onEzberledim} style={ezberliMi ? vurgulu : kucuk}
            title="Bu aralığı ezberledim olarak işaretle (tekrar takvimine girer)">
            <Check size={14} /> Ezberledim
          </button>
        </div>

        {/* AYARLAR — dişliyle açılır, şeridin içinde büyür. Uzadığı için kendi
            içinde kaydırılıyor (yatay telefonda ekranı kaplamasın). */}
        {ayarAcik && (
          <div style={{
            marginTop: "10px", paddingTop: "9px", borderTop: `1px solid ${theme.border}`,
            maxHeight: "min(52vh, 440px)", overflowY: "auto", overscrollBehavior: "contain",
          }}>
            {/* 1) EZBER TERCİHİ */}
            <Baslik>Ezber tercihi</Baslik>
            <div style={satirStil}>
              {EZBER_TERCIHLERI.map(t => (
                <button key={t.id} onClick={() => onEzber?.(t.id)} style={ezber === t.id ? vurgulu : kucuk}>{t.ad}</button>
              ))}
            </div>
            {(ezber === "sayfa" || ezber === "donus") && (
              <>
                <Baslik>Sayfanın</Baslik>
                <div style={satirStil}>
                  {SAYFA_KISIMLARI.map(k => (
                    <button key={k.id} onClick={() => onKismi?.(k.id)} style={kismi === k.id ? vurgulu : kucuk}>{k.ad}</button>
                  ))}
                </div>
              </>
            )}
            {ezber === "donus" && (
              <>
                <Baslik>Dönüş başlangıcı</Baslik>
                <div style={satirStil}>
                  {DONUS_BASLARI.map(d => (
                    <button key={d.id} onClick={() => onDonusBas?.(d.id)} style={donusBas === d.id ? vurgulu : kucuk}>
                      {d.ad}{d.id === "son" ? " (klasik)" : ""}
                    </button>
                  ))}
                </div>
              </>
            )}
            {ezber === "sure" && kisaSureler.length > 0 && (
              <>
                <Baslik>Kısa sûreler</Baslik>
                <div style={{ ...satirStil, marginBottom: "6px" }}>
                  {SURE_SIRALARI.map(x => (
                    <button key={x.id} onClick={() => onSureSira?.(x.id)}
                      style={{ ...(sureSira === x.id ? vurgulu : kucuk), height: "26px", fontSize: "11px" }}>{x.ad}</button>
                  ))}
                </div>
                {/* Ezberlenmiş (✓) sûreler listenin sonunda, soluk — istenirse gizli.
                    Her sûrede iki dokunma alanı: ADI (sûreye git) · ✓ (ezberledim
                    işaretle / kaldır). */}
                {(() => {
                  const liste = sureListesiSirala(kisaSureler, sureSira)
                  const gorunen = ezberGizle ? liste.filter(k => !k.ezber) : liste
                  const ezberSay = liste.filter(k => k.ezber).length
                  return (
                    <>
                      <div style={{ ...satirStil, maxHeight: "150px", overflowY: "auto", marginBottom: "6px" }}>
                        {gorunen.map(k => {
                          const sec = seciliSure === k.id
                          return (
                            <span key={k.id} style={{
                              display: "inline-flex", alignItems: "stretch", borderRadius: "999px", overflow: "hidden",
                              border: `1px solid ${sec ? ac : theme.border}`,
                              opacity: k.ezber && !sec ? 0.65 : 1,
                            }}>
                              <button onClick={() => onSureSec?.(k.id)} title={`${k.ayetSayisi} âyet — sûreye git`}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: "5px", padding: "0 9px 0 11px",
                                  height: "30px", border: "none", cursor: "pointer", fontFamily: "inherit",
                                  fontSize: "12px", fontWeight: 600,
                                  background: sec ? ac : "transparent", color: sec ? "#fff" : theme.textSecondary,
                                }}>
                                {k.isim}
                                <span style={{ fontWeight: 400, opacity: 0.7, fontSize: "10.5px" }}>{k.ayetSayisi}</span>
                              </button>
                              <button onClick={() => onSureEzber?.(k.id, !k.ezber)}
                                aria-pressed={k.ezber}
                                title={k.ezber ? "Ezber işaretini kaldır" : "Bu sûreyi ezberledim olarak işaretle"}
                                style={{
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  width: "30px", height: "30px", border: "none", cursor: "pointer", padding: 0,
                                  borderLeft: `1px solid ${sec ? "#ffffff55" : theme.border}`,
                                  background: k.ezber ? `${ac}22` : "transparent",
                                  color: k.ezber ? ac : `${theme.textSecondary}88`,
                                }}>
                                <Check size={14} strokeWidth={k.ezber ? 3 : 2} />
                              </button>
                            </span>
                          )
                        })}
                        {!gorunen.length && (
                          <span style={{ fontSize: "12px", color: theme.textSecondary }}>Listedeki bütün sûreler ezberli. ✓</span>
                        )}
                      </div>
                      {ezberSay > 0 && (
                        <button onClick={() => { const y = !ezberGizle; setEzberGizle(y); ayarGuncelle({ ezberGizle: y }) }}
                          style={{ ...kucuk, height: "26px", fontSize: "11px", marginBottom: "10px" }}>
                          <Check size={12} /> {ezberGizle ? `Ezberlenenleri göster (${ezberSay})` : `Ezberlenenleri gizle (${ezberSay})`}
                        </button>
                      )}
                    </>
                  )
                })()}
              </>
            )}
            {ezber === "manuel" && (() => {
              const oneriler = manuelOneriler(aramaMetni, sureListesi, normHarf)
              const suAn = sureListesi.find(x => x.id === manuel.sure)
              return (
                <>
                  <Baslik>Sûre ve âyet aralığı</Baslik>
                  {/* 16 px: iOS daha küçük yazılı alana dokununca sayfayı yakınlaştırıyor */}
                  <input
                    type="search" value={aramaMetni} placeholder="ör. Bakara 5-10 · 36:1-12 · Mülk"
                    aria-label="Sûre ve âyet aralığı ara"
                    onChange={e => setAramaMetni(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && oneriler[0]) {
                        const o = oneriler[0]
                        onManuel?.({ sure: o.id, bas: o.bas, son: o.son }); setAramaMetni("")
                      }
                    }}
                    style={{
                      width: "100%", height: "36px", borderRadius: "10px", boxSizing: "border-box",
                      border: `1px solid ${theme.border}`, background: theme.background, color: theme.text,
                      fontSize: "16px", fontFamily: "inherit", padding: "0 10px", marginBottom: "6px",
                    }}
                  />
                  {oneriler.length > 0 && (
                    <div style={{
                      display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px",
                      maxHeight: "190px", overflowY: "auto",
                    }}>
                      {oneriler.map(o => (
                        <button key={o.id}
                          onClick={() => { onManuel?.({ sure: o.id, bas: o.bas, son: o.son }); setAramaMetni("") }}
                          style={{
                            display: "flex", alignItems: "center", gap: "8px", textAlign: "left",
                            padding: "8px 10px", borderRadius: "9px", cursor: "pointer", fontFamily: "inherit",
                            border: `1px solid ${theme.border}`, background: `${ac}08`, color: theme.text,
                          }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: ac, minWidth: "24px" }}>{o.id}</span>
                          <span style={{ flex: 1, fontSize: "13px" }}>
                            {o.isim} <b style={{ color: ac }}>{o.bas === o.son ? `${o.bas}` : `${o.bas}–${o.son}`}</b>
                          </span>
                          <span style={{ fontSize: "10.5px", color: theme.textSecondary }}>{o.ayetSayisi} âyet</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: "11px", color: theme.textSecondary, margin: "0 0 10px" }}>
                    Şu an çalışılan: <b style={{ color: theme.text }}>{suAn ? suAn.isim : `Sûre ${manuel.sure}`} {manuel.bas}–{manuel.son}</b>
                    {" "}· Aralık yazılmazsa kısa sûrenin tamamı, uzun sûrenin ilk 7 âyeti.
                  </p>
                </>
              )
            })()}

            {/* 2) SIRA */}
            <Baslik>Sıra</Baslik>
            <div style={satirStil}>
              {YONLER.map(y => (
                <button key={y.id} onClick={() => onYon?.(y.id)} style={yon === y.id ? vurgulu : kucuk}>{y.ad}</button>
              ))}
            </div>

            {/* 3) TEKRAR */}
            <Baslik>Tekrar</Baslik>
            <div style={satirStil}>
              {TEKRAR_YONTEMLERI.map(t => (
                <button key={t.id} onClick={() => onTekrarYontem?.(t.id)} style={tekrarYontem === t.id ? vurgulu : kucuk}>{t.ad}</button>
              ))}
              {[1, 3, 5, 7].map(n => (
                <button key={n} onClick={() => onTekrarSayisi?.(n)} style={tekrarSayisi === n ? vurgulu : kucuk}>{n}×</button>
              ))}
              {tekrarYontem === "baglama" && ezber !== "sure" && (
                <button onClick={() => onBagla?.(!bagla)} aria-pressed={bagla} style={bagla ? vurgulu : kucuk}
                  title="Blok, önceden ezberlenmiş komşu âyetle başlasın">
                  Komşu âyetle bağla
                </button>
              )}
            </div>

            {/* 4) PERDE */}
            <Baslik>Neyi gizleyelim</Baslik>
            <div style={satirStil}>
              {BIRIMLER.map(b => (
                <button key={b.id} onClick={() => onBirim?.(b.id)} style={birim === b.id ? vurgulu : kucuk}>{b.ad}</button>
              ))}
            </div>

            {kademeVar && (
              <>
                <Baslik>Perde kademesi</Baslik>
                <div style={satirStil}>
                  {KADEMELER.map(k => (
                    <button key={k.id} onClick={() => onKademe?.(k.id)} style={kademe === k.id ? vurgulu : kucuk}>{k.ad}</button>
                  ))}
                </div>
              </>
            )}

            <Baslik>Perde düzeni</Baslik>
            <div style={satirStil}>
              <button onClick={() => onZincir?.(true)} style={zincir ? vurgulu : kucuk}>Zincir</button>
              <button onClick={() => onZincir?.(false)} style={!zincir ? vurgulu : kucuk}>Tüm aralık</button>
              <button onClick={onHepsiniAc} style={kucuk}>İpuçlarını sıfırla</button>
            </div>

            {/* DOKUNUNCA — iki bağımsız seçim (29 Eylül 2026, kullanıcı: "ayar ile
                kullanıcıya bırakalım, farklı tercih istenebilir"). İkisi de açılıp
                kapanabilir; ikisi kapalıysa dokunmak bir şey yapmaz. */}
            <Baslik>Kelimeye dokununca</Baslik>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
              <button onClick={() => onDokunAc?.(!dokunAc)} aria-pressed={dokunAc} style={dokunAc ? vurgulu : kucuk}
                title="Perdeli kelimeye dokununca perde kalksın">
                <Eye size={13} /> Perdeyi kaldır
              </button>
              <button onClick={() => onDokunSes?.(!dokunSes)} aria-pressed={dokunSes} style={dokunSes ? vurgulu : kucuk}
                title="Dokunulan kelime sesli okunsun (kelime kelime okuyuş)">
                <Volume2 size={13} /> Kelimeyi okut
              </button>
            </div>

            <p style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.6, margin: "6px 0 0" }}>
              <b>Sayfa</b>: bulunulan sayfa (tamamı ya da yarısı). <b>Sûre</b>:
              bulunulan sûre; kısa sûreler listeden seçilir. <b>Manuel</b>: sûre ve
              âyet aralığını kendiniz yazarsınız; komşu âyetle bağlama aralığın
              bir önceki âyetinden başlar. <b>Dönüş</b>: her
              cüzden aynı sıradaki bir sayfa — klasik usulde önce her cüzün son
              sayfası, sonraki dönüşte sondan ikincisi… <b>Aşağıdan yukarı</b>:
              yeni âyetler sayfanın sonundan başlar; birlikte okunan kısımlar yine
              mushaf sırasıyla okunur. <b>Bağlama</b>: yeni âyet tekrarlanır, sonra
              öğrenilenlerle birlikte okunur (1 · 1-2 · 1-2-3…); "komşu âyetle
              bağla" bloğu önceden ezberlenen komşu âyetle başlatır. Çalma, zincirde
              bulunulan âyetten başlar. <b>Zincir</b>: sıradaki âyet açık,
              öğrenilenler perdeli, gelmeyenler kapalı. <b>Perdeyi kaldır</b> /
              <b> Kelimeyi okut</b>: dokunulan kelime açılır / okunur; perdeli bir
              yeri açmak ya da dinlemek ipucu sayılır (kelime başına bir kez).
            </p>
          </div>
        )}
      </div>
    </>
  )
}
