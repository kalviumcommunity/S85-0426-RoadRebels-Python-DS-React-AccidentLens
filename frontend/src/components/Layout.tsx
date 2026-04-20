import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { dashboardAPI } from '@/services/api'

interface LayoutProps {
  user: any
  onLogout: () => void
}

export default function Layout({ user, onLogout }: LayoutProps) {
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    // Fetch alert count
    dashboardAPI.alerts().then(res => {
      setAlertCount(res.data?.data?.length || 0)
    }).catch(() => setAlertCount(0))
  }, [])

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      <Sidebar />
      <div className="flex-1 ml-[250px] flex flex-col transition-all duration-300">
        <Navbar user={user} onLogout={onLogout} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
