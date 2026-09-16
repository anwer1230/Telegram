import { useState, useEffect, useCallback } from "react";
import { DirectJoinEvent, RotatingBroadcastLog, AutoJoinLog } from "../types";

export interface LiveEventNotification {
  id: string;
  type: "search_dialog" | "search_found" | "auto_join" | "direct_join" | "rotating_log";
  title: string;
  message: string;
  timestamp: string;
}

export interface ActivityEvent {
  id: string;
  type: "success" | "warning" | "info";
  title: string;
  message: string;
  time: string;
}

export function useTelegramEvents() {
  const [liveLogs, setLiveLogs] = useState<RotatingBroadcastLog[]>([]);
  const [notifications, setNotifications] = useState<LiveEventNotification[]>([
    {
      id: "notif-1",
      type: "direct_join",
      title: "انضمام تلقائي ناجح",
      message: "تم الانضمام إلى مجموعة: عقارات ومزادات الخليج وحفظ الرابط في الرسائل المحفوظة",
      timestamp: "منذ دقيقتين",
    },
    {
      id: "notif-2",
      type: "rotating_log",
      title: "إرسال متسلسل دوري",
      message: "تم بث الرسالة الترويجية رقم 3 على مجموعة التسويق الحديث",
      timestamp: "منذ 7 دقائق",
    },
  ]);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([
    {
      id: "act-1",
      type: "success",
      title: "🔄 [متسلسل] إرسال ناجح",
      message: "تم إرسال الرسالة رقم 2 إلى https://t.me/marketing_saudi_hub بنجاح",
      time: "منذ دقيقة",
    },
    {
      id: "act-2",
      type: "info",
      title: "📡 [مراقب دائم] رصد رابط جديد",
      message: "تم فحص الرابط https://t.me/gulf_business_deals والانضمام المباشر",
      time: "منذ 4 دقائق",
    },
    {
      id: "act-3",
      type: "success",
      title: "🧠 [رد ذكي] إجابة آلية",
      message: "تم الرد على استفسار العميل في المحادثة الخاصة بدرجة ثقة 96%",
      time: "منذ 11 دقيقة",
    },
    {
      id: "act-4",
      type: "warning",
      title: "🛡️ [حماية وتنقية] تفعيل نمط سلام",
      message: "إرسال تحية ذكية أولاً لتجاوز بوت الحماية Rose بنجاح",
      time: "منذ 18 دقيقة",
    },
  ]);
  const [systemMetrics, setSystemMetrics] = useState({
    activeThreads: 2,
    daemonPing: 42,
    memoryUsageMB: 124,
    uptime: "99.98%",
  });
  const [activeSession, setActiveSession] = useState({
    isConnected: true,
    userPhone: "+966 50 *** 8921",
    accountName: "مؤسسة الحلول التسويقية",
    mtprotoStatus: "متصل (Online)",
    ping: 48,
  });

  const pushNotification = useCallback((type: LiveEventNotification["type"], title: string, message: string) => {
    const newNotif: LiveEventNotification = {
      id: "notif-" + Date.now() + Math.random().toString(36).substring(2, 5),
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString("ar-SA"),
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
  }, []);

  const pushLiveLog = useCallback((log: RotatingBroadcastLog) => {
    setLiveLogs((prev) => [log, ...prev.slice(0, 49)]);
  }, []);

  // Connect to SSE real-time stream with automatic poll fallback
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackPollTimer: any = null;

    const setupSSE = () => {
      try {
        eventSource = new EventSource("/api/events/stream");

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data || !data.title) return;

            // Trigger subtle tactile feedback on mobile if supported
            if (typeof window !== "undefined" && "vibrate" in navigator) {
              try {
                navigator.vibrate(30);
              } catch {
                // ignore
              }
            }

            const notif: LiveEventNotification = {
              id: data.id || "sse-" + Date.now(),
              type: data.category || "direct_join",
              title: data.title,
              message: data.message,
              timestamp: data.timestamp || new Date().toLocaleTimeString("ar-SA"),
            };

            setNotifications((prev) => {
              if (prev.some((p) => p.id === notif.id)) return prev;
              return [notif, ...prev.slice(0, 24)];
            });

            const actType = data.type === "warning" ? "warning" : data.type === "info" ? "info" : "success";
            const activity: ActivityEvent = {
              id: "act-" + (data.id || Date.now()),
              type: actType,
              title: data.title,
              message: data.message,
              time: data.timestamp || new Date().toLocaleTimeString("ar-SA"),
            };

            setRecentEvents((prev) => {
              if (prev.some((p) => p.id === activity.id)) return prev;
              return [activity, ...prev.slice(0, 19)];
            });
          } catch (e) {
            console.warn("SSE parse error", e);
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          // Switch to polling if SSE encounters an error
          if (!fallbackPollTimer) {
            fallbackPollTimer = setInterval(pollLatest, 6000);
          }
        };
      } catch (e) {
        if (!fallbackPollTimer) {
          fallbackPollTimer = setInterval(pollLatest, 6000);
        }
      }
    };

    const pollLatest = async () => {
      try {
        const res = await fetch("/api/events/latest");
        const json = await res.json();
        if (json.success && Array.isArray(json.events) && json.events.length > 0) {
          const latestItems: LiveEventNotification[] = json.events.slice(0, 15).map((e: any) => ({
            id: e.id,
            type: e.category || "direct_join",
            title: e.title,
            message: e.message,
            timestamp: e.timestamp,
          }));
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOnes = latestItems.filter((item) => !existingIds.has(item.id));
            if (newOnes.length === 0) return prev;
            return [...newOnes, ...prev].slice(0, 25);
          });
        }
      } catch (e) {
        // silent fallback
      }
    };

    // Initial fetch of latest events
    pollLatest();
    setupSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (fallbackPollTimer) clearInterval(fallbackPollTimer);
    };
  }, []);

  const clearNotifications = useCallback(async () => {
    setNotifications([]);
    try {
      await fetch("/api/events/clear", { method: "POST" });
    } catch {
      // ignore
    }
  }, []);

  return {
    liveLogs,
    notifications,
    recentEvents,
    systemMetrics,
    activeSession,
    pushNotification,
    pushLiveLog,
    clearNotifications,
  };
}
