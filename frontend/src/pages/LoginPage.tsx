import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '@/services/api'
import { Mail, Lock, User, Zap, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import gsap from 'gsap'

interface LoginPageProps {
  onLogin: (token: string, user: any) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('officer@roadrebels.com')
  const [password, setPassword] = useState('password123')
  const [name, setName] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const orbsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline()
    if (orbsRef.current) {
      gsap.to(orbsRef.current.children, {
        y: 'random(-30, 30)', x: 'random(-30, 30)',
        duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 1.5,
      })
    }
    if (cardRef.current) {
      tl.fromTo(cardRef.current, { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = isRegister
        ? await authAPI.register(email, password, name)
        : await authAPI.login(email, password)
      onLogin(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[hsl(var(--background))]">
      {/* Animated background orbs */}
      <div ref={orbsRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-indigo-600/20 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-cyan-500/10 blur-[80px]" />
      </div>

      <div ref={cardRef} className="w-full max-w-md mx-4 glass rounded-2xl p-8 shadow-2xl shadow-indigo-500/10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Road Rebels</h1>
          <p className="text-sm text-muted-foreground mt-1">AccidentLens — Intelligent Traffic Analytics</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
            </div>
          )}
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</span>
            ) : (
              <span className="flex items-center gap-2">{isRegister ? 'Create Account' : 'Sign In'} <ArrowRight size={16} /></span>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            className="text-sm text-muted-foreground hover:text-indigo-400 transition-colors"
            onClick={() => { setIsRegister(!isRegister); setError('') }}
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 pt-6 border-t border-white/[0.06]">
          <p className="text-xs text-muted-foreground font-medium mb-2">Demo Accounts:</p>
          <div className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground">
            {[
              { label: 'Officer', email: 'officer@roadrebels.com' },
              { label: 'Analyst', email: 'analyst@roadrebels.com' },
              { label: 'Admin', email: 'admin@roadrebels.com' },
            ].map(d => (
              <button key={d.email} onClick={() => { setEmail(d.email); setPassword('password123') }}
                className="text-left hover:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-white/5">
                {d.label}: {d.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
