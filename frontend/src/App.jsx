import { useEffect, useMemo, useState } from 'react'

const routes = ['login', 'signup', 'chat', 'profile']

const sampleSessions = [
  { id: 'sess-1', title: 'Pricing a new feature', time: '2h ago', active: true },
  { id: 'sess-2', title: 'Roadmap brainstorm', time: 'Yesterday', active: false },
  { id: 'sess-3', title: 'Onboarding email draft', time: 'Mon', active: false },
  { id: 'sess-4', title: 'Bug triage notes', time: 'Sun', active: false },
]

const sampleMessages = [
  { id: 1, role: 'assistant', content: 'Hey Aidan, ready to pick up where we left off?' },
  { id: 2, role: 'user', content: 'Yes—help me summarize the sprint goals and risks.' },
  {
    id: 3,
    role: 'assistant',
    content:
      'Got it. Sprint goals: ship chat persistence, refine auth flows, and add a clean UI. Risks: migration conflicts and missing env vars in prod. Want a tighter list?',
  },
]

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

      <section className="glass-panel rounded-3xl p-6 md:p-10 animate-fade-up">
        {children}
      </section>
    </main>
  </div>
)

const LoginPage = ({ onNavigate, route }) => (
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
    <form className="mt-8 space-y-4">
      <div>
        <label className="text-sm font-semibold text-slate-700">Email</label>
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(8,145,178,0.35)]"
          placeholder="you@studio.com"
          type="email"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700">Password</label>
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(8,145,178,0.35)]"
          placeholder="••••••••"
          type="password"
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
        type="button"
        onClick={() => onNavigate('chat')}
        className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
      >
        Continue to chat
      </button>
      <p className="text-center text-sm text-slate-500">
        No account?{' '}
        <button
          type="button"
          onClick={() => onNavigate('signup')}
          className="font-semibold text-slate-900"
        >
          Create one
        </button>
      </p>
    </form>
  </AuthShell>
)

const SignupPage = ({ onNavigate, route }) => (
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
    <form className="mt-8 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-700">First name</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(255,112,87,0.35)]"
            placeholder="Aidan"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Last name</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(255,112,87,0.35)]"
            placeholder="L."
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700">Email</label>
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(255,112,87,0.35)]"
          placeholder="you@studio.com"
          type="email"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700">Password</label>
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(255,112,87,0.35)]"
          placeholder="Create a secure password"
          type="password"
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
        I agree to the Terms and Privacy policy.
      </div>
      <button
        type="button"
        onClick={() => onNavigate('chat')}
        className="w-full rounded-xl bg-[rgb(var(--accent))] py-3 text-sm font-semibold text-white hover:opacity-90 transition"
      >
        Create account
      </button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="font-semibold text-slate-900"
        >
          Login
        </button>
      </p>
    </form>
  </AuthShell>
)

const ChatPage = ({ onNavigate }) => (
  <div className="min-h-screen bg-[#f7f4ef] flex">
    <aside className="w-full max-w-xs border-r border-slate-200 bg-white/70 backdrop-blur px-6 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Workspace</p>
          <h2 className="text-xl font-semibold text-slate-900">Chat library</h2>
        </div>
        <button
          onClick={() => onNavigate('profile')}
          className="h-10 w-10 rounded-full bg-slate-900 text-white text-sm font-semibold"
        >
          AL
        </button>
      </div>
      <button className="rounded-xl bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 transition">
        + New chat
      </button>
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <input className="w-full text-sm focus:outline-none" placeholder="Search chats" />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {sampleSessions.map((session) => (
          <button
            key={session.id}
            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
              session.active
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-sm font-semibold">{session.title}</p>
            <p className={`text-xs ${session.active ? 'text-white/70' : 'text-slate-500'}`}>
              {session.time}
            </p>
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-slate-900 text-white p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Plan</p>
        <p className="mt-2 text-sm font-semibold">Gemini Pro Workspace</p>
        <p className="text-xs text-white/60">7 days left on trial</p>
        <button className="mt-3 w-full rounded-lg bg-white text-slate-900 py-2 text-xs font-semibold">
          Upgrade
        </button>
      </div>
    </aside>

    <main className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/60 backdrop-blur">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pricing a new feature</h1>
          <p className="text-xs text-slate-500">Gemini 1.5 Flash • Memory on</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
            Share
          </button>
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            New prompt
          </button>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {sampleMessages.map((message) => (
          <div
            key={message.id}
            className={`max-w-2xl rounded-2xl px-5 py-4 shadow-sm ${
              message.role === 'assistant'
                ? 'bg-white border border-slate-200'
                : 'ml-auto bg-slate-900 text-white'
            }`}
          >
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 bg-white/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <button className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500">
            +
          </button>
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <input
              className="w-full text-sm focus:outline-none"
              placeholder="Send a message to Gemini..."
            />
          </div>
          <button className="h-10 px-4 rounded-xl bg-[rgb(var(--accent))] text-white text-sm font-semibold">
            Send
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Press Enter to send • Shift + Enter for a new line.
        </p>
      </footer>
    </main>
  </div>
)

const ProfilePage = ({ onNavigate }) => (
  <div className="min-h-screen bg-[#f7f4ef] flex items-center justify-center px-6">
    <div className="glass-panel rounded-3xl p-8 max-w-lg w-full animate-fade-up">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-semibold">
          AL
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Aidan Licoppe</h2>
          <p className="text-sm text-slate-500">admin@studio.com</p>
        </div>
      </div>
      <div className="mt-6 space-y-3 text-sm text-slate-600">
        <p>Role: Admin</p>
        <p>Plan: Gemini Pro Workspace</p>
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
          onClick={() => onNavigate('login')}
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

  useEffect(() => {
    const handler = () => setRoute(getInitialRoute())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navigate = (next) => {
    window.location.hash = next
    setRoute(next)
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

  if (route === 'signup') {
    return <SignupPage onNavigate={navigate} route={{ imageUrls }} />
  }

  if (route === 'chat') {
    return <ChatPage onNavigate={navigate} />
  }

  if (route === 'profile') {
    return <ProfilePage onNavigate={navigate} />
  }

  return <LoginPage onNavigate={navigate} route={{ imageUrls }} />
}

export default App
