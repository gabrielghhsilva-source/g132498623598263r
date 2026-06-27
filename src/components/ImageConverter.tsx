import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { Upload, Download, Image as ImageIcon, X, Loader2, ShieldCheck, Archive } from "lucide-react";

type OutFormat =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/avif"
  | "image/bmp";

interface ConvertedItem {
  id: string;
  originalName: string;
  originalSize: number;
  convertedSize: number;
  convertedUrl: string;
  outFormat: OutFormat;
  previewUrl: string;
}

const FORMAT_LABEL: Record<OutFormat, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/bmp": "BMP",
};
const FORMAT_EXT: Record<OutFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/bmp": "bmp",
};
const LOSSLESS: OutFormat[] = ["image/png", "image/bmp"];

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

// Detect which output MIME types the current browser can encode via canvas.
async function detectSupport(): Promise<Record<OutFormat, boolean>> {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  const formats: OutFormat[] = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/avif",
    "image/bmp",
  ];
  const result = {} as Record<OutFormat, boolean>;
  await Promise.all(
    formats.map(
      (f) =>
        new Promise<void>((resolve) => {
          try {
            canvas.toBlob(
              (b) => {
                result[f] = !!b && b.type === f;
                resolve();
              },
              f,
              0.9,
            );
          } catch {
            result[f] = false;
            resolve();
          }
        }),
    ),
  );
  // PNG is always available; ensure baseline.
  result["image/png"] = true;
  result["image/jpeg"] = result["image/jpeg"] ?? true;
  return result;
}

async function convertFile(file: File, outFormat: OutFormat, quality: number, maxDim: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (maxDim > 0 && (w > maxDim || h > maxDim)) {
      const ratio = w / h;
      if (w >= h) { w = maxDim; h = Math.round(maxDim / ratio); }
      else { h = maxDim; w = Math.round(maxDim * ratio); }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    if (outFormat === "image/jpeg" || outFormat === "image/bmp") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Falha ao converter (formato não suportado pelo navegador)"))),
        outFormat,
        LOSSLESS.includes(outFormat) ? undefined : quality,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ImageConverter() {
  const [outFormat, setOutFormat] = useState<OutFormat>("image/webp");
  const [quality, setQuality] = useState(0.9);
  const [maxDim, setMaxDim] = useState(0); // 0 = sem redimensionar
  const [items, setItems] = useState<ConvertedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [support, setSupport] = useState<Record<OutFormat, boolean> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    detectSupport().then(setSupport);
  }, []);


  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setBusy(true);
    try {
      const out: ConvertedItem[] = [];
      for (const f of arr) {
        try {
          const blob = await convertFile(f, outFormat, quality, maxDim);
          const convertedUrl = URL.createObjectURL(blob);
          out.push({
            id: crypto.randomUUID(),
            originalName: f.name,
            originalSize: f.size,
            convertedSize: blob.size,
            convertedUrl,
            outFormat,
            previewUrl: convertedUrl,
          });
        } catch (e) {
          console.error("Falha em", f.name, e);
        }
      }
      setItems(prev => [...out, ...prev]);
    } finally {
      setBusy(false);
    }
  };

  const downloadOne = (it: ConvertedItem) => {
    const base = it.originalName.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = it.convertedUrl;
    a.download = `${base}.${FORMAT_EXT[it.outFormat]}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const target = prev.find(p => p.id === id);
      if (target) URL.revokeObjectURL(target.convertedUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach(it => URL.revokeObjectURL(it.convertedUrl));
    setItems([]);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">Conversor de Imagens</h2>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
          <ShieldCheck className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
          <span>
            100% local: as imagens são processadas no seu navegador e
            <strong className="text-foreground"> nunca são enviadas para nenhum servidor</strong>.
          </span>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Formato de saída
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {(Object.keys(FORMAT_LABEL) as OutFormat[]).map(f => {
              const supported = support ? support[f] : true;
              return (
                <button
                  key={f}
                  onClick={() => supported && setOutFormat(f)}
                  disabled={!supported}
                  title={supported ? FORMAT_LABEL[f] : `${FORMAT_LABEL[f]} não suportado neste navegador`}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors border ${
                    outFormat === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:bg-accent"
                  } ${!supported ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                >
                  {FORMAT_LABEL[f]}
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex justify-between">
              <span>Qualidade</span>
              <span className="tabular-nums text-foreground">
                {LOSSLESS.includes(outFormat) ? "sem perdas" : `${Math.round(quality * 100)}%`}
              </span>
            </label>
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={quality}
              disabled={LOSSLESS.includes(outFormat)}
              onChange={e => setQuality(parseFloat(e.target.value))}
              className="mt-3 w-full accent-primary disabled:opacity-50"
            />
          </div>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
          {busy ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Convertendo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium">
                Clique ou arraste imagens para converter
              </span>
              <span className="text-xs">PNG · JPG · WebP · GIF · BMP</span>
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="bg-card border border-border rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/80">
              Resultados ({items.length})
            </h3>
            <button
              onClick={clearAll}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive"
            >
              Limpar tudo
            </button>
          </div>
          <div className="divide-y divide-border">
            {items.map(it => {
              const diff = it.convertedSize - it.originalSize;
              const pct = (diff / it.originalSize) * 100;
              return (
                <div key={it.id} className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={it.previewUrl}
                    alt={it.originalName}
                    className="w-12 h-12 rounded object-cover border border-border bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{it.originalName}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatBytes(it.originalSize)} → {formatBytes(it.convertedSize)}{" "}
                      <span className={diff <= 0 ? "text-success" : "text-warning"}>
                        ({diff <= 0 ? "" : "+"}{pct.toFixed(0)}%)
                      </span>{" "}
                      · {FORMAT_LABEL[it.outFormat]}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadOne(it)}
                    className="p-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                    title="Baixar"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(it.id)}
                    className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent"
                    title="Remover"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
