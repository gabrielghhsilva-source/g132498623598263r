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

const DEFAULT_AREAS: TaskArea[] = [
  { id: "work", name: "Trabalho", icon: "💼", tasks: [], collapsed: false },
  { id: "games", name: "Jogos", icon: "🎮", tasks: [], collapsed: false },
  { id: "leisure", name: "Lazer", icon: "☀️", tasks: [], collapsed: false },
  { id: "home", name: "Afazeres Domésticos", icon: "🏠", tasks: [], collapsed: false },
  { id: "investments", name: "Investimentos", icon: "📈", tasks: [], collapsed: false },
];

const DEFAULT_TAGS: TaskTag[] = [];

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
    return loaded.map(a => ({
      ...a,
      tasks: a.tasks.map(normalizeTask),
    }));
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
      setAreas(cloud.map(a => ({ ...a, tasks: (a.tasks || []).map(normalizeTask) })));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    secureSet("task-areas", JSON.stringify(areas));
    saveCloudState("tasks_areas", areas);
  }, [areas]);
  useEffect(() => { secureSet("task-tags", JSON.stringify(tags)); }, [tags]);

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

  // Recurring task generation
  useEffect(() => {
    const lastCheck = loadPlain<string>("task-recurrence-last-check", "");
    const now = getNowInTimezone(timezone);
    const today = now.date;
    if (lastCheck === today) return;

    setAreas(prev => {
      let updated = [...prev];
      for (const area of updated) {
        const recurringTasks = area.tasks.filter(t => t.recurrence && !t.recurrenceSourceId);
        for (const template of recurringTasks) {
          const rule = template.recurrence!;
          const nextDates = getUpcomingDates(rule, 14);
          for (const date of nextDates) {
            const advDate = new Date(date);
            advDate.setDate(advDate.getDate() - rule.advanceDays);
            const todayDate = new Date(today);
            if (advDate <= todayDate) {
              const dateStr = date.toISOString().split("T")[0];
              const exists = area.tasks.some(t =>
                t.recurrenceSourceId === template.id && t.dueDate === dateStr
              );
              if (!exists) {
                const newTask = makeTask({
                  text: template.text,
                  dueDate: dateStr,
                  dueTime: template.dueTime,
                  priority: template.priority,
                  tagIds: template.tagIds,
                });
                newTask.recurrenceSourceId = template.id;
                newTask.style = { ...template.style };
                const areaIdx = updated.findIndex(a => a.id === area.id);
                updated[areaIdx] = { ...updated[areaIdx], tasks: [...updated[areaIdx].tasks, newTask] };
              }
            }
          }
        }
      }
      localStorage.setItem("task-recurrence-last-check", JSON.stringify(today));
      return updated;
    });
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
    setAreas(prev => updateTaskInAreas(prev, areaId, taskId, t => ({ ...t, status })));
  }, []);

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

  const deleteTask = useCallback((areaId: string, taskId: string) => {
    setAreas(prev => removeTaskFromArea(prev, areaId, taskId));
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
    setAreas(prev => prev.filter(a => a.id !== areaId));
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

  const allTasksWithArea = areas.flatMap(a =>
    a.tasks.map(t => ({ task: t, areaName: a.name, areaId: a.id }))
  );

  return {
    areas, tags,
    theme, setTheme, customColors, setCustomColors,
    timezone, setTimezone,
    buttonBgColor, buttonTextColor, setButtonBgColor, setButtonTextColor,
    showThemeDecorations, setShowThemeDecorations,
    addTask, addTaskFull, updateTaskStatus, updateTaskStyle, updateTaskText, updateTaskTime,
    updateTaskPriority, updateTaskTags, deleteTask, moveTask, snoozeTask,
    addSubtaskTo, toggleSubtaskOf, deleteSubtaskOf, updateSubtaskTextOf,
    toggleCollapse, addArea, deleteArea, reorderAreas,
    addComment, deleteComment,
    addTag, updateTag, deleteTag,
    stats, todayTasks, allTasksWithArea,
  };
}

function getUpcomingDates(rule: RecurrenceRule, daysAhead: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (rule.type === "weekly" && rule.daysOfWeek?.includes(d.getDay())) dates.push(new Date(d));
    if (rule.type === "monthly" && rule.dayOfMonth === d.getDate()) dates.push(new Date(d));
  }
  return dates;
}
