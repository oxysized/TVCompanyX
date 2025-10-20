import React from 'react'
import Layout from '../../components/layout/Layout'
import Chat from '../../components/chat/Chat'

const AgentChatPage: React.FC = () => {
  return (
    <Layout role="agent">
      <div className="grid grid-cols-1 gap-6">
        <div className="h-[70vh] card">
          <Chat roomId="agent-customers" roomName="Чат с клиентами" />
        </div>
        <div className="h-[70vh] card">
          <Chat roomId="agent-commercial" roomName="Чат с коммерческим отделом" />
        </div>
      </div>
    </Layout>
  )
}

export default AgentChatPage

