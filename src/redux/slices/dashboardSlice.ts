import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api from '../../utils/api'

interface DashboardData {
  [key: string]: any
}

interface DashboardState {
  data: DashboardData
  loading: boolean
  error: string | null
  lastUpdated: number | null
}

const initialState: DashboardState = {
  data: {},
  loading: false,
  error: null,
  lastUpdated: null,
}

// Async thunks for different dashboard data
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (role: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/dashboard/${role}`)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard data')
    }
  }
)

export const fetchStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (params: { period: string; type: string }, { rejectWithValue }) => {
    try {
      const response = await api.get('/stats', { params })
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats')
    }
  }
)

export const fetchReports = createAsyncThunk(
  'dashboard/fetchReports',
  async (filters: any, { rejectWithValue }) => {
    try {
      const response = await api.get('/reports', { params: filters })
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reports')
    }
  }
)

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardData: (state) => {
      state.data = {}
      state.error = null
      state.lastUpdated = null
    },
    updateDashboardData: (state, action: PayloadAction<{ key: string; value: any }>) => {
      state.data[action.payload.key] = action.payload.value
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard data
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
        state.lastUpdated = Date.now()
        state.error = null
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch stats
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.data.stats = action.payload
      })
      // Fetch reports
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.data.reports = action.payload
      })
  },
})

export const { clearDashboardData, updateDashboardData, clearError } = dashboardSlice.actions
export default dashboardSlice.reducer
