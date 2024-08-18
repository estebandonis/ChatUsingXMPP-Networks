import { useState, useEffect } from 'react';
import { client, xml } from '@xmpp/client';

const domain = 'alumchat.lol';
const service = 'ws://alumchat.lol:7070/ws/';

const XMPPChat = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [xmpp, setXmpp] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [groups, setGroups] = useState([]);
    const [status, setStatus] = useState('Offline');
    const [user, setUser] = useState('don21610');
    const [password, setPassword] = useState('admin123');
    const [recipient, setRecipient] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        console.log('Status: ', status);
    }, [status]);

    useEffect(() => {
        const xmppClient = client({
            service: service,
            domain: domain,
            username: user,
            password: password,
        });

        xmppClient.on('online', async (address) => {
            console.log('Connected as', address.toString());

            const rosterStanza = xml('iq', { type: 'get' }, xml('query', { xmlns: 'jabber:iq:roster' }));
            const rosterResult = await xmppClient.iqCaller.request(rosterStanza);

            // Process roster items
            const rosterItems = rosterResult.getChild('query').getChildren('item');
            const contactList = rosterItems.map(item => ({
                jid: item.attr('jid'),
                name: item.attr('name') || item.attr('jid'),
                status: 'Offline',
                presenceMessage: '',
                unread: false,
            }));
            setContacts(contactList);

            // Request groups
            const groupsStanza = xml('iq', { type: 'get', id: 'get-groups' }, xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' }));
            const groupsResult = await xmppClient.iqCaller.request(groupsStanza);
            console.log('Groups:', groupsResult.toString());

            // Process groups
            const groupItems = groupsResult.getChild('query').getChildren('item');
            const groupList = groupItems.map(item => ({
                jid: item.attr('jid'),
                name: item.attr('name') || item.attr('jid'),
            }));
            setGroups(groupList);

            // Request presence information for all contacts
            contactList.forEach(contact => {
                const presenceStanza = xml('presence', { to: contact.jid, type: 'subscribe' });
                xmppClient.send(presenceStanza);
            });

            await xmppClient.send(xml('presence'));
            setStatus('Online');
        });

        xmppClient.on('offline', () => {
            console.log('Connection has been closed');
        });

        // Set up message handler
        xmppClient.on('stanza', async (stanza) => {
            // console.log('Stanza:', stanza.toString());
            if (stanza.is('message') && stanza.getChild('body')) {
                const fromLong = stanza.attr('from');
                const from = fromLong.split('/')[0];
                const body = stanza.getChild('body')?.text();
                setMessages((prevMessages) => [...prevMessages, { from, body }]);
                setContacts(prevContacts => prevContacts.map(contact => contact.jid === from && contact.jid !== recipient ? { ...contact, unread: true } : contact));
            }

            // Handle presence stanzas
            else if (stanza.is('presence')) {
                const from = stanza.attr('from');
                const bareJid = from.split('/')[0];
                const type = stanza.attr('type');
                const show = stanza.getChild('show')?.text();
                const presenceMessage = stanza.getChildText('status') || '';
                updateContactStatus(bareJid, type ? type : show ? show : 'available', presenceMessage);
            }

            else if (stanza.is('iq')){
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

    const setStatusString = (status) => {
        if (status === 'unavailable') {
            return 'Offline'
        } else if (status === 'available') {
            return 'Online'
        } else if (status === 'away') {
            return 'Away'
        } else if (status === 'dnd') {
            return 'Busy'
        } else if (status === 'xa') {
            return 'Not available'
        }
    }

    const updateContactStatus = (jid, status, presenceMessage) => {
        status = setStatusString(status);
        setContacts(prevContacts =>
            prevContacts.map(contact =>
                contact.jid === jid ? { ...contact, status, presenceMessage } : contact
            )
        );
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (xmpp && inputMessage.trim()) {
            setMessages((prevMessages) => [...prevMessages, { from: user, body: inputMessage, to: recipient }]);
            const message = xml(
                'message',
                { type: 'chat', to: recipient },
                xml('body', {}, inputMessage)
            );
            xmpp.send(message);
            setInputMessage('');
        }
    };

    const setPresence = (status) => {
        setDropdownOpen(false);
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
            setStatus(setStatusString(status));
        }
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const settingRecipient = (jid) => {
        setRecipient(jid);
        setContacts(prevContacts => prevContacts.map(contact => contact.jid === jid  && contact.unread === true ? { ...contact, unread: false } : contact));
    }

    return (
        <div className="flex flex-col w-screen h-screen">
            <div className="flex p-4 bg-gray-800 text-white">
                <div className="w-1/4 flex justify-center items-center">
                    {status === 'Online' ?
                        <h2 className="text-green-500">Status: {status}</h2> :
                        status === 'Offline' ?
                            <h2 className="text-gray-500">Status: {status}</h2> :
                            status === 'Busy' ?
                                <h2 className="text-red-500">Status: {status}</h2> :
                                status === 'Away' ?
                                    <h2 className="text-orange-500">Status: {status}</h2> :
                                    <h2 className="text-blue-500">Status: {status}</h2>}
                    <div className="flex p-4 bg-gray-800 text-white">
                        <div className="relative text-left">
                            <button onClick={toggleDropdown} className="bg-gray-700 text-white px-4 py-2 rounded">
                                State
                            </button>
                            {dropdownOpen && (
                                <div
                                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                                    <div className="py-1" role="menu" aria-orientation="vertical"
                                         aria-labelledby="options-menu">
                                        <button onClick={() => setPresence('available')}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Online
                                        </button>
                                        <button onClick={() => setPresence('away')}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Away
                                        </button>
                                        <button onClick={() => setPresence('dnd')}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Do
                                            Not Disturb
                                        </button>
                                        <button onClick={() => setPresence('xa')}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Extended
                                            Away
                                        </button>
                                        <button onClick={() => setPresence('unavailable')}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Offline
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>

                    </div>
                </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
                    <div className="flex flex-col items-center w-1/4 pt-4 bg-gray-100 overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Contacts</h2>
                        {contacts.map((contact, index) => (
                            <div key={index} onClick={() => settingRecipient(contact.jid)} className="cursor-pointer w-full transition-all hover:bg-gray-800 hover:text-white p-2 border-2 rounded border-gray-800 overflow-x-auto">
                                {contact.name} {contact.unread && <span className="text-red-500">New</span>}
                                {contact.status === 'Online' ?
                                    <h2 className="text-green-500">Status: {contact.status}</h2> :
                                    contact.status === 'Offline' ?
                                        <h2 className="text-gray-500">Status: {contact.status}</h2> :
                                        contact.status === 'Busy'?
                                            <h2 className="text-red-500">Status: {contact.status}</h2> :
                                            contact.status === 'Away' ?
                                                <h2 className="text-orange-500">Status: {contact.status}</h2> :
                                                <h2 className="text-blue-500">Status: {contact.status}</h2>}
                            </div>
                        ))}
                    </div>
                <div className="flex flex-col flex-1 p-4 bg-white overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">Messages {recipient}</h2>
                    <div className="flex-1 overflow-y-auto mb-4">
                        {messages.filter(msg => msg.from === recipient || (msg.from === user && msg.to === recipient)).map((msg, index) => (
                            <div key={index} className="mb-2">
                                {
                                    msg.from === user ?
                                        <div className="w-full flex justify-end"><div className="w-auto bg-gray-300 text-black p-2 rounded-lg self-start max-w-xs"><strong>You: </strong>{msg.body}</div></div>
                                        : <div className="w-full flex justify-start"><div className="w-auto bg-blue-500 text-white p-2 rounded-lg self-center max-w-xs"><strong>{msg.from}: </strong>{msg.body}</div></div>
                                }
                            </div>
                        ))}
                    </div>
                    <form onSubmit={sendMessage} className="flex">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            className="flex-1 border border-gray-400 p-2 rounded-l"
                        />
                        <button type="submit" className="bg-blue-500 text-white p-2 rounded-r">Send</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default XMPPChat;
