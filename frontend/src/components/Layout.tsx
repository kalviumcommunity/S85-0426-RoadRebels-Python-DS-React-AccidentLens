import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { dashboardAPI, newsAPI } from '@/services/api'
import { Bell, Newspaper, Download, Sun, Moon } from 'lucide-react'

interface LayoutProps {
  user: any
  onLogout: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export default function Layout({ user, onLogout, theme, onToggleTheme }: LayoutProps) {
  const [alertCount, setAlertCount] = useState(0)
  const [news, setNews] = useState<any[]>([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    // Fetch alert count
    dashboardAPI.alerts().then(res => {
      setAlertCount(res.data?.data?.length || 0)
    }).catch(() => setAlertCount(0))

    // Fetch traffic news
    newsAPI.traffic().then(res => {
      if (res.data?.data) setNews(res.data.data)
    })
  }, [])

  return (
    <div className={`flex h-screen bg-[hsl(var(--background))] ${theme} overflow-hidden`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Navbar 
          user={user} 
          onLogout={onLogout} 
          alertCount={alertCount}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
        
        {/* News Ticker */}
        {news.length > 0 && (
          <div className="bg-indigo-500/10 border-b border-indigo-500/20 py-2 overflow-hidden whitespace-nowrap relative">
            <div className="flex items-center gap-4 animate-marquee">
              <div className="flex items-center gap-2 px-4 border-r border-indigo-500/30 text-xs font-bold text-indigo-400">
                <Newspaper size={14} /> TRAFFIC NEWS
              </div>
              {news.map((item, i) => (
                <span key={i} className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  • <span className="text-indigo-300">{item.source}:</span> {item.title} <span className="text-slate-500">[{item.time}]</span>
                </span>
              ))}
              {/* Duplicate for infinite loop */}
              {news.map((item, i) => (
                <span key={`dup-${i}`} className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  • <span className="text-indigo-300">{item.source}:</span> {item.title} <span className="text-slate-500">[{item.time}]</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <main className="flex-1 p-4 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
