import React from 'react'
import Layout from '../../components/layout/Layout'

const AdminStatsPage: React.FC = () => {
  return (
    <Layout role="admin">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-secondary-900">Системная статистика</h1>
        <p className="text-secondary-600">Страница-заглушка. Здесь будут графики метрик системы.</p>
      </div>
    </Layout>
  )
}

export default AdminStatsPage

