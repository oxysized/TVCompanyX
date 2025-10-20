import React from 'react'
import Layout from '../../components/layout/Layout'

const AdminSettingsPage: React.FC = () => {
  return (
    <Layout role="admin">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-secondary-900">Настройки системы</h1>
        <p className="text-secondary-600">Страница-заглушка. Здесь будут параметры конфигурации.</p>
      </div>
    </Layout>
  )
}

export default AdminSettingsPage

