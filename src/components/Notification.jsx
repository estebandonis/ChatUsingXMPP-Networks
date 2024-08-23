// Notification.jsx
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const Notification = ({ message, type, onClose }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 500); // Wait for the fade-out effect to complete
        }, 2500); // Start fade-out after 2.5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const typeClasses = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    };

    return (
        <div className={`fixed top-4 right-4 p-4 mb-4 text-white font-bold text-center rounded-2xl transition-opacity duration-500 ease-in-out ${typeClasses[type]} ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {message}
        </div>
    );
};

Notification.propTypes = {
    message: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default Notification;
