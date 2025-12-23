import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import type { Database } from './generated/models/DatabaseModel'
import { DatabaseService } from './generated'

function App() {
  const [items, setItems] = useState<Database[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let mounted = true
    setLoading(true)
    DatabaseService.getAll()
      .then((res: any) => {
        // Robustly extract an array from common IOperationResult shapes
        const tryArray = (obj: any): any[] | null => {
          if (!obj) return null
          if (Array.isArray(obj)) return obj
          if (Array.isArray(obj.value)) return obj.value
          if (Array.isArray(obj.result)) return obj.result
          if (Array.isArray(obj.result?.value)) return obj.result.value
          if (Array.isArray(obj.value?.value)) return obj.value.value
          // look for the first array property on the object
          for (const k of Object.keys(obj)) {
            if (Array.isArray(obj[k])) return obj[k]
          }
          return null
        }

        const data = tryArray(res)
        if (mounted) {
          if (data) setItems(data)
          else {
            // keep response for debugging when no data found
            // eslint-disable-next-line no-console
            console.debug('DatabaseService.getAll() response shape:', res)
            setError('No array found in service response — see console for details')
          }
        }
      })
      .catch((err) => {
        if (mounted) setError(String(err))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="App">
      <header>
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>Data Source — Tabular View</h1>
        <div className="search-bar">
          <input
            type="search"
            placeholder="Search Title or File Path..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search items by title or file path"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              ×
            </button>
          )}
        </div>
      </header>

      <main>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        

        {!loading && items && (
          <div className="gallery-wrapper">
            {(() => {
              const getValue = (obj: any, key: string) => {
                if (!obj) return undefined
                if (key.includes('.')) return key.split('.').reduce((o, k) => (o ? o[k] : undefined), obj)
                return obj[key]
              }

              const lowerQuery = query.trim().toLowerCase()
              const matchesQuery = (it: any) => {
                if (!lowerQuery) return true
                const tokens = lowerQuery.split(/\s+/).filter(Boolean)
                const title = String(getValue(it, 'Title') ?? '').toLowerCase()
                const path = String(getValue(it, 'FilePath') ?? '').toLowerCase()
                return tokens.every((t) => title.includes(t) || path.includes(t))
              }

              const visibleItems = (items || []).filter(matchesQuery)

              const extractHrefFromFileURL = (val: any): string | null => {
                if (!val || typeof val !== 'string') return null
                const str = val
                try {
                  const decoded = str.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                  const hasAnchor = /<\s*a\b/i.test(decoded)
                  if (hasAnchor) {
                    const parser = new DOMParser()
                    const doc = parser.parseFromString(decoded, 'text/html')
                    const anchor = doc.querySelector('a')
                    const href = anchor?.getAttribute('href') ?? null
                    return href
                  }
                  if (/^https?:\/\//i.test(decoded)) return decoded
                } catch {
                  // fallthrough
                }
                return null
              }

              const renderIconTemplate = (it: any) => {
                const fileType = String(getValue(it, 'FileType') ?? '').toLowerCase()
                // Basic template: show an SVG placeholder and file type; user can replace with custom icons
                return (
                  <div className="icon-template" aria-hidden>
                    <div className="icon-placeholder">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="20" height="20" x="2" y="2" rx="3" stroke="#cfd8e3" strokeWidth="1.2" fill="#f6f8fa" />
                        <path d="M7 9h10M7 13h6" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="icon-label">{fileType || 'file'}</div>
                  </div>
                )
              }

              return (
                <div className="gallery-grid">
                    {visibleItems.map((it, idx) => {
                    const rowHref = extractHrefFromFileURL(getValue(it as any, 'FileURL'))
                    const title = getValue(it as any, 'Title') ?? `Item ${idx + 1}`
                    const path = getValue(it as any, 'FilePath') ?? ''
                    const keyStr = String(it.ID ?? idx)
                    const expanded = !!expandedMap[keyStr]
                    return (
                      <article
                        key={it.ID ?? idx}
                        className={"gallery-card" + (rowHref ? ' clickable' : '')}
                        onClick={(e) => {
                          const a = (e.target as HTMLElement).closest('a')
                          if (a) return
                          if (rowHref) window.location.href = rowHref
                        }}
                      >
                        {renderIconTemplate(it)}
                        <div className="card-body">
                          <div className="card-header">
                            <h3 className={"card-title" + (expanded ? ' expanded' : '')}>{String(title)}</h3>
                            <button
                              className={"expand-toggle" + (expanded ? ' expanded' : '')}
                              aria-expanded={expanded}
                              aria-label={expanded ? 'Collapse' : 'Expand'}
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedMap((m) => ({ ...m, [keyStr]: !m[keyStr] }))
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 9l6 6 6-6" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                          <div className={"card-path" + (expanded ? ' expanded' : '')} title={String(path)}>{String(path)}</div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {!loading && !items && !error && <p>No data available.</p>}
      </main>
    </div>
  )
}

export default App
