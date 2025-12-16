import React, { useState, useEffect } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { otpAPI, ottAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const SignInPage = () => {
  const [activeTab, setActiveTab] = useState('phone'); // 'phone' or 'ott'
  
  // Phone/OTP State
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  // OTT/Magic Link State
  const [magicEmail, setMagicEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  
  const { login, loginWithOtt, loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/home';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
        toast.error("Login failed: " + error);
        return;
    }

    if (accessToken) {
        loginWithTokens(accessToken, refreshToken).then((res) => {
            if (res.success) {
                navigate(from, { replace: true });
            }
        });
    } else if (token) {
        loginWithOtt(token).then((res) => {
            if (res.success) {
                navigate(from, { replace: true });
            }
        });
    }
  }, [location, loginWithTokens, loginWithOtt, navigate, from]);


  // ----- Phone & OTP Handlers -----
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await otpAPI.send({ email, phone, otp: '' }); // otp empty for send request? No, usually request excludes it or ignores it. DTO has it.
      // DTO: String phone, String email, String otp
      // Let's send empty string for otp when requesting it, if backend allows.
      // If backend checks @NotBlank on otp field in OtpRequest during 'send', we might need to send a dummy or fix backend.
      // Looking at controller: @PostMapping("/send") public ResponseEntity<OtpResponse> sendOtp(@Valid @RequestBody OtpRequest request)
      // DTO record OtpRequest(String phone, String email, String otp)
      // The snippet provided: record OtpRequest(..., String otp) -> doesn't have @NotBlank annotation on otp, only on phone and email. 
      // So sending null/empty should be fine.
      
      setOtpSent(true);
      toast.success('OTP sent successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // AuthController /signIn expects OtpRequest
    const result = await login({ email, phone, otp });
    
    if (result.success) {
      navigate(from, { replace: true });
    }
    
    setIsLoading(false);
  };

  // ----- OTT Handlers -----
  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await ottAPI.sendLink(magicEmail);
      toast.success('Magic link sent to your email!');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to send magic link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-[#0f1014] transition-colors duration-300">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-[#1a1c24] rounded-lg shadow-md transition-colors duration-300">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">Sign In</h2>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            className={`flex-1 py-2 text-center font-medium ${activeTab === 'phone' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            onClick={() => setActiveTab('phone')}
          >
            Phone & OTP
          </button>
          <button
            className={`flex-1 py-2 text-center font-medium ${activeTab === 'ott' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            onClick={() => setActiveTab('ott')}
          >
            Magic Link
          </button>
        </div>

        {/* Phone & OTP Form */}
        {activeTab === 'phone' && (
          <form className="space-y-4" onSubmit={otpSent ? handlePhoneLogin : handleSendOtp}>
             <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
                disabled={otpSent} // Lock email after sending OTP? Generally good UX.
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number (10 digits)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                }}
                className="w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
                disabled={otpSent}
              />
            </div>
            
            {otpSent && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  required
                  placeholder="Checking SMS..."
                />
                <div className="mt-2 text-right">
                   <button 
                     type="button" 
                     onClick={() => setOtpSent(false)} 
                     className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                   >
                     Change Phone / Resend
                   </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : (otpSent ? 'Verify & Sign In' : 'Send OTP')}
              </button>
            </div>
          </form>
        )}

        {/* OTT / Magic Link Form */}
        {activeTab === 'ott' && (
          <div className="space-y-4">
             {/* Send Link Form */}
             <form onSubmit={handleSendMagicLink} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                   <input
                     type="email"
                     value={magicEmail}
                     onChange={(e) => setMagicEmail(e.target.value)}
                     className="w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                     required
                     placeholder="Enter your email"
                   />
                </div>
                <button
                   type="submit"
                   disabled={isLoading}
                   className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                   {isLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
             </form>
          </div>
        )}

        <div className="flex items-center justify-center">
          <span className="text-gray-600 dark:text-gray-400">Or</span>
        </div>
        <div className="flex flex-col space-y-4">
          <button
            type="button"
            onClick={() => window.location.href = 'http://localhost:8080/oauth2/authorization/google'}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
          >
            <FcGoogle className="w-5 h-5 mr-2" />
            Sign in with Google
          </button>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300" state={location.state}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
