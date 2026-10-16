import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useLocation } from 'wouter';
import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode, type Key } from 'react';
import {
  Archive, ArrowDown, Bell, Check, CheckCheck, ChevronLeft, FileText, Image as ImageIcon,
  Info, LockKeyhole, Menu, MessageCircle, Mic, Moon, MoreVertical, Paperclip, Phone,
  Pin, Plus, Search, Send, Settings, ShieldCheck, SmilePlus, Sun, Trash2, UserPlus, Video, Volume2, X, Edit3, Users,
  Folder, Megaphone, Bot, Bookmark, Sparkles, Copy, Palette, Download
} from 'lucide-react';
import { NavigationDrawer, type DrawerAccount } from '@/components/NavigationDrawer';
import { ServicesCenter } from '@/components/ServicesCenter';
import { InAppServiceViewer } from '@/components/InAppServiceViewer';
import { AutoBroadcastModal } from '@/components/features/AutoBroadcastModal';
import { GroupMonitoringModal } from '@/components/features/GroupMonitoringModal';
import { AutoRepliesModal } from '@/components/features/AutoRepliesModal';
import { AccountsManagerModal } from '@/components/features/AccountsManagerModal';
import { OriginalPublishingMonitoringModal } from '@/components/features/OriginalPublishingMonitoringModal';
import { LearningSystemModal } from '@/components/features/LearningSystemModal';
import { RotatingBroadcastModal } from '@/components/features/RotatingBroadcastModal';
import { AutoJoinModal } from '@/components/features/AutoJoinModal';
import { SavedLinksModal } from '@/components/features/SavedLinksModal';
import { BatchMessagesModal } from '@/components/features/BatchMessagesModal';
import { MessageTemplatesModal, type MessageTemplate } from '@/components/features/MessageTemplatesModal';
import { ChatWallpaperModal, WALLPAPER_PRESETS, type WallpaperConfig } from '@/components/features/ChatWallpaperModal';
import { PWAInstallModal } from '@/components/features/PWAInstallModal';

type Chat = {
  id: string;
  name: string;
  initials: string;
  preview: string;
  time: string;
  color: string;
  online?: boolean;
  unread?: number;
  pinned?: boolean;
  archived?: boolean;
  kind?: string;
  avatarUrl?: string;
  participantsCount?: number;
  onlineCount?: number;
  about?: string;
};

type Message = {
  id: string;
  text: string;
  time: string;
  outgoing?: boolean;
  read?: boolean;
  reaction?: string;
  edited?: boolean;
  senderName?: string;
  senderId?: string;
  senderAvatar?: string;
  senderColor?: string;
  senderInitials?: string;
  replyTo?: {
    id: string;
    senderName?: string;
    text: string;
  };
};

type ApiChat = {
  id: string;
  name: string;
  preview: string;
  time: string | null;
  unread: number;
  pinned: boolean;
  archived: boolean;
  kind: string;
  online?: boolean;
  avatarUrl?: string;
  participantsCount?: number;
  onlineCount?: number;
  about?: string;
};

type AuthStatus = {
  authenticated: boolean;
  state: 'phone' | 'code' | 'password' | 'ready';
  user?: { id?: string; name: string; username: string; phone: string; avatarUrl?: string } | null;
  sessionString?: string;
};

const TG_SESSION_STORAGE_KEY = 'telegram_session_string';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const savedSession = typeof window !== 'undefined' ? localStorage.getItem(TG_SESSION_STORAGE_KEY) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> || {}),
  };
  if (savedSession && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${savedSession}`;
    headers['x-telegram-session'] = savedSession;
  }

  const controller = new AbortController();
  const timeoutMs = path.includes('/messages') && init?.method === 'POST' ? 15000 : 7000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`/api${path}`, {
      ...init,
      headers,
      credentials: 'include',
      signal: init?.signal || controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'REQUEST_FAILED');
    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function toChat(chat: ApiChat): Chat {
  const initials = chat.name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('') || 'ت';
  const colors = ['#ce8e49', '#4c8790', '#a86b85', '#8a9b5b', '#697db2', '#377c79'];
  const color = colors[Math.abs([...chat.id].reduce((total, char) => total + char.charCodeAt(0), 0)) % colors.length];
  return {
    id: chat.id,
    name: chat.name,
    initials,
    preview: chat.preview || 'لا توجد رسائل بعد',
    time: chat.time ? new Date(chat.time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '',
    color,
    unread: chat.unread || undefined,
    pinned: chat.pinned,
    archived: chat.archived,
    kind: chat.kind,
    avatarUrl: chat.avatarUrl,
    participantsCount: chat.participantsCount,
    onlineCount: chat.onlineCount,
    about: chat.about,
    online: chat.online || (chat.onlineCount !== undefined && chat.onlineCount > 0),
  };
}

function toMessage(message: {
  id: string;
  text: string;
  time: string | null;
  outgoing?: boolean;
  edited?: boolean;
  senderName?: string;
  senderId?: string;
  senderAvatar?: string;
  senderColor?: string;
  senderInitials?: string;
  replyTo?: { id: string; senderName?: string; text: string };
  reaction?: string;
}): Message {
  return {
    id: message.id,
    text: message.text,
    time: message.time ? new Date(message.time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '',
    outgoing: message.outgoing,
    read: message.outgoing,
    edited: message.edited,
    senderName: message.senderName,
    senderId: message.senderId,
    senderAvatar: message.senderAvatar,
    senderColor: message.senderColor,
    senderInitials: message.senderInitials,
    replyTo: message.replyTo,
    reaction: message.reaction,
  };
}

const storage = {
  get<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } },
  set(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* local-only prototype */ } },
};

function Avatar({
  chat,
  size = 'md',
  className = '',
}: {
  chat: { initials: string; color: string; avatarUrl?: string; name?: string };
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const dimensions =
    size === 'lg'
      ? 'h-16 w-16 text-xl'
      : size === 'sm'
      ? 'h-9 w-9 text-xs'
      : size === 'xs'
      ? 'h-7 w-7 text-[10px]'
      : 'h-12 w-12 text-sm';

  if (chat.avatarUrl && !imgError) {
    return (
      <img
        src={chat.avatarUrl}
        alt={chat.name || chat.initials}
        onError={() => setImgError(true)}
        className={`avatar ${dimensions} object-cover rounded-full select-none shrink-0 border border-border/40 shadow-xs ${className}`}
      />
    );
  }

  return (
    <div
      className={`avatar ${dimensions} select-none shrink-0 font-bold ${className}`}
      style={{ background: `linear-gradient(145deg, ${chat.color}, hsl(var(--primary) / .75))` }}
      aria-hidden="true"
    >
      {chat.initials}
    </div>
  );
}

function IconButton({ label, children, onClick, active = false, className = '' }: { label: string; children: ReactNode; onClick?: () => void; active?: boolean; className?: string }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} data-testid={`button-${label}`} className={`grid h-10 w-10 place-items-center rounded-xl transition-all hover:bg-[hsl(var(--primary)/.1)] active:scale-95 ${active ? 'bg-[hsl(var(--primary)/.12)] text-primary' : 'text-muted-foreground'} ${className}`}>{children}</button>;
}

function ChatRow({ chat, selected, onSelect }: { key?: Key; chat: Chat; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} data-testid={`chat-row-${chat.id}`} className={`group flex w-full items-center gap-3 px-4 py-3 text-right transition-all ${selected ? 'bg-[hsl(var(--primary)/.12)]' : 'hover:bg-[hsl(var(--primary)/.055)]'}`}>
    <div className="relative"><Avatar chat={chat} /><span className={`absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-card ${chat.online ? 'bg-[#7dbd8a]' : 'bg-muted-foreground/30'}`} /></div>
    <div className="min-w-0 flex-1 border-b border-border/50 pb-3 pt-0.5 group-last:border-0">
      <div className="flex items-center gap-2"><span className="truncate text-[13px] font-bold">{chat.name}</span>{chat.pinned && <Pin size={12} className="fill-accent text-accent" />}<span className="mr-auto font-mono-app text-[10px] text-muted-foreground">{chat.time}</span></div>
      <div className="mt-1 flex items-center gap-2"><p className="truncate text-[11px] leading-5 text-muted-foreground">{chat.preview}</p>{chat.unread && <span className="mr-auto grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{chat.unread}</span>}</div>
    </div>
  </button>;
}

function LoadingList() {
  return <div className="space-y-4 p-4" aria-label="جار التحميل"><div className="h-12 w-full animate-pulse rounded-xl bg-muted" />{[1, 2, 3, 4].map(i => <div className="flex gap-3" key={i}><div className="h-12 w-12 animate-pulse rounded-full bg-muted" /><div className="flex-1 space-y-2 pt-1"><div className="h-3 w-2/5 animate-pulse rounded bg-muted" /><div className="h-3 w-4/5 animate-pulse rounded bg-muted" /></div></div>)}</div>;
}

function EmptyState({ search }: { search: string }) {
  return <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground"><div className="mb-4 grid h-16 w-16 place-items-center rounded-[22px] bg-secondary text-primary"><Search size={25} /></div><h3 className="text-sm font-bold text-foreground">{search ? 'لا توجد نتائج' : 'لا توجد محادثات هنا'}</h3><p className="mt-2 max-w-[220px] text-[11px] leading-6">{search ? 'جرّب البحث باسم مختلف أو كلمة أخرى.' : 'المحادثات المؤرشفة ستظهر هنا.'}</p></div>;
}

function ProfilePanel({ chat, onClose, onSettings }: { chat: Chat; onClose: () => void; onSettings: () => void }) {
  const isChannel = chat.kind === 'channel';
  const isGroup = chat.kind === 'group';

  return (
    <aside className="absolute inset-y-0 left-0 z-30 w-full max-w-[360px] border-r border-border bg-card soft-shadow fade-up overflow-y-auto" dir="rtl">
      <div className="flex h-[74px] items-center gap-3 border-b border-border px-5">
        <IconButton label="إغلاق الملف" onClick={onClose}>
          <ChevronLeft size={20} />
        </IconButton>
        <h2 className="text-sm font-bold">الملف التعريفي</h2>
      </div>

      <div className="flex flex-col items-center border-b border-border px-6 py-7">
        <Avatar chat={chat} size="lg" />
        <h3 className="mt-3 text-lg font-bold text-center leading-snug">{chat.name}</h3>

        {/* Real Subscriber / Member / Online Status */}
        <p className="mt-1 text-xs text-muted-foreground text-center">
          {isChannel
            ? (chat.participantsCount ? `${chat.participantsCount.toLocaleString('ar-SA')} مشترك` : 'قناة تيليجرام')
            : isGroup
            ? `${chat.participantsCount ? `${chat.participantsCount.toLocaleString('ar-SA')} عضو` : 'مجموعة تيليجرام'}${
                chat.onlineCount ? ` · ${chat.onlineCount.toLocaleString('ar-SA')} متصل حالياً` : ''
              }`
            : (chat.online ? 'متصل الآن' : 'آخر ظهور مؤخراً')}
        </p>

        {/* Live Counters Badges */}
        {(chat.participantsCount !== undefined || (chat.onlineCount !== undefined && chat.onlineCount > 0)) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {chat.participantsCount !== undefined && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold shadow-xs">
                <Users size={14} />
                <span>{chat.participantsCount.toLocaleString('ar-SA')} {isChannel ? 'مشترك' : 'عضو'}</span>
              </div>
            )}
            {chat.onlineCount !== undefined && chat.onlineCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{chat.onlineCount.toLocaleString('ar-SA')} متصل حالياً</span>
              </div>
            )}
          </div>
        )}

        {/* About / Description if present */}
        {chat.about && (
          <div className="mt-5 w-full rounded-2xl bg-secondary/50 p-3.5 text-right border border-border/60">
            <span className="text-[10px] font-bold text-muted-foreground block mb-1">الوصف والنبذة</span>
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed select-text">{chat.about}</p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button className="rounded-xl bg-secondary px-4 py-2 text-[11px] font-bold text-secondary-foreground" data-testid="button-profile-call">
            <Phone size={14} className="ml-1 inline" /> اتصال
          </button>
          <button className="rounded-xl bg-secondary px-4 py-2 text-[11px] font-bold text-secondary-foreground" data-testid="button-profile-video">
            <Video size={14} className="ml-1 inline" /> فيديو
          </button>
        </div>
      </div>

      <div className="space-y-1 p-3">
        <button type="button" onClick={onSettings} data-testid="button-open-settings" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-xs hover:bg-muted">
          <Settings size={17} className="text-primary" /> إعدادات الحساب
        </button>
        <button type="button" data-testid="button-notifications" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-xs hover:bg-muted">
          <Bell size={17} className="text-primary" /> الإشعارات <span className="mr-auto text-[10px] text-muted-foreground">مفعّلة</span>
        </button>
        <button type="button" data-testid="button-privacy" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-xs hover:bg-muted">
          <ShieldCheck size={17} className="text-primary" /> الخصوصية والأمان
        </button>
      </div>
    </aside>
  );
}

function SettingsPanel({
  theme,
  setTheme,
  onClose,
  onAddAccount,
  onOpenAccounts,
  onOpenWallpaper,
  onOpenInstall,
  onLogout,
  user,
}: {
  theme: 'light' | 'dark';
  setTheme: (v: 'light' | 'dark') => void;
  onClose: () => void;
  onAddAccount: () => void;
  onOpenAccounts?: () => void;
  onOpenWallpaper?: () => void;
  onOpenInstall?: () => void;
  onLogout: () => void;
  user?: AuthStatus['user'];
}) {
  const initials = user?.name?.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('') || 'ت';
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="absolute inset-0 z-40 flex justify-end bg-[hsl(211_38%_12%/.28)] backdrop-blur-sm" dir="rtl">
      <section className="h-full w-full max-w-[420px] overflow-y-auto bg-card soft-shadow fade-up">
        <div className="sticky top-0 z-10 flex h-[74px] items-center gap-3 border-b border-border bg-card/95 px-5 backdrop-blur">
          <IconButton label="إغلاق الإعدادات" onClick={onClose}>
            <X size={19} />
          </IconButton>
          <h2 className="text-sm font-bold">الإعدادات</h2>
        </div>

        <div className="p-5">
          {/* User Profile Card */}
          <div className="mb-7 rounded-2xl bg-secondary/60 p-4 border border-border/50">
            <div className="flex items-center gap-3">
              {user?.avatarUrl && !imgErr ? (
                <img
                  src={user.avatarUrl}
                  alt={user?.name || 'حساب تيليجرام'}
                  onError={() => setImgErr(true)}
                  className="h-12 w-12 rounded-full object-cover border border-border/40 shadow-xs"
                />
              ) : (
                <div className="avatar h-12 w-12 bg-primary text-sm font-bold">{initials}</div>
              )}
              <div>
                <p className="text-sm font-bold">{user?.name || 'حساب Telegram'}</p>
                <p className="mt-1 font-latin text-[11px] text-muted-foreground">{user?.username || user?.phone || 'حساب متصل'}</p>
              </div>
              <Check size={17} className="mr-auto text-primary" />
            </div>
          </div>

          <h3 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">التفضيلات والمظهر</h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              data-testid="button-toggle-theme"
              className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-right text-xs hover:bg-muted"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/30 text-accent-foreground">
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </span>
              <span>
                <strong className="block">المظهر</strong>
                <small className="mt-1 block text-[10px] text-muted-foreground">
                  {theme === 'light' ? 'الوضع الفاتح' : 'الوضع الداكن'} · اضغط للتبديل
                </small>
              </span>
              <ArrowDown size={15} className="mr-auto text-muted-foreground" />
            </button>

            {/* Chat Wallpaper Customization */}
            {onOpenWallpaper && (
              <button
                type="button"
                onClick={onOpenWallpaper}
                data-testid="button-open-wallpaper"
                className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-right text-xs hover:bg-muted cursor-pointer"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Palette size={16} />
                </span>
                <span>
                  <strong className="block">خلفية المحادثات (Chat Wallpaper)</strong>
                  <small className="mt-1 block text-[10px] text-muted-foreground">
                    تخصيص أنماط تيليجرام، الألوان، والتدرجات
                  </small>
                </span>
                <ChevronLeft size={16} className="mr-auto text-muted-foreground" />
              </button>
            )}

            {onOpenInstall && (
              <button
                type="button"
                onClick={onOpenInstall}
                data-testid="button-open-pwa-install"
                className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-right text-xs hover:bg-muted cursor-pointer"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Download size={16} />
                </span>
                <span>
                  <strong className="block text-emerald-600 dark:text-emerald-400">تثبيت التطبيق على الجوال (PWA)</strong>
                  <small className="mt-1 block text-[10px] text-muted-foreground">
                    تثبيت كـ تطبيق أصلي مستقل على الشاشة الرئيسية لهاتفك
                  </small>
                </span>
                <span className="mr-auto px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  تثبيت
                </span>
              </button>
            )}

            <div className="flex items-center gap-3 px-4 py-4 text-xs">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-primary">
                <Volume2 size={16} />
              </span>
              <span>
                <strong className="block">الأصوات</strong>
                <small className="mt-1 block text-[10px] text-muted-foreground">صوت الإشعارات مفعّل</small>
              </span>
              <span className="mr-auto h-2 w-2 rounded-full bg-[#7dbd8a]" />
            </div>
          </div>

          <h3 className="mb-2 mt-7 px-2 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">الحساب والجلسات</h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            {onOpenAccounts && (
              <button
                type="button"
                onClick={onOpenAccounts}
                data-testid="button-manage-accounts"
                className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-right text-xs hover:bg-muted"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#4c8790]/20 text-[#4c8790]">
                  <Users size={16} />
                </span>
                <span>
                  <strong className="block">إدارة الحسابات وجلسات العمل</strong>
                  <small className="mt-1 block text-[10px] text-muted-foreground">التبديل بين الحسابات وإدارة الصلاحيات</small>
                </span>
                <ChevronLeft size={16} className="mr-auto text-muted-foreground" />
              </button>
            )}
            <button
              type="button"
              onClick={onAddAccount}
              data-testid="button-add-account"
              className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-right text-xs hover:bg-muted"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-primary">
                <UserPlus size={16} />
              </span>
              <span>
                <strong className="block">إضافة حساب</strong>
                <small className="mt-1 block text-[10px] text-muted-foreground">استخدم رقم هاتف آخر</small>
              </span>
              <Plus size={16} className="mr-auto text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              data-testid="button-logout"
              className="flex w-full items-center gap-3 px-4 py-4 text-right text-xs text-destructive hover:bg-destructive/5"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10">
                <LockKeyhole size={16} />
              </span>
              <span>
                <strong className="block">تسجيل الخروج</strong>
                <small className="mt-1 block text-[10px] text-muted-foreground">إغلاق جلسة Telegram الحالية</small>
              </span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <LockKeyhole size={12} /> جلسة Telegram محفوظة على الخادم فقط
          </div>
        </div>
      </section>
    </div>
  );
}

function AuthScreen({ onAuthenticated, onClose, modal = false }: { onAuthenticated: (status: AuthStatus) => void; onClose?: () => void; modal?: boolean }) {
  const [step, setStep] = useState<'phone' | 'code' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (step === 'phone') {
        await apiFetch<{ state: 'code' }>('/telegram/auth/start', { method: 'POST', body: JSON.stringify({ phone }) });
        setStep('code');
      } else if (step === 'code') {
        const result = await apiFetch<AuthStatus>('/telegram/auth/verify', { method: 'POST', body: JSON.stringify({ code }) });
        if (result.state === 'password') {
          setStep('password');
        } else {
          if (result.sessionString) {
            try {
              localStorage.setItem(TG_SESSION_STORAGE_KEY, result.sessionString);
            } catch {}
          }
          onAuthenticated(result);
        }
      } else {
        const result = await apiFetch<AuthStatus>('/telegram/auth/password', { method: 'POST', body: JSON.stringify({ password }) });
        if (result.sessionString) {
          try {
            localStorage.setItem(TG_SESSION_STORAGE_KEY, result.sessionString);
          } catch {}
        }
        onAuthenticated(result);
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'REQUEST_FAILED';
      const labels: Record<string, string> = {
        PHONE_NUMBER_INVALID: 'أدخل رقم الهاتف بصيغة دولية صحيحة مثل +966501234567.',
        PHONE_NUMBER_BANNED: 'رقم الهاتف هذا محظور في خوادم تيليجرام.',
        PHONE_CODE_INVALID: 'رمز التحقق غير صحيح. تأكد من الرمز المرسل في تطبيق تيليجرام.',
        PHONE_CODE_EXPIRED: 'انتهت صلاحية الرمز، اطلب رمزاً جديداً.',
        PASSWORD_HASH_INVALID: 'كلمة مرور التحقق بخطوتين غير صحيحة.',
        AUTH_SESSION_EXPIRED: 'انتهت جلسة التسجيل، ابدأ من جديد بإدخال رقم الهاتف.',
        FLOOD_WAIT: 'يرجى الانتظار قليلاً قبل المحاولة مجدداً (Flood Wait).',
        TELEGRAM_API_NOT_CONFIGURED: 'خدمة Telegram غير مهيأة في الخادم. أضف بيانات Telegram API ثم أعد المحاولة.',
      };
      setError(labels[message] || `تعذر إكمال العملية (${message}).`);
    } finally {
      setBusy(false);
    }
  };

  const content = <section className="w-full max-w-[420px] rounded-[28px] border border-border bg-card p-7 soft-shadow fade-up" dir="rtl">
    <div className="flex items-center justify-between">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><MessageCircle size={22} /></div>
      {onClose && <IconButton label="إغلاق التسجيل" onClick={onClose}><X size={18} /></IconButton>}
    </div>
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="font-mono-app text-[10px] uppercase tracking-[.18em] text-primary font-bold">Telegram Official Client</p>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400">MTProto Live</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold">{step === 'phone' ? 'تسجيل الدخول الفعلي' : step === 'code' ? 'تحقق من الرمز الرسمي' : 'كلمة مرور التحقق بخطوتين'}</h1>
      <p className="mt-2.5 text-xs leading-6 text-muted-foreground">
        {step === 'phone' ? 'سجّل الدخول برقم هاتف Telegram لتلقي رمز التحقق الفعلي مباشرة من خوادم تيليجرام.' : step === 'code' ? `أدخل الرمز الرسمي الذي أرسلته Telegram إلى الرقم ${phone}.` : 'هذا الحساب محمي بالتحقق بخطوتين (2FA). كلمة المرور تُشفر وتُرسل مباشرة لخوادم تيليجرام.'}
      </p>

      {/* Telegram MTProto Credentials Badge */}
      <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-primary">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          اتصال سحابي حقيقي
        </span>
        <span className="font-mono text-[10px] font-bold bg-primary/10 px-2 py-0.5 rounded">
          API ID: 22043994
        </span>
      </div>
    </div>
    {step === 'phone' && (
      <>
        <label className="mt-5 block text-[11px] font-bold">رقم الهاتف الدولي</label>
        <input
          autoFocus
          value={phone}
          onChange={event => setPhone(event.target.value)}
          placeholder="+966 50 123 4567"
          data-testid="input-phone"
          className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-left text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
          dir="ltr"
        />
        <p className="mt-1.5 text-[10.5px] text-muted-foreground">
          اكتب الرقم مع مفتاح الدولة (مثل: +966 أو +967 أو +20).
        </p>
      </>
    )}
    {step === 'code' && (
      <>
        <div className="mt-4 rounded-xl bg-muted/50 p-3 text-[11px] text-foreground leading-5 border border-border/60">
          <p className="font-bold text-primary">وصلتك رسالة في تطبيق تيليجرام:</p>
          <p className="mt-0.5 text-muted-foreground">افتح تطبيق Telegram على هاتفك وانسخ رمز تسجيل الدخول المكوّن من 5 أرقام.</p>
        </div>
        <input
          autoFocus
          value={code}
          onChange={event => setCode(event.target.value)}
          maxLength={6}
          placeholder="12345"
          data-testid="input-verification-code"
          className="mt-4 h-14 w-full rounded-xl border border-input bg-background px-4 text-center font-mono-app text-2xl tracking-[.35em] font-bold outline-none focus:ring-2 focus:ring-primary/30"
          dir="ltr"
        />
      </>
    )}
    {step === 'password' && (
      <>
        <label className="mt-5 block text-[11px] font-bold">كلمة المرور الإضافية (2FA)</label>
        <input
          autoFocus
          value={password}
          onChange={event => setPassword(event.target.value)}
          type="password"
          placeholder="كلمة مرور التحقق بخطوتين"
          data-testid="input-two-factor-password"
          className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          dir="ltr"
        />
      </>
    )}
    {error && <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-[11px] leading-5 text-destructive">{error}</p>}
    <button
      type="button"
      disabled={busy || (step === 'phone' ? !phone.trim() : step === 'code' ? !code.trim() : !password)}
      onClick={() => void submit()}
      data-testid="button-auth-submit"
      className="mt-5 w-full rounded-xl bg-primary py-3.5 text-xs font-bold text-primary-foreground transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? 'جارٍ الاتصال بخوادم Telegram…' : step === 'phone' ? 'طلب رمز الدخول الفعلي' : step === 'code' ? 'التحقق وتسجيل الدخول' : 'تأكيد كلمة المرور'}
    </button>
    {step !== 'phone' && (
      <button
        type="button"
        onClick={() => { setStep('phone'); setCode(''); setPassword(''); setError(''); }}
        className="mt-3 w-full py-2 text-xs font-bold text-primary hover:underline"
      >
        استخدام رقم آخر
      </button>
    )}
    <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
      <LockKeyhole size={12} className="text-emerald-500" />
      اتصال مشفّر مباشر عبر خوادم MTProto الرسمية
    </div>
  </section>;

  return modal ? <div className="absolute inset-0 z-50 grid place-items-center bg-[hsl(211_38%_12%/.38)] p-4 backdrop-blur-sm">{content}</div> : <main className="grid min-h-[100dvh] place-items-center bg-background p-5">{content}</main>;
}

function AddAccount({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: (status: AuthStatus) => void }) {
  return <AuthScreen modal onClose={onClose} onAuthenticated={onAuthenticated} />;
}

function MessageBubble({
  message,
  chatKind,
  onAction,
}: {
  key?: Key;
  message: Message;
  chatKind?: string;
  onAction: (action: 'reply' | 'edit' | 'delete' | 'react' | 'copy', message: Message, emoji?: string) => void;
}) {
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showReactionsPicker, setShowReactionsPicker] = useState(false);
  const [avatarErr, setAvatarErr] = useState(false);

  const isIncoming = !message.outgoing;
  const shouldShowSenderName = isIncoming && (Boolean(message.senderName) || chatKind === 'group' || chatKind === 'channel');
  const senderColor = message.senderColor || '#e56555';
  const senderDisplayName = message.senderName || 'مستخدم';
  const senderInitials = message.senderInitials || (senderDisplayName.slice(0, 2) || 'ت');

  const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '👏', '😮', '🎉'];

  return (
    <div
      className={`group relative flex items-end gap-2 sm:gap-2.5 ${message.outgoing ? 'flex-row' : 'flex-row-reverse'} fade-up select-text`}
      dir="rtl"
    >
      {/* Sender Avatar for incoming messages (Official Telegram style) */}
      {isIncoming && (
        <div className="shrink-0 mb-1 select-none">
          {message.senderAvatar && !avatarErr ? (
            <img
              src={message.senderAvatar}
              alt={senderDisplayName}
              onError={() => setAvatarErr(true)}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border border-border/40 shadow-xs"
            />
          ) : (
            <div
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-xs"
              style={{ background: `linear-gradient(135deg, ${senderColor}, #222)` }}
            >
              {senderInitials}
            </div>
          )}
        </div>
      )}

      {/* Message Bubble Container */}
      <div className="relative max-w-[86%] sm:max-w-[78%] md:max-w-[min(72%,560px)]">
        {/* Main Bubble */}
        <div
          onClick={() => setShowMobileActions(!showMobileActions)}
          className={`relative px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-xs transition-all cursor-pointer ${
            message.outgoing
              ? 'bg-primary text-primary-foreground rounded-br-xs message-out'
              : 'bg-card border border-border/80 text-card-foreground rounded-bl-xs message-in'
          }`}
        >
          {/* Sender Name (Official Telegram Colored Header) */}
          {shouldShowSenderName && (
            <div
              className="mb-1 text-[11px] sm:text-[12px] font-bold tracking-tight select-none"
              style={{ color: message.outgoing ? 'inherit' : senderColor }}
            >
              {senderDisplayName}
            </div>
          )}

          {/* Telegram Quoted Reply Block */}
          {message.replyTo && (
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
              className={`mb-2 flex items-stretch gap-2 rounded-lg px-2.5 py-1.5 border-r-3 text-right text-[11px] transition-all select-none ${
                message.outgoing
                  ? 'bg-black/15 border-primary-foreground/80 text-primary-foreground'
                  : 'bg-muted/70 border-primary text-foreground'
              }`}
            >
              <div className="min-w-0 flex-1">
                <span
                  className="block font-bold text-[10.5px] truncate"
                  style={{ color: message.outgoing ? 'inherit' : (message.senderColor || '#0284c7') }}
                >
                  {message.replyTo.senderName || 'رد على رسالة'}
                </span>
                <span className="block truncate text-[10px] opacity-85 mt-0.5">
                  {message.replyTo.text}
                </span>
              </div>
            </div>
          )}

          {/* Message Text */}
          <p className="whitespace-pre-wrap text-[13px] sm:text-[13.5px] leading-relaxed break-words font-normal">
            {message.text}
          </p>

          {/* Time & Read / Edited Indicators */}
          <div
            className={`mt-1 flex items-center gap-1.5 font-mono-app text-[9.5px] select-none ${
              message.outgoing ? 'justify-start text-primary-foreground/75' : 'justify-end text-muted-foreground'
            }`}
          >
            <span>{message.time}</span>
            {message.edited && <span className="opacity-80">· تم التعديل</span>}
            {message.outgoing && (
              message.read ? (
                <CheckCheck size={14} className="text-primary-foreground inline" />
              ) : (
                <Check size={13} className="text-primary-foreground/80 inline" />
              )
            )}
          </div>

          {/* Reaction Badge */}
          {message.reaction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAction('react', message);
              }}
              data-testid={`button-reaction-${message.id}`}
              className="absolute -bottom-3 right-2 flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] shadow-sm hover:scale-105 active:scale-95 transition"
            >
              <span>{message.reaction}</span>
            </button>
          )}
        </div>

        {/* Quick Reactions Picker Popover */}
        {showReactionsPicker && (
          <div
            className="absolute -top-11 z-30 flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-lg fade-up"
            dir="ltr"
          >
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onAction('react', message, emoji);
                  setShowReactionsPicker(false);
                }}
                className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-sm hover:scale-125 transition"
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowReactionsPicker(false)}
              className="h-7 w-7 rounded-full text-muted-foreground hover:bg-secondary flex items-center justify-center text-xs"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Action Strip (Visible on tap on mobile, or on hover on desktop) */}
        <div
          className={`flex items-center gap-1 mt-1 transition-all ${
            showMobileActions ? 'flex opacity-100' : 'hidden sm:group-hover:flex sm:opacity-100 opacity-0'
          } ${message.outgoing ? 'justify-start' : 'justify-end'}`}
        >
          <button
            type="button"
            title="رد"
            onClick={() => {
              onAction('reply', message);
              setShowMobileActions(false);
            }}
            className="h-7 px-2 flex items-center gap-1 rounded-lg bg-secondary/90 hover:bg-primary/20 hover:text-primary text-muted-foreground text-[11px] font-medium transition cursor-pointer"
          >
            <MessageCircle size={12} />
            <span>رد</span>
          </button>

          <button
            type="button"
            title="تفاعل"
            onClick={() => setShowReactionsPicker(!showReactionsPicker)}
            className="h-7 px-2 flex items-center gap-1 rounded-lg bg-secondary/90 hover:bg-secondary text-muted-foreground text-[11px] font-medium transition cursor-pointer"
          >
            <SmilePlus size={12} />
          </button>

          <button
            type="button"
            title="نسخ النص"
            onClick={() => {
              onAction('copy', message);
              setShowMobileActions(false);
            }}
            className="h-7 px-2 flex items-center gap-1 rounded-lg bg-secondary/90 hover:bg-secondary text-muted-foreground text-[11px] font-medium transition cursor-pointer"
          >
            <Copy size={12} />
          </button>

          {message.outgoing && (
            <button
              type="button"
              title="تعديل"
              onClick={() => {
                onAction('edit', message);
                setShowMobileActions(false);
              }}
              className="h-7 px-2 flex items-center gap-1 rounded-lg bg-secondary/90 hover:bg-primary/20 hover:text-primary text-muted-foreground text-[11px] font-medium transition cursor-pointer"
            >
              <Edit3 size={12} />
            </button>
          )}

          <button
            type="button"
            title="حذف"
            onClick={() => {
              onAction('delete', message);
              setShowMobileActions(false);
            }}
            className="h-7 px-2 flex items-center gap-1 rounded-lg bg-secondary/90 hover:bg-destructive/20 hover:text-destructive text-muted-foreground text-[11px] font-medium transition cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Conversation({
  chat,
  messages,
  setMessages,
  onBack,
  onProfile,
  onError,
  wallpaper,
  onOpenWallpaper,
}: {
  chat: Chat;
  messages: Message[];
  setMessages: (m: Message[]) => void;
  onBack: () => void;
  onProfile: () => void;
  onError: (message: string) => void;
  wallpaper: WallpaperConfig;
  onOpenWallpaper: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<Message | null>(null);
  const [replying, setReplying] = useState<Message | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [showFullTemplates, setShowFullTemplates] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const loadTemplates = () => {
    fetch('/api/telegram/templates')
      .then(res => res.json())
      .then(data => {
        if (data.templates) setTemplates(data.templates);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const handleAction = (action: 'reply'|'edit'|'delete'|'react'|'copy', message: Message, emoji?: string) => {
    if (action === 'reply') setReplying(message);
    if (action === 'edit') { setEditing(message); setDraft(message.text); }
    if (action === 'delete') {
      void apiFetch(`/telegram/chats/${encodeURIComponent(chat.id)}/messages/${message.id}`, { method: 'DELETE' })
        .then(() => setMessages(messages.filter(item => item.id !== message.id)))
        .catch(error => onError(error instanceof Error ? error.message : 'تعذر حذف الرسالة'));
    }
    if (action === 'react') {
      const reactionVal = emoji || (message.reaction ? undefined : '👍');
      setMessages(messages.map(item => item.id === message.id ? { ...item, reaction: reactionVal } : item));
    }
    if (action === 'copy') {
      navigator.clipboard?.writeText(message.text).then(() => {}).catch(() => {});
    }
  };

  const applyTemplate = (content: string, autoSend: boolean = false, id?: string) => {
    if (id) {
      fetch(`/api/telegram/templates/use/${id}`, { method: 'POST' }).catch(() => {});
    }
    if (autoSend) {
      const bodyPayload: any = { text: content };
      if (replying) {
        bodyPayload.replyToMsgId = replying.id;
        bodyPayload.replyTo = {
          id: replying.id,
          senderName: replying.senderName || 'رسالة',
          text: replying.text.slice(0, 70),
        };
      }
      void apiFetch<{ message: any }>(
        `/telegram/chats/${encodeURIComponent(chat.id)}/messages`,
        { method: 'POST', body: JSON.stringify(bodyPayload) }
      ).then(result => {
        const next = toMessage(result.message);
        setMessages([...messages, next]);
        setReplying(null);
        setTemplatesOpen(false);
      }).catch(error => onError(error instanceof Error ? error.message : 'تعذر إرسال القالب'));
    } else {
      setDraft(prev => prev ? `${prev}\n${content}` : content);
      setTemplatesOpen(false);
    }
  };

  const send = () => {
    const text = draft.trim(); if (!text) return;
    const bodyPayload: any = { text };
    if (replying) {
      bodyPayload.replyToMsgId = replying.id;
      bodyPayload.replyTo = {
        id: replying.id,
        senderName: replying.senderName || 'رسالة',
        text: replying.text.slice(0, 70),
      };
    }
    const request = editing
      ? apiFetch<{ message: any }>(`/telegram/chats/${encodeURIComponent(chat.id)}/messages/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ text }) })
      : apiFetch<{ message: any }>(`/telegram/chats/${encodeURIComponent(chat.id)}/messages`, { method: 'POST', body: JSON.stringify(bodyPayload) });
    void request.then(result => {
      const next = toMessage(result.message);
      setMessages(editing ? messages.map(item => item.id === editing.id ? next : item) : [...messages, next]);
      setDraft(''); setReplying(null); setEditing(null);
    }).catch(error => onError(error instanceof Error ? error.message : 'تعذر إرسال الرسالة'));
  };

  const filteredQuickTemplates = templates.filter(tpl =>
    tpl.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
    tpl.content.toLowerCase().includes(templateSearch.toLowerCase()) ||
    (tpl.shortcut && tpl.shortcut.toLowerCase().includes(templateSearch.toLowerCase()))
  );

  const isChannel = chat.kind === 'channel';
  const isGroup = chat.kind === 'group';

  return (
    <section
      className="chat-wallpaper relative flex min-w-0 flex-1 flex-col overflow-hidden"
      dir="rtl"
      style={{
        background: wallpaper?.background || 'var(--card)',
      }}
    >
      {/* Pattern Overlay if selected */}
      {wallpaper?.patternOverlay && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            opacity: wallpaper.patternOpacity ?? 0.12,
            backgroundImage:
              wallpaper.patternOverlay === 'stars'
                ? 'radial-gradient(circle at 20% 30%, white 1.5px, transparent 1.5px), radial-gradient(circle at 80% 70%, white 1.5px, transparent 1.5px), radial-gradient(circle at 50% 50%, white 1.5px, transparent 1.5px)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.1) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.1) 25%, transparent 25%), linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%), linear-gradient(315deg, rgba(255,255,255,0.1) 25%, transparent 25%)',
            backgroundSize: wallpaper.patternOverlay === 'stars' ? '48px 48px' : '32px 32px',
          }}
        />
      )}

      <header className="relative z-10 flex h-[74px] flex-none items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md">
        <IconButton label="العودة للمحادثات" onClick={onBack} className="md:hidden">
          <ChevronLeft size={20} />
        </IconButton>
        <button
          type="button"
          onClick={onProfile}
          data-testid="button-open-profile"
          className="flex min-w-0 items-center gap-3 text-right hover:opacity-90 transition-opacity"
        >
          <div className="relative">
            <Avatar chat={chat} />
            <span
              className={`absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-card ${
                chat.online ? 'bg-[#7dbd8a]' : 'bg-muted-foreground/30'
              }`}
            />
          </div>
          <span className="min-w-0">
            <strong className="block truncate text-sm font-bold">{chat.name}</strong>
            <small className="mt-0.5 block truncate text-[11px] text-muted-foreground">
              {isChannel
                ? (chat.participantsCount ? `${chat.participantsCount.toLocaleString('ar-SA')} مشترك` : 'قناة تيليجرام')
                : isGroup
                ? `${chat.participantsCount ? `${chat.participantsCount.toLocaleString('ar-SA')} عضو` : 'مجموعة'}${
                    chat.onlineCount ? ` · ${chat.onlineCount.toLocaleString('ar-SA')} متصل` : ''
                  }`
                : (chat.online ? 'متصل الآن' : 'آخر ظهور مؤخراً')}
            </small>
          </span>
        </button>

        <div className="mr-auto flex items-center gap-1">
          <IconButton label="تخصيص خلفية المحادثة" onClick={onOpenWallpaper} className="text-primary hover:bg-primary/10">
            <Palette size={18} />
          </IconButton>
          <IconButton label="بحث في المحادثة">
            <Search size={18} />
          </IconButton>
          <IconButton label="اتصال صوتي">
            <Phone size={18} />
          </IconButton>
          <IconButton label="المزيد">
            <MoreVertical size={19} />
          </IconButton>
        </div>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-7 sm:px-8">
        <div className="mx-auto flex max-w-[820px] flex-col gap-4">
          <div className="mx-auto mb-2 rounded-full bg-card/85 px-4 py-1.5 text-[10px] text-muted-foreground shadow-xs border border-border/40 backdrop-blur-xs select-none">
            اليوم
          </div>
          {messages.length === 0 ? (
            <div className="py-20 text-center text-xs text-muted-foreground">ابدأ محادثة جديدة</div>
          ) : (
            messages.map(message => (
              <MessageBubble key={message.id} message={message} chatKind={chat.kind} onAction={handleAction} />
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="relative z-10 composer-shadow flex-none border-t border-border bg-card/90 px-3 py-3 backdrop-blur-md sm:px-7">
      <div className="mx-auto max-w-[820px]">
        {/* Quick Templates Bar above Composer */}
        {templates.length > 0 && !replying && !editing && (
          <div className="mb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
            <button
              type="button"
              onClick={() => {
                setTemplatesOpen(!templatesOpen);
                if (!templatesOpen) loadTemplates();
              }}
              className="flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition cursor-pointer"
              title="فتح قائمة القوالب السريعة"
            >
              <Sparkles size={12} />
              <span>قوالب سريعة:</span>
            </button>
            {templates.slice(0, 4).map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl.content, false, tpl.id)}
                className="shrink-0 max-w-[170px] truncate px-2.5 py-1 rounded-lg text-[11px] font-medium bg-secondary/80 hover:bg-primary/15 hover:text-primary transition text-muted-foreground hover:border-primary/30 border border-transparent cursor-pointer"
                title={`إدراج "${tpl.title}":\n${tpl.content}`}
              >
                {tpl.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowFullTemplates(true)}
              className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
              title="إدارة كافة القوالب"
            >
              + إدارة
            </button>
          </div>
        )}

        {(replying || editing) && (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-secondary/80 border-r-3 border-primary px-3.5 py-2 text-right transition-all fade-up">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MessageCircle size={16} className="text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-primary truncate">
                  {editing ? 'تعديل الرسالة' : `الرد على: ${replying?.senderName || 'رسالة'}`}
                </span>
                <span className="block text-[10.5px] text-muted-foreground truncate">
                  {editing ? editing.text : replying?.text}
                </span>
              </div>
            </div>
            <IconButton label="إلغاء" onClick={() => { setReplying(null); setEditing(null); if (editing) setDraft(''); }} className="h-7 w-7 shrink-0">
              <X size={14} />
            </IconButton>
          </div>
        )}
        <div className="relative flex items-end gap-2">
          {/* Quick Templates Drawer Popover */}
          {templatesOpen && (
            <div className="absolute bottom-14 right-0 sm:right-2 z-30 w-80 sm:w-96 rounded-2xl border border-border bg-card p-3 shadow-2xl fade-up space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-border/70">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  قوالب الرسائل الجاهزة
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplatesOpen(false);
                      setShowFullTemplates(true);
                    }}
                    className="text-[11px] font-bold text-primary hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    إدارة القوالب
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplatesOpen(false)}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Search within templates */}
              <div className="relative">
                <Search size={13} className="absolute right-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="search"
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                  placeholder="بحث سريع في القوالب..."
                  className="w-full h-8 rounded-xl border border-input bg-background pr-8 pl-2.5 text-[11px] outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Templates List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                {filteredQuickTemplates.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    لا توجد قوالب مطابقة
                  </div>
                ) : (
                  filteredQuickTemplates.map(tpl => (
                    <div
                      key={tpl.id}
                      className="group/tpl rounded-xl border border-border/60 bg-muted/30 p-2 hover:bg-muted/70 hover:border-primary/40 transition space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground truncate">{tpl.title}</span>
                        <div className="flex items-center gap-1">
                          {tpl.category && (
                            <span className="text-[9px] bg-secondary px-1.5 py-0.2 rounded font-semibold text-muted-foreground">
                              {tpl.category}
                            </span>
                          )}
                          {tpl.shortcut && (
                            <span className="text-[9px] font-mono bg-sky-500/10 text-sky-500 px-1 py-0.2 rounded" dir="ltr">
                              {tpl.shortcut}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {tpl.content}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => applyTemplate(tpl.content, false, tpl.id)}
                          className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-primary/20 text-foreground text-[10px] font-semibold transition cursor-pointer"
                          title="إدراج في حقل الكتابة"
                        >
                          إدراج
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate(tpl.content, true, tpl.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:brightness-105 text-[10px] font-bold transition cursor-pointer shadow-xs"
                          title="إرسال فوري إلى المحادثة"
                        >
                          <Send size={10} />
                          <span>إرسال فوري</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="relative">
            <IconButton label="إرفاق ملف" active={attachOpen} onClick={() => setAttachOpen(!attachOpen)}><Paperclip size={19} /></IconButton>
            {attachOpen && <div className="absolute bottom-12 right-0 z-20 w-44 rounded-2xl border border-border bg-card p-2 shadow-xl fade-up"><button type="button" onClick={() => setAttachOpen(false)} data-testid="button-attach-photo" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-xs hover:bg-muted"><ImageIcon size={16} className="text-primary" /> صورة أو فيديو</button><button type="button" onClick={() => setAttachOpen(false)} data-testid="button-attach-file" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-xs hover:bg-muted"><FileText size={16} className="text-primary" /> ملف من الجهاز</button><button type="button" onClick={() => setAttachOpen(false)} data-testid="button-attach-camera" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-xs hover:bg-muted"><Info size={16} className="text-primary" /> الموقع</button></div>}
          </div>
          <IconButton
            label="قوالب الرسائل الجاهزة"
            active={templatesOpen}
            onClick={() => {
              setTemplatesOpen(!templatesOpen);
              if (!templatesOpen) loadTemplates();
            }}
          >
            <Bookmark size={19} className={templatesOpen ? 'text-amber-500' : ''} />
          </IconButton>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={editing ? 'عدّل رسالتك...' : 'اكتب رسالة (أو اختر قالباً سريعاً)'} data-testid="input-message" className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-xs leading-6 outline-none transition focus:ring-2 focus:ring-primary/30" />
          <IconButton label={recording ? 'إيقاف التسجيل' : 'تسجيل صوتي'} active={recording} onClick={() => setRecording(!recording)}>{recording ? <span className="h-3 w-3 rounded-sm bg-destructive" /> : <Mic size={19} />}</IconButton>
          {draft.trim() && <button type="button" onClick={send} data-testid="button-send-message" className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:brightness-105 active:scale-95"><Send size={17} /></button>}
        </div>
        {recording && <p className="mt-2 text-center text-[10px] text-destructive">جاري التسجيل · اضغط على الميكروفون للإيقاف</p>}
      </div>
    </div>

    {/* Full Message Templates Management Modal */}
    {showFullTemplates && (
      <MessageTemplatesModal
        onClose={() => {
          setShowFullTemplates(false);
          loadTemplates();
        }}
        onSelectTemplate={text => {
          applyTemplate(text, false);
          setShowFullTemplates(false);
        }}
      />
    )}
    </section>
  );
}

function ChatList({
  chats,
  selected,
  onSelect,
  onSettings,
  onAdd,
  onOpenDrawer,
  onOpenInstall,
  mobileList,
}: {
  chats: Chat[];
  selected: string;
  onSelect: (id: string) => void;
  onSettings: () => void;
  onAdd: () => void;
  onOpenDrawer: () => void;
  onOpenInstall?: () => void;
  mobileList: boolean;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'groups' | 'channels' | 'bots' | 'unread' | 'archive'>('all');

  const visible = useMemo(() => {
    return chats
      .filter(c => {
        if (tab === 'archive') return !!c.archived;
        if (c.archived) return false;
        if (tab === 'unread') return !!c.unread && c.unread > 0;
        if (tab === 'groups') return c.kind === 'group' || c.name.includes('مجموعة') || c.name.includes('جروب');
        if (tab === 'channels') return c.kind === 'channel' || c.name.includes('قناة');
        if (tab === 'bots') return c.kind === 'bot' || c.name.includes('بوت') || c.name.toLowerCase().includes('bot');
        return true;
      })
      .filter(c => `${c.name} ${c.preview}`.toLowerCase().includes(search.toLowerCase().trim()));
  }, [chats, tab, search]);

  const unreadCount = useMemo(() => chats.reduce((acc, c) => acc + (c.unread || 0), 0), [chats]);

  return (
    <aside
      className={`${mobileList ? 'flex' : 'mobile-list-hidden'} flex w-full flex-none flex-col border-l border-border bg-card/90 md:w-[340px] lg:w-[370px] select-none`}
      dir="rtl"
    >
      {/* Telegram Action Bar Header (56px) */}
      <header className="flex h-14 items-center justify-between px-3 border-b border-border/80 bg-card">
        <div className="flex items-center gap-2">
          <IconButton label="القائمة الجانبية (Telegram Drawer)" onClick={onOpenDrawer}>
            <Menu size={20} />
          </IconButton>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white text-xs font-black shadow-xs">
              ت
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight flex items-center gap-1.5">
                <span>تيليجرام</span>
                <span className="text-[9px] bg-sky-500/20 text-sky-600 dark:text-sky-300 font-mono px-1 rounded font-bold">
                  PRO
                </span>
              </h1>
              <span className="text-[9px] text-emerald-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                سحابة تيليجرام متصلة
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenInstall && (
            <button
              type="button"
              onClick={onOpenInstall}
              title="تثبيت التطبيق على الجوال (PWA)"
              data-testid="header-pwa-install-btn"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 transition-all text-xs font-bold shadow-2xs active:scale-95 cursor-pointer"
            >
              <Download size={14} className="shrink-0 text-sky-500 animate-pulse" />
              <span className="hidden sm:inline">تثبيت التطبيق</span>
              <span className="sm:hidden text-[10px]">تثبيت</span>
            </button>
          )}
          <IconButton label="محادثة جديدة" onClick={onAdd}>
            <Edit3 size={18} />
          </IconButton>
        </div>
      </header>

      <div className="px-3 pt-2.5">
        {/* Search Bar */}
        <label className="relative block">
          <Search size={15} className="absolute right-3 top-3 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث في المحادثات أو الرسائل..."
            data-testid="input-search-chats"
            className="h-9.5 w-full rounded-xl border border-input bg-background/80 pr-9 pl-3 text-xs outline-none focus:ring-2 focus:ring-primary/25 transition-all"
          />
        </label>

        {/* Telegram Folder Bar (شريط المجلدات والتبويبات) */}
        <div className="mt-2 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-border/70 pb-1 text-xs">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
              tab === 'all'
                ? 'bg-primary/15 text-primary border-b-2 border-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Folder size={12} />
            <span>الكل</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('groups')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
              tab === 'groups'
                ? 'bg-primary/15 text-primary border-b-2 border-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users size={12} />
            <span>المجموعات</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('channels')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
              tab === 'channels'
                ? 'bg-primary/15 text-primary border-b-2 border-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Megaphone size={12} />
            <span>القنوات</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('bots')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
              tab === 'bots'
                ? 'bg-primary/15 text-primary border-b-2 border-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bot size={12} />
            <span>البوتات</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('unread')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
              tab === 'unread'
                ? 'bg-primary/15 text-primary border-b-2 border-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>غير مقروءة</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] bg-primary text-primary-foreground rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('archive')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
              tab === 'archive'
                ? 'bg-primary/15 text-primary border-b-2 border-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Archive size={12} />
            <span>الأرشيف</span>
          </button>
        </div>
      </div>
      <div className="mt-3 flex-1 overflow-y-auto pb-4">
        {visible.length === 0 ? <EmptyState search={search} /> : <>{visible.some(c => c.pinned) && tab === 'all' && <div className="flex items-center gap-2 px-5 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground"><Pin size={11} /> مثبتة</div>}{visible.map(chat => <ChatRow key={chat.id} chat={chat} selected={selected === chat.id} onSelect={() => onSelect(chat.id)} />)}</>}
      </div>
      <footer className="border-t border-border px-5 py-3 text-center text-[9px] text-muted-foreground">مزامنة سحابية مباشرة · Telegram MTProto</footer>
    </aside>
  );
}

function AppWorkspace() {
  const [theme, setTheme] = useState<'light'|'dark'>(() => storage.get('telegram-theme', 'light'));
  const [selected, setSelected] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileList, setMobileList] = useState(false);
  const [ready, setReady] = useState(false);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>(() => {
    try {
      const saved = localStorage.getItem('telegram_chat_wallpaper');
      if (saved) return JSON.parse(saved);
    } catch {}
    return WALLPAPER_PRESETS[0];
  });
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [accounts, setAccounts] = useState<DrawerAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [, setLocation] = useLocation();

  const loadAccounts = useCallback(async () => {
    try {
      const res = await apiFetch<{
        accounts: DrawerAccount[];
        activeId: string;
      }>('/telegram/accounts');
      if (res?.accounts) {
        setAccounts(res.accounts);
        setActiveAccountId(current => {
          if (res.activeId) return res.activeId;
          if (res.accounts.length > 0 && !current) return res.accounts[0].id;
          return current;
        });
      }
    } catch {}
  }, []);

  const handleSwitchAccount = async (accId: string) => {
    try {
      const res = await apiFetch<{
        success: boolean;
        activeAccount: DrawerAccount;
        sessionString?: string;
        user: { name: string; username?: string; phone: string };
      }>('/telegram/accounts/switch', {
        method: 'POST',
        body: JSON.stringify({ accountId: accId }),
      });
      if (res?.success) {
        if (res.sessionString) {
          try {
            localStorage.setItem(TG_SESSION_STORAGE_KEY, res.sessionString);
            localStorage.setItem('tg_session_string', res.sessionString);
            document.cookie = `tg_session_string=${encodeURIComponent(res.sessionString)}; Max-Age=31536000; path=/; SameSite=Lax`;
          } catch {}
        }
        setActiveAccountId(accId);
        setAuth({
          authenticated: true,
          state: 'ready',
          isLiveConnected: true,
          sessionString: res.sessionString,
          user: {
            id: accId,
            name: res.user.name,
            phone: res.user.phone,
            username: res.user.username,
          },
        });

        // Reload live chats and messages for switched session
        setDataLoading(true);
        setChats([]);
        setMessages({});
        try {
          const chatsRes = await apiFetch<{ chats: ApiChat[] }>('/telegram/chats');
          const nextChats = (chatsRes?.chats || []).map(toChat);
          setChats(nextChats);
          setSelected(nextChats[0]?.id || '');
        } catch {
          // ignore
        } finally {
          setDataLoading(false);
        }

        void loadAccounts();
      }
    } catch (err: any) {
      console.error('Account switch failed:', err);
    }
  };

  const handleDeleteAccount = async (accId: string) => {
    try {
      const res = await apiFetch<{
        success: boolean;
        activeAccountId?: string;
      }>(`/telegram/accounts/${encodeURIComponent(accId)}`, {
        method: 'DELETE',
      });
      if (res?.success) {
        await loadAccounts();
        if (res.activeAccountId && res.activeAccountId !== activeAccountId) {
          await handleSwitchAccount(res.activeAccountId);
        }
      }
    } catch (err) {
      console.error('Failed to unlink account:', err);
    }
  };

  const handleSelectWallpaper = (newWp: WallpaperConfig) => {
    setWallpaper(newWp);
    try {
      localStorage.setItem('telegram_chat_wallpaper', JSON.stringify(newWp));
    } catch {}
  };

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); storage.set('telegram-theme', theme); }, [theme]);
  useEffect(() => {
    void loadAccounts();
    void apiFetch<AuthStatus>('/telegram/status')
      .then(status => {
        if (status.sessionString) {
          try {
            localStorage.setItem(TG_SESSION_STORAGE_KEY, status.sessionString);
          } catch {}
        }
        setAuth(status);
      })
      .catch(() => setAuth({ authenticated: false, state: 'phone' }))
      .finally(() => setAuthLoading(false));
  }, [loadAccounts]);
  useEffect(() => {
    if (!auth?.authenticated) return;
    setDataLoading(true);
    void apiFetch<{ chats: ApiChat[] }>('/telegram/chats')
      .then(result => {
        const nextChats = result.chats.map(toChat);
        setChats(nextChats);
        setSelected(current => current && nextChats.some(chat => chat.id === current) ? current : nextChats[0]?.id || '');
      })
      .catch(requestError => setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل المحادثات'))
      .finally(() => { setDataLoading(false); setReady(true); });
  }, [auth?.authenticated]);
  useEffect(() => {
    if (!auth?.authenticated || !selected) return;
    void apiFetch<{ messages: Array<{ id: string; text: string; time: string | null; outgoing?: boolean; edited?: boolean }> }>(`/telegram/chats/${encodeURIComponent(selected)}/messages`)
      .then(result => setMessages(current => ({ ...current, [selected]: result.messages.map(toMessage) })))
      .catch(requestError => setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل الرسائل'));
  }, [auth?.authenticated, selected]);

  // Real-time Chat Details (Subscribers, Members, Online count, Bio/About, Verified Avatar)
  useEffect(() => {
    if (!auth?.authenticated || !selected) return;
    void apiFetch<{ details: { participantsCount?: number; onlineCount?: number; about?: string; avatarUrl?: string } }>(
      `/telegram/chats/${encodeURIComponent(selected)}/full`
    ).then(res => {
      if (res?.details) {
        setChats(currentChats =>
          currentChats.map(c =>
            c.id === selected
              ? {
                  ...c,
                  participantsCount: res.details.participantsCount ?? c.participantsCount,
                  onlineCount: res.details.onlineCount ?? c.onlineCount,
                  about: res.details.about ?? c.about,
                  avatarUrl: res.details.avatarUrl ?? c.avatarUrl,
                  online: (res.details.onlineCount !== undefined && res.details.onlineCount > 0) || c.online,
                }
              : c
          )
        );
      }
    }).catch(() => {});
  }, [auth?.authenticated, selected]);

  // Mobile Back Button Navigation Fix (Hardware back button / Swipe / Browser back)
  useEffect(() => {
    const handlePopState = () => {
      if (showPWAInstall) {
        setShowPWAInstall(false);
        return;
      }
      if (showWallpaperModal) {
        setShowWallpaperModal(false);
        return;
      }
      if (showProfile) {
        setShowProfile(false);
        return;
      }
      if (showSettings) {
        setShowSettings(false);
        return;
      }
      if (showAdd) {
        setShowAdd(false);
        return;
      }
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return;
      }
      if (activeService) {
        setActiveService(null);
        return;
      }
      // If user is inside a chat on mobile, back navigation returns to the chat list rather than exiting the app
      if (!mobileList && window.innerWidth < 768) {
        setMobileList(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showPWAInstall, showWallpaperModal, showProfile, showSettings, showAdd, isDrawerOpen, activeService, mobileList]);

  const current = chats.find(chat => chat.id === selected);
  const selectChat = (id: string) => {
    setSelected(id);
    setShowProfile(false);
    setMobileList(false);
    setChats(currentChats => currentChats.map(chat => chat.id === id ? { ...chat, unread: undefined } : chat));
    if (window.innerWidth < 768) {
      window.history.pushState({ telegramView: 'chat', id }, '');
    }
  };

  const handleBack = () => {
    if (window.innerWidth < 768 && window.history.state?.telegramView === 'chat') {
      window.history.back();
    } else {
      setMobileList(true);
    }
  };

  const handleSendToChat = (text: string) => {
    const targetChatId = selected || chats[0]?.id;
    if (!targetChatId) return;
    void apiFetch<{ message: { id: string; text: string; time: string | null; outgoing?: boolean; edited?: boolean } }>(
      `/telegram/chats/${encodeURIComponent(targetChatId)}/messages`,
      { method: 'POST', body: JSON.stringify({ text }) }
    ).then(result => {
      const next = toMessage(result.message);
      setMessages(currentMessages => ({
        ...currentMessages,
        [targetChatId]: [...(currentMessages[targetChatId] || []), next],
      }));
    }).catch(() => {
      const localMsg: Message = {
        id: `msg_${Date.now()}`,
        text,
        time: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        outgoing: true,
        read: true,
      };
      setMessages(currentMessages => ({
        ...currentMessages,
        [targetChatId]: [...(currentMessages[targetChatId] || []), localMsg],
      }));
    });
  };

  const logout = () => {
    try {
      localStorage.removeItem(TG_SESSION_STORAGE_KEY);
      localStorage.removeItem('tg_session_string');
      document.cookie = 'tg_session_string=; Max-Age=0; path=/;';
    } catch {}

    void apiFetch('/telegram/auth/logout', { method: 'POST' })
      .then(() => {
        setAuth({ authenticated: false, state: 'phone' });
        setChats([]);
        setMessages({});
        setSelected('');
        setShowSettings(false);
      })
      .catch(requestError => setError(requestError instanceof Error ? requestError.message : 'تعذر تسجيل الخروج'));
  };

  if (authLoading) return <main className="grid min-h-[100dvh] place-items-center bg-background"><LoadingList /></main>;
  if (!auth?.authenticated) return <AuthScreen onAuthenticated={status => setAuth(status)} />;

  return (
    <main className="workspace-shell relative flex min-h-[100dvh] overflow-hidden text-foreground">
      <div className="flex min-h-[100dvh] w-full">
        {!ready || dataLoading ? (
          <div className="w-full bg-card"><LoadingList /></div>
        ) : (
          <>
            <ChatList
              chats={chats}
              selected={selected}
              onSelect={selectChat}
              onSettings={() => setShowSettings(true)}
              onAdd={() => setShowAdd(true)}
              onOpenDrawer={() => setIsDrawerOpen(true)}
              onOpenInstall={() => setShowPWAInstall(true)}
              mobileList={mobileList}
            />
            <div className={`${mobileList ? 'mobile-chat-hidden' : 'flex'} min-w-0 flex-1`}>
              {current ? (
                <Conversation
                  chat={current}
                  messages={messages[selected] || []}
                  setMessages={next => setMessages(currentMessages => ({ ...currentMessages, [selected]: next }))}
                  onBack={handleBack}
                  onProfile={() => setShowProfile(true)}
                  onError={setError}
                  wallpaper={wallpaper}
                  onOpenWallpaper={() => setShowWallpaperModal(true)}
                />
              ) : (
                <EmptyState search="" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Native Feature Modals */}
      {(activeService === 'publishing_monitoring' || activeService === 'broadcast' || activeService === 'monitoring') && (
        <OriginalPublishingMonitoringModal
          onClose={() => setActiveService(null)}
          onSendToChat={handleSendToChat}
        />
      )}
      {activeService === 'learning' && (
        <LearningSystemModal
          onClose={() => setActiveService(null)}
        />
      )}
      {activeService === 'rotating' && (
        <RotatingBroadcastModal
          onClose={() => setActiveService(null)}
        />
      )}
      {activeService === 'join' && (
        <AutoJoinModal
          onClose={() => setActiveService(null)}
          initialTab="advanced"
        />
      )}
      {activeService === 'saved_links' && (
        <SavedLinksModal
          onClose={() => setActiveService(null)}
          onSelectMessage={handleSendToChat}
        />
      )}
      {activeService === 'batch_messages' && (
        <BatchMessagesModal
          onClose={() => setActiveService(null)}
          onOpenPublishing={() => setActiveService('publishing_monitoring')}
          onSendToChat={handleSendToChat}
        />
      )}
      {activeService === 'autoreplies' && (
        <AutoRepliesModal
          onClose={() => setActiveService(null)}
          onSendToChat={handleSendToChat}
        />
      )}
      {activeService === 'accounts' && (
        <AccountsManagerModal
          onClose={() => setActiveService(null)}
          onOpenLoginFlow={() => {
            setActiveService(null);
            setShowAdd(true);
          }}
          onAccountSwitched={acc => {
            setAuth(prev => prev ? { ...prev, user: { name: acc.name, username: acc.username, phone: acc.phone } } : prev);
            setActiveAccountId(acc.id);
            void loadAccounts();
            setDataLoading(true);
            setChats([]);
            setMessages({});
            void apiFetch<{ chats: ApiChat[] }>('/telegram/chats')
              .then(result => {
                const nextChats = result.chats.map(toChat);
                setChats(nextChats);
                setSelected(nextChats[0]?.id || '');
              })
              .finally(() => setDataLoading(false));
          }}
          onLogout={logout}
        />
      )}
      {activeService === 'templates' && (
        <MessageTemplatesModal
          onClose={() => setActiveService(null)}
          onSelectTemplate={text => handleSendToChat(text)}
        />
      )}

      {/* In-App Quick Service Overlay Viewer for other tools */}
      {activeService && !['publishing_monitoring', 'broadcast', 'monitoring', 'autoreplies', 'accounts', 'learning', 'rotating', 'join', 'saved_links', 'batch_messages', 'templates', 'install'].includes(activeService) && (
        <div className="fixed inset-0 z-50 flex h-full w-full bg-background fade-up" dir="rtl">
          <InAppServiceViewer
            serviceId={activeService}
            onClose={() => setActiveService(null)}
            onSelectService={id => setActiveService(id)}
            onSendToChat={handleSendToChat}
            activeChatName={current?.name}
            fullPage
          />
        </div>
      )}

      {/* PWA Native Mobile App Install Modal */}
      {(showPWAInstall || activeService === 'install') && (
        <PWAInstallModal
          isOpen={showPWAInstall || activeService === 'install'}
          onClose={() => {
            setShowPWAInstall(false);
            if (activeService === 'install') setActiveService(null);
          }}
        />
      )}

      {error && <div role="alert" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-destructive px-4 py-2 text-[11px] text-destructive-foreground shadow-lg">{error}<button type="button" className="mr-3 font-bold" onClick={() => setError('')}>×</button></div>}
      {showProfile && current && <ProfilePanel chat={current} onClose={() => setShowProfile(false)} onSettings={() => { setShowProfile(false); setShowSettings(true); }} />}
      {showSettings && (
        <SettingsPanel
          theme={theme}
          setTheme={setTheme}
          onClose={() => setShowSettings(false)}
          onAddAccount={() => { setShowSettings(false); setShowAdd(true); }}
          onOpenAccounts={() => { setShowSettings(false); setActiveService('accounts'); }}
          onOpenWallpaper={() => { setShowSettings(false); setShowWallpaperModal(true); }}
          onOpenInstall={() => { setShowSettings(false); setShowPWAInstall(true); }}
          onLogout={logout}
          user={auth.user}
        />
      )}
      {showWallpaperModal && (
        <ChatWallpaperModal
          currentWallpaper={wallpaper}
          onSelectWallpaper={handleSelectWallpaper}
          onClose={() => setShowWallpaperModal(false)}
        />
      )}
      {showAdd && (
        <AddAccount
          onClose={() => setShowAdd(false)}
          onAuthenticated={status => {
            setShowAdd(false);
            setAuth(status);
            void loadAccounts();
            setDataLoading(true);
            setChats([]);
            setMessages({});
            void apiFetch<{ chats: ApiChat[] }>('/telegram/chats')
              .then(result => {
                const nextChats = result.chats.map(toChat);
                setChats(nextChats);
                setSelected(nextChats[0]?.id || '');
              })
              .finally(() => setDataLoading(false));
          }}
        />
      )}

      {/* Telegram Navigation Drawer (الدرج الجانبي المماثل لتطبيق تيليجرام مع مبدل الحسابات) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={
          auth?.user
            ? {
                name: auth.user.name || 'حساب تيليجرام',
                phone: auth.user.phone || '',
                username: auth.user.username || '',
              }
            : null
        }
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={() => {
          setIsDrawerOpen(false);
          setShowAdd(true);
        }}
        onManageAccounts={() => {
          setIsDrawerOpen(false);
          setActiveService('accounts');
        }}
        onDeleteAccount={handleDeleteAccount}
        onOpenService={(serviceId) => {
          setIsDrawerOpen(false);
          if (serviceId === 'services_center') {
            setLocation('/services');
          } else if (serviceId === 'install') {
            setShowPWAInstall(true);
          } else {
            setActiveService(serviceId);
          }
        }}
        onOpenInstall={() => {
          setIsDrawerOpen(false);
          setShowPWAInstall(true);
        }}
        onOpenSettings={() => {
          setIsDrawerOpen(false);
          setShowSettings(true);
        }}
        onOpenProfile={() => {
          setIsDrawerOpen(false);
          if (current) {
            setShowProfile(true);
          } else if (chats.length > 0) {
            selectChat(chats[0].id);
            setShowProfile(true);
          }
        }}
        onToggleTheme={() => {
          setTheme(theme === 'dark' ? 'light' : 'dark');
        }}
        theme={theme}
        onNewSecretChat={() => {
          setIsDrawerOpen(false);
          setShowAdd(true);
        }}
        onSavedMessages={() => {
          setIsDrawerOpen(false);
          const savedChat = chats.find(c => c.name.includes('المحفوظة') || c.name.includes('Saved'));
          if (savedChat) {
            selectChat(savedChat.id);
          } else if (chats.length > 0) {
            selectChat(chats[0].id);
          }
        }}
        onLogout={() => {
          setIsDrawerOpen(false);
          logout();
        }}
      />
      {mobileList && current && (
        <button
          type="button"
          onClick={() => setMobileList(false)}
          aria-label="العودة للمحادثة النشطة"
          data-testid="button-mobile-navigation"
          className="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-xl md:hidden font-medium text-xs active:scale-95 transition"
        >
          <MessageCircle size={18} />
          <span>المحادثة النشطة</span>
        </button>
      )}
    </main>
  );
}

function ServicesRoute() {
  const [, setLocation] = useLocation();
  return <ServicesCenter onBack={() => setLocation('/')} />;
}

function Router() { return <Switch><Route path="/" component={AppWorkspace} /><Route path="/services" component={ServicesRoute} /><Route component={() => <div className="grid min-h-[100dvh] place-items-center text-sm">الصفحة غير موجودة</div>} /></Switch>; }
function App() { return <QueryClientProvider client={new QueryClient()}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></TooltipProvider></QueryClientProvider>; }
export default App;