import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { 
  ShieldCheck, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  RotateCw, 
  Compass, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiCall, handleApiError } from '../utils/apiCall';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('REQUEST_OTP'); // 'REQUEST_OTP' | 'VERIFY_OTP'
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setErrorMsg('Please enter your admin email or phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await apiCall('/api/v1/admin/auth/otp/request', 'POST', {
        identifier: trimmedIdentifier,
        purpose: 'LOGIN',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data?.message || 'OTP sent successfully to your identifier!');
        setStep('VERIFY_OTP');
        setResendTimer(60);
      } else {
        const errorText = data?.detail || data?.message || 'Failed to send OTP. Please check the identifier.';
        setErrorMsg(typeof errorText === 'string' ? errorText : JSON.stringify(errorText));
        toast.error(typeof errorText === 'string' ? errorText : 'Failed to send OTP');
      }
    } catch (err) {
      console.error('OTP Request Error:', err);
      handleApiError(err, 'Could not reach server. Please verify connection.');
      setErrorMsg('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setErrorMsg('Please enter the OTP received');
      return;
    }

    setLoading(true);
    try {
      const response = await apiCall('/api/v1/admin/auth/otp/verify', 'POST', {
        identifier: identifier.trim(),
        otp: trimmedOtp,
        purpose: 'LOGIN',
      });

      const data = await response.json();
      const authPayload = data?.data && typeof data.data === 'object' ? data.data : data;

      if (response.ok && authPayload?.access_token) {
        toast.success('Authentication successful! Welcome back.');
        await login(authPayload);
        navigate('/dashboard', { replace: true });
      } else {
        const errorText = data?.detail || data?.message || 'Invalid or expired OTP. Please try again.';
        setErrorMsg(typeof errorText === 'string' ? errorText : JSON.stringify(errorText));
        toast.error(typeof errorText === 'string' ? errorText : 'OTP verification failed');
      }
    } catch (err) {
      console.error('OTP Verify Error:', err);
      handleApiError(err, 'Failed to verify OTP.');
      setErrorMsg('Verification error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setErrorMsg('');
    if (!credentialResponse?.credential) {
      toast.error('Google token not received.');
      return;
    }

    setGoogleLoading(true);
    try {
      const response = await apiCall('/api/v1/admin/auth/google', 'POST', {
        id_token: credentialResponse.credential,
      });

      const data = await response.json();
      const authPayload = data?.data && typeof data.data === 'object' ? data.data : data;

      if (response.ok && authPayload?.access_token) {
        toast.success('Signed in with Google successfully!');
        await login(authPayload);
        navigate('/dashboard', { replace: true });
      } else {
        const errorText = data?.detail || data?.message || 'Google authentication failed for admin.';
        setErrorMsg(typeof errorText === 'string' ? errorText : JSON.stringify(errorText));
        toast.error(typeof errorText === 'string' ? errorText : 'Google login error');
      }
    } catch (err) {
      console.error('Google Auth Error:', err);
      handleApiError(err, 'Google authentication service unreachable.');
      setErrorMsg('Google login failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGoogleLoading(false);
    toast.error('Google authentication dialog was cancelled or encountered an issue.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-indigo-200 selection:text-indigo-900">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-300/30 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-300/30 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan-200/20 blur-[160px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl shadow-slate-300/40 p-8 transition-all duration-300 hover:border-slate-300">
          
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-indigo-500/25 mb-4 group transition-transform duration-300 hover:scale-105">
              <Compass className="w-7 h-7 text-white animate-[spin_10s_linear_infinite]" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center gap-2">
              Coochbehar Travels
              <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-semibold tracking-wider">
                Admin
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Secure administrative access & management portal
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-600 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {/* Form Content: Step 1 vs Step 2 */}
          {step === 'REQUEST_OTP' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Admin Identifier
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or mobile number"
                    disabled={loading || googleLoading}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  We will send a one-time verification passcode to this address.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Requesting OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification OTP</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2 truncate pr-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">{identifier}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('REQUEST_OTP');
                    setOtp('');
                    setErrorMsg('');
                  }}
                  disabled={googleLoading}
                  className="text-blue-600 hover:text-blue-500 font-medium underline shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  6-Digit OTP Passcode
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter received OTP"
                    disabled={loading || googleLoading}
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-base font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Didn't receive code?</span>
                {resendTimer > 0 ? (
                  <span className="text-slate-400 font-mono">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading || googleLoading}
                    className="text-blue-600 hover:text-blue-500 font-semibold transition-colors disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Login</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Social Sign-in Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              shape="pill"
              text="continue_with"
              width="100%"
              disabled={loading || googleLoading}
            />
          </div>

          {googleLoading && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-600">
              <RotateCw className="h-4 w-4 animate-spin text-blue-500" />
              <span>Waiting...</span>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-400 text-center">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Authorized Coochbehar Travels personnel only</span>
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Protected by end-to-end token verification &bull; Coochbehar Travels &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;