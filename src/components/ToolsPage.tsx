import { useState } from "react";
import { ImageIcon, QrCode } from "lucide-react";
import { ImageConverter } from "@/components/ImageConverter";
import { QRCodeTool } from "@/components/QRCodeTool";

type Tool = "image" | "qr";

const TABS: { id: Tool; label: string; icon: typeof ImageIcon }[] = [
  { id: "image", label: "Imagem", icon: ImageIcon },
  { id: "qr",    label: "QR Code", icon: QrCode },
];

export function ToolsPage() {
  const [tool, setTool] = useState<Tool>("image");

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg shadow-sm p-1.5 flex gap-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold rounded-md transition-colors uppercase tracking-wide min-w-0 ${
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>
      {tool === "image" && <ImageConverter />}
      {tool === "qr" && <QRCodeTool />}
    </div>
  );
}
