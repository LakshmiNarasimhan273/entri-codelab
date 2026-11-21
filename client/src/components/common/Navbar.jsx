import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Shield, Code2, LogOut, LayoutDashboard, UserCheck, Terminal } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-40 sticky top-0">
      <div className="flex items-center space-x-3">
        <Link to="/" className="flex items-center space-x-2.5 font-bold tracking-tight text-white hover:opacity-90 transition">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-extrabold bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
            ENTRI
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
            CodeLab
          </span>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            <div className="flex items-center space-x-2">
              {user?.role === 'MENTOR' ? (
                <Link
                  to="/mentor"
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Mentor Studio</span>
                </Link>
              ) : (
                <Link
                  to="/"
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Challenges</span>
                </Link>
              )}
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-right">
                <div>
                  <div className="text-xs font-medium text-slate-200">{user?.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">{user?.email}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${user?.role === 'MENTOR'
                  ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  }`}>
                  {user?.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-md shadow-md shadow-blue-600/20 transition"
            >
              Candidate Registration
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

