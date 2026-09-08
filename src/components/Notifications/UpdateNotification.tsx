/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RefreshCw, Sparkles, X, CheckCircle2, AlertTriangle, GitCommit, Layers } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

export const UpdateNotification: React.FC = () => {
  const { updateState, triggerAppUpdate, dismissUpdateNotification, settings, isAuthenticated } = useTelegram();
  const isArabic = settings.language === 'ar';
  const [deployTriggered, setDeployTriggered] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // STRICT RULE 2: FORBIDDEN to show if user is not authenticated or on login screen
  if (!isAuthenticated) {
    return null;
  }

  // If update notification is dismissed, no update, or count <= 0, do not render
  if (!updateState.showUpdateNotification || !updateState.hasUpdate || (updateState.updateCount ?? 0) <= 0) {
    return null;
  }

  const latestSha = updateState.fullCommitHash || updateState.commitHash || '';
  const lastShown = typeof window !== 'undefined' ? localStorage.getItem('last_shown_update_commit') : null;

  // STRICT RULE: Do not re-show if this exact commit was already shown/dismissed unless manually checked
  if (lastShown && latestSha && lastShown.toLowerCase() === latestSha.toLowerCase() && !deployTriggered) {
    return null;
  }

  const updateCount = updateState.updateCount || 1;

  // STRICT RULE:
  // if updateCount > 1: "يوجد N تحديثات جديدة متوفرة"
  // if updateCount == 1: "يوجد تحديث جديد واحد"
  const notificationTitle =
    updateCount > 1
      ? (isArabic ? `يوجد ${updateCount} تحديثات جديدة متوفرة` : `There are ${updateCount} new updates available`)
      : (isArabic ? 'يوجد تحديث جديد واحد' : 'There is 1 new update available');

  const handleUpdateClick = async () => {
    setLocalError(null);
    try {
      const success = await triggerAppUpdate();
      if (success) {
        setDeployTriggered(true);

        // Update localStorage to latest commit to strictly prevent re-showing
        if (latestSha && typeof window !== 'undefined') {
          localStorage.setItem('last_shown_update_commit', latestSha);
          localStorage.setItem('tg_installed_commit', latestSha);
        }

        // Wait 1.5 seconds so user reads the success message, then reload the entire app
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setLocalError(
          updateState.error ||
            (isArabic
              ? 'تعذر إرسال طلب التحديث إلى الخادم. يرجى المحاولة مرة أخرى.'
              : 'Failed to send deploy request. Please try again.')
        );
      }
    } catch (err: any) {
      setLocalError(err?.message || (isArabic ? 'حدث خطأ في الاتصال بالخادم' : 'Connection error'));
    }
  };

  const handleDismissClick = () => {
    if (latestSha && typeof window !== 'undefined') {
      localStorage.setItem('last_shown_update_commit', latestSha);
    }
    dismissUpdateNotification();
  };

  return (
    <aside
      id="tg-smart-update-notification"
      role="banner"
      aria-label={notificationTitle}
      dir={isArabic ? 'rtl' : 'ltr'}
      className="w-full z-[100] transition-all duration-300 select-none animate-in fade-in slide-in-from-top-2 bg-gradient-to-r from-[#17212b] via-[#1c2a38] to-[#17212b] border-b border-cyan-500/30 text-white shadow-xl"
    >
      <div className="max-w-7xl mx-auto px-3.5 py-2.5 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left / Info Section */}
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-400 mt-0.5 sm:mt-0">
            {updateState.isUpdating || deployTriggered ? (
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-white">
                {deployTriggered
                  ? (isArabic ? 'جاري تحديث التطبيق بالكامل...' : 'Updating application completely...')
                  : notificationTitle}
              </span>

              {updateCount > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Layers className="w-3 h-3" />
                  {updateCount} Commits
                </span>
              )}

              {updateState.commitHash && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-white/10 text-gray-300 border border-white/10">
                  <GitCommit className="w-3 h-3" />
                  {updateState.commitHash}
                </span>
              )}
            </div>

            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate max-w-xl">
              {deployTriggered ? (
                <span className="text-emerald-300 font-medium">
                  {isArabic
                    ? 'تم إرسال طلب التحديث بنجاح! جاري تحديث التطبيق بالكامل وإعادة التحميل...'
                    : 'Update triggered successfully! Reloading application...'}
                </span>
              ) : updateState.commitMessage ? (
                <span>
                  {isArabic ? 'أحدث تعديل: ' : 'Latest: '}
                  <span className="text-white font-medium">{updateState.commitMessage}</span>
                </span>
              ) : (
                <span>
                  {isArabic
                    ? 'تم دفع عدة تحديثات برمجية جديدة. انقر على "تحديث" لتطبيقها دفعة واحدة.'
                    : 'New updates were pushed to the repository. Click update to apply completely.'}
                </span>
              )}
            </p>

            {(localError || updateState.error) && !deployTriggered && (
              <p className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {localError || updateState.error}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {deployTriggered ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              <span>{isArabic ? 'جاري التحميل...' : 'Reloading...'}</span>
            </div>
          ) : (
            <>
              <button
                id="tg-update-trigger-btn"
                type="button"
                onClick={handleUpdateClick}
                disabled={updateState.isUpdating}
                className="px-3.5 py-1.5 rounded-lg bg-[#2481cc] hover:bg-[#1f6fa8] active:bg-[#195a88] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer min-h-[36px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${updateState.isUpdating ? 'animate-spin' : ''}`} />
                <span>
                  {updateState.isUpdating
                    ? (isArabic ? 'جاري التحديث...' : 'Updating...')
                    : (isArabic ? 'تحديث' : 'Update')}
                </span>
              </button>

              <button
                id="tg-update-dismiss-btn"
                type="button"
                onClick={handleDismissClick}
                disabled={updateState.isUpdating}
                title={isArabic ? 'إغلاق الإشعار' : 'Dismiss notification'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default UpdateNotification;
