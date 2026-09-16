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

  // Periodic heartbeat / simulated background daemon events
  useEffect(() => {
    const interval = setInterval(() => {
      const chance = Math.random();
      if (chance > 0.7) {
        const timeStr = new Date().toLocaleTimeString("ar-SA");
        pushNotification(
          "direct_join",
          "الانضمام المباشر (DirectLinkJoinService)",
          "رصد رابط t.me جديد في محادثة عامة والتحقق من صلاحيته عبر MTProto..."
        );
        setRecentEvents((prev) => [
          {
            id: "act-" + Date.now(),
            type: "info",
            title: "📡 [مراقب الروابط] تدفق لحظي",
            message: "التحقق من رابط جديد ورصد الفاصل الزمني للأمان",
            time: timeStr,
          },
          ...prev.slice(0, 15),
        ]);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [pushNotification]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
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
