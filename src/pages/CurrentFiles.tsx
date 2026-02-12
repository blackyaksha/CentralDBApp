import { useEffect, useState, useRef } from 'react'
import type { Database } from '../generated/models/DatabaseModel'
import { DatabaseService } from '../generated'
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
  const [items, setItems] = useState<Database[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [nextLink, setNextLink] = useState<string | null>(null);
  // const [pageNumber, setPageNumber] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [skipToken, setSkipToken] = useState<string | null>(null)
  const PAGE_SIZE = 5000  // number of items per batch
  const mounted = useRef(true)




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

const fetchAllPages = async (isFirstLoad = false) => {
  try {
    if (isFirstLoad) setLoading(true)
    else setLoadingMore(true)

    const flowUrl = 'https://e0ffbd29750ce27abc181dd6358937.97.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/cfab82d9a54742ec972b38131cc7a46d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=RMcIUCCrXGkwYN7UiSfhC1zEmtCZZVhA9UBM6z62n6U'

    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageSize: PAGE_SIZE,
        nextLink: nextLink ?? ""
      })
    })

    if (!response.ok)
      throw new Error(`Flow request failed: ${response.status}`)

    const data = await response.json()

    const newItems = Array.isArray(data.items) ? data.items : []

    setItems(prev =>
      isFirstLoad ? newItems : [...(prev ?? []), ...newItems]
    )

    setNextLink(data.nextLink ?? null)
    setHasMore(!!data.nextLink)

  } catch (err: any) {
    setError(err.message)
  } finally {
    setLoading(false)
    setLoadingMore(false)
  }
}

// ---------------- PREVENT DOUBLE FETCH ----------------
const fetchingRef = useRef(false); // prevents double fetch

const loadNextBatch = async () => {
  if (fetchingRef.current || !hasMore) return;
  fetchingRef.current = true;
  setLoadingMore(true);

  try {
    await fetchAllPages(); // fetchAllPages appends new items
  } finally {
    fetchingRef.current = false;
    setLoadingMore(false);
  }
};

useEffect(() => {
  fetchAllPages(true)
}, [])


// ---------------- INFINITE SCROLL ----------------
useEffect(() => {
  if (!hasMore) return; // stop if nothing left

  const interval = setInterval(() => {
    // only try if not already fetching
    if (!loading && !loadingMore && fetchingRef.current === false) {
      // if page still doesn't have scroll
      if (document.body.scrollHeight <= window.innerHeight + 100) {
        loadNextBatch();
      }
    }
  }, 300); // check every 300ms

  return () => clearInterval(interval); // cleanup on unmount
}, [hasMore, loading, loadingMore]);


  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <>
      {/* SEARCH BAR */}
      <div className="search-bar">
        <input
          type="search"
          placeholder="Type File Name or Path..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && <button onClick={() => setQuery('')}>×</button>}
        <span style={{ marginLeft: 'auto', fontSize: '0.9em', color: '#ffff' }}>
          Total: {items?.length ?? 0} items
        </span>
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

            // 🔹 For root folder view, group ALL items to show all parent folders
            const rootGroupedItems = !activeFolder
            ? (items ?? []).reduce<Record<string, any[]>>((acc, it) => {
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

            const renderIconTemplate = (it: any, isParentFolder = false) => {
            const fileType = String(getValue(it, 'FileType') ?? '').toLowerCase().trim()
            const fileName = String(getValue(it, 'Title') ?? '').toLowerCase()
            const isFolderItem = Boolean(getValue(it, 'IsFolder') || getValue(it, 'FSObjType') === 1)

            let ext = ''
            if (fileName.includes('.')) {
              ext = fileName.split('.').pop() || ''
            }

            if (!ext && fileType) {
              ext = fileType.replace('.', '').trim()
            }

            let iconSrc = pdfIcon

            // ⭐ Parent folder gets highest priority
            if (isParentFolder) iconSrc = parentFolderIcon
            else if (isFolderItem) iconSrc = folderIcon
            else if (ext === 'pdf') iconSrc = pdfIcon
            else if (ext === 'doc' || ext === 'docx') iconSrc = docxIcon
            else if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') iconSrc = xlsxIcon
            else if (ext === 'ppt' || ext === 'pptx') iconSrc = pptxIcon
            else if (ext === 'zip') iconSrc = zipIcon
            else if (ext === 'rar') iconSrc = rarIcon
            else if (ext === 'mp3') iconSrc = mp3Icon
            else if (ext === 'mp4') iconSrc = mp4Icon
            else if (ext === 'm4v') iconSrc = m4vIcon
            else if (ext === 'mov') iconSrc = movIcon
            else if (ext === 'jpg' || ext === 'jpeg') iconSrc = jpgIcon
            else if (ext === 'png') iconSrc = pngIcon
            else if (ext === 'tmp') iconSrc = tmpIcon

            return (
              <div className="icon-template">
                <img src={iconSrc} alt={ext || 'file'} className="file-icon" />
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
              {renderIconTemplate({}, true)}   {/* 👈 Parent folder icon */}

              <div className="card-body">
                <h3 className="card-title">{folderName}</h3>
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


{/* 🔄 AUTO LOAD SPINNER */}
{loadingMore && (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
    <div className="spinner" />
  </div>
)}

    </>
  )
}
