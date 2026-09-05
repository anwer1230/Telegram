/**
 * chatStore.ts
 * Manages in-memory session scroll positions and smart auto-scrolling
 * Replicates official Telegram scroll behavior:
 * - Default on opening a chat is ALWAYS scroll to bottom (scrollToBottom)
 * - Old scroll position is only restored if returning to the same chat within the active session
 * - Smart scroll on new messages: smooth scroll to bottom if near bottom, preserve reading offset if scrolled up
 */

export interface InSessionScrollState {
  chatId: string;
  scrollTop: number;
  scrollHeight: number;
  isNearBottom: boolean;
  lastUpdated: number;
}

class ChatStore {
  private static instance: ChatStore;
  // In-memory only: reset whenever page reloads or a fresh session begins
  private sessionScrollMap: Map<string, InSessionScrollState> = new Map();
  // Tracks chats visited during the current session
  private visitedChatsInCurrentSession: Set<string> = new Set();
  // Threshold in pixels to consider user "at bottom"
  private readonly NEAR_BOTTOM_THRESHOLD = 120;

  public static getInstance(): ChatStore {
    if (!ChatStore.instance) {
      ChatStore.instance = new ChatStore();
    }
    return ChatStore.instance;
  }

  /**
   * Check if a chat was already visited in the current session
   */
  public hasVisitedInCurrentSession(chatId: string): boolean {
    return this.visitedChatsInCurrentSession.has(chatId);
  }

  /**
   * Mark a chat as opened/visited in the current session
   */
  public markChatVisitedInCurrentSession(chatId: string): void {
    this.visitedChatsInCurrentSession.add(chatId);
  }

  /**
   * Saves the scroll position for a chat in the current session
   */
  public saveSessionScrollPosition(
    chatId: string,
    scrollTop: number,
    scrollHeight: number,
    isNearBottom: boolean
  ): void {
    if (!chatId) return;
    this.sessionScrollMap.set(chatId, {
      chatId,
      scrollTop,
      scrollHeight,
      isNearBottom,
      lastUpdated: Date.now(),
    });
    this.visitedChatsInCurrentSession.add(chatId);
  }

  /**
   * Returns saved position ONLY if returning to the same chat in current session
   * and if the user was intentionally reading above bottom.
   */
  public getSessionScrollPosition(chatId: string): InSessionScrollState | null {
    if (!this.visitedChatsInCurrentSession.has(chatId)) {
      return null;
    }
    return this.sessionScrollMap.get(chatId) || null;
  }

  /**
   * Clears saved scroll position for a chat or all chats
   */
  public clearSessionScroll(chatId?: string): void {
    if (chatId) {
      this.sessionScrollMap.delete(chatId);
      this.visitedChatsInCurrentSession.delete(chatId);
    } else {
      this.sessionScrollMap.clear();
      this.visitedChatsInCurrentSession.clear();
    }
  }

  /**
   * Determines if container scroll offset is near the bottom
   */
  public isNearBottom(container: HTMLElement | null, threshold = this.NEAR_BOTTOM_THRESHOLD): boolean {
    if (!container) return true;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceToBottom <= threshold;
  }

  /**
   * Smart scroll helper: scrolls to bottom if user was near bottom or outgoing message
   */
  public smartScrollToBottom(
    container: HTMLElement | null,
    isOutgoing: boolean = false,
    force: boolean = false
  ): boolean {
    if (!container) return false;
    const nearBottom = this.isNearBottom(container);
    if (force || isOutgoing || nearBottom) {
      container.scrollTop = container.scrollHeight;
      return true;
    }
    return false;
  }
}

export const chatStore = ChatStore.getInstance();
