import React from 'react'
import Layout from '../../components/layout/Layout'
import Chat from '../../components/chat/Chat'

const CommercialChatPage: React.FC = () => {
  return (
    <Layout role="commercial">
      <div className="h-[70vh] card">
        <Chat roomId="commercial-agents" roomName="Чат с агентами" />
      </div>
    </Layout>
  )
}

export default CommercialChatPage

