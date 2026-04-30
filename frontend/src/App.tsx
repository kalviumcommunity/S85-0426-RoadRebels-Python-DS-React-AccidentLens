import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import Dashboard from '@/pages/Dashboard'
import AccidentsPage from '@/pages/AccidentsPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import SafetyDashboard from '@/pages/SafetyDashboard'

import RecommendationsPage from '@/pages/RecommendationsPage'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const saved = localStorage.getItem('user')
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light'
    
    if (token && saved) {
      setIsAuthenticated(true)
      setUser(JSON.parse(saved))
    }
    
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('light', savedTheme === 'light')
    } else {
      document.documentElement.classList.remove('light')
    }
    
    setLoading(false)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('light', newTheme === 'light')
  }

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setIsAuthenticated(true)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading AccidentLens...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />
        } />

        {/* Protected routes with Layout */}
        <Route element={
          isAuthenticated ? <Layout user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} /> : <Navigate to="/login" />
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accidents" element={<AccidentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/predictions" element={<SafetyDashboard />} />

          <Route path="/recommendations" element={<RecommendationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  )
}
