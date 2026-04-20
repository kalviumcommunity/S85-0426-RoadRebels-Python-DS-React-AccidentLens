import React, { useEffect, useState, useRef } from 'react'
import { analyticsAPI, analysisAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, GitCompare, MapPin, Clock, FlaskConical, Target, TrendingUp, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, AreaChart, Area } from 'recharts'
import gsap from 'gsap'

const TAB_KEYS = ['eda', 'correlations', 'trends', 'hotspots'] as const
const TAB_LABELS = { eda: 'EDA Analysis', correlations: 'Correlations', trends: 'Trends', hotspots: 'Hotspots' }
const TAB_ICONS = { eda: FlaskConical, correlations: GitCompare, trends: TrendingUp, hotspots: MapPin }

export default function AnalyticsPage() {
  const [tab, setTab] = useState<typeof TAB_KEYS[number]>('eda')
  const [loading, setLoading] = useState(true)
  const [hotspots, setHotspots] = useState<any[]>([])
  const [correlations, setCorrelations] = useState<any>(null)
  const [timeseries, setTimeseries] = useState<any[]>([])
  const [edaSummary, setEdaSummary] = useState<any>(null)
  const [edaDist, setEdaDist] = useState<any>(null)
  const [edaCorr, setEdaCorr] = useState<any>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      analyticsAPI.hotspots(),
      analyticsAPI.correlations('severity', 'weather'),
      analyticsAPI.timeseries(30),
      analysisAPI.edaSummary(),
      analysisAPI.edaDistributions(),
      analysisAPI.edaCorrelations(),
    ]).then(([hRes, cRes, tRes, esRes, edRes, ecRes]) => {
      setHotspots(hRes.data.data || [])
      setCorrelations(cRes.data.data)
      setTimeseries(tRes.data.data || [])
      setEdaSummary(esRes.data?.data)
      setEdaDist(edRes.data?.data)
      setEdaCorr(ecRes.data?.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(contentRef.current.children, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' })
    }
  }, [tab, loading])

  // Prepare EDA data with fallbacks
  const severityDist = edaDist?.severity || [
    { name: 'fatal', count: 1 }, { name: 'severe', count: 2 }, { name: 'moderate', count: 3 }, { name: 'minor', count: 2 },
  ]
  const weatherDist = edaDist?.weather || [
    { name: 'clear', count: 3 }, { name: 'rain', count: 3 }, { name: 'fog', count: 1 }, { name: 'snow', count: 1 },
  ]
  const roadDist = edaDist?.road_type || [
    { name: 'highway', count: 3 }, { name: 'urban', count: 4 }, { name: 'rural', count: 1 },
  ]
  const hourDist = edaDist?.hour_of_day || Array.from({ length: 24 }, (_, i) => ({
    hour: i, count: Math.floor(Math.random() * 5 + 1)
  }))

  const corrMatrix = edaCorr?.matrix || [
    { var1: 'weather', var2: 'severity', value: 0.73 },
    { var1: 'road_condition', var2: 'severity', value: 0.65 },
    { var1: 'visibility', var2: 'severity', value: 0.58 },
    { var1: 'speed_limit', var2: 'severity', value: 0.47 },
    { var1: 'hour', var2: 'accident_count', value: 0.62 },
    { var1: 'weather', var2: 'road_condition', value: 0.71 },
  ]

  const tsData = timeseries.map((t: any) => ({
    date: new Date(t.date || t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: parseInt(t.count || 0),
    avg_injured: parseFloat(t.avg_injured || 0),
  }))

  const COLORS_SEV = ['#ef4444', '#f97316', '#eab308', '#10b981']
  const COLORS_WEATHER = ['#6366f1', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

  const summary = edaSummary || {
    total_accidents: 8, avg_injured: 1.25, avg_vehicles: 2.5, avg_speed_limit: 47.5,
    most_common_severity: 'moderate', most_common_weather: 'rain',
  }

  if (loading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 size={28} className="text-purple-400" /> Analytics & EDA</h1>
        <p className="text-sm text-muted-foreground mt-1">Exploratory data analysis, correlations, and geographic insights</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit">
        {TAB_KEYS.map(k => {
          const Icon = TAB_ICONS[k]
          return (
            <button key={k} onClick={() => setTab(k)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === k ? 'gradient-primary text-white shadow-lg shadow-indigo-500/20' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}>
              <Icon size={15} /> {TAB_LABELS[k]}
            </button>
          )
        })}
      </div>

      <div ref={contentRef}>
        {/* ── EDA TAB ── */}
        {tab === 'eda' && (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Accidents', value: summary.total_accidents },
                { label: 'Avg Injured', value: summary.avg_injured?.toFixed?.(1) || summary.avg_injured },
                { label: 'Avg Vehicles', value: summary.avg_vehicles?.toFixed?.(1) || summary.avg_vehicles },
                { label: 'Avg Speed Limit', value: `${summary.avg_speed_limit?.toFixed?.(0) || summary.avg_speed_limit} mph` },
                { label: 'Top Severity', value: summary.most_common_severity },
                { label: 'Top Weather', value: summary.most_common_weather },
              ].map((s, i) => (
                <Card key={i} className="text-center"><CardContent className="py-3">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-lg font-bold text-foreground capitalize">{s.value}</p>
                </CardContent></Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Severity Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Severity Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={severityDist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
                      <Bar dataKey="count" radius={[6,6,0,0]}>
                        {severityDist.map((_: any, i: number) => <Cell key={i} fill={COLORS_SEV[i % COLORS_SEV.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Weather Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Weather Conditions</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={weatherDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="count" stroke="none">
                        {weatherDist.map((_: any, i: number) => <Cell key={i} fill={COLORS_WEATHER[i % COLORS_WEATHER.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {weatherDist.map((w: any, i: number) => (
                      <span key={w.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ background: COLORS_WEATHER[i % COLORS_WEATHER.length] }} /> {w.name}: {w.count}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Road Type */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Road Type Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={roadDist} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} width={70} />
                      <Tooltip contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0,6,6,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Hour of Day */}
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><Clock size={14} className="text-amber-400" /> Accidents by Hour</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={hourDist}>
                      <defs>
                        <linearGradient id="gHour" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
                      <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fill="url(#gHour)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── CORRELATIONS TAB ── */}
        {tab === 'correlations' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><GitCompare size={14} className="text-cyan-400" /> Correlation Matrix</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {corrMatrix.map((c: any, i: number) => {
                    const pct = Math.abs(c.value) * 100
                    const color = c.value > 0.6 ? 'bg-red-500' : c.value > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="w-32 text-xs text-muted-foreground font-medium capitalize">{c.var1.replace('_', ' ')}</div>
                        <span className="text-xs text-muted-foreground">↔</span>
                        <div className="w-32 text-xs text-muted-foreground font-medium capitalize">{c.var2.replace('_', ' ')}</div>
                        <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-sm font-bold min-w-[48px] text-right ${c.value > 0.6 ? 'text-red-400' : c.value > 0.4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {c.value.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Strong (&gt;0.6)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Moderate (0.4–0.6)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Weak (&lt;0.4)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TRENDS TAB ── */}
        {tab === 'trends' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">30-Day Accident Trends</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={tsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} />
                    <Line type="monotone" dataKey="avg_injured" stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── HOTSPOTS TAB ── */}
        {tab === 'hotspots' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><MapPin size={14} className="text-emerald-400" /> Geographic Hotspots</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {hotspots.slice(0, 10).map((spot: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Location #{i + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            Lat: {parseFloat(spot.lat).toFixed(4)}, Lng: {parseFloat(spot.lng).toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="default">{spot.count} incidents</Badge>
                        <Badge variant={parseFloat(spot.avg_severity) > 2.5 ? 'fatal' : 'warning'}>
                          Severity: {parseFloat(spot.avg_severity).toFixed(1)}/4
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {hotspots.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No hotspot data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
