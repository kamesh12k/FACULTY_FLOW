import React from 'react'

/**
 * ErrorBoundary — catches unhandled React render errors and shows a recovery UI
 * instead of a blank white screen. Wraps the entire app to prevent full crashes.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // In production, send to error tracking service (e.g., Sentry)
    console.error('[FAFLOW] Unhandled render error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #0f172a)',
          color: 'var(--text-primary, #f1f5f9)',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
          gap: '1.5rem',
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', maxWidth: '480px', margin: 0 }}>
            An unexpected error occurred in the application. This has been logged for investigation.
          </p>
          <div style={{ maxWidth: '540px', width: '100%', textAlign: 'left' }}>
            <details style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '0.75rem',
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              color: '#fca5a5',
              cursor: 'pointer',
            }}>
              <summary style={{ fontWeight: 600, color: '#f87171', outline: 'none' }}>
                View Error Diagnostics
              </summary>
              <div style={{ marginTop: '0.75rem', overflowX: 'auto' }}>
                <p style={{ fontWeight: 700, margin: '0 0 0.5rem 0', color: '#fca5a5' }}>
                  {String(this.state.error)}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre style={{
                    margin: 0,
                    fontSize: '0.72rem',
                    color: '#94a3b8',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                background: 'var(--accent, #6366f1)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('credits_token')
                localStorage.removeItem('credits_user')
                window.location.href = '/login'
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
