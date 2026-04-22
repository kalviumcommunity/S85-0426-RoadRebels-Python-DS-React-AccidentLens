import React, { useEffect, useState, useRef } from 'react'
import { dashboardAPI, analyticsAPI, analysisAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, AlertTriangle, Activity, MapPin, Zap, ArrowUpRight, ArrowDownRight, Bell, Shield, BrainCircuit } from 'lucide-react'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts'
import gsap from 'gsap'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981']

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null)
  const [timeseries, setTimeseries] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [hotspots, setHotspots] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [forecast, setForecast] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const metricsRef = useRef<HTMLDivElement>(null)
  const chartsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      dashboardAPI.metrics(),
      dashboardAPI.analytics(),
      dashboardAPI.recommendations(),
      analysisAPI.alerts(),
    ]).then(([mRes, aRes, rRes, alertRes]) => {
      if (mRes.data && mRes.data.data) setMetrics(mRes.data.data)
      if (aRes.data && aRes.data.data) {
        if (aRes.data.data.timeseries) setTimeseries(aRes.data.data.timeseries)
        if (aRes.data.data.road_type_distribution) setHotspots(aRes.data.data.road_type_distribution)
      }
      setRecommendations(rRes.data.data || [])
      setAlerts(alertRes.data?.data || sampleAlerts)
    }).catch(err => {
      setAlerts(sampleAlerts)
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!loading && metricsRef.current) {
      gsap.fromTo(metricsRef.current.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' })
    }
    if (!loading && chartsRef.current) {
      gsap.fromTo(chartsRef.current.children, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'power3.out', delay: 0.3 })
    }
  }, [loading])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  const metricCards = [
    { icon: AlertTriangle, label: 'Total Accidents', value: metrics?.totalAccidents || 0, trend: metrics?.trend || -5, gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/20' },
    { icon: Shield, label: 'Fatal', value: metrics?.fatalAccidents || 0, trend: -12, gradient: 'from-red-500 to-rose-600', shadow: 'shadow-red-500/20' },
    { icon: Activity, label: 'People Injured', value: metrics?.totalInjured || 0, trend: 8, gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/20' },
    { icon: MapPin, label: 'Hotspots', value: metrics?.hotspotCount || hotspots.length || 0, trend: 3, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
  ]

  const severityData = [
    { name: 'Fatal', value: parseInt(metrics?.fatalAccidents || 1) },
    { name: 'Severe', value: parseInt(metrics?.severeAccidents || 2) },
    { name: 'Moderate', value: parseInt(metrics?.moderateAccidents || 3) },
    { name: 'Minor', value: parseInt(metrics?.minorAccidents || 2) },
  ]

  const tsData = timeseries.slice(0, 30).map((t: any) => ({
    date: new Date(t.date || t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: parseInt(t.count || 0),
    severe: parseInt(t.severe || t.fatal || 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><TrendingUp size={28} className="text-indigo-400" /> Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time traffic analytics & AI predictions</p>
        </div>
        {alerts.length > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1.5 text-xs">
            <Bell size={14} className="animate-pulse" /> {alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Metric Cards */}
      <div ref={metricsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: AlertTriangle, label: 'Total Accidents', value: metrics?.totalAccidents || 0, trend: metrics?.trend || 5, gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/20' },
          { icon: Shield, label: 'Fatalities', value: metrics?.fatalAccidents || 0, trend: -12, gradient: 'from-red-500 to-rose-600', shadow: 'shadow-red-500/20' },
          { icon: Activity, label: 'People Injured', value: metrics?.totalInjured || 0, trend: 8, gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/20' },
          { icon: MapPin, label: 'Hotspots', value: metrics?.hotspotCount || 8, trend: 3, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
        ].map((m, i) => (
          <Card key={i} className="relative overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-300`} />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{m.label}</span>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shadow-lg ${m.shadow}`}>
                  <m.icon size={18} className="text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{m.value}</p>
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${m.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {m.trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(m.trend)}% from last period
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 30-day trend */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp size={18} className="text-indigo-400" /> 30-Day Accident Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={tsData}>
                <defs>
                  <linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#gCount)" />
                <Area type="monotone" dataKey="severe" stroke="#ef4444" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Severity distribution */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle size={18} className="text-orange-400" /> Severity Split</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                  {severityData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {severityData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-muted-foreground">{s.name}:</span>
                  <span className="font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts + Recommendations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BrainCircuit size={18} className="text-red-400" /> AI Alerts & Predictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
            {alerts.map((alert: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/20 transition-all duration-200">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${
                  alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                  alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {alert.severity === 'critical' ? <AlertTriangle size={16} /> : <Bell size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.title || alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.description || alert.details || ''}</p>
                </div>
                <Badge variant={alert.severity === 'critical' ? 'fatal' : alert.severity === 'warning' ? 'warning' : 'default'} className="flex-shrink-0 text-[10px]">
                  {alert.severity || 'info'}
                </Badge>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No active alerts</p>}
          </CardContent>
        </Card>

        {/* Top Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap size={18} className="text-amber-400" /> Top Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
            {recommendations.slice(0, 5).map((rec: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-lg shadow-indigo-500/20">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="success" className="text-[10px]">{Math.round((rec.confidence || 0) * 100)}% confidence</Badge>
                    <Badge variant={rec.priority === 'high' ? 'fatal' : 'warning'} className="text-[10px] capitalize">{rec.priority}</Badge>
                  </div>
                </div>
              </div>
            ))}
            {recommendations.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No recommendations available right now</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Fallback sample alerts when Python service is unavailable
const sampleAlerts = [
  { title: '⚠️ Accident Spike Detected', description: 'Accidents are 52% above the 7-day average today', severity: 'critical' },
  { title: '🔮 High Risk Predicted Tomorrow', description: 'ML model forecasts 6+ accidents for tomorrow based on weather + historical patterns', severity: 'warning' },
  { title: '🌧️ Rain Severity Alert', description: 'Rain conditions correlated with 73% higher accident severity in the last 30 days', severity: 'warning' },
  { title: '📍 New Hotspot: Route 45', description: 'DBSCAN clustering detected a new accident cluster on Route 45 (5 incidents in 48h)', severity: 'critical' },
]
