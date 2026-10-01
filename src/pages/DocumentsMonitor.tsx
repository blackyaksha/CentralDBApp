import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
// TODO: match the service name/path to what `pac code add-data-source` generated in src/generated
import { MonitoringofPDLogsService as Svc } from '../generated/services/MonitoringofPDLogsService'

type Row = Record<string, string>

const COLUMNS = ['Date', 'For', 'Particular', 'Out To', 'Remarks']
const WRAP_COLS = new Set(['Particular', 'Remarks'])
// Table column widths (must add up to 100%): Particular and Remarks are the wide ones
const COL_WIDTHS: Record<string, string> = { Date: '11%', For: '12%', Particular: '33%', 'Out To': '12%', Remarks: '32%' }
const EMPTY_FORM = Object.fromEntries(COLUMNS.map(c => [c, '']))

// ── SharePoint field mapping ──────────────────────────────────────────────────
// Edit the internal column names here to match the generated model in src/generated/models
const F = {
  date: 'Date',
  for: 'For',
  particular: 'Particular',
  outTo: 'OutTo',
  remarks: 'Remarks',
}
// Any of these that are Choice columns in SharePoint must be sent as { Value: '...' }
const CHOICE_FIELDS = new Set<string>([])

// Choice/Person values come back as objects — flatten to plain text
const spVal = (v: any): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return String(v.Value ?? v.Title ?? '')
  return String(v)
}
const spWrite = (field: string, v: string, empty: any) =>
  v ? (CHOICE_FIELDS.has(field) ? { Value: v } : v) : empty

// forCreate: omit empty fields. For updates, empty fields are sent as null so cleared cells actually clear.
const toPayload = (r: Row, forCreate: boolean): any => {
  const empty = forCreate ? undefined : null
  const p: Record<string, any> = {
    [F.for]: spWrite(F.for, r['For'], empty),
    [F.particular]: spWrite(F.particular, r['Particular'], empty),
    [F.outTo]: spWrite(F.outTo, r['Out To'], empty),
    [F.remarks]: spWrite(F.remarks, r['Remarks'], empty),
  }
  if (r['Date']) p[F.date] = r['Date']
  if (forCreate) Object.keys(p).forEach(k => p[k] === undefined && delete p[k])
  return p
}

// Generated SharePoint services often return { success, data, error } instead of throwing,
// so surface failures ourselves (and log the raw result to the browser console for debugging)
const assertOk = (res: any, label: string) => {
  console.log(label, res)
  if (res && res.success === false) {
    const e = res.error
    throw new Error(e?.message || (typeof e === 'string' ? e : JSON.stringify(e)))
  }
  return res
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

// ── Modal: Edit Row ───────────────────────────────────────────────────────────
function EditRowModal({
  row,
  saving,
  onSave,
  onCancel,
}: {
  row: Row
  saving: boolean
  onSave: (row: Row) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Row>({ ...row })
  const set = (col: string, val: string) => setForm(f => ({ ...f, [col]: val }))
  const changed = COLUMNS.some(c => (form[c] ?? '') !== (row[c] ?? ''))

  return (
    <div style={M.overlay}>
      <div style={M.box}>
        <h3 style={M.title}>Edit entry</h3>
        <p style={M.sub}>Update the details below, then save your changes.</p>
        <div style={M.formGrid}>
          {COLUMNS.map(col => (
            <React.Fragment key={col}>
              <label style={M.label}>{col}</label>
              {col === 'Date' ? (
                <input
                  type="date"
                  value={form[col] ?? ''}
                  onChange={e => set(col, e.target.value)}
                  style={M.input}
                />
              ) : WRAP_COLS.has(col) ? (
                <textarea
                  value={form[col] ?? ''}
                  onChange={e => set(col, e.target.value)}
                  style={{ ...M.input, ...M.textarea }}
                  rows={3}
                />
              ) : (
                <input
                  type="text"
                  value={form[col] ?? ''}
                  onChange={e => set(col, e.target.value)}
                  style={M.input}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={M.actions}>
          <button style={{ ...M.btn, ...M.btnGhost }} onClick={onCancel} disabled={saving}>Cancel</button>
          <button
            style={{ ...M.btn, ...M.btnSuccess }}
            onClick={() => (changed ? onSave(form) : onCancel())}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
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
  const fileName = 'Documents-Monitoring.xlsx'
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRow, setEditingRow] = useState<Row | null>(null)
  const tableRef = useRef<HTMLDivElement | null>(null)
  const exportMenuRef = useRef<HTMLDivElement | null>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [forFilter, setForFilter] = useState('')

  const loadFromSharePoint = useCallback(async () => {
    setLoading(true)
    try {
      // NOTE: getAll() may return only the first page — check its options (top / skip token) if the list is large
      const res: any = assertOk(await Svc.getAll(), 'getAll result')
      const data: any[] = res?.data ?? []
      setRows(data.map(d => ({
        id: String(d.ID ?? d.Id ?? d.id),
        Date: d[F.date] ? String(d[F.date]).slice(0, 10) : '',
        For: spVal(d[F.for]),
        Particular: spVal(d[F.particular]),
        'Out To': spVal(d[F.outTo]),
        Remarks: spVal(d[F.remarks]),
      })))
    } catch (err: any) {
      alert('Load failed: ' + (err.message || String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFromSharePoint() }, [loadFromSharePoint])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node))
        setExportMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Insert only new rows (no id) — never touches existing rows
  const saveNewRows = async (newRows: Row[]) => {
    if (!newRows.length) return
    setSaving(true)
    try {
      // SharePoint has no bulk insert, so one create per row
      for (const r of newRows) {
        const payload = toPayload(r, true)
        console.log('create payload', payload)
        assertOk(await Svc.create(payload), 'create result')
      }
      await loadFromSharePoint()
    } catch (err: any) {
      alert('Save failed: ' + (err.message || String(err)))
    } finally {
      setSaving(false)
    }
  }

  // Update one row (from the Edit popup) — never inserts. Returns true on success.
  const saveEdit = async (row: Row): Promise<boolean> => {
    setSaving(true)
    try {
      const payload = toPayload(row, false)
      console.log('update payload', payload)
      assertOk(await Svc.update((row as any).id, payload), 'update result')
      await loadFromSharePoint()
      return true
    } catch (err: any) {
      alert('Save failed: ' + (err.message || String(err)))
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleAddConfirm = async (row: Row) => {
    setShowAddModal(false)
    await saveNewRows([row])
  }

  // Keep the popup open while saving so nothing is lost if the save fails
  const handleEditSave = async (row: Row) => {
    const ok = await saveEdit(row)
    if (ok) setEditingRow(null)
  }

  const exportXlsx = () => {
    const periodLabel = getExportPeriodLabel(filtered)
    const titleRow = `Outgoing and Incoming Documents Monitoring — ${periodLabel}`
    const aoa = [[titleRow], [], COLUMNS, ...filtered.map(r => COLUMNS.map(c => r[c] ?? ''))]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, fileName || 'export.xlsx')
    setExportMenuOpen(false)
  }

  const exportPdf = async () => {
  setExportMenuOpen(false)
  if (!filtered.length) return

  const pdf = new jsPDF('l', 'mm', 'a4')
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const margin = 10
  const usableWidth = pw - margin * 2
  const colWidths = COLUMNS.map(c => usableWidth * (parseFloat(COL_WIDTHS[c]) / 100))
  const headerHeight = 10
  let y = margin

  const drawHeader = (startY: number) => {
    pdf.setFillColor(15, 36, 68)
    pdf.setDrawColor(15, 36, 68)
    pdf.setLineWidth(0.35)
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
  const periodLabel = getExportPeriodLabel(filtered)
  const titleText = `Outgoing and Incoming Documents Monitoring — ${periodLabel}`
  const titleLines = pdf.splitTextToSize(titleText, usableWidth)
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20, 20, 20)
  pdf.text(titleLines, margin, y + 6)
  y += 14 + (titleLines.length - 1) * 4

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

    pdf.setDrawColor(140, 156, 173)
    pdf.setLineWidth(0.25)
    let x = margin
    COLUMNS.forEach((_, i) => {
      pdf.rect(x, y, colWidths[i], thisRowHeight, 'S')
      x += colWidths[i]
    })

    pdf.setTextColor(20, 20, 20)
    x = margin
    COLUMNS.forEach((_, i) => {
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

  const getExportPeriodLabel = (rowsToExport: Row[]) => {
    const dates = rowsToExport
      .map(r => parseDate(r['Date']))
      .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))

    if (!dates.length) {
      const now = new Date()
      return now.toLocaleString('default', { month: 'long', year: 'numeric' })
    }

    const min = new Date(Math.min(...dates.map(d => d.getTime())))
    const max = new Date(Math.max(...dates.map(d => d.getTime())))

    if (min.getMonth() === max.getMonth() && min.getFullYear() === max.getFullYear()) {
      return min.toLocaleString('default', { month: 'long', year: 'numeric' })
    }

    return `${min.toLocaleString('default', { month: 'long' })} ${min.getFullYear()} - ${max.toLocaleString('default', { month: 'long' })} ${max.getFullYear()}`
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

      {editingRow && (
        <EditRowModal
          row={editingRow}
          saving={saving}
          onSave={handleEditSave}
          onCancel={() => setEditingRow(null)}
        />
      )}

      <div style={S.header}>
        <h2 style={S.heading}>
          Outgoing and Incoming Documents Monitoring Page
          {rows.length > 0 && (
            <span style={S.badge}>{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
          )}
          {saving && <span style={S.badge}>Saving...</span>}
        </h2>
        <p style={S.subheading}>Records load automatically. Use “Add entry” to add a record, or click a row to edit it.</p>
      </div>

      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <button onClick={() => setShowAddModal(true)} style={{ ...S.btn, ...S.btnPrimary }}>
            + Add entry
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

          <button onClick={loadFromSharePoint} style={S.btn} title="Refresh">↺ Refresh</button>
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
          <colgroup>
            {COLUMNS.map(c => <col key={c} style={{ width: COL_WIDTHS[c] }} />)}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map(c => <th key={c} style={S.th}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={COLUMNS.length} style={S.empty}>Loading...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={COLUMNS.length} style={S.empty}>No records found. Add an entry to get started.</td></tr>
            )}
            {!loading && rows.length > 0 && filtered.length === 0 && (
              <tr><td colSpan={COLUMNS.length} style={S.empty}>No rows match the current filters.</td></tr>
            )}
            {!loading && filtered.map(row => (
              <tr
                key={(row as any).id}
                style={S.trClickable}
                tabIndex={0}
                title="Click to edit"
                onClick={() => setEditingRow(row)}
                onKeyDown={e => { if (e.key === 'Enter') setEditingRow(row) }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '' }}
              >
                {COLUMNS.map(col => (
                  <td key={col} style={S.td}>{row[col] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' as const },
  header: { marginBottom: '20px', flexShrink: 0 },
  heading: { margin: '0 0 4px', fontSize: '33px', fontWeight: 500, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' },
  subheading: { margin: 0, fontSize: '13px', color: '#64748b' },
  badge: { display: 'inline-block', padding: '2px 10px', fontSize: '12px', fontWeight: 400, borderRadius: '99px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' },
  toolbar: { display: 'flex', flexWrap: 'wrap' as const, gap: '8px', alignItems: 'center', marginBottom: '16px', flexShrink: 0 },
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
  tableWrap: { flex: 1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflowX: 'auto' as const, overflowY: 'auto' as const, minHeight: 0 },
  table: { borderCollapse: 'collapse' as const, tableLayout: 'fixed' as const, width: '100%', minWidth: '900px', fontSize: '15px', border: '1px solid rgba(148, 163, 184, 0.25)' },
  th: { padding: '10px 14px', textAlign: 'left' as const, fontWeight: 500, fontSize: '15px', color: '#64748b', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' as const },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  td: { padding: '7px 14px', verticalAlign: 'top' as const, color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const, lineHeight: '1.5' },
  trClickable: { borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' },
  empty: { padding: '40px', textAlign: 'center' as const, color: '#475569', fontSize: '13px' },
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