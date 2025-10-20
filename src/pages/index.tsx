import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import { setTestUser } from '../redux/slices/authSlice'
import {
  UserGroupIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline'

const Home: NextPage = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to appropriate dashboard based on user role
      const roleRoutes: { [key: string]: string } = {
        customer: '/customer',
        agent: '/agent',
        commercial: '/commercial',
        accountant: '/accountant',
        admin: '/admin',
        director: '/director',
      }
      router.push(roleRoutes[user.role] || '/customer')
    }
  }, [isAuthenticated, user, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      <Head>
        <title>TV Company Ad System - Login</title>
        <meta name="description" content="TV Company Advertisement Management System" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary-600 mb-2">
                TV Company Ad System
              </h1>
              <p className="text-secondary-600">
                Система управления рекламой телекомпании
              </p>
            </div>

            <div className="space-y-6">
              <LoginForm />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-secondary-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-secondary-500">или</span>
                </div>
              </div>
              <RegisterForm />

              {/* Demo/Test access panel */}
              <div className="mt-6">
                <div className="flex items-center mb-3 text-secondary-700">
                  <BeakerIcon className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">Демо-доступ: быстро посмотреть панели ролей</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => dispatch(setTestUser({ role: 'customer', name: 'Demo Customer' }) as any)}
                    className="px-3 py-2 text-sm rounded-md bg-white border border-secondary-200 hover:bg-secondary-50"
                  >Заказчик</button>
                  <button
                    onClick={() => dispatch(setTestUser({ role: 'agent', name: 'Demo Agent' }) as any)}
                    className="px-3 py-2 text-sm rounded-md bg-white border border-secondary-200 hover:bg-secondary-50"
                  >Агент</button>
                  <button
                    onClick={() => dispatch(setTestUser({ role: 'commercial', name: 'Demo Commercial' }) as any)}
                    className="px-3 py-2 text-sm rounded-md bg-white border border-secondary-200 hover:bg-secondary-50"
                  >Коммерческий отдел</button>
                  <button
                    onClick={() => dispatch(setTestUser({ role: 'accountant', name: 'Demo Accountant' }) as any)}
                    className="px-3 py-2 text-sm rounded-md bg-white border border-secondary-200 hover:bg-secondary-50"
                  >Бухгалтер</button>
                  <button
                    onClick={() => dispatch(setTestUser({ role: 'admin', name: 'Demo Admin' }) as any)}
                    className="px-3 py-2 text-sm rounded-md bg-white border border-secondary-200 hover:bg-secondary-50"
                  >ИТ-админ</button>
                  <button
                    onClick={() => dispatch(setTestUser({ role: 'director', name: 'Demo Director' }) as any)}
                    className="px-3 py-2 text-sm rounded-md bg-white border border-secondary-200 hover:bg-secondary-50"
                  >Директор</button>
                </div>
                <p className="mt-2 text-xs text-secondary-500">Демо вход не требует регистрации и не делает запросы к серверу.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home
