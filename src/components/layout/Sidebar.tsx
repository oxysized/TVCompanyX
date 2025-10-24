import React from 'react'
import { useSelector } from 'react-redux'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { RootState } from '../../redux/store'
import {
  HomeIcon,
  CalculatorIcon,
  DocumentTextIcon,
  ClockIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  CogIcon,
  BellIcon,
  UsersIcon,
  ServerIcon,
  PresentationChartBarIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'

interface SidebarProps {
  role: string
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const router = useRouter()
  const { sidebarOpen } = useSelector((state: RootState) => state.ui)
  const { rooms } = useSelector((state: RootState) => state.chat)
  
  // Calculate total unread messages
  const totalUnread = rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0)

  const getNavigationItems = (userRole: string) => {
    const baseItems = [
      {
        name: 'Главная',
        href: `/${userRole}`,
        icon: HomeIcon,
      },
    ]

    switch (userRole) {
      case 'customer':
        return [
          ...baseItems,
          {
            name: 'Калькулятор стоимости',
            href: `/${userRole}/calculator`,
            icon: CalculatorIcon,
          },
          {
            name: 'Подать заявку',
            href: `/${userRole}/application`,
            icon: DocumentTextIcon,
          },
          {
            name: 'Мои заявки',
            href: `/${userRole}/applications`,
            icon: ClockIcon,
          },
          {
            name: 'Профиль',
            href: `/${userRole}/profile`,
            icon: UserIcon,
          },
          {
            name: 'Чат с агентом',
            href: `/${userRole}/chat`,
            icon: ChatBubbleLeftRightIcon,
          },
        ]

      case 'agent':
        return [
          ...baseItems,
          {
            name: 'Заявки клиентов',
            href: `/${userRole}/applications`,
            icon: ClipboardDocumentListIcon,
          },
          {
            name: 'Комиссии',
            href: `/${userRole}/commissions`,
            icon: ChartBarIcon,
          },
          {
            name: 'Отчеты',
            href: `/${userRole}/reports`,
            icon: DocumentArrowDownIcon,
          },
          {
            name: 'Чат с клиентами',
            href: `/${userRole}/chat`,
            icon: ChatBubbleLeftRightIcon,
            badge: totalUnread > 0 ? totalUnread : undefined,
          },
        ]

      case 'commercial':
        return [
          ...baseItems,
          {
            name: 'Управление шоу',
            href: `/${userRole}/shows`,
            icon: PresentationChartBarIcon,
          },
          {
            name: 'Расписание рекламы',
            href: `/${userRole}/ad-schedule`,
            icon: CalendarIcon,
          },
          {
            name: 'Расписание шоу',
            href: `/${userRole}/schedule`,
            icon: ClockIcon,
          },
          {
            name: 'Заявки от агентов',
            href: `/${userRole}/applications`,
            icon: ClipboardDocumentListIcon,
          },
          {
            name: 'Чат с агентами',
            href: `/${userRole}/chat`,
            icon: ChatBubbleLeftRightIcon,
          },
        ]

      case 'accountant':
        return [
          ...baseItems,
          {
            name: 'Одобренные заявки',
            href: `/${userRole}/applications`,
            icon: ClipboardDocumentListIcon,
          },
          {
            name: 'Отчеты',
            href: `/${userRole}/reports`,
            icon: DocumentArrowDownIcon,
          },
          {
            name: 'Доходы',
            href: `/${userRole}/revenue`,
            icon: CurrencyDollarIcon,
          },
          {
            name: 'Уведомления',
            href: `/${userRole}/notifications`,
            icon: BellIcon,
          },
        ]

      case 'admin':
        return [
          ...baseItems,
          {
            name: 'Учетные записи',
            href: `/${userRole}/users`,
            icon: UsersIcon,
          },
          {
            name: 'Статистика',
            href: `/${userRole}/stats`,
            icon: ChartBarIcon,
          },
          {
            name: 'Логи сервера',
            href: `/${userRole}/logs`,
            icon: ServerIcon,
          },
          {
            name: 'Настройки системы',
            href: `/${userRole}/settings`,
            icon: CogIcon,
          },
        ]

      case 'director':
        return [
          ...baseItems,
          {
            name: 'Статистика сотрудников',
            href: `/${userRole}/staff-stats`,
            icon: PresentationChartBarIcon,
          },
          {
            name: 'Комиссии агентов',
            href: `/${userRole}/commissions`,
            icon: CurrencyDollarIcon,
          },
          {
            name: 'Отчеты по клиентам',
            href: `/${userRole}/client-reports`,
            icon: DocumentArrowDownIcon,
          },
          {
            name: 'Статистика компании',
            href: `/${userRole}/company-stats`,
            icon: BuildingOfficeIcon,
          },
        ]

      default:
        return baseItems
    }
  }

  const navigationItems = getNavigationItems(role)

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg lg:static lg:inset-0">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-16 px-4 bg-primary-600">
          <h2 className="text-xl font-bold text-white">Меню</h2>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = router.pathname === item.href
            const isChatLink = item.href.includes('/chat')
            const showBadge = isChatLink && totalUnread > 0
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                    : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                }`}
              >
                <div className="flex items-center">
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </div>
                {showBadge && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {totalUnread}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-secondary-200">
          <div className="text-xs text-secondary-500 text-center">
            TV Company Ad System v1.0.0
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
