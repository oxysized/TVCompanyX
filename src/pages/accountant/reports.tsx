import React from 'react'
import Layout from '../../components/layout/Layout'

const AccountantReportsPage: React.FC = () => {
  return (
    <Layout role="accountant">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-secondary-900">Отчеты бухгалтера</h1>
        <p className="text-secondary-600">Страница-заглушка. Здесь будет форма фильтров и экспорт.</p>
      </div>
    </Layout>
  )
}

export default AccountantReportsPage

