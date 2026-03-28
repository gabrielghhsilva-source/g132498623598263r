import { useState, useCallback } from "react";
import { useTaskStore } from "@/hooks/useTaskStore";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";
import { useInvestmentStore } from "@/hooks/useInvestmentStore";
import { useBackgroundStore } from "@/hooks/useBackgroundStore";
import { useStockStore } from "@/hooks/useStockStore";
import { useSalaryStore } from "@/hooks/useSalaryStore";
import { Preloader } from "@/components/Preloader";
import { SettingsMenu } from "@/components/SettingsMenu";
import { StatsBar } from "@/components/StatsBar";
import { DraggableAreaList } from "@/components/DraggableAreaList";
import { TodayPanel } from "@/components/TodayPanel";
import { AddAreaDialog } from "@/components/AddAreaDialog";
import { NotificationPopup } from "@/components/NotificationPopup";
import { BackgroundLayer } from "@/components/BackgroundLayer";
import { CardNavigation } from "@/components/CardNavigation";
import { InvestmentDashboard } from "@/components/InvestmentDashboard";
import { StockMarket } from "@/components/StockMarket";
import { SalaryPanel } from "@/components/SalaryPanel";
import { PasswordGate } from "@/components/PasswordGate";
import { ClipboardList, TrendingUp, BarChart3, Wallet } from "lucide-react";
import { AppTab } from "@/lib/types";
import { isUnlocked } from "@/lib/crypto";

const AppContent = () => {
  const store = useTaskStore();
  const notifStore = useNotificationStore();
  const investStore = useInvestmentStore();
  const bgStore = useBackgroundStore();
  const stockStore = useStockStore();
  const salaryStore = useSalaryStore();
  const { currentEvent, dismissEvent } = useNotificationSystem(
    store.allTasksWithArea,
    notifStore.settings,
    store.timezone,
  );

  const [activeTab, setActiveTab] = useState<AppTab>("tasks");
  const [preloaderDone, setPreloaderDone] = useState(() => {
    if (sessionStorage.getItem("preloader-shown")) return true;
    return false;
  });

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
      <BackgroundLayer settings={bgStore.settings} />

      <div className={`min-h-screen transition-all duration-500 ${preloaderDone ? "opacity-100" : "opacity-0"} ${bgStore.settings.mode !== "none" ? "" : "bg-background"}`}>
        <CardNavigation active={activeTab} onChange={setActiveTab} />

        <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border transition-colors duration-300">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between pl-20">
            <div className="flex items-center gap-3">
              <ActiveIcon className={`w-6 h-6 ${tabMeta[activeTab].color}`} />
              <h1 className="text-xl font-bold tracking-tight">{tabMeta[activeTab].label}</h1>
            </div>
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
            />
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 pl-20 pr-12 sm:pr-6">
          {activeTab === "tasks" && (
            <>
              <StatsBar stats={store.stats} />
              <DraggableAreaList
                areas={store.areas}
                timezone={store.timezone}
                onReorder={store.reorderAreas}
                onToggleCollapse={store.toggleCollapse}
                onAddTask={(areaId, text, date, rec, time) => store.addTask(areaId, text, date, rec, time)}
                onUpdateStatus={store.updateTaskStatus}
                onUpdateStyle={store.updateTaskStyle}
                onUpdateText={store.updateTaskText}
                onDeleteTask={store.deleteTask}
                onDeleteArea={store.deleteArea}
                onAddComment={store.addComment}
                onDeleteComment={store.deleteComment}
              />
              <AddAreaDialog onAdd={store.addArea} />
            </>
          )}
          {activeTab === "investments" && (
            <InvestmentDashboard
              areas={investStore.areas}
              onAddArea={investStore.addArea}
              onDeleteArea={investStore.deleteArea}
              onAddInvestment={investStore.addInvestment}
              onDeleteInvestment={investStore.deleteInvestment}
              onAddContribution={investStore.addContribution}
              onAddGoal={investStore.addGoal}
              onDeleteGoal={investStore.deleteGoal}
              onAddDebt={investStore.addDebt}
              onDeleteDebt={investStore.deleteDebt}
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
              investmentAreas={investStore.areas}
              stockPositions={stockStore.positions}
              onSetSalary={salaryStore.setSalary}
              onAddExpense={salaryStore.addExpense}
              onDeleteExpense={salaryStore.deleteExpense}
            />
          )}
        </main>

        <TodayPanel
          tasks={store.todayTasks}
          onMarkDone={(areaId, taskId) => store.updateTaskStatus(areaId, taskId, "done")}
        />

        <NotificationPopup
          event={currentEvent}
          settings={notifStore.settings}
          onDismiss={dismissEvent}
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
