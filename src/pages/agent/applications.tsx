import React from 'react'
import Layout from '../../components/layout/Layout'

const AgentApplicationsPage: React.FC = () => {
  return (
    <Layout role="agent">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-secondary-900">Заявки клиентов</h1>
        <p className="text-secondary-600">Страница-заглушка. Здесь будет таблица заявок с действиями.</p>
      </div>
    </Layout>
  )
}

export default AgentApplicationsPage

