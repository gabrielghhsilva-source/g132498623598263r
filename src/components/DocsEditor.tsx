import { useEffect, useRef, useState, useCallback } from "react";
import DOMPurify from "dompurify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Bold, Italic, Underline, Type, Palette, ImagePlus, Download, Save,
  ArrowLeft, Trash2, Copy, CheckCircle2, AlertTriangle, FileJson, Layers,
} from "lucide-react";
import { DocPage, DocImage, DocTemplate } from "@/hooks/useDocsStore";

const FONTS = ["Inter", "Arial", "Georgia", "Times New Roman", "Courier New", "Verdana", "Trebuchet MS"];
const SIZES = [10, 12, 14, 16, 18, 22, 28, 36, 48, 64];
const WEIGHTS = ["300", "400", "500", "600", "700", "800"];

const sanitize = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "div", "span", "b", "strong", "i", "em", "u", "br", "h1", "h2", "h3", "ul", "ol", "li", "a", "font"],
    ALLOWED_ATTR: ["style", "href", "target", "face", "size", "color"],
  });

interface Props {
  doc: DocPage;
  templates: DocTemplate[];
  onSave: (patch: Partial<DocPage>) => void;
  onBack: () => void;
  onAddTemplate: (name: string, html: string) => void;
  onDeleteTemplate: (id: string) => void;
}

type DragState =
  | { kind: "move"; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: "resize"; id: string; startX: number; startY: number; origW: number; origH: number; ratio: number }
  | null;

interface Issue { level: "warn" | "error"; msg: string; }

export function DocsEditor({ doc, templates, onSave, onBack, onAddTemplate, onDeleteTemplate }: Props) {
  const [name, setName] = useState(doc.name);
  const [html, setHtml] = useState(doc.html);
  const [images, setImages] = useState<DocImage[]>(doc.images);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [color, setColor] = useState("#111827");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showTplPanel, setShowTplPanel] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const initedRef = useRef(false);

  // Inicializa o innerHTML apenas na abertura do doc.
  useEffect(() => {
    if (editorRef.current && !initedRef.current) {
      editorRef.current.innerHTML = doc.html || "<p>Comece a escrever aqui…</p>";
      initedRef.current = true;
    }
  }, [doc.id, doc.html]);

  // Autosave (debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      onSave({ name, html: sanitize(html), images });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    }, 700);
    return () => clearTimeout(t);
  }, [name, html, images, onSave]);

  // Validação
  useEffect(() => {
    const found: Issue[] = [];
    if (!name.trim()) found.push({ level: "warn", msg: "Documento sem nome." });
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    if (!stripped && images.length === 0) found.push({ level: "warn", msg: "Documento vazio." });
    for (const img of images) {
      if (img.x < 0 || img.y < 0 || img.x + img.w > doc.width || img.y + img.h > doc.height) {
        found.push({ level: "error", msg: `Imagem fora da página (ajustada automaticamente).` });
      }
      if (img.w < 20 || img.h < 20) found.push({ level: "warn", msg: "Imagem muito pequena (<20px)." });
      if (!img.src?.startsWith("data:image")) found.push({ level: "error", msg: "Imagem com fonte inválida." });
    }
    // Tokens não preenchidos
    if (/\{\{[^}]+\}\}/.test(html)) found.push({ level: "warn", msg: "Ainda há campos {{...}} não preenchidos." });
    setIssues(found);
  }, [name, html, images, doc.width, doc.height]);

  // Auto-correção: mantém imagens dentro da página
  useEffect(() => {
    setImages(prev => prev.map(i => ({
      ...i,
      x: Math.max(0, Math.min(i.x, doc.width - i.w)),
      y: Math.max(0, Math.min(i.y, doc.height - i.h)),
      w: Math.min(i.w, doc.width),
      h: Math.min(i.h, doc.height),
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.width, doc.height]);

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    setHtml(editorRef.current?.innerHTML || "");
  };

  const onImageUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const im = new Image();
        im.onload = () => {
          const maxW = doc.width * 0.5;
          const scale = im.width > maxW ? maxW / im.width : 1;
          const w = Math.round(im.width * scale);
          const h = Math.round(im.height * scale);
          setImages(prev => [...prev, {
            id: crypto.randomUUID(),
            type: "image",
            src,
            x: Math.round((doc.width - w) / 2),
            y: 40,
            w, h,
          }]);
        };
        im.src = src;
      };
      reader.readAsDataURL(file);
    });
  };

  const startDrag = (e: React.PointerEvent, kind: "move" | "resize", img: DocImage) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedImg(img.id);
    if (kind === "move") {
      dragRef.current = { kind, id: img.id, startX: e.clientX, startY: e.clientY, origX: img.x, origY: img.y };
    } else {
      dragRef.current = { kind, id: img.id, startX: e.clientX, startY: e.clientY, origW: img.w, origH: img.h, ratio: img.w / img.h };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setImages(prev => prev.map(i => {
      if (i.id !== d.id) return i;
      if (d.kind === "move") {
        return {
          ...i,
          x: Math.max(0, Math.min(doc.width - i.w, d.origX + dx)),
          y: Math.max(0, Math.min(doc.height - i.h, d.origY + dy)),
        };
      }
      const keep = e.shiftKey;
      let w = Math.max(20, d.origW + dx);
      let h = Math.max(20, d.origH + dy);
      if (keep) h = w / d.ratio;
      w = Math.min(w, doc.width - i.x);
      h = Math.min(h, doc.height - i.y);
      return { ...i, w, h };
    }));
  };
  const endDrag = () => { dragRef.current = null; };

  const deleteImage = (id: string) => {
    setImages(prev => prev.filter(i => i.id !== id));
    if (selectedImg === id) setSelectedImg(null);
  };

  const applyTemplate = useCallback((tpl: DocTemplate) => {
    let out = tpl.html;
    for (const p of tpl.placeholders) {
      const v = window.prompt(`Preencher: ${p}`, "");
      if (v != null) out = out.replace(new RegExp(`\\{\\{\\s*${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g"), v);
    }
    const clean = sanitize(out);
    if (editorRef.current) editorRef.current.innerHTML = clean;
    setHtml(clean);
    setShowTplPanel(false);
  }, []);

  const saveAsTemplate = () => {
    const n = window.prompt("Nome do modelo (use {{campo}} para marcar preenchimentos):", name);
    if (!n) return;
    onAddTemplate(n, sanitize(html));
  };

  const exportPDF = async () => {
    setSelectedImg(null);
    await new Promise(r => setTimeout(r, 50));
    if (!pageRef.current) return;
    const canvas = await html2canvas(pageRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const img = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ unit: "px", format: [doc.width, doc.height], compress: true });
    pdf.addImage(img, "JPEG", 0, 0, doc.width, doc.height);
    pdf.save(`${name || "documento"}.pdf`);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ name, html, images, width: doc.width, height: doc.height }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${name || "documento"}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const errors = issues.filter(i => i.level === "error");
  const warns = issues.filter(i => i.level === "warn");

  return (
    <div className="space-y-3">
      {/* header */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-accent" title="Voltar"><ArrowLeft className="w-4 h-4" /></button>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 min-w-40 bg-transparent border-b border-border/60 focus:border-primary outline-none px-1 py-1 text-sm font-medium"
          placeholder="Nome do documento"
        />
        <span className={`text-[10px] flex items-center gap-1 transition-opacity ${savedFlash ? "opacity-100 text-primary" : "opacity-40"}`}>
          <Save className="w-3 h-3" /> salvo
        </span>
        <button onClick={() => setShowTplPanel(v => !v)} className="text-xs px-2 py-1.5 rounded-md border border-border hover:bg-accent flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" /> Modelos ({templates.length})
        </button>
        <button onClick={saveAsTemplate} className="text-xs px-2 py-1.5 rounded-md border border-border hover:bg-accent flex items-center gap-1">
          <Copy className="w-3.5 h-3.5" /> Salvar modelo
        </button>
        <button onClick={exportJSON} className="text-xs px-2 py-1.5 rounded-md border border-border hover:bg-accent flex items-center gap-1">
          <FileJson className="w-3.5 h-3.5" /> JSON
        </button>
        <button
          onClick={exportPDF}
          disabled={errors.length > 0}
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 flex items-center gap-1"
          title={errors.length ? "Corrija os erros antes de baixar" : "Baixar PDF"}
        >
          <Download className="w-3.5 h-3.5" /> PDF
        </button>
      </div>

      {/* validação */}
      {(errors.length > 0 || warns.length > 0) && (
        <div className={`text-xs rounded-md border p-2 ${errors.length ? "border-destructive/50 bg-destructive/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
          <div className="flex items-center gap-1.5 font-medium mb-1">
            {errors.length ? <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> : <CheckCircle2 className="w-3.5 h-3.5 text-yellow-600" />}
            {errors.length ? `${errors.length} erro(s)` : `${warns.length} aviso(s)`}
          </div>
          <ul className="space-y-0.5 pl-4 list-disc">
            {[...errors, ...warns].slice(0, 5).map((i, k) => <li key={k}>{i.msg}</li>)}
          </ul>
        </div>
      )}

      {/* templates panel */}
      {showTplPanel && (
        <div className="border border-border rounded-lg p-2 bg-card/50 space-y-1">
          {templates.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">
              Nenhum modelo salvo. Escreva um documento com marcadores <code>{"{{nome}}"}</code>, <code>{"{{data}}"}</code> etc, e clique em <b>Salvar modelo</b>.
            </p>
          )}
          {templates.map(t => (
            <div key={t.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-accent">
              <button onClick={() => applyTemplate(t)} className="flex-1 text-left truncate">
                <span className="font-medium">{t.name}</span>
                {t.placeholders.length > 0 && <span className="text-muted-foreground ml-2">— {t.placeholders.join(", ")}</span>}
              </button>
              <button onClick={() => onDeleteTemplate(t.id)} className="text-destructive/70 hover:text-destructive p-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-1 border border-border rounded-lg p-1.5 bg-card/60">
        <select onChange={e => exec("fontName", e.target.value)} className="bg-secondary/40 text-xs rounded px-1.5 py-1" defaultValue="">
          <option value="" disabled>Fonte</option>
          {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <select onChange={e => { const px = e.target.value; exec("fontSize", "7"); requestAnimationFrame(() => {
          // após o fontSize=7 (dummy), procura o <font size="7"> mais recente e converte para px real
          if (!editorRef.current) return;
          editorRef.current.querySelectorAll('font[size="7"]').forEach(el => {
            (el as HTMLElement).removeAttribute("size");
            (el as HTMLElement).style.fontSize = `${px}px`;
          });
          setHtml(editorRef.current.innerHTML);
        }); }} className="bg-secondary/40 text-xs rounded px-1.5 py-1" defaultValue="">
          <option value="" disabled>Tam.</option>
          {SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <select onChange={e => {
          const w = e.target.value;
          document.execCommand("styleWithCSS", false, "true");
          exec("fontWeight" as any, w);
          // fallback: envolve seleção
          if (editorRef.current) {
            editorRef.current.querySelectorAll('font').forEach(el => (el as HTMLElement).style.fontWeight ||= w);
            setHtml(editorRef.current.innerHTML);
          }
        }} className="bg-secondary/40 text-xs rounded px-1.5 py-1" defaultValue="">
          <option value="" disabled>Peso</option>
          {WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <div className="w-px h-5 bg-border mx-0.5" />
        <button onClick={() => exec("bold")} className="p-1.5 rounded hover:bg-accent" title="Negrito"><Bold className="w-3.5 h-3.5" /></button>
        <button onClick={() => exec("italic")} className="p-1.5 rounded hover:bg-accent" title="Itálico"><Italic className="w-3.5 h-3.5" /></button>
        <button onClick={() => exec("underline")} className="p-1.5 rounded hover:bg-accent" title="Sublinhado"><Underline className="w-3.5 h-3.5" /></button>
        <div className="w-px h-5 bg-border mx-0.5" />
        <label className="p-1.5 rounded hover:bg-accent cursor-pointer inline-flex items-center gap-1" title="Cor do texto">
          <Palette className="w-3.5 h-3.5" style={{ color }} />
          <input type="color" value={color} onChange={e => { setColor(e.target.value); document.execCommand("styleWithCSS", false, "true"); exec("foreColor", e.target.value); }} className="w-0 h-0 opacity-0 absolute" />
        </label>
        <button onClick={() => exec("formatBlock", "H1")} className="text-xs px-2 py-1 rounded hover:bg-accent" title="Título">H1</button>
        <button onClick={() => exec("formatBlock", "H2")} className="text-xs px-2 py-1 rounded hover:bg-accent" title="Subtítulo">H2</button>
        <button onClick={() => exec("formatBlock", "P")} className="text-xs px-2 py-1 rounded hover:bg-accent" title="Parágrafo"><Type className="w-3.5 h-3.5" /></button>
        <button onClick={() => exec("insertUnorderedList")} className="text-xs px-2 py-1 rounded hover:bg-accent">• Lista</button>
        <button onClick={() => exec("insertOrderedList")} className="text-xs px-2 py-1 rounded hover:bg-accent">1. Lista</button>
        <div className="w-px h-5 bg-border mx-0.5" />
        <label className="text-xs px-2 py-1 rounded hover:bg-accent cursor-pointer inline-flex items-center gap-1">
          <ImagePlus className="w-3.5 h-3.5" /> Imagem
          <input type="file" accept="image/*" multiple className="hidden" onChange={e => { onImageUpload(e.target.files); e.currentTarget.value = ""; }} />
        </label>
      </div>

      {/* página */}
      <div className="overflow-auto bg-muted/30 p-4 rounded-lg border border-border" onClick={() => setSelectedImg(null)}>
        <div
          ref={pageRef}
          className="relative mx-auto bg-white shadow-lg"
          style={{ width: doc.width, minHeight: doc.height }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={e => setHtml((e.target as HTMLDivElement).innerHTML)}
            className="min-h-[1123px] outline-none px-16 py-16 text-[15px] leading-relaxed text-gray-900"
            style={{ fontFamily: "Inter, sans-serif" }}
          />
          {images.map(img => {
            const sel = selectedImg === img.id;
            return (
              <div
                key={img.id}
                className={`absolute group ${sel ? "ring-2 ring-primary" : ""}`}
                style={{ left: img.x, top: img.y, width: img.w, height: img.h, cursor: "move" }}
                onPointerDown={e => startDrag(e, "move", img)}
                onClick={e => { e.stopPropagation(); setSelectedImg(img.id); }}
              >
                <img src={img.src} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none select-none" />
                {sel && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); deleteImage(img.id); }}
                      className="absolute -top-3 -right-3 bg-destructive text-white rounded-full p-1 shadow"
                      title="Remover"
                    ><Trash2 className="w-3 h-3" /></button>
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 bg-primary cursor-se-resize"
                      onPointerDown={e => startDrag(e, "resize", img)}
                      title="Redimensionar (Shift = proporcional)"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Dica: clique em uma imagem para selecioná-la. Arraste o quadradinho no canto para redimensionar (segure Shift pra manter proporção).
      </p>
    </div>
  );
}
