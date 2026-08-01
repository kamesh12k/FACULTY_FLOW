import { computeKPIs } from './utils'

const CARDS = (kpi) => [
  {
    id: 'teachers',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Faculty Members',
    value: kpi.totalTeachers,
    desc: `${kpi.positiveBalances} positive · ${kpi.negativeBalances} negative`,
    border: 'border-slate-200/80',
    gradient: 'from-indigo-50/40 via-white to-white',
    iconBg: 'bg-indigo-600 text-white shadow-xs',
    valueText: 'text-slate-900',
    badge: '100% Tracked',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
  {
    id: 'negative',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    title: 'Negative Balances',
    value: kpi.negativeBalances,
    desc: kpi.negativeBalances > 0 ? 'Requires HOD reconciliation' : 'All balances healthy',
    border: kpi.negativeBalances > 0 ? 'border-rose-200' : 'border-emerald-200',
    gradient: kpi.negativeBalances > 0 ? 'from-rose-50/40 via-white to-white' : 'from-emerald-50/40 via-white to-white',
    iconBg: kpi.negativeBalances > 0 ? 'bg-rose-600 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs',
    valueText: kpi.negativeBalances > 0 ? 'text-rose-600' : 'text-emerald-600',
    badge: kpi.negativeBalances > 0 ? 'Attention' : 'Healthy',
    badgeColor: kpi.negativeBalances > 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    id: 'today',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Today's Activity",
    value: kpi.todayActivity,
    desc: kpi.yesterdayActivity > 0
      ? `${kpi.todayActivity > kpi.yesterdayActivity ? '↑ Higher' : kpi.todayActivity < kpi.yesterdayActivity ? '↓ Lower' : 'Equal'} vs yesterday (${kpi.yesterdayActivity})`
      : 'Credit events recorded today',
    border: 'border-slate-200/80',
    gradient: 'from-amber-50/40 via-white to-white',
    iconBg: 'bg-amber-500 text-white shadow-xs',
    valueText: 'text-slate-900',
    badge: 'Live Events',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  {
    id: 'manual',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      </svg>
    ),
    title: 'Manual Adjustments',
    value: kpi.manualAdjustments,
    desc: 'Audited manual interventions',
    border: 'border-slate-200/80',
    gradient: 'from-purple-50/40 via-white to-white',
    iconBg: 'bg-purple-600 text-white shadow-xs',
    valueText: 'text-slate-900',
    badge: 'Audited Log',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-100',
  },
]

export default function KPICards({ report, transactions }) {
  const kpi = computeKPIs(report, transactions)
  const cards = CARDS(kpi)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`bg-gradient-to-br ${card.gradient} rounded-2xl border ${card.border} p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
              {card.icon}
            </div>
            {card.badge && (
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${card.badgeColor}`}>
                {card.badge}
              </span>
            )}
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.title}</h3>
            <div className={`text-3xl font-extrabold font-mono tracking-tight mt-1 ${card.valueText}`}>
              {card.value}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">{card.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
