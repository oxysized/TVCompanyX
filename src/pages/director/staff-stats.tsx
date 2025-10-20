import React from 'react'
import Layout from '../../components/layout/Layout'

const DirectorStaffStatsPage: React.FC = () => {
  return (
    <Layout role="director">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-secondary-900">Статистика сотрудников</h1>
        <p className="text-secondary-600">Страница-заглушка. Здесь будут таблицы и графики по KPI.</p>
      </div>
    </Layout>
  )
}

export default DirectorStaffStatsPage

