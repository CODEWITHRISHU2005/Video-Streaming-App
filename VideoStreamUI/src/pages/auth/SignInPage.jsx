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
  
  const { isAuthenticated, login, loginWithOtt, loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/home';

  // Automatically redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');

    if (error) {
        toast.error("Login failed: " + error);
    }
  }, [location]);


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
      if (result.mfaRequired) {
        setMagicEmail(email);
        setActiveTab('ott');
        toast.success(result.message || 'OTP verified! Please request a magic link to complete sign in.');
      } else {
        navigate(from, { replace: true });
      }
    }
    
    setIsLoading(false);
  };

  // ----- OTT Handlers -----
  const handleSendMagicLink = async (e) => {
    if (e) e.preventDefault();
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
    <div className="flex items-center justify-center min-h-[85vh] bg-transparent transition-colors duration-300">
      <div className="w-full max-w-md p-10 space-y-6 glass-card rounded-3xl shadow-2xl transition-colors duration-300">
        <h2 className="text-3xl font-extrabold text-center text-slate-900 dark:text-white tracking-tight">Sign In</h2>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-neutral-800 mb-6">
          <button
            className={`flex-1 py-3 text-center font-bold text-sm transition-all ${activeTab === 'phone' ? 'text-indigo-650 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            onClick={() => setActiveTab('phone')}
          >
            Phone & OTP
          </button>
          <button
            className={`flex-1 py-3 text-center font-bold text-sm transition-all ${activeTab === 'ott' ? 'text-indigo-650 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            onClick={() => setActiveTab('ott')}
          >
            Magic Link
          </button>
        </div>

        {/* Phone & OTP Form */}
        {activeTab === 'phone' && (
          <form className="space-y-5" onSubmit={otpSent ? handlePhoneLogin : handleSendOtp}>
             <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 mt-1 bg-slate-50/50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
                required
                disabled={otpSent} // Lock email after sending OTP? Generally good UX.
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Phone Number (10 digits)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                }}
                className="w-full px-3 py-2.5 mt-1 bg-slate-50/50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
                required
                disabled={otpSent}
              />
            </div>
            
            {otpSent && (
              <div className="animate-fade-in space-y-2">
                <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3 py-2.5 mt-1 bg-slate-50/50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
                  required
                  placeholder="Checking SMS..."
                />
                <div className="mt-2 text-right">
                   <button 
                     type="button" 
                     onClick={() => setOtpSent(false)} 
                     className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline font-bold"
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
                className="w-full px-4 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-sm"
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
             <form onSubmit={handleSendMagicLink} className="space-y-5">
               <div>
                 <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Email Address</label>
                   <input
                     type="email"
                     value={magicEmail}
                     onChange={(e) => setMagicEmail(e.target.value)}
                     className="w-full px-3 py-2.5 mt-1 bg-slate-50/50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
                     required
                     placeholder="Enter your email"
                   />
                </div>
                <button
                   type="submit"
                   disabled={isLoading}
                   className="w-full px-4 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-[0.98] text-sm"
                  >
                   {isLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
             </form>
          </div>
        )}

        <div className="flex items-center justify-center">
          <span className="text-slate-400 text-xs uppercase font-bold tracking-wide">Or</span>
        </div>
        <div className="flex flex-col space-y-4">
          <button
            type="button"
            onClick={() => window.location.href = 'https://video-streaming-app-4gtd.onrender.com/oauth2/authorization/google'}
            className="w-full flex items-center justify-center px-4 py-2.5 border border-slate-200 dark:border-neutral-750 rounded-xl shadow-sm text-sm font-bold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-neutral-800/40 hover:bg-slate-50 dark:hover:bg-neutral-850/60 focus:outline-none transition-all active:scale-[0.98]"
          >
            <FcGoogle className="w-5 h-5 mr-2" />
            Sign in with Google
          </button>
        </div>
        <div className="text-center pt-2">
          <p className="text-sm text-slate-550 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-indigo-650 dark:text-indigo-400 hover:underline" state={location.state}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
