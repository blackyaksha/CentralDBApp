import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCode,
  Folder,
  Link as LinkIcon,
  ChevronDown,
} from "lucide-react";
import { logActivity } from "../services/activityLogger";
import type { DatabaseRead } from "../generated/models/DatabaseModel";
import { FLOW_ENDPOINT } from "../config";

// ── Types ────────────────────────────────────────────────────────────────────

type FileType = "pdf" | "docx" | "sheet" | "image" | "presentation" | "code" | "generic";

type Accent = { text: string; bg: string; border: string; dot: string };

type PinnedFile = {
  id: number;
  title: string;
  fileType: FileType;
  customFileType?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  accent: Accent;
  url: string;
};

type ExplorerItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  fileType?: FileType;
  itemCount?: number;
  children?: ExplorerItem[];
  url?: string;
};

type ModalForm = {
  title: string;
  fileType: FileType | "";
  customFileType: string;
  link: string;
  placement: "top" | "folder";
  pinned: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFileAccent(fileType?: string): Accent {
  if (fileType === "sheet") return { text: "#86efac", bg: "rgba(22,163,74,0.12)", border: "rgba(34,197,94,0.2)", dot: "#22c55e" };
  if (fileType === "code") return { text: "#c084fc", bg: "rgba(147,51,234,0.12)", border: "rgba(168,85,247,0.2)", dot: "#c084fc" };
  if (fileType === "pdf") return { text: "#fca5a5", bg: "rgba(220,38,38,0.12)", border: "rgba(239,68,68,0.25)", dot: "#ef4444" };
  if (fileType === "presentation") return { text: "#fdba74", bg: "rgba(234,88,12,0.12)", border: "rgba(249,115,22,0.25)", dot: "#f97316" };
  if (fileType === "image") return { text: "#fbbf24", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.2)", dot: "#fbbf24" };
  if (fileType === "docx") return { text: "#93c5fd", bg: "rgba(37,99,235,0.12)", border: "rgba(59,130,246,0.2)", dot: "#3b82f6" };
  return { text: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.15)", dot: "#94a3b8" };
}

function getFileLabel(fileType?: string, customFileType?: string) {
  if (fileType === "generic" && customFileType) return customFileType.toUpperCase();
  switch (fileType) {
    case "pdf": return "PDF";
    case "docx": return "DOCX";
    case "sheet": return "XLSX";
    case "image": return "PNG";
    case "presentation": return "PPTX";
    case "code": return "CODE";
    default: return "FILE";
  }
}

function getIconComponent(fileType?: string) {
  switch (fileType) {
    case "sheet": return FileSpreadsheet;
    case "image": return ImageIcon;
    case "code": return FileCode;
    case "folder": return Folder;
    default: return FileText;
  }
}

function removeExplorerItemById(items: ExplorerItem[], id: string): ExplorerItem[] {
  return items
    .filter((it) => it.id !== id)
    .map((it) => (it.children ? { ...it, children: removeExplorerItemById(it.children, id) } : it));
}

// Wraps fetch with: (1) a hard timeout so a hung request doesn't stall the UI
// forever, and (2) a couple of retries with backoff for transient gateway
// errors (502/503/504) before giving up and surfacing an error to the user.
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 1,
  timeoutMs = 15000,
  backoffMs = 1000
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok && [502, 503, 504].includes(response.status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

// Runs a state update inside the browser's View Transition API when
// available, so cards that move between sections (Pinned <-> File Explorer)
// animate smoothly to their new spot instead of snapping. Falls back to a
// plain call in browsers that don't support it (e.g. Firefox, older Safari).
function withViewTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(update);
  } else {
    update();
  }
}

// Turns a URL into a stable, CSS-safe view-transition-name so the same
// logical file keeps its identity across the move, even though it gets a
// brand-new `id` when it's re-created in the destination list.
function vtName(prefix: string, url: string): string {
  const slug = (url || "item").replace(/[^a-zA-Z0-9]/g, "").slice(0, 60) || "item";
  return `${prefix}-${slug}`;
}

// The counts fetch pulls every single item in the document library (paged
// 5000 at a time) just to bucket-count them client-side — on a large library
// that can legitimately take a while, and doing it fresh on every page visit
// makes it feel slow every time. Cache the aggregated result for a few
// minutes so navigating back to Home doesn't repeat that full fetch.
const FOLDER_COUNTS_CACHE_KEY = "home_folder_counts_cache_v1";
const FOLDER_COUNTS_CACHE_TTL_MS = 5 * 60 * 1000;

type FolderCountsCache = {
  savedAt: number;
  folderCounts: FolderCount[];
  totalFileCount: number;
  totalFolderCount: number;
};

function readFolderCountsCache(): FolderCountsCache | null {
  try {
    const raw = sessionStorage.getItem(FOLDER_COUNTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FolderCountsCache;
    if (Date.now() - parsed.savedAt > FOLDER_COUNTS_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeFolderCountsCache(data: Omit<FolderCountsCache, "savedAt">) {
  try {
    sessionStorage.setItem(FOLDER_COUNTS_CACHE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // sessionStorage full/unavailable — caching is a nice-to-have, safe to skip
  }
}

// ── API-backed folder file counts (donut chart) ─────────────────────────────

type FolderCount = { label: string; value: number; color: string };

const DONUT_PALETTE = [
  "#3b82f6", "#22c55e", "#fbbf24", "#f97316", "#c084fc",
  "#ec4899", "#10b981", "#ef4444", "#60a5fa", "#a78bfa",
];

function apiGetValue(obj: any, key: string) {
  if (!obj) return undefined;
  if (key.includes(".")) return key.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  return obj[key];
}

function apiIsFolder(it: any): boolean {
  return Boolean(apiGetValue(it, "IsFolder") || apiGetValue(it, "FSObjType") === 1);
}

function apiGetPathParts(path: string): string[] {
  if (!path) return [];
  return path.split("/").filter((p) => p.trim() !== "");
}

// ── Seed data ────────────────────────────────────────────────────────────────
// "1 PD ONGOING" pinned directly to its SharePoint folder — no more routing
// through Monitoring.tsx to get there.

const ONE_PD_ONGOING_URL = import.meta.env.VITE_ONE_PD_ONGOING_URL as string;

const initialPinned: PinnedFile[] = [
  {
    id: 1,
    title: "1 PD ONGOING",
    fileType: "generic",
    customFileType: "FOLDER",
    icon: Folder,
    accent: getFileAccent("folder"),
    url: ONE_PD_ONGOING_URL,
  },
];

const initialExplorer: ExplorerItem[] = [];



// ── Add Item Modal ───────────────────────────────────────────────────────────

function AddItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (form: ModalForm) => void;
}) {
  const [form, setForm] = useState<ModalForm>({
    title: "",
    fileType: "",
    customFileType: "",
    link: "",
    placement: "top",
    pinned: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ModalForm, string>>>({});

  const set = (key: keyof ModalForm, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value } as ModalForm));
  };

  const validate = () => {
    const e: Partial<Record<keyof ModalForm, string>> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.fileType) e.fileType = "File type is required";
    if (form.fileType === "generic" && !form.customFileType.trim()) {
      e.customFileType = "Please specify the document type";
    }
    if (!form.link.trim()) e.link = "Link is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onAdd(form);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    color: "#fff",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontSize: 11.5,
    fontWeight: 600,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };

  const errorStyle: React.CSSProperties = { margin: "6px 0 0", fontSize: 11.5, color: "#f87171" };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "90vw",
          background: "#132747",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={15} color="#818cf8" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Add New Item</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#e4a0a0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              placeholder="e.g. Budget 2026.xlsx"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
            />
            {errors.title && <p style={errorStyle}>{errors.title}</p>}
          </div>

          <div>
            <label style={labelStyle}>File Type</label>
            <select
              value={form.fileType}
              onChange={(e) => set("fileType", e.target.value)}
              style={selectStyle}
            >
              <option value="">Select a type...</option>
              <option value="pdf">PDF — Document</option>
              <option value="docx">DOCX — Word Document</option>
              <option value="sheet">XLSX — Spreadsheet</option>
              <option value="image">Image</option>
              <option value="presentation">PPT / PPTX — Presentation</option>
              <option value="code">Code</option>
              <option value="generic">Other</option>
            </select>
            {errors.fileType && <p style={errorStyle}>{errors.fileType}</p>}
          </div>

          {form.fileType === "generic" && (
            <div>
              <label style={labelStyle}>Specify Document Type</label>
              <input
                type="text"
                placeholder="e.g. ZIP, RAR, PPTX, CSV..."
                value={form.customFileType}
                onChange={(e) => set("customFileType", e.target.value.toUpperCase())}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              />
              {errors.customFileType && <p style={errorStyle}>{errors.customFileType}</p>}
            </div>
          )}

          <div>
            <label style={labelStyle}>Link / URL</label>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
                <LinkIcon size={14} color="rgba(255,255,255,0.3)" />
              </div>
              <input
                type="text"
                placeholder="https://..."
                value={form.link}
                onChange={(e) => set("link", e.target.value)}
                style={{ ...inputStyle, paddingLeft: 32 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              />
            </div>
            {errors.link && <p style={errorStyle}>{errors.link}</p>}
          </div>

          <div>
            <label style={labelStyle}>Placement</label>
            <select
              value={form.placement}
              onChange={(e) => set("placement", e.target.value)}
              style={selectStyle}
            >
              <option value="top">Top-level (File Explorer)</option>
              <option value="folder">New folder</option>
            </select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => set("pinned", e.target.checked)}
              style={{ accentColor: "#818cf8", width: 15, height: 15, cursor: "pointer" }}
            />
            📌 Pin this item
          </label>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
              color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: "none", background: "#3b5bdb",
              color: "#fff", cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#4c6ef5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#3b5bdb")}
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({
  data, size = 220, strokeWidth = 30, hoveredLabel, onHoverChange,
}: {
  data: FolderCount[];
  size?: number;
  strokeWidth?: number;
  hoveredLabel?: string | null;
  onHoverChange?: (label: string | null) => void;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const hoverGrowth = 5; // matches the strokeWidth bump applied to the hovered segment below
  const radius = (size - strokeWidth - hoverGrowth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  const hoveredEntry = hoveredLabel ? data.find((d) => d.label === hoveredLabel) : null;
  const displayValue = hoveredEntry ? hoveredEntry.value : total;
  const displayCaption = hoveredEntry
    ? hoveredEntry.label.length > 14 ? hoveredEntry.label.slice(0, 13) + "…" : hoveredEntry.label
    : "FILES";

  // Shrink the center number as digit count grows so it never crowds the ring
  const digitCount = String(displayValue).length;
  const numberFontSize = digitCount >= 6 ? 20 : digitCount === 5 ? 22 : digitCount === 4 ? 25 : 27;
  const formattedValue = displayValue.toLocaleString();

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      {total > 0 && (
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const fraction = d.value / total;
            const segmentLength = Math.max(fraction * circumference - 1.5, 0); // small gap between segments
            const dasharray = `${segmentLength} ${circumference - segmentLength}`;
            const dashoffset = -cumulative;
            cumulative += fraction * circumference;
            const isDimmed = Boolean(hoveredLabel) && hoveredLabel !== d.label;
            const isActive = hoveredLabel === d.label;
            return (
              <circle
                key={d.label + i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={isActive ? strokeWidth + hoverGrowth : strokeWidth}
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
                opacity={isDimmed ? 0.3 : 1}
                style={{ cursor: "pointer", transition: "opacity 0.15s ease, stroke-width 0.15s ease" }}
                onMouseEnter={() => onHoverChange?.(d.label)}
                onMouseLeave={() => onHoverChange?.(null)}
              />
            );
          })}
        </g>
      )}
      <text x="50%" y="47%" textAnchor="middle" fontSize={numberFontSize} fontWeight={700} fill="#fff">
        {formattedValue}
      </text>
      <text x="50%" y="61%" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.4)" letterSpacing="0.06em">
        {displayCaption.toUpperCase()}
      </text>
    </svg>
  );
}

// ── Folder Breakdown (stat chips + donut + linked legend) ───────────────────

function FolderBreakdown({
  data, totalFileCount, totalFolderCount,
}: {
  data: FolderCount[];
  totalFileCount: number;
  totalFolderCount: number;
}) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const total = totalFileCount || 1;

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={styles.statChip}>
          <span style={{ ...styles.statDot, background: "#60a5fa" }} />
          <span style={styles.statLabel}>Files</span>
          <span style={styles.statValue}>{totalFileCount.toLocaleString()}</span>
        </div>
        <div style={styles.statChip}>
          <span style={{ ...styles.statDot, background: "#fbbf24" }} />
          <span style={styles.statLabel}>Folders</span>
          <span style={styles.statValue}>{totalFolderCount.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ flexShrink: 0 }}>
          <DonutChart data={data} hoveredLabel={hoveredLabel} onHoverChange={setHoveredLabel} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto", flex: 1, minWidth: 0 }}>
          {data.map((d) => {
            const isHovered = hoveredLabel === d.label;
            const pct = ((d.value / total) * 100).toFixed(1);
            return (
              <div
                key={d.label}
                onMouseEnter={() => setHoveredLabel(d.label)}
                onMouseLeave={() => setHoveredLabel(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, fontSize: 12.5,
                  padding: "6px 8px", borderRadius: 7, cursor: "pointer",
                  background: isHovered ? "rgba(255,255,255,0.05)" : "transparent",
                  transition: "background 0.12s ease",
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                <span style={{
                  color: isHovered ? "#fff" : "rgba(255,255,255,0.75)", flex: 1, minWidth: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontWeight: isHovered ? 600 : 400,
                }}>
                  {d.label}
                </span>
                {isHovered && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, flexShrink: 0 }}>{pct}%</span>}
                <span style={{ color: isHovered ? "#fff" : "rgba(255,255,255,0.4)", fontWeight: 600, flexShrink: 0 }}>{d.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── File Explorer ────────────────────────────────────────────────────────────

function FileExplorer({ items, onDelete }: { items: ExplorerItem[]; onDelete: (id: string) => void }) {
  const [stack, setStack] = useState<{ label: string; items: ExplorerItem[] }[]>([{ label: "Folder", items }]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);

  useEffect(() => {
    setStack((s) => {
      const copy = [...s];
      copy[0] = { ...copy[0], items };
      return copy;
    });
  }, [items]);

  const current = stack[stack.length - 1];
  const folders = current.items.filter((i) => i.type === "folder");
  const files = current.items.filter((i) => i.type === "file");

  const openFolder = (folder: ExplorerItem) => {
    setStack((s) => [...s, { label: folder.name, items: folder.children ?? [] }]);
  };

  const goBack = () => setStack((s) => s.slice(0, -1));

  return (
    <div>
      {stack.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
          <button
            onClick={goBack}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
              borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.5)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          >
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {stack.map((s, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>/</span>}
                <span style={{ fontSize: 11, fontWeight: 500, color: i === stack.length - 1 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}>
                  {s.label}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {folders.length > 0 && (
        <>
          <p style={{ margin: "0 0 10px 0", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Folders
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
            {folders.map((folder) => {
              const isHovered = hoveredId === folder.id;
              return (
                <div
                  key={folder.id}
                  onMouseEnter={() => setHoveredId(folder.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => openFolder(folder)}
                  style={{
                    display: "flex", flexDirection: "column", gap: 12, padding: "18px 16px",
                    borderRadius: 12, transition: "all 0.18s ease", position: "relative", cursor: "pointer",
                    border: `1px solid ${isHovered ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.07)"}`,
                    background: isHovered ? "rgba(251,191,36,0.07)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  <Folder size={22} color="#fbbf24" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {folder.name}
                  </span>
                  {isHovered && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
                      style={{
                        position: "absolute", top: 8, right: 8,
                        width: 24, height: 24, borderRadius: 6,
                        border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.25)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                    >
                      <Trash2 size={12} color="#f87171" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {files.length > 0 && (
        <>
          <p style={{ margin: "0 0 10px 0", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Files
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
            {files.map((file) => {
              const isHovered = hoveredId === file.id;
              const isDraggingThis = draggingFileId === file.id;
              const accent = getFileAccent(file.fileType);
              const Icon = getIconComponent(file.fileType);
              return (
                <div
                  key={file.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingFileId(file.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("application/json", JSON.stringify({
                      source: "explorer",
                      id: file.id,
                      title: file.name,
                      fileType: file.fileType,
                      url: file.url,
                    }));
                  }}
                  onDragEnd={() => setDraggingFileId(null)}
                  onMouseEnter={() => setHoveredId(file.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                    borderRadius: 12, position: "relative",
                    border: `1px solid ${isHovered ? accent.border : "rgba(255,255,255,0.07)"}`,
                    background: isHovered ? accent.bg : "rgba(255,255,255,0.03)",
                    transition: "background 0.18s ease, border-color 0.18s ease, opacity 0.15s ease",
                    opacity: isDraggingThis ? 0.55 : 1,
                    viewTransitionName: vtName("card", file.url ?? ""),
                  } as React.CSSProperties}
                >
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => logActivity("file", "Opened", file.name)}
                    style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", flex: 1, minWidth: 0 }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0, background: accent.bg, border: `1px solid ${accent.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={18} color={accent.text} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {file.name}
                      </span>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                        color: accent.text, background: accent.bg, border: `1px solid ${accent.border}`,
                        padding: "2px 8px", borderRadius: 5, alignSelf: "flex-start", lineHeight: "1.6",
                      }}>
                        {getFileLabel(file.fileType)}
                      </span>
                    </div>
                  </a>
                  {isHovered && (
                    <button
                      onClick={() => onDelete(file.id)}
                      style={{
                        marginLeft: "auto", flexShrink: 0,
                        width: 26, height: 26, borderRadius: 6,
                        border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.25)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                    >
                      <Trash2 size={12} color="#f87171" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {folders.length === 0 && files.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 120, gap: 8 }}>
          <Folder size={28} color="rgba(255,255,255,0.1)" />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>This folder is empty</span>
        </div>
      )}
    </div>
  );
}

// ── Home ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [username, setUsername] = useState("User");
  const [hovered, setHovered] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isPinDragOver, setIsPinDragOver] = useState(false);

  const [pinnedFiles, setPinnedFiles] = useState<PinnedFile[]>(() => {
    let loaded: PinnedFile[];
    try {
      const saved = localStorage.getItem("home_pinned");
      if (!saved) {
        loaded = initialPinned;
      } else {
        const parsed = JSON.parse(saved) as Array<Omit<PinnedFile, "icon"> & { iconType?: string }>;
        loaded = parsed.map((f) => ({
          ...f,
          icon: getIconComponent(f.iconType ?? f.fileType),
          accent: f.accent ?? getFileAccent(f.fileType),
        })) as PinnedFile[];
      }
    } catch {
      loaded = initialPinned;
    }

    // Always make sure "1 PD ONGOING" is pinned, even if this browser already
    // had other pinned files saved from before — every supervisor should see
    // it regardless of their own localStorage history. Guard against id
    // collisions with whatever's already saved (this is what was causing the
    // duplicate React key warning).
    const hasOnePdOngoing = loaded.some((f) => f.url === ONE_PD_ONGOING_URL);
    if (!hasOnePdOngoing) {
      const existingIds = new Set(loaded.map((f) => f.id));
      let seedId = initialPinned[0].id;
      while (existingIds.has(seedId)) seedId += 1;
      loaded = [{ ...initialPinned[0], id: seedId }, ...loaded];
    }
    return loaded;
  });

  const [explorerItems, setExplorerItems] = useState<ExplorerItem[]>(() => {
    try {
      const saved = localStorage.getItem("home_explorer");
      return saved ? (JSON.parse(saved) as ExplorerItem[]) : initialExplorer;
    } catch {
      return initialExplorer;
    }
  });

  const [folderCounts, setFolderCounts] = useState<FolderCount[] | null>(null);
  const [totalFileCount, setTotalFileCount] = useState(0);
  const [totalFolderCount, setTotalFolderCount] = useState(0);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [countsRetryTick, setCountsRetryTick] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem("displayName");
    if (stored) setUsername(stored);
  }, []);

  // Pull file counts per parent folder from the same API CurrentFiles uses,
  // then group into counts for the donut chart.
  useEffect(() => {
    let cancelled = false;

    const fetchFolderCounts = async () => {
      // Serve the cached result instantly if we have a fresh one — this is
      // what makes returning to Home feel fast instead of re-running the
      // full paginated fetch every single time.
      const cached = readFolderCountsCache();
      if (cached && countsRetryTick === 0) {
        setFolderCounts(cached.folderCounts);
        setTotalFileCount(cached.totalFileCount);
        setTotalFolderCount(cached.totalFolderCount);
        setCountsLoading(false);
        setCountsError(null);
        return;
      }

      setCountsLoading(true);
      setCountsError(null);
      try {
        let allItems: DatabaseRead[] = [];
        let nextLink: string | null = null;
        const PAGE_SIZE = 5000;

        do {
          const body: Record<string, any> = { pageSize: PAGE_SIZE };
          if (nextLink) body.nextLink = nextLink;
          const response = await fetchWithRetry(FLOW_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            throw new Error(
              response.status === 504
                ? "The server took too long to respond (504). This can happen when there's a lot of data to load — click Retry, or try again in a moment."
                : `Flow request failed: ${response.status}`
            );
          }
          const data = await response.json();
          const newItems = Array.isArray(data.items) ? data.items : [];
          allItems = allItems.concat(newItems);
          nextLink = data.nextLink ?? null;
        } while (nextLink);

        if (cancelled) return;

        const counts: Record<string, number> = {};
        let folderRecordCount = 0;
        allItems.forEach((it: any) => {
          if (apiIsFolder(it)) {
            folderRecordCount += 1;
            return; // count files only in the per-folder breakdown
          }
          const filePath = String(apiGetValue(it, "FilePath") ?? "");
          const parts = apiGetPathParts(filePath);
          // parts[0] is typically "Shared Documents"; parts[1] is the parent folder
          const parent = parts.length >= 2 ? parts[1] : "Other";
          counts[parent] = (counts[parent] ?? 0) + 1;
        });

        const grouped: FolderCount[] = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([label, value], i) => ({ label, value, color: DONUT_PALETTE[i % DONUT_PALETTE.length] }));

        const fileTotal = grouped.reduce((sum, d) => sum + d.value, 0);
        setTotalFileCount(fileTotal);
        setTotalFolderCount(folderRecordCount);
        setFolderCounts(grouped);
        writeFolderCountsCache({ folderCounts: grouped, totalFileCount: fileTotal, totalFolderCount: folderRecordCount });
      } catch (err: any) {
        if (!cancelled) {
          const message =
            err?.name === "AbortError"
              ? "The request timed out while loading file counts. Click Retry to try again."
              : err?.message ?? "Failed to load file counts";
          setCountsError(message);
        }
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    };

    fetchFolderCounts();
    return () => { cancelled = true; };
  }, [countsRetryTick]);

  useEffect(() => {
    const serializable = pinnedFiles.map(({ icon, ...rest }) => rest);
    localStorage.setItem("home_pinned", JSON.stringify(serializable));
  }, [pinnedFiles]);

  useEffect(() => {
    localStorage.setItem("home_explorer", JSON.stringify(explorerItems));
  }, [explorerItems]);

  // Auto-scroll the page while dragging a card near the top/bottom edge of
  // the viewport, so pinned/explorer sections that are off-screen can still
  // be reached as drop targets.
  useEffect(() => {
    const EDGE_ZONE = 90;
    const MAX_SPEED = 22;

    const handleDragOver = (e: DragEvent) => {
      const y = e.clientY;
      const vh = window.innerHeight;

      let delta = 0;
      if (y < EDGE_ZONE) {
        delta = -MAX_SPEED * (1 - y / EDGE_ZONE);
      } else if (y > vh - EDGE_ZONE) {
        delta = MAX_SPEED * (1 - (vh - y) / EDGE_ZONE);
      }

      if (delta !== 0) {
        window.scrollBy(0, delta);
      }
    };

    window.addEventListener("dragover", handleDragOver);
    return () => window.removeEventListener("dragover", handleDragOver);
  }, []);

  const handleAdd = (form: ModalForm) => {
    const id = Date.now().toString();
    const fileType = (form.fileType || "generic") as FileType;

    if (form.placement === "folder") {
      const newFolder: ExplorerItem = {
        id, name: form.title, type: "folder", itemCount: 0, children: [], url: form.link,
      };
      setExplorerItems((items) => [...items, newFolder]);
      logActivity("folder", "Added", form.title);
    } else {
      const newFile: ExplorerItem = {
        id,
        name: form.title,
        type: "file",
        fileType,
        url: form.link,
      };
      setExplorerItems((items) => [...items, newFile]);
      logActivity("file", "Added", form.title);
    }

    if (form.pinned) {
      const newPinned: PinnedFile = {
        id: Date.now(),
        title: form.title,
        fileType,
        customFileType: fileType === "generic" ? form.customFileType : undefined,
        icon: getIconComponent(fileType),
        accent: getFileAccent(fileType),
        url: form.link,
      };
      setPinnedFiles((p) => [...p, newPinned]);
    }
  };

  return (
    <div style={styles.page}>
      {showModal && <AddItemModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={styles.greeting}>
          Welcome back, <span style={{ fontSize: 40, color: "#818cf8" }}>{username}</span>
        </h1>
        <p style={styles.greetingSub}>Quick access to your frequently used documents</p>
      </div>

      {/* Pinned Files */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsPinDragOver(true); }}
        onDragLeave={() => setIsPinDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsPinDragOver(false);
          setDraggingId(null);
          const raw = e.dataTransfer.getData("application/json");
          if (!raw) return;
          const dropped = JSON.parse(raw);
          if (dropped.source !== "explorer") return;
          const fileType = (dropped.fileType || "generic") as FileType;
          const newPinned: PinnedFile = {
            id: Date.now(),
            title: dropped.title,
            fileType,
            icon: getIconComponent(fileType),
            accent: getFileAccent(fileType),
            url: dropped.url,
          };
          withViewTransition(() => {
            setPinnedFiles((p) => [...p, newPinned]);
            setExplorerItems((items) => removeExplorerItemById(items, dropped.id));
          });
          logActivity("file", "Pinned via drag", dropped.title);
        }}
        style={{
          borderRadius: 16,
          padding: isPinDragOver ? 16 : 0,
          margin: isPinDragOver ? -16 : 0,
          marginBottom: isPinDragOver ? 20 : 36,
          background: isPinDragOver ? "rgba(129,140,248,0.1)" : "transparent",
          outline: isPinDragOver ? "3px dashed #818cf8" : "none",
          outlineOffset: isPinDragOver ? -3 : 4,
          boxShadow: isPinDragOver ? "0 0 0 6px rgba(129,140,248,0.08)" : "none",
          transition: "all 0.18s ease",
        }}
      >
        <p style={styles.sectionLabel}>Pinned Files</p>
        <div style={styles.grid}>
          {pinnedFiles.map((file) => {
          const Icon = file.icon;
          const isHovered = hovered === file.id;
          const isDragging = draggingId === file.id;
          return (
            <div
              key={`${file.id}-${file.url}`}
              draggable
              onDragStart={(e) => {
                setDraggingId(file.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("application/json", JSON.stringify({
                  source: "pinned",
                  id: file.id,
                  title: file.title,
                  fileType: file.fileType,
                  customFileType: file.customFileType,
                  url: file.url,
                }));
              }}
              onDragEnd={() => setDraggingId(null)}
              onMouseEnter={() => setHovered(file.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => logActivity("file", "Opened", file.title)}
              style={{
                ...styles.card,
                position: "relative",
                background: isHovered ? file.accent.bg : "rgba(255,255,255,0.03)",
                borderColor: isHovered ? file.accent.border : "rgba(255,255,255,0.07)",
                transform: isHovered ? "translateY(-2px)" : "none",
                boxShadow: isHovered ? "0 8px 24px rgba(0,0,0,0.25)" : "none",
                cursor: "pointer",
                opacity: isDragging ? 0.55 : 1,
                transition: "background 0.18s ease, border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, opacity 0.15s ease",
                viewTransitionName: vtName("card", file.url),
              } as React.CSSProperties}
            >
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", flex: 1, minWidth: 0 }}
              >
                <div style={{ ...styles.iconBox, background: file.accent.bg, border: `1px solid ${file.accent.border}` }}>
                  <Icon size={18} color={file.accent.text} />
                </div>
                <div style={styles.cardText}>
                  <span style={styles.cardTitle}>{file.title}</span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: file.accent.text, background: file.accent.bg, border: `1px solid ${file.accent.border}`,
                    padding: "2px 8px", borderRadius: 5, alignSelf: "flex-start", lineHeight: "1.6",
                  }}>
                    {getFileLabel(file.fileType, file.customFileType)}
                  </span>
                </div>
              </a>
              {isHovered && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPinnedFiles((p) => p.filter((f) => f.id !== file.id)); }}
                  style={{
                    marginLeft: "auto", flexShrink: 0,
                    width: 26, height: 26, borderRadius: 6,
                    border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.25)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                >
                  <Trash2 size={12} color="#f87171" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      </div>

      {/* Files by Folder (donut) + File Explorer, side by side */}
      <div style={styles.lowerGrid}>
        {/* Files by Folder */}
        <div>
          <p style={styles.sectionLabel}>Files by Folder</p>
          <div style={styles.chartCard}>
            {countsLoading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0" }}>
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                  }
                `}</style>
                <div style={styles.spinner} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Loading counts...</span>
              </div>
            )}

            {!countsLoading && countsError && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ color: "#fca5a5", fontSize: 12.5, margin: 0 }}>Error: {countsError}</p>
                <button
                  onClick={() => setCountsRetryTick((t) => t + 1)}
                  style={{
                    alignSelf: "flex-start", padding: "6px 14px", borderRadius: 7,
                    border: "1px solid rgba(252,165,165,0.35)", background: "rgba(239,68,68,0.1)",
                    color: "#fca5a5", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                >
                  Retry
                </button>
              </div>
            )}

            {!countsLoading && !countsError && folderCounts && folderCounts.length === 0 && (
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)", fontStyle: "italic", margin: 0 }}>
                No files found
              </p>
            )}

            {!countsLoading && !countsError && folderCounts && folderCounts.length > 0 && (
              <FolderBreakdown data={folderCounts} totalFileCount={totalFileCount} totalFolderCount={totalFolderCount} />
            )}
          </div>
        </div>

        {/* File Explorer */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            setDraggingId(null);
            const raw = e.dataTransfer.getData("application/json");
            if (!raw) return;
            const dropped = JSON.parse(raw);
            if (dropped.source !== "pinned") return;
            const newItem: ExplorerItem = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: dropped.title,
              type: "file",
              fileType: dropped.fileType,
              url: dropped.url,
            };
            withViewTransition(() => {
              setExplorerItems((items) => [...items, newItem]);
              if (typeof dropped.id === "number") {
                setPinnedFiles((p) => p.filter((f) => f.id !== dropped.id));
              }
            });
            logActivity("file", "Added via pin drag", dropped.title);
          }}
          style={{ position: "relative" }}
        >
          {/* Highlight overlay: absolutely positioned so it can bleed well past
              the section's own box (covering it edge-to-edge and beyond) purely
              visually, without adding real padding/margin — it never affects
              the layout height/width of this section or pushes the chart card. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: -200,
              left: -5,
              right: -25,
              borderRadius: 18,
              pointerEvents: "none",
              opacity: isDragOver ? 1 : 0,
              background: "rgba(129,140,248,0.14)",
              outline: "4px dashed #818cf8",
              outlineOffset: -4,
              boxShadow: "0 0 0 10px rgba(129,140,248,0.1)",
              transition: "opacity 0.18s ease",
              zIndex: 0,
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ ...styles.sectionLabel, margin: 0 }}>File Explorer</p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.45)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
            >
              <Plus size={12} /> Add Item
            </button>
          </div>

          <FileExplorer items={explorerItems} onDelete={(id) => setExplorerItems((prev) => prev.filter((i) => i.id !== id))} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "32px 32px 48px", minHeight: "100%", background: "#0f1f3d",
    fontFamily: "'Geist', 'DM Sans', system-ui, sans-serif", boxSizing: "border-box",
  },
  greeting: { margin: "0 0 6px 0", fontSize: 40, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" },
  greetingSub: { margin: 0, fontSize: 13.5, color: "rgba(255,255,255,0.38)" },
  sectionLabel: { margin: "0 0 10px 0", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, letterSpacing: "0.1em" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 },
  card: { display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", textDecoration: "none", transition: "all 0.18s ease", cursor: "pointer" },
  iconBox: { width: 40, height: 40, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  cardText: { display: "flex", flexDirection: "column" as const, gap: 3, minWidth: 0 },
  cardTitle: { fontSize: 13.5, fontWeight: 500, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  cardType: { fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const },
  lowerGrid: { display: "grid", gridTemplateColumns: "520px 1fr", gap: 20, alignItems: "start" },
  chartCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12, padding: "20px 18px", minHeight: 220, boxSizing: "border-box" as const,
  },
  spinner: {
    width: 24, height: 24, border: "3px solid rgba(255,255,255,0.1)",
    borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  statChip: {
    display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
    borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)",
    flex: 1, minWidth: 0,
  },
  statDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  statLabel: { fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  statValue: { fontSize: 12.5, fontWeight: 700, color: "#fff", marginLeft: "auto" },
};