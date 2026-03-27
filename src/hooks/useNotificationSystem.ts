import { useEffect, useRef, useState, useCallback } from "react";
import { Task, NotificationSettings } from "@/lib/types";
import { minutesUntilDue, getNowInTimezone } from "@/lib/timeUtils";

interface NotificationEvent {
  id: string;
  taskNames: string[];
  advanceMinutes: number;
}

interface TodayTask extends Task {
  areaName: string;
  areaIcon: string;
  areaId: string;
}

export function useNotificationSystem(
  allTasks: { task: Task; areaName: string }[],
  settings: NotificationSettings,
  timezone: string,
) {
  const [currentEvent, setCurrentEvent] = useState<NotificationEvent | null>(null);
  const firedRef = useRef<Set<string>>(new Set());

  const playSound = useCallback((volume: number, customUrl?: string) => {
    if (customUrl) {
      const audio = new Audio(customUrl);
      audio.volume = volume;
      audio.play().catch(() => {});
      return;
    }
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 830;
      osc.type = "sine";
      gain.gain.value = volume;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  useEffect(() => {
    if (settings.advanceTimes.length === 0) return;

    const check = () => {
      const pendingTasks = allTasks.filter(
        ({ task }) => task.dueDate && task.dueTime && task.status !== "done"
      );

      for (const advMin of settings.advanceTimes) {
        const matching: string[] = [];
        const matchingNames: string[] = [];

        for (const { task } of pendingTasks) {
          const mins = minutesUntilDue(task.dueDate!, task.dueTime, timezone);
          // Fire if within a 1-minute window of the advance time
          if (mins >= advMin - 1 && mins <= advMin + 1) {
            const key = `${task.id}-${advMin}`;
            if (!firedRef.current.has(key)) {
              firedRef.current.add(key);
              matching.push(task.id);
              matchingNames.push(task.text);
            }
          }
        }

        if (matching.length > 0) {
          // Browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            const body = matchingNames.join(", ");
            new Notification(`⏰ Tarefa em ${advMin} minuto${advMin !== 1 ? "s" : ""}`, {
              body,
              icon: "/placeholder.svg",
            });
          }

          // Sound
          playSound(settings.volume, settings.customSoundUrl);

          // In-app popup
          setCurrentEvent({
            id: `${Date.now()}-${advMin}`,
            taskNames: matchingNames,
            advanceMinutes: advMin,
          });
        }
      }

      // Also check for tasks due right now (0 minutes)
      const dueNow: string[] = [];
      const dueNowNames: string[] = [];
      for (const { task } of pendingTasks) {
        const mins = minutesUntilDue(task.dueDate!, task.dueTime, timezone);
        if (mins >= -1 && mins <= 1) {
          const key = `${task.id}-0`;
          if (!firedRef.current.has(key)) {
            firedRef.current.add(key);
            dueNow.push(task.id);
            dueNowNames.push(task.text);
          }
        }
      }

      if (dueNow.length > 0) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("⏰ Tarefa agora!", {
            body: dueNowNames.join(", "),
            icon: "/placeholder.svg",
          });
        }
        playSound(settings.volume, settings.customSoundUrl);
        setCurrentEvent({
          id: `${Date.now()}-now`,
          taskNames: dueNowNames,
          advanceMinutes: 0,
        });
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [allTasks, settings, timezone, playSound]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const dismissEvent = useCallback(() => setCurrentEvent(null), []);

  return { currentEvent, dismissEvent };
}
