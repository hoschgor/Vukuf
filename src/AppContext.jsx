import { createContext, useContext, useState } from "react"
import { themes, defaultTheme, defaultCustomTheme } from "./styles/themes"

const AppContext = createContext()

export function AppProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("vukuf-tema") || defaultTheme
  })

  const [customTheme, setCustomTheme] = useState(() => {
    const kayitli = localStorage.getItem("vukuf-ozel-tema")
    return kayitli ? JSON.parse(kayitli) : defaultCustomTheme
  })

  const [lugatActive, setLugatActive] = useState(true)

  const [isaretler, setIsaretler] = useState(() => {
    const kayitli = localStorage.getItem("vukuf-isaretler")
    return kayitli ? JSON.parse(kayitli) : {}
  })

  const theme = currentTheme === "custom" ? customTheme : themes[currentTheme]

  function temaDegistir(yeniTema) {
    setCurrentTheme(yeniTema)
    localStorage.setItem("vukuf-tema", yeniTema)
  }

  function ozelTemaKaydet(yeniTema) {
    const kaydedilen = { ...yeniTema, name: "Özel" }
    setCustomTheme(kaydedilen)
    setCurrentTheme("custom")
    localStorage.setItem("vukuf-ozel-tema", JSON.stringify(kaydedilen))
    localStorage.setItem("vukuf-tema", "custom")
  }

  function isaret_ekle(kitapId, sayfaNo) {
    setIsaretler(prev => {
      const yeni = {
        ...prev,
        [kitapId]: [...(prev[kitapId] || []), sayfaNo].filter((v, i, a) => a.indexOf(v) === i)
      }
      localStorage.setItem("vukuf-isaretler", JSON.stringify(yeni))
      return yeni
    })
  }

  function isaret_sil(kitapId, sayfaNo) {
    setIsaretler(prev => {
      const yeni = {
        ...prev,
        [kitapId]: (prev[kitapId] || []).filter(s => s !== sayfaNo)
      }
      localStorage.setItem("vukuf-isaretler", JSON.stringify(yeni))
      return yeni
    })
  }

  return (
    <AppContext.Provider
      value={{
        theme,
        currentTheme,
        setCurrentTheme: temaDegistir,
        customTheme,
        ozelTemaKaydet,
        lugatActive,
        setLugatActive,
        isaretler,
        isaret_ekle,
        isaret_sil,
      }}
    >
      <div style={{
        minHeight: "100vh",
        background: theme.background,
        color: theme.text,
        transition: "all 0.3s ease",
      }}>
        {children}
      </div>
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}