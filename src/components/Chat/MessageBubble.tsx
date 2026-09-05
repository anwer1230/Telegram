import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Pin,
  Reply,
  Share2,
  Smile,
  FileText,
  Download,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
  Megaphone,
  Lock,
  Clock,
} from 'lucide-react';
import { Message } from '../../types';
import { useTelegram } from '../../context/TelegramContext';
import { AudioPlayerWaveform } from './AudioPlayerWaveform';
import { LottieSticker } from './LottieSticker';
import { POPULAR_REACTIONS } from '../../data/mockTelegramData';
import { formatTelegramTime } from '../../utils/dateUtils';
import {
  renderInteractiveMessageText,
  ParsedLinkResult,
  isOnlyBigEmojis,
  renderBigAnimatedEmojis,
  extractLinkPreview,
} from '../../utils/linkParser';
import { useSwipeToReply, useLongPress } from '../../hooks/useTouchGestures';

import { themeController } from '../../core/ThemeController';

// Authentic Telegram Peer Colors (Red, Orange, Violet, Green, Cyan, Blue, Pink)
const PEER_COLORS = [
  '#e17076',
  '#faa774',
  '#a695e7',
  '#7bc862',
  '#6ec9cb',
  '#65aadd',
  '#ee7aae',
];

function getPeerColor(nameOrId: string = '') {
  let hash = 0;
  for (let i = 0; i < nameOrId.length; i++) {
    hash = (hash * 31 + nameOrId.charCodeAt(i)) % PEER_COLORS.length;
  }
  return PEER_COLORS[Math.abs(hash)] || PEER_COLORS[0];
}

interface MessageBubbleProps {
  message: Message;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  grouping?: {
    isGroupStart?: boolean;
    isGroupMiddle?: boolean;
    isGroupEnd?: boolean;
    isSingle?: boolean;
  };
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isFirstInGroup = true,
  isLastInGroup = true,
  grouping,
}) => {
  const {
    currentUser,
    activeChat,
    setReplyingTo,
    toggleReaction,
    setViewerMedia,
    votePoll,
    setMessageContextMenu,
    selectedMessageIds,
    toggleSelectMessage,
    resolveTelegramLink,
    openUserProfile,
    settings,
  } = useTelegram();

  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const lastTouchTapRef = React.useRef<number>(0);

  const isOutgoing = message.isOutgoing;
  const displayTime = (message.rawDate || message.epoch)
    ? formatTelegramTime(message.rawDate || message.epoch)
    : (message.timestamp || '');
  const isSelected = selectedMessageIds.includes(message.id);
  const isMultiSelectMode = selectedMessageIds.length > 0;
  const isArabic = settings.language === 'ar';

  const isStandaloneSticker =
    message.media?.type === 'sticker' && !message.text && !message.replyTo && !message.forwardedFrom;
  const bigEmojiCheck =
    !message.media && !message.replyTo && !message.forwardedFrom
      ? isOnlyBigEmojis(message.text)
      : { isBig: false, emojis: [] };
  const isStandaloneBigEmoji = bigEmojiCheck.isBig;

  // Telegram Link Preview (either pre-attached or dynamically extracted)
  const linkPreview = message.linkPreview || (message.text ? extractLinkPreview(message.text) : null);

  const handleLinkClick = (link: ParsedLinkResult) => {
    if (link.type === 'telegram_invite' || link.type === 'telegram_username' || link.type === 'telegram_scheme') {
      resolveTelegramLink(link.value);
    } else if (link.type === 'external_url') {
      window.open(link.value, '_blank', 'noopener,noreferrer');
    } else {
      resolveTelegramLink(link.value);
    }
  };

  const renderStatus = () => {
    if (!isOutgoing) return null;
    if (message.status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-[#4fae4e]" />;
    if (message.status === 'delivered' || message.status === 'sent')
      return <Check className="w-3.5 h-3.5 text-gray-400" />;
    return <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMessageContextMenu({
      message,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const triggerHeartReaction = () => {
    toggleReaction(message.id, '❤️');
    setShowHeartBurst(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch {}
    }
    setTimeout(() => setShowHeartBurst(false), 1000);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHeartReaction();
  };

  const handleTouchTap = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchTapRef.current < 280) {
      triggerHeartReaction();
    }
    lastTouchTapRef.current = now;
  };

  const handleBubbleClick = (e: React.MouseEvent) => {
    if (isMultiSelectMode) {
      e.stopPropagation();
      toggleSelectMessage(message.id);
    }
  };

  const handleSenderClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    if (isOutgoing) {
      openUserProfile({
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        avatar: currentUser.avatar,
        bio: currentUser.bio || (isArabic ? 'حسابي الشخصي في تيليجرام' : 'My personal Telegram account'),
        phone: currentUser.phone,
        isVerified: currentUser.isVerified,
        isPremium: currentUser.isPremium,
        isOnline: true,
        sourceChatId: activeChat?.id,
        sourceChatTitle: activeChat?.title,
      });
      return;
    }

    // Incoming sender resolution
    const senderId = message.senderId || `user_${message.senderName?.replace(/\s+/g, '_') || 'anonymous'}`;
    const senderName = message.senderName || activeChat?.title || 'User';
    const senderAvatar = message.senderAvatar || activeChat?.avatar || '';
    const senderUsername = message.senderUsername || (activeChat?.type === 'private' ? activeChat?.username : undefined) || senderName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    openUserProfile({
      id: senderId,
      name: senderName,
      username: senderUsername,
      avatar: senderAvatar,
      bio: activeChat?.description || (isArabic ? 'مستخدم نشط على سحابة تيليجرام 🚀' : 'Active Telegram user 🚀'),
      phone: activeChat?.type === 'private' ? '+1 415 555 0199' : undefined,
      isVerified: activeChat?.isVerified,
      isBot: activeChat?.type === 'bot',
      isOnline: true,
      lastSeen: isArabic ? 'متصل الآن' : 'online',
      sourceChatId: activeChat?.id,
      sourceChatTitle: activeChat?.title,
    });
  };

  const triggerReply = () => {
    setReplyingTo({
      messageId: message.id,
      senderName: message.senderName || (isOutgoing ? currentUser.name : 'User'),
      textSnippet: message.text || (message.media ? `[${message.media.type}]` : ''),
      mediaType: message.media?.type as 'photo' | 'audio' | 'document' | 'video' | undefined,
    });
  };

  const { swipeOffset, touchHandlers } = useSwipeToReply(triggerReply, isArabic);

  const longPressHandlers = useLongPress(
    (e) => {
      const touch = 'touches' in e ? e.touches[0] || (e as any).changedTouches?.[0] : e;
      setMessageContextMenu({
        message,
        x: touch ? touch.clientX : window.innerWidth / 2,
        y: touch ? touch.clientY : window.innerHeight / 2,
      });
    },
    () => {
      if (isMultiSelectMode) {
        toggleSelectMessage(message.id);
      }
    },
    420
  );

  return (
    <div
      id={`msg-bubble-container-${message.id}`}
      data-msg-id={message.id}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onTouchStart={(e) => {
        touchHandlers.onTouchStart(e);
        longPressHandlers.onTouchStart(e);
        handleTouchTap(e);
      }}
      onTouchMove={(e) => {
        touchHandlers.onTouchMove(e);
        longPressHandlers.onTouchMove(e);
      }}
      onTouchEnd={(e) => {
        touchHandlers.onTouchEnd();
        longPressHandlers.onTouchEnd(e);
      }}
      onMouseDown={longPressHandlers.onMouseDown}
      onMouseMove={longPressHandlers.onMouseMove}
      onMouseUp={longPressHandlers.onMouseUp}
      onMouseLeave={longPressHandlers.onMouseLeave}
      style={{
        transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
        transition: swipeOffset ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      className={`group relative flex items-end gap-2 px-3 py-0.5 select-none transition-colors ${
        isOutgoing ? 'justify-end' : 'justify-start'
      } ${isSelected ? 'bg-sky-500/15' : ''}`}
    >
      {/* Heart Burst Animation on Double-Tap */}
      {showHeartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-300">
          <div className="text-4xl drop-shadow-xl animate-bounce">
            ❤️
          </div>
        </div>
      )}
      {/* Swipe to reply circular icon indicator */}
      {Math.abs(swipeOffset) > 10 && (
        <div
          className={`absolute self-center z-10 w-8 h-8 rounded-full bg-[#2481cc] text-white flex items-center justify-center shadow-lg transition-transform ${
            Math.abs(swipeOffset) > 40 ? 'scale-110 ring-2 ring-white/50' : 'scale-90 opacity-75'
          } ${isArabic ? 'right-2' : 'left-2'}`}
        >
          <Reply className="w-4 h-4" />
        </div>
      )}
      {/* Multi-select checkbox indicator */}
      {isMultiSelectMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSelectMessage(message.id);
          }}
          className="self-center p-1 text-[#2481cc]"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 fill-[#2481cc] text-white" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </button>
      )}

      {/* Sender Avatar for incoming messages - Official Telegram Standard (35dp x 35dp) with click to view profile */}
      {!isOutgoing && (
        <button
          type="button"
          onClick={handleSenderClick}
          title={message.senderName || (isArabic ? 'الملف الشخصي' : 'Profile')}
          className="w-[35px] h-[35px] rounded-full overflow-hidden shrink-0 self-end mb-1 cursor-pointer hover:scale-110 active:scale-95 transition-transform ring-1 ring-white/10 shadow-sm focus:outline-none"
        >
          {message.senderAvatar ? (
            <img
              src={message.senderAvatar}
              alt={message.senderName || 'Avatar'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-full h-full text-white font-bold text-xs flex items-center justify-center shadow-inner"
              style={{
                backgroundColor: getPeerColor(String(message.senderId || message.senderName || 'U')),
              }}
            >
              {message.senderName?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </button>
      )}

      {/* Bubble Container */}
      <div className="relative max-w-[85%] sm:max-w-[70%] md:max-w-[65%] flex flex-col">
        {/* Quick Reaction popup on hover */}
        <div
          className={`absolute -top-7 ${
            isOutgoing ? 'right-2' : 'left-2'
          } z-20 hidden group-hover:flex items-center gap-1 px-2 py-1 rounded-full bg-[#182533]/90 backdrop-blur-md border border-white/10 shadow-lg text-sm`}
        >
          {POPULAR_REACTIONS.slice(0, 5).map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                toggleReaction(message.id, emoji);
              }}
              className="hover:scale-130 transition-transform active:scale-95 px-0.5"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setReplyingTo({
                messageId: message.id,
                senderName: message.senderName || (isOutgoing ? currentUser.name : 'User'),
                textSnippet: message.text || (message.media ? `[${message.media.type}]` : ''),
                mediaType: message.media?.type as 'photo' | 'audio' | 'document' | 'video' | undefined,
              });
            }}
            className="hover:text-sky-400 p-0.5 text-gray-300"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* The Visual Bubble or Standalone Sticker / Big Emoji Presentation */}
        {isStandaloneSticker ? (
          <div className="relative group/sticker my-1 flex flex-col items-center select-none">
            <LottieSticker
              lottieData={message.media?.lottieData}
              stickerId={message.media?.stickerId}
              url={message.media?.url}
              size={155}
              autoplay={true}
              loop={true}
            />
            {/* Native Telegram translucent floating timestamp & status badge */}
            <div
              className={`absolute bottom-1 end-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white flex items-center gap-1 shadow-md select-none pointer-events-none`}
            >
              {message.isPinned && <Pin className="w-2.5 h-2.5 text-sky-400 -rotate-45" />}
              <span>{displayTime}</span>
              {renderStatus()}
            </div>
          </div>
        ) : isStandaloneBigEmoji ? (
          <div className="relative group/bigemoji my-1 flex flex-col items-center select-none">
            {renderBigAnimatedEmojis(bigEmojiCheck.emojis)}
            {/* Floating timestamp badge */}
            <div
              className={`absolute -bottom-1 end-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white flex items-center gap-1 shadow-md select-none pointer-events-none`}
            >
              {message.isPinned && <Pin className="w-2.5 h-2.5 text-sky-400 -rotate-45" />}
              <span>{displayTime}</span>
              {renderStatus()}
            </div>
          </div>
        ) : (
          <div
            className={`relative px-3.5 py-2 text-sm shadow-sm transition-all ${
              isOutgoing
                ? 'tg-bubble-out text-[var(--tg-theme-bubble-out-text)] self-end'
                : 'tg-bubble-in text-[var(--tg-theme-bubble-in-text)] self-start'
            }`}
            style={{
              borderRadius: themeController.getBubbleRadiusStyle(isOutgoing, grouping || {
                isGroupStart: isFirstInGroup,
                isGroupEnd: isLastInGroup,
                isSingle: isFirstInGroup && isLastInGroup,
              }),
              backgroundColor: isOutgoing
                ? 'var(--tg-theme-bubble-out)'
                : 'var(--tg-theme-bubble-in)',
            }}
          >
            {/* Sender Name for incoming messages - Telegram Peer Colors + Click to open Profile + Rank Badge */}
            {!isOutgoing && (message.senderName || activeChat?.title) && (
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <button
                  type="button"
                  onClick={handleSenderClick}
                  className="font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer transition-opacity active:opacity-75 text-left rtl:text-right focus:outline-none"
                  style={{
                    color: getPeerColor(String(message.senderId || message.senderName || activeChat?.title)),
                  }}
                >
                  <span>{message.senderName || activeChat?.title}</span>
                  {message.senderUsername && (
                    <span className="text-[10px] font-normal text-gray-400 font-mono">
                      @{message.senderUsername}
                    </span>
                  )}
                </button>

                {/* DrKLO ChatMessageCell Admin/Creator/Restricted Rank Badge */}
                {((message as any).senderRole === 'creator' || (message as any).senderRank?.includes('مالك') || (message as any).senderRank?.includes('owner') || (message as any).senderRank?.includes('creator')) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#33FFB300] text-[#FFD54F] border border-[#FFD54F]/30 flex items-center gap-0.5">
                    <span>👑</span>
                    <span>{(message as any).senderRank || (isArabic ? 'مالك' : 'Owner')}</span>
                  </span>
                )}
                {((message as any).senderRole === 'admin' || (message as any).senderRank?.includes('مشرف') || (message as any).senderRank?.includes('admin')) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#3329B6F6] text-[#4FC3F7] border border-[#4FC3F7]/30 flex items-center gap-0.5">
                    <span>🛡️</span>
                    <span>{(message as any).senderRank || (isArabic ? 'مشرف' : 'Admin')}</span>
                  </span>
                )}
              </div>
            )}

            {/* Forwarded Header */}
            {message.forwardedFrom && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  openUserProfile({
                    id: message.forwardedFrom?.fromChatId || `fwd_${message.forwardedFrom?.fromChatName}`,
                    name: message.forwardedFrom!.fromChatName,
                    username: message.forwardedFrom!.fromChatName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                    bio: isArabic ? 'مصدر الرسالة المحولة 🔄' : 'Source of forwarded message 🔄',
                    isOnline: false,
                  });
                }}
                className="mb-1 text-xs text-sky-400/90 flex items-center gap-1 border-l-2 border-sky-400 pl-2 rtl:border-l-0 rtl:border-r-2 rtl:pl-0 rtl:pr-2 cursor-pointer hover:underline"
              >
                <Share2 className="w-3 h-3" />
                <span>
                  {isArabic ? 'محولة من' : 'Forwarded from'}{' '}
                  <strong>{message.forwardedFrom.fromChatName}</strong>
                </span>
              </div>
            )}

            {/* Reply Quote Header */}
            {message.replyTo && (
              <div
                className={`mb-1.5 p-1.5 rounded-lg border-l-2 text-xs flex flex-col ${
                  isOutgoing
                    ? 'bg-black/10 border-white/40'
                    : 'bg-black/15 border-sky-400'
                } rtl:border-l-0 rtl:border-r-2`}
              >
                <span className="font-bold text-[11px] text-sky-400 truncate">
                  {message.replyTo.senderName}
                </span>
                <span className="text-[11px] opacity-80 truncate">
                  {message.replyTo.textSnippet}
                </span>
              </div>
            )}

            {/* MEDIA: Photo */}
            {message.media?.type === 'photo' && message.media.url && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerMedia({
                    url: message.media!.url!,
                    title: message.text,
                    sender: message.senderName || (isOutgoing ? currentUser.name : 'User'),
                    timestamp: String(message.timestamp),
                  });
                }}
                className="my-1 rounded-xl overflow-hidden cursor-pointer relative group/media max-h-80"
              >
                <img
                  src={message.media.url}
                  alt="Media content"
                  className="w-full h-auto object-cover rounded-xl hover:scale-[1.01] transition-transform duration-200"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* MEDIA: Sticker */}
            {message.media?.type === 'sticker' && (
              <div className="my-1 flex items-center justify-center">
                <LottieSticker
                  lottieData={message.media.lottieData}
                  stickerId={message.media.stickerId}
                  url={message.media.url}
                  size={140}
                  autoplay={true}
                  loop={true}
                />
              </div>
            )}

            {/* MEDIA: Voice note with real audio waves */}
            {message.media?.type === 'voice' && (
              <AudioPlayerWaveform
                audioUrl={message.media.url}
                duration={message.media.duration || 12}
                waveform={message.media.waveform}
                isOutgoing={isOutgoing}
              />
            )}

            {/* MEDIA: Document / File */}
            {message.media?.type === 'document' && (
              <div className="my-1 p-2 rounded-xl bg-black/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2481cc] text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs truncate">
                    {message.media.fileName || 'document.pdf'}
                  </div>
                  <div className="text-[10px] opacity-75">
                    {message.media.fileSize || '2.4 MB'}
                  </div>
                </div>
                <button className="p-1.5 rounded-full hover:bg-white/10 text-gray-300">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* MEDIA: Poll */}
            {message.media?.type === 'poll' && message.media.pollData && (
              <div className="my-1.5 space-y-2 min-w-[220px]">
                <div className="font-bold text-xs">
                  {message.media.pollData.question}
                </div>
                <div className="space-y-1.5">
                  {message.media.pollData.options.map((opt) => {
                    const hasVoted = opt.voters.includes(currentUser.id);
                    const total = message.media!.pollData!.totalVotes || 1;
                    const percent = Math.round((opt.votes / total) * 100) || 0;
                    return (
                      <button
                        key={opt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          votePoll(message.id, opt.id);
                        }}
                        className={`w-full p-2 rounded-xl border text-left rtl:text-right text-xs transition-all relative overflow-hidden flex items-center justify-between ${
                          hasVoted
                            ? 'border-sky-400 bg-sky-500/20 font-bold'
                            : 'border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <div
                          className="absolute inset-0 bg-sky-500/15 pointer-events-none transition-all"
                          style={{ width: `${percent}%` }}
                        />
                        <span className="relative z-10">{opt.text}</span>
                        <span className="relative z-10 font-mono text-[10px] opacity-80">
                          {percent}% ({opt.votes})
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] opacity-75 text-right rtl:text-left">
                  {message.media.pollData.totalVotes}{' '}
                  {isArabic ? 'صوت' : 'votes'}
                </div>
              </div>
            )}

            {/* Message Text with interactive links, mentions, and custom animated emojis */}
            {message.text && (
              <div className="whitespace-pre-wrap break-words leading-relaxed">
                {renderInteractiveMessageText(message.text, handleLinkClick)}
              </div>
            )}

            {/* Telegram Rich Link Preview Card */}
            {linkPreview && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleLinkClick({
                    type:
                      linkPreview.type === 'telegram_invite'
                        ? 'telegram_invite'
                        : linkPreview.type === 'telegram_channel'
                        ? 'telegram_username'
                        : 'external_url',
                    value: linkPreview.channelUsername || linkPreview.url,
                    display: linkPreview.displayUrl,
                  });
                }}
                className="mt-2 p-2.5 rounded-xl border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/15 transition-colors cursor-pointer border-l-2 rtl:border-l-0 rtl:border-r-2 border-l-sky-400 rtl:border-r-sky-400 space-y-1 select-none"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-sky-400">
                  <div className="flex items-center gap-1 truncate">
                    {linkPreview.type === 'telegram_channel' && (
                      <Megaphone className="w-3 h-3 text-sky-400 shrink-0" />
                    )}
                    <span>{linkPreview.siteName || 'Link'}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-sky-400/70 shrink-0 ml-1 rtl:ml-0 rtl:mr-1" />
                </div>
                <div className="text-xs font-bold text-white line-clamp-1 leading-snug">
                  {linkPreview.title}
                </div>
                {linkPreview.description && (
                  <div className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed">
                    {linkPreview.description}
                  </div>
                )}
                {linkPreview.image && (
                  <div className="mt-1.5 rounded-lg overflow-hidden max-h-36 w-full">
                    <img
                      src={linkPreview.image}
                      alt={linkPreview.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Metadata footer: Secret Badge + (edited) + Pinned + Time + Read status */}
            <div
              className={`flex items-center gap-1 text-[10px] mt-1 select-none ${
                isOutgoing ? 'justify-end' : 'justify-end'
              } opacity-70`}
            >
              {message.isSecret && (
                <span className="inline-flex items-center gap-0.5 text-emerald-400 text-[9px] font-bold">
                  <Lock className="w-2.5 h-2.5" />
                  {message.ttlSeconds ? (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{message.ttlSeconds}s</span>
                    </span>
                  ) : null}
                </span>
              )}
              {message.isPinned && (
                <Pin className="w-3 h-3 text-sky-400 -rotate-45" />
              )}
              {message.isEdited && (
                <span className="text-[9px] italic">
                  {isArabic ? 'معدلة' : 'edited'}
                </span>
              )}
              <span>{displayTime}</span>
              {renderStatus()}
            </div>
          </div>
        )}

        {/* Reaction Badges underneath message */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
            {message.reactions.map((reaction) => {
              const hasUserReacted = reaction.users.includes(currentUser.id);
              return (
                <button
                  key={reaction.emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReaction(message.id, reaction.emoji);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                    hasUserReacted
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 scale-105'
                      : 'bg-black/20 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-[10px] font-mono">{reaction.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
