import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBell, FaUserCircle, FaStream } from 'react-icons/fa';

function Header() {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="w-full bg-white dark:bg-gray-900 shadow-md py-3 px-6 flex justify-between items-center z-50 sticky top-0">
      {/* Logo / App Name */}
      <Link to="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600 dark:text-indigo-300">
        <FaStream className="text-2xl" />
        StreamFlow
      </Link>

      {/* Right side controls */}
      <div className="flex items-center space-x-4 relative">
        {/* Notification Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="Notifications"
          >
            <FaBell className="text-xl text-gray-700 dark:text-gray-200" />
            {/* Red dot */}
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                Notifications
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>🎉 Your video "StreamFlow Intro" was liked 25 times</li>
                <li>💬 New comment on “Dev Vlog #2”</li>
                <li>👤 New subscriber joined your channel</li>
              </ul>
            </div>
          )}
        </div>

        {/* User Avatar / Login */}
        <button
          type="button"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <FaUserCircle className="text-2xl text-gray-700 dark:text-gray-200" />
        </button>
      </div>
    </header>
  );
}

export default Header;
