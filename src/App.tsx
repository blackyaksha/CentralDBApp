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
      </header>

      <main>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {!loading && items && (
          <div className="table-wrapper">
            {/** Use the SharePoint schema's tabular display order as a sensible default */}
            {(() => {
              const columns: { key: string; label?: string }[] = [
                { key: 'ID', label: 'ID' },
                { key: 'Title', label: 'Title' },
                { key: 'FilePath', label: 'File Path' },
                { key: 'FileType', label: 'File Type' },              ]

              const getValue = (obj: any, key: string) => {
                if (!obj) return undefined
                if (key.includes('.')) {
                  return key.split('.').reduce((o, k) => (o ? o[k] : undefined), obj)
                }
                return obj[key]
              }

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
                  // if plain URL
                  if (/^https?:\/\//i.test(decoded)) return decoded
                } catch {
                  // fallthrough
                }
                return null
              }

              const renderCell = (value: any, key: string) => {
                if (value == null) return ''
                if (key === 'FileURL' && typeof value === 'string') {
                  const str = value
                  try {
                    // Detect raw or encoded anchor and extract href/text if present
                    const decoded = str.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                    const hasAnchor = /<\s*a\b/i.test(decoded)
                    if (hasAnchor) {
                      const parser = new DOMParser()
                      const doc = parser.parseFromString(decoded, 'text/html')
                      const anchor = doc.querySelector('a')
                      const href = anchor?.getAttribute('href') ?? ''
                      const text = anchor?.textContent ?? anchor?.getAttribute('title') ?? href
                      const markup = doc.body.innerHTML || decoded
                      return (
                        <div className="fileurl-cell">
                          <div className="fileurl-text" dangerouslySetInnerHTML={{ __html: markup }} />
                          <div className="fileurl-action">
                            <a href={href || decoded} target="_blank" rel="noreferrer">Open</a>
                          </div>
                        </div>
                      )
                    }

                    // plain URL: show the URL text (wrapped) and an Open link
                    return (
                      <div className="fileurl-cell">
                        <div className="fileurl-text">{str}</div>
                        <div className="fileurl-action">
                          <a href={str} target="_blank" rel="noreferrer">Open</a>
                        </div>
                      </div>
                    )
                  } catch {
                    return (
                      <div className="fileurl-cell">
                        <div className="fileurl-text">{str}</div>
                        <div className="fileurl-action">
                          <a href={str} target="_blank" rel="noreferrer">Open</a>
                        </div>
                      </div>
                    )
                  }
                }
                if (typeof value === 'object') {
                  if (value.DisplayName) return value.DisplayName
                  try {
                    return JSON.stringify(value)
                  } catch {
                    return String(value)
                  }
                }
                return String(value)
              }

              return (
                <table>
                  {/*
                    Edit column widths here — each <col> corresponds to the
                    columns defined in the `columns` array below (same order).
                    Change the `width` value on the matching <col>.

                    Mapping (col index -> column key):
                      1 -> ID
                      2 -> Title
                      3 -> FilePath
                      4 -> FileType
                      5 -> FileURL
                  */}
                  <colgroup>
                    {/* 1: ID */}
                    <col style={{ width: '150px' }} />
                    {/* 2: Title */}
                    <col style={{ width: '300px' }} />
                    {/* 3: FilePath */}
                    <col style={{ width: '300px' }} />
                    {/* 4: FileType */}
                    <col style={{ width: '140px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c.key}>{c.label ?? c.key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const rowHref = extractHrefFromFileURL(getValue(it as any, 'FileURL'))
                      return (
                        <tr
                          key={it.ID ?? idx}
                          className={rowHref ? 'clickable' : undefined}
                          onClick={(e) => {
                            // if user clicked a real link inside the row, let that work
                            const a = (e.target as HTMLElement).closest('a')
                            if (a) return
                            if (rowHref) {
                              // open in new tab to match explicit 'Open' behavior
                              window.open(rowHref, '_blank')
                            }
                          }}
                        >
                          {columns.map((c) => (
                            <td key={c.key}>
                              {renderCell(getValue(it as any, c.key), c.key)}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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
