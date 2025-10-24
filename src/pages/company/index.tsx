import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import Dashboard from '../../components/dashboard/Dashboard'
import { 
  BuildingOfficeIcon,
  UsersIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  PlayIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon
} from '@heroicons/react/24/outline'

const CompanyHomePage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [companyStats, setCompanyStats] = useState({
    totalRevenue: 0,
    totalApplications: 0,
    activeClients: 0,
    completedShows: 0,
    averageDealSize: 0,
    growthRate: 0,
  })

  useEffect(() => {
    loadCompanyStats()
  }, [])

  const loadCompanyStats = async () => {
    try {
      // Mock data - replace with actual API call
      const mockStats = {
        totalRevenue: 15750000,
        totalApplications: 1247,
        activeClients: 89,
        completedShows: 156,
        averageDealSize: 12630,
        growthRate: 18.5,
      }
      setCompanyStats(mockStats)
    } catch (error) {
      console.error('Error loading company stats:', error)
    }
  }

  const stats = [
    {
      label: 'Общий доход',
      value: `${companyStats.totalRevenue.toLocaleString('ru-RU')} ₽`,
      change: companyStats.growthRate,
      changeType: 'increase' as const,
    },
    {
      label: 'Всего заявок',
      value: companyStats.totalApplications.toLocaleString('ru-RU'),
      change: 12,
      changeType: 'increase' as const,
    },
    {
      label: 'Активных клиентов',
      value: companyStats.activeClients,
      change: 8,
      changeType: 'increase' as const,
    },
    {
      label: 'Завершенных шоу',
      value: companyStats.completedShows,
      change: 5,
      changeType: 'increase' as const,
    },
  ]

  const charts = [
    {
      type: 'line' as const,
      title: 'Доходы по месяцам',
      data: {
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
        datasets: [
          {
            label: 'Доход (₽)',
            data: [1200000, 1350000, 1420000, 1580000, 1650000, 1720000, 1680000, 1750000, 1820000, 1950000, 2100000, 2300000],
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
          },
        ],
      },
    },
    {
      type: 'bar' as const,
      title: 'Популярность шоу',
      data: {
        labels: ['Утреннее шоу', 'Дневные новости', 'Вечерний эфир', 'Ночной кинозал', 'Спортивный обзор'],
            datasets: [
          {
            label: 'Количество заявок',
            data: [45, 78, 156, 89, 67],
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
          },
        ],
      },
    },
  ]

  const features = [
    {
      icon: PlayIcon,
      title: 'Качественные шоу',
      description: 'Профессиональные программы с высокой аудиторией',
    },
    {
      icon: UsersIcon,
      title: 'Персональный подход',
      description: 'Индивидуальная работа с каждым клиентом',
    },
    {
      icon: ChartBarIcon,
      title: 'Подробная аналитика',
      description: 'Детальные отчеты по эффективности рекламы',
    },
    {
      icon: ClockIcon,
      title: 'Быстрое размещение',
      description: 'Оперативная обработка заявок и размещение',
    },
  ]

  const testimonials = [
    {
      name: 'Анна Петрова',
      company: 'ООО "Реклама+"',
      text: 'Отличное качество размещения рекламы. Наши продажи выросли на 40% после размещения в вечернем эфире.',
      rating: 5,
    },
    {
      name: 'Михаил Козлов',
      company: 'ИП "Торговый дом"',
      text: 'Профессиональный подход, быстрая обработка заявок. Рекомендую всем!',
      rating: 5,
    },
    {
      name: 'Елена Морозова',
      company: 'ООО "Стройка"',
      text: 'Понятная система, удобный интерфейс. Очень довольны результатом.',
      rating: 4,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Hero Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">
              Добро пожаловать в TV Company
            </h1>
            <p className="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto">
              Профессиональная система управления рекламой на телевидении. 
              Эффективные решения для вашего бизнеса с максимальным охватом аудитории.
            </p>
            <div className="flex justify-center space-x-4">
              <button className="btn-primary text-lg px-8 py-3">
                Начать работу
              </button>
              <button className="btn-outline text-lg px-8 py-3">
                Узнать больше
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-secondary-900 mb-4">
            Наши достижения
          </h2>
          <p className="text-lg text-secondary-600">
            Цифры, которые говорят сами за себя
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-secondary-600 mb-1">
                  {stat.label}
                </div>
                <div className={`text-xs font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.changeType === 'increase' ? '↗' : '↘'} {stat.change}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="mb-16">
          <Dashboard title="Статистика компании" charts={charts} stats={[]} />
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              Почему выбирают нас
            </h2>
            <p className="text-lg text-secondary-600">
              Преимущества нашей системы управления рекламой
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-secondary-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              Отзывы наших клиентов
            </h2>
            <p className="text-lg text-secondary-600">
              Что говорят о нас наши партнеры
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-secondary-700 mb-4 italic">
                  "{testimonial.text}"
                </p>
                <div>
                  <div className="font-semibold text-secondary-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-secondary-600">
                    {testimonial.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Готовы начать?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Присоединяйтесь к нашим клиентам и увеличьте эффективность рекламы
            </p>
            <div className="flex justify-center space-x-4">
              <button className="bg-white text-primary-600 hover:bg-primary-50 text-lg px-8 py-3 rounded-md font-medium transition-colors duration-200">
                Создать аккаунт
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg px-8 py-3 rounded-md font-medium transition-colors duration-200">
                Связаться с нами
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-secondary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                TV Company
              </h3>
              <p className="text-secondary-400">
                Профессиональная система управления рекламой на телевидении.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Продукт</h4>
              <ul className="space-y-2 text-secondary-400">
                <li><a href="#" className="hover:text-white">Возможности</a></li>
                <li><a href="#" className="hover:text-white">Цены</a></li>
                <li><a href="#" className="hover:text-white">Демо</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Поддержка</h4>
              <ul className="space-y-2 text-secondary-400">
                <li><a href="#" className="hover:text-white">Документация</a></li>
                <li><a href="#" className="hover:text-white">Контакты</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Компания</h4>
              <ul className="space-y-2 text-secondary-400">
                <li><a href="#" className="hover:text-white">О нас</a></li>
                <li><a href="#" className="hover:text-white">Карьера</a></li>
                <li><a href="#" className="hover:text-white">Новости</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-secondary-800 mt-8 pt-8 text-center text-secondary-400">
            <p>&copy; 2024 TV Company. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default CompanyHomePage
