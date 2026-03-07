import React, { useEffect, useState, useRef } from 'react'
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

const ROOT_FOLDER = '1 PD ONGOING' // 🔁 Change this to your root folder name

export default function Monitoring() {
  const [items, setItems] = useState<DatabaseRead[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const [nextLink, setNextLink] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const PAGE_SIZE = 5000

  const fetchingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getValue = (obj: any, key: string) => {
    if (!obj) return undefined
    if (key.includes('.')) return key.split('.').reduce((o, k) => (o ? o[k] : undefined), obj)
    return obj[key]
  }

  const isFolder = (it: any): boolean => {
    const fileType = String(getValue(it, 'FileType') ?? '').toLowerCase().trim()
    return fileType === 'folder'
  }

  /**
   * Given a file path and a folder name, returns the NEXT segment after that folder.
   * e.g. path = "/root/1 PD ONGOING/SubA/file.pdf", folder = "1 PD ONGOING" → "SubA"
   */
  const getNextSegment = (path: any, folderName: string): string | null => {
    if (!path || typeof path !== 'string') return null
    const parts = path.split('/').filter(Boolean)
    const idx = parts.indexOf(folderName)
    if (idx === -1 || idx >= parts.length - 1) return null
    return parts[idx + 1]
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
    if (fileType === 'folder') return folderIcon
    if (fileType === 'pdf') return pdfIcon
    if (fileType === 'doc' || fileType === 'docx') return docxIcon
    if (fileType === 'xls' || fileType === 'xlsx' || fileType === 'csv') return xlsxIcon
    if (fileType === 'ppt' || fileType === 'pptx') return pptxIcon
    if (fileType === 'zip') return zipIcon
    if (fileType === 'rar') return rarIcon
    if (fileType === 'mp3') return mp3Icon
    if (fileType === 'mp4') return mp4Icon
    if (fileType === 'm4v') return m4vIcon
    if (fileType === 'mov') return movIcon
    if (fileType === 'jpg' || fileType === 'jpeg') return jpgIcon
    if (fileType === 'png') return pngIcon
    if (fileType === 'tmp') return tmpIcon
    return pdfIcon
  }

  // ─── Fetch ───────────────────────────────────────────────────────────────────

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
      console.log(getValue(items?.[0], 'FilePath'))

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

  // ─── Loading / Error states ───────────────────────────────────────────────

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

  // ─── Derived data ─────────────────────────────────────────────────────────

  const lowerQuery = query.trim().toLowerCase()

  const matchesQuery = (it: any) => {
    if (!lowerQuery) return true
    const tokens = lowerQuery.split(/\s+/).filter(Boolean)
    const title = String(getValue(it, 'Title') ?? '').toLowerCase()
    const rawPath = String(getValue(it, 'FilePath') ?? '').toLowerCase()
    const filename = rawPath.split('/').filter(Boolean).pop() || ''
    return tokens.every((t) => title.includes(t) || filename.includes(t))
  }


  // FilePath includes the full path WITH filename
  // e.g. 'Shared Documents/1 PD ONGOING/file.pdf'
  // We want to display everything under ROOT_FOLDER, but grouped by the FIRST subfolder
  // after the root. Items that sit directly in the root (no subfolder) will be grouped
  // under an empty string key.
  const ROOT_PATH = 'Shared Documents/1 PD ONGOING'

  // All items under ROOT_FOLDER (for total count)
  const itemsUnderRoot = (items ?? []).filter((it: any) => {
    const filePath = String(getValue(it, 'FilePath') ?? '')
    return filePath.split('/').filter(Boolean).includes(ROOT_FOLDER)
  })


  // helpers for display path & grouping
  const getDisplayPath = (it: any, parentGroup?: string) => {
    const rawPath: string = String(getValue(it, 'FilePath') ?? '')
    const base = ROOT_PATH.endsWith('/') ? ROOT_PATH : ROOT_PATH + '/'
    if (parentGroup) {
      const prefix = base + parentGroup + '/'
      if (rawPath.startsWith(prefix)) return rawPath.substring(prefix.length)
    }
    if (rawPath.startsWith(base)) return rawPath.substring(base.length)
    return rawPath
  }

  // when there is no search query we want to group everything under the
  // specified root by its first subfolder. Items that live directly in the
  // root (no subfolder) are collected under an empty key but we purposely
  // render them without a header so the user never sees “(Root)”.
  const groupedByParent: Array<[string, any[]]> = (() => {
    const groups: Record<string, any[]> = {}
    ;(itemsUnderRoot ?? []).forEach((it: any) => {
      const filePath = String(getValue(it, 'FilePath') ?? '').trim()
      const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath
      if (!normalized.startsWith(ROOT_PATH + '/')) return
      const remainder = normalized.slice(ROOT_PATH.length + 1)
      const parts = remainder.split('/').filter(Boolean)
      const key = parts[0] || ''
      if (!groups[key]) groups[key] = []
      groups[key].push(it)
    })
    // sort the group keys; keep empty string first so root‑level items appear
    const entries = Object.entries(groups)
    entries.sort(([a], [b]) => {
      if (a === '') return -1
      if (b === '') return 1
      return a.localeCompare(b)
    })
    // within each group sort folders before files and ensure the parent folder
    // (if present) appears at the very top of its group.
    return entries.map(([grp, arr]) => {
      const sorted = [...arr]
      sorted.sort((a, b) => {
        // bump exact matching parent folder to the front
        if (grp && isFolder(a) && String(getValue(a, 'Title')) === grp) return -1
        if (grp && isFolder(b) && String(getValue(b, 'Title')) === grp) return 1
        const aFolder = isFolder(a) ? 0 : 1
        const bFolder = isFolder(b) ? 0 : 1
        if (aFolder !== bFolder) return aFolder - bFolder
        const aTitle = String(getValue(a, 'Title') ?? '').toLowerCase()
        const bTitle = String(getValue(b, 'Title') ?? '').toLowerCase()
        return aTitle.localeCompare(bTitle)
      })
      return [grp, sorted] as [string, any[]]
    })
  })()

  // when searching, group results by first child after root (like currentfiles)
  const searchGroups: Record<string, any[]> = {}
  if (lowerQuery) {
    itemsUnderRoot.forEach((it: any) => {
      if (!matchesQuery(it)) return
      const filePath = String(getValue(it, 'FilePath') ?? '').trim()
      const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath
      if (!normalized.startsWith(ROOT_PATH + '/')) return
      const remainder = normalized.slice(ROOT_PATH.length + 1)
      const parts = remainder.split('/').filter(Boolean)
      const parent = parts[0] || ''
      if (!searchGroups[parent]) searchGroups[parent] = []
      searchGroups[parent].push(it)
    })
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

  // when searching, collect all matching items under root for count
  const filteredUnderRoot = itemsUnderRoot.filter(matchesQuery)

  // ─── Render file card ─────────────────────────────────────────────────────

  const renderCard = (it: any, idx: number, keyStr: string, parentGroup?: string) => {
    const rowHref = extractHrefFromFileURL(getValue(it, 'FileURL'))
    const title = getValue(it, 'Title') ?? `Item ${idx + 1}`
    const path = getDisplayPath(it, parentGroup)
    const expanded = !!expandedMap[keyStr]
    const isHov = hoveredCard === keyStr
    const isFolderItem = isFolder(it)

    return (
      <article
        key={keyStr}
        onMouseEnter={() => setHoveredCard(keyStr)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={() => {
          if (rowHref) window.open(rowHref, '_blank', 'noopener,noreferrer')
        }}
        style={{
          ...s.card,
          background: isHov
            ? isFolderItem ? 'rgba(45,74,124,0.4)' : 'rgba(37,56,83,0.8)'
            : '#1a2f52',
          borderColor: isHov ? '#3d5a8c' : 'rgba(255,255,255,0.1)',
          cursor: rowHref ? 'pointer' : 'default',
        }}
      >
        <img src={getIconSrc(it)} alt="" style={s.fileIcon} />
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

  // ─── Render ───────────────────────────────────────────────────────────────

  // ─── Folder Banner URL ───────────────────────────────────────────────────
  const FOLDER_BANNER_URL = 'https://energyregcomm-my.sharepoint.com/:f:/g/personal/ppis_pd_erc_ph/IgCJB1Ds93xOS6fg2ZM_5qo-ATzOt4FsLSYF7y_v7EQ0k64' // 🔁 Replace with your folder URL

  return (
    <div style={s.page}>

      {/* Folder Banner */}
      <a
        href={FOLDER_BANNER_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={s.folderBanner}
        onMouseEnter={e => (e.currentTarget.style.background = '#1e3a6e')}
        onMouseLeave={e => (e.currentTarget.style.background = '#1a2f52')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="#60a5fa" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={s.folderBannerTitle}>1 PD ONGOING</span>
          <span style={s.folderBannerSub}>Click to open root folder in SharePoint</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="#a3b8d9" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 'auto', flexShrink: 0 }}
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>

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
            ? `${filteredUnderRoot.length} of ${itemsUnderRoot.length} items`
            : `Total: ${itemsUnderRoot.length} items`}
        </span>
      </div>

      {/* Gallery – flat when no query, grouped when searching */}
      {!loading && items && (
        <div style={s.galleryWrapper}>
              {lowerQuery ? (
            <>
              {/* when searching show results grouped by their first subfolder */}
              {Object.keys(searchGroups)
                .sort((a, b) => {
                  // keep root‑level items (empty key) first
                  if (a === '') return -1
                  if (b === '') return 1
                  return a.localeCompare(b)
                })
                .map((parent) => {
                  const header = parent || ROOT_PATH
                  const groupItems = searchGroups[parent]
                  return (
                    <React.Fragment key={parent || '__root'}>
                      <div style={s.pathDivider}>
                        <span style={s.pathDividerLabel}>{header}</span>
                      </div>
                      <div style={s.grid}>
                        {groupItems.map((it: any, idx: number) => {
                          const keyStr = String(getValue(it, 'ID') ?? idx)
                          return renderCard(it, idx, keyStr, parent)
                        })}
                      </div>
                    </React.Fragment>
                  )
                })}
            </>
          ) : (
            // grouped view by first subfolder when not searching
            <>
              {groupedByParent.map(([grp, arr]) => (
                <React.Fragment key={grp || '__root'}>
                  {grp && (
                    <div style={s.pathDivider}>
                      <span style={s.pathDividerLabel}>{grp}</span>
                    </div>
                  )}
                  <div style={s.grid}>
                    {arr.map((it: any, idx: number) => {
                      const keyStr = String(getValue(it, 'ID') ?? idx)
                      return renderCard(it, idx, keyStr, grp)
                    })}
                  </div>
                </React.Fragment>
              ))}
            </>
          )}

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
  folderBanner: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: '14px 18px',
    marginBottom: 14,
    background: '#1a2f52',
    border: '1px solid rgba(96,165,250,0.3)',
    borderRadius: 12,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  folderBannerTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#ffffff',
    letterSpacing: '0.01em',
  },
  folderBannerSub: {
    fontSize: 11,
    color: '#a3b8d9',
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