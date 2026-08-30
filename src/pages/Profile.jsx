import React, { useState, useCallback, useEffect } from 'react';
import {
  Shield,
  User,
  Mail,
  Phone,
  Hash,
  Calendar,
  Clock,
  Laptop,
  Smartphone,
  RefreshCw,
  LogOut,
  Trash2,
  CheckCircle2,
  Server,
  Edit3,
  Key,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiCall, handleApiError } from '../utils/apiCall';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/config';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
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

// ─── Profile Info Field ───────────────────────────────────────────────────────
const ProfileField = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800/60 transition-all group">
    <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-gray-900 dark:text-white truncate ${mono ? 'font-mono text-indigo-600 dark:text-indigo-400 text-xs' : ''}`}>
        {value || 'N/A'}
      </p>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const Profile = () => {
  const { user, tokenInfo, fetchUserProfile, logout } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await apiCall('/api/v1/sessions/', 'GET');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.sessions || data?.data || []);
        setSessions(list);
      } else {
        console.warn('Failed to fetch sessions:', res.status);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleRefreshProfile = async () => {
    setRefreshingProfile(true);
    try {
      await fetchUserProfile();
      toast.success('Profile refreshed successfully');
    } catch {
      toast.error('Could not refresh profile');
    } finally {
      setRefreshingProfile(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Terminate this session?')) return;
    setRevokingId(sessionId);
    try {
      const res = await apiCall(`/api/v1/sessions/${sessionId}`, 'DELETE');
      if (res.ok) {
        toast.success('Session terminated');
        loadSessions();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.detail || d?.message || 'Failed to revoke session');
      }
    } catch (err) {
      handleApiError(err, 'Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Terminate all other sessions?')) return;
    setRevokingAll(true);
    try {
      const res = await apiCall('/api/v1/sessions/logout-all', 'POST');
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.success(d?.message || 'All other sessions logged out');
        loadSessions();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.detail || d?.message || 'Failed to terminate all sessions');
      }
    } catch (err) {
      handleApiError(err, 'Failed to terminate all sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  const profileFields = [
    { icon: User,     label: 'Full Name',         value: user?.name },
    { icon: Mail,     label: 'Email Address',      value: user?.email },
    { icon: Phone,    label: 'Mobile Contact',     value: user?.mobile },
    { icon: Hash,     label: 'Admin Code / ID',    value: user?.user_code || user?.id, mono: true },
    { icon: Calendar, label: 'Last Login',         value: formatDate(user?.last_login) },
    { icon: Clock,    label: 'Account Created',    value: formatDate(user?.created_at) },
  ];

  return (
    <div className=" space-y-3 pb-6">

      {/* ── Profile Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/20 p-6 md:p-8">
        <div className="absolute -right-12 -top-12 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-16 w-48 h-48 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar + Info */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {user?.profile_pic ? (
                <img
                  src={user.profile_pic}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/25 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md ring-4 ring-white/25 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg">
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
              )}
              <span
                className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-emerald-400 border-[3px] border-blue-700 rounded-full shadow"
                title="Online"
              />
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {user?.name || 'Administrator'}
                </h1>
                <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
                  {user?.role || 'ADMIN'}
                </span>
                {user?.is_active !== false && (
                  <span className="bg-emerald-400/20 text-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                    Active
                  </span>
                )}
              </div>
              <p className="text-blue-200 text-sm mt-1.5 flex items-center gap-2 flex-wrap">
                <span>{user?.email || 'admin@coochbehartravels.com'}</span>
                {user?.mobile && <span className="opacity-70">· {user.mobile}</span>}
                {user?.user_code && (
                  <span className="font-mono text-xs opacity-60">({user.user_code})</span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap self-start md:self-auto">
            <button
              onClick={handleRefreshProfile}
              disabled={refreshingProfile}
              className="px-4 py-2 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white rounded-xl text-sm font-medium transition-all backdrop-blur-sm flex items-center gap-2 disabled:opacity-50 border border-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingProfile ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-rose-500/80 hover:bg-rose-500 active:bg-rose-600 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-rose-500/30 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Sessions', value: sessions.length || 1, icon: Laptop,       color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',    sub: 'Live devices' },
          { label: 'Account Status',  value: user?.is_active !== false ? 'Active' : 'Disabled', icon: CheckCircle2, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', sub: `Role: ${user?.role || 'ADMIN'}` },
          { label: 'Token Lifetime',  value: tokenInfo?.expires_in_sec ? `${Math.round(tokenInfo.expires_in_sec / 60)} min` : '15 min', icon: Key, color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400', sub: tokenInfo?.token_type || 'Bearer' },
          { label: 'API Connection',  value: 'Online', icon: Server, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', sub: API_BASE.replace('https://', '') },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {item.label}
                </span>
                <div className={`p-2 rounded-xl ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {item.value}
                  {item.label === 'API Connection' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" title={item.sub}>{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Identity Profile Card ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Admin Identity Profile</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Authenticated via <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[11px]">/api/v1/admin/auth/me</code>
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors border border-indigo-200 dark:border-indigo-800/60">
            <Edit3 className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profileFields.map(f => (
            <ProfileField key={f.label} icon={f.icon} label={f.label} value={f.value} mono={f.mono} />
          ))}
        </div>
      </div>

      {/* ── Session Management ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Active Login Sessions</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Manage devices and terminate unauthorized access</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadSessions}
              disabled={loadingSessions}
              className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleRevokeAllSessions}
              disabled={revokingAll || sessions.length <= 1}
              className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {revokingAll ? 'Revoking…' : 'Logout All Other Devices'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200/60 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Device &amp; Browser</th>
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
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                      <span>Loading active sessions…</span>
                    </div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
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
                      className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors ${isCurrent ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-2xl ${uaInfo.isMobile ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'}`}>
                            {uaInfo.isMobile ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <span>{uaInfo.browser} ({uaInfo.os})</span>
                              {isCurrent && (
                                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                                  Current
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono truncate max-w-[220px] block" title={session.user_agent}>
                              {session.user_agent || 'Unknown UA'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">{session.ip_address || '127.0.0.1'}</td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{formatDate(session.created_at)}</td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{formatDate(session.last_used_at)}</td>
                      <td className="px-6 py-4">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Now
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-gray-400" /> Connected
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
                            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-2xl transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-800 disabled:opacity-50"
                          >
                            {revokingId === session.id ? 'Revoking…' : 'Revoke'}
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

export default Profile;
