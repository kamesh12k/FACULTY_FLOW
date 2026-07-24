import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { BRAND_CONFIG } from '../../config/branding'
import { authApi, departmentsApi } from '../../api/services'
import { ErrorAlert, Input, Select, Button } from '../../components/ui'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', department_id: '' })
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { themePreset } = useTheme() || {}
  const navigate = useNavigate()

  useEffect(() => {
    departmentsApi.list()
      .then(r => setDepartments(r.data))
      .catch(err => console.error('Failed to load departments in register screen', err))
  }, [])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        department: form.department || null,
        department_id: form.department_id ? parseInt(form.department_id, 10) : null,
      })
      login(data.access_token, data.user)
      navigate('/teacher/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const selectOptions = [
    { value: '', label: 'Select department…' },
    ...departments.map(d => ({ value: d.id, label: d.name }))
  ]

  const bgCls = themePreset?.loginBg || 'bg-gradient-to-br from-slate-50 via-white to-slate-50'

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-all duration-300 ${bgCls}`}>
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-primary-600 to-indigo-500 rounded-2xl mb-4 shadow-md shadow-primary-500/10">
            <span className="text-2xl">{BRAND_CONFIG.logoEmoji}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Create Account
          </h1>
          <p className="text-xs font-bold text-slate-300/80 mt-2 uppercase tracking-wider">
            Register as a teacher on {BRAND_CONFIG.appName}
          </p>
        </div>

        <div className={`rounded-2xl border p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xl ${themePreset?.isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ErrorAlert message={error} />
            
            <Input 
              label="Full name" 
              type="text" 
              required 
              value={form.name} 
              onChange={set('name')} 
              placeholder="Dr. Jane Smith" 
            />

            <Input 
              label="Email" 
              type="email" 
              required 
              value={form.email} 
              onChange={set('email')} 
              placeholder="you@faflow.com" 
            />

            <Select
              label="Department"
              required
              options={selectOptions}
              value={form.department_id || ''}
              onChange={e => {
                const id = e.target.value
                const d = departments.find(x => String(x.id) === String(id))
                setForm({ ...form, department_id: id ? parseInt(id, 10) : '', department: d ? d.name : '' })
              }}
            />

            <Input 
              label="Password" 
              type="password" 
              required 
              value={form.password} 
              onChange={set('password')} 
              placeholder="••••••••" 
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-xs font-bold text-slate-400 mt-5 uppercase tracking-wide">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
