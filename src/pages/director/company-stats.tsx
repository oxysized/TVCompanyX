import React from 'react'
import Layout from '../../components/layout/Layout'

const DirectorCompanyStatsPage: React.FC = () => {
  return (
    <Layout role="director">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-secondary-900">Статистика компании</h1>
        <p className="text-secondary-600">Страница-заглушка. Здесь будут ключевые графики по компании.</p>
      </div>
    </Layout>
  )
}

export default DirectorCompanyStatsPage

