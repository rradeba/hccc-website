import { lazy, Suspense } from 'react'
import { API_URL } from './config/api.js'

// Import CRM CSS at build time so it gets processed by PostCSS
import '@crm/index.css'

const CRMPage = lazy(async () => {
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = { env: {} }
  } else if (!globalThis.process.env) {
    globalThis.process.env = {}
  }
  globalThis.process.env.REACT_APP_BACKEND_URL = API_URL
  const module = await import('@crm/App.jsx')
  return { default: module.default }
})

export default function CRMWrapper() {
  return (
    <div className="h-full w-full">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
            Loading dashboard…
          </div>
        }
      >
        <CRMPage />
      </Suspense>
    </div>
  )
}

