import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { challengeApi } from '../api/challengeApi';
import { analyticsApi } from '../api/analyticsApi';
import ChallengeEditor from '../components/dashboard/ChallengeEditor';
import LearnerAnalyticsTable from '../components/dashboard/LearnerAnalyticsTable';
import ExportExcelButton from '../components/dashboard/ExportExcelButton';
import {
  PlusCircle,
  Users,
  Code2,
  Trash2,
  ExternalLink,
  RefreshCw,
  Clock,
  Trophy,
  CheckCircle2,
  BookOpen,
  Edit3
} from 'lucide-react';

export default function MentorDashboardPage() {
  const [activeTab, setActiveTab] = useState('challenges'); // 'challenges' | 'analytics' | 'create'
  const [challenges, setChallenges] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(true);
  const [editingChallenge, setEditingChallenge] = useState(null);

  // Load all challenges
  const fetchChallenges = async () => {
    setIsLoadingChallenges(true);
    try {
      const res = await challengeApi.getAll();
      const list = res.data || [];
      setChallenges(list);
      if (list.length > 0 && !selectedChallengeId) {
        setSelectedChallengeId(list[0].id || list[0]._id);
      }
      return list;
    } catch (err) {
      console.error('Failed to load challenges:', err);
      return [];
    } finally {
      setIsLoadingChallenges(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  // Load analytics whenever selected challenge changes
  const fetchAnalytics = async (challengeId) => {
    if (!challengeId) return;
    setIsLoadingAnalytics(true);
    try {
      const res = await analyticsApi.getChallengeSubmissions(challengeId);
      setAnalyticsData(res.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setAnalyticsData(null);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (selectedChallengeId && activeTab === 'analytics') {
      fetchAnalytics(selectedChallengeId);
    }
  }, [selectedChallengeId, activeTab]);

  const handleDeleteChallenge = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}"?`)) return;
    try {
      await challengeApi.delete(id);
      const updated = await fetchChallenges();
      if (selectedChallengeId === id) {
        setSelectedChallengeId(updated[0]?.id || updated[0]?._id || '');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete challenge.');
    }
  };

  const selectedChallenge = challenges.find(
    (c) => (c.id || c._id) === selectedChallengeId
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Mentor Studio Header */}
      <div className="border-b border-slate-800 bg-slate-900/60 py-6 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
                Mentor Command Center
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">
              Assessment Orchestration & Analytics
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Author isolated scaffolds, inspect live candidate test runs, and generate formal Excel reports.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('challenges')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'challenges'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>All Challenges ({challenges.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'analytics'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Learner Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'create'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Challenge</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto w-full flex-1 p-4 md:p-8">
        {/* TAB 1: ALL CHALLENGES OVERVIEW */}
        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Code2 className="w-5 h-5 text-purple-400" />
                  <span>Published Assessment Challenges</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  View and manage all active challenges visible to candidates.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingChallenge(null);
                  setActiveTab('create');
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition shadow-md shadow-purple-600/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Challenge</span>
              </button>
            </div>

            {isLoadingChallenges ? (
              <div className="p-12 text-center text-xs font-mono text-slate-500">
                Loading assessment challenges...
              </div>
            ) : challenges.length === 0 ? (
              <div className="p-12 rounded-xl border border-slate-800 bg-slate-900/50 text-center space-y-3">
                <Code2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No challenges found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Get started by publishing your first coding assessment with customized test cases.
                </p>
                <button
                  onClick={() => {
                    setEditingChallenge(null);
                    setActiveTab('create');
                  }}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  Create Assessment Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {challenges.map((c) => {
                  const cId = c.id || c._id;
                  return (
                    <div
                      key={cId}
                      className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            c.difficulty === 'EASY'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : c.difficulty === 'HARD'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {c.difficulty}
                          </span>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {c.stack}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white mt-2.5">{c.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>

                        <div className="flex items-center space-x-3 text-slate-500 font-mono text-[11px] mt-3">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-slate-500" />
                            {c.durationMinutes || 60}m limit
                          </span>
                          <span>•</span>
                          <span className="flex items-center">
                            <Trophy className="w-3 h-3 mr-1 text-slate-500" />
                            {c.totalScore || 100} pts
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedChallengeId(cId);
                            setActiveTab('analytics');
                          }}
                          className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition flex items-center space-x-1"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>View Submissions</span>
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingChallenge(c);
                              setActiveTab('create');
                            }}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition"
                            title="Edit Challenge Scaffolding & Tests"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Edit</span>
                          </button>

                          <Link
                            to={`/assessment/${cId}?mode=try_ide`}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-medium transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Try IDE</span>
                          </Link>

                          <button
                            onClick={() => handleDeleteChallenge(cId, c.title)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-800 transition"
                            title="Delete Challenge"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE / EDIT CHALLENGE */}
        {activeTab === 'create' && (
          <ChallengeEditor
            challengeToEdit={editingChallenge}
            onCreated={async (newChallenge) => {
              setEditingChallenge(null);
              const updatedList = await fetchChallenges();
              const newId = newChallenge?._id || newChallenge?.id || updatedList[0]?._id || updatedList[0]?.id;
              if (newId) {
                setSelectedChallengeId(newId);
              }
              setActiveTab('challenges');
            }}
            onUpdated={async () => {
              setEditingChallenge(null);
              await fetchChallenges();
              setActiveTab('challenges');
            }}
            onCancel={() => {
              setEditingChallenge(null);
              setActiveTab('challenges');
            }}
          />
        )}

        {/* TAB 3: LEARNER ANALYTICS & EXCEL EXPORT */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Challenge Selector Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Code2 className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Selected Assessment</div>
                  <select
                    value={selectedChallengeId}
                    onChange={(e) => setSelectedChallengeId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-purple-500 mt-0.5"
                  >
                    {challenges.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.title} ({c.stack})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => fetchAnalytics(selectedChallengeId)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Refresh Submissions"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {selectedChallenge && (
                  <ExportExcelButton
                    challengeId={selectedChallengeId}
                    challengeTitle={selectedChallenge.title}
                  />
                )}
              </div>
            </div>

            {/* Submissions & Aggregate Metrics */}
            {isLoadingAnalytics ? (
              <div className="p-12 text-center text-xs font-mono text-slate-500">
                Retrieving candidate telemetry and Jest test results...
              </div>
            ) : (
              <LearnerAnalyticsTable
                submissions={analyticsData?.submissions || []}
                metrics={analyticsData?.metrics}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
