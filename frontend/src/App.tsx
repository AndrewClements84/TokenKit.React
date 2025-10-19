import { useEffect, useMemo, useState } from 'react'

type ModelInfo = {
  id: string
  provider: string
  maxTokens: number
  inputPricePer1K?: number
  outputPricePer1K?: number
  encoding?: string
}

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return { theme, setTheme }
}

export default function App() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [providerFilter, setProviderFilter] = useState('')
  const [engine, setEngine] = useState('sharptoken')
  const [engines, setEngines] = useState<string[]>([])
  const [modelId, setModelId] = useState('')
  const [text, setText] = useState('Hello from TokenKit.React!')
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const { theme, setTheme } = useTheme()

  // ------------------------------------------------------------
  // Derived filters
  // ------------------------------------------------------------
  const filteredModels = useMemo(() => {
    return models.filter(
      (m) =>
        !providerFilter ||
        m.provider.toLowerCase().includes(providerFilter.toLowerCase())
    )
  }, [models, providerFilter])

  // ------------------------------------------------------------
  // Load models on mount
  // ------------------------------------------------------------
  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then(setModels)
      .catch(() => setModels([]))
  }, [])

  // ------------------------------------------------------------
  // Load engines dynamically
  // ------------------------------------------------------------
  useEffect(() => {
    fetch('/api/engines')
      .then((r) => r.json())
      .then((data) => {
        const engineNames = Array.isArray(data)
          ? data.map((e: any) => e.name || e.Name || e)
          : []
        if (engineNames.length > 0) setEngines(engineNames)
        else setEngines(['sharptoken', 'mltokenizers', 'simple'])
      })
      .catch(() => setEngines(['sharptoken', 'mltokenizers', 'simple']))
  }, [])

  // ------------------------------------------------------------
  // Analyze / Validate
  // ------------------------------------------------------------
  const onRun = async (mode: 'analyze' | 'validate') => {
    if (!text.trim()) {
      setResult({ error: 'Please enter some text to analyze or validate.' })
      return
    }
    if (filteredModels.length === 0) {
      setResult({ error: 'No models loaded. Upload models.json or check backend.' })
      return
    }

    setBusy(true)
    setResult(null)
    try {
      const res = await fetch(`/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Input: text,
          Model: modelId || filteredModels[0]?.id,
          Engine: engine,
        }),
      })

      const textRes = await res.text()
      try {
        const json = JSON.parse(textRes)
        setResult(json)
      } catch {
        setResult({ error: textRes })
      }
    } catch (err: any) {
      setResult({ error: err.message || 'Unexpected error' })
    } finally {
      setBusy(false)
    }
  }

  // ------------------------------------------------------------
  // Upload models.json
  // ------------------------------------------------------------
  const onUploadModels = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/models/upload?replace=false', {
      method: 'POST',
      body: form,
    })
    if (res.ok) {
      const list = await fetch('/api/models').then((r) => r.json())
      setModels(list)
    }
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors duration-300">
      <header className="sticky top-0 z-50 backdrop-blur bg-neutral-900/60 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <img
            src="/logo.png"
            className="w-10 h-10 rounded-lg shadow-glow"
            alt="TokenKit logo"
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">
              TokenKit.React
            </h1>
            <p className="text-xs text-neutral-400">
              Modern UI for TokenKit — analyze • validate • manage models
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-neutral-400 hidden sm:block">
              {theme === 'dark' ? 'Dark' : 'Light'} mode
            </span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
            >
              Toggle
            </button>
            <a
              href="/swagger"
              className="px-3 py-1 rounded-xl bg-brand hover:brightness-110 text-black font-semibold"
            >
              API
            </a>
            <a
              href="https://www.nuget.org/packages/TokenKit/"
              target="_blank"
              className="px-3 py-1 rounded-xl bg-brand/20 hover:bg-brand/30 border border-brand/40"
            >
              NuGet
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid gap-6">
        <section className="grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="col-span-2 grid gap-4">
              <label className="text-sm text-neutral-400">Input</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-40 rounded-xl bg-neutral-950/60 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand/60 p-3"
                placeholder="Paste text, prompt, or code here..."
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onRun('analyze')}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-brand text-black font-semibold hover:brightness-110 disabled:opacity-50"
                >
                  {busy ? 'Running...' : 'Analyze'}
                </button>
                <button
                  onClick={() => onRun('validate')}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-brand/20 border border-brand/40 hover:bg-brand/30 disabled:opacity-50"
                >
                  Validate
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm text-neutral-400">Provider filter</label>
                <input
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="rounded-xl bg-neutral-950/60 border border-neutral-800 px-3 py-2"
                  placeholder="OpenAI / Anthropic / Gemini ..."
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-neutral-400">Model</label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="rounded-xl bg-neutral-950/60 border border-neutral-800 px-3 py-2"
                >
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.provider}: {m.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500">
                  {filteredModels.length} models loaded
                </p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-neutral-400">Engine</label>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="rounded-xl bg-neutral-950/60 border border-neutral-800 px-3 py-2"
                >
                  {engines.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500">
                  {engines.length} engines available
                </p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-neutral-400">Upload models.json</label>
                <input
                  type="file"
                  accept="application/json"
                  onChange={(e) =>
                    e.target.files && onUploadModels(e.target.files[0])
                  }
                />
                <p className="text-xs text-neutral-500">
                  Merges into registry. Use Swagger to replace.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="text-lg font-semibold">Result</h2>
          <pre className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 overflow-auto text-sm">
            {JSON.stringify(result ?? { info: 'Run Analyze or Validate.' }, null, 2)}
          </pre>
        </section>

        <footer className="py-6 text-center text-xs text-neutral-500">
          Built with ♥ for developers — Spotify/Xbox inspired UI. TokenKit v1.0.0
        </footer>
      </main>
    </div>
  )
}
