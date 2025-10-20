import React from 'react'
import Layout from '../../components/layout/Layout'

const AdminUsersPage: React.FC = () => {
  return (
    <Layout role="admin">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-secondary-900">Учетные записи сотрудников</h1>
        <p className="text-secondary-600">Страница-заглушка. Здесь будет таблица пользователей и формы.</p>
      </div>
    </Layout>
  )
}

export default AdminUsersPage

