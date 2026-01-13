import { useEffect, useState } from 'react'
import type { Database } from '../generated/models/DatabaseModel'
import { DatabaseService } from '../generated'

export default function CurrentFiles() {
  const [items, setItems] = useState<Database[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const [activeFolder, setActiveFolder] = useState<string | null>(null)

  const getParentFolder = (path: any): string => {
    if (!path || typeof path !== 'string') return 'Unknown'

    const parts = path
      .split('/')
      .filter(Boolean)

    return parts[1] ?? 'Unknown'
  }

  const getDisplayPath = (path: any): string => {
  if (!path || typeof path !== 'string') return 'Unknown'
  const parts = path.split('/').filter(Boolean)
  return parts.slice(0, 2).join('/') // e.g. SharedDocuments/PD
  }


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

            // 🔹 base list depends on whether a folder is active
            const baseItems = activeFolder
              ? (items ?? []).filter((it: any) => getParentFolder(getValue(it, 'FilePath')) === activeFolder)
              : (items ?? [])

            // 🔹 apply search
            const searchedItems = baseItems.filter(matchesQuery)

            const rootGroupedItems = !activeFolder
            ? searchedItems.reduce<Record<string, any[]>>((acc, it) => {
                const path = getValue(it, 'FilePath')
                const parent = getParentFolder(path)

                if (!acc[parent]) acc[parent] = []
                acc[parent].push(it)

                return acc
              }, {})
            : {}

            
            const isFolder = (it: any): boolean => {
              // adjust if your backend uses a different flag
              return Boolean(
                getValue(it, 'IsFolder') ||
                getValue(it, 'FSObjType') === 1
              )
            }


            // ✅ Updated function to handle relative SharePoint URLs
            const extractHrefFromFileURL = (val: any): string | null => {
              if (!val) return null

              const SP_DOMAIN = 'https://energyregcomm.sharepoint.com'

              // If it's an object with Url property
              if (typeof val === 'object' && val.Url) {
                const url = val.Url
                if (url.startsWith('/')) return `${SP_DOMAIN}${url}`
                return url
              }

              if (typeof val === 'string') {
                try {
                  const decoded = val.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                  // Relative path
                  if (decoded.startsWith('/')) return `${SP_DOMAIN}${decoded}`
                  // HTML <a> tag
                  if (/<\s*a\b/i.test(decoded)) {
                    const doc = new DOMParser().parseFromString(decoded, 'text/html')
                    const href = doc.querySelector('a')?.getAttribute('href')
                    if (href?.startsWith('/')) return `${SP_DOMAIN}${href}`
                    return href ?? null
                  }
                  // Already absolute URL
                  if (/^https?:\/\//i.test(decoded)) return decoded
                } catch {
                  return null
                }
              }

              return null
            }

            const renderIconTemplate = (it: any) => {
              const fileType = String(getValue(it, 'FileType') ?? '').toLowerCase()
              return (
                <div className="icon-template" aria-hidden={true}>
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
      <div className={'gallery-grid' + (lowerQuery ? ' horizontal' : '')}>
        {/* 🔙 BACK CARD */}
        {activeFolder && (
          <article
            className="gallery-card folder-card back"
            onClick={() => setActiveFolder(null)}
          >
            <div className="card-body">
              <div className="card-header">
                <h3 className="card-title">⬅ Back</h3>
              </div>

              <div className="card-path">Return to parent folders</div>
            </div>
          </article>
        )}

        {/* 📁 PARENT FOLDER VIEW */}
        {!activeFolder && (
          lowerQuery ? (
            (() => {
              const groupedByPath = searchedItems.reduce<Record<string, any[]>>(
                (acc, it) => {
                  const path = getDisplayPath(getValue(it, 'FilePath'))
                  if (!acc[path]) acc[path] = []
                  acc[path].push(it)
                  return acc
                },
                {}
              )

              return Object.entries(groupedByPath).map(([pathLabel, itemsInPath]) => (
                <div key={pathLabel} className="search-group">
                  {/* 🔹 PATH DIVIDER */}
                  <div className="path-divider">
                    <span>{pathLabel}</span>
                  </div>

                  {/* 🔹 CARDS UNDER THIS PATH */}
                  <div className="gallery-grid">
                    {itemsInPath.map((it: any, idx: number) => {
                      const rowHref = extractHrefFromFileURL(getValue(it, 'FileURL'))
                      const title = getValue(it, 'Title') ?? `Item ${idx + 1}`
                      const path = getValue(it, 'FilePath') ?? ''
                      const keyStr = String(it.ID ?? `${pathLabel}-${idx}`)
                      const expanded = !!expandedMap[keyStr]

                      return (
                        <article
                          key={keyStr}
                          className={'gallery-card' + (isFolder(it) ? ' folder-card' : '')}
                          onClick={() => {
                            if (isFolder(it)) {
                              setActiveFolder(getParentFolder(path))
                            } else if (rowHref) {
                              window.open(rowHref, '_blank', 'noopener,noreferrer')
                            }
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedMap((m) => ({ ...m, [keyStr]: !m[keyStr] }))
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path
                                    d="M6 9l6 6 6-6"
                                    stroke="#374151"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </div>

                            <div
                              className={'card-path' + (expanded ? ' expanded' : '')}
                              title={String(path)}
                            >
                              {String(path)}
                            </div>

                            {/* details shown via expanded card-path (matches main gallery behavior) */}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ))
            })()
          ) : (

            Object.entries(rootGroupedItems).map(([folderName, files]) => (
              <article
                key={folderName}
                className="gallery-card folder-card"
                onClick={() => setActiveFolder(folderName)}
              >
                <div className="card-body">
                  <h3 className="card-title">📁 {folderName}</h3>
                  <div className="card-path">
                    {files.length} item{files.length !== 1 && 's'}
                  </div>
                </div>
              </article>
            ))
          )
        )}


        {/* 📄 FILES INSIDE SELECTED FOLDER */}
{activeFolder &&
  (() => {
    const folders = searchedItems.filter(isFolder)
    const files = searchedItems.filter(it => !isFolder(it))
    let orderedItems = [...folders, ...files]

    // Ensure the opened parent folder is shown first in the row.
    const parentTitle = activeFolder
    if (parentTitle) {
      const alreadyHas = orderedItems.some((it) => String(getValue(it, 'Title')) === parentTitle)
      if (!alreadyHas) {
        const parentEntry = {
          ID: `parent-${parentTitle}`,
          Title: parentTitle,
          FilePath: parentTitle,
          IsFolder: true,
        }
        orderedItems = [parentEntry as any, ...orderedItems]
      } else {
        // move existing matching entry to front
        const idx = orderedItems.findIndex((it) => String(getValue(it, 'Title')) === parentTitle)
        if (idx > 0) {
          const [p] = orderedItems.splice(idx, 1)
          orderedItems.unshift(p)
        }
      }
    }

    return orderedItems.map((it, idx) => {
      const rowHref = extractHrefFromFileURL(getValue(it, 'FileURL'))
      const title = getValue(it, 'Title') ?? `Item ${idx + 1}`
      const path = getValue(it, 'FilePath') ?? ''
      const keyStr = String(it.ID ?? idx)
      const expanded = !!expandedMap[keyStr]

      return (
        <article
          key={keyStr}
          className="gallery-card"
          onClick={() => {
            if (rowHref) {
              window.open(rowHref, '_blank', 'noopener,noreferrer')
            }
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
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedMap((m) => ({ ...m, [keyStr]: !m[keyStr] }))
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#374151"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className={'card-path' + (expanded ? ' expanded' : '')} title={String(path)}>
              {String(path)}
            </div>
          </div>
        </article>
              )
            })
          })()}
      </div>
    )
  })()}
        </div>
      )}
    </>
  )
}
