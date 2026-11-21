import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { challengeApi } from '../api/challengeApi';
import { useAuthStore } from '../store/authStore';
import { Code2, ArrowRight, ShieldCheck, Cpu, Terminal, Zap, Clock, Trophy } from 'lucide-react';

export default function LandingPage() {
  const [challenges, setChallenges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const res = await challengeApi.getAll();
        setChallenges(res.data || []);
      } catch (err) {
        console.error('Failed to load challenges:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChallenges();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 md:px-8 border-b border-slate-800 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-medium">
            <Zap className="w-3.5 h-3.5" />
            <span>High-Concurrency Enterprise Technical Assessment Platform</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Code. Evaluate. Excel. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Zero-Downtime Sandbox Assessments
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm text-slate-400 leading-relaxed">
            Modeled after HackerEarth with isolated Docker test execution, automated Jest scoring,
            real-time anti-cheat surveillance, and role-based access control.
          </p>

          <div className="flex items-center justify-center space-x-4 pt-2">
            {!user ? (
              <>
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition"
                >
                  Start Candidate Assessment
                </Link>
                <Link
                  to="/login"
                  className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  Sign In to Portal
                </Link>
              </>
            ) : user.role === 'MENTOR' ? (
              <Link
                to="/mentor"
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition flex items-center space-x-2"
              >
                <span>Launch Mentor Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <a
                href="#challenges"
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition flex items-center space-x-2"
              >
                <span>Browse Available Assessments</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Isolated Sandbox Runner</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ephemeral containers capped at 0.5 Cores, 256MB RAM with strictly disabled network interfaces.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Full-Spectrum Anti-Cheat</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Global copy/paste interception, fullscreen monitoring, and tab switch logging.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Multi-Stack Support</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                JavaScript Algorithms, Frontend HTML/CSS/JS, and Full-Stack MERN environments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Challenges Catalog */}
      <section id="challenges" className="flex-1 max-w-5xl mx-auto w-full py-10 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Code2 className="w-5 h-5 text-blue-400" />
              <span>Available Technical Assessments</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an assessment to launch the Monaco IDE room.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {challenges.length} Assessment{challenges.length === 1 ? '' : 's'} Active
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500">
            Loading assessment catalog...
          </div>
        ) : challenges.length === 0 ? (
          <div className="p-12 rounded-xl border border-slate-800 bg-slate-900/50 text-center text-xs font-mono text-slate-500">
            No challenges available at this moment. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map((challenge) => (
              <div
                key={challenge.id || challenge._id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      challenge.difficulty === 'EASY'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : challenge.difficulty === 'HARD'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {challenge.difficulty}
                    </span>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {challenge.stack}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-3">
                    {challenge.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {challenge.description}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-slate-500" />
                      {challenge.durationMinutes || 60}m
                    </span>
                    <span className="flex items-center">
                      <Trophy className="w-3 h-3 mr-1 text-slate-500" />
                      {challenge.totalScore || 100} pts
                    </span>
                  </div>

                  <Link
                    to={`/assessment/${challenge.id || challenge._id}`}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
                  >
                    <span>Enter Room</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

