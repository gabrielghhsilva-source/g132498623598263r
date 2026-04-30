import { useState, useCallback } from "react";
import { useTaskStore } from "@/hooks/useTaskStore";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";
import { useInvestmentStore } from "@/hooks/useInvestmentStore";
import { useBackgroundStore } from "@/hooks/useBackgroundStore";
import { useStockStore } from "@/hooks/useStockStore";
import { useSalaryStore } from "@/hooks/useSalaryStore";
import { useXpStore } from "@/hooks/useXpStore";
import { Preloader } from "@/components/Preloader";
import { SettingsMenu } from "@/components/SettingsMenu";
import { StatsBar } from "@/components/StatsBar";
import { LevelBadge } from "@/components/LevelBadge";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TodayPanel } from "@/components/TodayPanel";
import { AddAreaDialog } from "@/components/AddAreaDialog";
import { NotificationPopup } from "@/components/NotificationPopup";
import { BackgroundLayer } from "@/components/BackgroundLayer";
import { ThemeDecorations } from "@/components/ThemeDecorations";
import { CardNavigation } from "@/components/CardNavigation";
import { InvestmentDashboard } from "@/components/InvestmentDashboard";
import { StockMarket } from "@/components/StockMarket";
import { SalaryPanel } from "@/components/SalaryPanel";
import { PasswordGate } from "@/components/PasswordGate";
import { VoiceTaskDialog } from "@/components/VoiceTaskDialog";
import { GodzillaPet } from "@/components/GodzillaPet";
import { ClipboardList, TrendingUp, BarChart3, Wallet } from "lucide-react";
import { AppTab, TaskStatus } from "@/lib/types";
import { isUnlocked } from "@/lib/crypto";
import { useEffect } from "react";

const AppContent = () => {
  const store = useTaskStore();
  const notifStore = useNotificationStore();
  const investStore = useInvestmentStore();
  const bgStore = useBackgroundStore();
  const stockStore = useStockStore();
  const salaryStore = useSalaryStore();
  const xp = useXpStore();
  const { currentEvent, dismissEvent } = useNotificationSystem(
    store.allTasksWithArea,
    notifStore.settings,
    store.timezone,
    (refs, minutes) => {
      refs.forEach((r) => store.snoozeTask(r.areaId, r.taskId, minutes));
    },
  );

  // ===== XP wiring: intercept actions to award XP =====
  const handleUpdateStatus = useCallback((areaId: string, taskId: string, status: TaskStatus) => {
    const area = store.areas.find(a => a.id === areaId);
    const task = area?.tasks.find(t => t.id === taskId);
    const wasNotDone = task && task.status !== "done";
    store.updateTaskStatus(areaId, taskId, status);
    if (status === "done" && wasNotDone && task) {
      xp.awardTask({ task: { id: task.id, text: task.text, priority: task.priority, dueDate: task.dueDate, dueTime: task.dueTime, subtasks: task.subtasks } });
    }
  }, [store, xp]);

  const handleToggleSubtask = useCallback((areaId: string, taskId: string, subId: string) => {
    const area = store.areas.find(a => a.id === areaId);
    const task = area?.tasks.find(t => t.id === taskId);
    const sub = task?.subtasks?.find(s => s.id === subId);
    const wasNotDone = sub && !sub.done;
    store.toggleSubtaskOf(areaId, taskId, subId);
    if (wasNotDone && task) xp.awardSubtask(task.text);
  }, [store, xp]);

  const handleAddContribution = useCallback((areaId: string, investmentId: string, date: string, amount: number) => {
    investStore.addContribution(areaId, investmentId, date, amount);
    if (amount > 0) xp.awardContribution(investmentId, amount);
  }, [investStore, xp]);


  const [activeTab, setActiveTab] = useState<AppTab>("tasks");
  const [addAreaOpen, setAddAreaOpen] = useState(false);
  const [voiceTaskOpen, setVoiceTaskOpen] = useState(false);
  const [preloaderDone, setPreloaderDone] = useState(() => {
    if (sessionStorage.getItem("preloader-shown")) return true;
    return false;
  });

  // Atalho global tecla V → abre o modo voz inteligente
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "v" && e.key !== "V") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.tagName === "SELECT")) return;
      e.preventDefault();
      setVoiceTaskOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handlePreloaderDone = useCallback(() => {
    sessionStorage.setItem("preloader-shown", "true");
    setPreloaderDone(true);
  }, []);

  const handleCreateTaskReminder = useCallback((text: string) => {
    const area = store.areas.find(a => a.id === "investments") || store.areas[0];
    if (area) {
      store.addTask(area.id, text, new Date().toISOString().split("T")[0]);
    }
    setActiveTab("tasks");
  }, [store]);

  const tabMeta: Record<AppTab, { icon: typeof ClipboardList; label: string; color: string }> = {
    tasks: { icon: ClipboardList, label: "Minhas Tarefas", color: "text-primary" },
    investments: { icon: TrendingUp, label: "Investimentos", color: "text-green-500" },
    stocks: { icon: BarChart3, label: "Ações", color: "text-blue-500" },
    salary: { icon: Wallet, label: "Salário", color: "text-amber-500" },
  };

  const ActiveIcon = tabMeta[activeTab].icon;

  return (
    <>
      {!preloaderDone && <Preloader onDone={handlePreloaderDone} />}
      {/* Base background color always present so theme decorations sit above it */}
      <div className="fixed inset-0 -z-20 bg-background" />
      <BackgroundLayer settings={bgStore.settings} />
      <ThemeDecorations theme={store.theme} enabled={store.showThemeDecorations} />

      <div className={`min-h-screen transition-all duration-500 ${preloaderDone ? "opacity-100" : "opacity-0"}`}>
        <CardNavigation active={activeTab} onChange={setActiveTab} />

        <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border transition-colors duration-300">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 pl-16 sm:pl-20">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <ActiveIcon className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${tabMeta[activeTab].color}`} />
              <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">{tabMeta[activeTab].label}</h1>
            </div>
            <div className="flex items-center gap-2">
              <LevelBadge
                level={xp.progress.level}
                progress={xp.progress.progress}
                intoLevel={xp.progress.intoLevel}
                needed={xp.progress.needed}
                stageName={xp.activeStage.name}
                skinName={xp.activeSkin.name}
                streakDays={xp.state.streakDays}
                streakMultiplier={xp.streakMultiplier}
              />
              <button
                onClick={() => xp.devAddXp(500)}
                onContextMenu={(e) => { e.preventDefault(); xp.devResetXp(); }}
                title="Clique: +500 XP • Botão direito: resetar XP"
                className="px-2 py-2 rounded-lg border border-dashed border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
                aria-label="Dev: ganhar XP"
              >
                +500 XP
              </button>
              <SettingsMenu
                theme={store.theme}
                onThemeChange={store.setTheme}
                customColors={store.customColors}
                onCustomColorsChange={store.setCustomColors}
                timezone={store.timezone}
                onTimezoneChange={store.setTimezone}
                notificationSettings={notifStore.settings}
                onNotificationUpdate={notifStore.setSettings}
                onToggleAdvanceTime={notifStore.toggleAdvanceTime}
                onTestSound={notifStore.playTestSound}
                backgroundSettings={bgStore.settings}
                onBackgroundUpdate={bgStore.setSettings}
                buttonBgColor={store.buttonBgColor}
                buttonTextColor={store.buttonTextColor}
                onButtonBgChange={store.setButtonBgColor}
                onButtonTextChange={store.setButtonTextColor}
                showThemeDecorations={store.showThemeDecorations}
                onShowThemeDecorationsChange={store.setShowThemeDecorations}
                xpState={xp.state}
                xpProgress={xp.progress}
                xpStreakMult={xp.streakMultiplier}
                xpActiveSkin={xp.activeSkin}
                xpActiveStage={xp.activeStage}
                xpSetSelectedSkin={xp.setSelectedSkin}
              />
            </div>
          </div>
        </header>

        <main className={`${activeTab === "tasks" ? "max-w-[1600px]" : "max-w-4xl"} mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pl-16 sm:pl-20 pr-3 sm:pr-6`}>
          {activeTab === "tasks" && (
            <>
              <StatsBar stats={store.stats} />
              <KanbanBoard
                areas={store.areas}
                tags={store.tags}
                timezone={store.timezone}
                onAddTaskFull={store.addTaskFull}
                onAddTaskQuick={(areaId, text) => store.addTask(areaId, text)}
                onUpdateText={store.updateTaskText}
                onUpdateStatus={handleUpdateStatus}
                onUpdateStyle={store.updateTaskStyle}
                onUpdateTime={store.updateTaskTime}
                onUpdatePriority={store.updateTaskPriority}
                onUpdateTags={store.updateTaskTags}
                onMoveTask={store.moveTask}
                onDeleteTask={store.deleteTask}
                onDeleteArea={store.deleteArea}
                onAddSubtask={store.addSubtaskTo}
                onToggleSubtask={handleToggleSubtask}
                onDeleteSubtask={store.deleteSubtaskOf}
                onUpdateSubtaskText={store.updateSubtaskTextOf}
                onAddComment={store.addComment}
                onDeleteComment={store.deleteComment}
                onAddTag={store.addTag}
                onDeleteTag={store.deleteTag}
                onAddArea={() => setAddAreaOpen(true)}
              />
              <AddAreaDialog
                onAdd={store.addArea}
                open={addAreaOpen}
                onOpenChange={setAddAreaOpen}
                hideTrigger
              />
            </>
          )}
          {activeTab === "investments" && (
            <InvestmentDashboard
              areas={investStore.areas}
              onAddArea={investStore.addArea}
              onDeleteArea={investStore.deleteArea}
              onAddInvestment={investStore.addInvestment}
              onDeleteInvestment={investStore.deleteInvestment}
              onAddContribution={handleAddContribution}
              onAddGoal={investStore.addGoal}
              onDeleteGoal={investStore.deleteGoal}
              onAddDebt={investStore.addDebt}
              onDeleteDebt={investStore.deleteDebt}
              onSetMonthlyOverride={investStore.setMonthlyOverride}
              onCreateTaskReminder={handleCreateTaskReminder}
            />
          )}
          {activeTab === "stocks" && (
            <StockMarket
              positions={stockStore.positions}
              onAdd={stockStore.addPosition}
              onRemove={stockStore.removePosition}
            />
          )}
          {activeTab === "salary" && (
            <SalaryPanel
              salary={salaryStore.data.salary}
              manualExpenses={salaryStore.data.manualExpenses}
              manualIncomes={salaryStore.data.manualIncomes || []}
              investmentAreas={investStore.areas}
              stockPositions={stockStore.positions}
              onSetSalary={salaryStore.setSalary}
              onAddExpense={salaryStore.addExpense}
              onDeleteExpense={salaryStore.deleteExpense}
              onAddIncome={salaryStore.addIncome}
              onDeleteIncome={salaryStore.deleteIncome}
            />
          )}
        </main>

        <TodayPanel
          tasks={store.todayTasks}
          onMarkDone={(areaId, taskId) => handleUpdateStatus(areaId, taskId, "done")}
          onUpdateTime={store.updateTaskTime}
        />

        <NotificationPopup
          event={currentEvent}
          settings={notifStore.settings}
          onDismiss={dismissEvent}
          onSnooze={(refs, minutes) => {
            refs.forEach(({ areaId, taskId }) => store.snoozeTask(areaId, taskId, minutes));
          }}
        />

        <GodzillaPet
          overrideSprite={xp.activeStage.idleSprite}
          overrideWalkFrames={xp.activeStage.walkFrames}
          effects={xp.activeSkin.effects.filter(e => xp.progress.level >= e.fromLevel)}
        />

        <VoiceTaskDialog
          open={voiceTaskOpen}
          onOpenChange={setVoiceTaskOpen}
          areas={store.areas.map(a => ({ id: a.id, name: a.name, icon: a.icon }))}
          tags={store.tags}
          timezone={store.timezone}
          onCreateTasks={(items) => {
            items.forEach(({ areaId, input }) => store.addTaskFull(areaId, input));
            setActiveTab("tasks");
          }}
        />
      </div>
    </>
  );
};

// Outer component: password gate
const Index = () => {
  const [unlocked, setUnlocked] = useState(() => isUnlocked());

  if (!unlocked) {
    return <PasswordGate onUnlocked={() => setUnlocked(true)} />;
  }

  return <AppContent />;
};

export default Index;
