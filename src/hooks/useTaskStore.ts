import { useState, useCallback, useEffect } from "react";
import { Task, TaskArea, TaskStatus, TaskTextStyle, ThemeId, RecurrenceRule, CustomThemeColors, TaskComment } from "@/lib/types";
import { isTaskOverdue, getNowInTimezone } from "@/lib/timeUtils";

const DEFAULT_STYLE: TaskTextStyle = { size: "base", weight: "normal", color: "#000000" };

const DEFAULT_AREAS: TaskArea[] = [
  { id: "work", name: "Trabalho", icon: "💼", tasks: [], collapsed: false },
  { id: "games", name: "Jogos", icon: "🎮", tasks: [], collapsed: false },
  { id: "leisure", name: "Lazer", icon: "☀️", tasks: [], collapsed: false },
  { id: "home", name: "Afazeres Domésticos", icon: "🏠", tasks: [], collapsed: false },
  { id: "investments", name: "Investimentos", icon: "📈", tasks: [], collapsed: false },
];

const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  background: "#f7f7f7",
  foreground: "#171717",
  card: "#ffffff",
  border: "#e0e0e0",
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
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
    const loaded = loadFromStorage("task-areas", DEFAULT_AREAS);
    return loaded.map(a => ({
      ...a,
      tasks: a.tasks.map(t => ({ ...t, comments: t.comments || [] }))
    }));
  });
  const [theme, setThemeState] = useState<ThemeId>(() => loadFromStorage("task-theme", "mono-light" as ThemeId));
  const [customColors, setCustomColorsState] = useState<CustomThemeColors>(() => loadFromStorage("task-custom-colors", DEFAULT_CUSTOM_COLORS));
  const [timezone, setTimezoneState] = useState<string>(() => loadFromStorage("task-timezone", Intl.DateTimeFormat().resolvedOptions().timeZone));
  const [buttonBgColor, setButtonBgColorState] = useState<string>(() => loadFromStorage("task-button-bg", "#000000"));
  const [buttonTextColor, setButtonTextColorState] = useState<string>(() => loadFromStorage("task-button-text", "#ffffff"));

  useEffect(() => {
    localStorage.setItem("task-areas", JSON.stringify(areas));
  }, [areas]);

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

  useEffect(() => {
    localStorage.setItem("task-custom-colors", JSON.stringify(customColors));
  }, [customColors]);

  useEffect(() => {
    localStorage.setItem("task-timezone", JSON.stringify(timezone));
  }, [timezone]);

  // Recurring task generation
  useEffect(() => {
    const lastCheck = loadFromStorage<string>("task-recurrence-last-check", "");
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
            const advStr = advDate.toISOString().split("T")[0];
            const todayDate = new Date(today);
            if (advDate <= todayDate) {
              const dateStr = date.toISOString().split("T")[0];
              const exists = area.tasks.some(t =>
                t.recurrenceSourceId === template.id && t.dueDate === dateStr
              );
              if (!exists) {
                const newTask: Task = {
                  id: crypto.randomUUID(),
                  text: template.text,
                  status: "todo",
                  style: { ...template.style },
                  dueDate: dateStr,
                  dueTime: template.dueTime,
                  createdAt: new Date().toISOString(),
                  comments: [],
                  recurrenceSourceId: template.id,
                };
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

  const addTask = useCallback((areaId: string, text: string, dueDate?: string, recurrence?: RecurrenceRule, dueTime?: string) => {
    const task: Task = {
      id: crypto.randomUUID(),
      text,
      status: "todo",
      style: { ...DEFAULT_STYLE },
      dueDate,
      dueTime,
      createdAt: new Date().toISOString(),
      comments: [],
      recurrence,
    };
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, tasks: [...a.tasks, task] } : a));
  }, []);

  const updateTaskStatus = useCallback((areaId: string, taskId: string, status: TaskStatus) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? { ...t, status } : t) } : a
    ));
  }, []);

  const updateTaskStyle = useCallback((areaId: string, taskId: string, style: Partial<TaskTextStyle>) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? { ...t, style: { ...t.style, ...style } } : t) } : a
    ));
  }, []);

  const updateTaskText = useCallback((areaId: string, taskId: string, text: string) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? { ...t, text } : t) } : a
    ));
  }, []);

  const deleteTask = useCallback((areaId: string, taskId: string) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, tasks: a.tasks.filter(t => t.id !== taskId) } : a
    ));
  }, []);

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

  const addComment = useCallback((areaId: string, taskId: string, text: string) => {
    const comment: TaskComment = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() };
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? { ...t, comments: [...t.comments, comment] } : t) } : a
    ));
  }, []);

  const deleteComment = useCallback((areaId: string, taskId: string, commentId: string) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? { ...t, comments: t.comments.filter(c => c.id !== commentId) } : t) } : a
    ));
  }, []);

  // Stats computed with timezone-aware overdue
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
    a.tasks.filter(t => t.dueDate === todayStr && t.status !== "done").map(t => ({ ...t, areaName: a.name, areaIcon: a.icon, areaId: a.id }))
  );

  // All tasks with area info for notification system
  const allTasksWithArea = areas.flatMap(a =>
    a.tasks.map(t => ({ task: t, areaName: a.name }))
  );

  return {
    areas, theme, setTheme, customColors, setCustomColors,
    timezone, setTimezone,
    addTask, updateTaskStatus, updateTaskStyle, updateTaskText, deleteTask,
    toggleCollapse, addArea, deleteArea, reorderAreas,
    addComment, deleteComment,
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
