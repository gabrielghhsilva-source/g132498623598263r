import { useState, useCallback, useEffect } from "react";
import { Task, TaskArea, TaskStatus, TaskTextStyle, ThemeId } from "@/lib/types";

const DEFAULT_STYLE: TaskTextStyle = { size: "base", weight: "normal", color: "#000000" };

const DEFAULT_AREAS: TaskArea[] = [
  { id: "work", name: "Trabalho", icon: "💼", tasks: [], collapsed: false },
  { id: "games", name: "Jogos", icon: "🎮", tasks: [], collapsed: false },
  { id: "leisure", name: "Lazer", icon: "☀️", tasks: [], collapsed: false },
  { id: "home", name: "Afazeres Domésticos", icon: "🏠", tasks: [], collapsed: false },
  { id: "investments", name: "Investimentos", icon: "📈", tasks: [], collapsed: false },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function useTaskStore() {
  const [areas, setAreas] = useState<TaskArea[]>(() => loadFromStorage("task-areas", DEFAULT_AREAS));
  const [theme, setThemeState] = useState<ThemeId>(() => loadFromStorage("task-theme", "mono-light" as ThemeId));

  useEffect(() => {
    localStorage.setItem("task-areas", JSON.stringify(areas));
  }, [areas]);

  useEffect(() => {
    localStorage.setItem("task-theme", JSON.stringify(theme));
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeId) => setThemeState(t), []);

  const addTask = useCallback((areaId: string, text: string, dueDate?: string) => {
    const task: Task = {
      id: crypto.randomUUID(),
      text,
      status: "todo",
      style: { ...DEFAULT_STYLE },
      dueDate,
      createdAt: new Date().toISOString(),
    };
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, tasks: [...a.tasks, task] } : a));
  }, []);

  const updateTaskStatus = useCallback((areaId: string, taskId: string, status: TaskStatus) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId
        ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? { ...t, status } : t) }
        : a
    ));
  }, []);

  const updateTaskStyle = useCallback((areaId: string, taskId: string, style: Partial<TaskTextStyle>) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId
        ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? { ...t, style: { ...t.style, ...style } } : t) }
        : a
    ));
  }, []);

  const updateTaskText = useCallback((areaId: string, taskId: string, text: string) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId
        ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? { ...t, text } : t) }
        : a
    ));
  }, []);

  const deleteTask = useCallback((areaId: string, taskId: string) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId
        ? { ...a, tasks: a.tasks.filter(t => t.id !== taskId) }
        : a
    ));
  }, []);

  const toggleCollapse = useCallback((areaId: string) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, collapsed: !a.collapsed } : a
    ));
  }, []);

  // Stats
  const allTasks = areas.flatMap(a => a.tasks);
  const stats = {
    total: allTasks.length,
    done: allTasks.filter(t => t.status === "done").length,
    inProgress: allTasks.filter(t => t.status === "in-progress").length,
    todo: allTasks.filter(t => t.status === "todo").length,
    overdue: allTasks.filter(t => {
      if (!t.dueDate || t.status === "done") return false;
      return new Date(t.dueDate) < new Date();
    }).length,
  };

  return { areas, theme, setTheme, addTask, updateTaskStatus, updateTaskStyle, updateTaskText, deleteTask, toggleCollapse, stats };
}
