import { useState, useEffect, useCallback, useRef } from "react";
import { Task, TaskArea, TaskTag, TaskStatus, TaskTextStyle, TaskPriority } from "@/lib/types";
import { AddTaskInput } from "@/lib/taskOperations";
import { KanbanColumn } from "./KanbanColumn";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { QuickAddDialog } from "./QuickAddDialog";
import { Plus, Keyboard } from "lucide-react";

const DEFAULT_AREA_IDS = ["work", "games", "leisure", "home", "investments"];

interface Props {
  areas: TaskArea[];
  tags: TaskTag[];
  timezone: string;
  onAddTaskFull: (areaId: string, input: AddTaskInput) => void;
  onAddTaskQuick: (areaId: string, text: string) => void;
  onUpdateText: (areaId: string, taskId: string, text: string) => void;
  onUpdateStatus: (areaId: string, taskId: string, s: TaskStatus) => void;
  onUpdateStyle: (areaId: string, taskId: string, s: Partial<TaskTextStyle>) => void;
  onUpdateTime: (areaId: string, taskId: string, time: string | undefined, date?: string) => void;
  onUpdatePriority: (areaId: string, taskId: string, p: TaskPriority) => void;
  onUpdateTags: (areaId: string, taskId: string, ids: string[]) => void;
  onMoveTask: (fromAreaId: string, toAreaId: string, taskId: string, toIndex?: number) => void;
  onDeleteTask: (areaId: string, taskId: string) => void;
  onDeleteArea: (areaId: string) => void;
  onAddSubtask: (areaId: string, taskId: string, text: string) => void;
  onToggleSubtask: (areaId: string, taskId: string, subId: string) => void;
  onDeleteSubtask: (areaId: string, taskId: string, subId: string) => void;
  onUpdateSubtaskText: (areaId: string, taskId: string, subId: string, text: string) => void;
  onAddComment: (areaId: string, taskId: string, text: string) => void;
  onDeleteComment: (areaId: string, taskId: string, commentId: string) => void;
  onAddTag: (name: string, color: string) => TaskTag;
  onDeleteTag: (id: string) => void;
  onAddArea: () => void;
}

export function KanbanBoard(props: Props) {
  const { areas, tags, timezone } = props;
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragFromAreaId, setDragFromAreaId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const [openDetail, setOpenDetail] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Global Shift+wheel → horizontal scroll on the board (works anywhere on the page)
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const el = boardRef.current;
      if (!el) return;
      if (!e.shiftKey) return;
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      el.scrollBy({ left: delta, behavior: "auto" });
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  // Click-and-drag panning on board background (grab empty space to pan horizontally)
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      // Only left button, and only when grabbing the board background itself
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      // Only initiate panning when clicking the board container directly (not a column or its contents)
      if (target !== el) return;
      isDown = true;
      startX = e.pageX;
      startScrollLeft = el.scrollLeft;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      el.scrollLeft = startScrollLeft - (e.pageX - startX);
    };
    const stop = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = "";
      el.style.userSelect = "";
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("mouseleave", stop);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("mouseleave", stop);
    };
  }, []);


  // Keyboard shortcut: N opens quick add
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;
      if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Re-resolve selected task whenever areas change
  const selectedArea = areas.find(a => a.id === selectedAreaId);
  const selectedTask: Task | null = selectedArea?.tasks.find(t => t.id === selectedTaskId) || null;

  const handleDragStart = useCallback((taskId: string, fromAreaId: string) => {
    setDraggingTaskId(taskId);
    setDragFromAreaId(fromAreaId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingTaskId(null);
    setDragFromAreaId(null);
    setDragOverColumnId(null);
  }, []);

  const handleDropOnColumn = useCallback((toAreaId: string) => {
    if (!draggingTaskId || !dragFromAreaId) return;
    if (dragFromAreaId !== toAreaId) {
      props.onMoveTask(dragFromAreaId, toAreaId, draggingTaskId);
    }
    setDraggingTaskId(null);
    setDragFromAreaId(null);
    setDragOverColumnId(null);
  }, [draggingTaskId, dragFromAreaId, props]);

  const openTaskDetail = (areaId: string, task: Task) => {
    setSelectedAreaId(areaId);
    setSelectedTaskId(task.id);
    setOpenDetail(true);
  };

  const handleMoveSelected = (toAreaId: string) => {
    if (!selectedTaskId || !selectedAreaId || selectedAreaId === toAreaId) return;
    props.onMoveTask(selectedAreaId, toAreaId, selectedTaskId);
    setSelectedAreaId(toAreaId);
  };

  const areaOptions = areas.map(a => ({ id: a.id, name: a.name, icon: a.icon }));

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => setQuickAddOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nova tarefa
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-primary-foreground/20 text-[10px]">N</kbd>
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Keyboard className="w-3 h-3" />
          Aperte <kbd className="px-1 py-0.5 rounded bg-secondary text-foreground">N</kbd> em qualquer lugar pra criar
        </div>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="flex gap-3 overflow-x-auto no-scrollbar pb-3 -mx-3 px-3 sm:-mx-6 sm:px-6 snap-x snap-proximity cursor-grab"
        data-testid="kanban-board"
      >
        {areas.map(area => (
          <div key={area.id} className="snap-start">
            <KanbanColumn
              area={area}
              tags={tags}
              timezone={timezone}
              isCustom={!DEFAULT_AREA_IDS.includes(area.id)}
              draggingTaskId={draggingTaskId}
              dragOverColumnId={dragOverColumnId}
              onTaskClick={(t) => openTaskDetail(area.id, t)}
              onQuickAdd={(text) => props.onAddTaskQuick(area.id, text)}
              onQuickToggleDone={(taskId) => {
                const t = area.tasks.find(x => x.id === taskId);
                if (!t) return;
                props.onUpdateStatus(area.id, taskId, t.status === "done" ? "todo" : "done");
              }}
              onDeleteArea={() => props.onDeleteArea(area.id)}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverColumn={() => setDragOverColumnId(area.id)}
              onDropOnColumn={() => handleDropOnColumn(area.id)}
            />
          </div>
        ))}

        {/* Add column */}
        <div className="snap-start">
          <button
            onClick={props.onAddArea}
            className="flex flex-col items-center justify-center gap-2 w-72 sm:w-80 h-32 flex-shrink-0 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Nova área</span>
          </button>
        </div>
      </div>

      {/* Quick add dialog */}
      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        areas={areaOptions}
        defaultAreaId={selectedAreaId || areas[0]?.id}
        tags={tags}
        onSubmit={props.onAddTaskFull}
        onAddTag={props.onAddTag}
        onDeleteTag={props.onDeleteTag}
      />

      {/* Detail dialog */}
      {selectedTask && selectedAreaId && (
        <TaskDetailDialog
          open={openDetail}
          onOpenChange={setOpenDetail}
          task={selectedTask}
          areaId={selectedAreaId}
          areas={areaOptions}
          tags={tags}
          onUpdateText={(t) => props.onUpdateText(selectedAreaId, selectedTask.id, t)}
          onUpdateStatus={(s) => props.onUpdateStatus(selectedAreaId, selectedTask.id, s)}
          onUpdateStyle={(s) => props.onUpdateStyle(selectedAreaId, selectedTask.id, s)}
          onUpdateTime={(time, date) => props.onUpdateTime(selectedAreaId, selectedTask.id, time, date)}
          onUpdateDate={(date) => props.onUpdateTime(selectedAreaId, selectedTask.id, selectedTask.dueTime, date || "")}
          onUpdatePriority={(p) => props.onUpdatePriority(selectedAreaId, selectedTask.id, p)}
          onUpdateTags={(ids) => props.onUpdateTags(selectedAreaId, selectedTask.id, ids)}
          onAddTag={props.onAddTag}
          onDeleteTag={props.onDeleteTag}
          onAddSubtask={(text) => props.onAddSubtask(selectedAreaId, selectedTask.id, text)}
          onToggleSubtask={(id) => props.onToggleSubtask(selectedAreaId, selectedTask.id, id)}
          onDeleteSubtask={(id) => props.onDeleteSubtask(selectedAreaId, selectedTask.id, id)}
          onUpdateSubtaskText={(id, text) => props.onUpdateSubtaskText(selectedAreaId, selectedTask.id, id, text)}
          onAddComment={(text) => props.onAddComment(selectedAreaId, selectedTask.id, text)}
          onDeleteComment={(id) => props.onDeleteComment(selectedAreaId, selectedTask.id, id)}
          onMove={handleMoveSelected}
          onDelete={() => props.onDeleteTask(selectedAreaId, selectedTask.id)}
        />
      )}
    </div>
  );
}
