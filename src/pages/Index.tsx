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
import { KanbanBoard } from "@/components/KanbanBoard";
import { TodayPanel } from "@/components/TodayPanel";
import { AddAreaDialog } from "@/components/AddAreaDialog";
import { NotificationPopup } from "@/components/NotificationPopup";
import { BackgroundLayer } from "@/components/BackgroundLayer";
import { ThemeDecorations } from "@/components/ThemeDecorations";
import { CardNavigation } from "@/components/CardNavigation";
import { PasswordGate } from "@/components/PasswordGate";
import { VoiceTaskDialog } from "@/components/VoiceTaskDialog";
import { ImageTaskDialog } from "@/components/ImageTaskDialog";
import { ClipboardList, LayoutDashboard, ImageIcon, Wrench } from "lucide-react";
import { MenuPage } from "@/components/MenuPage";
import { ImageConverter } from "@/components/ImageConverter";
import { ElectronTitleBar } from "@/components/ElectronTitleBar";
import { AppTab } from "@/lib/types";
import { isUnlocked } from "@/lib/crypto";
import { useEffect, useMemo } from "react";
import { useGoogleCalendarStore } from "@/hooks/useGoogleCalendarStore";
import { useGoogleCalendarSync } from "@/hooks/useGoogleCalendarSync";
import { GoogleCalendarSettingsPanel } from "@/components/GoogleCalendarSettings";

const AppContent = () => {
  const store = useTaskStore();
  const [glassMode, setGlassModeState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("glass-mode") === "on";
  });
  const setGlassMode = useCallback((v: boolean) => {
    setGlassModeState(v);
    try { localStorage.setItem("glass-mode", v ? "on" : "off"); } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.dataset.glass = v ? "on" : "off";
    }
  }, []);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.glass = glassMode ? "on" : "off";
    }
  }, [glassMode]);
  const notifStore = useNotificationStore();
  const investStore = useInvestmentStore();
  const bgStore = useBackgroundStore();
  const stockStore = useStockStore();
  const salaryStore = useSalaryStore();
  const { currentEvent, dismissEvent } = useNotificationSystem(
    store.allTasksWithArea,
    notifStore.settings,
    store.timezone,
    (refs, minutes) => {
      refs.forEach((r) => store.snoozeTask(r.areaId, r.taskId, minutes));
    },
  );

  // --- Google Calendar ---
  const gcal = useGoogleCalendarStore();
  const ensureTargetArea = useMemo(() => () => {
    if (gcal.settings.targetAreaId && store.areas.some(a => a.id === gcal.settings.targetAreaId)) {
      return gcal.settings.targetAreaId;
    }
    const existing = store.areas.find(a => a.name === "Agenda Google");
    if (existing) return existing.id;
    // Cria nova área
    store.addArea("Agenda Google", "📅");
    // addArea é assíncrono no estado; chamamos novamente no próximo tick.
    // Como fallback imediato: usa a primeira área disponível.
    return store.areas[0]?.id || "";
  }, [gcal.settings.targetAreaId, store]);

  const sync = useGoogleCalendarSync({
    areas: store.areas,
    timezone: store.timezone,
    settings: gcal.settings,
    setTaskGoogleMeta: store.setTaskGoogleMeta,
    upsertGoogleEvent: store.upsertGoogleEvent,
    updateTaskStatus: store.updateTaskStatus,
    addLog: gcal.addLog,
    ensureTargetArea,
  });

  const [activeTab, setActiveTab] = useState<AppTab>("tasks");
  const [addAreaOpen, setAddAreaOpen] = useState(false);
  const [voiceTaskOpen, setVoiceTaskOpen] = useState(false);
  const [imageTaskOpen, setImageTaskOpen] = useState(false);
  const [preloaderDone, setPreloaderDone] = useState(() => {
    if (sessionStorage.getItem("preloader-shown")) return true;
    return false;
  });

  // Atalhos globais: V → voz inteligente, I → imagem → tarefas
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.tagName === "SELECT")) return;
      if (e.key === "v" || e.key === "V") { e.preventDefault(); setVoiceTaskOpen(true); }
      else if (e.key === "i" || e.key === "I") { e.preventDefault(); setImageTaskOpen(true); }
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
    menu: { icon: LayoutDashboard, label: "Menu", color: "text-blue-500" },
    tools: { icon: Wrench, label: "Ferramentas", color: "text-emerald-500" },
  };

  const ActiveIcon = tabMeta[activeTab].icon;

  return (
    <>
      <ElectronTitleBar />
      {!preloaderDone && <Preloader onDone={handlePreloaderDone} />}
      {/* Base background color always present so theme decorations sit above it */}
      <div className="fixed inset-0 -z-20 bg-background" />
      <BackgroundLayer settings={bgStore.settings} />
      <ThemeDecorations theme={store.theme} enabled={store.showThemeDecorations} />

      <div className={`min-h-screen transition-all duration-500 ${preloaderDone ? "opacity-100" : "opacity-0"}`}>
        <CardNavigation active={activeTab} onChange={setActiveTab} />

        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b-2 border-border shadow-sm transition-colors duration-300">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 pl-16 sm:pl-20">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <ActiveIcon className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${tabMeta[activeTab].color}`} />
              <h1 className="text-base sm:text-xl font-bold tracking-tight truncate uppercase">{tabMeta[activeTab].label}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setImageTaskOpen(true)}
                title="Imagem → Tarefas (I)"
                className="p-2 rounded-md hover:bg-accent text-primary transition-colors"
              >
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
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
                glassMode={glassMode}
                onGlassModeChange={setGlassMode}
                googleCalendarSlot={
                  <GoogleCalendarSettingsPanel
                    settings={gcal.settings}
                    onUpdate={gcal.updateSettings}
                    log={gcal.log}
                    onClearLog={gcal.clearLog}
                    isConnected={sync.isConnected}
                    isSyncing={sync.isSyncing}
                    calendars={sync.calendars}
                    onConnect={sync.connect}
                    onDisconnect={sync.disconnect}
                    onSyncNow={sync.runSync}
                    onRefreshCalendars={sync.refreshCalendars}
                    areas={store.areas}
                  />
                }
              />
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-4 sm:px-8 py-5 sm:py-7 space-y-4 sm:space-y-6 pl-16 sm:pl-20 pr-4 sm:pr-8">
        
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
                onUpdateStatus={store.updateTaskStatus}
                onUpdateStyle={store.updateTaskStyle}
                onUpdateTime={store.updateTaskTime}
                onUpdateEnd={store.updateTaskEnd}
                onUpdatePriority={store.updateTaskPriority}
                onUpdateTags={store.updateTaskTags}
                onMoveTask={store.moveTask}
                onDeleteTask={store.deleteTask}
                onDeleteArea={store.deleteArea}
                onAddSubtask={store.addSubtaskTo}
                onToggleSubtask={store.toggleSubtaskOf}
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
          {activeTab === "menu" && (
            <MenuPage
              invest={investStore}
              stocks={stockStore}
              salary={salaryStore}
              onCreateTaskReminder={handleCreateTaskReminder}
            />
          )}
          {activeTab === "tools" && <ImageConverter />}
        </main>

        <TodayPanel
          tasks={store.todayTasks}
          onMarkDone={(areaId, taskId) => store.updateTaskStatus(areaId, taskId, "done")}
          onUpdateTime={store.updateTaskTime}
          onUpdateEnd={store.updateTaskEnd}
        />

        <NotificationPopup
          event={currentEvent}
          settings={notifStore.settings}
          onDismiss={dismissEvent}
          onSnooze={(refs, minutes) => {
            refs.forEach(({ areaId, taskId }) => store.snoozeTask(areaId, taskId, minutes));
          }}
        />

        <ImageTaskDialog
          open={imageTaskOpen}
          onOpenChange={setImageTaskOpen}
          areas={store.areas.map(a => ({ id: a.id, name: a.name, icon: a.icon }))}
          tags={store.tags}
          timezone={store.timezone}
          onCreateTasks={(items) => {
            items.forEach(({ areaId, input }) => store.addTaskFull(areaId, input));
            setActiveTab("tasks");
          }}
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
