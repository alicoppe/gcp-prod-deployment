import { useState } from 'react'

const messages = [
  'FastAPI + React + Tailwind starter',
  'Backend lives at /api/v1',
  'Front-end served through Caddy in docker-compose',
]

function App() {
  const [index, setIndex] = useState(0)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      <div className="max-w-xl w-full px-6 py-8 rounded-2xl bg-slate-900/70 backdrop-blur border border-slate-700 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-500 text-slate-900 font-semibold">FA</span>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Starter Frontend</p>
            <h1 className="text-2xl font-semibold text-slate-50">FastAPI Template</h1>
          </div>
        </div>

        <p className="text-lg text-slate-200 mb-4">{messages[index]}</p>
        <p className="text-sm text-slate-400 mb-6">
          This is a placeholder React + Tailwind page. Replace it with your app UI.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setIndex((index + 1) % messages.length)}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 transition"
          >
            Next message
          </button>
          <a
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:border-emerald-500 hover:text-emerald-200 transition"
            href="http://fastapi.localhost/docs"
            target="_blank"
            rel="noreferrer"
          >
            API docs
          </a>
        </div>
      </div>
    </div>
  )
}

export default App
