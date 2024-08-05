import { useEffect, useState } from 'react'
import './App.css'
import { client, xml } from '@xmpp/client'

function App() {
  const [contacts, setContacts] = useState([])

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

    xmpp.on('online', async (address) => {
      console.log('Connected as', address.toString());

      // // Request the roster
      // const rosterIQ = xml('iq', { type: 'get', id: 'roster1' },
      //   xml('query', { xmlns: 'jabber:iq:roster' })
      // );

      const rosterIQ = xml(
        'iq',
        { type: 'get', id: 'roster_1' },
        xml('query', { xmlns: 'jabber:iq:roster' })
      );

      try {
        const response = await xmpp.send(rosterIQ);
        console.log(response);
        // const items = response.getChild('query').getChildren('item');
        // const contactsList = items.map(item => ({
        //   jid: item.attrs.jid,
        //   name: item.attrs.name,
        //   subscription: item.attrs.subscription,
        // }));
        // setContacts(contactsList);

        const result = await xmpp.iqCaller.request(rosterIQ);
        const contacts = result.getChild('query').getChildren('item');

        console.log('Contacts:');
        contacts.forEach(contact => {
          console.log(`- JID: ${contact.attrs.jid}, Name: ${contact.attrs.name || 'N/A'}`);
        });
          // setContacts(contacts);
      } catch (err) {
        console.error('Failed to fetch roster:', err);
      }
    });

    xmpp.start().catch(console.error)

    xmpp.stop().catch(console.error)

  }, [])

  return (
    <>
      <h1>XMPP</h1>
      <ul>
        {contacts.map(contact => (
          <li key={contact.jid}>
            {contact.name || contact.jid}
          </li>
        ))}
      </ul>
    </>
  )
}

export default App
