import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

const routes = ['login', 'signup', 'chat', 'profile']
const API_BASE = import.meta.env.VITE_API_URL || 'http://fastapi.localhost/api/v1'
const AUTH_STORAGE_KEY = 'fastapi_auth'

const loadAuth = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveAuth = (auth) => {
  if (!auth) {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

const formatSessionTime = (value) => {
  if (!value) return 'Just now'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Just now'
  return parsed.toLocaleDateString()
}

const getInitials = (user) => {
  if (!user) return '??'
  const first = user.first_name?.[0] || ''
  const last = user.last_name?.[0] || ''
  return `${first}${last}`.toUpperCase() || '??'
}

const apiRequest = async (path, { method = 'GET', body, token } = {}) => {
  const headers = { Accept: 'application/json' }
  const options = { method, headers }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, options)
  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = data?.detail || data?.message || 'Request failed'
    throw new Error(message)
  }
  return data
}

const loginRequest = (email, password) =>
  apiRequest('/login', { method: 'POST', body: { email, password } })

const registerRequest = (payload) =>
  apiRequest('/login/register', { method: 'POST', body: payload })

const fetchProfile = (token) => apiRequest('/user', { token })

const fetchSessions = (token) =>
  apiRequest('/chat/sessions?size=50&page=1', { token })

const createSession = (token, title) =>
  apiRequest('/chat/sessions', { method: 'POST', body: { title }, token })

const fetchMessages = (token, sessionId) =>
  apiRequest(`/chat/sessions/${sessionId}/messages?size=50&page=1`, { token })

const sendMessage = (token, sessionId, content) =>
  apiRequest(`/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: { content, role: 'user' },
    token,
  })

const getInitialRoute = () => {
  const hash = window.location.hash.replace('#', '')
  return routes.includes(hash) ? hash : 'login'
}

const NavLink = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`text-sm font-semibold tracking-wide transition ${
      active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    {children}
  </button>
)

const FormError = ({ message }) =>
  message ? (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  ) : null

const AuthShell = ({ title, subtitle, imageUrls, children, onNavigate, route }) => (
  <div className="min-h-screen relative overflow-hidden">
    <div className="absolute -top-24 right-[-6rem] h-72 w-72 rounded-full bg-[rgba(255,112,87,0.18)] blur-3xl animate-drift" />
    <div className="absolute bottom-[-8rem] left-[-6rem] h-80 w-80 rounded-full bg-[rgba(8,145,178,0.16)] blur-3xl animate-drift" />

    <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
          LL
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Lucid Loop</p>
          <h1 className="text-lg font-semibold text-slate-900">Studio Chat</h1>
        </div>
      </div>
      <nav className="flex items-center gap-6">
        <NavLink active={route === 'login'} onClick={() => onNavigate('login')}>
          Login
        </NavLink>
        <NavLink active={route === 'signup'} onClick={() => onNavigate('signup')}>
          Sign up
        </NavLink>
        <NavLink active={route === 'chat'} onClick={() => onNavigate('chat')}>
          Chat
        </NavLink>
      </nav>
    </header>

    <main className="relative z-10 grid gap-10 px-6 pb-16 pt-6 md:grid-cols-[1.05fr_0.95fr] md:px-10 lg:px-16">
      <section className="flex flex-col justify-center animate-fade-up">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Agents ready</p>
        <h2 className="mt-4 text-4xl md:text-5xl font-display text-slate-900">{title}</h2>
        <p className="mt-4 text-slate-600 text-lg">{subtitle}</p>
        <div className="mt-8 grid grid-cols-3 gap-3">
          {imageUrls.map((src, idx) => (
            <div
              key={src}
              className={`relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/70 shadow-lg ${
                idx === 1 ? 'translate-y-3' : idx === 2 ? '-translate-y-2' : ''
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,112,87,0.18)] via-white to-[rgba(8,145,178,0.15)]" />
              <img
                src={src}
                alt="Signup visual"
                className="relative h-full w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-3xl p-6 md:p-10 animate-fade-up">{children}</section>
    </main>
  </div>
)

const LoginPage = ({ onNavigate, onLogin, loading, error, route }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    onLogin({ email, password })
  }

  return (
    <AuthShell
      title="Welcome back to your thinking space."
      subtitle="Log in to keep your chat history, prompts, and experiments in one place."
      imageUrls={route.imageUrls}
      onNavigate={onNavigate}
      route="login"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Login</h3>
          <p className="text-sm text-slate-500">Use your team credentials to continue.</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-[rgba(255,112,87,0.15)] text-xs font-semibold text-slate-700">
          Gemini default
        </span>
      </div>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <FormError message={error} />
        <div>
          <label className="text-sm font-semibold text-slate-700">Email</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(8,145,178,0.35)]"
            placeholder="you@studio.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Password</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(8,145,178,0.35)]"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
            Remember me
          </label>
          <button type="button" className="font-semibold text-slate-700 hover:text-slate-900">
            Forgot password?
          </button>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-70"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Continue to chat'}
        </button>
        <p className="text-center text-sm text-slate-500">
          No account?{' '}
          <button type="button" onClick={() => onNavigate('signup')} className="font-semibold text-slate-900">
            Create one
          </button>
        </p>
      </form>
    </AuthShell>
  )
}

const SignupPage = ({ onNavigate, onSignup, loading, error, route }) => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  })

  const updateField = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    onSignup(form)
  }

  return (
    <AuthShell
      title="Build your own memory for every conversation."
      subtitle="Sign up to save chats, collaborate, and keep the Gemini workspace synced across devices."
      imageUrls={route.imageUrls}
      onNavigate={onNavigate}
      route="signup"
    >
      <div>
        <h3 className="text-2xl font-semibold text-slate-900">Create account</h3>
        <p className="text-sm text-slate-500">Your new chat workspace is seconds away.</p>
      </div>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <FormError message={error} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">First name</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(255,112,87,0.35)]"
              placeholder="Aidan"
              value={form.first_name}
              onChange={updateField('first_name')}
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Last name</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(255,112,87,0.35)]"
              placeholder="L."
              value={form.last_name}
              onChange={updateField('last_name')}
              required
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Email</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(255,112,87,0.35)]"
            placeholder="you@studio.com"
            type="email"
            value={form.email}
            onChange={updateField('email')}
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Password</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(255,112,87,0.35)]"
            placeholder="Create a secure password"
            type="password"
            value={form.password}
            onChange={updateField('password')}
            required
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" required />
          I agree to the Terms and Privacy policy.
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-[rgb(var(--accent))] py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-70"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <button type="button" onClick={() => onNavigate('login')} className="font-semibold text-slate-900">
            Login
          </button>
        </p>
      </form>
    </AuthShell>
  )
}

const ChatPage = ({ auth, onNavigate, onLogout }) => {
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const accessToken = auth?.access_token

  const loadSessions = async () => {
    if (!accessToken) return
    setLoadingSessions(true)
    setError(null)
    try {
      const response = await fetchSessions(accessToken)
      const items = response?.data?.items || []
      setSessions(items)
      if (items.length > 0) {
        setActiveSessionId(items[0].id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadMessages = async (sessionId) => {
    if (!accessToken || !sessionId) return
    setError(null)
    try {
      const response = await fetchMessages(accessToken, sessionId)
      const items = response?.data?.items || []
      setMessages(items)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [accessToken])

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId)
    } else {
      setMessages([])
    }
  }, [activeSessionId])

  const ensureSession = async () => {
    if (activeSessionId) return activeSessionId
    const response = await createSession(accessToken, null)
    const session = response?.data
    if (session) {
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
      setMessages([])
      return session.id
    }
    return null
  }

  const handleNewChat = async () => {
    setError(null)
    try {
      const response = await createSession(accessToken, null)
      const session = response?.data
      if (!session) {
        throw new Error('Unable to create a new chat session')
      }
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
      setMessages([])
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    setError(null)
    const content = input.trim()
    setInput('')
    try {
      const sessionId = await ensureSession()
      if (!sessionId) throw new Error('Unable to create a chat session')

      const optimistic = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
      }
      setMessages((prev) => [...prev, optimistic])

      const response = await sendMessage(accessToken, sessionId, content)
      const payload = response?.data
      const userMessage = payload?.user_message
      const assistantMessage = payload?.assistant_message

      setMessages((prev) =>
        prev
          .filter((msg) => msg.id !== optimistic.id)
          .concat([userMessage, assistantMessage].filter(Boolean))
      )

      if (payload?.user_message?.content) {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  title: session.title || payload.user_message.content.slice(0, 60),
                }
              : session
          )
        )
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-screen bg-[#f7f4ef] flex overflow-hidden">
      <aside className="w-full max-w-xs border-r border-slate-200 bg-white/70 backdrop-blur px-6 py-8 flex flex-col gap-6 h-screen overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Workspace</p>
            <h2 className="text-xl font-semibold text-slate-900">Chat library</h2>
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="h-10 w-10 rounded-full bg-slate-900 text-white text-sm font-semibold"
          >
            {getInitials(auth?.user)}
          </button>
        </div>
        <button
          onClick={handleNewChat}
          className="rounded-xl bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 transition"
        >
          + New chat
        </button>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {loadingSessions ? (
            <p className="text-sm text-slate-500">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-500">No sessions yet. Start a new chat.</p>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId
              return (
                <div
                  key={session.id}
                  className={`group w-full rounded-xl border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setActiveSessionId(session.id)}
                      className="flex-1 text-left"
                    >
                      <p
                        className={`text-sm font-semibold ${
                          isActive ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {session.title || 'New chat'}
                      </p>
                      <p
                        className={`text-xs ${
                          isActive ? 'text-white/70' : 'text-slate-600'
                        }`}
                      >
                        {formatSessionTime(session.created_at)}
                      </p>
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        const remaining = sessions.filter((item) => item.id !== session.id)
                        setSessions(remaining)
                        if (session.id === activeSessionId) {
                          setMessages([])
                          setActiveSessionId(remaining[0]?.id ?? null)
                        }
                      }}
                      className={`text-xs font-semibold ${
                        isActive ? 'text-white/70' : 'text-slate-400'
                      } opacity-0 transition group-hover:opacity-100`}
                      aria-label="Hide chat"
                      title="Hide chat from sidebar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <button
          onClick={onLogout}
          className="text-left text-sm text-slate-500 hover:text-slate-700"
        >
          Log out
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-h-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/60 backdrop-blur">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {sessions.find((session) => session.id === activeSessionId)?.title ||
                'Start a new chat'}
            </h1>
            <p className="text-xs text-slate-500">Gemini 1.5 Flash • Memory on</p>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-6 py-6 space-y-6 min-h-0">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {messages.length === 0 ? (
            <div className="max-w-2xl rounded-2xl px-5 py-4 shadow-sm bg-white border border-slate-200">
              <p className="text-sm leading-relaxed text-slate-600">
                Start a conversation to see messages here.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-2xl rounded-2xl px-5 py-4 shadow-sm ${
                  message.role === 'assistant'
                    ? 'bg-white border border-slate-200'
                    : 'ml-auto bg-slate-900 text-white'
                }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    className="markdown"
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm leading-relaxed text-white">{message.content}</p>
                )}
              </div>
            ))
          )}
        </section>

        <footer className="border-t border-slate-200 bg-white/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <button className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500">
              +
            </button>
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <input
                className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                placeholder="Send a message to Gemini..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
              />
            </div>
            <button
              onClick={handleSend}
              className="h-10 px-4 rounded-xl bg-[rgb(var(--accent))] text-white text-sm font-semibold disabled:opacity-70"
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Press Enter to send • Shift + Enter for a new line.</p>
        </footer>
      </main>
    </div>
  )
}

const ProfilePage = ({ auth, onNavigate, onLogout }) => (
  <div className="min-h-screen bg-[#f7f4ef] flex items-center justify-center px-6">
    <div className="glass-panel rounded-3xl p-8 max-w-lg w-full animate-fade-up">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-semibold">
          {getInitials(auth?.user)}
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {auth?.user?.first_name} {auth?.user?.last_name}
          </h2>
          <p className="text-sm text-slate-500">{auth?.user?.email}</p>
        </div>
      </div>
      <div className="mt-6 space-y-3 text-sm text-slate-600">
        <p>Role: {auth?.user?.role?.name || 'user'}</p>
        <p>Status: {auth?.user?.is_active ? 'Active' : 'Inactive'}</p>
        <p>Workspace: Lucid Loop</p>
      </div>
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => onNavigate('chat')}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          Back to chat
        </button>
        <button
          onClick={onLogout}
          className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Log out
        </button>
      </div>
    </div>
  </div>
)

function App() {
  const [route, setRoute] = useState(getInitialRoute)
  const [auth, setAuth] = useState(loadAuth)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const handler = () => setRoute(getInitialRoute())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  useEffect(() => {
    if (!auth?.access_token) return
    const refreshProfile = async () => {
      try {
        const response = await fetchProfile(auth.access_token)
        if (response?.data) {
          const nextAuth = { ...auth, user: response.data }
          setAuth(nextAuth)
          saveAuth(nextAuth)
        }
      } catch {
        setAuth(null)
        saveAuth(null)
        setRoute('login')
      }
    }
    refreshProfile()
  }, [auth?.access_token])

  const navigate = (next) => {
    window.location.hash = next
    setRoute(next)
  }

  const handleLogin = async ({ email, password }) => {
    setAuthError(null)
    setAuthLoading(true)
    try {
      const response = await loginRequest(email, password)
      const token = response?.data
      if (!token) throw new Error('Login failed')
      setAuth(token)
      saveAuth(token)
      navigate('chat')
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignup = async (payload) => {
    setAuthError(null)
    setAuthLoading(true)
    try {
      const response = await registerRequest(payload)
      const token = response?.data
      if (!token) throw new Error('Signup failed')
      setAuth(token)
      saveAuth(token)
      navigate('chat')
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setAuth(null)
    saveAuth(null)
    navigate('login')
  }

  const assetBase = useMemo(() => {
    const bucket = import.meta.env.VITE_ASSET_BUCKET
    return bucket ? `https://storage.googleapis.com/${bucket}` : ''
  }, [])

  const imageUrls = [
    `${assetBase}/images/signup-hero-1.jpg`,
    `${assetBase}/images/signup-hero-2.jpg`,
    `${assetBase}/images/signup-hero-3.jpg`,
  ]

  const secureRoute = ['chat', 'profile']
  const effectiveRoute = !auth && secureRoute.includes(route) ? 'login' : route

  if (effectiveRoute === 'signup') {
    return (
      <SignupPage
        onNavigate={navigate}
        onSignup={handleSignup}
        loading={authLoading}
        error={authError}
        route={{ imageUrls }}
      />
    )
  }

  if (effectiveRoute === 'chat') {
    return <ChatPage auth={auth} onNavigate={navigate} onLogout={handleLogout} />
  }

  if (effectiveRoute === 'profile') {
    return <ProfilePage auth={auth} onNavigate={navigate} onLogout={handleLogout} />
  }

  return (
    <LoginPage
      onNavigate={navigate}
      onLogin={handleLogin}
      loading={authLoading}
      error={authError}
      route={{ imageUrls }}
    />
  )
}

export default App
