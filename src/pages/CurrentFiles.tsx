import { useEffect, useState, useRef } from 'react'
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

  const filteredItems = allCurrentLevelItems.filter((it: any) => {
    if (!lowerQuery) return true
    const tokens = lowerQuery.split(/\s+/).filter(Boolean)
    const title = String(getValue(it, 'Title') ?? '').toLowerCase()
    const path = String(getValue(it, 'FilePath') ?? '').toLowerCase()
    return tokens.every((t) => title.includes(t) || path.includes(t))
  })

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
      // Navigate into folder
      const folderName = getValue(item, 'Title')
      setCurrentPath([...currentPath, folderName])
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

      {/* Flat grid of current level items */}
      {!loading && items && (
        <div style={s.grid}>
          {filteredItems.map((it: any, idx: number) => {
            const keyStr = String(getValue(it, 'ID') ?? getValue(it, 'Title') ?? idx)
            const title = getValue(it, 'Title') ?? `Item ${idx + 1}`
            const path = getValue(it, 'FilePath') ?? ''
            const isItemFolder = isFolder(it)
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
                  <h3 style={s.cardTitle} title={String(title)}>
                    {String(title)}
                  </h3>
                  <p style={s.cardPath} title={String(path)}>
                    {String(path)}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1, width: '100%' }} />

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
}