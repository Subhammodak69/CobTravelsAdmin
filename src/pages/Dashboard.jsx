import React, { useState, useEffect, useCallback } from 'react';
import { 
  Smartphone, 
  Laptop, 
  Clock, 
  RefreshCw, 
  LogOut, 
  Trash2, 
  CheckCircle2, 
  Server, 
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiCall, handleApiError } from '../utils/apiCall';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/config';

const Dashboard = () => {
  const { user, tokenInfo, fetchUserProfile, logout } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  // Fetch active sessions from /api/v1/sessions/
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await apiCall('/api/v1/sessions/', 'GET');
      if (res.ok) {
        const data = await res.json();
        // Handle if response is array or wrapped object
        const sessionList = Array.isArray(data) ? data : (data?.sessions || data?.data || []);
        setSessions(sessionList);
      } else {
        console.warn('Failed to fetch sessions:', res.status);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRefreshProfile = async () => {
    setRefreshingProfile(true);
    try {
      await fetchUserProfile();
      toast.success('Admin profile refreshed');
    } catch (e) {
      toast.error('Could not refresh profile');
    } finally {
      setRefreshingProfile(false);
    }
  };

  // Revoke a single session: DELETE /api/v1/sessions/{session_id}
  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to terminate this session?')) {
      return;
    }

    setRevokingId(sessionId);
    try {
      const res = await apiCall(`/api/v1/sessions/${sessionId}`, 'DELETE');
      if (res.ok) {
        toast.success('Session terminated successfully');
        loadSessions();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.detail || data?.message || 'Failed to revoke session');
      }
    } catch (err) {
      handleApiError(err, 'Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  // Revoke all other sessions: POST /api/v1/sessions/logout-all
  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Are you sure you want to terminate all other active sessions across devices?')) {
      return;
    }

    setRevokingAll(true);
    try {
      const res = await apiCall('/api/v1/sessions/logout-all', 'POST');
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.success(data?.message || 'All other sessions have been logged out');
        loadSessions();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.detail || data?.message || 'Failed to terminate all sessions');
      }
    } catch (err) {
      handleApiError(err, 'Failed to terminate all sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const parseUserAgent = (ua) => {
    if (!ua) return { browser: 'Unknown Client', os: 'Unknown OS', isMobile: false };
    const lower = ua.toLowerCase();
    const isMobile = lower.includes('mobile') || lower.includes('android') || lower.includes('iphone');
    
    let browser = 'Web Browser';
    if (lower.includes('edg/')) browser = 'Microsoft Edge';
    else if (lower.includes('chrome/')) browser = 'Google Chrome';
    else if (lower.includes('safari/') && !lower.includes('chrome')) browser = 'Safari';
    else if (lower.includes('firefox/')) browser = 'Mozilla Firefox';

    let os = 'Unknown OS';
    if (lower.includes('windows')) os = 'Windows';
    else if (lower.includes('macintosh') || lower.includes('mac os')) os = 'macOS';
    else if (lower.includes('linux')) os = 'Linux';
    else if (lower.includes('android')) os = 'Android';
    else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS';

    return { browser, os, isMobile };
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-500/10 p-6 md:p-8">
        <div className="absolute right-[-20px] top-[-20px] w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {user?.profile_pic ? (
                <img 
                  src={user.profile_pic} 
                  alt={user.name} 
                  className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/20 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md ring-4 ring-white/20 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-indigo-700 rounded-full shadow" title="Online" />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Welcome back, {user?.name || 'Administrator'}
                </h1>
                <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {user?.role || 'ADMIN'}
                </span>
              </div>
              <p className="text-blue-100 text-sm mt-1 flex items-center gap-2">
                <span>{user?.email || 'admin@coochbehartravels.com'}</span>
                {user?.mobile && <span>&bull; {user?.mobile}</span>}
                {user?.user_code && <span className="font-mono text-xs opacity-80">({user?.user_code})</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={handleRefreshProfile}
              disabled={refreshingProfile}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-sm font-medium transition-all backdrop-blur-sm flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingProfile ? 'animate-spin' : ''}`} />
              <span>Refresh Profile</span>
            </button>

            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500/80 hover:bg-red-500 active:bg-red-600 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-red-500/20 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Active Sessions */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Active Sessions
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {sessions.length || 1}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Live Connected
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Across registered browsers & devices
          </p>
        </div>

        {/* Stat 2: Account Status */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Account Status
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {user?.is_active !== false ? 'Active' : 'Disabled'}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Verified
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Role: <strong className="text-gray-700 dark:text-gray-300">{user?.role || 'ADMIN'}</strong>
          </p>
        </div>

        {/* Stat 3: Token Expiry */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Session Lifetime
            </span>
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {tokenInfo?.expires_in_sec ? `${Math.round(tokenInfo.expires_in_sec / 60)} mins` : '900s'}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium capitalize">
              {tokenInfo?.token_type || 'Bearer'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Auto-renewed on active requests
          </p>
        </div>

        {/* Stat 4: Backend API Status */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              API Connection
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              Online
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" title={API_BASE}>
            {API_BASE.replace('https://', '')}
          </p>
        </div>
      </div>

      {/* Admin Details & Profile Overview Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Admin Identity Profile</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Authenticated via <code>/api/v1/admin/auth/me</code></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Full Name</span>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{user?.name || 'N/A'}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Email Address</span>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{user?.email || 'N/A'}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Mobile Contact</span>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{user?.mobile || 'N/A'}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Admin Code / ID</span>
            <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate block">
              {user?.user_code || user?.id || 'N/A'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Last Login</span>
            <span className="font-semibold text-gray-900 dark:text-white text-xs">{formatDate(user?.last_login)}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Account Created At</span>
            <span className="font-semibold text-gray-900 dark:text-white text-xs">{formatDate(user?.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Session Management Table Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Login Sessions</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manage active device sessions and terminate unauthorized access
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadSessions}
              disabled={loadingSessions}
              className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              title="Refresh Session List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleRevokeAllSessions}
              disabled={revokingAll || sessions.length <= 1}
              className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{revokingAll ? 'Revoking All...' : 'Logout All Other Devices'}</span>
            </button>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200/60 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Device & Browser</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loadingSessions && sessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                      <span>Loading active sessions...</span>
                    </div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Laptop className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="font-medium text-gray-700 dark:text-gray-300">No external sessions detected</p>
                      <p className="text-xs text-gray-400">Current session is active</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const uaInfo = parseUserAgent(session.user_agent);
                  const isCurrent = session.is_current;

                  return (
                    <tr 
                      key={session.id} 
                      className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors ${
                        isCurrent ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            uaInfo.isMobile 
                              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300' 
                              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                          }`}>
                            {uaInfo.isMobile ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <span>{uaInfo.browser} ({uaInfo.os})</span>
                              {isCurrent && (
                                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-xs block" title={session.user_agent}>
                              {session.user_agent || 'Unknown UA'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {session.ip_address || '127.0.0.1'}
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(session.created_at)}
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(session.last_used_at)}
                      </td>

                      <td className="px-6 py-4">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Active Now
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                            Connected
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isCurrent ? (
                          <span className="text-xs text-gray-400 italic">This Device</span>
                        ) : (
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            disabled={revokingId === session.id}
                            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-800 disabled:opacity-50"
                          >
                            {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
