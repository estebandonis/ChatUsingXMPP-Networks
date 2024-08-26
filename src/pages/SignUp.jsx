import {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import {client, xml} from "@xmpp/client";
import { Notification } from '../components';

const domain = 'alumchat.lol';
const service = 'ws://alumchat.lol:7070/ws/';

const SignUp = () => {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [notification, setNotification] = useState({ message: '', type: '' });

    const showNotification = (message, type) => {
        setNotification({ message, type });
    };

    const handleClose = () => {
        setNotification({ message: '', type: '' });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle login logic here
        console.log('Username:', username);
        console.log('Password:', password);
    };

    const register = () => {

        console.log(username, password, email)

        const xmppClient = client({
            service: service,
            domain: domain,
            username: username,
            password: password,
        });

        xmppClient.on("open", () => {
            xmppClient.send(
                xml(
                    "iq",
                    {type: "set", to: domain, id: "register"},
                    xml(
                        "query",
                        {xmlns: "jabber:iq:register"},
                        xml("username", {}, username),
                        xml("password", {}, password),
                        xml("email", {}, email)
                    )
                )
            );
        });

        xmppClient.on('error', (err) => {
            console.error(err);
            showNotification('Ocurrio un error al momento de registrar su usuario', 'error');
        })

        // Set up message handler
        xmppClient.on('stanza', async (stanza) => {
            console.log('Stanza:', stanza.toString());

            if (stanza.is('iq')) {
                console.log('IQ:', stanza.toString());
                navigate('/chat', { state: { username, password } })
            }
        });

        xmppClient.start().catch(console.error);

        return () => {
            xmppClient.stop().catch(console.error);
        };
    }


    return (
        <div className="flex items-center w-screen justify-center min-h-screen bg-gray-100">
            {notification.message && (
                <Notification message={notification.message} type={notification.type} onClose={handleClose} />
            )}
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            onClick={register}
                        >
                            Sign Up
                        </button>
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            onClick={() => (navigate('/'))}
                        >
                            Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignUp;
