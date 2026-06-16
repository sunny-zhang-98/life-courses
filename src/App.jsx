import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import HomeView from './views/HomeView.jsx'
import DetailView from './views/DetailView.jsx'

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('life-courses-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  // Respect system preference
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('life-courses-theme', theme) } catch {}
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <div className="app">
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/knowledge/:knowledgeId" element={<DetailView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
