import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { logout } from '../../redux/slices/authSlice'
import { toggleSidebar } from '../../redux/slices/uiSlice'
import { 
  Bars3Icon, 
  BellIcon, 
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

const Header: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { sidebarOpen } = useSelector((state: RootState) => state.ui)

  const handleLogout = () => {
    dispatch(logout())
  }

  const toggleSidebarHandler = () => {
    dispatch(toggleSidebar())
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames: { [key: string]: string } = {
      customer: 'Заказчик',
      agent: 'Рекламный агент',
      commercial: 'Коммерческий отдел',
      accountant: 'Бухгалтер',
      admin: 'ИТ-администратор',
      director: 'Директор',
    }
    return roleNames[role] || role
  }

  return (
    <header className="bg-white shadow-sm border-b border-secondary-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebarHandler}
            className="p-2 rounded-md text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Toggle sidebar"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold text-secondary-900">
              TV Company Ad System
            </h1>
            <p className="text-sm text-secondary-600">
              {user && getRoleDisplayName(user.role)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 rounded-md text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 relative">
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="relative group">
            <button className="flex items-center space-x-2 p-2 rounded-md text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <UserCircleIcon className="h-8 w-8" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-secondary-900">
                  {user?.name}
                </p>
                <p className="text-xs text-secondary-600">
                  {user?.email}
                </p>
              </div>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <button className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100">
                <Cog6ToothIcon className="h-4 w-4 mr-3" />
                Настройки
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                Выйти
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
