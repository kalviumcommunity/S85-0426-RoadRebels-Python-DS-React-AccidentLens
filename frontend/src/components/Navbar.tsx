import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, User, Shield, AlertCircle, MapPin, Sun, Moon, FileDown } from 'lucide-react'
import gsap from 'gsap'
import { Badge } from '@/components/ui/badge'
import { recommendationAPI } from '@/services/api'

interface NavbarProps {
  user: any
  onLogout: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export default function Navbar({ user, onLogout, theme, onToggleTheme }: NavbarProps) {
  const navigate = useNavigate()
  const navRef = useRef<HTMLElement>(null)
  
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  
  const unreadCount = alerts.filter(a => a.status === 'pending').length

  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(navRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
    }
    // Fetch Recommendations as alerts
    const fetchAlerts = async () => {
      try {
        const res = await recommendationAPI.list()
        if (res.data && res.data.data) {
          setAlerts(res.data.data.slice(0, 5)) // Top 5
        }
      } catch (err) {
        console.error("Failed to fetch alerts", err)
      }
    }
    fetchAlerts()
    
    const interval = setInterval(fetchAlerts, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <header ref={navRef} className="h-16 glass border-b border-white/[0.06] flex items-center justify-between px-6 z-30">
      <div className="flex items-center gap-4">
         <button 
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all uppercase tracking-wider"
        >
          <FileDown size={14} /> Export Audit PDF
        </button>
      </div>

      <div className="flex items-center gap-4 relative">
        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg hover:bg-white/5 transition-all duration-200 text-muted-foreground hover:text-foreground focus:outline-none"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Alert bell */}
        <button
          onClick={() => setIsAlertOpen(!isAlertOpen)}
          className="relative p-2 rounded-lg hover:bg-white/5 transition-all duration-200 text-muted-foreground hover:text-foreground focus:outline-none"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full gradient-danger text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {isAlertOpen && (
          <div className="absolute top-12 right-16 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground">System Alerts</h3>
              <Badge variant="outline" className="text-[10px]">{unreadCount} Pending</Badge>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">No alerts active</div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className={`p-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer ${alert.status === 'pending' ? 'bg-indigo-500/5' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-full ${alert.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        <AlertCircle size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-snug">{alert.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{alert.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[9px] bg-white/5"><MapPin size={9} className="mr-1"/>{alert.location || 'System'}</Badge>
                          <span className="text-[9px] text-muted-foreground">{new Date(alert.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t border-white/10 bg-black/20">
              <button onClick={() => { setIsAlertOpen(false); navigate('/dashboard') }} className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1.5 transition-colors font-medium">View All Recommendations</button>
            </div>
          </div>
        )}

        {/* User Info */}
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{user?.name || 'User'}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{user?.role || 'officer'}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-indigo-500/20">
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all duration-200"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
