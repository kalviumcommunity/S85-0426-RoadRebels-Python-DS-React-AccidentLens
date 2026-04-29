import React, { useState, useEffect, useRef } from 'react';
import { dashboardAPI, analysisAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CloudSun, 
  Wind, 
  Thermometer, 
  Clock, 
  Map as MapIcon, 
  ShieldAlert, 
  Info,
  ChevronRight,
  Zap,
  Activity,
  Car
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import gsap from 'gsap';
import { fetchCurrentWeather } from '@/services/weather';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

export default function SafetyDashboard() {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<any>({ condition: 'Clear' });
  const [form, setForm] = useState({
    weatherConditions: 'Clear',
    roadType: 'Highway',
    timeOfDay: 'Morning',
    speedLimit: 60,
    driverAge: 35
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const [distributions, setDistributions] = useState<any>(null);

  const roadTypeData = distributions?.road_type?.slice(0, 5) || [
    { name: 'National Highway', value: 450 },
    { name: 'Urban Road', value: 320 },
  ];

  const hourlyData = (distributions?.hour_of_day || []).map((h: any) => ({
    name: `${h.hour}:00`,
    count: h.count,
    fatal: Math.round(h.count * 0.1),
    serious: Math.round(h.count * 0.3),
    minor: Math.round(h.count * 0.6)
  }));

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current.children, 
        { y: 20, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
      );
    }

    const loadData = async () => {
      try {
        const [weather, distRes] = await Promise.all([
          fetchCurrentWeather(28.6139, 77.2090),
          analysisAPI.edaDistributions()
        ]);
        
        setWeatherData(weather);
        setForm(prev => ({ ...prev, weatherConditions: weather.condition }));
        if (distRes.data?.data) setDistributions(distRes.data.data);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    loadData();
  }, []);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await analysisAPI.predictSeverity(form);
      setPrediction(res.data.prediction);
      gsap.fromTo(".prediction-result", 
        { scale: 0.9, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'fatal': return 'text-red-400';
      case 'serious': return 'text-orange-400';
      case 'minor': return 'text-blue-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700" ref={containerRef}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert size={28} className="text-red-500" /> AccidentLens Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time predictive analytics for traffic safety enforcement</p>
        </div>
        <div className="flex gap-4 p-4 glass rounded-2xl border border-white/5">
          <div className="text-center px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Safety Score</p>
            <p className="text-2xl font-bold text-green-400">84%</p>
          </div>
          <div className="w-px bg-white/10 h-10 my-auto" />
          <div className="text-center px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Active Alerts</p>
            <p className="text-2xl font-bold text-orange-400">12</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Predictor Form */}
        <Card className="lg:col-span-5 glass border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap size={120} className="text-yellow-400" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap size={18} className="text-yellow-400" /> Severity Predictor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Weather</label>
                <Select value={form.weatherConditions} onValueChange={(v) => setForm({...form, weatherConditions: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select weather" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Clear">Clear</SelectItem>
                    <SelectItem value="Rainy">Rainy</SelectItem>
                    <SelectItem value="Foggy">Foggy</SelectItem>
                    <SelectItem value="Stormy">Stormy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Road Type</label>
                <Select value={form.roadType} onValueChange={(v) => setForm({...form, roadType: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select road" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="National Highway">National Highway</SelectItem>
                    <SelectItem value="Urban Road">Urban Road</SelectItem>
                    <SelectItem value="State Highway">State Highway</SelectItem>
                    <SelectItem value="Village Road">Village Road</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Time of Day</label>
                <Select value={form.timeOfDay} onValueChange={(v) => setForm({...form, timeOfDay: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Afternoon">Afternoon</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Speed Limit</label>
                <Input type="number" value={form.speedLimit} onChange={(e) => setForm({...form, speedLimit: parseInt(e.target.value)})} className="bg-white/5 border-white/10" />
              </div>
            </div>

            <Button onClick={handlePredict} disabled={loading} className="w-full gradient-primary h-12 text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
              {loading ? <Activity className="animate-spin mr-2" /> : <ChevronRight className="mr-2" />}
              Analyze Potential Risk
            </Button>

            {prediction && (
              <div className="prediction-result mt-6 p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-2">Predicted Outcome</p>
                <h2 className={`text-4xl font-black uppercase ${getSeverityColor(prediction)} animate-pulse`}>{prediction}</h2>
                <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-muted-foreground italic">
                  <Info size={12} /> Live prediction from Random Forest model
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Section */}
        <div className="lg:col-span-7 space-y-6">
          {/* Risk Area Chart */}
          <Card className="glass border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Activity size={16} className="text-indigo-400" /> Risk Distribution (Hourly)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData.length > 0 ? hourlyData : [
                    { name: '00:00', fatal: 10, serious: 20, minor: 40 },
                    { name: '12:00', fatal: 30, serious: 50, minor: 90 },
                    { name: '23:00', fatal: 20, serious: 40, minor: 70 },
                  ]}>
                    <defs>
                      <linearGradient id="colorFatal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(222 47% 14%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Area type="monotone" dataKey="count" name="Total Accidents" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorFatal)" />
                    <Area type="monotone" dataKey="fatal" name="Fatal (Est)" stroke="#ef4444" strokeWidth={1} fill="none" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-white/10">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MapIcon size={16} className="text-emerald-400" /> Road Types</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roadTypeData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                        {roadTypeData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Thermometer size={16} className="text-orange-400" /> Top Risks</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {[
                  { label: 'Wet Road Visibility', risk: 'High', color: 'bg-red-500/20 text-red-400' },
                  { label: 'Night Speeding', risk: 'Moderate', color: 'bg-amber-500/20 text-amber-400' },
                  { label: 'Urban Peak Hours', risk: 'Critical', color: 'bg-red-500/20 text-red-400' },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-xs text-slate-300 font-medium">{r.label}</span>
                    <Badge className={r.color}>{r.risk}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
