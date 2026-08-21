import React, { useState, useEffect } from 'react';
import {
  Shield, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle,
  FileText, Cpu, CheckCircle2, Layers, ShieldCheck, Database,
  Sparkles, ScanLine, Zap, Activity, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface LoginViewProps {
  onSuccess: () => void;
}

const RegistrationForm: React.FC<{ onBack: (message?: string) => void }> = ({ onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Registration validation rules
    if (!name.trim()) {
      return setError('Full name is required.');
    }
    if (!email.trim()) {
      return setError('Email address is required.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError('Please enter a valid email address.');
    }
    if (!password) {
      return setError('Password is required.');
    }
    if (password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    if (!confirmPassword) {
      return setError('Confirm password is required.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Registration failed. Please try again.');
      }
      onBack('Account created successfully. Please sign in.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* Background ambient gradient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none translate-y-1/2" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between py-2 sm:py-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center font-extrabold text-base text-white shadow-lg shadow-blue-900/30 border border-blue-400/20">
            TF
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-100">TFrenzy Handwritten Document Intelligence Platform</span>
              <span className="bg-blue-500/15 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                v1.3 Edge
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Handwritten Document Intelligence &amp; Validation Platform</p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] text-slate-300 font-medium">Neural Engine Ready</span>
        </div>
      </header>

      {/* Centered Registration Card */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto py-4">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/80 overflow-hidden backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />

          <div className="p-6 sm:p-8">
            <div className="space-y-1.5 mb-6">
              <div className="inline-flex p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400 mb-2">
                <Shield className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Create TFrenzy Account</h1>
              <p className="text-xs text-slate-400">Register a verifier account to access the document platform</p>
            </div>

            {error && (
              <div role="alert" className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4" noValidate>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. Alex Morgan"
                    autoComplete="name"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg pl-9 pr-3 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="alex@tfrenzy.ai"
                    autoComplete="email"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg pl-9 pr-3 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg pl-9 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 focus:text-slate-200 focus:outline-none transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg pl-9 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 focus:text-slate-200 focus:outline-none transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => onBack()}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Already have an account? Sign In</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Global Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© 2026 TFrenzy DocIntel Platform. All rights reserved.</p>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-slate-500" />
            Handwritten OCR Engine
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-500" />
            TrOCR + Tesseract.js
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" />
            PostgreSQL Relational Storage
          </span>
        </div>
      </footer>
    </div>
  );
};

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);

  const validateEmail = (val: string): boolean => {
    if (!val.trim()) {
      setEmailError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validatePassword = (val: string): boolean => {
    if (!val) {
      setPasswordError('Password is required.');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, role: 'admin' })
      });
      const data = await res.json();

      if (data.success) {
        if (rememberMe) {
          localStorage.setItem('tfrenzy_remember_email', email.trim());
        } else {
          localStorage.removeItem('tfrenzy_remember_email');
        }
        login(data.access_token, {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.full_name,
          role: data.user.role
        });
        onSuccess();
      } else {
        setError(data.error || 'Invalid email or password. Please try again.');
      }
    } catch {
      setError('Unable to connect to the authentication server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill email from "Remember me" on mount
  useEffect(() => {
    const saved = localStorage.getItem('tfrenzy_remember_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  if (isRegistering) return <RegistrationForm onBack={(message) => { setIsRegistering(false); setRegistrationSuccess(message || null); }} />;

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Handwriting OCR',
      description: 'Vision Transformer (TrOCR) and neural pipelines purpose-built for cursive and low-contrast handwriting.',
      badge: 'TrOCR + Tesseract'
    },
    {
      icon: ScanLine,
      title: 'Intelligent Field Extraction',
      description: 'Automated OpenCV preprocessing, deskewing, and dynamic bounding-box localization per document type.',
      badge: 'Auto-Crop'
    },
    {
      icon: ShieldCheck,
      title: 'Human-in-the-Loop Verification',
      description: 'Side-by-side visual audit queues with real-time confidence scores and instant field-level editing.',
      badge: 'Audit Queue'
    },
    {
      icon: Database,
      title: 'Secure Structured Persistence',
      description: 'ACID-compliant PostgreSQL storage with complete audit provenance and multi-format data exports.',
      badge: 'PostgreSQL'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* Background ambient gradient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none translate-y-1/2" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Top Header Brand (visible on mobile / tablet / top row) */}
      <header className="relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between pb-6 sm:pb-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center font-extrabold text-lg text-white shadow-lg shadow-blue-900/30 border border-blue-400/20">
            TF
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-100">TFrenzy Handwritten Document Intelligence Platform</span>
              <span className="bg-blue-500/15 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                v1.3 Edge
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Handwritten Document Intelligence &amp; Validation Platform</p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] text-slate-300 font-medium">Neural Engine Ready</span>
        </div>
      </header>

      {/* Main Two-Column Container */}
      <main className="relative z-10 max-w-6xl w-full mx-auto my-auto py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column: Product Introduction & Enterprise Capabilities */}
          <section className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5" />
                <span>Next-Gen Intelligent Document Processing</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
                Transform Handwritten Forms into <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-200">Verified Structured Data</span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xl">
                TFrenzy extracts complex physical handwriting from visitor registers, employee forms, and compliance logs with deep neural recognition, automated quality scoring, and human-in-the-loop accuracy.
              </p>
            </div>

            {/* 4 Key Feature Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {features.map((feat) => {
                const IconComponent = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/20 transition-colors">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {feat.badge}
                      </span>
                    </div>
                    <h2 className="text-xs font-bold text-slate-200 mb-1">{feat.title}</h2>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{feat.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Metrics Trust Strip */}
            <div className="pt-2 flex flex-wrap items-center gap-6 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span><strong className="text-slate-200 font-semibold">99.2%</strong> Target Field Precision</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span><strong className="text-slate-200 font-semibold">Sub-second</strong> OCR Inference</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span><strong className="text-slate-200 font-semibold">100%</strong> On-Prem &amp; Edge Secure</span>
              </div>
            </div>
          </section>

          {/* Right Column: Premium Login Card */}
          <section className="lg:col-span-5 w-full">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/80 overflow-hidden relative backdrop-blur-sm">
              {/* Card top accent line */}
              <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />

              <div className="p-6 sm:p-8">
                {/* Heading */}
                <div className="space-y-1.5 mb-6">
                  <div className="inline-flex p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400 mb-2">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-100 tracking-tight">Sign In to TFrenzy</h2>
                  <p className="text-xs text-slate-400">Enter your enterprise credentials to access the workspace</p>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium animate-in fade-in">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {registrationSuccess && <div role="status" className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">{registrationSuccess}</div>}

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) validateEmail(e.target.value);
                        }}
                        onBlur={() => validateEmail(email)}
                        placeholder="user@tfrenzy.ai"
                        autoComplete="email"
                        className={`w-full bg-slate-950 border rounded-lg pl-9 pr-3 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors ${
                          emailError
                            ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
                            : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
                        }`}
                      />
                    </div>
                    {emailError && (
                      <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) validatePassword(e.target.value);
                        }}
                        onBlur={() => validatePassword(password)}
                        placeholder="••••••••••••"
                        autoComplete="current-password"
                        className={`w-full bg-slate-950 border rounded-lg pl-9 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors ${
                          passwordError
                            ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
                            : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Remember Me + Forgot Password */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-blue-600 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs text-slate-400 hover:text-slate-300 transition-colors">Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
                      onClick={() => setError('Password recovery is managed by your system administrator.')}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 active:scale-[0.99] mt-3 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Authenticating Session…</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 text-center text-xs text-slate-400">New to TFrenzy? <button type="button" onClick={() => { setRegistrationSuccess(null); setIsRegistering(true); }} className="text-blue-400 hover:text-blue-300 font-semibold">Create new account</button></div>

                {/* Security Footer Note */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Secure 256-bit JWT Session Authentication</span>
                </div>
              </div>

              {/* Card Bottom Meta Strip */}
              <div className="px-6 sm:px-8 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>ROLE: ADMIN / VERIFIER</span>
                <span>STATUS: OPERATIONAL</span>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Global Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© 2026 TFrenzy DocIntel Platform. All rights reserved.</p>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-slate-500" />
            Handwritten OCR Engine
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-500" />
            TrOCR + Tesseract.js
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" />
            PostgreSQL Relational Storage
          </span>
        </div>
      </footer>
    </div>
  );
};
