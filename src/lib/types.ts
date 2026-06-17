export type TaskStatus = "todo" | "in-progress" | "done";

export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string; order: number }> = {
  urgent: { label: "Urgente", color: "#ef4444", order: 0 },
  high:   { label: "Alta",    color: "#f97316", order: 1 },
  medium: { label: "Média",   color: "#eab308", order: 2 },
  low:    { label: "Baixa",   color: "#3b82f6", order: 3 },
  none:   { label: "Nenhuma", color: "#94a3b8", order: 4 },
};

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

export interface TaskTag {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
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
  endDate?: string;
  endTime?: string;
  createdAt: string;
  comments: TaskComment[];
  recurrence?: RecurrenceRule;
  recurrenceSourceId?: string;
  priority?: TaskPriority;
  tagIds?: string[];
  subtasks?: Subtask[];
  // Google Calendar sync metadata
  googleEventId?: string;
  googleCalendarId?: string;
  googleLastHash?: string;
  googleSyncedAt?: string;
  autoStatus?: boolean;
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

// Notification types
export interface NotificationSettings {
  advanceTimes: number[];
  volume: number;
  customSoundUrl?: string;
  popupTemplate: string;
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

// Background types
export type BackgroundMode = "none" | "solid" | "gradient" | "animated-gradient" | "particles" | "image";

export interface BackgroundSettings {
  mode: BackgroundMode;
  solidColor: string;
  gradientColors: string[];
  gradientAngle: number;
  animationSpeed: number;
  animationIntensity: number;
  particleColor: string;
  particleDirection: "up" | "down" | "left" | "right" | "random";
  particleCount: number;
  imageUrl: string;
}

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  mode: "none",
  solidColor: "#1a1a2e",
  gradientColors: ["#0f0c29", "#302b63", "#24243e"],
  gradientAngle: 135,
  animationSpeed: 5,
  animationIntensity: 50,
  particleColor: "#ffffff",
  particleDirection: "up",
  particleCount: 50,
  imageUrl: "",
};

// Investment types
export interface InvestmentArea {
  id: string;
  name: string;
  color: string;
  logoEmoji: string;
  investments: Investment[];
  goals: InvestmentGoal[];
  debts: Debt[];
}

export interface MonthlyOverride {
  month: number; // 0-11
  year: number;
  amount: number;
}

export interface Investment {
  id: string;
  name: string;
  initialValue: number;
  previouslyInvested: number;
  monthlyContribution: number;
  rateOfReturn: number;
  rateType: "monthly" | "annual";
  passiveIncome: number;
  startDate: string;
  contributions: ContributionRecord[];
  monthlyOverride?: MonthlyOverride;
  /** Múltiplo mínimo para aportes (ex: 100 → só aceita 100, 200, 300...). */
  contributionStep?: number;
  /** Sugestões clicáveis de valores rápidos. */
  quickAmounts?: number[];
}

export interface ContributionRecord {
  id: string;
  date: string;
  amount: number;
}

export interface Debt {
  id: string;
  name: string;
  monthlyAmount: number;
}

export interface InvestmentGoal {
  id: string;
  name: string;
  targetAmount: number;
}

// Stock types
export interface StockPosition {
  id: string;
  symbol: string;
  shares: number;
  avgPrice: number;
  purchaseDate: string;
}

// Salary types
export interface ManualExpense {
  id: string;
  name: string;
  amount: number;
  recurring?: boolean;
}

export interface ManualIncome {
  id: string;
  name: string;
  amount: number;
}

export interface SalaryData {
  salary: number;
  manualExpenses: ManualExpense[];
  manualIncomes: ManualIncome[];
}

export const DEFAULT_SALARY_DATA: SalaryData = {
  salary: 0,
  manualExpenses: [],
  manualIncomes: [],
};

// Navigation
export type AppTab = "tasks" | "menu" | "tools";
export type MenuSection = "overview" | "financial" | "debts";

// Debt management
export interface DebtItem {
  id: string;
  name: string;
  amount: number;
  dueDate?: string; // ISO yyyy-mm-dd
  category?: string;
  paid: boolean;
  paidAt?: string;
  recurring?: boolean;
  createdAt: string;
}

