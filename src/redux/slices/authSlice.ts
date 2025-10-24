import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
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
  // true once we've attempted to load the current user (success or failure)
  initialized: boolean
  error: string | null
  isTestUser?: boolean
}

// Load initial state from localStorage
const loadInitialState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      loading: true,
      initialized: false,
      error: null,
      isTestUser: false,
    };
  }

  const isTestUser = localStorage.getItem('isTestUser') === 'true';
  const testUserRole = localStorage.getItem('testUserRole');
  const token = localStorage.getItem('token');

  if (isTestUser && testUserRole) {
    return {
      user: {
        id: 'test-user',
        name: 'Demo User',
        email: 'demo@example.com',
        role: testUserRole as User['role'],
      },
      token: null,
      isAuthenticated: true,
      loading: false,
      initialized: true,
      error: null,
      isTestUser: true,
    };
  }

  return {
    user: null,
    token: token || null,
    isAuthenticated: false,
    // По умолчанию на клиенте не считаем, что мы загружаемся — это предотвращает
    // блокировку форм входа/регистрации до вызова loadUser.
    loading: false,
    initialized: false,
    error: null,
    isTestUser: false,
  };
};

const initialState: AuthState = loadInitialState();

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await (await import('../../utils/api')).authAPI.login(credentials)
      const data = response.data
      const { token, user } = data
      return { token, user }
    } catch (error: any) {
      // axios error handling
      const message = error?.response?.data?.error || error.message || 'Login failed'
      return rejectWithValue(message)
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: { first_name: string; middle_name?: string; last_name: string; phone?: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await (await import('../../utils/api')).authAPI.register(userData)
      const data = response.data
      const { token, user } = data
      return { token, user }
    } catch (error: any) {
      const message = error?.response?.data?.error || error.message || 'Registration failed'
      return rejectWithValue(message)
    }
  }
)

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const { authAPI } = await import('../../utils/api')
      const response = await authAPI.getProfile()
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
  const { authAPI } = await import('../../utils/api')
  const response = await authAPI.updateProfile(profileData)
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
      state.loading = false
      state.error = null
      Cookies.remove('token')
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isTestUser');
        localStorage.removeItem('testUserRole');
        localStorage.removeItem('token');
      }
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
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('isTestUser', 'true');
        localStorage.setItem('testUserRole', role);
      }
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
        state.initialized = false
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload
        state.initialized = true
        state.error = null
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.initialized = true
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
