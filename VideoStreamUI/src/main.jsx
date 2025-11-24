import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import './index.css';
import LoadingScreen from './components/LoadingScreen.jsx';

const clientId = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your Google Client ID

function Main() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Show loading screen for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <React.StrictMode>
      {isLoading && <LoadingScreen />}
      <GoogleOAuthProvider clientId={clientId}>
        <Router>
          <App />
        </Router>
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Main />);
