import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShieldCheck, User, Mail, Lock, Key, AlertCircle } from 'lucide-react';

export default function MentorSecretRegisterPage() {
  const { secretToken } = useParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { registerMentor, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const tokenToUse = secretToken || 'mentor-secret-signup-99x';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerMentor(tokenToUse, { name, email, password });
      navigate('/mentor');
    } catch (err) {
      // Handled in store
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-purple-900/40 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono font-medium">
            <Key className="w-3 h-3" />
            <span>Restricted Invitation Access</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Mentor Accreditation Signup</h2>
          <p className="text-xs text-slate-400">
            Provision elevated Mentor credentials for challenge authoring and assessment supervision.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Mentor Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Sarah Connor"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Staff Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mentor@antigravity.io"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Master Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Invitation Secret Key</label>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 truncate">
              {tokenToUse}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 disabled:opacity-50 transition"
          >
            {isLoading ? 'Authorizing Mentor Credentials...' : 'Register as Accredited Mentor'}
          </button>
        </form>
      </div>
    </div>
  );
}

