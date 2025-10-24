import React from 'react'
import { useRouter } from 'next/router'
import { 
  PlayIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  DocumentTextIcon,
  CurrencyDollarIcon,
  CogIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

const HomePage: React.FC = () => {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-secondary-900">
                  TV Company Ad System
                </h1>
                <p className="text-sm text-secondary-600">
                  Система управления рекламой телекомпании
                </p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/auth')}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center"
              >
                Войти в систему
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-secondary-900 mb-6">
            Управление рекламой
            <span className="text-primary-600"> нового поколения</span>
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto mb-8">
            Современная платформа для управления рекламными размещениями, 
            расчета стоимости и взаимодействия между всеми участниками процесса
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/auth')}
              className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center"
            >
              Начать работу
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </button>
            <button
              onClick={() => router.push('/services')}
              className="border-2 border-primary-600 text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              Наши услуги
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center bg-white rounded-xl p-8 shadow-sm">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <PlayIcon className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-secondary-900 mb-3">
              Управление рекламой
            </h3>
            <p className="text-secondary-600">
              Полный цикл от подачи заявки до размещения рекламы с автоматическим расчетом стоимости
            </p>
          </div>

          <div className="text-center bg-white rounded-xl p-8 shadow-sm">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-secondary-900 mb-3">
              Аналитика и отчеты
            </h3>
            <p className="text-secondary-600">
              Детальная аналитика по всем показателям и автоматические отчеты в реальном времени
            </p>
          </div>

          <div className="text-center bg-white rounded-xl p-8 shadow-sm">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <UserGroupIcon className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-secondary-900 mb-3">
              Командная работа
            </h3>
            <p className="text-secondary-600">
              Эффективное взаимодействие между всеми участниками процесса через встроенные чаты
            </p>
          </div>
        </div>

        {/* Roles Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-secondary-900 mb-4">
              Для каждой роли - свой функционал
            </h3>
            <p className="text-lg text-secondary-600">
              Персонализированные дашборды и инструменты для эффективной работы
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Customer */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center mb-4">
                <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
                <h4 className="text-lg font-semibold text-blue-900">Заказчик рекламы</h4>
              </div>
              <ul className="text-blue-700 text-sm space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Расчет стоимости рекламы
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Подача заявок
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Отслеживание статуса
                </li>
              </ul>
            </div>

            {/* Agent */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center mb-4">
                <ChartBarIcon className="h-8 w-8 text-green-600 mr-3" />
                <h4 className="text-lg font-semibold text-green-900">Рекламный агент</h4>
              </div>
              <ul className="text-green-700 text-sm space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Управление заявками
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Расчет комиссий
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Генерация отчетов
                </li>
              </ul>
            </div>

            {/* Commercial */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center mb-4">
                <DocumentTextIcon className="h-8 w-8 text-purple-600 mr-3" />
                <h4 className="text-lg font-semibold text-purple-900">Коммерческий отдел</h4>
              </div>
              <ul className="text-purple-700 text-sm space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Составление расписания
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Управление заявками
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Планирование эфира
                </li>
              </ul>
            </div>

            {/* Accountant */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
              <div className="flex items-center mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-600 mr-3" />
                <h4 className="text-lg font-semibold text-yellow-900">Бухгалтер</h4>
              </div>
              <ul className="text-yellow-700 text-sm space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Финансовые отчеты
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Управление платежами
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Контроль доходов
                </li>
              </ul>
            </div>

            {/* Admin */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
              <div className="flex items-center mb-4">
                <CogIcon className="h-8 w-8 text-red-600 mr-3" />
                <h4 className="text-lg font-semibold text-red-900">ИТ-администратор</h4>
              </div>
              <ul className="text-red-700 text-sm space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Управление пользователями
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Мониторинг системы
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Техническая поддержка
                </li>
              </ul>
            </div>

            {/* Director */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
              <div className="flex items-center mb-4">
                <BuildingOfficeIcon className="h-8 w-8 text-indigo-600 mr-3" />
                <h4 className="text-lg font-semibold text-indigo-900">Директор</h4>
              </div>
              <ul className="text-indigo-700 text-sm space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Аналитика компании
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Стратегические отчеты
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Управление KPI
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">
            Готовы начать работу?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Присоединяйтесь к нашей системе управления рекламой уже сегодня
          </p>
          <button
            onClick={() => router.push('/auth')}
            className="bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors flex items-center mx-auto"
          >
            Войти в систему
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-secondary-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-secondary-600">
            <p>&copy; 2024 TV Company Ad System. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage