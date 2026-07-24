import { computeAttentionFlags, avatarColors, initialsOf } from './utils'

const SEVERITY_CONFIG = {
  high: {
    border: 'border-red-100',
    bg: 'bg-red-50/30',
    badge: 'bg-red-50 text-red-700 border-red-100',
    dot: 'bg-red-500',
  },
  medium: {
    border: 'border-amber-100',
    bg: 'bg-amber-50/20',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
    dot: 'bg-amber-500',
  },
}

function Avatar({ name }) {
  const c = avatarColors(name)
  return (
    <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${c.bg} ${c.text}`}>
      {initialsOf(name)}
    </div>
  )
}

export default function AttentionPanel({ report, transactions, onReview }) {
  const flags = computeAttentionFlags(report, transactions)

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-900">
          Reconciliation Required
        </h2>
        {flags.length > 0 && (
          <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
            {flags.length} action{flags.length === 1 ? '' : 's'} required
          </span>
        )}
      </div>

      {flags.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-800">All Faculty Balanced</p>
          <p className="text-xs text-gray-400 mt-0.5">No teachers require HOD attention at this time.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {flags.map((teacher) => {
            const cfg = SEVERITY_CONFIG[teacher.severity] || SEVERITY_CONFIG.medium
            return (
              <div
                key={teacher.teacher_id}
                className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3.5 transition-all duration-100`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar name={teacher.name} />
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${cfg.dot} border-2 border-white`} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-900">{teacher.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${cfg.badge}`}>
                          {teacher.severity === 'high' ? 'Critical' : 'Attention'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {teacher.department || 'Faculty'} &middot; Balance: <span className={`font-semibold ${teacher.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{teacher.balance > 0 ? '+' : ''}{teacher.balance}</span>
                      </div>

                      <div className="space-y-1 mt-2">
                        {teacher.reasons.map((reason, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-[10px] text-gray-400 mt-1">&bull;</span>
                            <p className="text-[11px] text-gray-600 leading-relaxed">{reason.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {onReview && (
                    <button
                      onClick={() => onReview(teacher)}
                      className="shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-gray-50 px-2.5 py-1.5 rounded border border-gray-200 transition-colors shadow-sm"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

