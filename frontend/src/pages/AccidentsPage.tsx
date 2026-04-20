import React, { useEffect, useState, useRef } from 'react'
import { accidentAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Download, Plus, Search, Filter, ChevronLeft, ChevronRight, MapPin, Clock, Cloud, X, Loader2 } from 'lucide-react'
import gsap from 'gsap'

const SEVERITY_VARIANTS: Record<string, any> = { fatal: 'fatal', severe: 'severe', moderate: 'moderate', minor: 'minor' }
const WEATHER_ICONS: Record<string, string> = { clear: '☀️', rain: '🌧️', snow: '❄️', fog: '🌫️', sleet: '🌨️' }

export default function AccidentsPage() {
  const [accidents, setAccidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ severity: '', roadType: '', weather: '', limit: 20, offset: 0 })
  const [showCreate, setShowCreate] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  const fetchAccidents = async () => {
    setLoading(true)
    try {
      const res = await accidentAPI.list(filters)
      setAccidents(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAccidents() }, [filters.severity, filters.roadType, filters.weather, filters.offset])

  useEffect(() => {
    if (!loading && tableRef.current) {
      gsap.fromTo(tableRef.current.querySelectorAll('tr'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out' })
    }
  }, [loading, accidents])

  const downloadCSV = () => {
    if (!accidents.length) return
    const headers = ['Date', 'Road', 'Type', 'Severity', 'Vehicles', 'Injured', 'Weather', 'Condition', 'Status']
    const rows = accidents.map(a => [
      new Date(a.timestamp).toLocaleString(), a.road_name || a.roadName, a.road_type || a.roadType,
      a.severity, a.vehicle_count ?? a.vehicleCount, a.injured_count ?? a.injuredCount,
      a.weather, a.road_condition || a.roadCondition, a.status,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `accidents_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newReport, setNewReport] = useState({
    location: '', weather: 'clear', roadType: 'urban', severity: 'minor', description: ''
  })

  // Submit Handler
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await accidentAPI.create(newReport)
      setShowCreate(false)
      setNewReport({ location: '', weather: 'clear', roadType: 'urban', severity: 'minor', description: '' })
      fetchAccidents()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const page = Math.floor(filters.offset / filters.limit) + 1
  const totalPages = Math.ceil(total / filters.limit) || 1

  return (
    <div className="space-y-6 relative">
      {/* Report Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-slate-900 border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/[0.06]">
              <CardTitle className="text-lg">Submit New Report</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowCreate(false)}>
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreateReport} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Location / Road Name</label>
                  <Input required placeholder="Main St & 4th Ave" value={newReport.location} onChange={e => setNewReport({...newReport, location: e.target.value})} className="bg-white/5" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Severity</label>
                    <select required value={newReport.severity} onChange={e => setNewReport({...newReport, severity: e.target.value})} className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="minor" className="bg-slate-900">Minor</option>
                      <option value="moderate" className="bg-slate-900">Moderate</option>
                      <option value="severe" className="bg-slate-900">Severe</option>
                      <option value="fatal" className="bg-slate-900">Fatal</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Weather</label>
                    <select required value={newReport.weather} onChange={e => setNewReport({...newReport, weather: e.target.value})} className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="clear" className="bg-slate-900">Clear</option>
                      <option value="rain" className="bg-slate-900">Rain</option>
                      <option value="snow" className="bg-slate-900">Snow</option>
                      <option value="sleet" className="bg-slate-900">Sleet</option>
                      <option value="fog" className="bg-slate-900">Fog</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Road Type</label>
                    <select required value={newReport.roadType} onChange={e => setNewReport({...newReport, roadType: e.target.value})} className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="urban" className="bg-slate-900">Urban</option>
                      <option value="highway" className="bg-slate-900">Highway</option>
                      <option value="rural" className="bg-slate-900">Rural</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <textarea rows={3} required placeholder="Brief description of the accident..." value={newReport.description} onChange={e => setNewReport({...newReport, description: e.target.value})} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : 'Log Accident'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><AlertTriangle size={28} className="text-orange-400" /> Accident Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} total records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}><Download size={14} className="mr-1.5" /> Export CSV</Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}><Plus size={14} className="mr-1.5" /> Add Report</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-0">
          <Filter size={16} className="text-muted-foreground" />
          {[
            { key: 'severity', label: 'Severity', options: ['fatal', 'severe', 'moderate', 'minor'] },
            { key: 'roadType', label: 'Road Type', options: ['highway', 'urban', 'rural'] },
            { key: 'weather', label: 'Weather', options: ['clear', 'rain', 'snow', 'fog', 'sleet'] },
          ].map(f => (
            <select key={f.key} value={(filters as any)[f.key]}
              onChange={e => setFilters({ ...filters, [f.key]: e.target.value, offset: 0 })}
              className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
              <option value="">{f.label}: All</option>
              {f.options.map(o => <option key={o} value={o} className="bg-slate-900 capitalize">{o}</option>)}
            </select>
          ))}
          {(filters.severity || filters.roadType || filters.weather) && (
            <button onClick={() => setFilters({ ...filters, severity: '', roadType: '', weather: '', offset: 0 })}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Clear filters</button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto" ref={tableRef}>
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Date/Time', 'Location', 'Severity', 'Vehicles', 'Injured', 'Weather', 'Condition', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accidents.map((a, i) => (
                  <tr key={a.id || i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-foreground"><Clock size={13} className="text-muted-foreground" /> {new Date(a.timestamp).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5"><MapPin size={13} className="text-indigo-400" /> {a.road_name || a.roadName}
                        <Badge variant="outline" className="text-[10px] ml-1">{a.road_type || a.roadType}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={SEVERITY_VARIANTS[a.severity] || 'default'} className="capitalize">{a.severity}</Badge></td>
                    <td className="px-4 py-3 text-foreground font-medium">{a.vehicle_count ?? a.vehicleCount}</td>
                    <td className="px-4 py-3">
                      <span className={(a.injured_count ?? a.injuredCount) > 0 ? 'text-red-400 font-semibold' : 'text-muted-foreground'}>
                        {a.injured_count ?? a.injuredCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{WEATHER_ICONS[a.weather] || '🌤️'} {a.weather}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{a.road_condition || a.roadCondition}</td>
                    <td className="px-4 py-3"><Badge variant={a.status === 'resolved' ? 'success' : a.status === 'investigated' ? 'warning' : 'default'} className="capitalize text-[10px]">{a.status}</Badge></td>
                  </tr>
                ))}
                {accidents.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No accidents found matching your filters.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {/* Pagination */}
        {total > filters.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} records)</span>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}>
                <ChevronLeft size={14} />
              </Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
