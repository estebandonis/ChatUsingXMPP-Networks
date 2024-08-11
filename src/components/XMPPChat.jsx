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
        console.log('Contacts:', contacts);
        contacts.forEach(contact => {
            const presenceStanza = xml('presence', { to: contact.jid, type: 'subscribe' });
            xmpp.send(presenceStanza);
        });
    }, [contacts]);

    useEffect(() => {
        const xmppClient = client({
            service: 'ws://alumchat.lol:7070/ws/',
            domain: 'alumchat.lol',
            username: user,
            password: 'admin123',
            resource: 'web',
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

            const messageLogStanza = xml('iq', { type: 'get', id: 'message-log' }, xml('query', { xmlns: 'urn:xmpp:mam:2' }));
            const result = await xmpp.iqCaller.request(messageLogStanza);
            const messages = result.getChild('fin').getChildren('result').map(result => {
                const message = result.getChild('forwarded').getChild('message');
                return {
                    from: message.attr('from'),
                    body: message.getChildText('body'),
                };
            });
            console.log('Messages:', messages);
            setMessages(messages);

            // Request presence information for all contacts
            contactList.forEach(contact => {
                const presenceStanza = xml('presence', { to: contact.jid, type: 'subscribe' });
                xmppClient.send(presenceStanza);
            });
        });

        xmppClient.on('offline', () => {
            console.log('Connection has been closed');
        });

        // Set up message handler
        xmppClient.on('stanza', async (stanza) => {
            // console.log('Stanza:', stanza.toString());
            if (stanza.is('message') && stanza.getChild('body')) {
                console.log('Message Stanza:', stanza.toString());

                const fromLong = stanza.attr('from');
                const from = fromLong.split('/')[0];
                const body = stanza.getChild('body')?.text();
                console.log('Message:', from, body);
                setMessages((prevMessages) => [...prevMessages, { from, body }]);
            }

            // Handle presence stanzas
            if (stanza.is('presence')) {
                console.log('Presence Stanza:', stanza.toString());
                const from = stanza.attr('from');
                const bareJid = from.split('/')[0];
                const type = stanza.attr('type');
                const show = stanza.getChild('show')?.text();
                console.log('Presence:', bareJid, type, show);
                console.log('Contacts in presence:', contacts);
                updateContactStatus(bareJid, type ? type : show ? show : 'online');
            }

            if (stanza.is('iq')){
                console.log('IQ:', stanza.toString());
            }
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
        console.log('Updating contact status:', jid, status);
        console.log('Contacts:', contacts);
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
            if (status === 'unavailable') {
                presenceStanza = xml('presence', { type: 'unavailable' });
            } else if (status === 'available') {
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
                <h2>Status: {status}</h2>
            </div>
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

                <button onClick={() => setPresence('available')}>Available</button>
                <button onClick={() => setPresence('away')}>Away</button>
                <button onClick={() => setPresence('dnd')}>Do Not Disturb</button>
                <button onClick={() => setPresence('xa')}>Extended Away</button>
                <button onClick={() => setPresence('unavailable')}>Offline</button>
            </form>
        </div>
    );
};

export default XMPPChat;
