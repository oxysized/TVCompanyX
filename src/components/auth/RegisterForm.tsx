import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../redux/store'
import { registerUser, clearError } from '../../redux/slices/authSlice'
import { useRouter } from 'next/router'
import { EyeIcon, EyeSlashIcon, UserIcon } from '@heroicons/react/24/outline'

interface RegisterFormData {
  first_name: string
  middle_name?: string
  last_name: string
  email: string
  password: string
  confirmPassword: string
  phone?: string
}

const RegisterForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const { loading, error } = useSelector((state: RootState) => state.auth)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>()

  const password = watch('password')

  const onSubmit = async (data: RegisterFormData) => {
    dispatch(clearError())
    try {
      const resultAction = await dispatch(registerUser({
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email,
        password: data.password,
      }))
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
      // error displayed from redux state
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(onSubmit)()
    }
  }

  return (
    <div className="space-y-6" onKeyPress={handleKeyPress}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-secondary-700 mb-2">
            Имя
          </label>
          <input
            {...register('first_name', {
              required: 'Имя обязательно',
              minLength: { value: 1, message: 'Введите имя' },
            })}
            type="text"
            id="first_name"
            className="w-full px-4 py-3 border border-secondary-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Иван"
          />
          {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>}
        </div>

        <div>
          <label htmlFor="middle_name" className="block text-sm font-medium text-secondary-700 mb-2">
            Отчество (опционально)
          </label>
          <input
            {...register('middle_name')}
            type="text"
            id="middle_name"
            className="w-full px-4 py-3 border border-secondary-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Петрович"
          />
        </div>

        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-secondary-700 mb-2">
            Фамилия
          </label>
          <input
            {...register('last_name', {
              required: 'Фамилия обязательна',
              minLength: { value: 1, message: 'Введите фамилию' },
            })}
            type="text"
            id="last_name"
            className="w-full px-4 py-3 border border-secondary-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Иванов"
          />
          {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-2">Телефон</label>
        <input
          {...register('phone', {
            required: 'Телефон обязателен',
            pattern: { value: /^[+0-9\-()\s]{6,20}$/, message: 'Неверный формат телефона' }
          })}
          type="tel"
          id="phone"
          className="w-full px-4 py-3 border border-secondary-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="+7 (900) 000-00-00"
        />
        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
      </div>

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
            placeholder="Минимум 6 символов"
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

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-2">
          Подтвердите пароль
        </label>
        <div className="relative">
          <input
            {...register('confirmPassword', {
              required: 'Подтверждение пароля обязательно',
              validate: (value) =>
                value === password || 'Пароли не совпадают',
            })}
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            className="w-full px-4 py-3 pr-12 border border-secondary-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Повторите пароль"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="terms" className="text-secondary-700">
            Я согласен с{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700">
              условиями использования
            </a>{' '}
            и{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700">
              политикой конфиденциальности
            </a>
          </label>
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
            Регистрация...
          </>
        ) : (
          <>
            <UserIcon className="h-4 w-4 mr-2" />
            Создать аккаунт
          </>
        )}
      </button>
    </div>
  )
}

export default RegisterForm
