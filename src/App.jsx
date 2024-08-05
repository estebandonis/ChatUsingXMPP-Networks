import { useEffect } from 'react'
import './App.css'
import { client } from '@xmpp/client'

function App() {

  useEffect(() => {
    const xmpp = client({
      service: 'ws://alumchat.lol:7070/ws/',
      domain: 'alumchat.lol',
      username: 'don21610',
      password: 'admin123',
    })

    xmpp.on('error', err => {
      console.error(err)
    })

    xmpp.on('error', (err) => {
      console.error('XMPP Error:', err);
    });

    xmpp.on('status', (status) => {
      console.log('XMPP Status:', status);
    });

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
