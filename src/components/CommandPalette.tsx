import { useEffect, useMemo, useRef, useState } from "react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { TaskArea, AppTab } from "@/lib/types";
import { Plus, CheckCircle2, Trash2, ListTodo, LayoutDashboard, Wrench, Download, Upload, Undo2, Search } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  areas: TaskArea[];
  onCreateTask: () => void;
  onJumpToTask: (areaId: string, taskId: string) => void;
  onMarkDone: (areaId: string, taskId: string) => void;
  onDeleteTask: (areaId: string, taskId: string) => void;
  onChangeTab: (tab: AppTab) => void;
  onExport: () => void;
  onImport: () => void;
  onUndo: () => void;
}

export function CommandPalette({
  open, onOpenChange, areas,
  onCreateTask, onJumpToTask, onMarkDone, onDeleteTask, onChangeTab, onExport, onImport, onUndo,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setQuery(""); }, [open]);

  const flatTasks = useMemo(
    () => areas.flatMap(a => a.tasks.filter(t => t.status !== "done").map(t => ({ task: t, area: a }))),
    [areas]
  );

  const run = (fn: () => void) => { onOpenChange(false); setTimeout(fn, 0); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput ref={inputRef} placeholder="Buscar tarefa, comando, área..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        <CommandGroup heading="Ações">
          <CommandItem onSelect={() => run(onCreateTask)}>
            <Plus className="mr-2" /> Nova tarefa <kbd className="ml-auto text-[10px] opacity-60">N</kbd>
          </CommandItem>
          <CommandItem onSelect={() => run(onUndo)}>
            <Undo2 className="mr-2" /> Desfazer última exclusão <kbd className="ml-auto text-[10px] opacity-60">Ctrl+Z</kbd>
          </CommandItem>
          <CommandItem onSelect={() => run(onExport)}>
            <Download className="mr-2" /> Exportar backup (.json)
          </CommandItem>
          <CommandItem onSelect={() => run(onImport)}>
            <Upload className="mr-2" /> Importar backup (.json)
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navegar">
          <CommandItem onSelect={() => run(() => onChangeTab("tasks"))}>
            <ListTodo className="mr-2" /> Minhas Tarefas
          </CommandItem>
          <CommandItem onSelect={() => run(() => onChangeTab("menu"))}>
            <LayoutDashboard className="mr-2" /> Menu
          </CommandItem>
          <CommandItem onSelect={() => run(() => onChangeTab("tools"))}>
            <Wrench className="mr-2" /> Ferramentas
          </CommandItem>
        </CommandGroup>

        {flatTasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Tarefas (${flatTasks.length})`}>
              {flatTasks.slice(0, 50).map(({ task, area }) => (
                <CommandItem
                  key={task.id}
                  value={`${task.text} ${area.name}`}
                  onSelect={() => run(() => onJumpToTask(area.id, task.id))}
                >
                  <Search className="mr-2 opacity-60" />
                  <span className="truncate">{task.text || "Sem título"}</span>
                  <span className="ml-2 text-[10px] opacity-60">{area.icon} {area.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); run(() => onMarkDone(area.id, task.id)); }}
                    className="ml-auto p-1 rounded hover:bg-accent"
                    title="Concluir"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); run(() => onDeleteTask(area.id, task.id)); }}
                    className="p-1 rounded hover:bg-destructive/20 text-destructive"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
