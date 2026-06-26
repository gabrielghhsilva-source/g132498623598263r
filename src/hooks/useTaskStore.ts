import { useState, useCallback, useEffect } from "react";
import { Task, TaskArea, TaskStatus, TaskTextStyle, ThemeId, RecurrenceRule, CustomThemeColors, TaskTag, TaskPriority, Subtask } from "@/lib/types";
import { isTaskOverdue, getNowInTimezone, addMinutesToDue } from "@/lib/timeUtils";
import { secureGet, secureSet } from "@/lib/crypto";
import { loadCloudState, saveCloudState } from "@/lib/cloudSync";
import {
  AddTaskInput, makeTask, normalizeTask,
  addTaskToArea, updateTaskInAreas, removeTaskFromArea, moveTaskBetweenAreas,
  addSubtask, toggleSubtask, deleteSubtask, updateSubtaskText,
  addCommentToTask, deleteCommentFromTask,
} from "@/lib/taskOperations";

const INBOX_AREA_ID = "inbox";
const DEFAULT_AREAS: TaskArea[] = [
  { id: INBOX_AREA_ID, name: "Caixa de entrada", icon: "📥", tasks: [], collapsed: false, protected: true },
  { id: "work", name: "Trabalho", icon: "💼", tasks: [], collapsed: false },
  { id: "games", name: "Jogos", icon: "🎮", tasks: [], collapsed: false },
  { id: "leisure", name: "Lazer", icon: "☀️", tasks: [], collapsed: false },
  { id: "home", name: "Afazeres Domésticos", icon: "🏠", tasks: [], collapsed: false },
  { id: "investments", name: "Investimentos", icon: "📈", tasks: [], collapsed: false },
];


const DEFAULT_TAGS: TaskTag[] = [];

/** Garante que a área Caixa de entrada exista e esteja protegida (sempre 1ª). */
function ensureInbox(list: TaskArea[]): TaskArea[] {
  const idx = list.findIndex(a => a.id === INBOX_AREA_ID);
  if (idx === -1) {
    return [{ id: INBOX_AREA_ID, name: "Caixa de entrada", icon: "📥", tasks: [], collapsed: false, protected: true }, ...list];
  }
  // Garante flag protected mesmo em dados antigos
  if (!list[idx].protected) {
    const next = [...list];
    next[idx] = { ...next[idx], protected: true };
    return next;
  }
  return list;
}


const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  background: "#f7f7f7",
  foreground: "#171717",
  card: "#ffffff",
  border: "#e0e0e0",
};

function loadPlain<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function loadSecure<T>(key: string, fallback: T): T {
  try {
    const stored = secureGet(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  hex = hex.replace("#", "");
  r = parseInt(hex.substring(0, 2), 16) / 255;
  g = parseInt(hex.substring(2, 4), 16) / 255;
  b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyCustomColors(colors: CustomThemeColors) {
  const root = document.documentElement;
  root.style.setProperty("--background", hexToHsl(colors.background));
  root.style.setProperty("--foreground", hexToHsl(colors.foreground));
  root.style.setProperty("--card", hexToHsl(colors.card));
  root.style.setProperty("--card-foreground", hexToHsl(colors.foreground));
  root.style.setProperty("--popover", hexToHsl(colors.card));
  root.style.setProperty("--popover-foreground", hexToHsl(colors.foreground));
  root.style.setProperty("--border", hexToHsl(colors.border));
  root.style.setProperty("--input", hexToHsl(colors.border));
  root.style.setProperty("--secondary", hexToHsl(colors.card));
  root.style.setProperty("--secondary-foreground", hexToHsl(colors.foreground));
  root.style.setProperty("--muted", hexToHsl(colors.card));
  root.style.setProperty("--muted-foreground", hexToHsl(colors.foreground));
  root.style.setProperty("--accent", hexToHsl(colors.card));
  root.style.setProperty("--accent-foreground", hexToHsl(colors.foreground));
  root.style.setProperty("--primary", hexToHsl(colors.foreground));
  root.style.setProperty("--primary-foreground", hexToHsl(colors.background));
  root.style.setProperty("--ring", hexToHsl(colors.foreground));
}

function clearCustomColors() {
  const root = document.documentElement;
  const props = ["--background", "--foreground", "--card", "--card-foreground", "--popover", "--popover-foreground", "--border", "--input", "--secondary", "--secondary-foreground", "--muted", "--muted-foreground", "--accent", "--accent-foreground", "--primary", "--primary-foreground", "--ring"];
  props.forEach(p => root.style.removeProperty(p));
}

export function useTaskStore() {
  const [areas, setAreas] = useState<TaskArea[]>(() => {
    const loaded = loadSecure("task-areas", DEFAULT_AREAS);
    const initialTz = loadPlain("task-timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    return normalizeRecurringAreas(ensureInbox(loaded.map(a => ({
      ...a,
      tasks: a.tasks.map(normalizeTask),
    }))), initialTz);
  });

  const [tags, setTags] = useState<TaskTag[]>(() => loadSecure("task-tags", DEFAULT_TAGS));
  const [theme, setThemeState] = useState<ThemeId>(() => loadPlain("task-theme", "mono-light" as ThemeId));
  const [customColors, setCustomColorsState] = useState<CustomThemeColors>(() => loadPlain("task-custom-colors", DEFAULT_CUSTOM_COLORS));
  const [timezone, setTimezoneState] = useState<string>(() => loadPlain("task-timezone", Intl.DateTimeFormat().resolvedOptions().timeZone));
  const [buttonBgColor, setButtonBgColorState] = useState<string>(() => loadPlain("task-button-bg", "#000000"));
  const [buttonTextColor, setButtonTextColorState] = useState<string>(() => loadPlain("task-button-text", "#ffffff"));
  const [showThemeDecorations, setShowThemeDecorationsState] = useState<boolean>(() => loadPlain("task-theme-decorations", true));

  // Cloud hydration: on mount, pull from Lovable Cloud and replace state if present
  useEffect(() => {
    let cancelled = false;
    loadCloudState<TaskArea[]>("tasks_areas").then(cloud => {
      if (cancelled || !cloud) return;
      setAreas(normalizeRecurringAreas(ensureInbox(cloud.map(a => ({ ...a, tasks: (a.tasks || []).map(normalizeTask) }))), timezone));
    });

    return () => { cancelled = true; };
  }, []);

  // Debounce persistence: avoid blocking the main thread on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      secureSet("task-areas", JSON.stringify(areas));
      saveCloudState("tasks_areas", areas);
    }, 300);
    return () => clearTimeout(t);
  }, [areas]);
  useEffect(() => {
    const t = setTimeout(() => secureSet("task-tags", JSON.stringify(tags)), 300);
    return () => clearTimeout(t);
  }, [tags]);

  useEffect(() => {
    localStorage.setItem("task-theme", JSON.stringify(theme));
    if (theme === "custom") {
      document.documentElement.setAttribute("data-theme", "mono-light");
      applyCustomColors(customColors);
    } else {
      clearCustomColors();
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, customColors]);

  useEffect(() => { localStorage.setItem("task-custom-colors", JSON.stringify(customColors)); }, [customColors]);
  useEffect(() => { localStorage.setItem("task-timezone", JSON.stringify(timezone)); }, [timezone]);
  useEffect(() => { localStorage.setItem("task-button-bg", JSON.stringify(buttonBgColor)); }, [buttonBgColor]);
  useEffect(() => { localStorage.setItem("task-button-text", JSON.stringify(buttonTextColor)); }, [buttonTextColor]);
  useEffect(() => { localStorage.setItem("task-theme-decorations", JSON.stringify(showThemeDecorations)); }, [showThemeDecorations]);

  // Recurring task reconciliation
  useEffect(() => {
    setAreas(prev => normalizeRecurringAreas(prev, timezone));
  }, [timezone]);

  const setTheme = useCallback((t: ThemeId) => setThemeState(t), []);
  const setCustomColors = useCallback((colors: CustomThemeColors) => setCustomColorsState(colors), []);
  const setTimezone = useCallback((tz: string) => setTimezoneState(tz), []);
  const setButtonBgColor = useCallback((c: string) => setButtonBgColorState(c), []);
  const setButtonTextColor = useCallback((c: string) => setButtonTextColorState(c), []);
  const setShowThemeDecorations = useCallback((v: boolean) => setShowThemeDecorationsState(v), []);

  // Task CRUD
  const addTask = useCallback((areaId: string, text: string, dueDate?: string, recurrence?: RecurrenceRule, dueTime?: string) => {
    const task = makeTask({ text, dueDate, dueTime, recurrence });
    setAreas(prev => addTaskToArea(prev, areaId, task));
  }, []);

  const addTaskFull = useCallback((areaId: string, input: AddTaskInput) => {
    const task = makeTask(input);
    setAreas(prev => addTaskToArea(prev, areaId, task));
  }, []);

  const updateTaskStatus = useCallback((areaId: string, taskId: string, status: TaskStatus) => {
    setAreas(prev => {
      if (status !== "done") {
        return updateTaskInAreas(prev, areaId, taskId, t => ({ ...t, status }));
      }

      const area = prev.find(a => a.id === areaId);
      const task = area?.tasks.find(t => t.id === taskId);

      // Recorrentes usam modelo "rolante": a ocorrência concluída vira uma
      // cópia em Prontas, enquanto a task principal avança para a próxima data
      // e continua visível na agenda.
      if (task?.recurrence && !task.recurrenceSourceId) {
        return prev.map(a => a.id === areaId ? { ...a, tasks: completeRecurringSource(a.tasks, taskId, timezone) } : a);
      }

      return updateTaskInAreas(prev, areaId, taskId, t => ({ ...t, status }));
    });
  }, [timezone]);

  const updateTaskStyle = useCallback((areaId: string, taskId: string, style: Partial<TaskTextStyle>) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => ({ ...t, style: { ...t.style, ...style } })));
  }, []);

  const updateTaskText = useCallback((areaId: string, taskId: string, text: string) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => ({ ...t, text })));
  }, []);

  const updateTaskTime = useCallback((areaId: string, taskId: string, dueTime: string | undefined, dueDate?: string) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => ({
      ...t,
      dueTime: dueTime || undefined,
      dueDate: dueDate !== undefined ? (dueDate || undefined) : t.dueDate,
    })));
  }, []);

  const updateTaskEnd = useCallback((areaId: string, taskId: string, endDate: string | undefined, endTime: string | undefined) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => ({
      ...t,
      endDate: endDate || undefined,
      endTime: endTime || undefined,
    })));
  }, []);

  /**
   * Adia o prazo de uma task em `minutes` minutos.
   * Se a task não tem dueDate, ignora silenciosamente.
   */
  const snoozeTask = useCallback((areaId: string, taskId: string, minutes: number) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => {
      if (!t.dueDate) return t;
      const next = addMinutesToDue(t.dueDate, t.dueTime, minutes);
      return { ...t, dueDate: next.date, dueTime: next.time };
    }));
  }, []);

  const updateTaskPriority = useCallback((areaId: string, taskId: string, priority: TaskPriority) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => ({ ...t, priority })));
  }, []);

  const updateTaskTags = useCallback((areaId: string, taskId: string, tagIds: string[]) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => ({ ...t, tagIds })));
  }, []);

  const setTaskAutoStatus = useCallback((areaId: string, taskId: string, autoStatus: boolean) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => ({ ...t, autoStatus })));
  }, []);

  /** Atualiza metadados do Google Calendar de uma task (id do evento, hash, etc). */
  const setTaskGoogleMeta = useCallback((areaId: string, taskId: string, meta: Partial<Pick<Task, "googleEventId" | "googleCalendarId" | "googleLastHash" | "googleSyncedAt">>) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => ({ ...t, ...meta })));
  }, []);

  /**
   * Insere uma task vinda do Google. Se já existir (por googleEventId), atualiza in-place.
   * Caso contrário, cria nova na área `targetAreaId`.
   */
  const upsertGoogleEvent = useCallback((targetAreaId: string, patch: Partial<Task> & { googleEventId: string; googleCalendarId: string }, autoStatusDefault: boolean) => {
    setAreas(prev => {
      // Procura por googleEventId em todas as áreas
      for (const a of prev) {
        const existing = a.tasks.find(t => t.googleEventId === patch.googleEventId);
        if (existing) {
          return updateTaskInAreas(prev, a.id, existing.id, t => ({ ...t, ...patch, googleSyncedAt: new Date().toISOString() }));
        }
      }
      // Nova: cria na área alvo
      const task: Task = {
        id: crypto.randomUUID(),
        text: patch.text || "Evento sem título",
        status: "todo",
        style: { size: "base", weight: "normal", color: "#000000" },
        dueDate: patch.dueDate,
        dueTime: patch.dueTime,
        endDate: patch.endDate,
        endTime: patch.endTime,
        createdAt: new Date().toISOString(),
        comments: [],
        priority: patch.priority || "none",
        tagIds: [],
        subtasks: [],
        autoStatus: autoStatusDefault,
        googleEventId: patch.googleEventId,
        googleCalendarId: patch.googleCalendarId,
        googleLastHash: patch.googleLastHash,
        googleSyncedAt: new Date().toISOString(),
        recurrence: patch.recurrence,
      };
      return addTaskToArea(prev, targetAreaId, task);
    });
  }, []);


  // --- Undo stack (delete only, last 20) ---
  const undoStackRef = (globalThis as any).__lvUndoStackRef || { current: [] as Array<{ areaId: string; task: Task; index: number }> };
  (globalThis as any).__lvUndoStackRef = undoStackRef;

  const deleteTask = useCallback((areaId: string, taskId: string) => {
    setAreas(prev => {
      const area = prev.find(a => a.id === areaId);
      const idx = area?.tasks.findIndex(t => t.id === taskId) ?? -1;
      const task = idx >= 0 ? area!.tasks[idx] : null;
      if (task) {
        undoStackRef.current.push({ areaId, task, index: idx });
        if (undoStackRef.current.length > 20) undoStackRef.current.shift();
      }
      return removeTaskFromArea(prev, areaId, taskId);
    });
  }, []);

  const undoDelete = useCallback((): boolean => {
    const last = undoStackRef.current.pop();
    if (!last) return false;
    setAreas(prev => prev.map(a => {
      if (a.id !== last.areaId) return a;
      const tasks = [...a.tasks];
      const insertAt = Math.min(last.index, tasks.length);
      tasks.splice(insertAt, 0, last.task);
      return { ...a, tasks };
    }));
    return true;
  }, []);

  // --- Export / Import (JSON, sem criptografia, fácil migração) ---
  const exportData = useCallback(() => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), areas, tags };
    return JSON.stringify(payload, null, 2);
  }, [areas, tags]);

  const importData = useCallback((raw: string, mode: "merge" | "replace" = "replace") => {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.areas)) throw new Error("Arquivo inválido");
    const incomingAreas: TaskArea[] = parsed.areas.map((a: TaskArea) => ({
      ...a,
      tasks: (a.tasks || []).map(normalizeTask),
    }));
    const incomingTags: TaskTag[] = Array.isArray(parsed.tags) ? parsed.tags : [];
    if (mode === "replace") {
      setAreas(normalizeRecurringAreas(ensureInbox(incomingAreas), timezone));
      setTags(incomingTags);
    } else {
      setAreas(prev => {
        const map = new Map(prev.map(a => [a.id, a]));
        for (const a of incomingAreas) {
          if (map.has(a.id)) {
            const existing = map.get(a.id)!;
            const taskIds = new Set(existing.tasks.map(t => t.id));
            map.set(a.id, { ...existing, tasks: [...existing.tasks, ...a.tasks.filter(t => !taskIds.has(t.id))] });
          } else {
            map.set(a.id, a);
          }
        }
        return normalizeRecurringAreas(ensureInbox(Array.from(map.values())), timezone);
      });
      setTags(prev => {
        const ids = new Set(prev.map(t => t.id));
        return [...prev, ...incomingTags.filter(t => !ids.has(t.id))];
      });
    }
  }, []);

  const moveTask = useCallback((fromAreaId: string, toAreaId: string, taskId: string, toIndex?: number) => {
    setAreas(prev => moveTaskBetweenAreas(prev, fromAreaId, toAreaId, taskId, toIndex));
  }, []);

  // Subtasks
  const addSubtaskTo = useCallback((areaId: string, taskId: string, text: string) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => addSubtask(t, text)));
  }, []);
  const toggleSubtaskOf = useCallback((areaId: string, taskId: string, subtaskId: string) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => toggleSubtask(t, subtaskId)));
  }, []);
  const deleteSubtaskOf = useCallback((areaId: string, taskId: string, subtaskId: string) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => deleteSubtask(t, subtaskId)));
  }, []);
  const updateSubtaskTextOf = useCallback((areaId: string, taskId: string, subtaskId: string, text: string) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => updateSubtaskText(t, subtaskId, text)));
  }, []);

  // Comments
  const addComment = useCallback((areaId: string, taskId: string, text: string) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => addCommentToTask(t, text)));
  }, []);
  const deleteComment = useCallback((areaId: string, taskId: string, commentId: string) => {
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => deleteCommentFromTask(t, commentId)));
  }, []);

  // Areas
  const toggleCollapse = useCallback((areaId: string) => {
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, collapsed: !a.collapsed } : a));
  }, []);

  const addArea = useCallback((name: string, icon: string) => {
    const area: TaskArea = { id: crypto.randomUUID(), name, icon, tasks: [], collapsed: false };
    setAreas(prev => [...prev, area]);
  }, []);

  const deleteArea = useCallback((areaId: string) => {
    setAreas(prev => prev.filter(a => !(a.id === areaId && !a.protected)));
  }, []);


  const reorderAreas = useCallback((fromIndex: number, toIndex: number) => {
    setAreas(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  // Tags
  const addTag = useCallback((name: string, color: string) => {
    const tag: TaskTag = { id: crypto.randomUUID(), name, color };
    setTags(prev => [...prev, tag]);
    return tag;
  }, []);
  const updateTag = useCallback((id: string, patch: Partial<TaskTag>) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);
  const deleteTag = useCallback((id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
    setAreas(prev => prev.map(a => ({
      ...a,
      tasks: a.tasks.map(t => ({ ...t, tagIds: (t.tagIds || []).filter(tid => tid !== id) })),
    })));
  }, []);

  const allTasks = areas.flatMap(a => a.tasks);
  const stats = {
    total: allTasks.length,
    done: allTasks.filter(t => t.status === "done").length,
    inProgress: allTasks.filter(t => t.status === "in-progress").length,
    todo: allTasks.filter(t => t.status === "todo").length,
    overdue: allTasks.filter(t => isTaskOverdue(t.dueDate, t.dueTime, t.status, timezone)).length,
  };

  const now = getNowInTimezone(timezone);
  const todayStr = now.date;
  const todayTasks = areas.flatMap(a =>
    a.tasks
      .filter(t => t.status !== "done" && (t.dueDate === todayStr || !t.dueDate))
      .map(t => ({ ...t, areaName: a.name, areaIcon: a.icon, areaId: a.id }))
  );

  /** Instâncias recorrentes concluídas hoje — exibidas separadamente para não poluir a agenda. */
  const todayDoneRecurring = areas.flatMap(a =>
    a.tasks
      .filter(t => t.status === "done" && t.dueDate === todayStr && !!t.recurrenceSourceId)
      .map(t => ({ ...t, areaName: a.name, areaIcon: a.icon, areaId: a.id }))
  );

  const allTasksWithArea = areas.flatMap(a =>
    a.tasks.map(t => ({ task: t, areaName: a.name, areaId: a.id }))
  );

  // PWA badge: reflete a contagem de tasks pendentes de hoje no ícone do app
  useEffect(() => {
    const count = todayTasks.length;
    try {
      // API nativa (Chrome desktop/Android, Edge)
      const nav: any = navigator;
      if (typeof nav.setAppBadge === "function") {
        if (count > 0) nav.setAppBadge(count).catch(() => {});
        else nav.clearAppBadge?.().catch(() => {});
      }
      // Mensagem para o service worker (fallback / consistência)
      navigator.serviceWorker?.controller?.postMessage({ type: "SET_BADGE", count });
    } catch { /* noop */ }
  }, [todayTasks.length]);



  return {
    areas, tags,
    theme, setTheme, customColors, setCustomColors,
    timezone, setTimezone,
    buttonBgColor, buttonTextColor, setButtonBgColor, setButtonTextColor,
    showThemeDecorations, setShowThemeDecorations,
    addTask, addTaskFull, updateTaskStatus, updateTaskStyle, updateTaskText, updateTaskTime, updateTaskEnd,
    updateTaskPriority, updateTaskTags, deleteTask, moveTask, snoozeTask,
    setTaskAutoStatus, setTaskGoogleMeta, upsertGoogleEvent,
    addSubtaskTo, toggleSubtaskOf, deleteSubtaskOf, updateSubtaskTextOf,
    toggleCollapse, addArea, deleteArea, reorderAreas,
    addComment, deleteComment,
    addTag, updateTag, deleteTag,
    undoDelete, exportData, importData,
    stats, todayTasks, todayDoneRecurring, allTasksWithArea,
  };
}

function normalizeRecurringAreas(areas: TaskArea[], timezone: string): TaskArea[] {
  const today = getNowInTimezone(timezone).date;
  let changed = false;
  const nextAreas = areas.map(area => {
    const normalized = reconcileRecurringTasks(area.tasks, today, timezone);
    if (normalized !== area.tasks) changed = true;
    return normalized === area.tasks ? area : { ...area, tasks: normalized };
  });
  return changed ? nextAreas : areas;
}

function reconcileRecurringTasks(tasks: Task[], today: string, timezone: string): Task[] {
  const sources = tasks.filter(t => t.recurrence && !t.recurrenceSourceId);
  if (sources.length === 0) return tasks;

  const sourceIds = new Set(sources.map(t => t.id));
  let changed = false;
  let working = tasks.filter(t => {
    // Remove instâncias antigas pendentes do modelo anterior. Agora só a fonte
    // rolante fica pendente; as cópias com recurrenceSourceId ficam apenas em done.
    if (t.recurrenceSourceId && sourceIds.has(t.recurrenceSourceId) && t.status !== "done") {
      changed = true;
      return false;
    }
    return true;
  });

  const doneCopies: Task[] = [];
  working = working.map(task => {
    if (!task.recurrence || task.recurrenceSourceId) return task;

    if (task.status === "done") {
      const completedDate = task.dueDate || today;
      const alreadyArchived = working.some(t =>
        t.id !== task.id &&
        t.status === "done" &&
        t.recurrenceSourceId === task.id &&
        t.dueDate === completedDate
      );
      if (!alreadyArchived) doneCopies.push(makeRecurringDoneCopy(task, completedDate));

      const nextDate = getNextDisplayOccurrence(task.recurrence, completedDate, today, false);
      changed = true;
      return rollRecurringSource(task, nextDate, "todo");
    }

    if (!task.dueDate || task.dueDate < today) {
      const nextDate = getNextDisplayOccurrence(task.recurrence, task.dueDate || today, today, true);
      changed = true;
      return rollRecurringSource(task, nextDate, "todo");
    }

    return task;
  });

  return changed || doneCopies.length > 0 ? [...working, ...doneCopies] : tasks;
}

function completeRecurringSource(tasks: Task[], sourceId: string, timezone: string): Task[] {
  const today = getNowInTimezone(timezone).date;
  let changed = false;
  const doneCopies: Task[] = [];
  const next = tasks.map(task => {
    if (task.id !== sourceId || !task.recurrence || task.recurrenceSourceId) return task;
    const completedDate = task.dueDate || today;
    const alreadyArchived = tasks.some(t =>
      t.id !== task.id &&
      t.status === "done" &&
      t.recurrenceSourceId === task.id &&
      t.dueDate === completedDate
    );
    if (!alreadyArchived) doneCopies.push(makeRecurringDoneCopy(task, completedDate));
    const nextDate = getNextDisplayOccurrence(task.recurrence, completedDate, today, false);
    changed = true;
    return rollRecurringSource(task, nextDate, "todo");
  });
  return changed ? [...next, ...doneCopies] : tasks;
}

function makeRecurringDoneCopy(source: Task, completedDate: string): Task {
  const copy: Task = {
    ...source,
    id: crypto.randomUUID(),
    status: "done",
    dueDate: completedDate,
    recurrenceSourceId: source.id,
    googleEventId: undefined,
    googleCalendarId: undefined,
    googleLastHash: undefined,
    googleSyncedAt: undefined,
    googleEtag: undefined,
    googleUpdated: undefined,
    comments: [...(source.comments || [])],
    tagIds: [...(source.tagIds || [])],
    subtasks: (source.subtasks || []).map(s => ({ ...s })),
  };
  return copy;
}

function rollRecurringSource(source: Task, nextDate: string, status: TaskStatus): Task {
  const oldDueDate = source.dueDate;
  const endOffset = oldDueDate && source.endDate ? diffDays(oldDueDate, source.endDate) : 0;
  return {
    ...source,
    status,
    dueDate: nextDate,
    endDate: source.endDate ? addDays(nextDate, endOffset) : source.endDate,
    googleLastHash: undefined,
    googleSyncedAt: undefined,
    subtasks: (source.subtasks || []).map(s => ({ ...s, done: false })),
  };
}

function getNextDisplayOccurrence(rule: RecurrenceRule, afterDate: string, today: string, includeTodayWhenStale: boolean): string {
  const after = getNextOccurrenceDate(rule, afterDate, false) || addDays(afterDate, 1);
  if (after < today || includeTodayWhenStale) {
    return getNextOccurrenceDate(rule, today, true) || after;
  }
  return after;
}

function getNextOccurrenceDate(rule: RecurrenceRule, baseDate: string, includeBase: boolean): string | null {
  const base = parseLocalDate(baseDate);
  for (let i = includeBase ? 0 : 1; i <= 370; i++) {
    const candidate = addDaysToDate(base, i);
    if (matchesRecurrenceDate(rule, candidate)) return formatLocalDate(candidate);
  }
  return null;
}

function matchesRecurrenceDate(rule: RecurrenceRule, date: Date): boolean {
  if (rule.type === "weekly") return !!rule.daysOfWeek?.includes(date.getDay());
  if (rule.type === "monthly") return rule.dayOfMonth === date.getDate();
  return false;
}

function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function formatLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: string, days: number): string {
  return formatLocalDate(addDaysToDate(parseLocalDate(date), days));
}

function addDaysToDate(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(start: string, end: string): number {
  const a = parseLocalDate(start).getTime();
  const b = parseLocalDate(end).getTime();
  return Math.round((b - a) / 86_400_000);
}
