import React from 'react'
import Layout from '../../components/layout/Layout'

const AdminLogsPage: React.FC = () => {
  return (
    <Layout role="admin">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-secondary-900">Логи сервера</h1>
        <p className="text-secondary-600">Страница-заглушка. Здесь будет таблица логов и фильтры.</p>
      </div>
    </Layout>
  )
}

export default AdminLogsPage

