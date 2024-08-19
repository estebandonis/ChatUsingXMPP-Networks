import {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import {client, xml} from "@xmpp/client";

const domain = 'alumchat.lol';
const service = 'ws://alumchat.lol:7070/ws/';

const Login = () => {
    const navigate = useNavigate()

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        const xmppClient = client({
            service: service,
            domain: domain,
            username: username,
            password: password,
        });

        xmppClient.on("online", async () => {
            await xmppClient.send(xml('presence'));
            navigate('/chat', { state: { username, password } });
        });

        xmppClient.on('error', (err) => {
            console.error(err);
        })

        // Set up message handler
        xmppClient.on('stanza', async (stanza) => {
            console.log('Stanza:', stanza.toString());

            if (stanza.is('iq')) {
                console.log('IQ:', stanza.toString());
            }
        });

        xmppClient.start().catch(console.error);

        return () => {
            xmppClient.stop().catch(console.error);
        };
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
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
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            Login
                        </button>

                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            onClick={() => {navigate('/signup')}}
                        >
                            SignUp
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
