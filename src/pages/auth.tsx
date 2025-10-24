import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import { 
  PlayIcon, 
  ArrowLeftIcon,
  UserIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

const AuthPage: React.FC = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
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
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-secondary-600 hover:text-secondary-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              На главную
            </button>
            <div className="flex items-center">
              <PlayIcon className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-secondary-900">
                  TV Company Ad System
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Auth Mode Toggle */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-secondary-900 mb-2">
                {authMode === 'login' ? 'Добро пожаловать!' : 'Создать аккаунт'}
              </h2>
              <p className="text-secondary-600">
                {authMode === 'login' 
                  ? 'Войдите в свой аккаунт для доступа к системе'
                  : 'Зарегистрируйтесь для начала работы с системой'
                }
              </p>
            </div>

            {/* Mode Toggle Buttons */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  authMode === 'login'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <KeyIcon className="h-4 w-4 mr-2" />
                Вход
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  authMode === 'register'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Регистрация
              </button>
            </div>

            {/* Auth Forms */}
            <div>
              {authMode === 'login' ? <LoginForm /> : <RegisterForm />}
            </div>

            {/* Switch Mode */}
            <div className="mt-6 text-center">
              <p className="text-sm text-secondary-600">
                {authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="ml-1 text-primary-600 hover:text-primary-700 font-medium"
                >
                  {authMode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                </button>
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-sm text-secondary-500">
              Нужна помощь? Обратитесь к{' '}
              <a href="mailto:support@tvcompany.com" className="text-primary-600 hover:text-primary-700">
                службе поддержки
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AuthPage
