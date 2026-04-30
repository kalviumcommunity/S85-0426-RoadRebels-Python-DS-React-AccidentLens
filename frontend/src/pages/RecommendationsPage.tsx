import React, { useEffect, useState, useRef } from 'react'
import { recommendationAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Lightbulb, Shield, Wrench, Megaphone, DollarSign, HeartPulse, Target, ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle } from 'lucide-react'
import gsap from 'gsap'

const TYPE_ICONS: Record<string, any> = { enforcement: Shield, infrastructure: Wrench, awareness: Megaphone }
const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: 'warning', icon: Clock, label: 'Pending' },
  implemented: { color: 'success', icon: CheckCircle2, label: 'Implemented' },
  rejected: { color: 'destructive', icon: XCircle, label: 'Rejected' },
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    recommendationAPI.generate().then(res => {
      setRecommendations(res.data.data || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && cardsRef.current) {
      gsap.fromTo(cardsRef.current.children, { y: 30, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.08, ease: 'power3.out' })
    }
  }, [loading])

  const updateStatus = async (id: string, status: string) => {
    try {
      await recommendationAPI.updateStatus(id, status)
      setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } catch {
      // Update locally even if API fails
      setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
  }

  if (loading) {
    return <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Lightbulb size={28} className="text-amber-400" /> AI Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-1">{recommendations.length} actionable insights generated from data analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-xs">{recommendations.filter(r => r.status === 'implemented').length} Implemented</Badge>
          <Badge variant="warning" className="text-xs">{recommendations.filter(r => !r.status || r.status === 'pending').length} Pending</Badge>
        </div>
      </div>

      <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recommendations.map((rec) => {
          const Icon = TYPE_ICONS[rec.type] || Lightbulb
          const expanded = expandedId === rec.id
          const status = rec.status || 'pending'
          const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.pending
          const StatusIcon = statusConf.icon

          return (
            <Card key={rec.id} className="relative overflow-hidden group">
              {/* Priority stripe */}
              <div className={`absolute top-0 left-0 w-1 h-full ${rec.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />

              <CardContent className="pl-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      rec.type === 'enforcement' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">{rec.title}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{rec.description}</p>
                    </div>
                  </div>
                  <Badge variant={rec.priority === 'high' ? 'fatal' : 'warning'} className="flex-shrink-0 capitalize text-[9px]">
                    {rec.priority}
                  </Badge>
                </div>

                {/* Confidence + Impact */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <Target size={14} className="mx-auto text-indigo-400 mb-1" />
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-sm font-bold text-foreground">{Math.round((rec.confidence || 0) * 100)}%</p>
                    <div className="w-full h-1.5 rounded-full bg-white/5 mt-1 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${(rec.confidence || 0) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <DollarSign size={14} className="mx-auto text-emerald-400 mb-1" />
                    <p className="text-xs text-muted-foreground">Est. Cost</p>
                    <p className="text-sm font-bold text-foreground">${(rec.estimatedCost || rec.estimated_cost || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <HeartPulse size={14} className="mx-auto text-red-400 mb-1" />
                    <p className="text-xs text-muted-foreground">Lives Saved</p>
                    <p className="text-sm font-bold text-foreground">~{rec.estimatedLivesSaved || rec.estimated_lives_saved || 0}</p>
                  </div>
                </div>

                {/* Expandable evidence */}
                <button
                  onClick={() => setExpandedId(expanded ? null : rec.id)}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mb-3"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {expanded ? 'Hide' : 'Show'} Evidence & Impact
                </button>
                {expanded && (
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-3 text-xs space-y-1.5">
                    <p className="text-muted-foreground"><strong className="text-foreground">Evidence:</strong> {rec.evidence}</p>
                    <p className="text-muted-foreground"><strong className="text-foreground">Expected Impact:</strong> {rec.expectedImpact || rec.expected_impact}</p>
                  </div>
                )}

                {/* Status + Actions */}
                <div className="flex items-center justify-between">
                  <Badge variant={statusConf.color as any} className="flex items-center gap-1 text-[10px]">
                    <StatusIcon size={12} /> {statusConf.label}
                  </Badge>
                  {status === 'pending' && (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="success" className="h-7 text-xs" onClick={() => updateStatus(rec.id, 'implemented')}>
                        <CheckCircle2 size={12} className="mr-1" /> Implement
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => updateStatus(rec.id, 'rejected')}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {recommendations.length === 0 && (
        <Card className="text-center py-12">
          <Lightbulb size={48} className="mx-auto text-muted-foreground mb-4 opacity-30" />
          <p className="text-muted-foreground">No recommendations available yet. Run data analysis first.</p>
        </Card>
      )}
    </div>
  )
}
