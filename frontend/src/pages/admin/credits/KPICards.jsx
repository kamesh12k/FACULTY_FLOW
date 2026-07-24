import { computeKPIs } from './utils'

const CARDS = (kpi) => [
  {
    id: 'teachers',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Faculty Members',
    value: kpi.totalTeachers,
    desc: 'Registered teachers in system',
    accent: 'indigo',
    border: 'border-gray-100',
    iconBg: 'bg-indigo-50 text-indigo-600',
    valueText: 'text-gray-900',
  },
  {
    id: 'negative',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    title: 'Negative Balances',
    value: kpi.negativeBalances,
    desc: 'Requires HOD reconciliation',
    accent: 'red',
    border: 'border-red-100',
    iconBg: 'bg-red-50 text-red-600',
    valueText: 'text-red-600',
  },
  {
    id: 'today',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Today's Activity",
    value: kpi.todayActivity,
    desc: kpi.yesterdayActivity > 0
      ? `${kpi.todayActivity > kpi.yesterdayActivity ? 'Increased' : kpi.todayActivity < kpi.yesterdayActivity ? 'Decreased' : 'Consistent'} vs yesterday`
      : 'Credit events recorded today',
    accent: 'amber',
    trend: kpi.yesterdayActivity > 0
      ? (kpi.todayActivity > kpi.yesterdayActivity ? 'up' : kpi.todayActivity < kpi.yesterdayActivity ? 'down' : 'flat')
      : null,
    border: 'border-gray-100',
    iconBg: 'bg-amber-50 text-amber-600',
    valueText: 'text-gray-900',
  },
  {
    id: 'manual',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      </svg>
    ),
    title: 'Manual Adjustments',
    value: kpi.manualAdjustments,
    desc: 'Audit trail corrections',
    accent: 'violet',
    border: 'border-gray-100',
    iconBg: 'bg-purple-50 text-purple-600',
    valueText: 'text-gray-900',
  },
]

function TrendIndicator({ trend }) {
  if (!trend) return null
  if (trend === 'up') return <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">↑ higher</span>
  if (trend === 'down') return <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">↓ lower</span>
  return <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">stable</span>
}

export default function KPICards({ report, transactions }) {
  const kpi = computeKPIs(report, transactions)
  const cards = CARDS(kpi)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`bg-white rounded-xl border ${card.border} p-5 shadow-sm hover:shadow-md transition-all duration-200`}
        >
          <div className="flex items-start justify-between">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
              {card.icon}
            </div>
            {card.trend && <TrendIndicator trend={card.trend} />}
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{card.title}</h3>
            <div className={`text-2xl font-bold font-mono tracking-tight mt-1 ${card.valueText}`}>
              {card.value}
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-tight">{card.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

