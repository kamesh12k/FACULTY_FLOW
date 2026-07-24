import { useMemo } from 'react'
import { initialsOf, avatarColors } from './utils'

function Avatar({ name }) {
  const c = avatarColors(name)
  return (
    <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center font-semibold text-xs ${c.bg} ${c.text}`}>
      {initialsOf(name)}
    </div>
  )
}

export default function Leaderboard({ report }) {
  const ranked = useMemo(() => {
    return [...report]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5)
      .map((r, i) => ({
        ...r,
        rank: i + 1,
      }))
  }, [report])

  if (ranked.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Faculty Credit Ranking
        </h2>
        <p className="text-sm text-gray-400 text-center py-8">No ranking data available.</p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-900">
          Faculty Credit Ranking
        </h2>
        <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100 font-medium">
          Top Balances
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {ranked.map((teacher) => (
          <div
            key={teacher.teacher_id}
            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-gray-400 w-5">
                #{teacher.rank}
              </span>
              <Avatar name={teacher.name} />
              <div>
                <div className="text-sm font-semibold text-gray-800">{teacher.name}</div>
                <div className="text-xs text-gray-400">{teacher.department || 'Faculty'}</div>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-sm font-mono font-bold ${
                teacher.balance > 0 ? 'text-emerald-600' : teacher.balance < 0 ? 'text-rose-600' : 'text-gray-500'
              }`}>
                {teacher.balance > 0 ? '+' : ''}{teacher.balance}
              </span>
              <div className="text-[10px] text-gray-400 font-medium">credits</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

