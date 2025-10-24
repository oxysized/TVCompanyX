import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../redux/store'
import { loginUser, clearError } from '../../redux/slices/authSlice'
import { useRouter } from 'next/router'
import { EyeIcon, EyeSlashIcon, KeyIcon } from '@heroicons/react/24/outline'

interface LoginFormData {
  email: string
  password: string
}

const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const { loading, error } = useSelector((state: RootState) => state.auth)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    dispatch(clearError())
    try {
      const resultAction = await dispatch(loginUser(data))
      // If using unwrap: const payload = await dispatch(loginUser(data)).unwrap()
      // Redirect after successful login (AuthPage also redirects, but we do it here immediately)
      const payload: any = (resultAction as any).payload
      if (payload?.user?.role) {
        const roleRoutes: { [key: string]: string } = {
          customer: '/customer',
          agent: '/agent',
          commercial: '/commercial',
          accountant: '/accountant',
          admin: '/admin',
          director: '/director',
        }
        router.push(roleRoutes[payload.user.role] || '/customer')
      }
    } catch (err) {
      // error handled in slice; no-op here
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(onSubmit)()
    }
  }

  return (
    <div className="space-y-6" onKeyPress={handleKeyPress}>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
          Email адрес
        </label>
        <input
          {...register('email', {
            required: 'Email обязателен',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Неверный формат email',
            },
          })}
          type="email"
          id="email"
          className="w-full px-4 py-3 border border-secondary-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="example@company.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-2">
          Пароль
        </label>
        <div className="relative">
          <input
            {...register('password', {
              required: 'Пароль обязателен',
              minLength: {
                value: 6,
                message: 'Пароль должен содержать минимум 6 символов',
              },
            })}
            type={showPassword ? 'text' : 'password'}
            id="password"
            className="w-full px-4 py-3 pr-12 border border-secondary-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Введите ваш пароль"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary-700">
            Запомнить меня
          </label>
        </div>

        <div className="text-sm">
          <a href="#" className="font-medium text-primary-600 hover:text-primary-700">
            Забыли пароль?
          </a>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit(onSubmit)}
        disabled={loading}
        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Вход...
          </>
        ) : (
          <>
            <KeyIcon className="h-4 w-4 mr-2" />
            Войти в систему
          </>
        )}
      </button>
    </div>
  )
}

export default LoginForm
