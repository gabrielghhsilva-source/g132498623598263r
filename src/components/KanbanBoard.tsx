import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Task, TaskArea, TaskTag, TaskStatus, TaskTextStyle, TaskPriority, TaskTemplate, RecurrenceRule } from "@/lib/types";
import { AddTaskInput } from "@/lib/taskOperations";
import { KanbanColumn } from "./KanbanColumn";
import { DoneColumn, DONE_COLUMN_ID } from "./DoneColumn";
import { MonthCalendarView } from "./MonthCalendarView";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { QuickAddDialog } from "./QuickAddDialog";
import { BulkActionBar } from "./BulkActionBar";
import { Plus, Keyboard, Columns3, CalendarDays } from "lucide-react";

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
  onUpdateEnd: (areaId: string, taskId: string, endDate: string | undefined, endTime: string | undefined) => void;
  onUpdatePriority: (areaId: string, taskId: string, p: TaskPriority) => void;
  onUpdateTags: (areaId: string, taskId: string, ids: string[]) => void;
  onUpdateRecurrence: (areaId: string, taskId: string, recurrence: RecurrenceRule | undefined) => void;
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
  templates?: TaskTemplate[];
  onCreateTemplate?: (areaId: string, task: Task) => void;
  onDeleteTemplate?: (id: string) => void;
}

type BoardView = "kanban" | "month";

export function KanbanBoard(props: Props) {
  const { areas, tags, timezone } = props;
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragFromAreaId, setDragFromAreaId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const [openDetail, setOpenDetail] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [boardView, setBoardView] = useState<BoardView>(() => (localStorage.getItem("tasks-board-view") as BoardView) || "kanban");

  // Bulk selection: taskId -> areaId
  const [selectedMap, setSelectedMap] = useState<Map<string, string>>(new Map());
  const selectedIds = useMemo(() => new Set(selectedMap.keys()), [selectedMap]);
  const selectionActive = selectedMap.size > 0;

  const toggleSelect = useCallback((areaId: string, taskId: string) => {
    setSelectedMap(prev => {
      const next = new Map(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.set(taskId, areaId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedMap(new Map()), []);

  useEffect(() => {
    if (!selectionActive) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [selectionActive, clearSelection]);

  useEffect(() => {
    try { localStorage.setItem("tasks-board-view", boardView); } catch {}
  }, [boardView]);

  // Click-and-drag panning (ClickUp style) + smooth wheel-to-horizontal
  const boardRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ active: boolean; startX: number; startScroll: number; moved: boolean }>({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });
  const wheelScrollState = useRef<{ frame: number | null; target: number }>({
    frame: null,
    target: 0,
  });
  const [isPanning, setIsPanning] = useState(false);

  const animateHorizontalScroll = useCallback(() => {
    const el = boardRef.current;
    const state = wheelScrollState.current;

    if (!el) {
      state.frame = null;
      return;
    }

    const distance = state.target - el.scrollLeft;
    if (Math.abs(distance) < 0.5) {
      el.scrollLeft = state.target;
      state.frame = null;
      return;
    }

    el.scrollLeft += distance * 0.18;
    state.frame = requestAnimationFrame(animateHorizontalScroll);
  }, []);

  const normalizeWheelDelta = (delta: number, deltaMode: number) => {
    if (deltaMode === 1) return delta * 16;
    if (deltaMode === 2) return delta * window.innerHeight * 0.85;
    return delta;
  };

  const onBoardMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't pan when interacting with cards, buttons, inputs, etc.
    if (target.closest("[data-kanban-card], button, input, textarea, a, [role='button'], [contenteditable='true']")) return;
    const el = boardRef.current;
    if (!el) return;
    panState.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    setIsPanning(true);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = panState.current;
      if (!s.active) return;
      const el = boardRef.current;
      if (!el) return;
      const dx = e.clientX - s.startX;
      if (Math.abs(dx) > 4) s.moved = true;
      el.scrollLeft = s.startScroll - dx;
    };
    const onUp = () => {
      if (panState.current.active) {
        panState.current.active = false;
        setIsPanning(false);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (wheelScrollState.current.frame !== null) {
        cancelAnimationFrame(wheelScrollState.current.frame);
      }
    };
  }, []);

  // Convert vertical wheel to smooth horizontal scroll when not over a vertical scroller
  const onBoardWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // If hovering a column that can scroll vertically, let it scroll normally
    const verticalScroller = target.closest<HTMLElement>("[data-kanban-column-scroll]");
    if (verticalScroller) {
      const canScroll = verticalScroller.scrollHeight > verticalScroller.clientHeight;
      if (canScroll) return;
    }

    const el = boardRef.current;
    if (!el) return;

    const dominantDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const delta = normalizeWheelDelta(dominantDelta, e.deltaMode);
    if (delta === 0) return;

    e.preventDefault();

    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const state = wheelScrollState.current;

    if (state.frame === null) {
      state.target = el.scrollLeft;
    }

    state.target = Math.max(0, Math.min(maxScroll, state.target + delta * 1.1));

    if (state.frame === null) {
      state.frame = requestAnimationFrame(animateHorizontalScroll);
    }
  };


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

  const handleDropOnDone = useCallback(() => {
    if (!draggingTaskId || !dragFromAreaId) return;
    // Marca como done na área original (a coluna Prontas é virtual)
    props.onUpdateStatus(dragFromAreaId, draggingTaskId, "done");
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
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Keyboard className="w-3 h-3" />
            Aperte <kbd className="px-1 py-0.5 rounded bg-secondary text-foreground">N</kbd> em qualquer lugar pra criar
          </div>
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => setBoardView("kanban")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${boardView === "kanban" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Quadro Kanban"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quadro</span>
            </button>
            <button
              onClick={() => setBoardView("month")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${boardView === "month" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Calendário mensal"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mês</span>
            </button>
          </div>
        </div>
      </div>

      {boardView === "month" ? (
        <MonthCalendarView
          areas={areas}
          tags={tags}
          onTaskClick={(areaId, task) => openTaskDetail(areaId, task)}
          onMarkDone={(areaId, taskId) => props.onUpdateStatus(areaId, taskId, "done")}
        />
      ) : (
        <div
          ref={boardRef}
          onMouseDown={onBoardMouseDown}
          onWheel={onBoardWheel}
          className={`flex gap-3 overflow-x-auto no-scrollbar pb-3 -mx-3 px-3 sm:-mx-6 sm:px-6 select-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ scrollBehavior: "auto", overscrollBehaviorX: "contain" }}
          data-testid="kanban-board"
        >
          {areas.map(area => {
            // Tasks done são exibidas APENAS na coluna virtual "Prontas"
            const visibleArea: TaskArea = { ...area, tasks: area.tasks.filter(t => t.status !== "done") };
            return (
              <KanbanColumn
                key={area.id}
                area={visibleArea}
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
            );
          })}

          {/* Coluna virtual "Prontas" — agrega todas as tasks done */}
          <DoneColumn
            areas={areas}
            tags={tags}
            timezone={timezone}
            draggingTaskId={draggingTaskId}
            dragOverColumnId={dragOverColumnId}
            onTaskClick={(areaId, t) => openTaskDetail(areaId, t)}
            onMarkUndone={(areaId, taskId) => props.onUpdateStatus(areaId, taskId, "todo")}
            onDropDone={handleDropOnDone}
            onDragOverColumn={() => setDragOverColumnId(DONE_COLUMN_ID)}
          />

          {/* Add column */}
          <button
            onClick={props.onAddArea}
            className="flex flex-col items-center justify-center gap-2 w-72 sm:w-80 h-32 flex-shrink-0 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Nova área</span>
          </button>
        </div>
      )}

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
        templates={props.templates}
        onDeleteTemplate={props.onDeleteTemplate}
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
          onUpdateEnd={(endDate, endTime) => props.onUpdateEnd(selectedAreaId, selectedTask.id, endDate, endTime)}
          onUpdatePriority={(p) => props.onUpdatePriority(selectedAreaId, selectedTask.id, p)}
          onUpdateTags={(ids) => props.onUpdateTags(selectedAreaId, selectedTask.id, ids)}
          onUpdateRecurrence={(recurrence) => props.onUpdateRecurrence(selectedAreaId, selectedTask.id, recurrence)}
          onAddTag={props.onAddTag}
          onDeleteTag={props.onDeleteTag}
          onAddSubtask={(text) => props.onAddSubtask(selectedAreaId, selectedTask.id, text)}
          onToggleSubtask={(id) => props.onToggleSubtask(selectedAreaId, selectedTask.id, id)}
          onDeleteSubtask={(id) => props.onDeleteSubtask(selectedAreaId, selectedTask.id, id)}
          onUpdateSubtaskText={(id, text) => props.onUpdateSubtaskText(selectedAreaId, selectedTask.id, id, text)}
          onAddComment={(text) => props.onAddComment(selectedAreaId, selectedTask.id, text)}
          onDeleteComment={(id) => props.onDeleteComment(selectedAreaId, selectedTask.id, id)}
          onMove={handleMoveSelected}
          onCreateTemplate={() => props.onCreateTemplate?.(selectedAreaId, selectedTask)}
          onDelete={() => props.onDeleteTask(selectedAreaId, selectedTask.id)}
        />
      )}
    </div>
  );
}
