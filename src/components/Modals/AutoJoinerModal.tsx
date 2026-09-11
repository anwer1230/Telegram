import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserPlus,
  Link as LinkIcon,
  Globe,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Play,
  Square,
  X,
  Loader2,
  Trash2,
  Plus,
  CheckSquare,
  Radio,
  Lock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { notificationsService } from '../../core/NotificationsService';
import { AutoJoinerTask } from '../../types';

export interface LinkValidationResult {
  isValid: boolean;
  type: 'public' | 'private' | 'invalid';
  reason?: string;
  normalizedUrl: string;
}

/**
 * Distinguishes between transient errors (e.g. FloodWait / rate limit, temporary network drops, server timeouts)
 * and permanent errors (e.g. expired invite hash, revoked session, banned from channel, user restrictions).
 */
export function isTransientError(task?: AutoJoinerTask): boolean {
  if (!task) return false;
  if (
    task.status === 'joined' ||
    task.status === 'already_member' ||
    task.status === 'pending' ||
    task.status === 'joining'
  ) {
    return false;
  }

  // Definite transient status in MTProto / Telegram
  if (task.status === 'rate_limited') {
    return true;
  }

  // Definite permanent status
  if (task.status === 'banned') {
    return false;
  }

  const rawReason = (task.errorReason || '').toLowerCase();

  // Known permanent failure patterns in English and Arabic
  const permanentKeywords = [
    'invite_hash_expired',
    'invite_hash_invalid',
    'hash_expired',
    'hash_invalid',
    'channel_private',
    'username_not_occupied',
    'username_invalid',
    'user_banned',
    'banned_in_channel',
    'chat_admin_required',
    'users_too_much',
    'auth_key_unregistered',
    'session_revoked',
    'منتهي الصلاحية',
    'محظور',
    'خاصة',
  ];

  if (permanentKeywords.some((k) => rawReason.includes(k))) {
    return false;
  }

  // Explicit transient keywords in English and Arabic
  const transientKeywords = [
    'flood',
    'wait',
    'slowmode',
    'rate_limit',
    'rate',
    'limit',
    'too_many',
    'قيود',
    'timeout',
    'network',
    'connection',
    'fetch',
    '500',
    '502',
    '503',
    '504',
    'server',
    'busy',
    'econn',
    'etimedout',
    'temporary',
    'retry',
  ];

  if (transientKeywords.some((k) => rawReason.includes(k))) {
    return true;
  }

  // Any other failure not explicitly marked as permanent is treated as transient and eligible for retry
  return true;
}

/**
 * Validates whether an input string conforms to a valid Telegram invite link or handle format:
 * - Public channel/group: https://t.me/<username>, t.me/<username>, telegram.me/<username> (username: 4-32 chars)
 * - Private invite: https://t.me/+<hash>, t.me/+<hash>, t.me/joinchat/<hash> (hash: min 5 chars)
 * - Public handle: @<username>
 */
export function validateTelegramLink(input: string): LinkValidationResult {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      type: 'invalid',
      reason: 'الرابط فارغ',
      normalizedUrl: '',
    };
  }

  // Check 1: Private Invite Link: t.me/+hash or t.me/joinchat/hash or telegram.me/+hash
  const privateRegex = /^(?:https?:\/\/)?(?:www\.)?(?:t(?:elegram)?\.me\/)(?:\+([a-zA-Z0-9_-]{5,})|joinchat\/([a-zA-Z0-9_-]{5,}))\/?$/i;
  const privateMatch = trimmed.match(privateRegex);
  if (privateMatch) {
    const hash = privateMatch[1] || privateMatch[2];
    return {
      isValid: true,
      type: 'private',
      normalizedUrl: `https://t.me/+${hash}`,
    };
  }

  // Check 1b: Incomplete or broken private invite link (missing or too short hash, e.g. t.me/+, t.me/joinchat/)
  const brokenPrivateRegex = /^(?:https?:\/\/)?(?:www\.)?(?:t(?:elegram)?\.me\/)(?:\+|joinchat\/)?\/?$/i;
  if (brokenPrivateRegex.test(trimmed) || /^(?:https?:\/\/)?(?:www\.)?t(?:elegram)?\.me\/\+[a-zA-Z0-9_-]{1,4}\/?$/i.test(trimmed)) {
    return {
      isValid: false,
      type: 'invalid',
      reason: 'رمز الدعوة الخاصة (+) ناقص أو غير مكتمل',
      normalizedUrl: trimmed,
    };
  }

  // Check 2: Public Channel/Group link: t.me/username or t.me/s/username or telegram.me/username
  const publicRegex = /^(?:https?:\/\/)?(?:www\.)?(?:t(?:elegram)?\.me\/)(?:s\/)?([a-zA-Z0-9_]{4,32})\/?$/i;
  const publicMatch = trimmed.match(publicRegex);
  if (publicMatch) {
    const username = publicMatch[1];
    // Exclude reserved paths
    const reserved = ['joinchat', 'share', 'contact', 'addstickers', 'proxy', 'socks', 'login', 'c'];
    if (reserved.includes(username.toLowerCase())) {
      return {
        isValid: false,
        type: 'invalid',
        reason: `مسار غير مخصص لقناة عامة (${username})`,
        normalizedUrl: trimmed,
      };
    }
    return {
      isValid: true,
      type: 'public',
      normalizedUrl: `https://t.me/${username}`,
    };
  }

  // Check 3: Public Handle format: @username
  const handleRegex = /^@([a-zA-Z0-9_]{4,32})$/;
  const handleMatch = trimmed.match(handleRegex);
  if (handleMatch) {
    const username = handleMatch[1];
    return {
      isValid: true,
      type: 'public',
      normalizedUrl: `https://t.me/${username}`,
    };
  }

  // Check 4: Channel Post link: t.me/username/1234
  const postRegex = /^(?:https?:\/\/)?(?:www\.)?(?:t(?:elegram)?\.me\/)([a-zA-Z0-9_]{4,32})\/(\d+)\/?$/i;
  const postMatch = trimmed.match(postRegex);
  if (postMatch) {
    const username = postMatch[1];
    return {
      isValid: true,
      type: 'public',
      normalizedUrl: `https://t.me/${username}`,
    };
  }

  // Check 5: Domain is t.me or telegram.me but syntax failed
  if (trimmed.includes('t.me') || trimmed.includes('telegram.me')) {
    if (/t(?:elegram)?\.me\/?$/i.test(trimmed)) {
      return {
        isValid: false,
        type: 'invalid',
        reason: 'الرابط لا يحتوي على اسم قناة أو رمز دعوة (t.me فارغ)',
        normalizedUrl: trimmed,
      };
    }
    if (/t(?:elegram)?\.me\/[a-zA-Z0-9_]{1,3}\/?$/i.test(trimmed)) {
      return {
        isValid: false,
        type: 'invalid',
        reason: 'اسم القناة قصير جداً (يتطلب 4 أحرف على الأقل)',
        normalizedUrl: trimmed,
      };
    }
    return {
      isValid: false,
      type: 'invalid',
      reason: 'صيغة رابط t.me غير صحيحة أو تحتوي على رموز غير مسموحة',
      normalizedUrl: trimmed,
    };
  }

  // Check 6: If it starts with @ but invalid length/chars
  if (trimmed.startsWith('@')) {
    return {
      isValid: false,
      type: 'invalid',
      reason: 'المعرف @ قصير جداً أو يحتوي على رموز غير مدعومة',
      normalizedUrl: trimmed,
    };
  }

  // Check 7: External domain
  return {
    isValid: false,
    type: 'invalid',
    reason: 'الرابط لا يتبع نطاق تيليجرام الرسمي (t.me)',
    normalizedUrl: trimmed,
  };
}

interface LinkItem {
  id: string;
  url: string;
  normalizedUrl: string;
  type: 'public' | 'private' | 'invalid';
  isValid: boolean;
  validationError?: string;
  selected: boolean;
}

export const AutoJoinerModal: React.FC = () => {
  const { activeModal, setActiveModal, settings, showToast } = useTelegram();
  const isArabic = settings?.language === 'ar';

  const [rawText, setRawText] = useState(
    'انضم إلى مجتمعنا التقني:\nhttps://t.me/tech_innovators_hub\nأو عبر الرابط الخاص: https://t.me/+Vip_Channel_2026\nتابعنا أيضاً على @flutter_devs_group\nhttps://t.me/ai_developers_cloud'
  );
  const [singleLinkInput, setSingleLinkInput] = useState('');
  const [singleLinkError, setSingleLinkError] = useState<string | null>(null);
  const [linkItems, setLinkItems] = useState<LinkItem[]>([]);
  const [tasks, setTasks] = useState<AutoJoinerTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fetchWebLinks, setFetchWebLinks] = useState(false);
  const [searchByName, setSearchByName] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<'selection' | 'raw_text'>('selection');

  // Validation Step State before triggering bulk join
  const [validationReview, setValidationReview] = useState<{
    isOpen: boolean;
    validItems: LinkItem[];
    invalidItems: LinkItem[];
  } | null>(null);

  // Sync extracted links from rawText when initialized or changed
  const syncLinksFromText = useCallback((text: string) => {
    const regexMatches = notificationsService.extractLinksFromRawText(text);

    // Also extract explicit line tokens so users pasting broken or external links see validation feedback
    const lineTokens = text
      .split(/[\r\n,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && (s.includes('t.me') || s.includes('telegram.me') || s.startsWith('@') || s.startsWith('http')));

    const candidates = Array.from(new Set([...regexMatches, ...lineTokens]));

    setLinkItems((prev) => {
      const existingMap = new Map(prev.map((item) => [item.url, item.selected]));
      return candidates.map((url, idx) => {
        const val = validateTelegramLink(url);
        return {
          id: `link_${idx}_${url}`,
          url,
          normalizedUrl: val.normalizedUrl || url,
          type: val.type,
          isValid: val.isValid,
          validationError: val.reason,
          selected: existingMap.has(url) ? (existingMap.get(url) ?? val.isValid) : val.isValid,
        };
      });
    });
  }, []);

  // Initialize links list on mount
  useEffect(() => {
    syncLinksFromText(rawText);
  }, []);

  // Subscribe to background task updates
  useEffect(() => {
    const unsub = notificationsService.subscribe(() => {
      setTasks([...notificationsService.getAutoJoinTasks()]);
    });
    setTasks([...notificationsService.getAutoJoinTasks()]);
    return () => unsub();
  }, []);

  // Quick statistics
  const selectedCount = useMemo(() => linkItems.filter((i) => i.selected).length, [linkItems]);
  const totalCount = linkItems.length;

  const validItemsCount = useMemo(() => linkItems.filter((i) => i.isValid).length, [linkItems]);
  const invalidItemsCount = useMemo(() => linkItems.filter((i) => !i.isValid).length, [linkItems]);

  const taskStatusMap = useMemo(() => {
    const map = new Map<string, AutoJoinerTask>();
    tasks.forEach((t) => map.set(t.url, t));
    return map;
  }, [tasks]);

  const stats = useMemo(() => {
    let joined = 0;
    let failed = 0;
    let joining = 0;
    let pending = 0;

    tasks.forEach((t) => {
      if (t.status === 'joined' || t.status === 'already_member') joined++;
      else if (t.status === 'invalid' || t.status === 'banned' || t.status === 'rate_limited') failed++;
      else if (t.status === 'joining') joining++;
      else if (t.status === 'pending') pending++;
    });

    return { joined, failed, joining, pending };
  }, [tasks]);

  // Distinguish transient vs permanent errors for retry operation
  const transientFailedTasks = useMemo(() => {
    return tasks.filter((t) => isTransientError(t));
  }, [tasks]);

  const permanentFailedTasks = useMemo(() => {
    return tasks.filter(
      (t) => (t.status === 'invalid' || t.status === 'banned') && !isTransientError(t)
    );
  }, [tasks]);

  const transientFailedCount = transientFailedTasks.length;
  const permanentFailedCount = permanentFailedTasks.length;

  // Current joining channel URL for progress bar subtitle
  const currentJoiningTask = useMemo(() => {
    return tasks.find((t) => t.status === 'joining');
  }, [tasks]);

  if (activeModal !== ('auto-joiner' as any)) return null;

  // Toggle individual link selection
  const handleToggleSelect = (id: string) => {
    if (isProcessing) return;
    setLinkItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Select all links
  const handleSelectAll = () => {
    if (isProcessing) return;
    setLinkItems((prev) => prev.map((item) => ({ ...item, selected: true })));
    showToast(isArabic ? 'تم تحديد جميع الروابط' : 'Selected all invite links', '✓');
  };

  // Deselect all links
  const handleDeselectAll = () => {
    if (isProcessing) return;
    setLinkItems((prev) => prev.map((item) => ({ ...item, selected: false })));
    showToast(isArabic ? 'تم إلغاء تحديد الروابط' : 'Deselected all links', 'ℹ️');
  };

  // Select only valid t.me links
  const handleSelectValidOnly = () => {
    if (isProcessing) return;
    setLinkItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.isValid,
      }))
    );
    showToast(
      isArabic
        ? `تم تحديد الروابط الصالحة فقط (${validItemsCount} رابط)`
        : `Selected valid t.me links only (${validItemsCount})`,
      '🛡️'
    );
  };

  // Select only transient failed links for targeted retry
  const handleSelectTransientFailed = () => {
    if (isProcessing) return;
    const transientUrls = new Set(transientFailedTasks.map((t) => t.url));
    setLinkItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: transientUrls.has(item.url) || transientUrls.has(item.normalizedUrl),
      }))
    );
    showToast(
      isArabic
        ? `تم تحديد الروابط الفاشلة مؤقتاً (${transientFailedCount})`
        : `Selected transient failed links (${transientFailedCount})`,
      '🔄'
    );
  };

  // Remove invalid links from list
  const handleRemoveInvalid = () => {
    if (isProcessing) return;
    setLinkItems((prev) => prev.filter((item) => item.isValid));
    showToast(isArabic ? 'تم حذف الروابط غير الصالحة من القائمة' : 'Removed invalid links from list', '🗑️');
  };

  // Filter selection by type
  const handleSelectByType = (type: 'public' | 'private') => {
    if (isProcessing) return;
    setLinkItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.type === type && item.isValid,
      }))
    );
    showToast(
      isArabic
        ? type === 'public'
          ? 'تم تحديد القنوات العامة الصالحة فقط'
          : 'تم تحديد روابط الدعوة الخاصة الصالحة فقط'
        : type === 'public'
        ? 'Selected valid public channels only'
        : 'Selected valid private invite links only',
      '🎯'
    );
  };

  // Delete a link from the list
  const handleDeleteLink = (id: string) => {
    if (isProcessing) return;
    setLinkItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Add single link manually with validation check
  const handleAddSingleLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSingleLinkError(null);
    const trimmed = singleLinkInput.trim();
    if (!trimmed) return;

    const validation = validateTelegramLink(trimmed);

    if (linkItems.some((item) => item.url === trimmed || (item.normalizedUrl && item.normalizedUrl === validation.normalizedUrl))) {
      setSingleLinkError(isArabic ? 'هذا الرابط مضاف مسبقاً في القائمة' : 'Link already exists in list');
      return;
    }

    const newItem: LinkItem = {
      id: `link_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      url: trimmed,
      normalizedUrl: validation.normalizedUrl || trimmed,
      type: validation.type,
      isValid: validation.isValid,
      validationError: validation.reason,
      selected: validation.isValid,
    };

    setLinkItems((prev) => [newItem, ...prev]);
    setSingleLinkInput('');

    if (validation.isValid) {
      showToast(isArabic ? 'تمت إضافة الرابط وهو صالح ✓' : 'Valid link added ✓', '✨');
    } else {
      showToast(
        isArabic
          ? `تنبيه: صيغة الرابط غير صالحة (${validation.reason})`
          : `Warning: Invalid t.me link (${validation.reason})`,
        '⚠️'
      );
    }
  };

  // Execute the actual bulk join after validation step confirms valid URLs
  const executeBulkJoin = async (urlsToJoin: string[]) => {
    if (urlsToJoin.length === 0) return;

    setValidationReview(null);
    setIsProcessing(true);
    setProgress({ processed: 0, total: urlsToJoin.length });

    fetch('/api/auto_join/advanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: urlsToJoin, fetch_external: fetchWebLinks }),
    }).catch(() => {});

    await notificationsService.startAutoJoinTasks(urlsToJoin, (processed, total) => {
      setProgress({ processed, total });
    });

    setIsProcessing(false);
    showToast(
      isArabic
        ? `اكتملت مهمة الانضمام الجماعي لـ ${urlsToJoin.length} رابط 🎉`
        : `Bulk join completed for ${urlsToJoin.length} links 🎉`,
      '✨'
    );
  };

  // Step 1: Trigger validation before bulk joining
  const handleStartJoinWithValidation = () => {
    const selectedItems = linkItems.filter((i) => i.selected);

    if (selectedItems.length === 0) {
      showToast(
        isArabic
          ? 'يرجى تحديد رابط قناة أو مجموعة واحدة على الأقل للبدء'
          : 'Please select at least one channel or invite link to join',
        '⚠️'
      );
      return;
    }

    const validSelected = selectedItems.filter((i) => i.isValid);
    const invalidSelected = selectedItems.filter((i) => !i.isValid);

    // If there are invalid links selected, show the Validation Step Dialog!
    if (invalidSelected.length > 0) {
      setValidationReview({
        isOpen: true,
        validItems: validSelected,
        invalidItems: invalidSelected,
      });
      return;
    }

    // If all selected are valid, proceed immediately
    const validUrls = validSelected.map((i) => i.normalizedUrl || i.url);
    executeBulkJoin(validUrls);
  };

  // Stop ongoing join operation
  const handleStopJoin = () => {
    notificationsService.stopAutoJoin();
    fetch('/api/auto_join/stop', { method: 'POST' }).catch(() => {});
    setIsProcessing(false);
    showToast(isArabic ? 'تم إيقاف عملية الانضمام الجماعي ⏹️' : 'Bulk join stopped ⏹️', '⚠️');
  };

  // Step 2: Auto-retry only transient failed links from the bulk operation
  const handleAutoRetryFailed = async () => {
    if (isProcessing) return;
    if (transientFailedTasks.length === 0) {
      showToast(
        isArabic
          ? 'لا توجد روابط ذات أخطاء مؤقتة لإعادة محاولتها'
          : 'No transient failed links found to retry',
        'ℹ️'
      );
      return;
    }

    const retryUrls = transientFailedTasks.map((t) => t.url);

    setIsProcessing(true);
    setProgress({ processed: 0, total: retryUrls.length });

    showToast(
      isArabic
        ? `بدء إعادة محاولة الانضمام لـ ${retryUrls.length} رابط واجه قيوداً مؤقتة...`
        : `Retrying ${retryUrls.length} links with transient errors...`,
      '🔄'
    );

    await notificationsService.retryTransientFailedTasks((processed, total) => {
      setProgress({ processed, total });
    });

    setIsProcessing(false);
    showToast(
      isArabic
        ? `اكتملت إعادة محاولة الروابط الفاشلة مؤقتاً (${retryUrls.length} رابط) ✨`
        : `Auto-retry completed for ${retryUrls.length} transient failed links ✨`,
      '✨'
    );
  };

  // Calculate percentage
  const progressPercent = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <div
      id="modal-auto-joiner-activity"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-2xl text-[#e8eaf6] rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/30 my-auto animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col relative"
        style={{
          background: 'linear-gradient(145deg, #071912, #0d2a1f, #040e0a)',
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30 shadow-inner">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>{isArabic ? 'الانضمام التلقائي الجماعي' : 'Bulk Channel Auto-Joiner'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  MTProto 2.0
                </span>
              </h3>
              <p className="text-[11px] text-emerald-300/80">
                {isArabic
                  ? 'التحقق الدقيق من صيغ t.me والتحديد المتعدد مع شريط تقدم مباشر'
                  : 'Multi-select with input format validation and live progress'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher & Quick Add Bar */}
        <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-white/5 bg-black/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('selection')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'selection'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تحديد الروابط' : 'Select Links'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                {selectedCount}/{totalCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw_text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'raw_text'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isArabic ? 'استخراج من نص' : 'Raw Text Extract'}</span>
            </button>
          </div>

          {/* Quick single link adder with real-time format validation */}
          <form onSubmit={handleAddSingleLink} className="flex-1 max-w-sm flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={singleLinkInput}
                  onChange={(e) => {
                    setSingleLinkInput(e.target.value);
                    if (singleLinkError) setSingleLinkError(null);
                  }}
                  placeholder={isArabic ? 'أضف رابطاً (@channel أو t.me/+)...' : 'Add invite link (@channel, t.me/+)...'}
                  className={`w-full bg-black/50 border rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors font-mono ${
                    singleLinkError
                      ? 'border-rose-500/70 focus:border-rose-400'
                      : 'border-white/10 focus:border-emerald-400'
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={!singleLinkInput.trim() || isProcessing}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                title={isArabic ? 'إضافة الرابط إلى القائمة' : 'Add link to list'}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isArabic ? 'إضافة' : 'Add'}</span>
              </button>
            </div>
            {singleLinkError && (
              <p className="text-[10px] text-rose-400 font-medium px-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{singleLinkError}</span>
              </p>
            )}
          </form>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: SELECTION & BULK MANAGEMENT */}
          {activeTab === 'selection' ? (
            <div className="space-y-3">
              {/* Validation Status & Filter Summary Bar */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Status Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isArabic ? 'فحص صيغ الروابط:' : 'Link Validation:'}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[11px] border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>
                        {validItemsCount} {isArabic ? 'صالح' : 'valid'}
                      </span>
                    </span>
                    {invalidItemsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold text-[11px] border border-rose-500/30 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>
                          {invalidItemsCount} {isArabic ? 'غير صالح' : 'invalid'}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Quick Cleaning Actions */}
                  {invalidItemsCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSelectValidOnly}
                        disabled={isProcessing}
                        className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all flex items-center gap-1"
                        title={isArabic ? 'تحديد الروابط الصالحة فقط واستبعاد غير الصالحة' : 'Select only valid t.me links'}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{isArabic ? 'تحديد الصالحة فقط' : 'Select Valid Only'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveInvalid}
                        disabled={isProcessing}
                        className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold transition-all flex items-center gap-1"
                        title={isArabic ? 'حذف جميع الروابط غير الصالحة من القائمة' : 'Remove invalid links from list'}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{isArabic ? 'حذف غير الصالحة' : 'Remove Invalid'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Bulk Select Control Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 flex-wrap gap-2">
                  <div className="text-[11px] text-gray-400 font-mono">
                    {isArabic ? 'المحدد حالياً:' : 'Currently selected:'}{' '}
                    <strong className="text-white font-bold">{selectedCount}</strong> / {totalCount}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      disabled={isProcessing || totalCount === 0}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-40 text-gray-200 text-[11px] font-medium transition-all"
                    >
                      {isArabic ? 'تحديد الكل' : 'Select All'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      disabled={isProcessing || selectedCount === 0}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-40 text-gray-200 text-[11px] font-medium transition-all"
                    >
                      {isArabic ? 'إلغاء التحديد' : 'Deselect All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectByType('public')}
                      disabled={isProcessing || totalCount === 0}
                      className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 active:scale-95 disabled:opacity-40 text-sky-300 text-[11px] font-medium transition-all flex items-center gap-1"
                      title={isArabic ? 'تحديد القنوات العامة فقط' : 'Select public channels only'}
                    >
                      <Radio className="w-3 h-3" />
                      <span>{isArabic ? 'العامة' : 'Public'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectByType('private')}
                      disabled={isProcessing || totalCount === 0}
                      className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 disabled:opacity-40 text-amber-300 text-[11px] font-medium transition-all flex items-center gap-1"
                      title={isArabic ? 'تحديد الروابط الخاصة فقط (+)' : 'Select private invite links only'}
                    >
                      <Lock className="w-3 h-3" />
                      <span>{isArabic ? 'الخاصة' : 'Private'}</span>
                    </button>

                    {transientFailedCount > 0 && !isProcessing && (
                      <button
                        type="button"
                        onClick={handleSelectTransientFailed}
                        className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300 text-[11px] font-semibold transition-all flex items-center gap-1 border border-amber-500/40 cursor-pointer"
                        title={
                          isArabic
                            ? 'تحديد الروابط التي واجهت قيوداً مؤقتة فقط'
                            : 'Select only transient failed links'
                        }
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>
                          {isArabic
                            ? `الفاشلة مؤقتاً (${transientFailedCount})`
                            : `Transient (${transientFailedCount})`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Selectable Links List with Validation Badges */}
              {linkItems.length === 0 ? (
                <div className="p-8 rounded-2xl bg-black/20 border border-white/5 text-center text-xs text-gray-400 space-y-2">
                  <LinkIcon className="w-8 h-8 text-gray-600 mx-auto opacity-50" />
                  <p>{isArabic ? 'لم يتم العثور على أي روابط في القائمة' : 'No channel invite links found'}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('raw_text')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-semibold transition-all"
                  >
                    {isArabic ? 'لصق نص لاستخراج الروابط' : 'Paste text to extract links'}
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {linkItems.map((item) => {
                    const task = taskStatusMap.get(item.url);
                    const status = task?.status;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleSelect(item.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-xs ${
                          item.selected
                            ? item.isValid
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-white shadow-sm'
                              : 'bg-rose-950/40 border-rose-500/40 text-rose-100 shadow-sm'
                            : 'bg-black/40 border-white/5 text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        {/* Checkbox + Validation Icon + Link URL */}
                        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={isProcessing}
                            onChange={() => {}}
                            className={`w-4 h-4 rounded cursor-pointer shrink-0 ${
                              item.isValid ? 'accent-emerald-500' : 'accent-rose-500'
                            }`}
                          />

                          {/* Link Type Badge with Validation state */}
                          {item.isValid ? (
                            item.type === 'private' ? (
                              <span
                                className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0"
                                title={isArabic ? 'رابط دعوة خاص صالح (+)' : 'Valid private invite'}
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span
                                className="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center justify-center shrink-0"
                                title={isArabic ? 'قناة عامة صالحة' : 'Valid public channel'}
                              >
                                <Radio className="w-3.5 h-3.5" />
                              </span>
                            )
                          ) : (
                            <span
                              className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0"
                              title={isArabic ? `صيغة غير صالحة: ${item.validationError}` : `Invalid: ${item.validationError}`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </span>
                          )}

                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-xs truncate dir-ltr select-text">
                              {item.url}
                            </span>
                            {!item.isValid && (
                              <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{item.validationError}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status / Validation Feedback + Delete Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {status === 'joined' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isArabic ? 'تم الانضمام' : 'Joined'}</span>
                            </span>
                          )}

                          {status === 'joining' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>{isArabic ? 'جاري الانضمام...' : 'Joining...'}</span>
                            </span>
                          )}

                          {/* Transient failure badge (e.g. rate limit, flood wait, network timeout) */}
                          {(status === 'rate_limited' || (status === 'invalid' && task && isTransientError(task))) && (
                            <span
                              className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30"
                              title={task?.errorReason || (isArabic ? 'خطأ مؤقت في الاتصال أو قيود السرعة' : 'Transient rate limit / network error')}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{isArabic ? 'مؤقت (قابل للإعادة)' : 'Transient Error'}</span>
                            </span>
                          )}

                          {/* Permanent failure badge (e.g. expired hash, banned, private) */}
                          {(status === 'banned' || (status === 'invalid' && task && !isTransientError(task))) && (
                            <span
                              className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold flex items-center gap-1 border border-rose-500/30"
                              title={task?.errorReason || (isArabic ? 'فشل دائم' : 'Permanent error')}
                            >
                              <XCircle className="w-3 h-3" />
                              <span>{task?.errorReason || (isArabic ? 'فشل دائم' : 'Failed')}</span>
                            </span>
                          )}

                          {!status && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                                item.isValid
                                  ? 'text-emerald-300/80 bg-emerald-500/10 border-emerald-500/20'
                                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                              }`}
                            >
                              {item.isValid
                                ? item.type === 'private'
                                  ? isArabic ? 't.me خاص' : 't.me private'
                                  : isArabic ? 't.me عام' : 't.me public'
                                : isArabic ? 'صيغة غير صالحة' : 'Invalid format'}
                            </span>
                          )}

                          {/* Delete Item */}
                          {!isProcessing && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLink(item.id);
                              }}
                              className="p-1 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title={isArabic ? 'إزالة من القائمة' : 'Remove link'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: RAW TEXT EXTRACTOR */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-200 flex items-center justify-between">
                  <span>{isArabic ? 'الصق النص الكامل لاستخراج الروابط منه:' : 'Paste raw message or text with links:'}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {notificationsService.extractLinksFromRawText(rawText).length}{' '}
                    {isArabic ? 'روابط مكتشفة' : 'links detected'}
                  </span>
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    syncLinksFromText(e.target.value);
                  }}
                  rows={5}
                  placeholder={
                    isArabic
                      ? 'الصق نصوصاً طويلة، رسائل، أو روابط تيليجرام عامة وخاصة...'
                      : 'Paste messages, posts, or multiple links to extract automatically...'
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 resize-none font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    syncLinksFromText(rawText);
                    setActiveTab('selection');
                    showToast(isArabic ? 'تم استخراج الروابط والتحقق منها بنجاح' : 'Links extracted & validated', '✨');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'تطبيق والانتقال لتحديد الروابط' : 'Extract & Open Selection'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Options: Web Scraping & Name Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="p-3 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors">
              <span className="text-xs font-medium text-gray-200 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>{isArabic ? 'جلب الروابط من صفحات الويب' : 'Scrape web pages for links'}</span>
              </span>
              <input
                type="checkbox"
                checked={fetchWebLinks}
                onChange={(e) => setFetchWebLinks(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
            </label>

            <label className="p-3 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors">
              <span className="text-xs font-medium text-gray-200 flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>{isArabic ? 'البحث عن أسماء المجموعات' : 'Search groups by name'}</span>
              </span>
              <input
                type="checkbox"
                checked={searchByName}
                onChange={(e) => setSearchByName(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          {/* ENHANCED REAL-TIME PROGRESS BAR */}
          {(isProcessing || progress.total > 0) && (
            <div
              id="tg-autojoin-progress-card"
              className="p-4 sm:p-5 rounded-3xl bg-black/60 border border-emerald-500/40 space-y-3 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Progress Header */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span className="font-bold text-white">
                    {isProcessing
                      ? isArabic
                        ? 'جاري الانضمام إلى القنوات المحددة...'
                        : 'Joining selected channels...'
                      : isArabic
                      ? 'اكتملت عملية الانضمام الجماعي'
                      : 'Bulk join operation completed'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-emerald-400 text-sm">
                    {progressPercent}%
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono">
                    ({progress.processed} / {progress.total})
                  </span>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full h-3 rounded-full bg-black/70 border border-white/10 p-0.5 overflow-hidden shadow-inner relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 transition-all duration-300 relative shadow-md shadow-emerald-500/50"
                  style={{
                    width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                  }}
                >
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                  )}
                </div>
              </div>

              {/* Status Breakdown Indicators */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between">
                  <span>{isArabic ? 'ناجحة:' : 'Success:'}</span>
                  <span className="font-bold font-mono">{stats.joined}</span>
                </div>

                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between">
                  <span>{isArabic ? 'فشلت:' : 'Failed:'}</span>
                  <span className="font-bold font-mono">
                    {stats.failed}
                    {transientFailedCount > 0 && (
                      <span className="text-[10px] text-amber-300 ml-1 font-normal">
                        ({transientFailedCount} {isArabic ? 'مؤقت' : 'transient'})
                      </span>
                    )}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 flex items-center justify-between">
                  <span>{isArabic ? 'متبقية:' : 'Remaining:'}</span>
                  <span className="font-bold font-mono">
                    {Math.max(0, progress.total - progress.processed)}
                  </span>
                </div>
              </div>

              {/* TRANSIENT ERRORS AUTO-RETRY CALLOUT BANNER */}
              {!isProcessing && transientFailedCount > 0 && (
                <div
                  id="tg-autojoin-retry-banner"
                  className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-amber-200 flex items-center gap-1.5 flex-wrap">
                        <span>
                          {isArabic
                            ? `روابط فشلت بأخطاء مؤقتة (${transientFailedCount})`
                            : `Transient Failures Available for Retry (${transientFailedCount})`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-200 font-mono">
                          {isArabic ? 'جاهز لإعادة المحاولة' : 'Ready to retry'}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                        {isArabic
                          ? `فشل الانضمام لـ ${transientFailedCount} رابط بسبب قيود مؤقتة (مثل FloodWait أو بطء الشبكة). الأخطاء الدائمة (${permanentFailedCount}) مستبعدة.`
                          : `${transientFailedCount} link(s) returned transient rate limits or network issues. Permanent errors (${permanentFailedCount}) are safely excluded.`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-auto-retry-failed-banner"
                    onClick={handleAutoRetryFailed}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-950/40 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'إعادة محاولة الفاشلة تلقائياً' : 'Auto-Retry Failed'}</span>
                  </button>
                </div>
              )}

              {/* Current joining channel subtitle */}
              {isProcessing && currentJoiningTask && (
                <div className="text-[11px] text-cyan-300/90 font-mono flex items-center gap-1.5 truncate pt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>
                    {isArabic ? 'المعالجة الحالية:' : 'Current target:'}{' '}
                    <strong className="text-white select-text">{currentJoiningTask.url}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INPUT VALIDATION STEP REVIEW OVERLAY (Triggers before bulk join if invalid links exist) */}
        {validationReview?.isOpen && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-6 flex flex-col justify-between animate-in fade-in duration-200">
            <div className="space-y-4 overflow-y-auto">
              {/* Validation Step Header */}
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {isArabic ? 'خطوة التحقق من صحة الروابط (Validation Step)' : 'Input Link Format Validation'}
                  </h4>
                  <p className="text-xs text-amber-300/90 mt-0.5">
                    {isArabic
                      ? `تم اكتشاف ${validationReview.invalidItems.length} روابط غير صالحة لا تطابق صيغة t.me الرسمية ضمن الروابط المحددة.`
                      : `Detected ${validationReview.invalidItems.length} invalid link(s) that do not match valid t.me formats.`}
                  </p>
                </div>
              </div>

              {/* Invalid Links Breakdown */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>
                    {isArabic
                      ? `الروابط غير الصالحة التي سيتم استبعادها (${validationReview.invalidItems.length}):`
                      : `Invalid Links to be excluded (${validationReview.invalidItems.length}):`}
                  </span>
                </h5>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {validationReview.invalidItems.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-rose-200 block truncate dir-ltr select-text">
                          {inv.url}
                        </span>
                        <span className="text-[10px] text-rose-400 font-medium">
                          {inv.validationError}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold shrink-0">
                        {isArabic ? 'غير صالح' : 'Invalid'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valid Links Ready for Join */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isArabic
                      ? `الروابط الصالحة الجاهزة للانضمام (${validationReview.validItems.length}):`
                      : `Valid Links Ready for Bulk Join (${validationReview.validItems.length}):`}
                  </span>
                </h5>
                {validationReview.validItems.length === 0 ? (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-400 text-center">
                    {isArabic
                      ? 'لا توجد أي روابط صالحة متبقية في التحديد الحالي. يُرجى مراجعة وتصحيح الروابط.'
                      : 'No valid links remaining in current selection. Please review and provide valid t.me links.'}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                    <span className="truncate">
                      {isArabic
                        ? `جميع هذه الروابط معتمدة بصيغ t.me وستتم معالجتها تباعاً بمعدل آمن لتجنب حظر التيليجرام.`
                        : `These links are verified t.me formats and will be joined using safe rate limiting.`}
                    </span>
                    <span className="font-mono font-bold shrink-0 ml-2">
                      {validationReview.validItems.length} {isArabic ? 'رابط' : 'links'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Step Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 mt-4">
              <button
                type="button"
                onClick={() => setValidationReview(null)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isArabic ? 'العودة لتعديل الروابط' : 'Back to Edit Links'}
              </button>

              <div className="flex items-center gap-2">
                {validationReview.validItems.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      // Deselect invalid items in main state
                      const validIds = new Set(validationReview.validItems.map((i) => i.id));
                      setLinkItems((prev) =>
                        prev.map((item) => ({
                          ...item,
                          selected: validIds.has(item.id),
                        }))
                      );
                      const validUrls = validationReview.validItems.map((i) => i.normalizedUrl || i.url);
                      executeBulkJoin(validUrls);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/60 flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {isArabic
                        ? `استبعاد غير الصالحة والانضمام للصالحة (${validationReview.validItems.length})`
                        : `Skip Invalid & Join Valid (${validationReview.validItems.length})`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setValidationReview(null)}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {isArabic ? 'تصحيح الروابط أولاً' : 'Fix Links First'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setActiveModal('none')}
            className="px-4 py-2.5 rounded-xl text-gray-400 hover:text-white text-xs font-bold transition-colors"
          >
            {isArabic ? 'إغلاق' : 'Close'}
          </button>

          <div className="flex items-center gap-2">
            {/* 'Auto-Retry Failed' Button: Retries only transient failed links from initial bulk operation */}
            {!isProcessing && transientFailedCount > 0 && (
              <button
                type="button"
                id="btn-auto-retry-failed"
                onClick={handleAutoRetryFailed}
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 active:scale-95 text-xs font-bold transition-all shadow-lg shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
                title={
                  isArabic
                    ? `إعادة محاولة الانضمام إلى ${transientFailedCount} رابط فشل بأخطاء مؤقتة (استبعاد الأخطاء الدائمة)`
                    : `Auto-retry ${transientFailedCount} links that returned transient errors during bulk join`
                }
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>
                  {isArabic
                    ? `إعادة محاولة الفاشلة تلقائياً (${transientFailedCount})`
                    : `Auto-Retry Failed (${transientFailedCount})`}
                </span>
              </button>
            )}

            {isProcessing ? (
              <button
                type="button"
                onClick={handleStopJoin}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950/50 flex items-center gap-2 cursor-pointer"
              >
                <Square className="w-4 h-4" />
                <span>{isArabic ? 'إيقاف الانضمام' : 'Stop Joining'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartJoinWithValidation}
                disabled={selectedCount === 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/60 flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {isArabic
                    ? `بدء الانضمام للمحدد (${selectedCount})`
                    : `Bulk Join Selected (${selectedCount})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
