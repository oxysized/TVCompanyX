import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { jwtDecode } from 'jwt-decode'
import Cookies from 'js-cookie'
import api from '../../utils/api'

export interface User {
  id: string
  name: string
  email: string
  role: 'customer' | 'agent' | 'commercial' | 'accountant' | 'admin' | 'director'
  avatar?: string
  bankDetails?: any
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  isTestUser?: boolean
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isTestUser: false,
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials)
      const { token } = response.data
      
      // Decode token to get user info
      const decoded = jwtDecode(token) as any
      
      // Store token in cookie
      Cookies.set('token', token, { expires: 7 })
      
      return { token, user: decoded.user }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData)
      const { token } = response.data
      
      const decoded = jwtDecode(token) as any
      Cookies.set('token', token, { expires: 7 })
      
      return { token, user: decoded.user }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed')
    }
  }
)

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = Cookies.get('token')
      if (!token) {
        throw new Error('No token found')
      }
      
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      return response.data
    } catch (error: any) {
      Cookies.remove('token')
      return rejectWithValue(error.response?.data?.message || 'Failed to load user')
    }
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await api.put('/auth/profile', profileData)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Profile update failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.isTestUser = false
      Cookies.remove('token')
    },
    clearError: (state) => {
      state.error = null
    },
    setTestUser: (state, action: PayloadAction<{ role: User['role']; name?: string }>) => {
      const role = action.payload.role
      state.user = {
        id: 'test-user',
        name: action.payload.name || 'Demo User',
        email: 'demo@example.com',
        role,
      }
      state.token = null
      state.isAuthenticated = true
      state.loading = false
      state.error = null
      state.isTestUser = true
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.token
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.token
        state.error = null
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Load user
      .addCase(loadUser.pending, (state) => {
        state.loading = true
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload
        state.error = null
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.error = action.payload as string
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload }
      })
  },
})

export const { logout, clearError, setTestUser } = authSlice.actions
export default authSlice.reducer
