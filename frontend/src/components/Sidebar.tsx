import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, AlertTriangle, BarChart3, Brain, Lightbulb, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accidents', icon: AlertTriangle, label: 'Accidents' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics & EDA' },
  { to: '/predictions', icon: Brain, label: 'Safety Insights' },

  { to: '/recommendations', icon: Lightbulb, label: 'Recommendations' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const itemsRef = useRef<(HTMLAnchorElement | null)[]>([])

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(sidebarRef.current, { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
    }
    itemsRef.current.forEach((el, i) => {
      if (el) {
        gsap.fromTo(el, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, delay: 0.15 + i * 0.08, ease: 'power3.out' })
      }
    })
  }, [])

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        "fixed left-0 top-0 h-screen glass border-r border-white/[0.06] z-40 flex flex-col transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[250px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-foreground tracking-tight">Road Rebels</h1>
            <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">AccidentLens</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            ref={(el) => { itemsRef.current[i] = el }}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
              isActive
                ? "gradient-primary text-white shadow-lg shadow-indigo-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <item.icon size={20} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="m-3 flex items-center justify-center h-9 rounded-lg border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
