import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SignUpPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/home';



  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (phoneNumber.length !== 10) {
      toast.error("Phone number must be 10 digits");
      return;
    }

    setIsLoading(true);
    
    const result = await register({ name, email, phoneNumber, password });
    
    if (result.success) {
      navigate(from, { replace: true });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] bg-transparent transition-colors duration-300">
      <div className="w-full max-w-md p-10 space-y-6 glass-card rounded-3xl shadow-2xl transition-colors duration-300">
        <h2 className="text-3xl font-extrabold text-center text-slate-900 dark:text-white tracking-tight">Create Account</h2>
        <form className="space-y-5" onSubmit={handleEmailSignUp}>
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 mt-1 bg-slate-50/50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 mt-1 bg-slate-50/50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhoneNumber(val);
              }}
              className="w-full px-3 py-2.5 mt-1 bg-slate-50/50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
              required
              placeholder="10 digit mobile number"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 mt-1 bg-slate-50/50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 mt-1 bg-slate-50/50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-sm"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>
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
            Sign up with Google
          </button>
        </div>
        <div className="text-center pt-2">
          <p className="text-sm text-slate-555 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/signin" className="font-bold text-indigo-650 dark:text-indigo-400 hover:underline" state={location.state}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
