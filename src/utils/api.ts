import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('token')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// API methods
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { name: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
}

export const dashboardAPI = {
  getDashboardData: (role: string) => api.get(`/dashboard/${role}`),
  getStats: (params: any) => api.get('/stats', { params }),
  getReports: (filters: any) => api.get('/reports', { params: filters }),
}

export const adAPI = {
  calculateCost: (data: { seconds: number; showId: string }) =>
    api.post('/ads/calculate-cost', data),
  createApplication: (data: any) => api.post('/ads/applications', data),
  getApplications: (params?: any) => api.get('/ads/applications', { params }),
  updateApplication: (id: string, data: any) => api.put(`/ads/applications/${id}`, data),
  deleteApplication: (id: string) => api.delete(`/ads/applications/${id}`),
}

export const showAPI = {
  getShows: () => api.get('/shows'),
  createShow: (data: any) => api.post('/shows', data),
  updateShow: (id: string, data: any) => api.put(`/shows/${id}`, data),
  deleteShow: (id: string) => api.delete(`/shows/${id}`),
  getSchedule: (params?: any) => api.get('/shows/schedule', { params }),
  createSchedule: (data: any) => api.post('/shows/schedule', data),
}

export const userAPI = {
  getUsers: (params?: any) => api.get('/users', { params }),
  createUser: (data: any) => api.post('/users', data),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
}

export const reportAPI = {
  generateReport: (type: string, filters: any) =>
    api.post(`/reports/generate/${type}`, filters),
  downloadReport: (reportId: string) =>
    api.get(`/reports/download/${reportId}`, { responseType: 'blob' }),
}

export const chatAPI = {
  getRooms: () => api.get('/chat/rooms'),
  createRoom: (data: any) => api.post('/chat/rooms', data),
  getMessages: (roomId: string) => api.get(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId: string, data: any) =>
    api.post(`/chat/rooms/${roomId}/messages`, data),
}

export default api
