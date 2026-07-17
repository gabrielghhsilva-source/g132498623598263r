import { useState } from "react";
import { FileText, Plus, Trash2, Clock } from "lucide-react";
import { useDocsStore } from "@/hooks/useDocsStore";
import { DocsEditor } from "./DocsEditor";

export function DocsPage() {
  const { docs, templates, createDoc, updateDoc, deleteDoc, addTemplate, deleteTemplate } = useDocsStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = docs.find(d => d.id === openId);

  if (open) {
    return (
      <DocsEditor
        doc={open}
        templates={templates}
        onSave={(patch) => updateDoc(open.id, patch)}
        onBack={() => setOpenId(null)}
        onAddTemplate={addTemplate}
        onDeleteTemplate={deleteTemplate}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" /> Meus documentos
        </h3>
        <button
          onClick={() => { const d = createDoc(); setOpenId(d.id); }}
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Novo
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
          Nenhum documento ainda. Crie o primeiro pra começar a escrever.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {docs.map(d => {
            const preview = (d.html || "").replace(/<[^>]*>/g, " ").trim().slice(0, 90);
            return (
              <div key={d.id} className="border border-border rounded-lg p-3 bg-card hover:border-primary/40 transition-colors group">
                <button onClick={() => setOpenId(d.id)} className="text-left w-full">
                  <div className="font-medium text-sm truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2.4em]">
                    {preview || "(vazio)"}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(d.updatedAt).toLocaleString("pt-BR")}
                    {d.images.length > 0 && <span className="ml-1">• {d.images.length} img</span>}
                  </div>
                </button>
                <button
                  onClick={() => { if (confirm(`Excluir "${d.name}"?`)) deleteDoc(d.id); }}
                  className="mt-2 text-[10px] text-destructive/70 hover:text-destructive flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3 h-3" /> excluir
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
