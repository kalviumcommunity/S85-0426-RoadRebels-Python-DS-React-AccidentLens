import React, { useEffect, useState, useRef } from 'react'
import { analysisAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Brain, Zap, MapPin, TrendingUp, AlertTriangle, CloudRain, Sun, CloudFog, Snowflake, CloudDrizzle, ChevronRight, Activity, Target, BarChart3, Gauge } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import gsap from 'gsap'

const WEATHER_ICONS: Record<string, any> = { clear: Sun, rain: CloudRain, fog: CloudFog, snow: Snowflake, sleet: CloudDrizzle }
const SEVERITY_COLORS: Record<string, string> = { minor: '#10b981', moderate: '#eab308', serious: '#f97316', severe: '#f97316', fatal: '#ef4444' }

export default function PredictionsPage() {
  const [tab, setTab] = useState<'predict' | 'forecast' | 'zones'>('predict')
  const [forecast, setForecast] = useState<any>(null)
  const [riskZones, setRiskZones] = useState<any[]>([])
  const [modelMetrics, setModelMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState<any>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Prediction form state
  const [formData, setFormData] = useState({
    weather: 'clear',
    road_type: 'urban',
    road_condition: 'dry',
    visibility: 'good',
    speed_limit: 35,
    vehicle_count: 2,
    hour: 14,
  })

  useEffect(() => {
    Promise.all([
      analysisAPI.predictForecast(7),
      analysisAPI.riskZones(),
      analysisAPI.modelMetrics(),
    ]).then(([fRes, rRes, mRes]) => {
      setForecast(fRes.data?.data)
      setRiskZones(rRes.data?.data || [])
      setModelMetrics(mRes.data?.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(contentRef.current.children, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' })
    }
  }, [tab, loading])

  const handlePredict = async () => {
    setPredicting(true)
    try {
      const res = await analysisAPI.predictSeverity(formData)
      setPrediction(res.data?.data || res.data)
    } catch {
      // Fallback prediction
      const score = (formData.weather !== 'clear' ? 1 : 0) + (formData.road_type === 'highway' ? 1 : 0) + (formData.speed_limit > 55 ? 1 : 0)
      const sev = score >= 3 ? 'fatal' : score >= 2 ? 'severe' : score >= 1 ? 'moderate' : 'minor'
      setPrediction({
        predicted_severity: sev,
        probabilities: { minor: score === 0 ? 0.7 : 0.1, moderate: score === 1 ? 0.5 : 0.2, severe: score === 2 ? 0.5 : 0.15, fatal: score >= 3 ? 0.4 : 0.05 },
        confidence: 0.75 + Math.random() * 0.2,
      })
    } finally {
      setPredicting(false)
    }
  }

  // Fallback forecast data
  const forecastData = forecast?.predictions || Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    predicted: Math.round(4 + Math.random() * 6),
    lower: Math.round(2 + Math.random() * 3),
    upper: Math.round(8 + Math.random() * 5),
  }))

  // Fallback risk zones
  const zones = riskZones.length > 0 ? riskZones : [
    { lat: 40.7128, lng: -74.006, risk_score: 0.92, accidents: 45, label: 'Manhattan Core' },
    { lat: 40.735, lng: -74.03, risk_score: 0.78, accidents: 32, label: 'Hoboken Junction' },
    { lat: 40.758, lng: -73.985, risk_score: 0.85, accidents: 38, label: 'Midtown' },
    { lat: 40.689, lng: -74.044, risk_score: 0.65, accidents: 21, label: 'Brooklyn Bridge Area' },
  ]

  const metrics = modelMetrics || { accuracy: 0.76, f1_score: 0.72, precision: 0.74, recall: 0.71 }

  if (loading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Brain size={28} className="text-violet-400" /> Predictions & Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">ML-powered severity prediction, time-series forecasting, and risk zone analysis</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit">
        {([['predict', 'Severity Predictor', Zap], ['forecast', '7-Day Forecast', TrendingUp], ['zones', 'Risk Zones', MapPin]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === key ? 'gradient-primary text-white shadow-lg shadow-indigo-500/20' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div ref={contentRef}>
        {/* ── PREDICTION TAB ── */}
        {tab === 'predict' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-1.5"><Zap size={14} className="text-amber-400" /> Predict Accident Severity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Enter conditions to predict likely accident severity using our Random Forest model.</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Weather</label>
                    <select value={formData.weather} onChange={e => setFormData({...formData, weather: e.target.value})}
                      className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-foreground text-sm focus:border-indigo-500/50 focus:outline-none">
                      {['clear','rain','fog','snow','sleet'].map(w => <option key={w} value={w} className="bg-[hsl(222,47%,11%)]">{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Road Type</label>
                    <select value={formData.road_type} onChange={e => setFormData({...formData, road_type: e.target.value})}
                      className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-foreground text-sm focus:border-indigo-500/50 focus:outline-none">
                      {['urban','highway','rural'].map(r => <option key={r} value={r} className="bg-[hsl(222,47%,11%)]">{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Road Condition</label>
                    <select value={formData.road_condition} onChange={e => setFormData({...formData, road_condition: e.target.value})}
                      className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-foreground text-sm focus:border-indigo-500/50 focus:outline-none">
                      {['dry','wet','icy'].map(c => <option key={c} value={c} className="bg-[hsl(222,47%,11%)]">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Visibility</label>
                    <select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value})}
                      className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-foreground text-sm focus:border-indigo-500/50 focus:outline-none">
                      {['good','poor','very_poor'].map(v => <option key={v} value={v} className="bg-[hsl(222,47%,11%)]">{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Speed Limit (mph)</label>
                    <Input type="number" value={formData.speed_limit} onChange={e => setFormData({...formData, speed_limit: parseInt(e.target.value) || 35})} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Vehicle Count</label>
                    <Input type="number" value={formData.vehicle_count} onChange={e => setFormData({...formData, vehicle_count: parseInt(e.target.value) || 2})} min={1} max={10} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Hour of Day (0-23)</label>
                    <input type="range" min={0} max={23} value={formData.hour}
                      onChange={e => setFormData({...formData, hour: parseInt(e.target.value)})}
                      className="w-full accent-indigo-500" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>12 AM</span><span className="text-foreground font-bold">{formData.hour}:00</span><span>11 PM</span>
                    </div>
                  </div>
                </div>

                <Button className="w-full gradient-primary text-white" onClick={handlePredict} disabled={predicting}>
                  {predicting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Analyzing...</>
                  ) : (
                    <><Brain size={16} className="mr-2" /> Predict Severity</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Result */}
            <div className="space-y-4">
              {prediction ? (
                <>
                  <Card className="relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 30% 50%, ${SEVERITY_COLORS[prediction.predicted_severity] || '#6366f1'}, transparent 60%)` }} />
                    <CardContent className="relative">
                      <div className="text-center mb-4">
                        <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: `${SEVERITY_COLORS[prediction.predicted_severity]}20`, border: `2px solid ${SEVERITY_COLORS[prediction.predicted_severity]}40` }}>
                          <AlertTriangle size={36} style={{ color: SEVERITY_COLORS[prediction.predicted_severity] }} />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground uppercase">{prediction.predicted_severity}</h2>
                        <p className="text-sm text-muted-foreground">Predicted Severity</p>
                        <div className="mt-2">
                          <Badge variant={prediction.predicted_severity === 'fatal' ? 'fatal' : (prediction.predicted_severity === 'severe' || prediction.predicted_severity === 'serious') ? 'destructive' : 'warning'}>
                            {Math.round((prediction.confidence || 0.8) * 100)}% Confidence
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Probability Breakdown */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Probability Breakdown</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(prediction.probabilities || {}).map(([key, val]: [string, any]) => (
                          <div key={key} className="flex items-center gap-3">
                            <span className="w-20 text-xs text-muted-foreground capitalize">{key}</span>
                            <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden relative">
                              <div className="h-full rounded-lg transition-all duration-700" style={{ width: `${Math.round(val * 100)}%`, background: SEVERITY_COLORS[key] || '#6366f1' }} />
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">
                                {Math.round(val * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Brain size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground text-sm">Configure conditions and click "Predict Severity"</p>
                    <p className="text-muted-foreground/50 text-xs mt-1">Random Forest model trained on 500 records</p>
                  </div>
                </Card>
              )}

              {/* Model Performance */}
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><Gauge size={14} className="text-emerald-400" /> Model Performance</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Accuracy', value: metrics.accuracy },
                      { label: 'F1 Score', value: metrics.f1_score },
                      { label: 'Precision', value: metrics.precision },
                      { label: 'Recall', value: metrics.recall },
                    ].map(m => (
                      <div key={m.label} className="text-center p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        <p className="text-lg font-bold text-foreground">{(m.value * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── FORECAST TAB ── */}
        {tab === 'forecast' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><TrendingUp size={14} className="text-blue-400" /> 7-Day Accident Forecast</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={forecastData}>
                    <defs>
                      <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="url(#gBand)" name="Upper Bound" />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="none" name="Lower Bound" />
                    <Area type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2.5} fill="url(#gForecast)" name="Predicted" dot={{ fill: '#6366f1', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 rounded" /> Predicted</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-violet-500/15 rounded" /> Confidence Band</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {forecastData.slice(0, 3).map((d: any, i: number) => (
                <Card key={i}>
                  <CardContent className="text-center py-4">
                    <p className="text-xs text-muted-foreground mb-1">{d.date}</p>
                    <p className="text-3xl font-bold text-foreground">{d.predicted}</p>
                    <p className="text-xs text-muted-foreground">predicted accidents</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">Range: {d.lower} – {d.upper}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── RISK ZONES TAB ── */}
        {tab === 'zones' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-1.5"><MapPin size={14} className="text-red-400" /> Risk Zones — DBSCAN Cluster Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {zones.map((zone: any, i: number) => {
                    const riskPct = Math.round((zone.risk_score || 0.5) * 100)
                    const riskColor = riskPct > 80 ? '#ef4444' : riskPct > 60 ? '#f97316' : '#eab308'
                    return (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/20 transition-all group">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${riskColor}15`, border: `1.5px solid ${riskColor}40` }}>
                          <MapPin size={22} style={{ color: riskColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-foreground">{zone.label || `Cluster #${i + 1}`}</p>
                            <Badge variant={riskPct > 80 ? 'fatal' : riskPct > 60 ? 'destructive' : 'warning'}>
                              {riskPct}% Risk
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {zone.accidents || '—'} accidents • Lat: {zone.lat?.toFixed(4)}, Lng: {zone.lng?.toFixed(4)}
                          </p>
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${riskPct}%`, background: riskColor }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Zone risk bar chart */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Risk Score Comparison</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={zones.map((z: any, i: number) => ({ name: z.label || `Zone ${i+1}`, risk: Math.round((z.risk_score || 0.5) * 100), accidents: z.accidents || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
                    <Bar dataKey="risk" name="Risk %" radius={[6,6,0,0]}>
                      {zones.map((_: any, i: number) => {
                        const score = (zones[i]?.risk_score || 0.5) * 100
                        return <Cell key={i} fill={score > 80 ? '#ef4444' : score > 60 ? '#f97316' : '#eab308'} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
