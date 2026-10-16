import { useState, useEffect, type FormEvent } from 'react';
import {
  Users,
  UserCheck,
  Plus,
  ArrowRightLeft,
  Check,
  ShieldCheck,
  Smartphone,
  X,
  RefreshCw,
  LogOut,
  KeyRound,
  ExternalLink,
  Lock
} from 'lucide-react';

type SystemAccount = {
  id: string;
  name: string;
  username: string;
  phone: string;
  role: string;
  status: 'connected' | 'ready' | 'offline';
  color: string;
  lastActive: string;
};

export function AccountsManagerModal({
  onClose,
  onOpenLoginFlow,
  onAccountSwitched,
  onLogout,
}: {
  onClose: () => void;
  onOpenLoginFlow?: () => void;
  onAccountSwitched?: (acc: SystemAccount) => void;
  onLogout?: () => void;
}) {
  const [accounts, setAccounts] = useState<SystemAccount[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const TG_SESSION_STORAGE_KEY = 'telegram_session_string';

  const fetchAccounts = () => {
    const savedSession = typeof window !== 'undefined' ? localStorage.getItem(TG_SESSION_STORAGE_KEY) : null;
    const headers: Record<string, string> = {};
    if (savedSession) {
      headers['Authorization'] = `Bearer ${savedSession}`;
      headers['x-telegram-session'] = savedSession;
    }

    fetch('/api/telegram/accounts', { headers })
      .then(res => res.json())
      .then(res => {
        setAccounts(res.accounts || []);
        setActiveId(res.activeId || (res.accounts?.[0]?.id ?? ''));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem(TG_SESSION_STORAGE_KEY);
      localStorage.removeItem('tg_session_string');
      document.cookie = 'tg_session_string=; Max-Age=0; path=/;';
    } catch {}

    try {
      await fetch('/api/telegram/auth/logout', { method: 'POST' });
    } catch {
      //
    }
    onClose();
    if (onLogout) {
      onLogout();
    } else {
      window.location.reload();
    }
  };

  const handleSwitchAccount = async (account: SystemAccount) => {
    if (account.id === activeId) return;
    setSwitchingId(account.id);
    try {
      const savedSession = typeof window !== 'undefined' ? localStorage.getItem(TG_SESSION_STORAGE_KEY) : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedSession) {
        headers['Authorization'] = `Bearer ${savedSession}`;
        headers['x-telegram-session'] = savedSession;
      }

      const res = await fetch('/api/telegram/accounts/switch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.sessionString) {
          try {
            localStorage.setItem(TG_SESSION_STORAGE_KEY, data.sessionString);
            localStorage.setItem('tg_session_string', data.sessionString);
            document.cookie = `tg_session_string=${encodeURIComponent(data.sessionString)}; Max-Age=31536000; path=/; SameSite=Lax`;
          } catch {}
        }
        setActiveId(account.id);
        setFeedback(`تم التبديل بنجاح إلى حساب: ${account.name}`);
        onAccountSwitched?.(account);
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      setFeedback('تعذر التبديل بين الحسابات');
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5" dir="rtl">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl fade-up">
        {/* Header */}
        <div className="flex flex-none items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">إدارة الحسابات وجلسات العمل</h2>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  متصل بجلسة Telegram
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                التبديل الفوري بين حسابات النشر والمراقبة وربطها بنظام تسجيل الدخول
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary border border-primary/20">
            <UserCheck size={16} />
            <span>{feedback}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {loading ? (
            <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin text-primary ml-2" />
              جارٍ تحميل بيانات الحسابات والجلسات...
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-4">
              <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-primary/10 text-primary">
                <Users size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">لا توجد حسابات تيليجرام نشطة</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  تم حذف وإلغاء جميع الحسابات التجريبية والوهمية. النظام يعمل فقط مع الحسابات الحقيقية الموثقة عبر بروتوكول تيليجرام الرسمي MTProto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLoginFlow?.();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-105 cursor-pointer"
              >
                <KeyRound size={15} />
                <span>تسجيل الدخول برقم هاتف حقيقي</span>
              </button>
            </div>
          ) : (
            <>
              {/* Active Account Highlight Card */}
              {(() => {
                const current = accounts.find(a => a.id === activeId) || accounts[0];
                if (!current) return null;
                return (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                        <ShieldCheck size={14} />
                        الحساب النشط حالياً في النظام
                      </span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        {current.lastActive}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-sm">
                          {current.name.slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">{current.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span className="font-mono" dir="ltr">{current.phone}</span>
                            <span>•</span>
                            <span className="text-primary font-medium">{current.role}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/20 cursor-pointer"
                          title="تسجيل الخروج من الحساب"
                        >
                          <LogOut size={13} />
                          <span>تسجيل الخروج</span>
                        </button>
                        <span className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                          <Check size={14} />
                          نشط
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Accounts List for Instant Switching */}
              {accounts.length > 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">الحسابات المتاحة للتبديل الفوري</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {accounts.length} حسابات موثقة
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {accounts.map(acc => {
                      const isCurrent = acc.id === activeId;
                      const isSwitching = switchingId === acc.id;

                      return (
                        <div
                          key={acc.id}
                          className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${
                            isCurrent
                              ? 'border-primary/40 bg-card shadow-xs'
                              : 'border-border bg-card/60 hover:border-primary/30 hover:bg-card'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="grid h-10 w-10 place-items-center rounded-xl font-bold text-sm text-white shadow-xs"
                              style={{ backgroundColor: acc.color || '#377c79' }}
                            >
                              {acc.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">{acc.name}</span>
                                <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">{acc.username}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                <span className="font-mono" dir="ltr">{acc.phone}</span>
                                <span>•</span>
                                <span>{acc.role}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isCurrent ? (
                              <span className="rounded-xl bg-secondary px-3 py-1.5 text-[11px] font-bold text-foreground">
                                الحساب الحالي
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSwitchAccount(acc)}
                                disabled={isSwitching}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-1.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-50 cursor-pointer"
                              >
                                {isSwitching ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ArrowRightLeft size={13} />
                                )}
                                <span>تبديل</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Login Interface Connection Box */}
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-primary" />
                    <span className="text-xs font-bold text-foreground">إضافة حساب جديد عبر التحقق الرسمي</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLoginFlow?.();
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-105 cursor-pointer"
                  >
                    <span>تسجيل دخول رسمي</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  يتم ربط أي حساب جديد فقط عبر إرسال رمز التحقق وكلمة المرور 2FA لبروتوكول تيليجرام الرسمي MTProto. لا يسمح النظام بأي حسابات وهمية أو غير مفعلة.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-none items-center justify-between border-t border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock size={13} className="text-emerald-500" />
            <span>الجلسات مشفرة ومحفوظة محلياً وفق معايير أمان Telegram MTProto</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-secondary px-5 py-2 text-xs font-medium text-foreground transition hover:bg-muted cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
