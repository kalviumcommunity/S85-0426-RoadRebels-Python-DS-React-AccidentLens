import axios from 'axios'

const BASE_URL = '/api'
const ANALYSIS_URL = '/api'


const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } })
const analysisApi = axios.create({ baseURL: ANALYSIS_URL, headers: { 'Content-Type': 'application/json' } })

// JWT interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}, (error) => Promise.reject(error))

// ── Accidents ──
export const accidentAPI = {
  list: (filters?: any) => api.get('/accidents', { params: filters }),
  create: (data: any) => api.post('/accidents', data),
  get: (id: string) => api.get(`/accidents/${id}`),
  update: (id: string, data: any) => api.patch(`/accidents/${id}`, data),
  delete: (id: string) => api.delete(`/accidents/${id}`),
  search: (q: string) => api.get('/accidents/search', { params: { q } }),
}

// ── Analytics ──
export const analyticsAPI = {
  correlations: (m1?: string, m2?: string) => api.get('/analytics/correlations', { params: { metric1: m1, metric2: m2 } }),
  hotspots: () => api.get('/analytics/hotspots'),
  timeseries: (days?: number) => api.get('/analytics/timeseries', { params: { days } }),
  statistics: () => api.get('/analytics/statistics'),
  trends: () => api.get('/analytics/trends'),
}

// ── Recommendations ──
export const recommendationAPI = {
  generate: () => api.get('/recommendations/generate'),
  list: () => api.get('/recommendations'),
  get: (id: string) => api.get(`/recommendations/${id}`),
  create: (data: any) => api.post('/recommendations', data),
  updateStatus: (id: string, status: string) => api.patch(`/recommendations/${id}/status`, { status }),
}

// ── Dashboard ──
export const dashboardAPI = {
  metrics: () => api.get('/dashboard/metrics'),
  analytics: () => api.get('/dashboard/analytics'),
  recommendations: () => api.get('/dashboard/recommendations'),
  alerts: () => api.get('/dashboard/alerts').catch(() => ({ data: { data: [] } })),
  predictions: () => api.get('/dashboard/predictions').catch(() => ({ data: { data: {} } })),
}

// ── Auth ──
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) => api.post('/auth/register', { email, password, name }),
  verify: () => api.get('/auth/verify'),
}

// ── Python Analysis Service ──
export const analysisAPI = {
  edaSummary: () => analysisApi.get('/eda/summary').catch(() => ({ data: { data: null } })),
  edaDistributions: () => analysisApi.get('/eda/distributions').catch(() => ({ data: { data: null } })),
  edaCorrelations: () => analysisApi.get('/eda/correlations').catch(() => ({ data: { data: null } })),
  edaOutliers: () => analysisApi.get('/eda/outliers').catch(() => ({ data: { data: null } })),
  predictSeverity: (data: any) => analysisApi.post('/predict/severity', data),
  predictForecast: (days?: number) => analysisApi.get('/predict/forecast', { params: { days } }).catch(() => ({ data: { data: null } })),
  riskZones: () => analysisApi.get('/predict/risk-zones').catch(() => ({ data: { data: null } })),
  alerts: () => analysisApi.get('/alerts/active').catch(() => ({ data: { data: [] } })),
  modelMetrics: () => analysisApi.get('/model/metrics').catch(() => ({ data: { data: null } })),
  temporalHotspots: () => analysisApi.get('/analytics/hotspots/temporal'),
  simulateRisk: (data: any) => analysisApi.post('/predict/simulate', data),
  ingestCsv: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return analysisApi.post('/ingest/csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}


// ── News ──
export const newsAPI = {
  traffic: () => api.get('/news/traffic').catch(() => ({ data: { data: [] } })),
}

export default api
