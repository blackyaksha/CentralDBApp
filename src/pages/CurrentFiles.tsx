import { useEffect, useState } from 'react'
import type { Database } from '../generated/models/DatabaseModel'
import { DatabaseService } from '../generated'

export default function CurrentFiles() {
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
        const tryArray = (obj: any): any[] | null => {
          if (!obj) return null
          if (Array.isArray(obj)) return obj
          if (Array.isArray(obj.value)) return obj.value
          if (Array.isArray(obj.result)) return obj.result
          if (Array.isArray(obj.result?.value)) return obj.result.value
          if (Array.isArray(obj.value?.value)) return obj.value.value
          for (const k of Object.keys(obj)) {
            if (Array.isArray(obj[k])) return obj[k]
          }
          return null
        }

        const data = tryArray(res)
        if (mounted) {
          if (data) setItems(data)
          else setError('No array found in service response')
        }
      })
      .catch((err) => mounted && setError(String(err)))
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <>
      {/* SEARCH BAR */}
      <div className="search-bar">
        <input
          type="search"
          placeholder="Search Title or File Path..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && <button onClick={() => setQuery('')}>×</button>}
      </div>

      {/* GALLERY */}
      {!loading && items && (
        <div className="gallery-wrapper">
          {(() => {
            const getValue = (obj: any, key: string) => {
              if (!obj) return undefined
              if (key.includes('.'))
                return key.split('.').reduce((o, k) => (o ? o[k] : undefined), obj)
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
              try {
                const decoded = val.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                if (/<\s*a\b/i.test(decoded)) {
                  const doc = new DOMParser().parseFromString(decoded, 'text/html')
                  return doc.querySelector('a')?.getAttribute('href') ?? null
                }
                if (/^https?:\/\//i.test(decoded)) return decoded
              } catch {}
              return null
            }

            const renderIconTemplate = (it: any) => {
              const fileType = String(getValue(it, 'FileType') ?? '').toLowerCase()
              return (
                <div className="icon-template" aria-hidden>
                  <div className="icon-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <rect
                        width="20"
                        height="20"
                        x="2"
                        y="2"
                        rx="3"
                        stroke="#cfd8e3"
                        strokeWidth="1.2"
                        fill="#f6f8fa"
                      />
                      <path
                        d="M7 9h10M7 13h6"
                        stroke="#6b7280"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="icon-label">{fileType || 'file'}</div>
                </div>
              )
            }

            return (
              <div className="gallery-grid">
                {visibleItems.map((it, idx) => {
                  const rowHref = extractHrefFromFileURL(getValue(it, 'FileURL'))
                  const title = getValue(it, 'Title') ?? `Item ${idx + 1}`
                  const path = getValue(it, 'FilePath') ?? ''
                  const keyStr = String(it.ID ?? idx)
                  const expanded = !!expandedMap[keyStr]

                  return (
                    <article
                      key={keyStr}
                      className={'gallery-card' + (rowHref ? ' clickable' : '')}
                      onClick={(e) => {
                        const a = (e.target as HTMLElement).closest('a')
                        if (a) return
                        if (rowHref) window.location.href = rowHref
                      }}
                    >
                      {renderIconTemplate(it)}

                      <div className="card-body">
                        <div className="card-header">
                          <h3 className={'card-title' + (expanded ? ' expanded' : '')}>
                            {String(title)}
                          </h3>
                          <button
                          className={'expand-toggle' + (expanded ? ' expanded' : '')}
                          aria-expanded={expanded}
                          aria-label={expanded ? 'Collapse' : 'Expand'}
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedMap((m) => ({
                              ...m,
                              [keyStr]: !m[keyStr],
                            }))
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M6 9l6 6 6-6" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        </div>

                        <div
                          className={'card-path' + (expanded ? ' expanded' : '')}
                          title={String(path)}
                        >
                          {String(path)}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </>
  )
}
