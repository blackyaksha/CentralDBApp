import { useEffect, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Folder,
  ChevronLeft,
  File,
  Image,
  FileCode,
  Plus,
  X,
  Link,
  Trash2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type FileType = "doc" | "sheet" | "image" | "code" | "pdf" | "presentation" | "generic";
type Placement = "pinned" | "folder" | "file";

type PinnedFile = {
  id: number;
  title: string;
  type: string;
  icon: any;
  accent: { text: string; bg: string; border: string; dot: string };
  url: string;
};

type ExplorerItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  fileType?: FileType;
  displayLabel?: string;
  children?: ExplorerItem[];
  itemCount?: number;
  url?: string;
};

// ── Initial data ──────────────────────────────────────────────────────────────
const initialPinned: PinnedFile[] = [
  {
    id: 1,
    title: "Database App",
    type: "DOCX",
    icon: FileText,
    accent: { text: "#93c5fd", bg: "rgba(37,99,235,0.12)", border: "rgba(59,130,246,0.2)", dot: "#3b82f6" },
    url: "https://energyregcomm-my.sharepoint.com/:w:/g/personal/ppis_pd_erc_ph/IQBtb1x9no4NS67kd5wvgo-9ATxXBwOvHeN2JaapAwXwA5c",
  },
  {
    id: 2,
    title: "2024 to 2026 SPMS Submission of Matrix",
    type: "XLSX",
    icon: FileSpreadsheet,
    accent: { text: "#86efac", bg: "rgba(22,163,74,0.12)", border: "rgba(34,197,94,0.2)", dot: "#22c55e" },
    url: "https://energyregcomm-my.sharepoint.com/:x:/g/personal/ppis_pd_erc_ph/IQBH-YvvApWYTbCg27R1e7eFAbzYN7zj3FbNWN5mN-Xxyh4?e=CtbQCe",
  },
];

const initialExplorer: ExplorerItem[] = [
  {
    id: "folder-1",
    name: "Folder Name",
    type: "folder",
    itemCount: 0,
    children: [],
  },
  { id: "file-1", name: "Document 1.docx", type: "file", fileType: "doc", displayLabel: "DOCX", url: "#" },
  { id: "file-2", name: "Spreadsheet 1.xlsx", type: "file", fileType: "sheet", displayLabel: "XLSX", url: "#" },
  { id: "file-3", name: "File 3", type: "file", fileType: "generic", displayLabel: "FILE", url: "#" },
];

// ── Accent helpers ────────────────────────────────────────────────────────────
type Accent = { text: string; bg: string; border: string; dot: string };

function getFileAccent(fileType?: string): Accent {
  if (fileType === "doc")          return { text: "#93c5fd", bg: "rgba(37,99,235,0.12)",   border: "rgba(59,130,246,0.2)",  dot: "#3b82f6" };
  if (fileType === "sheet")        return { text: "#86efac", bg: "rgba(22,163,74,0.12)",   border: "rgba(34,197,94,0.2)",   dot: "#22c55e" };
  if (fileType === "image")        return { text: "#fbbf24", bg: "rgba(234,179,8,0.12)",   border: "rgba(234,179,8,0.2)",   dot: "#fbbf24" };
  if (fileType === "code")         return { text: "#c084fc", bg: "rgba(147,51,234,0.12)",  border: "rgba(168,85,247,0.2)",  dot: "#c084fc" };
  if (fileType === "pdf")          return { text: "#fca5a5", bg: "rgba(220,38,38,0.12)",   border: "rgba(239,68,68,0.25)",  dot: "#ef4444" };
  if (fileType === "presentation") return { text: "#fdba74", bg: "rgba(234,88,12,0.12)",   border: "rgba(249,115,22,0.25)", dot: "#f97316" };
  return                                  { text: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.15)", dot: "#94a3b8" };
}

// Known label → color map for "Other" custom types
const LABEL_ACCENT_MAP: Record<string, Accent> = {
  // Pre-defined dropdown types (by label)
  DOCX: { text: "#93c5fd", bg: "rgba(37,99,235,0.12)",   border: "rgba(59,130,246,0.2)",  dot: "#3b82f6" },
  XLSX: { text: "#86efac", bg: "rgba(22,163,74,0.12)",   border: "rgba(34,197,94,0.2)",   dot: "#22c55e" },
  PNG:  { text: "#fbbf24", bg: "rgba(234,179,8,0.12)",   border: "rgba(234,179,8,0.2)",   dot: "#fbbf24" },
  JPG:  { text: "#fbbf24", bg: "rgba(234,179,8,0.12)",   border: "rgba(234,179,8,0.2)",   dot: "#fbbf24" },
  JPEG: { text: "#fbbf24", bg: "rgba(234,179,8,0.12)",   border: "rgba(234,179,8,0.2)",   dot: "#fbbf24" },
  MD:   { text: "#c084fc", bg: "rgba(147,51,234,0.12)",  border: "rgba(168,85,247,0.2)",  dot: "#c084fc" },
  PDF:  { text: "#fca5a5", bg: "rgba(220,38,38,0.12)",   border: "rgba(239,68,68,0.25)",  dot: "#ef4444" },
  PPT:  { text: "#fdba74", bg: "rgba(234,88,12,0.12)",   border: "rgba(249,115,22,0.25)", dot: "#f97316" },
  PPTX: { text: "#fdba74", bg: "rgba(234,88,12,0.12)",   border: "rgba(249,115,22,0.25)", dot: "#f97316" },
  CSV:  { text: "#6ee7b7", bg: "rgba(5,150,105,0.12)",   border: "rgba(16,185,129,0.25)",  dot: "#10b981" },
  TXT:  { text: "#d1d5db", bg: "rgba(156,163,175,0.1)",  border: "rgba(156,163,175,0.2)",  dot: "#9ca3af" },
  ZIP:  { text: "#fde68a", bg: "rgba(217,119,6,0.12)",   border: "rgba(245,158,11,0.25)",  dot: "#f59e0b" },
  RAR:  { text: "#fde68a", bg: "rgba(217,119,6,0.12)",   border: "rgba(245,158,11,0.25)",  dot: "#f59e0b" },
  MP4:  { text: "#a78bfa", bg: "rgba(109,40,217,0.12)",  border: "rgba(139,92,246,0.25)",  dot: "#8b5cf6" },
  MP3:  { text: "#f9a8d4", bg: "rgba(219,39,119,0.12)",  border: "rgba(236,72,153,0.25)",  dot: "#ec4899" },
  HTML: { text: "#86efac", bg: "rgba(22,163,74,0.12)",   border: "rgba(34,197,94,0.2)",    dot: "#22c55e" },
  JSON: { text: "#93c5fd", bg: "rgba(37,99,235,0.12)",   border: "rgba(59,130,246,0.2)",   dot: "#3b82f6" },
  XML:  { text: "#6ee7b7", bg: "rgba(5,150,105,0.12)",   border: "rgba(16,185,129,0.25)",  dot: "#10b981" },
};

// Palette for truly unknown types — assigned by hashing the label string
const FALLBACK_PALETTE: Accent[] = [
  { text: "#93c5fd", bg: "rgba(37,99,235,0.12)",   border: "rgba(59,130,246,0.2)",  dot: "#3b82f6" },
  { text: "#86efac", bg: "rgba(22,163,74,0.12)",   border: "rgba(34,197,94,0.2)",   dot: "#22c55e" },
  { text: "#fbbf24", bg: "rgba(234,179,8,0.12)",   border: "rgba(234,179,8,0.2)",   dot: "#fbbf24" },
  { text: "#c084fc", bg: "rgba(147,51,234,0.12)",  border: "rgba(168,85,247,0.2)",  dot: "#c084fc" },
  { text: "#fca5a5", bg: "rgba(220,38,38,0.12)",   border: "rgba(239,68,68,0.25)",  dot: "#ef4444" },
  { text: "#fdba74", bg: "rgba(234,88,12,0.12)",   border: "rgba(249,115,22,0.25)", dot: "#f97316" },
  { text: "#6ee7b7", bg: "rgba(5,150,105,0.12)",   border: "rgba(16,185,129,0.25)", dot: "#10b981" },
  { text: "#f9a8d4", bg: "rgba(219,39,119,0.12)",  border: "rgba(236,72,153,0.25)", dot: "#ec4899" },
];

function hashLabel(label: string): number {
  return label.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function getAccentByLabel(label?: string): Accent {
  if (!label) return getFileAccent("generic");
  const upper = label.toUpperCase();
  if (LABEL_ACCENT_MAP[upper]) return LABEL_ACCENT_MAP[upper];
  return FALLBACK_PALETTE[hashLabel(upper) % FALLBACK_PALETTE.length];
}

function getIconComponent(fileType?: string) {
  if (fileType === "doc")          return FileText;
  if (fileType === "sheet")        return FileSpreadsheet;
  if (fileType === "image")        return Image;
  if (fileType === "code")         return FileCode;
  if (fileType === "pdf")          return FileText;
  if (fileType === "presentation") return FileText;
  return File;
}

function FileTypeIcon({ fileType, displayLabel, size = 16 }: { fileType?: string; displayLabel?: string; size?: number }) {
  const Icon = getIconComponent(fileType);
  const accent = fileType === "generic" ? getAccentByLabel(displayLabel) : getFileAccent(fileType);
  return <Icon size={size} color={accent.text} />;
}

function getFileLabel(fileType?: string) {
  if (fileType === "doc")          return "DOCX";
  if (fileType === "sheet")        return "XLSX";
  if (fileType === "image")        return "PNG";
  if (fileType === "code")         return "MD";
  if (fileType === "pdf")          return "PDF";
  if (fileType === "presentation") return "PPT";
  return "FILE";
}

// ── Add Item Modal ────────────────────────────────────────────────────────────
type ModalForm = {
  title: string;
  fileType: FileType | "";
  customFileType: string;
  link: string;
  placement: Placement;
};

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
    placement: "file",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ModalForm, string>>>({});

  const set = (key: keyof ModalForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Partial<Record<keyof ModalForm, string>> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (form.placement !== "folder" && !form.fileType) e.fileType = "File type is required";
    if (form.fileType === "generic" && !form.customFileType.trim()) {
      e.customFileType = "Please specify the document type";
    } else if (form.fileType === "generic" && form.customFileType.trim()) {
      const reserved = ["PDF", "DOCX", "DOC", "XLSX", "XLS", "PNG", "JPG", "JPEG", "MD", "PPT", "PPTX"];
      if (reserved.includes(form.customFileType.trim().toUpperCase())) {
        e.customFileType = `"${form.customFileType.toUpperCase()}" is already a built-in type — please select it from the dropdown instead`;
      }
    }
    if (!form.link.trim()) e.link = "Link is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onAdd(form);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
    background: "#1e3a5f",
    colorScheme: "dark" as any,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
    display: "block",
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 11,
    color: "#f87171",
    marginTop: 4,
  };

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Modal box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          borderRadius: 16,
          background: "#1a2f52",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Plus size={15} color="#818cf8" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Add New Item</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.4)", transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#e4a0a0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Placement dropdown — first so user picks context */}
          <div>
            <label style={labelStyle}>Add to</label>
            <select
              value={form.placement}
              onChange={(e) => set("placement", e.target.value)}
              style={selectStyle}
            >
              <option value="pinned">📌 Pinned</option>
              <option value="folder">📁 Folder</option>
              <option value="file">📄 File</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              placeholder={form.placement === "folder" ? "e.g. HR Documents" : "e.g. Budget 2026.xlsx"}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
            />
            {errors.title && <p style={errorStyle}>{errors.title}</p>}
          </div>

          {/* File Type — hidden for folder */}
          {form.placement !== "folder" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={labelStyle}>File Type</label>
                <select
                  value={form.fileType}
                  onChange={(e) => set("fileType", e.target.value)}
                  style={selectStyle}
                >
                <option value="">— Select file type —</option>
                <option value="pdf">PDF — PDF Document</option>
                <option value="doc">DOCX — Word Document</option>
                <option value="sheet">XLSX — Spreadsheet</option>
                <option value="image">PNG / JPG — Image</option>
                <option value="presentation">PPT / PPTX — Presentation</option>
                <option value="code">MD — Markdown / Code</option>
                <option value="generic">Other</option>
                </select>
                {errors.fileType && <p style={errorStyle}>{errors.fileType}</p>}
              </div>

              {/* Custom file type input — shown only when Other is selected */}
              {form.fileType === "generic" && (
                <div>
                  <label style={labelStyle}>Specify Document Type</label>
                  <input
                    type="text"
                    placeholder="e.g. ZIP, PPTX, CSV..."
                    value={form.customFileType}
                    onChange={(e) => set("customFileType", e.target.value.toUpperCase())}
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                  />
                  {errors.customFileType && <p style={errorStyle}>{errors.customFileType}</p>}
                </div>
              )}
            </div>
          )}

          {/* Link */}
          <div>
            <label style={labelStyle}>Link / URL</label>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                pointerEvents: "none",
              }}>
                <Link size={13} color="rgba(255,255,255,0.3)" />
              </div>
              <input
                type="url"
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
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 8, justifyContent: "flex-end",
          padding: "14px 20px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
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

// ── File Explorer ─────────────────────────────────────────────────────────────
function FileExplorer({ items, onDelete }: { items: ExplorerItem[]; onDelete: (id: string) => void }) {
  const [stack, setStack] = useState<{ label: string; items: ExplorerItem[] }[]>([
    { label: "Folder", items },
  ]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Keep root in sync when items prop changes
  useEffect(() => {
    setStack((s) => {
      const next = [...s];
      next[0] = { label: "Root", items };
      return next;
    });
  }, [items]);

  const current = stack[stack.length - 1];
  const folders = current.items.filter((i) => i.type === "folder");
  const files   = current.items.filter((i) => i.type === "file");

  const openFolder = (item: ExplorerItem) => {
    if (item.children) setStack((s) => [...s, { label: item.name, items: item.children! }]);
  };

  const goBack = () => setStack((s) => s.slice(0, -1));

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {stack.length > 1 && (
          <button
            onClick={goBack}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
              borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          >
            <ChevronLeft size={12} /> Back
          </button>
        )}
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

      {/* Folders */}
      {folders.length > 0 && (
        <>
          <p style={{ margin: "0 0 8px 0", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Folders</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
            {folders.map((folder) => {
              const isHovered = hoveredId === folder.id;
              return (
                <div
                  key={folder.id}
                  onMouseEnter={() => setHoveredId(folder.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: "flex", flexDirection: "column", gap: 12, padding: "18px 16px",
                    borderRadius: 12, transition: "all 0.18s ease", position: "relative",
                    border: `1px solid ${isHovered ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.07)"}`,
                    background: isHovered ? "rgba(251,191,36,0.07)" : "rgba(255,255,255,0.03)",
                    transform: isHovered ? "translateY(-2px)" : "none",
                    boxShadow: isHovered ? "0 8px 24px rgba(0,0,0,0.25)" : "none",
                  }}
                >
                  {/* Delete button */}
                  {isHovered && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
                      style={{
                        position: "absolute", top: 8, right: 8,
                        width: 24, height: 24, borderRadius: 6,
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
                  <div
                    onClick={() => openFolder(folder)}
                    style={{ display: "flex", flexDirection: "column", gap: 12, cursor: "pointer" }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: isHovered ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.08)",
                      border: `1px solid ${isHovered ? "rgba(251,191,36,0.35)" : "rgba(251,191,36,0.15)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s ease",
                    }}>
                      <Folder size={22} color="#fbbf24" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {folder.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Files */}
      {files.length > 0 && (
        <>
          <p style={{ margin: "0 0 8px 0", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Files</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
            {files.map((file) => {
              const isHovered = hoveredId === file.id;
              const accent = file.fileType === "generic"
                ? getAccentByLabel(file.displayLabel)
                : getFileAccent(file.fileType);
              return (
                <div
                  key={file.id}
                  onMouseEnter={() => setHoveredId(file.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                    borderRadius: 12, transition: "all 0.18s ease", position: "relative",
                    border: `1px solid ${isHovered ? accent.border : "rgba(255,255,255,0.07)"}`,
                    background: isHovered ? accent.bg : "rgba(255,255,255,0.03)",
                    transform: isHovered ? "translateY(-2px)" : "none",
                    boxShadow: isHovered ? "0 8px 24px rgba(0,0,0,0.25)" : "none",
                  }}
                >
                  <a
                    href={file.url || "#"}
                    target={file.url && file.url !== "#" ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", flex: 1, minWidth: 0 }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0, background: accent.bg, border: `1px solid ${accent.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileTypeIcon fileType={file.fileType} displayLabel={file.displayLabel} size={18} />
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
                        {file.displayLabel || getFileLabel(file.fileType)}
                      </span>
                    </div>
                  </a>
                  {isHovered && (
                    <button
                      onClick={() => onDelete(file.id)}
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [username, setUsername] = useState("User");

  // ── Persistent state via localStorage ──
  const [pinnedFiles, setPinnedFiles] = useState<PinnedFile[]>(() => {
    try {
      const saved = localStorage.getItem("home_pinned");
      if (saved) {
        const parsed = JSON.parse(saved) as Array<Omit<PinnedFile, "icon"> & { iconType?: string }>;
        return parsed.map((f) => ({
          ...f,
          icon: getIconComponent(f.iconType),
          accent: getFileAccent(f.iconType),
        }));
      }
    } catch {}
    return initialPinned;
  });

  const [explorerItems, setExplorerItems] = useState<ExplorerItem[]>(() => {
    try {
      const saved = localStorage.getItem("home_explorer");
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialExplorer;
  });

  const [hovered, setHovered] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("displayName");
    if (stored) setUsername(stored);
  }, []);

  // Save pinned files to localStorage (store iconType instead of component)
  useEffect(() => {
    try {
      const serializable = pinnedFiles.map(({ icon, ...rest }) => ({
        ...rest,
        iconType: Object.entries({
          doc: FileText, sheet: FileSpreadsheet, image: Image, code: FileCode,
        }).find(([, v]) => v === icon)?.[0] ?? "generic",
      }));
      localStorage.setItem("home_pinned", JSON.stringify(serializable));
    } catch {}
  }, [pinnedFiles]);

  // Save explorer items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("home_explorer", JSON.stringify(explorerItems));
    } catch {}
  }, [explorerItems]);

  const handleAdd = (form: ModalForm) => {
    const id = Date.now().toString();

    if (form.placement === "pinned") {
      const accent = getFileAccent(form.fileType || undefined);
      const IconComp = getIconComponent(form.fileType || undefined);
      const newPinned: PinnedFile = {
        id: Date.now(),
        title: form.title,
        type: form.fileType === "generic" && form.customFileType ? form.customFileType : getFileLabel(form.fileType || undefined),
        icon: IconComp,
        accent: { ...accent },
        url: form.link,
      };
      setPinnedFiles((p) => [...p, newPinned]);
    } else if (form.placement === "folder") {
      const newFolder: ExplorerItem = {
        id, name: form.title, type: "folder", itemCount: 0, children: [], url: form.link,
      };
      setExplorerItems((items) => [...items, newFolder]);
    } else {
      const newFile: ExplorerItem = {
        id,
        name: form.title,
        type: "file",
        fileType: form.fileType as FileType || "generic",
        displayLabel: form.fileType === "generic" && form.customFileType ? form.customFileType : getFileLabel(form.fileType || undefined),
        url: form.link,
      };
      setExplorerItems((items) => [...items, newFile]);
    }

    setShowModal(false);
  };

  return (
    <div style={styles.page}>

      {/* Modal */}
      {showModal && <AddItemModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={styles.greeting}>
          Welcome back, <span style={{ fontSize: 40, color: "#818cf8" }}>{username}</span>
        </h1>
        <p style={styles.greetingSub}>Quick access to your frequently used documents</p>
      </div>

      {/* Pinned Files */}
      <p style={styles.sectionLabel}>Pinned Files</p>
      <div style={{ ...styles.grid, marginBottom: 36 }}>
        {pinnedFiles.map((file) => {
          const Icon = file.icon;
          const isHovered = hovered === file.id;
          return (
            <div
              key={file.id}
              onMouseEnter={() => setHovered(file.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                ...styles.card,
                position: "relative",
                background: isHovered ? file.accent.bg : "rgba(255,255,255,0.03)",
                borderColor: isHovered ? file.accent.border : "rgba(255,255,255,0.07)",
                transform: isHovered ? "translateY(-2px)" : "none",
                boxShadow: isHovered ? "0 8px 24px rgba(0,0,0,0.25)" : "none",
              }}
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
                    {file.type}
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

      {/* File Explorer */}
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
};