import React, { useEffect, useState, useRef } from 'react'
import type { DatabaseRead } from '../generated/models/DatabaseModel'
import pdfIcon from '../assets/Icons/pdf.png'
import docxIcon from '../assets/Icons/docs.png'
import xlsxIcon from '../assets/Icons/sheets.png'
import pptxIcon from '../assets/Icons/pptx.png'
import parentIcon from '../assets/Icons/parent.png'
import zipIcon from '../assets/Icons/zip-folder.png'
import movIcon from '../assets/Icons/mov.png'
import mp3Icon from '../assets/Icons/mp3.png'
import mp4Icon from '../assets/Icons/mp4.png'
import m4vIcon from '../assets/Icons/m4v.png'
import tmpIcon from '../assets/Icons/tmp.png'
import rarIcon from '../assets/Icons/rar.png'
import jpgIcon from '../assets/Icons/jpg.png'
import pngIcon from '../assets/Icons/png.png'
import folderIcon from '../assets/Icons/folder.png'
import { FLOW_ENDPOINT } from '../config'

export default function CurrentFiles() {
  const [items, setItems] = useState<DatabaseRead[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [nextLink, setNextLink] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const PAGE_SIZE = 5000

  const fetchingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchAllPages = async (isFirstLoad = false) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      if (isFirstLoad) setLoading(true)
      else setLoadingMore(true)

      const body: Record<string, any> = { pageSize: PAGE_SIZE }
      if (nextLink) body.nextLink = nextLink

      const response = await fetch(
        FLOW_ENDPOINT,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) throw new Error(`Flow request failed: ${response.status}`)

      const data = await response.json()
      const newItems = Array.isArray(data.items) ? data.items : []

      setItems(prev => isFirstLoad ? newItems : [...(prev ?? []), ...newItems])
      setNextLink(data.nextLink ?? null)
      setHasMore(!!data.nextLink)
    } catch (err: any) {
      setError(err.message)
    } finally {
      fetchingRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { fetchAllPages(true) }, [])

  useEffect(() => {
    if (!hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingRef.current) fetchAllPages(false)
      },
      { threshold: 0.1 }
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, nextLink])

  const getValue = (obj: any, key: string) => {
    if (!obj) return undefined
    if (key.includes('.')) return key.split('.').reduce((o, k) => (o ? o[k] : undefined), obj)
    return obj[key]
  }

  const isFolder = (it: any): boolean =>
    Boolean(getValue(it, 'IsFolder') || getValue(it, 'FSObjType') === 1)

  const getPathParts = (path: string): string[] => {
    if (!path) return []
    return path.split('/').filter(p => p.trim() !== '')
  }

  const getCurrentLevelItems = (allItems: any[]): any[] => {
    const currentPathStr = currentPath.length > 0 ? currentPath.join('/') + '/' : ''
    const levelItems: any[] = []

    allItems.forEach(item => {
      const itemPath = String(getValue(item, 'FilePath') ?? '')
      const isItemFolder = isFolder(item)

      if (currentPathStr === '') {
        // Parent folder level - show parent folders (skip Shared Documents)
        const pathParts = getPathParts(itemPath)
        if (pathParts.length >= 2) {
          // Skip "Shared Documents" and get the parent folder
          const parentFolder = pathParts[1] // Index 1 is the parent folder after Shared Documents
          const existingFolder = levelItems.find(it =>
            isFolder(it) && getValue(it, 'Title') === parentFolder && getValue(it, 'isVirtual')
          )
          if (!existingFolder && parentFolder) {
            levelItems.push({
              Title: parentFolder,
              FilePath: `Shared Documents/${parentFolder}`,
              isVirtual: true,
              IsFolder: true,
              FSObjType: 1,
              FileType: 'folder'
            })
          }
        }
      } else {
        // Sub-level - show items that are direct children of current path
        const fullCurrentPath = `Shared Documents/${currentPathStr}`
        if (itemPath.startsWith(fullCurrentPath)) {
          const remainingPath = itemPath.substring(fullCurrentPath.length)
          const pathParts = getPathParts(remainingPath)

          if (pathParts.length === 1) {
            // Direct child
            levelItems.push(item)
          } else if (pathParts.length > 1 && isItemFolder) {
            // Create virtual folder for next level
            const nextFolder = pathParts[0]
            const existingFolder = levelItems.find(it =>
              isFolder(it) && getValue(it, 'Title') === nextFolder && getValue(it, 'isVirtual')
            )
            if (!existingFolder) {
              levelItems.push({
                Title: nextFolder,
                FilePath: fullCurrentPath + nextFolder,
                isVirtual: true,
                IsFolder: true,
                FSObjType: 1,
                FileType: 'folder'
              })
            }
          }
        }
      }
    })

    // Add parent folder card when inside a parent folder
    if (currentPath.length === 1) {
      const parentFolderName = currentPath[0]
      levelItems.unshift({
        Title: parentFolderName,
        FilePath: `Shared Documents/${parentFolderName}`,
        isVirtual: true,
        isParentCard: true,
        IsFolder: true,
        FSObjType: 1,
        FileType: 'folder'
      })
    }

    return levelItems
  }

  const extractHrefFromFileURL = (val: any): string | null => {
    if (!val) return null
    const SP_DOMAIN = 'https://energyregcomm.sharepoint.com'
    if (typeof val === 'object' && val.Url) {
      const url = val.Url
      if (url.startsWith('/')) return `${SP_DOMAIN}${url}`
      return url
    }
    if (typeof val === 'string') {
      try {
        const decoded = val.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        if (decoded.startsWith('/')) return `${SP_DOMAIN}${decoded}`
        if (/<\s*a\b/i.test(decoded)) {
          const doc = new DOMParser().parseFromString(decoded, 'text/html')
          const href = doc.querySelector('a')?.getAttribute('href')
          if (href?.startsWith('/')) return `${SP_DOMAIN}${href}`
          return href ?? null
        }
        if (/^https?:\/\//i.test(decoded)) return decoded
      } catch { return null }
    }
    return null
  }

  const getIconSrc = (it: any) => {
    const fileType = String(getValue(it, 'FileType') ?? '').toLowerCase().trim()
    const fileName = String(getValue(it, 'Title') ?? '').toLowerCase()
    const isFolderItem = Boolean(getValue(it, 'IsFolder') || getValue(it, 'FSObjType') === 1)
    const isVirtual = getValue(it, 'isVirtual')
    const isParentCard = getValue(it, 'isParentCard')
    let ext = ''
    if (fileName.includes('.')) ext = fileName.split('.').pop() || ''
    if (!ext && fileType) ext = fileType.replace('.', '').trim()

    if (isFolderItem) {
      // Use parent icon for virtual parent folders at root level
      if (isVirtual && currentPath.length === 0) {
        return parentIcon
      }
      // Use folder icon for parent card (when inside a parent folder)
      if (isParentCard) {
        return folderIcon
      }
      // Use different folder icons based on FileType or context
      if (fileType === 'folder' || fileType === '') {
        return folderIcon // Default folder icon
      }
      // You can add more specific folder types here if needed
      return folderIcon
    }
    if (ext === 'pdf') return pdfIcon
    if (ext === 'doc' || ext === 'docx') return docxIcon
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return xlsxIcon
    if (ext === 'ppt' || ext === 'pptx') return pptxIcon
    if (ext === 'zip') return zipIcon
    if (ext === 'rar') return rarIcon
    if (ext === 'mp3') return mp3Icon
    if (ext === 'mp4') return mp4Icon
    if (ext === 'm4v') return m4vIcon
    if (ext === 'mov') return movIcon
    if (ext === 'jpg' || ext === 'jpeg') return jpgIcon
    if (ext === 'png') return pngIcon
    if (ext === 'tmp') return tmpIcon
    return pdfIcon
  }

  if (loading) return (
    <div style={s.page}>
      <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    `}</style>
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
        <p style={{ color: '#a3b8d9', marginTop: 12, fontSize: 13 }}>Loading files...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={s.page}>
      <p style={{ color: '#fca5a5', fontSize: 13 }}>Error: {error}</p>
    </div>
  )

  const lowerQuery = query.trim().toLowerCase()

  const allCurrentLevelItems = items ? getCurrentLevelItems(items) : []

  const matchesQuery = (it: any) => {
    if (!lowerQuery) return true
    const tokens = lowerQuery.split(/\s+/).filter(Boolean)
    const title = String(getValue(it, 'Title') ?? '').toLowerCase()
    const rawPath = String(getValue(it, 'FilePath') ?? '').toLowerCase()
    // only consider the final segment (filename) of the path for matching
    const filename = rawPath.split('/').filter(Boolean).pop() || ''
    return tokens.every((t) => title.includes(t) || filename.includes(t))
  }

  // group search results by parent folder when there is a query and at root
  const searchGroups: Record<string, any[]> = {}
  if (lowerQuery && currentPath.length === 0 && items) {
    items.forEach((it) => {
      if (!matchesQuery(it)) return
      const filePath = String(getValue(it, 'FilePath') ?? '').trim()
      const parts = filePath.split('/').filter(Boolean)
      const parent = parts.length >= 2 ? parts[1] : '(root)'
      if (!searchGroups[parent]) searchGroups[parent] = []
      searchGroups[parent].push(it)
    })
    // sort each group as before (folders first)
    Object.keys(searchGroups).forEach((key) => {
      searchGroups[key].sort((a, b) => {
        const aFolder = isFolder(a) ? 0 : 1
        const bFolder = isFolder(b) ? 0 : 1
        if (aFolder !== bFolder) return aFolder - bFolder
        const aTitle = String(getValue(a, 'Title') ?? '').toLowerCase()
        const bTitle = String(getValue(b, 'Title') ?? '').toLowerCase()
        return aTitle.localeCompare(bTitle)
      })
    })
  }

  const filteredItems = allCurrentLevelItems.filter(matchesQuery)

  // compute a display path for items, trimming the Shared Documents prefix and
  // optionally the parent folder when performing a search. This keeps the path
  // shown on card concise and relevant to the current context.
  const getDisplayPath = (it: any, parentGroup?: string) => {
    const rawPath: string = String(getValue(it, 'FilePath') ?? '')
    if (lowerQuery) {
      // when searching we show relative paths
      if (currentPath.length === 0) {
        if (parentGroup && parentGroup !== '(root)') {
          const prefix = `Shared Documents/${parentGroup}/`
          if (rawPath.startsWith(prefix)) return rawPath.substring(prefix.length)
        }
      } else {
        const cur = `Shared Documents/${currentPath.join('/')}/`
        if (rawPath.startsWith(cur)) return rawPath.substring(cur.length)
      }
    }
    return rawPath
  }

  const handleItemClick = (item: any) => {
    const isItemFolder = isFolder(item)
    const isParentCard = getValue(item, 'isParentCard')
    const rowHref = extractHrefFromFileURL(getValue(item, 'FileURL'))

    if (isParentCard) {
      // Open parent folder URL with proper SharePoint site structure
      const folderName = getValue(item, 'Title')
      const folderUrl = `https://energyregcomm.sharepoint.com/sites/CentralDatabase/Shared%20Documents/${encodeURIComponent(folderName)}`
      window.open(folderUrl, '_blank', 'noopener,noreferrer')
    } else if (isItemFolder) {
      // Determine the real path segments for the folder and update state
      const filePath = String(getValue(item, 'FilePath') ?? '')
      const parts = getPathParts(filePath)
      // strip leading "Shared Documents" if present
      if (parts[0] === 'Shared Documents') parts.shift()
      setCurrentPath(parts)
      setQuery('') // Clear search when navigating
    } else if (rowHref) {
      // Open file URL
      window.open(rowHref, '_blank', 'noopener,noreferrer')
    }
  }

  const navigateToPath = (pathIndex: number) => {
    setCurrentPath(currentPath.slice(0, pathIndex + 1))
    setQuery('')
  }

  const goBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1))
      setQuery('')
    }
  }

  return (
    <div style={s.page}>
      {/* Search bar */}
      <div style={s.searchBar}>
        <input
          type="search"
          placeholder="Type File Name or Path..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={s.searchInput}
        />
        {query && (
          <button onClick={() => setQuery('')} style={s.clearBtn}>×</button>
        )}
        <span style={s.totalLabel}>
          {lowerQuery
            ? `${filteredItems.length} of ${currentPath.length === 0 ? (items?.length ?? 0) : allCurrentLevelItems.length} items`
            : `Total: ${currentPath.length === 0 ? (items?.length ?? 0) : allCurrentLevelItems.length} items`}
        </span>
      </div>

      {/* Breadcrumb Navigation */}
      <div style={s.breadcrumb}>
        {currentPath.length === 0 ? (
          <span style={{ color: '#a3b8d9', fontSize: 14 }}></span>
        ) : (
          <>
            <button
              onClick={() => { setCurrentPath([]); setQuery('') }}
              style={s.breadcrumbItem}
            >
              {currentPath[0]}
            </button>
            {currentPath.slice(1).map((segment, index) => (
              <span key={index} style={s.breadcrumbSeparator}>
                {' / '}
                <button
                  onClick={() => navigateToPath(index + 1)}
                  style={s.breadcrumbItem}
                >
                  {segment}
                </button>
              </span>
            ))}
            <button onClick={goBack} style={s.backBtn}>
              ← Back
            </button>
          </>
        )}
      </div>

      {/* Flat grid of current level items or grouped search results */}
      {!loading && items && (
        <>
          {lowerQuery && currentPath.length === 0 ? (
            <div>
              {Object.keys(searchGroups)
                .sort((a, b) => a.localeCompare(b))
                .map((parent) => {
                  const header = `Shared Documents/${parent}`
                  const groupItems = searchGroups[parent]
                  return (
                    <React.Fragment key={parent}>
                      <div style={s.pathDivider}>
                        <span style={s.pathDividerLabel}>{header}</span>
                      </div>
                      <div style={s.grid}>
                        {groupItems.map((it: any, idx: number) => {
                          const keyStr = String(getValue(it, 'ID') ?? getValue(it, 'Title') ?? idx)
                          const title = getValue(it, 'Title') ?? `Item ${idx + 1}`
                          const path = getDisplayPath(it, parent)
                          const isHov = hoveredCard === keyStr
                          return (
                            <article
                              key={keyStr}
                              onMouseEnter={() => setHoveredCard(keyStr)}
                              onMouseLeave={() => setHoveredCard(null)}
                              onClick={() => handleItemClick(it)}
                              style={{
                                ...s.card,
                                background: isHov ? 'rgba(37,56,83,0.8)' : '#1a2f52',
                                borderColor: isHov ? '#3d5a8c' : 'rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                              }}
                            >
                              <img src={getIconSrc(it)} alt="" style={s.fileIcon} />
                              <div style={s.cardBody}>
                                <div style={s.cardHeader}>
                                  <h3 style={{ ...s.cardTitle, whiteSpace: expandedMap[keyStr] ? 'normal' : 'nowrap' }} title={String(title)}>
                                    {String(title)}
                                  </h3>
                                  <button
                                    style={s.expandBtn}
                                    onClick={(e) => { e.stopPropagation(); setExpandedMap(m => ({ ...m, [keyStr]: !m[keyStr] })) }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                      style={{ transform: expandedMap[keyStr] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                      <path d="M6 9l6 6 6-6" stroke="#a3b8d9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </button>
                                </div>
                                <p style={{ ...s.cardPath, whiteSpace: expandedMap[keyStr] ? 'normal' : 'nowrap' }} title={String(path)}>
                                  {String(path)}
                                </p>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </React.Fragment>
                  )
                })}
            </div>
          ) : (
            <div style={s.grid}>
              {filteredItems.map((it: any, idx: number) => {
                const keyStr = String(getValue(it, 'ID') ?? getValue(it, 'Title') ?? idx)
                const title = getValue(it, 'Title') ?? `Item ${idx + 1}`
                const path = getDisplayPath(it)
                const isHov = hoveredCard === keyStr

                return (
                  <article
                    key={keyStr}
                    onMouseEnter={() => setHoveredCard(keyStr)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => handleItemClick(it)}
                    style={{
                      ...s.card,
                      background: isHov ? 'rgba(37,56,83,0.8)' : '#1a2f52',
                      borderColor: isHov ? '#3d5a8c' : 'rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    <img src={getIconSrc(it)} alt="" style={s.fileIcon} />
                    <div style={s.cardBody}>
                      <div style={s.cardHeader}>
                        <h3 style={{ ...s.cardTitle, whiteSpace: expandedMap[keyStr] ? 'normal' : 'nowrap' }} title={String(title)}>
                          {String(title)}
                        </h3>
                        <button
                          style={s.expandBtn}
                          onClick={(e) => { e.stopPropagation(); setExpandedMap(m => ({ ...m, [keyStr]: !m[keyStr] })) }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            style={{ transform: expandedMap[keyStr] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            <path d="M6 9l6 6 6-6" stroke="#a3b8d9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                      <p style={{ ...s.cardPath, whiteSpace: expandedMap[keyStr] ? 'normal' : 'nowrap' }} title={String(path)}>
                        {String(path)}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1, width: '100%' }} />

      {/* Loading more spinner */}
      {loadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
          <div style={s.spinner} />
          <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    minHeight: '100%',
    background: '#0f1f3d',
    fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: '8px 12px',
    background: '#1a2f52',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  breadcrumbItem: {
    background: 'transparent',
    border: 'none',
    color: '#60a5fa',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit',
    textDecoration: 'underline',
    padding: '2px 4px',
  },
  breadcrumbSeparator: {
    color: '#a3b8d9',
    fontSize: 14,
  },
  backBtn: {
    background: '#3d5a8c',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 4,
    marginLeft: 'auto',
    fontFamily: 'inherit',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  searchBar: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    background: '#1a2f52',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '8px 14px',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: 13.5,
    fontFamily: 'inherit',
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: '#a3b8d9',
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
    fontFamily: 'inherit',
  },
  totalLabel: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#a3b8d9',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 10,
  },
  pathDivider: {
    padding: '10px 4px 6px',
    marginBottom: 6,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  pathDividerLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#a3b8d9',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  card: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
  },
  fileIcon: {
    width: 36,
    height: 36,
    minWidth: 36,
    objectFit: 'contain',
    flexShrink: 0,
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
    flex: 1,
  },
  cardTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 500,
    color: '#fff',
    flex: 1,                  // ← add this
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardPath: {
    margin: 0,
    fontSize: 11,
    color: '#a3b8d9',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#60a5fa',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  cardHeader: {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 4,
},
expandBtn: {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 2,
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
},

}