import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { creditsApi, teachersApi } from '../../api/services'
import { Spinner, CreditChip, EmptyState } from '../../components/ui'

export default function MyCredits() {
  const { user } = useAuth()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([teachersApi.credits(user.id), creditsApi.myTransactions()])
      .then(([b, t]) => { setBalance(b.data.balance); setTransactions(t.data) })
      .finally(() => setLoading(false))
  }, [user.id])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Credits</h1>

      <div className="card p-6 flex items-center gap-5">
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold font-mono ${balance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {balance >= 0 ? `+${balance}` : balance}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">Current Balance</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Each class you cover earns <span className="text-green-600 font-semibold">+1</span>. Each leave you take costs <span className="text-red-600 font-semibold">−1</span>. Holidays never generate credit changes.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Transaction History</h2>
        </div>
        {transactions.length === 0 ? <EmptyState message="No credit transactions yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Change', 'Reason', 'Date'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3"><CreditChip value={tx.change} /></td>
                  <td className="px-5 py-3 text-gray-600">{tx.reason}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
