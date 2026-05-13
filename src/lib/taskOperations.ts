import { Task, TaskArea, TaskStatus, TaskTextStyle, TaskComment, TaskPriority, Subtask, RecurrenceRule } from "@/lib/types";

export const DEFAULT_STYLE: TaskTextStyle = { size: "base", weight: "normal", color: "#000000" };

export interface AddTaskInput {
  text: string;
  dueDate?: string;
  dueTime?: string;
  endDate?: string;
  endTime?: string;
  recurrence?: RecurrenceRule;
  priority?: TaskPriority;
  tagIds?: string[];
  subtasks?: Omit<Subtask, "id" | "done">[];
}

export function makeTask(input: AddTaskInput): Task {
  return {
    id: crypto.randomUUID(),
    text: input.text,
    status: "todo",
    style: { ...DEFAULT_STYLE },
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    endDate: input.endDate,
    endTime: input.endTime,
    createdAt: new Date().toISOString(),
    comments: [],
    recurrence: input.recurrence,
    priority: input.priority || "none",
    tagIds: input.tagIds || [],
    subtasks: (input.subtasks || []).map(s => ({
      id: crypto.randomUUID(),
      text: s.text,
      done: false,
    })),
  };
}

export function normalizeTask(t: Task): Task {
  return {
    ...t,
    comments: t.comments || [],
    priority: t.priority || "none",
    tagIds: t.tagIds || [],
    subtasks: t.subtasks || [],
  };
}

export function addTaskToArea(areas: TaskArea[], areaId: string, task: Task): TaskArea[] {
  return areas.map(a => a.id === areaId ? { ...a, tasks: [...a.tasks, task] } : a);
}

export function updateTaskInAreas(
  areas: TaskArea[],
  areaId: string,
  taskId: string,
  updater: (t: Task) => Task,
): TaskArea[] {
  return areas.map(a =>
    a.id === areaId
      ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? updater(t) : t) }
      : a
  );
}

export function removeTaskFromArea(areas: TaskArea[], areaId: string, taskId: string): TaskArea[] {
  return areas.map(a =>
    a.id === areaId ? { ...a, tasks: a.tasks.filter(t => t.id !== taskId) } : a
  );
}

export function moveTaskBetweenAreas(
  areas: TaskArea[],
  fromAreaId: string,
  toAreaId: string,
  taskId: string,
  toIndex?: number,
): TaskArea[] {
  if (fromAreaId === toAreaId) {
    // Reorder within same area
    return areas.map(a => {
      if (a.id !== fromAreaId) return a;
      const idx = a.tasks.findIndex(t => t.id === taskId);
      if (idx === -1) return a;
      const next = [...a.tasks];
      const [moved] = next.splice(idx, 1);
      const insertAt = toIndex !== undefined ? Math.min(toIndex, next.length) : next.length;
      next.splice(insertAt, 0, moved);
      return { ...a, tasks: next };
    });
  }

  const fromArea = areas.find(a => a.id === fromAreaId);
  const task = fromArea?.tasks.find(t => t.id === taskId);
  if (!task) return areas;

  return areas.map(a => {
    if (a.id === fromAreaId) {
      return { ...a, tasks: a.tasks.filter(t => t.id !== taskId) };
    }
    if (a.id === toAreaId) {
      const next = [...a.tasks];
      const insertAt = toIndex !== undefined ? Math.min(toIndex, next.length) : next.length;
      next.splice(insertAt, 0, task);
      return { ...a, tasks: next };
    }
    return a;
  });
}

// Subtask helpers
export function addSubtask(task: Task, text: string): Task {
  const sub: Subtask = { id: crypto.randomUUID(), text, done: false };
  return { ...task, subtasks: [...(task.subtasks || []), sub] };
}

export function toggleSubtask(task: Task, subtaskId: string): Task {
  return {
    ...task,
    subtasks: (task.subtasks || []).map(s => s.id === subtaskId ? { ...s, done: !s.done } : s),
  };
}

export function deleteSubtask(task: Task, subtaskId: string): Task {
  return { ...task, subtasks: (task.subtasks || []).filter(s => s.id !== subtaskId) };
}

export function updateSubtaskText(task: Task, subtaskId: string, text: string): Task {
  return {
    ...task,
    subtasks: (task.subtasks || []).map(s => s.id === subtaskId ? { ...s, text } : s),
  };
}

// Comment helpers
export function addCommentToTask(task: Task, text: string): Task {
  const c: TaskComment = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() };
  return { ...task, comments: [...task.comments, c] };
}

export function deleteCommentFromTask(task: Task, commentId: string): Task {
  return { ...task, comments: task.comments.filter(c => c.id !== commentId) };
}
