export type TaskStatus = "todo" | "in-progress" | "done";

export interface TaskTextStyle {
  size: "sm" | "base" | "lg" | "xl";
  weight: "light" | "normal" | "medium" | "semibold" | "bold";
  color: string;
}

export interface TaskComment {
  id: string;
  text: string;
  createdAt: string;
}

export interface RecurrenceRule {
  type: "weekly" | "monthly";
  daysOfWeek?: number[];
  dayOfMonth?: number;
  advanceDays: number;
}

export interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  style: TaskTextStyle;
  dueDate?: string;
  dueTime?: string;
  createdAt: string;
  comments: TaskComment[];
  recurrence?: RecurrenceRule;
  recurrenceSourceId?: string;
}

export interface TaskArea {
  id: string;
  name: string;
  icon: string;
  tasks: Task[];
  collapsed: boolean;
}

export type ThemeId = "mono-light" | "mono-dark" | "beige" | "cyan" | "lavender" | "rose" | "custom";

export interface CustomThemeColors {
  background: string;
  foreground: string;
  card: string;
  border: string;
}

export interface ThemeOption {
  id: ThemeId;
  name: string;
  preview: string;
}

export interface NotificationSettings {
  advanceTimes: number[]; // minutes before due (e.g. [90, 60, 30, 15])
  volume: number; // 0-1
  customSoundUrl?: string;
  popupTemplate: string; // e.g. "Opa, não esqueça de fazer {tarefas}"
  includeTaskNames: boolean;
  popupBorderColor: string;
  popupTextColor: string;
  popupTextSize: "sm" | "base" | "lg" | "xl";
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  advanceTimes: [30, 15],
  volume: 0.5,
  popupTemplate: "⏰ Ei, não esqueça de fazer {tarefas}!",
  includeTaskNames: true,
  popupBorderColor: "#3b82f6",
  popupTextColor: "#1e293b",
  popupTextSize: "base",
};
