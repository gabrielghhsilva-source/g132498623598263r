import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";

export function QRCodeTool() {
  const [text, setText] = useState("");
  const [size, setSize] = useState(512);
  const [fg, setFg] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!text.trim()) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }
    QRCode.toCanvas(canvasRef.current, text, {
      width: size,
      margin: 2,
      color: { dark: fg, light: bg },
      errorCorrectionLevel: "M",
    }).catch(() => {});
  }, [text, size, fg, bg]);

  const download = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = `qrcode-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">Gerador de QR Code</h2>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Cole um texto, URL, Wi-Fi (WIFI:T:WPA;S:rede;P:senha;;), telefone..."
          rows={3}
          className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary resize-none"
        />
        <div className="grid grid-cols-3 gap-3">
          <label className="text-xs space-y-1">
            <span className="font-semibold text-muted-foreground uppercase tracking-wide">Tamanho</span>
            <select value={size} onChange={e => setSize(parseInt(e.target.value))} className="w-full bg-muted/40 border border-border rounded-md px-2 py-1.5 text-sm">
              <option value={256}>256 px</option>
              <option value={512}>512 px</option>
              <option value={1024}>1024 px</option>
            </select>
          </label>
          <label className="text-xs space-y-1">
            <span className="font-semibold text-muted-foreground uppercase tracking-wide">Frente</span>
            <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="w-full h-9 rounded-md cursor-pointer bg-transparent" />
          </label>
          <label className="text-xs space-y-1">
            <span className="font-semibold text-muted-foreground uppercase tracking-wide">Fundo</span>
            <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="w-full h-9 rounded-md cursor-pointer bg-transparent" />
          </label>
        </div>
        <div className="flex flex-col items-center gap-3 pt-2">
          <canvas ref={canvasRef} width={size} height={size} className="max-w-[260px] w-full h-auto border border-border rounded-md bg-white" />
          <button
            onClick={download}
            disabled={!text.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Baixar PNG
          </button>
        </div>
      </div>
    </div>
  );
}
