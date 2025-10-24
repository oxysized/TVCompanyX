import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { loadUser } from '../../redux/slices/authSlice'
import Header from '../layout/Header'
import Sidebar from '../layout/Sidebar'
import dynamic from 'next/dynamic'
import { Toaster } from 'react-hot-toast'
import socketService from '../../utils/socket'

interface LayoutProps {
  children: React.ReactNode
  role?: string
}

const Layout: React.FC<LayoutProps> = ({ children, role }) => {
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated, user, loading, isTestUser } = useSelector((state: RootState) => state.auth)
  const { sidebarOpen } = useSelector((state: RootState) => state.ui)
  const [dbConnected, setDbConnected] = useState(false)
  const [mounted, setMounted] = useState(false)

  const DatabaseStatus = dynamic(() => import('../DatabaseStatus'), { ssr: false })

  useEffect(() => {
    setMounted(true)
    // Skip server auth load in demo mode
    if (!isTestUser) {
      dispatch(loadUser())
    }
  }, [dispatch, isTestUser])

  // Redirect to home only after we've performed the initial auth check.
  // This prevents a flash/redirect on page reload (F5) while loadUser is running.
  const { initialized } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      window.location.href = '/'
    }
  }, [initialized, isAuthenticated])

  useEffect(() => {
    // Initialize socket connection when user is authenticated
    if (isAuthenticated && user && !isTestUser) {
      socketService.connect()
      
      // Subscribe to dashboard updates based on user role
      socketService.subscribeToDashboard(user.role)
    }

    return () => {
      if (isAuthenticated && user && !isTestUser) {
        socketService.unsubscribeFromDashboard(user.role)
        socketService.disconnect()
      }
    }
  }, [isAuthenticated, user, isTestUser])

  // Prevent hydration mismatch: gate by mounted
  if (!mounted) return null

  // Show database status check for authenticated users (client-only)
  if (isAuthenticated && !dbConnected) {
    return <DatabaseStatus onStatusChange={setDbConnected} />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
        {children}
        <Toaster position="top-right" />
      </div>
    )
  }

  const userRole = role || user?.role || 'customer'

  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      <div className="flex">
        <Sidebar role={userRole} />
        
        <main className="flex-1">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  )
}

export default Layout
