import { useEffect, useState } from 'react'
import type { Database } from '../generated/models/DatabaseModel'
import pdfIcon from '../assets/Icons/pdf.png'
import folderIcon from '../assets/Icons/folder.png'

export default function Monitoring() {
  const TARGET_FOLDER = 'Shared Documents/1 PD ONGOING/'
  const [items, setItems] = useState<Database[] | null>(null)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractHrefFromFileURL = (val: any): string | null => {
    if (!val) return null
    const SP_DOMAIN = 'https://energyregcomm.sharepoint.com'
    if (typeof val === 'string' && val.startsWith('/')) return `${SP_DOMAIN}${val}`
    if (typeof val === 'string') return val
    if (typeof val === 'object' && val.Url) return val.Url.startsWith('/') ? `${SP_DOMAIN}${val.Url}` : val.Url
    return null
  }

  const renderIcon = (isFolder: boolean) => <img src={isFolder ? folderIcon : pdfIcon} className="file-icon" />

  const fetchItems = async () => {
    try {
      setLoading(true)
      const flowUrl = 'https://e0ffbd29750ce27abc181dd6358937.97.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/13ad1bf5cd9d40faae5866a10b8e5d5e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=r0hMO5PRRh_wKy5Y1DV5tejG2smmJjiWhJMvjQrGrK4'
      const res = await fetch(flowUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageSize: 5000 }),
      })
      if (!res.ok) throw new Error(`Flow request failed: ${res.status}`)
      const data = await res.json()
      const folderItems = (data.items ?? []).filter((item: any) =>
        item.FilePath?.startsWith(TARGET_FOLDER)
      )
      setItems(folderItems)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>
  if (!items?.length) return <p>No files found in "{TARGET_FOLDER}"</p>

  // ✅ Group by first-level folder
  const grouped: Record<string, any[]> = {}
  items.forEach(item => {
    const relativePath = item.FilePath?.replace(TARGET_FOLDER, '') ?? ''
    const firstFolder = relativePath.split('/').filter(Boolean)[0] ?? ''
    if (!firstFolder) return
    if (!grouped[firstFolder]) grouped[firstFolder] = []
    grouped[firstFolder].push(item)
  })

  return (
    <div className="gallery-wrapper">
      {!activeFolder &&
        Object.entries(grouped).map(([folderName, folderItems]) => (
          <article key={folderName} className="gallery-card folder-card" onClick={() => setActiveFolder(folderName)}>
            {renderIcon(true)}
            <div className="card-body">
              <h3 className="card-title">{folderName}</h3>
              <div className="card-path">{folderItems.length} item{folderItems.length !== 1 && 's'}</div>
            </div>
          </article>
        ))
      }

      {/* Show ALL files + subfolders recursively inside selected folder */}
      {activeFolder &&
        items
          .filter(it => {
            const rel = it.FilePath?.replace(TARGET_FOLDER, '') ?? ''
            return rel.startsWith(`/${activeFolder}`) || rel.startsWith(activeFolder)
          })
          .map((it, idx) => {
            const href = extractHrefFromFileURL(it.FileURL)
            const relativePath = (it.FilePath ?? '')
              .replace(`${TARGET_FOLDER}/${activeFolder}`, '')
              .replace(/^\/+/, '')


            return (
              <article
                key={it.ID ?? idx}
                className="gallery-card"
                onClick={() => href && window.open(href, '_blank')}
              >
                {renderIcon(Boolean(it.IsFolder))}
                <div className="card-body">
                  <h3 className="card-title">{it.Title}</h3>
                  <div className="card-path">{relativePath}</div>
                </div>
              </article>
            )
          })
      }


      {activeFolder && (
        <button style={{ marginTop: 20 }} onClick={() => setActiveFolder(null)}>
          ⬅ Back to folders
        </button>
      )}
    </div>
  )
}
