import React from 'react'
import Layout from '../../components/layout/Layout'
import Chat from '../../components/chat/Chat'

const CustomerChatPage: React.FC = () => {
  return (
    <Layout role="customer">
      <div className="h-[70vh] card">
        <Chat roomId="customer-agent" roomName="Чат с агентом" />
      </div>
    </Layout>
  )
}

export default CustomerChatPage

