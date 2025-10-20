import React from 'react'
import Layout from '../../components/layout/Layout'

const CommercialSchedulePage: React.FC = () => {
  return (
    <Layout role="commercial">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-secondary-900">Расписание шоу</h1>
        <p className="text-secondary-600">Страница-заглушка. Здесь будет форма создания расписания и таблица.</p>
      </div>
    </Layout>
  )
}

export default CommercialSchedulePage

