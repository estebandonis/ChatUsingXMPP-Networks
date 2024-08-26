import {useState, useEffect} from 'react';
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { client, xml } from '@xmpp/client';
import {Notification} from "../components/index.jsx";

const domain = 'alumchat.lol';
const service = 'ws://alumchat.lol:7070/ws/';

const XMPPChat = () => {
    const navigate = useNavigate()
    const location = useLocation();
    const { username: user, password } = location.state || {};

    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [xmpp, setXmpp] = useState(null);
    const [files, setFiles] = useState([]);
    const [file, setFile] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [groups, setGroups] = useState([]);
    const [addedGroups, setAddedGroups] = useState([]);
    const [status, setStatus] = useState('Offline');
    const [recipient, setRecipient] = useState('');
    const [presenceMessage, setPresenceMessage] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [PresenceMessageMenu, setPresenceMessageMenu] = useState(false);
    const [contactInfo, setContactInfo] = useState(false);
    const [sendInvitationMenu, setSendInvitationMenu] = useState(false);
    const [invitationInput, setInvitationInput] = useState('');
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [invitations, setInvitations] = useState([]);
    const [activeGroup, setActiveGroup] = useState('');

    const showNotification = (message, type) => {
        setNotification({ message, type });
    };

    const handleClose = () => {
        setNotification({ message: '', type: '' });
    };

    useEffect(() => {
        const xmppClient = client({
            service: service,
            domain: domain,
            username: user,
            password: password,
        });

        xmppClient.on('online', async (address) => {
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
            const groupsStanza = xml('iq', { to: 'conference.alumchat.lol', type: 'get' }, xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' }));
            const groupsResult = await xmppClient.iqCaller.request(groupsStanza);

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
                if (stanza.attr('type') === 'chat') {
                    const fromLong = stanza.attr('from');
                    const from = fromLong.split('/')[0];
                    const body = stanza.getChild('body')?.text();
                    setMessages((prevMessages) => [...prevMessages, {from, body}]);
                    setContacts(prevContacts => prevContacts.map(contact => contact.jid === from && contact.jid !== recipient ? {
                        ...contact,
                        unread: true
                    } : contact));
                    setNotification({message: 'New message from ' + from, type: 'info'});
                } else if (stanza.attr('type') === 'groupchat') {
                    const from = stanza.attr('from');
                    const [ groupJid, sender ] = from.split('/');

                    let tempGroups;

                    await setGroups(prevGroupsMessage => {
                        tempGroups = prevGroupsMessage;
                        return prevGroupsMessage;
                    })

                    // Wait for the state update to complete
                    await new Promise(resolve => setTimeout(resolve, 0));

                    let foundGroup

                    if (tempGroups){
                        foundGroup = tempGroups.find(group => group.jid === groupJid)
                    }

                    if (foundGroup) {
                        const body = stanza.getChild('body')?.text();
                        setMessages((prevMessages) => [...prevMessages, {in: groupJid, from: sender, body: body}]);
                        setNotification({message: 'New message from group ' + foundGroup.name, type: 'info'});
                    }
                }
            }

            // Handle presence stanzas
            else if (stanza.is('presence')) {
                const from = stanza.attr('from');
                const bareJid = from.split('/')[0];
                const type = stanza.attr('type');
                let tempGroups;

                setGroups(prevGroupPresence => {
                    tempGroups = prevGroupPresence;
                    return prevGroupPresence;
                });

                // Wait for the state update to complete
                await new Promise(resolve => setTimeout(resolve, 0));

                let foundGroup

                if (tempGroups){
                    foundGroup = tempGroups.find(group => group.jid === bareJid)
                }

                if (type === 'subscribed') {
                    setNotification({ message: from + ' has accepted your request', type: 'success' });
                } else if (type === 'subscribe') {
                    setNotification({ message: from + ' wants to add you to their contacts', type: 'info' });
                    setInvitations(prevInvitations => [...prevInvitations, from]);
                } else if (foundGroup){
                    const [ groupJid, sender ] = from.split('/');
                    const name = stanza.attr('name')

                    let addedGro;

                    setAddedGroups(prevGroupsAdded => {
                        addedGro = prevGroupsAdded;
                        return prevGroupsAdded;
                    })

                    // Wait for the state update to complete
                    await new Promise(resolve => setTimeout(resolve, 0));

                    if (!addedGro.find(group => group.jid === groupJid)) {
                        const tempGroup = {
                            jid: foundGroup.jid,
                            name: foundGroup.name,
                            unread: false,
                        }

                        setAddedGroups(prevGroups => [...prevGroups, tempGroup])
                    }
                } else {
                    const show = stanza.getChild('show')?.text();
                    const presenceMessage = stanza.getChildText('status') || '';
                    updateContactStatus(bareJid, type ? type : show ? show : 'available', presenceMessage);
                }
            }

            else if (stanza.is('iq')){
                if (stanza.attr('type') === 'result' && stanza.attr('from') === 'httpfileupload.alumchat.lol'){

                    await handleFileSend(stanza, xmppClient);
                }
            }
        });

        xmppClient.start().catch(console.error);
        setXmpp(xmppClient);

        return () => {
            xmppClient.stop().catch(console.error);
        };
    }, []);


    const handleFileSend = async (stanza, xmppClient) => {
        const slot = stanza.getChild('slot')
        const putUrl = slot.getChild('put').attr('url')
        const getUrl = slot.getChild('get').attr('url')
        const confirmationId = stanza.attr('id')

        let fileToUpload;

        // Use a callback to get the latest state and find the file to upload
        setFiles(currentFiles => {
            fileToUpload = currentFiles.find(upload => upload.id === confirmationId);

            return currentFiles;
        });

        // Wait for the state update to complete
        await new Promise(resolve => setTimeout(resolve, 0));

        if (fileToUpload === undefined || fileToUpload === null) {
            console.error("File not found");
        }

        try {

            const response = await fetch(putUrl, {
                method: "PUT",
                body: fileToUpload.data,
                headers: {
                    "Content-Type": fileToUpload.data.type,
                    "Content-Length": fileToUpload.data.size.toString(),
                },
            });

            if (!response.ok) {
                console.error(`Failed to upload file: ${response.statusText}`);
                return
            }

            // Send the message with the file URL
            const messageStanza = xml(
                'message',
                { to: fileToUpload.to, type: 'chat' },
                xml('body', {}, getUrl)
            );

            xmppClient.send(messageStanza);

            setMessages((prevMessages) => [...prevMessages, { from: user, body: getUrl, to: fileToUpload.to }]);

            console.log("File uploaded and message sent successfully");
        } catch (error) {
            console.error("Error uploading file or sending message:", error);
        }
    }

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

    const sendMessage = (messageToSend) => {
        if (xmpp && messageToSend.trim()) {
            if (activeGroup === '' && contacts.find(contact => contact.jid === recipient).unread === true){
                setContacts(prevContacts => prevContacts.map(contact => contact.jid === recipient ? { ...contact, unread: false } : contact));
            }
            setMessages((prevMessages) => [...prevMessages, { from: user, body: messageToSend, to: recipient }]);
            if (activeGroup === ''){
                const message = xml(
                    'message',
                    { type: 'chat', to: recipient},
                    xml('body', {}, messageToSend)
                );
                sendStanza(message);
            } else {
                const message = xml(
                    'message',
                    { to: activeGroup, type: 'groupchat' },
                    xml('body', {}, messageToSend)
                )
                sendStanza(message);
            }
        }
    }

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

            sendStanza(presenceStanza);
            setStatus(setStatusString(status));
        }
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const sendInvitation = (jid) => {
        setSendInvitationMenu(false);
        const stanza = xml('presence', { to: jid, type: 'subscribe' });
        sendStanza(stanza)
    }

    const settingRecipient = (jid) => {
        setActiveGroup('')
        setRecipient(jid);
        setContacts(prevContacts => prevContacts.map(contact => contact.jid === jid  && contact.unread === true ? { ...contact, unread: false } : contact));
    }

    const settingGroup = (name) => {
        setActiveGroup(name);
        setRecipient(name);
        setAddedGroups(prevGroups => prevGroups.map(group => group.name === name && group.unread === true ? { ...group, unread: false } : group));
    }

    const sendPresenceMessage = () => {
        setPresenceMessageMenu(false);
        const presenceStanza = xml('presence', {}, xml('status', {}, presenceMessage));
        sendStanza(presenceStanza);
    }

    const sendStanza = (stanza) => {
        xmpp.send(stanza);
    }

    const sendFile = () => {
        const newFile = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            data: file,
            to: recipient
        }

        setFiles((previousFiles) => [...previousFiles, newFile]);

        const message = xml(
            'iq',
            {to: 'httpfileupload.alumchat.lol', type: 'get', id: newFile.id},
            xml(
                'request',
                { xmlns: 'urn:xmpp:http:upload:0', filename: newFile.name, size: newFile.size, 'content-type': newFile.type }
            )
        )
        xmpp.send(message);
        setFile(null);
    };

    const acceptInvitation = (jid) => {
        if (xmpp) {
            const presenceStanza = xml('presence', { to: jid, type: 'subscribed' });
            xmpp.send(presenceStanza);
            showNotification(`${jid} has been added to your contacts`, 'success');
            setInvitations(prevInvitations => prevInvitations.filter(invitation => invitation !== jid));
        }
        setSendInvitationMenu(false);
    };

    const ignoreInvitation = (jid) => {
        setInvitations(prevInvitations => prevInvitations.filter(invitation => invitation !== jid));
        showNotification(`You have ignored ${jid}'s request`, 'info');
        setSendInvitationMenu(false);
    }

    const deleteAccount = async () => {
        const response = await xmpp.iqCaller.request(
            xml(
                'iq',
                { type: 'set' },
                xml('query', { xmlns: 'jabber:iq:register' }, xml('remove'))
            )
        )

        if (response.attrs.type === 'result') {
            xmpp.stop()
        }
        console.log(response.toString)
    }

    const closeCon = async () => {
        console.log("Entered in close")
        await xmpp.stop().catch(console.error);
    }

    const checkForURL = (message) => {
        const urlRegex = /http/g;
        const urlRegex2 = message.match(urlRegex);
        console.log("Contiene regex: ", urlRegex2)
        return urlRegex2
    }

    const handleForm = async (e) => {
        e.preventDefault();

        if (xmpp && file !== null){
            await sendFile()
        } else {
            sendMessage(inputMessage);
            setInputMessage('');
        }
    };

    const joinGroup = async () => {
        const group = groups.find(group => group.name === invitationInput);
        console.log(invitationInput)
        if (group){
            const stanza = xml('presence', { to: group.jid + '/' + user }, xml(
                "x",
                { xmlns: "http://jabber.org/protocol/muc" },
                xml("history", { maxstanzas: "20" }) // Request last 20 messages
            ));
            sendStanza(stanza);
        } else {
            setNotification({ message: 'No group with name: ' + invitationInput + ' found', type: 'error' });
        }
    }

    const createGroup = async () => {
        const roomJid = `${invitationInput}@conference.alumchat.lol`;

        // Create the room
        const presenceStanza = xml(
            "presence",
            { to: `${roomJid}/${user}` },
            xml("x", { xmlns: "http://jabber.org/protocol/muc" })
        );
        sendStanza(presenceStanza);

        // Configure the room
        const configureIQ = xml(
            "iq",
            { to: roomJid, type: "set", id: "config1" },
            xml(
                "query",
                { xmlns: "http://jabber.org/protocol/muc#owner" },
                xml(
                    "x",
                    { xmlns: "jabber:x:data", type: "submit" },
                    xml(
                        "field",
                        { var: "FORM_TYPE" },
                        xml("value", {}, "http://jabber.org/protocol/muc#roomconfig")
                    ),
                    xml(
                        "field",
                        { var: "muc#roomconfig_roomname" },
                        xml("value", {}, invitationInput)
                    ),
                    xml(
                        "field",
                        { var: "muc#roomconfig_roomdesc" },
                        xml("value", {}, '')
                    ),
                    xml(
                        "field",
                        { var: "muc#roomconfig_publicroom" },
                        xml("value", {}, "1")
                    ),
                    xml(
                        "field",
                        { var: "muc#roomconfig_persistentroom" },
                        xml("value", {}, "1")
                    ),
                    xml(
                        "field",
                        { var: "muc#roomconfig_membersonly" },
                        xml("value", {}, "0")
                    ),
                    xml(
                        "field",
                        { var: "muc#roomconfig_allowinvites" },
                        xml("value", {}, "1")
                    )
                )
            )
        );

        sendStanza(configureIQ);

        const groupsStanza = xml('iq', { to: 'conference.alumchat.lol', type: 'get' }, xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' }));
        const groupsResult = await xmpp.iqCaller.request(groupsStanza);

        // Process groups
        const groupItems = groupsResult.getChild('query').getChildren('item');
        const groupList = groupItems.map(item => ({
            jid: item.attr('jid'),
            name: item.attr('name') || item.attr('jid'),
        }));
        setGroups(groupList);

        await joinGroup
    }

    useEffect(() => {
        console.log("Groups", groups)
    }, [groups])

    return (
        <div className="flex flex-col w-screen h-screen">
            {notification.message && (
                <Notification message={notification.message} type={notification.type} onClose={handleClose} />
            )}
            <div className="flex bg-gray-800 text-white">
                <div className="w-1/4 flex-col justify-center items-center">
                    {contactInfo ? <div
                        className="flex flex-col justify-center h-28 text-white p-4 pt-4 items-start rounded text-sm overflow-x-hidden text-start overflow-y-scroll no-scrollbar">
                        <p><strong>Contact Info:</strong></p>
                        <p><strong>Email:</strong> {recipient}</p>
                        <p><strong>Username:</strong> {contacts.filter(contact => contact.jid === recipient).map(contact => {
                            return contact.name
                        })}</p>
                        <p><strong>Status:</strong> {contacts.filter(contact => contact.jid === recipient).map(contact => {
                            return contact.status
                        })}</p>
                        <p className="text-wrap"><strong>Presence:</strong> {contacts.filter(contact => contact.jid === recipient).map(contact => {
                            return contact.presenceMessage
                        })}</p>
                    </div> : null}
                </div>
                <div className="w-3/4 flex justify-center items-center align-middle">
                    <div className="w-1/3">
                    <div className="flex justify-center items-center">
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
                                    <button onClick={toggleDropdown}
                                            className="bg-gray-700 text-white px-4 py-2 rounded">
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
                        </div>
                    </div>
                    <div className="w-2/3 flex justify-evenly">
                        <div className="flex-col">
                            <div onClick={() => {setPresenceMessageMenu(!PresenceMessageMenu)}}>
                                <h2>Presence Message:</h2>
                                <h2 className="text-wrap overflow-x-hidden">{presenceMessage}</h2>
                            </div>
                            {PresenceMessageMenu ? <div className="absolute bg-black p-10 flex justify-center items-center rounded-3xl">
                                <textarea
                                    placeholder="Empty"
                                    value={presenceMessage}
                                    onChange={(e) => setPresenceMessage(e.target.value)}
                                    className="border h-16 px-1 rounded text-gray-500"/>
                                <button className="bg-gray-700 text-white h-8 px-2 rounded" onClick={sendPresenceMessage}>Send
                                </button>
                            </div> : null}
                        </div>
                        <div>
                            <button className="bg-gray-700 text-white h-8 px-2 rounded" onClick={ async() => {
                                await closeCon()
                                navigate('/')
                            }}>Logout
                            </button>
                            <button className="bg-gray-700 text-white h-8 px-2 rounded" onClick={async() => {
                                await deleteAccount()
                                navigate('/')
                            }}>
                                Unregister
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
                <div className="flex flex-col items-center w-1/4 pt-4 bg-gray-100 overflow-y-auto">
                    <div className="flex justify-evenly items-center">
                        <h2 className="text-xl font-bold">Chats</h2>
                    </div>
                    {contacts.map((contact, index) => (
                        <div key={index} onClick={() => settingRecipient(contact.jid)}
                             className="cursor-pointer w-full transition-all hover:bg-gray-800 hover:text-white p-2 border-2 rounded border-gray-800 overflow-x-auto flex flex-col justify-center items-center">
                            <p onClick={() => {setContactInfo(true)}} className="w-fit hover:border-blue-600 hover:text-blue-500">{contact.name}</p>
                            {contact.unread && <span className="text-red-500">New</span>}
                            {contact.status === 'Online' ?
                                <h2 className="text-green-500">Status: {contact.status}</h2> :
                                contact.status === 'Offline' ?
                                    <h2 className="text-gray-500">Status: {contact.status}</h2> :
                                    contact.status === 'Busy' ?
                                        <h2 className="text-red-500">Status: {contact.status}</h2> :
                                        contact.status === 'Away' ?
                                            <h2 className="text-orange-500">Status: {contact.status}</h2> :
                                            <h2 className="text-blue-500">Status: {contact.status}</h2>}
                        </div>
                    ))}
                    {addedGroups.map((group, index) => (
                        <div key={index} onClick={() => settingGroup(group.jid)}
                             className="cursor-pointer w-full transition-all hover:bg-gray-800 hover:text-white p-2 border-2 rounded border-gray-800 overflow-x-auto flex flex-col justify-center items-center">
                            <p className="w-fit hover:border-blue-600 hover:text-blue-500">{group.name}</p>
                            {group.unread && <span className="text-red-500">New</span>}
                        </div>
                    ))}

                    <button className="border p-2 bg-black text-white mt-4 rounded" onClick={() => {
                        setSendInvitationMenu(!sendInvitationMenu)
                    }}>Add Contact
                    </button>
                    {sendInvitationMenu ? <div className="bg-black p-5 flex-col justify-center items-center rounded-xl">
                        <div className="flex-col justify-center items-center mb-4">
                            <input
                                type="text"
                                placeholder="Empty"
                                value={invitationInput}
                                onChange={(e) => setInvitationInput(e.target.value)}
                                className="border w-52 px-1 rounded text-gray-500"/>
                            <button className="bg-gray-700 text-white h-8 px-2 rounded" onClick={sendInvitation}>Send to
                                Contact
                            </button>
                            <button className="bg-gray-700 text-white h-8 px-2 rounded" onClick={joinGroup}>Send to
                                Group
                            </button>
                            <button className="bg-gray-700 text-white h-8 px-2 rounded" onClick={createGroup}>Create group
                            </button>
                        </div>
                        <div className="flex-col justify-center items-center">
                            {invitations.length > 0 ? <div className="flex flex-col">
                                {invitations.map((invitation, index) => (
                                    <div key={index} className="flex justify-evenly items-center mb-3">
                                        <p className="text-white mr-4">{invitation}</p>
                                        <button className="bg-gray-700 text-white h-8 px-2 rounded" onClick={() => acceptInvitation(invitation)}>Accept</button>
                                    <button className="bg-gray-700 text-white h-8 px-2 rounded" onClick={() => ignoreInvitation(invitation)}>Ignore</button>
                                </div>
                            ))}
                        </div> : null}
                        </div></div> : null}
                </div>
                <div className="flex flex-col flex-1 p-4 bg-white overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">Chat with {recipient}</h2>
                    <div className="flex-1 overflow-y-auto mb-4">
                        { activeGroup === '' ?  messages.filter(msg => msg.from === recipient || (msg.from === user && msg.to === recipient)).map((msg, index) => (
                            <div key={index} className="mb-2">
                                {
                                    msg.from === user ?
                                        <div className="w-full flex justify-end">
                                            <div
                                                className="bg-gray-300 text-black p-2 rounded-lg self-start max-w-xs">
                                                <strong>You: </strong> {checkForURL(msg.body) ?
                                                <a href={msg.body} download>Download file</a> : msg.body} </div>
                                        </div>
                                        : <div className="w-full flex justify-start">
                                            <div
                                                className="bg-blue-500 text-white p-2 rounded-lg self-center max-w-xs text-wrap">
                                                <strong>{msg.from}: </strong> {checkForURL(msg.body) ?
                                                <a href={msg.body} download>Download file</a> : msg.body} </div>
                                        </div>
                                }
                            </div>
                        )) : messages.filter(msg => msg.in === activeGroup).map((msg, index) => (
                            <div key={index} className="mb-2">
                                {
                                    msg.from === user ?
                                        <div className="w-full flex justify-end">
                                            <div
                                                className="bg-gray-300 text-black p-2 rounded-lg self-start max-w-xs">
                                                <strong>You: </strong> {checkForURL(msg.body) ?
                                                <a href={msg.body} download>Download file</a> : msg.body} </div>
                                        </div>
                                        : <div className="w-full flex justify-start">
                                            <div
                                                className="bg-blue-500 text-white p-2 rounded-lg self-center max-w-xs text-wrap">
                                                <strong>{msg.from}: </strong> {checkForURL(msg.body) ?
                                                <a href={msg.body} download>Download file</a> : msg.body} </div>
                                        </div>
                                }
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleForm} className="flex">

                        <input type="file" id="file" onChange={(event) => {
                            if (event.target.files) {
                                setFile(event.target.files[0])
                            }
                        }}/>

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
