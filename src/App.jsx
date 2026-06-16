import { Routes, Route, Navigate } from 'react-router-dom'
import HomeView from './views/HomeView.jsx'
import DetailView from './views/DetailView.jsx'

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/knowledge/:knowledgeId" element={<DetailView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
