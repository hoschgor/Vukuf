import { createContext, useContext, useState } from "react"
import { themes, defaultTheme } from "./styles/themes"

const AppContext = createContext()
const [isaretler, setIsaretler] = useState(() => {
  const kayitli = localStorage.getItem("vukuf-isaretler")
  return kayitli ? JSON.parse(kayitli) : {}
})

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

export function AppProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme)
  const [lugatActive, setLugatActive] = useState(true)

  const theme = themes[currentTheme]

  return (
    <AppContext.Provider
      value={{
        theme,
        currentTheme,
        setCurrentTheme,
        lugatActive,
        setLugatActive,
        isaretler,
        isaret_ekle,
        isaret_sil,
      }}
    >
      <div
        style={{
          minHeight: "100vh",
          background: theme.background,
          color: theme.text,
          transition: "all 0.3s ease",
        }}
      >
        {children}
      </div>
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}