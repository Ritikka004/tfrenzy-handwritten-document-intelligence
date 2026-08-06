import React, { useState } from 'react';
import { Shield, Key, Mail, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const LoginView: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('sarah.connor@tfrenzy.ai');
  const [password, setPassword] = useState('password123');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'supervisor' | 'verifier' | 'auditor'>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole })
      });
      const data = await res.json();

      if (data.success) {
        login(data.access_token, {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.full_name,
          role: data.user.role
        });
        onSuccess();
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection failure to auth server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-100">TFrenzy Auth Gateway</h1>
        <p className="text-xs text-slate-400">JWT Authentication & Role-Based Security</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Simulate Access Role (RBAC)</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { role: 'admin', label: 'Admin', desc: 'Full privileges' },
              { role: 'supervisor', label: 'Supervisor', desc: 'Template & Queue' },
              { role: 'verifier', label: 'Verifier', desc: 'Correction Mode' },
              { role: 'auditor', label: 'Auditor', desc: 'Read-only log' }
            ].map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => setSelectedRole(r.role as any)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedRole === r.role
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-[11px]">{r.label}</div>
                <div className="text-[9px] text-slate-500">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? 'Authenticating...' : (
            <>
              <span>Generate JWT Token & Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
