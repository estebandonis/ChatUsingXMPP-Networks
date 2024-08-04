import { useEffect, useState } from 'react'
import './App.css'

import { client, xml } from '@xmpp/client'

function App() {

  useEffect(() => {
    const xmpp = client({
      service: 'ws://alumchat.lol:7070/ws/',
      domain: 'alumchat.lol',
      username: 'don21610',
      password: 'admin123',
      resource: '',
      tlsOptions: {
        rejectUnauthorized: false
      },
    })

    xmpp.on('error', err => {
      console.error(err)
    })

    xmpp.on('offline', () => {
      console.log('offline')
    })

    xmpp.on('online', () => {
      console.log('online')
    })

    xmpp.start().catch(console.error)

    xmpp.stop().catch(console.error)

  }, [])

  return (
    <>
      <h1>XMPP</h1>

    </>
  )
}

export default App
