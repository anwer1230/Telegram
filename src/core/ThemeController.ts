/**
 * ThemeController.ts - Theme Engine, Color Keys & UI Metrics
 * 
 * Replicated directly from DrKLO/Telegram Android:
 * org.telegram.ui.ActionBar.Theme.java & ThemeColors.java
 */

import { AndroidUtilities } from './AndroidUtilities';

export interface ThemeMetrics {
  fontSize: number;          // 12 .. 30sp (default 16sp)
  bubbleRadius: number;      // 0 .. 24dp (default 16dp)
  bubblePaddingH: number;    // 12dp
  bubblePaddingV: number;    // 6dp
  avatarRadius: number;      // 50% circular
  iconSize: number;          // 24dp
  iconSmallSize: number;     // 18dp
  headerHeight: number;      // 56dp
  bottomBarHeight: number;   // 64dp
  dialogCellHeight: number;  // 72dp
  dialogAvatarSize: number;  // 54dp
  chatAvatarSize: number;    // 35dp
}

export const ThemeColorKeys = {
  // Dialogs & Windows
  key_dialogBackground: 'dialogBackground',
  key_dialogTextBlack: 'dialogTextBlack',
  key_dialogTextGray: 'dialogTextGray',
  key_dialogTextGray2: 'dialogTextGray2',
  key_dialogTextGray3: 'dialogTextGray3',
  key_dialogTextLink: 'dialogTextLink',
  key_dialogTextBlue: 'dialogTextBlue',
  key_dialogTextRed: 'dialogTextRed',
  key_windowBackgroundWhite: 'windowBackgroundWhite',
  key_windowBackgroundGray: 'windowBackgroundGray',
  key_windowBackgroundGrayShadow: 'windowBackgroundGrayShadow',

  // Action Bar
  key_actionBarDefault: 'actionBarDefault',
  key_actionBarDefaultIcon: 'actionBarDefaultIcon',
  key_actionBarDefaultTitle: 'actionBarDefaultTitle',
  key_actionBarDefaultSubtitle: 'actionBarDefaultSubtitle',

  // Chat List (Dialogs)
  key_chats_name: 'chats_name',
  key_chats_message: 'chats_message',
  key_chats_date: 'chats_date',
  key_chats_unreadCounter: 'chats_unreadCounter',
  key_chats_unreadCounterMuted: 'chats_unreadCounterMuted',
  key_chats_unreadCounterText: 'chats_unreadCounterText',
  key_chats_pinnedIcon: 'chats_pinnedIcon',
  key_chats_sentCheck: 'chats_sentCheck',
  key_chats_sentReadCheck: 'chats_sentReadCheck',
  key_chats_sentClock: 'chats_sentClock',

  // Message Bubbles
  key_chat_inBubble: 'chat_inBubble',
  key_chat_inBubbleSelected: 'chat_inBubbleSelected',
  key_chat_outBubble: 'chat_outBubble',
  key_chat_outBubbleSelected: 'chat_outBubbleSelected',
  key_chat_messageTextIn: 'chat_messageTextIn',
  key_chat_messageTextOut: 'chat_messageTextOut',
  key_chat_messageLinkIn: 'chat_messageLinkIn',
  key_chat_messageLinkOut: 'chat_messageLinkOut',
  key_chat_inTimeText: 'chat_inTimeText',
  key_chat_outTimeText: 'chat_outTimeText',
  key_chat_outSentCheck: 'chat_outSentCheck',
  key_chat_outSentCheckRead: 'chat_outSentCheckRead',
  key_chat_outSentClock: 'chat_outSentClock',
  key_chat_inReplyNameText: 'chat_inReplyNameText',
  key_chat_outReplyNameText: 'chat_outReplyNameText',
  key_chat_inReplyLine: 'chat_inReplyLine',
  key_chat_outReplyLine: 'chat_outReplyLine',
  key_chat_inReplyMessageText: 'chat_inReplyMessageText',
  key_chat_outReplyMessageText: 'chat_outReplyMessageText',
  key_chat_unreadMessagesStartText: 'chat_unreadMessagesStartText',
  key_chat_unreadMessagesStartBackground: 'chat_unreadMessagesStartBackground',
} as const;

export const DefaultThemeColors = {
  dialogBackground: '#FFFFFF',
  dialogTextBlack: '#222222',
  dialogTextGray: '#8E8E93',
  windowBackgroundWhite: '#FFFFFF',
  windowBackgroundGray: '#F0F2F5',
  actionBarDefault: '#50A7EA',
  chat_inBubble: '#FFFFFF',
  chat_outBubble: '#EFFDDE',
  chat_messageTextIn: '#000000',
  chat_messageTextOut: '#000000',
  chat_outSentCheckRead: '#4EA4F6',
};

export class ThemeController {
  private static instance: ThemeController;

  private metrics: ThemeMetrics = {
    fontSize: 16,
    bubbleRadius: 16,
    bubblePaddingH: 12,
    bubblePaddingV: 6,
    avatarRadius: 50,
    iconSize: 24,
    iconSmallSize: 18,
    headerHeight: 56,
    bottomBarHeight: 64,
    dialogCellHeight: 72,
    dialogAvatarSize: 54,
    chatAvatarSize: 35,
  };

  private isNightMode: boolean = false;

  public static getInstance(): ThemeController {
    if (!ThemeController.instance) {
      ThemeController.instance = new ThemeController();
    }
    return ThemeController.instance;
  }

  private constructor() {
    this.loadPersistedTheme();
  }

  private loadPersistedTheme() {
    try {
      const savedFontSize = localStorage.getItem('tg_font_size');
      if (savedFontSize) {
        this.metrics.fontSize = parseInt(savedFontSize, 10);
      }
      const savedRadius = localStorage.getItem('tg_bubble_radius');
      if (savedRadius) {
        this.metrics.bubbleRadius = parseInt(savedRadius, 10);
      }
      this.applyAllStyles();
    } catch {}
  }

  public getMetrics(): ThemeMetrics {
    return { ...this.metrics };
  }

  /**
   * Applies font scaling (12px .. 30px) to the document
   */
  public applyFontSize(fontSize: number) {
    const clamped = Math.max(12, Math.min(30, fontSize));
    this.metrics.fontSize = clamped;
    localStorage.setItem('tg_font_size', clamped.toString());

    document.documentElement.style.setProperty('--tg-chat-font-size', `${clamped}px`);
    document.documentElement.style.setProperty(
      '--tg-chat-bubble-scale',
      `${(clamped / 16).toFixed(2)}`
    );
  }

  /**
   * Applies bubble corner radius (0px .. 24px)
   */
  public applyBubbleCornerRadius(radius: number) {
    const clamped = Math.max(0, Math.min(24, radius));
    this.metrics.bubbleRadius = clamped;
    localStorage.setItem('tg_bubble_radius', clamped.toString());

    document.documentElement.style.setProperty('--tg-bubble-corner-radius', `${clamped}px`);
  }

  public applyAllStyles() {
    this.applyFontSize(this.metrics.fontSize);
    this.applyBubbleCornerRadius(this.metrics.bubbleRadius);
    document.documentElement.style.setProperty('--tg-bubble-padding-h', `${this.metrics.bubblePaddingH}px`);
    document.documentElement.style.setProperty('--tg-bubble-padding-v', `${this.metrics.bubblePaddingV}px`);
    document.documentElement.style.setProperty('--tg-dialog-cell-height', `${this.metrics.dialogCellHeight}px`);
    document.documentElement.style.setProperty('--tg-dialog-avatar-size', `${this.metrics.dialogAvatarSize}px`);
    document.documentElement.style.setProperty('--tg-chat-avatar-size', `${this.metrics.chatAvatarSize}px`);
  }

  /**
   * Calculates merged bubble border radius classes based on grouping flags
   * Replicated from Telegram Web K & Z styling standards
   */
  public getBubbleRadiusStyle(isOutgoing: boolean, group: {
    isGroupStart?: boolean;
    isGroupMiddle?: boolean;
    isGroupEnd?: boolean;
    isSingle?: boolean;
  }): string {
    const r = `${this.metrics.bubbleRadius}px`;
    const smR = '4px';
    const tailR = '2px';

    if (group.isSingle) {
      if (isOutgoing) {
        return `${r} ${r} ${tailR} ${r}`;
      } else {
        return `${r} ${r} ${r} ${tailR}`;
      }
    }

    if (isOutgoing) {
      // Outgoing message (right aligned)
      // CSS border-radius: top-left top-right bottom-right bottom-left
      if (group.isGroupStart) return `${r} ${r} ${smR} ${r}`;
      if (group.isGroupMiddle) return `${r} ${smR} ${smR} ${r}`;
      if (group.isGroupEnd) return `${r} ${smR} ${tailR} ${r}`;
    } else {
      // Incoming message (left aligned)
      // CSS border-radius: top-left top-right bottom-right bottom-left
      if (group.isGroupStart) return `${r} ${r} ${r} ${smR}`;
      if (group.isGroupMiddle) return `${smR} ${r} ${r} ${smR}`;
      if (group.isGroupEnd) return `${smR} ${r} ${r} ${tailR}`;
    }

    return `${r}`;
  }
}

export const themeController = ThemeController.getInstance();
