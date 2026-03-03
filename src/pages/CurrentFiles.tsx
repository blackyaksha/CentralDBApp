import { useEffect, useState, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { DatabaseRead } from '../generated/models/DatabaseModel'
import pdfIcon from '../assets/Icons/pdf.png'
import docxIcon from '../assets/Icons/docs.png'
import xlsxIcon from '../assets/Icons/sheets.png'
import pptxIcon from '../assets/Icons/pptx.png'
import folderIcon from '../assets/Icons/folder.png'
import zipIcon from '../assets/Icons/zip-folder.png'
import movIcon from '../assets/Icons/mov.png'
import mp3Icon from '../assets/Icons/mp3.png'
import mp4Icon from '../assets/Icons/mp4.png'
import m4vIcon from '../assets/Icons/m4v.png'
import tmpIcon from '../assets/Icons/tmp.png'
import rarIcon from '../assets/Icons/rar.png'
import jpgIcon from '../assets/Icons/jpg.png'
import pngIcon from '../assets/Icons/png.png'
import parentFolderIcon from '../assets/Icons/parent.png'

export default function CurrentFiles() {
  const [items, setItems] = useState<DatabaseRead[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [nextLink, setNextLink] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const PAGE_SIZE = 5000

  const fetchingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const getParentFolder = (path: any): string => {
    if (!path || typeof path !== 'string') return 'Unknown'
    const parts = path.split('/').filter(Boolean)
    return parts[1] ?? 'Unknown'
  }

  const getDisplayPath = (path: any): string => {
    if (!path || typeof path !== 'string') return 'Unknown'
    const parts = path.split('/').filter(Boolean)
    return parts.slice(0, 2).join('/')
  }

  const fetchAllPages = async (isFirstLoad = false) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      if (isFirstLoad) setLoading(true)
      else setLoadingMore(true)

      const body: Record<string, any> = { pageSize: PAGE_SIZE }
      if (nextLink) body.nextLink = nextLink

      const response = await fetch(
        'https://e0ffbd29750ce27abc181dd6358937.97.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/13ad1bf5cd9d40faae5866a10b8e5d5e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=r0hMO5PRRh_wKy5Y1DV5tejG2smmJjiWhJMvjQrGrK4',
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

  const getIconSrc = (it: any, isParentFolder = false) => {
    const fileType = String(getValue(it, 'FileType') ?? '').toLowerCase().trim()
    const fileName = String(getValue(it, 'Title') ?? '').toLowerCase()
    const isFolderItem = Boolean(getValue(it, 'IsFolder') || getValue(it, 'FSObjType') === 1)
    let ext = ''
    if (fileName.includes('.')) ext = fileName.split('.').pop() || ''
    if (!ext && fileType) ext = fileType.replace('.', '').trim()

    if (isParentFolder) return parentFolderIcon
    if (isFolderItem) return folderIcon
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

  const matchesQuery = (it: any) => {
    if (!lowerQuery) return true
    const tokens = lowerQuery.split(/\s+/).filter(Boolean)
    const title = String(getValue(it, 'Title') ?? '').toLowerCase()
    const path = String(getValue(it, 'FilePath') ?? '').toLowerCase()
    return tokens.every((t) => title.includes(t) || path.includes(t))
  }

  const baseItems = activeFolder
    ? (items ?? []).filter((it: any) => getParentFolder(getValue(it, 'FilePath')) === activeFolder)
    : (items ?? [])

  const searchedItems = baseItems.filter(matchesQuery)

  const rootGroupedItems = !activeFolder
    ? (items ?? []).reduce<Record<string, any[]>>((acc, it) => {
        const path = getValue(it, 'FilePath')
        const parent = getParentFolder(path)
        if (!acc[parent]) acc[parent] = []
        acc[parent].push(it)
        return acc
      }, {})
    : {}

  const renderCard = (it: any, idx: number, keyStr: string) => {
    const rowHref = extractHrefFromFileURL(getValue(it, 'FileURL'))
    const title = getValue(it, 'Title') ?? `Item ${idx + 1}`
    const path = getValue(it, 'FilePath') ?? ''
    const expanded = !!expandedMap[keyStr]
    const isHov = hoveredCard === keyStr
    const isFolderItem = isFolder(it)

    return (
      <article
        key={keyStr}
        onMouseEnter={() => setHoveredCard(keyStr)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={() => {
          if (isFolderItem) {
            setActiveFolder(getParentFolder(path))
          } else if (rowHref) {
            window.open(rowHref, '_blank', 'noopener,noreferrer')
          }
        }}
        style={{
          ...s.card,
          background: isHov
            ? isFolderItem ? 'rgba(45,74,124,0.4)' : 'rgba(37,56,83,0.8)'
            : '#1a2f52',
          borderColor: isHov ? '#3d5a8c' : 'rgba(255,255,255,0.1)',
          cursor: isFolderItem || rowHref ? 'pointer' : 'default',
        }}
      >
        <img
          src={getIconSrc(it)}
          alt=""
          style={s.fileIcon}
        />
        <div style={s.cardBody}>
          <div style={s.cardHeader}>
            <h3
              style={{
                ...s.cardTitle,
                WebkitLineClamp: expanded ? 'unset' : 1,
                whiteSpace: expanded ? 'normal' : 'nowrap',
              }}
              title={String(title)}
            >
              {String(title)}
            </h3>
            <button
              style={s.expandBtn}
              aria-expanded={expanded}
              onClick={(e) => {
                e.stopPropagation()
                setExpandedMap((m) => ({ ...m, [keyStr]: !m[keyStr] }))
              }}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <path d="M6 9l6 6 6-6" stroke="#a3b8d9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p
            style={{
              ...s.cardPath,
              WebkitLineClamp: expanded ? 'unset' : 1,
              whiteSpace: expanded ? 'normal' : 'nowrap',
            }}
            title={String(path)}
          >
            {String(path)}
          </p>
        </div>
      </article>
    )
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
          Total: {items?.length ?? 0} items
        </span>
      </div>

      {/* Gallery */}
      {!loading && items && (
        <div style={s.galleryWrapper}>
          {/* BACK button */}
          {activeFolder && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setActiveFolder(null)}
                onMouseEnter={e => (e.currentTarget.style.background = '#3d5a8c')}
                onMouseLeave={e => (e.currentTarget.style.background = '#2d4a7c')}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#2d4a7c',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  fontFamily: 'inherit',
                }}
              >
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
            </div>
          )}

          <div style={s.grid}>
            {/* ROOT: folder groups */}
            {!activeFolder && !lowerQuery &&
              Object.entries(rootGroupedItems).map(([folderName, files]) => {
                const isHov = hoveredCard === `folder-${folderName}`
                return (
                  <article
                    key={folderName}
                    onMouseEnter={() => setHoveredCard(`folder-${folderName}`)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => setActiveFolder(folderName)}
                    style={{
                      ...s.card,
                      background: isHov ? 'rgba(45,74,124,0.4)' : '#1a2f52',
                      borderColor: isHov ? '#3d5a8c' : 'rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    <img src={parentFolderIcon} alt="folder" style={s.fileIcon} />
                    <div style={s.cardBody}>
                      <h3 style={s.cardTitle}>{folderName}</h3>
                      <p style={s.cardPath}>{files.length} item{files.length !== 1 && 's'}</p>
                    </div>
                  </article>
                )
              })
            }

            {/* ROOT + SEARCH: grouped by path */}
            {!activeFolder && lowerQuery && (() => {
              const groupedByPath = searchedItems.reduce<Record<string, any[]>>((acc, it) => {
                const path = getDisplayPath(getValue(it, 'FilePath'))
                if (!acc[path]) acc[path] = []
                acc[path].push(it)
                return acc
              }, {})

              return Object.entries(groupedByPath).map(([pathLabel, itemsInPath]) => (
                <div key={pathLabel} style={{ gridColumn: '1 / -1' }}>
                  <div style={s.pathDivider}>
                    <span style={s.pathDividerLabel}>{pathLabel}</span>
                  </div>
                  <div style={s.grid}>
                    {itemsInPath.map((it: any, idx: number) => {
                      const keyStr = String(it.ID ?? `${pathLabel}-${idx}`)
                      return renderCard(it, idx, keyStr)
                    })}
                  </div>
                </div>
              ))
            })()}

            {/* FOLDER contents */}
            {activeFolder && (() => {
              const folders = searchedItems.filter(isFolder)
              const files = searchedItems.filter(it => !isFolder(it))
              const orderedItems = [...folders, ...files]
              return orderedItems.map((it, idx) => {
                const keyStr = String(getValue(it, 'ID') ?? idx)
                return renderCard(it, idx, keyStr)
              })
            })()}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1, width: '100%' }} />
        </div>
      )}

      {/* Loading more spinner */}
      {loadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
          <div style={s.spinner} />
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
  galleryWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 10,
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
  cardHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  cardTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 500,
    color: '#fff',
    flex: 1,
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
  expandBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
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
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#60a5fa',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}