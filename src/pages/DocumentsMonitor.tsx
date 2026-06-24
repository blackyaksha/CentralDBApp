import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import { supabase, fetchDocuments } from '../services/supabaseClient'

type Row = Record<string, string>

const COLUMNS = ['Date', 'For', 'Particular', 'Type of Document', 'Out To', 'Remarks']
const WRAP_COLS = new Set(['Particular', 'Remarks'])
const EMPTY_FORM = Object.fromEntries(COLUMNS.map(c => [c, '']))

function formatDateValue(raw: any): string {
  if (raw === null || raw === undefined || raw === '') return ''
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }
  const str = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
  }
  return str
}

function parseAoAtoRows(aoa: any[][]): Row[] {
  const rows: Row[] = []
  if (!aoa || !aoa.length) return rows
  const first = aoa[0].map((v: any) => String(v || '').trim())
  const hasHeader = COLUMNS.every((c) => first.includes(c))
  const start = hasHeader ? 1 : 0
  for (let i = start; i < aoa.length; i++) {
    const r = aoa[i]
    if (!r || r.every((cell: any) => cell === null || cell === undefined || cell === '')) continue
    const obj: Row = {}
    for (let j = 0; j < COLUMNS.length; j++) {
      const raw = r[j]
      obj[COLUMNS[j]] = COLUMNS[j] === 'Date' ? formatDateValue(raw) : String(raw ?? '')
    }
    rows.push(obj)
  }
  return rows
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

// ── Modal: Add Row ────────────────────────────────────────────────────────────
function AddRowModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (row: Row) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Row>({ ...EMPTY_FORM })
  const [confirming, setConfirming] = useState(false)

  const set = (col: string, val: string) => setForm(f => ({ ...f, [col]: val }))

  if (confirming) {
    return (
      <div style={M.overlay}>
        <div style={M.box}>
          <h3 style={M.title}>Confirm new entry</h3>
          <p style={M.sub}>Please review before saving. This cannot be deleted once saved.</p>
          <div style={M.reviewGrid}>
            {COLUMNS.map(col => (
              <React.Fragment key={col}>
                <span style={M.reviewLabel}>{col}</span>
                <span style={M.reviewValue}>{form[col] || <em style={{ color: '#475569' }}>—</em>}</span>
              </React.Fragment>
            ))}
          </div>
          <div style={M.actions}>
            <button style={{ ...M.btn, ...M.btnGhost }} onClick={() => setConfirming(false)}>← Back</button>
            <button style={{ ...M.btn, ...M.btnSuccess }} onClick={() => onConfirm(form)}>Confirm &amp; Save</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={M.overlay}>
      <div style={M.box}>
        <h3 style={M.title}>Add new entry</h3>
        <p style={M.sub}>Fill in the details below. All fields except Date are optional.</p>
        <div style={M.formGrid}>
          {COLUMNS.map(col => (
            <React.Fragment key={col}>
              <label style={M.label}>{col}</label>
              {col === 'Date' ? (
                <input
                  type="date"
                  value={form[col]}
                  onChange={e => set(col, e.target.value)}
                  style={M.input}
                />
              ) : WRAP_COLS.has(col) ? (
                <textarea
                  value={form[col]}
                  onChange={e => set(col, e.target.value)}
                  style={{ ...M.input, ...M.textarea }}
                  rows={3}
                />
              ) : (
                <input
                  type="text"
                  value={form[col]}
                  onChange={e => set(col, e.target.value)}
                  style={M.input}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={M.actions}>
          <button style={{ ...M.btn, ...M.btnGhost }} onClick={onCancel}>Cancel</button>
          <button style={{ ...M.btn, ...M.btnPrimary }} onClick={() => setConfirming(true)}>Review →</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DocumentsMonitor() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fileName, setFileName] = useState<string>('data.xlsx')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const tableRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const exportMenuRef = useRef<HTMLDivElement | null>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [forFilter, setForFilter] = useState('')

  const loadFromSupabase = useCallback(async () => {
    setLoading(true)
    try {
      const data: any[] | null = await fetchDocuments()
      if (!data) return
      setRows(data.map(d => ({
        id: d.id,
        Date: d.date ? String(d.date).slice(0, 10) : '',
        For: d.for_person ?? '',
        Particular: d.particular ?? '',
        'Type of Document': d.type_of_docs ?? '',
        'Out To': d.out_to_person ?? '',
        Remarks: d.remarks ?? '',
      })))
    } catch (err: any) {
      alert('Load failed: ' + (err.message || String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFromSupabase() }, [loadFromSupabase])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node))
        setExportMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleFile = async (file?: File) => {
    if (!file) return
    setFileName(file.name || 'data.xlsx')
    const ab = await file.arrayBuffer()
    const wb = XLSX.read(ab, { type: 'array', cellDates: false, raw: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as any[][]
    setRows(parseAoAtoRows(aoa))
  }

  // Insert only new rows (no id) — never touches existing DB rows
  const saveNewRows = async (newRows: Row[]) => {
    if (!newRows.length) return
    setSaving(true)
    try {
      const payload = newRows.map(r => {
        const row: Record<string, any> = {
          for_person: r['For'] || null,
          particular: r['Particular'] || null,
          type_of_docs: r['Type of Document'] || null,
          out_to_person: r['Out To'] || null,
          remarks: r['Remarks'] || null,
        }
        if (r['Date']) row.date = r['Date']
        return row
      })
      const { error } = await supabase.from('outgoing_incoming_docs').insert(payload)
      if (error) throw error
      await loadFromSupabase()
    } catch (err: any) {
      alert('Save failed: ' + (err.message || String(err)))
    } finally {
      setSaving(false)
    }
  }

  // Update existing rows only (has id) — never inserts
  const saveEdits = async () => {
    const existingRows = rows.filter(r => !!(r as any).id)
    if (!existingRows.length) return
    setSaving(true)
    try {
      const payload = existingRows.map(r => ({
        id: (r as any).id,
        for_person: r['For'] || null,
        particular: r['Particular'] || null,
        type_of_docs: r['Type of Document'] || null,
        out_to_person: r['Out To'] || null,
        remarks: r['Remarks'] || null,
        ...(r['Date'] ? { date: r['Date'] } : {}),
      }))
      const { error } = await supabase
        .from('outgoing_incoming_docs')
        .upsert(payload, { onConflict: 'id' })
      if (error) throw error
      alert('Changes saved.')
      await loadFromSupabase()
    } catch (err: any) {
      alert('Save failed: ' + (err.message || String(err)))
    } finally {
      setSaving(false)
    }
  }

  const handleAddConfirm = async (row: Row) => {
    setShowAddModal(false)
    await saveNewRows([row])
  }

  const updateCell = (rowIndex: number, col: string, val: string) => {
    setRows(prev => {
      const copy = prev.map(r => ({ ...r }))
      copy[rowIndex][col] = val
      return copy
    })
  }

  const exportXlsx = () => {
    const aoa = [COLUMNS, ...rows.map(r => COLUMNS.map(c => r[c] ?? ''))]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, fileName || 'export.xlsx')
    setExportMenuOpen(false)
  }

  const exportPdf = async () => {
  setExportMenuOpen(false)
  if (!rows.length) return

  const pdf = new jsPDF('l', 'mm', 'a4')
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const margin = 10
  const usableWidth = pw - margin * 2
  const colWidths = [
    usableWidth * 0.09,  // Date
    usableWidth * 0.09,  // For
    usableWidth * 0.30,  // Particular
    usableWidth * 0.12,  // Type of Document
    usableWidth * 0.09,  // Out To
    usableWidth * 0.31,  // Remarks
  ]
  const headerHeight = 10
  let y = margin

  const drawHeader = (startY: number) => {
    pdf.setFillColor(15, 36, 68)
    pdf.setDrawColor(15, 36, 68)
    let x = margin
    COLUMNS.forEach((_, i) => {
      pdf.rect(x, startY, colWidths[i], headerHeight, 'FD')
      x += colWidths[i]
    })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(255, 255, 255)
    x = margin
    COLUMNS.forEach((col, i) => {
      pdf.text(col, x + 2, startY + 6.5)
      x += colWidths[i]
    })
    // ← reset back to normal right after drawing header
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(20, 20, 20)
    return startY + headerHeight
  }

  // Title
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20, 20, 20)
  pdf.text('Outgoing and Incoming Documents Monitoring', margin, y + 6)
  y += 14

  y = drawHeader(y)

  filtered.forEach((row, idx) => {
    const cellTexts = COLUMNS.map((col, i) =>
      pdf.splitTextToSize(String(row[col] ?? ''), colWidths[i] - 4)
    )
    const maxLines = Math.max(...cellTexts.map(t => t.length))
    const thisRowHeight = Math.max(8, maxLines * 4.5 + 4)

    if (y + thisRowHeight > ph - margin) {
      pdf.addPage('l')
      y = margin
      y = drawHeader(y)
    }

    if (idx % 2 === 0) {
      pdf.setFillColor(240, 244, 248)
      pdf.rect(margin, y, usableWidth, thisRowHeight, 'F')
    }

    pdf.setDrawColor(200, 210, 220)
    let x = margin
    COLUMNS.forEach((_, i) => {
      pdf.rect(x, y, colWidths[i], thisRowHeight, 'S')
      x += colWidths[i]
    })

    pdf.setTextColor(20, 20, 20)
    x = margin
    COLUMNS.forEach((col, i) => {
      pdf.text(cellTexts[i], x + 2, y + 5)
      x += colWidths[i]
    })

    y += thisRowHeight
  })

  pdf.save((fileName || 'export').replace(/\.xlsx?$/i, '') + '.pdf')
}

  const forOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach(r => { if (r['For']) set.add(r['For']) })
    return Array.from(set).sort()
  }, [rows])

  const parseDate = (v?: string) => {
    if (!v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }

const filtered = useMemo(() => {
  const from = parseDate(dateFrom)
  const to = parseDate(dateTo)
  return rows
    .filter(r => {
      if (forFilter && forFilter !== r['For']) return false
      if (from || to) {
        const d = parseDate(r['Date'])
        if (d) {
          if (from && d < from) return false
          if (to && d > to) return false
        }
      }
      return true
    })
    .sort((a, b) => {                          // ← add this
      const da = parseDate(a['Date'])
      const db = parseDate(b['Date'])
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return db.getTime() - da.getTime()
    })
}, [rows, dateFrom, dateTo, forFilter])

  return (
    <div style={S.root}>
      {showAddModal && (
        <AddRowModal
          onConfirm={handleAddConfirm}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      <div style={S.header}>
        <h2 style={S.heading}>
          Outgoing and Incoming Documents Monitoring Page
          {rows.length > 0 && (
            <span style={S.badge}>{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
          )}
        </h2>
        <p style={S.subheading}>Records load automatically. Use the form to add entries; edits are saved with the Save Edits button.</p>
      </div>

      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <input
            ref={fileInputRef}
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <label htmlFor="file-input" style={S.btn}>↑ Upload file</label>

          <button onClick={() => setShowAddModal(true)} style={{ ...S.btn, ...S.btnPrimary }}>
            + Add entry
          </button>

          <button onClick={saveEdits} style={{ ...S.btn, ...S.btnSuccess }} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save edits'}
          </button>

          <div ref={exportMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setExportMenuOpen(v => !v)} style={S.btn} disabled={!rows.length}>
              ↓ Export ▾
            </button>
            {exportMenuOpen && (
              <div style={S.dropdownMenu}>
                <button style={S.dropdownItem} onClick={exportXlsx}>Excel (.xlsx)</button>
                <button style={S.dropdownItem} onClick={exportPdf}>PDF</button>
              </div>
            )}
          </div>

          <button onClick={loadFromSupabase} style={S.btn} title="Refresh">↺ Refresh</button>
        </div>

        <div style={S.toolbarRight}>
          <div style={S.filterGroup}>
            <label htmlFor="date-from" style={S.filterLabel}>From</label>
            <input id="date-from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={S.filterInput} />
          </div>
          <div style={S.filterGroup}>
            <label htmlFor="date-to" style={S.filterLabel}>To</label>
            <input id="date-to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={S.filterInput} />
          </div>
          <div style={S.filterGroup}>
            <label htmlFor="for-filter" style={S.filterLabel}>For</label>
            <select id="for-filter" value={forFilter} onChange={e => setForFilter(e.target.value)} style={S.filterInput}>
              <option value="">(All)</option>
              {forOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div ref={tableRef} style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {COLUMNS.map(c => <th key={c} style={S.th}>{c}</th>)}
              <th style={{ ...S.th, width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={COLUMNS.length + 1} style={S.empty}>Loading...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} style={S.empty}>No records found. Add an entry or upload a file.</td></tr>
            )}
            {!loading && rows.length > 0 && filtered.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} style={S.empty}>No rows match the current filters.</td></tr>
            )}
            {!loading && filtered.map(row => {
              const ri = rows.indexOf(row)
              const hasId = !!(row as any).id
              return (
                <tr key={ri} style={S.tr}>
                  {COLUMNS.map(col => {
                    const isWrap = WRAP_COLS.has(col)
                    return (
                      <td key={col} style={isWrap ? S.tdWrap : S.td}>
                        {col === 'Date' ? (
                          <input
                            type="date"
                            value={row[col] ?? ''}
                            onChange={e => updateCell(ri, col, e.target.value)}
                            style={S.cellInput}
                          />
                        ) : isWrap ? (
                          <textarea
                            value={row[col] ?? ''}
                            ref={el => { if (el) autoResize(el) }}
                            onChange={e => { updateCell(ri, col, e.target.value); autoResize(e.target) }}
                            style={S.cellInputWrap}
                            rows={1}
                          />
                        ) : (
                          <input
                            type="text"
                            value={row[col] ?? ''}
                            onChange={e => updateCell(ri, col, e.target.value)}
                            style={S.cellInput}
                          />
                        )}
                      </td>
                    )
                  })}
                  <td style={S.td}>
                    {!hasId && (
                      <button
                        onClick={() => setRows(prev => prev.filter((_, i) => i !== ri))}
                        style={S.deleteBtn}
                        title="Remove unsaved row"
                      >✕</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  root: { padding: '24px', fontFamily: 'system-ui, sans-serif' },
  header: { marginBottom: '20px' },
  heading: { margin: '0 0 4px', fontSize: '33px', fontWeight: 500, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' },
  subheading: { margin: 0, fontSize: '13px', color: '#64748b' },
  badge: { display: 'inline-block', padding: '2px 10px', fontSize: '12px', fontWeight: 400, borderRadius: '99px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' },
  toolbar: { display: 'flex', flexWrap: 'wrap' as const, gap: '8px', alignItems: 'center', marginBottom: '16px' },
  toolbarLeft: { display: 'flex', flexWrap: 'wrap' as const, gap: '8px', alignItems: 'center' },
  toolbarRight: { display: 'flex', flexWrap: 'wrap' as const, gap: '8px', alignItems: 'center', marginLeft: 'auto' },
  btn: { padding: '7px 13px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: '6px' },
  btnPrimary: { background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' },
  btnSuccess: { background: 'rgba(34,197,94,0.12)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' },
  btnDanger: { background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' },
  dropdownMenu: { position: 'absolute' as const, top: 'calc(100% + 4px)', left: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', overflow: 'hidden', zIndex: 100, minWidth: '140px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
  dropdownItem: { display: 'block', width: '100%', padding: '9px 14px', fontSize: '13px', textAlign: 'left' as const, background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '6px' },
  filterLabel: { fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' as const },
  filterInput: { fontSize: '13px', padding: '6px 8px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' },
  tableWrap: { border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflowX: 'auto' as const },
  table: { borderCollapse: 'collapse' as const, width: '100%', fontSize: '15px' },
  th: { padding: '10px 14px', textAlign: 'left' as const, fontWeight: 500, fontSize: '15px', color: '#64748b', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' as const },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  td: { padding: '7px 14px', verticalAlign: 'middle' as const, color: '#cbd5e1' },
  cellInput: { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '15px', color: '#cbd5e1', fontFamily: 'system-ui, sans-serif', padding: '2px 0' },
  empty: { padding: '40px', textAlign: 'center' as const, color: '#475569', fontSize: '13px' },
  tdWrap: { padding: '7px 14px', verticalAlign: 'top' as const, color: '#cbd5e1', minWidth: '200px', maxWidth: '320px' },
  cellInputWrap: { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#cbd5e1', fontFamily: 'system-ui, sans-serif', padding: '2px 0', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const, resize: 'none' as const, overflow: 'hidden', lineHeight: '1.5', minHeight: '24px' },
  deleteBtn: { padding: '3px 8px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#475569', borderRadius: '6px', cursor: 'pointer' },
}

// ── Modal Styles ──────────────────────────────────────────────────────────────
const M: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  box: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 24px 48px rgba(0,0,0,0.5)' },
  title: { margin: '0 0 4px', fontSize: '17px', fontWeight: 600, color: '#e2e8f0' },
  sub: { margin: '0 0 20px', fontSize: '13px', color: '#64748b' },
  formGrid: { display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 12px', alignItems: 'start', marginBottom: '24px' },
  label: { fontSize: '13px', color: '#94a3b8', paddingTop: '8px' },
  input: { fontSize: '13px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', width: '100%', boxSizing: 'border-box' as const },
  textarea: { resize: 'vertical' as const, minHeight: '72px', lineHeight: '1.5' },
  reviewGrid: { display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 12px', marginBottom: '24px' },
  reviewLabel: { fontSize: '12px', color: '#64748b', paddingTop: '2px' },
  reviewValue: { fontSize: '13px', color: '#e2e8f0', wordBreak: 'break-word' as const },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  btn: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontWeight: 500 },
  btnGhost: { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' },
  btnPrimary: { background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.4)' },
  btnSuccess: { background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.35)' },
}