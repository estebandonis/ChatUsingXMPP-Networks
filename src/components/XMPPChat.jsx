import { useState, useEffect } from 'react';
import { client, xml } from '@xmpp/client';

const XMPPChat = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [xmpp, setXmpp] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [status, setStatus] = useState('offline');
    const [user, setUser] = useState('don21610');
    const [password, setPassword] = useState('admin123');

    useEffect(() => {
        const xmppClient = client({
            service: 'ws://alumchat.lol:7070/ws/',
            domain: 'alumchat.lol',
            username: user,
            password: 'admin123',
        });

        // Set up message handler
        xmppClient.on('stanza', async (stanza) => {
            console.log('Stanza:', stanza.toString());
            if (stanza.is('message') && stanza.getChild('body')) {
                // const { from, body } = stanza.attrs;

                const from = stanza.attr('from');
                const body = stanza.attr('body');
                console.log('Message:', from, body);
                setMessages((prevMessages) => [...prevMessages, { from, body }]);
            }

            // Handle presence stanzas
            if (stanza.is('presence')) {
                const from = stanza.attr('from');
                const type = stanza.attr('type');
                const show = stanza.getChild('show')?.text();
                console.log('Presence:', from, type, show);
                updateContactStatus(from, type);
            }
        });

        xmppClient.on('online', async (address) => {
            await xmppClient.send(xml('presence'));

            console.log('Connected as', address.toString());
            setStatus('online');
            
            const rosterStanza = xml('iq', { type: 'get' }, xml('query', { xmlns: 'jabber:iq:roster' }));
            const rosterResult = await xmppClient.iqCaller.request(rosterStanza);

            // Process roster items
            const rosterItems = rosterResult.getChild('query').getChildren('item');
            const contactList = rosterItems.map(item => ({
                jid: item.attr('jid'),
                name: item.attr('name') || item.attr('jid'),
                status: 'offline',
            }));
            setContacts(contactList);

            // Request presence information for all contacts
            contactList.forEach(contact => {
                const presenceStanza = xml('presence', { to: contact.jid });
                xmppClient.send(presenceStanza);
            });
        });

        xmppClient.on('offline', () => {
            console.log('Connection has been closed');
        });

        xmppClient.start().catch(console.error);
        setXmpp(xmppClient);

        return () => {
            xmppClient.stop().catch(console.error);
        };
    }, []);

    useEffect(() => {
        console.log('Messages:', messages);
    }, [messages]);

    const updateContactStatus = (jid, status) => {
        setContacts(prevContacts =>
            prevContacts.map(contact =>
                contact.jid === jid ? { ...contact, status } : contact
            )
        );
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (xmpp && inputMessage.trim()) {
            const message = xml(
                'message',
                { type: 'chat', to: 'osc21611@alumchat.lol' },
                xml('body', {}, inputMessage)
            );
            xmpp.send(message);
            setInputMessage('');
        }
    };

    const setPresence = (status) => {
        if (xmpp) {
            let presenceStanza;
            if (status === 'offline') {
                presenceStanza = xml('presence', { type: 'unavailable' });
            } else if (status === 'online') {
                presenceStanza = xml('presence');
            }else {
                presenceStanza = xml('presence', {}, xml('show', {}, status));
            }
            xmpp.send(presenceStanza);
            setStatus(status);
        }
    };

    return (
        <div>
            <div>
                <h2>Contacts</h2>
                {contacts.map((contact, index) => (
                    <div key={index}>
                        {contact.name} - {contact.status}
                    </div>
                ))}
            </div>
            <div>
                <h2>Messages</h2>
                {messages.map((msg, index) => (
                    <div key={index}>
                        <strong>{msg.from}:</strong> {msg.body}
                    </div>
                ))}
            </div>
            <form onSubmit={sendMessage}>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                />
                <button type="submit">Send</button>

                <button onClick={() => setPresence('online')}>Available</button>
                <button onClick={() => setPresence('away')}>Away</button>
                <button onClick={() => setPresence('dnd')}>Do Not Disturb</button>
                <button onClick={() => setPresence('xa')}>Extended Away</button>
                <button onClick={() => setPresence('offline')}>Offline</button>
            </form>
        </div>
    );
};

export default XMPPChat;
