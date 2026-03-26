import { useState, useRef, useCallback } from "react";
import { TaskArea, RecurrenceRule, TaskStatus, TaskTextStyle } from "@/lib/types";
import { TaskAreaCard } from "./TaskAreaCard";
import { GripVertical } from "lucide-react";

const DEFAULT_AREA_IDS = ["work", "games", "leisure", "home", "investments"];

interface Props {
  areas: TaskArea[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleCollapse: (areaId: string) => void;
  onAddTask: (areaId: string, text: string, dueDate?: string, recurrence?: RecurrenceRule) => void;
  onUpdateStatus: (areaId: string, taskId: string, status: TaskStatus) => void;
  onUpdateStyle: (areaId: string, taskId: string, style: Partial<TaskTextStyle>) => void;
  onUpdateText: (areaId: string, taskId: string, text: string) => void;
  onDeleteTask: (areaId: string, taskId: string) => void;
  onDeleteArea: (areaId: string) => void;
  onAddComment: (areaId: string, taskId: string, text: string) => void;
  onDeleteComment: (areaId: string, taskId: string, commentId: string) => void;
}

export function DraggableAreaList({
  areas, onReorder, onToggleCollapse, onAddTask, onUpdateStatus,
  onUpdateStyle, onUpdateText, onDeleteTask, onDeleteArea, onAddComment, onDeleteComment
}: Props) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [longPressActive, setLongPressActive] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const handlePointerDown = useCallback((idx: number) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressActive(true);
      setDraggingIdx(idx);
      dragItemRef.current = idx;
    }, 800);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (draggingIdx !== null && overIdx !== null && draggingIdx !== overIdx) {
      onReorder(draggingIdx, overIdx);
    }
    setDraggingIdx(null);
    setOverIdx(null);
    setLongPressActive(false);
    dragItemRef.current = null;
  }, [draggingIdx, overIdx, onReorder]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setDraggingIdx(null);
    setOverIdx(null);
    setLongPressActive(false);
  }, []);

  return (
    <div className="space-y-4" onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel}>
      {areas.map((area, idx) => {
        const isDragging = draggingIdx === idx;
        const isOver = overIdx === idx && draggingIdx !== null && draggingIdx !== idx;

        return (
          <div
            key={area.id}
            className={`relative transition-all duration-200 ${
              isDragging ? "opacity-50 scale-[0.98]" : ""
            } ${isOver ? "border-t-2 border-primary pt-1" : ""}`}
            onPointerEnter={() => {
              if (draggingIdx !== null) setOverIdx(idx);
            }}
          >
            {/* Drag handle - visible on long press mode or hover */}
            <div
              className={`absolute -left-8 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 rounded transition-opacity ${
                longPressActive ? "opacity-100" : "opacity-0 group-hover:opacity-40 hover:!opacity-100"
              }`}
              onPointerDown={() => handlePointerDown(idx)}
              style={{ touchAction: "none" }}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>

            <div
              onPointerDown={() => handlePointerDown(idx)}
              onPointerMove={() => {
                // Cancel long press if user moves too much without it triggering
                if (!longPressActive && longPressTimer.current) {
                  // Allow small movements
                }
              }}
              style={{ touchAction: longPressActive ? "none" : "auto" }}
            >
              <TaskAreaCard
                area={area}
                isCustom={!DEFAULT_AREA_IDS.includes(area.id)}
                onToggleCollapse={() => onToggleCollapse(area.id)}
                onAddTask={(text, date, rec, time) => onAddTask(area.id, text, date, rec, time)}
                onUpdateStatus={(taskId, s) => onUpdateStatus(area.id, taskId, s)}
                onUpdateStyle={(taskId, s) => onUpdateStyle(area.id, taskId, s)}
                onUpdateText={(taskId, t) => onUpdateText(area.id, taskId, t)}
                onDeleteTask={taskId => onDeleteTask(area.id, taskId)}
                onDeleteArea={!DEFAULT_AREA_IDS.includes(area.id) ? () => onDeleteArea(area.id) : undefined}
                onAddComment={(taskId, text) => onAddComment(area.id, taskId, text)}
                onDeleteComment={(taskId, commentId) => onDeleteComment(area.id, taskId, commentId)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
