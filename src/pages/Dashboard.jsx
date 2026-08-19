import React, { useState } from 'react';
import {
  Users,
  MapPin,
  TrendingUp,
  Star,
  Plane,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Bus,
  Compass,
  Hotel,
} from 'lucide-react';

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const STATS = [
  {
    id: 'revenue',
    label: 'Total Revenue',
    value: '₹18,42,500',
    change: '+12.4%',
    up: true,
    sub: 'vs last month',
    icon: IndianRupee,
    color: 'emerald',
  },
  {
    id: 'bookings',
    label: 'Total Bookings',
    value: '3,284',
    change: '+8.1%',
    up: true,
    sub: 'vs last month',
    icon: Calendar,
    color: 'blue',
  },
  {
    id: 'users',
    label: 'Registered Users',
    value: '12,640',
    change: '+5.6%',
    up: true,
    sub: 'vs last month',
    icon: Users,
    color: 'violet',
  },
  {
    id: 'trips',
    label: 'Active Trips',
    value: '147',
    change: '-3.2%',
    up: false,
    sub: 'vs last month',
    icon: Plane,
    color: 'amber',
  },
];

const RECENT_BOOKINGS = [
  { id: 'BK-001', user: 'Aarav Sharma', destination: 'Darjeeling, WB', package: 'Hill Station Escape', amount: '₹12,500', date: '18 Aug 2026', status: 'confirmed', avatar: 'AS' },
  { id: 'BK-002', user: 'Priya Das',    destination: 'Puri, Odisha',   package: 'Beach Holiday',      amount: '₹8,200',  date: '17 Aug 2026', status: 'pending',   avatar: 'PD' },
  { id: 'BK-003', user: 'Rohit Meena',  destination: 'Sikkim Tour',    package: 'Mountain Adventure', amount: '₹22,000', date: '16 Aug 2026', status: 'confirmed', avatar: 'RM' },
  { id: 'BK-004', user: 'Sneha Roy',    destination: 'Goa, India',     package: 'Beachside Retreat',  amount: '₹15,800', date: '15 Aug 2026', status: 'cancelled', avatar: 'SR' },
  { id: 'BK-005', user: 'Karan Bose',   destination: 'Manali, HP',     package: 'Snow Paradise',      amount: '₹19,200', date: '14 Aug 2026', status: 'confirmed', avatar: 'KB' },
  { id: 'BK-006', user: 'Anita Ghosh',  destination: 'Kerala Backwaters','package': 'Houseboat Tour', amount: '₹28,500', date: '13 Aug 2026', status: 'pending',   avatar: 'AG' },
];

const TOP_DESTINATIONS = [
  { name: 'Darjeeling',     bookings: 842,  pct: 82, icon: '🏔️' },
  { name: 'Puri Beach',     bookings: 674,  pct: 66, icon: '🏖️' },
  { name: 'Sikkim',         bookings: 521,  pct: 51, icon: '🌿' },
  { name: 'Manali',         bookings: 489,  pct: 48, icon: '❄️' },
  { name: 'Kerala',         bookings: 403,  pct: 39, icon: '🛶' },
];

const MONTHLY_REVENUE = [
  { month: 'Mar', val: 9.2 },
  { month: 'Apr', val: 11.5 },
  { month: 'May', val: 14.1 },
  { month: 'Jun', val: 10.8 },
  { month: 'Jul', val: 16.3 },
  { month: 'Aug', val: 18.4 },
];

const QUICK_STATS = [
  { label: 'Hotels Listed',     value: '238',  icon: Hotel,   color: 'rose' },
  { label: 'Tour Packages',     value: '94',   icon: Compass, color: 'cyan' },
  { label: 'Bus Routes',        value: '61',   icon: Bus,     color: 'orange' },
  { label: 'Avg Rating',        value: '4.7★', icon: Star,    color: 'yellow' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const colorMap = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    ring: 'ring-blue-200 dark:ring-blue-800' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-800' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-600 dark:text-amber-400',  ring: 'ring-amber-200 dark:ring-amber-800' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',    text: 'text-rose-600 dark:text-rose-400',    ring: 'ring-rose-200 dark:ring-rose-800' },
  cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',    text: 'text-cyan-600 dark:text-cyan-400',    ring: 'ring-cyan-200 dark:ring-cyan-800' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-200 dark:ring-orange-800' },
  yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-200 dark:ring-yellow-800' },
};

const statusConfig = {
  confirmed: { label: 'Confirmed', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' },
  pending:   { label: 'Pending',   icon: Clock,        cls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' },
  cancelled: { label: 'Cancelled', icon: XCircle,      cls: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800' },
};

const avatarColors = ['from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600', 'from-cyan-500 to-blue-600'];

// ─── Chart Bar ────────────────────────────────────────────────────────────────
const BarChart = () => {
  const max = Math.max(...MONTHLY_REVENUE.map(d => d.val));
  return (
    <div className="flex items-end gap-3 h-36 px-2 pt-4">
      {MONTHLY_REVENUE.map((d, i) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
            {d.val}L
          </span>
          <div className="w-full relative rounded-t-md overflow-hidden" style={{ height: `${(d.val / max) * 100}px` }}>
            <div
              className={`absolute inset-0 rounded-t-md transition-all duration-700 ${
                i === MONTHLY_REVENUE.length - 1
                  ? 'bg-gradient-to-t from-blue-600 to-indigo-400'
                  : 'bg-gradient-to-t from-blue-200 to-blue-100 dark:from-blue-900 dark:to-blue-800'
              }`}
            />
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{d.month}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('all');

  const filtered = activeTab === 'all'
    ? RECENT_BOOKINGS
    : RECENT_BOOKINGS.filter(b => b.status === activeTab);

  return (
    <div className="space-y-6 pb-12">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-500/20 p-6 md:p-8">
        {/* decorative blobs */}
        <div className="absolute -right-10 -top-10 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 -bottom-16 w-56 h-56 rounded-full bg-violet-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/20 shadow-lg">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                COB Travels Admin — Live Dashboard
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Travel Operations Overview
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                August 2026 · Cooch Behar District &amp; Beyond
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20 text-center">
              <p className="text-xs text-blue-200">Today's Bookings</p>
              <p className="text-xl font-bold text-white">38</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20 text-center">
              <p className="text-xs text-blue-200">Today's Revenue</p>
              <p className="text-xl font-bold text-white">₹1.2L</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20 text-center">
              <p className="text-xs text-blue-200">Pending Actions</p>
              <p className="text-xl font-bold text-amber-300">12</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(stat => {
          const Icon = stat.icon;
          const c = colorMap[stat.color];
          return (
            <div
              key={stat.id}
              className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {stat.label}
                </span>
                <div className={`p-2.5 rounded-xl ${c.bg} ${c.text} ring-1 ${c.ring}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                {stat.up
                  ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  : <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                }
                <span className={`text-xs font-semibold ${stat.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {stat.change}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{stat.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUICK_STATS.map(qs => {
          const Icon = qs.icon;
          const c = colorMap[qs.color];
          return (
            <div
              key={qs.label}
              className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-4"
            >
              <div className={`p-3 rounded-xl ${c.bg} ${c.text} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{qs.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{qs.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts + Destinations Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Revenue Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Monthly Revenue
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Last 6 months · in Lakhs (₹)</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 dark:text-white">₹18.4L</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center justify-end gap-1">
                <ArrowUpRight className="w-3 h-3" /> +12.4% this month
              </p>
            </div>
          </div>
          <BarChart />
          <div className="mt-4 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800 pt-4">
            {[
              { label: 'Avg / Month', val: '₹13.4L' },
              { label: 'Peak Month',  val: 'August' },
              { label: 'Growth YoY',  val: '+22%' },
            ].map(item => (
              <div key={item.label} className="px-4 text-center first:pl-0 last:pr-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{item.val}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Destinations */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
            <MapPin className="w-4 h-4 text-violet-500" />
            Top Destinations
          </h2>
          <div className="space-y-4">
            {TOP_DESTINATIONS.map((dest, idx) => (
              <div key={dest.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{dest.icon}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{dest.name}</span>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                        #1
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{dest.bookings}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-700"
                    style={{ width: `${dest.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Bookings Table ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Recent Bookings
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Latest travel reservations across the platform</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {['all', 'confirmed', 'pending', 'cancelled'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/80 dark:bg-gray-800/60 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200/60 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Booking ID</th>
                <th className="px-6 py-4">Traveller</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4">Package</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filtered.map((bk, i) => {
                  const sc = statusConfig[bk.status];
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={bk.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{bk.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {bk.avatar}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{bk.user}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">{bk.destination}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{bk.package}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{bk.amount}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{bk.date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.cls}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">Showing {filtered.length} of {RECENT_BOOKINGS.length} bookings</p>
          <button className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1">
            View All Bookings <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
