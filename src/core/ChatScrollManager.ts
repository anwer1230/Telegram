/**
 * ChatScrollManager.ts
 * Replicates official Telegram scroll position restoration mechanism:
 * - Default on opening a chat is ALWAYS scroll to bottom (scrollToBottom)
 * - Old scroll position is only restored if returning to the same chat within the active session
 * - Persistent restoration across page reloads is disabled to avoid jumping to old messages
 */

export interface ChatScrollState {
  chatId: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  firstVisibleMessageId?: string;
  topOffset: number;
  firstVisibleItemPosition: number;
  isNearBottom: boolean;
  visibleCount: number;
  savedTimestamp: number;
}

export class ChatScrollManager {
  private static instance: ChatScrollManager;
  private scrollStates: Map<string, ChatScrollState> = new Map();
  private currentAccount: number = 0;

  public static getInstance(currentAccount: number = 0): ChatScrollManager {
    if (!ChatScrollManager.instance) {
      ChatScrollManager.instance = new ChatScrollManager(currentAccount);
    }
    return ChatScrollManager.instance;
  }

  constructor(currentAccount: number = 0) {
    this.currentAccount = currentAccount;
  }

  /**
   * Saves current scroll metrics for a chat in active in-memory session only
   */
  public saveScrollPosition(
    chatId: string,
    container: HTMLElement | null,
    visibleCount: number,
    isNearBottom: boolean
  ): void {
    if (!chatId || !container) return;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    const messageElements = container.querySelectorAll<HTMLElement>('[data-message-id]');
    let firstVisibleMessageId: string | undefined;
    let topOffset = 0;
    let firstVisibleItemPosition = 0;

    const containerRect = container.getBoundingClientRect();
    for (let i = 0; i < messageElements.length; i++) {
      const el = messageElements[i];
      const rect = el.getBoundingClientRect();
      if (rect.bottom >= containerRect.top) {
        firstVisibleMessageId = el.getAttribute('data-message-id') || undefined;
        topOffset = rect.top - containerRect.top;
        firstVisibleItemPosition = i;
        break;
      }
    }

    const state: ChatScrollState = {
      chatId,
      scrollTop,
      scrollHeight,
      clientHeight,
      firstVisibleMessageId,
      topOffset,
      firstVisibleItemPosition,
      isNearBottom,
      visibleCount,
      savedTimestamp: Date.now(),
    };

    this.scrollStates.set(chatId, state);
  }

  /**
   * Retrieves saved scroll position for a chat (in-memory current session only)
   */
  public getScrollPosition(chatId: string): ChatScrollState | undefined {
    return this.scrollStates.get(chatId);
  }

  /**
   * Clears saved scroll position (e.g. when chat is closed or reset)
   */
  public clearScrollPosition(chatId?: string): void {
    if (chatId) {
      this.scrollStates.delete(chatId);
    } else {
      this.scrollStates.clear();
    }
  }

  /**
   * Restores scroll position in DOM container
   */
  public restoreScroll(
    chatId: string,
    container: HTMLElement | null,
    fallbackToBottom: boolean = true
  ): boolean {
    if (!chatId || !container) return false;
    const state = this.getScrollPosition(chatId);
    if (!state) {
      if (fallbackToBottom) {
        container.scrollTop = container.scrollHeight;
      }
      return false;
    }

    if (state.isNearBottom) {
      container.scrollTop = container.scrollHeight;
      return true;
    }

    if (state.firstVisibleMessageId) {
      const el = container.querySelector<HTMLElement>(`[data-message-id="${state.firstVisibleMessageId}"]`);
      if (el) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const currentRelTop = elRect.top - containerRect.top;
        const diff = currentRelTop - state.topOffset;
        container.scrollTop += diff;
        return true;
      }
    }

    if (state.scrollHeight > 0 && container.scrollHeight > 0) {
      const heightDiff = container.scrollHeight - state.scrollHeight;
      container.scrollTop = Math.max(0, state.scrollTop + heightDiff);
    } else if (state.scrollTop > 0) {
      container.scrollTop = state.scrollTop;
    } else {
      container.scrollTop = container.scrollHeight;
    }
    return true;
  }
}

export const chatScrollManager = ChatScrollManager.getInstance();
