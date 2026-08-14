import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { creditsApi, teachersApi, leavesApi } from '../../api/services'
import { Spinner, EmptyState } from '../../components/ui'
import {
  ChartIcon,
  SwapIcon,
  PlusIcon,
  DocIcon,
  SearchIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
} from '../../components/icons'

// Tier thresholds and badges
function getFacultyTier(balance) {
  if (balance >= 15) {
    return {
      tier: 'Diamond Contributor',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
      tagline: 'Top 5% Faculty Contributor · Exemplary Substitution Support',
      perk: 'Top-priority leave approval & Annual Excellence commendation',
      color: 'from-cyan-600 via-indigo-600 to-slate-900',
      icon: '💎',
    }
  }
  if (balance >= 8) {
    return {
      tier: 'Gold Contributor',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      tagline: 'Active Substitution Partner · High Community Goodwill',
      perk: 'Fast-track leave requests & Flexible substitution scheduling',
      color: 'from-amber-600 via-indigo-700 to-slate-900',
      icon: '🥇',
    }
  }
  if (balance >= 2) {
    return {
      tier: 'Silver Contributor',
      badge: 'bg-slate-300/20 text-slate-200 border-slate-300/30',
      tagline: 'Reliable Team Member · Healthy Positive Balance',
      perk: 'Balanced workload and standard substitution priority',
      color: 'from-indigo-600 via-slate-800 to-slate-900',
      icon: '🥈',
    }
  }
  if (balance >= 0) {
    return {
      tier: 'Standard Standing',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      tagline: 'Balanced Credit Account · Neutral Net Impact',
      perk: 'Equal distribution for departmental substitution invitations',
      color: 'from-slate-800 via-indigo-950 to-slate-900',
      icon: '🛡️',
    }
  }
  return {
    tier: 'Action Recommended',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    tagline: 'Negative Balance · Take substitutions to recover standing',
    perk: 'Recommended to take 2-3 substitution slots this week',
    color: 'from-rose-900 via-slate-900 to-slate-950',
    icon: '⚠️',
  }
}

export default function MyCredits() {
  const { user } = useAuth()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [myLeaves, setMyLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter & Search states
  const [activeTypeTab, setActiveTypeTab] = useState('all') // 'all', 'earned', 'deducted', 'adjustments'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('latest') // 'latest', 'oldest'

  useEffect(() => {
    Promise.all([
      teachersApi.credits(user.id),
      creditsApi.myTransactions(),
      leavesApi.myLeaves().catch(() => ({ data: [] })),
    ])
      .then(([b, t, l]) => {
        setBalance(b.data.balance || 0)
        setTransactions(t.data || [])
        setMyLeaves(l.data || [])
      })
      .finally(() => setLoading(false))
  }, [user.id])

  // Process transaction stats
  const stats = useMemo(() => {
    let earned = 0
    let deducted = 0
    let adjustments = 0
    let last30Days = 0

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    transactions.forEach(t => {
      const ch = Number(t.change) || 0
      const tDate = new Date(t.created_at)

      if (ch > 0) {
        earned += ch
      } else if (ch < 0) {
        deducted += Math.abs(ch)
      } else {
        adjustments += 1
      }

      if (tDate >= thirtyDaysAgo) {
        last30Days += ch
      }
    })

    const totalActions = earned + deducted
    const coverRatio = totalActions > 0 ? Math.round((earned / totalActions) * 100) : 100

    return {
      earned,
      deducted,
      adjustments,
      last30Days,
      coverRatio,
      totalCount: transactions.length,
    }
  }, [transactions])

  // Running balance calculation in chronological order
  const enhancedTransactions = useMemo(() => {
    // Sort chronologically ascending to compute running balances correctly
    const chronological = [...transactions].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    )

    let current = 0
    const withRunning = chronological.map(t => {
      current += Number(t.change) || 0
      return {
        ...t,
        running_balance: current,
      }
    })

    // Return in reverse chronological (latest first by default)
    return withRunning.reverse()
  }, [transactions])

  // Filter & Search
  const filteredTransactions = useMemo(() => {
    return enhancedTransactions.filter(t => {
      const ch = Number(t.change) || 0
      const r = (t.reason || '').toLowerCase()
      const q = searchQuery.toLowerCase()

      // Tab match
      if (activeTypeTab === 'earned' && ch <= 0) return false
      if (activeTypeTab === 'deducted' && ch >= 0) return false
      if (activeTypeTab === 'adjustments' && t.category !== 'manual_adjustment' && t.category !== 'quota_adjustment') return false

      // Search match
      if (q && !r.includes(q)) return false

      return true
    }).sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.created_at) - new Date(b.created_at)
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [enhancedTransactions, activeTypeTab, searchQuery, sortOrder])

  const tierInfo = getFacultyTier(balance)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 mb-1.5">
            <ChartIcon className="w-3.5 h-3.5" />
            <span>Faculty Substitution Credit System</span>
            <span>&middot;</span>
            <span>Automated Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Substitution Credits & Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Track your live credit earnings for substitute classes, leave deductions, and institutional rewards standing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/teacher/today-coverage"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all shadow-sm active:scale-95 min-h-[42px]"
          >
            <SwapIcon className="w-4 h-4" />
            <span>Available Substitutions</span>
          </Link>
          <Link
            to="/teacher/leave/apply"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs transition-all shadow-xs active:scale-95 min-h-[42px]"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Apply for Leave</span>
          </Link>
        </div>
      </div>

      {/* Hero Tier & Balance Banner */}
      <div className={`card p-6 sm:p-8 bg-gradient-to-br ${tierInfo.color} text-white rounded-3xl shadow-md relative overflow-hidden`}>
        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Balance display */}
          <div className="lg:col-span-4 space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-200 block">
              Live Spendable Balance
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl sm:text-6xl font-black font-mono tracking-tight ${balance >= 0 ? 'text-white' : 'text-rose-300'}`}>
                {balance >= 0 ? `+${balance}` : balance}
              </span>
              <span className="text-lg sm:text-xl font-black text-indigo-200">
                Credit{Math.abs(balance) === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Accumulated substitution goodwill balance
            </p>
          </div>

          {/* Tier & Recognition */}
          <div className="lg:col-span-5 space-y-3 lg:border-l lg:border-white/15 lg:pl-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tierInfo.icon}</span>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${tierInfo.badge}`}>
                  {tierInfo.tier}
                </span>
              </div>
            </div>
            <p className="text-sm font-bold text-white leading-snug">
              {tierInfo.tagline}
            </p>
            <div className="flex items-start gap-2 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15 text-xs text-indigo-100">
              <span className="text-amber-300 font-bold">★ Perk:</span>
              <span className="font-medium">{tierInfo.perk}</span>
            </div>
          </div>

          {/* Quick Ratio Meter */}
          <div className="lg:col-span-3 space-y-2 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/15 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-indigo-200">Coverage Reliability</span>
              <span className="text-white font-mono">{stats.coverRatio}%</span>
            </div>
            <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.coverRatio >= 70 ? 'bg-emerald-400' : (stats.coverRatio >= 40 ? 'bg-amber-400' : 'bg-rose-400')
                }`}
                style={{ width: `${Math.min(100, Math.max(10, stats.coverRatio))}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              {stats.earned} substituted classes vs {stats.deducted} leaves taken.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Performance Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Net Balance */}
        <div className="card p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Current Balance</span>
            <span className={`p-1.5 rounded-xl text-xs font-bold ${balance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {balance >= 0 ? 'Positive' : 'Deficit'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
            {balance >= 0 ? `+${balance}` : balance}
          </div>
          <p className="text-xs text-slate-500 font-semibold truncate">
            {balance >= 0 ? 'Good standing' : 'Needs attention'}
          </p>
        </div>

        {/* Card 2: Total Classes Substituted */}
        <div className="card p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Classes Covered</span>
            <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
              <SwapIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-700">
            +{stats.earned}
          </div>
          <p className="text-xs text-slate-500 font-semibold truncate">
            {stats.earned} substitute session{stats.earned === 1 ? '' : 's'} taken
          </p>
        </div>

        {/* Card 3: Leaves Deducted */}
        <div className="card p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Leaves Deducted</span>
            <span className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
              <DocIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600">
            -{stats.deducted}
          </div>
          <p className="text-xs text-slate-500 font-semibold truncate">
            {stats.deducted} class{stats.deducted === 1 ? '' : 'es'} covered by colleagues
          </p>
        </div>

        {/* Card 4: 30-Day Activity Velocity */}
        <div className="card p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">30-Day Momentum</span>
            <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
              <ClockIcon className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono ${stats.last30Days >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.last30Days >= 0 ? `+${stats.last30Days}` : stats.last30Days}
          </div>
          <p className="text-xs text-slate-500 font-semibold truncate">
            Net change in last 30 days
          </p>
        </div>
      </div>

      {/* Credit Accounting Rules & Policy Card */}
      <div className="card p-5 sm:p-6 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-2 mb-3">
          <span>⚖️ Institutional Substitution Accounting Rules</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <CheckCircleIcon className="w-4 h-4" />
              <span>Covering a Class: +1 Credit</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              When you accept or are assigned to substitute for an absent faculty member, you earn +1 credit point per period.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-400">
              <AlertTriangleIcon className="w-4 h-4" />
              <span>Taking a Leave: −1 Credit</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              When you take leave on a working day, 1 credit is deducted per teaching period to fairly reimburse substituting colleagues.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <ClockIcon className="w-4 h-4" />
              <span>College Holidays: 0 Credits</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Scheduled college holidays and declared non-working calendar days never generate credit changes or deductions.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History & Audit Ledger */}
      <div className="card bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Toolbar & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/40">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ChartIcon className="w-5 h-5 text-indigo-600" />
              <span>Complete Transaction History</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                {filteredTransactions.length} of {transactions.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Chronological ledger of credit additions, substitutions, and leave adjustments
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative min-w-[200px]">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reason or details..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input pl-8 py-1.5 text-xs w-full min-h-[38px]"
              />
            </div>

            {/* Sort Toggle */}
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="input py-1.5 text-xs min-h-[38px] cursor-pointer"
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Type Filter Tabs */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-1.5 bg-slate-50/20">
          <button
            type="button"
            onClick={() => setActiveTypeTab('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeTypeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Activity ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeTab('earned')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeTypeTab === 'earned'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Earned Credits (+{stats.earned})
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeTab('deducted')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeTypeTab === 'deducted'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Leaves Deducted (-{stats.deducted})
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeTab('adjustments')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeTypeTab === 'adjustments'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Adjustments & Quotas
          </button>
        </div>

        {/* Transactions Table & Mobile Card Feed */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12">
            <EmptyState
              message={
                searchQuery
                  ? `No transactions matching "${searchQuery}"`
                  : 'No credit transactions found in this category.'
              }
            />
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Activity / Event Type</th>
                    <th className="px-5 py-3.5">Reason & Operational Details</th>
                    <th className="px-5 py-3.5 text-center">Credit Impact</th>
                    <th className="px-5 py-3.5 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map(tx => {
                    const ch = Number(tx.change) || 0
                    const isPositive = ch > 0
                    const isNeutral = ch === 0
                    const txDate = new Date(tx.created_at)

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Date */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800">
                            {txDate.toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {txDate.toLocaleDateString(undefined, { weekday: 'short' })} &middot; {txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Event Category */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isNeutral
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {isPositive ? '✨ Substituted Class' : (isNeutral ? '⚙️ Adjustment' : '🏖️ Leave Deduction')}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800 max-w-lg leading-relaxed">
                            {tx.reason || 'Operational substitution credit change'}
                          </p>
                          {tx.related_leave_id && (
                            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                              Ref Leave #{tx.related_leave_id}
                            </span>
                          )}
                        </td>

                        {/* Credit Impact */}
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-black font-mono ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800'
                              : isNeutral
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isPositive ? `+${ch}` : ch}
                          </span>
                        </td>

                        {/* Running Balance */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <span className="font-mono font-black text-sm text-slate-900">
                            {tx.running_balance !== undefined ? `${tx.running_balance >= 0 ? '+' : ''}${tx.running_balance}` : '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Feed View (< md) */}
            <div className="grid grid-cols-1 divide-y divide-slate-100 md:hidden">
              {filteredTransactions.map(tx => {
                const ch = Number(tx.change) || 0
                const isPositive = ch > 0
                const isNeutral = ch === 0
                const txDate = new Date(tx.created_at)

                return (
                  <div key={tx.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isNeutral
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isPositive ? '+ Substituted Class' : (isNeutral ? '⚙ Adjustment' : '− Leave Deduction')}
                        </span>
                        <p className="text-xs font-bold text-slate-900 leading-snug pt-1">
                          {tx.reason}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
                          isPositive
                            ? 'bg-emerald-100 text-emerald-800'
                            : isNeutral
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isPositive ? `+${ch}` : ch}
                        </span>
                        {tx.running_balance !== undefined && (
                          <p className="text-[10px] text-slate-400 font-mono font-bold mt-1">
                            Bal: {tx.running_balance}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
                      <span>{txDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>{txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
