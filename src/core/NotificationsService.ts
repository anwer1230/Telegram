/**
 * NotificationsService - Clean Telegram Web Notifications
 */

export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export class NotificationsService {
  private static instance: NotificationsService;

  public static getInstance(): NotificationsService {
    if (!NotificationsService.instance) {
      NotificationsService.instance = new NotificationsService();
    }
    return NotificationsService.instance;
  }

  public handleIncomingMessage(_message: any, _chatTitle: string): void {
    // Official Telegram messages handled directly via NotificationsController
  }

  public addMonitorAlert(_alert: any): void {
    // No-op in official Telegram Web
  }

  public haltTasks(_reason?: string): void {
    // No-op
  }

  public handleSessionRevoked(_reason?: string): void {
    // Official Telegram session revocation
  }
}

export const notificationsService = NotificationsService.getInstance();
