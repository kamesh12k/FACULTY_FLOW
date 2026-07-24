import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { BRAND_CONFIG } from '../../config/branding'
import { authApi } from '../../api/services'
import { ErrorAlert, Input, Button } from '../../components/ui'

export default function Login() {
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { app_name, themePreset } = useTheme() || {}
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('reason') === 'session_expired'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      login(data.access_token, data.user)
      if (data.user.must_change_credentials) {
        navigate('/first-login-setup')
      } else {
        const role = data.user.role;
        if (role === 'principal') {
          navigate('/principal/dashboard');
        } else if (role === 'admin' || role === 'system_admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/teacher/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const bgCls = themePreset?.loginBg || 'bg-gradient-to-br from-slate-50 via-white to-slate-50'

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-all duration-300 ${bgCls}`}>
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-primary-600 to-indigo-500 rounded-2xl mb-4 shadow-md shadow-primary-500/10">
            <span className="text-2xl">{BRAND_CONFIG.logoEmoji}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {app_name || BRAND_CONFIG.appName}
          </h1>
          <p className="text-xs font-bold text-slate-300/80 mt-2 uppercase tracking-wider">{BRAND_CONFIG.tagline}</p>
        </div>

        <div className={`rounded-2xl border p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xl ${themePreset?.isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {sessionExpired && (
              <div role="alert" className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-bold">
                <span>⏱</span>
                <span>Your session expired. Please sign in again.</span>
              </div>
            )}
            
            <ErrorAlert message={error} />

            <Input
              label="Username or Email"
              type="text"
              required
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              placeholder="admin or user@faflow.com"
            />

            <Input
              label="Password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs font-bold text-slate-400 mt-5 uppercase tracking-wide">
          No account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 transition-colors">
            Register as teacher
          </Link>
        </p>
      </div>
    </div>
  )
}
