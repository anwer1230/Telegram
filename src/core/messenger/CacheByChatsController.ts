import { ChatCacheUsageInfo } from '../../types';

export const INITIAL_CHAT_CACHE_USAGE: ChatCacheUsageInfo[] = [];

class CacheByChatsController {
  private cacheStore: ChatCacheUsageInfo[] = [...INITIAL_CHAT_CACHE_USAGE];

  public getCacheUsageList(): ChatCacheUsageInfo[] {
    return this.cacheStore;
  }

  public getChatCache(chatId: string): ChatCacheUsageInfo | null {
    return this.cacheStore.find((c) => c.chatId === chatId) || null;
  }

  public clearChatMediaType(chatId: string, mediaType: 'all' | 'photos' | 'videos' | 'audio' | 'documents'): number {
    const item = this.cacheStore.find((c) => c.chatId === chatId);
    if (!item) return 0;

    let clearedBytes = 0;
    if (mediaType === 'all') {
      clearedBytes = item.totalBytes;
      item.photosBytes = 0;
      item.videosBytes = 0;
      item.audioBytes = 0;
      item.documentsBytes = 0;
      item.totalBytes = 0;
    } else if (mediaType === 'photos') {
      clearedBytes = item.photosBytes;
      item.photosBytes = 0;
      item.totalBytes -= clearedBytes;
    } else if (mediaType === 'videos') {
      clearedBytes = item.videosBytes;
      item.videosBytes = 0;
      item.totalBytes -= clearedBytes;
    } else if (mediaType === 'audio') {
      clearedBytes = item.audioBytes;
      item.audioBytes = 0;
      item.totalBytes -= clearedBytes;
    } else if (mediaType === 'documents') {
      clearedBytes = item.documentsBytes;
      item.documentsBytes = 0;
      item.totalBytes -= clearedBytes;
    }

    return clearedBytes;
  }

  public updateKeepMedia(chatId: string, mode: ChatCacheUsageInfo['keepMediaMode']): void {
    const item = this.cacheStore.find((c) => c.chatId === chatId);
    if (item) {
      item.keepMediaMode = mode;
    }
  }

  public getTotalCacheSize(): number {
    return this.cacheStore.reduce((acc, curr) => acc + curr.totalBytes, 0);
  }
}

export const cacheByChatsController = new CacheByChatsController();
