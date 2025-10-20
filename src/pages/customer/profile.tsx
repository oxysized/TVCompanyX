import React from 'react'
import Layout from '../../components/layout/Layout'

const CustomerProfilePage: React.FC = () => {
  return (
    <Layout role="customer">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-secondary-900">Профиль заказчика</h1>
        <p className="text-secondary-600">Страница-заглушка. Здесь будет форма редактирования профиля и реквизитов.</p>
      </div>
    </Layout>
  )
}

export default CustomerProfilePage

