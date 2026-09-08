import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';

// Safe require helper that works across tsx (ESM) and bundled CJS (dist/server.cjs)
const getSafeRequire = (): NodeRequire => {
  if (typeof require === 'function') {
    return require;
  }
  const metaUrl = (typeof import.meta !== 'undefined' && (import.meta as any)?.url)
    ? (import.meta as any).url
    : `file://${path.resolve(process.cwd(), 'server.ts')}`;
  return createRequire(metaUrl);
};

const safeRequire = getSafeRequire();

export interface StoredAutomationRule {
  id: string;
  keyword: string;
  replyText: string;
  reply: string;
  matchType: 'exact' | 'contains' | 'regex';
  match: 'exact' | 'contains' | 'regex';
  scope: 'all' | 'private' | 'groups';
  isEnabled: boolean;
  timesTriggered: number;
  used_count: number;
  last_used: number;
  lastTriggeredAt?: string;
  created_at?: number;
  updated_at?: number;
}

export interface StoredBatchMessage {
  id: string;
  text: string;
  hasImages: boolean;
  imagesCount: number;
  groupsCount: number;
  targets: Array<{ chatId: string; chatTitle: string; messageId: string }>;
  date: string;
  timestamp: string;
  created_at?: number;
  updated_at?: number;
}

export interface StoredPrivateAutoReply {
  id: string;
  keyword: string;
  reply: string;
  is_active: boolean;
  created_at?: number;
  updated_at?: number;
}

/**
 * Common SQLite Driver interface supporting both native node:sqlite and WebAssembly sql.js fallback.
 */
interface SQLiteDriver {
  exec(sql: string): void;
  run(sql: string, params?: any[]): { changes?: number; lastInsertRowid?: number | bigint };
  all<T = any>(sql: string, params?: any[]): T[];
  get<T = any>(sql: string, params?: any[]): T | undefined;
  close?(): void;
}

export class SQLiteDatabaseService {
  private db: SQLiteDriver | null = null;
  private dbFilePath: string;
  private isInitialized = false;

  constructor(customPath?: string) {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        console.warn('[SQLite] Could not create data directory:', e);
      }
    }
    this.dbFilePath = customPath || process.env.SQLITE_DB_PATH || path.join(dataDir, 'bot_storage.sqlite');
    this.initDriver();
  }

  /**
   * Initializes the SQLite driver.
   * Prefers Node.js 22+ built-in node:sqlite DatabaseSync for zero native compilation dependencies,
   * with seamless fallback to sql.js if node:sqlite is unavailable.
   */
  private initDriver(): void {
    if (this.db) return;

    // 1. Try native node:sqlite DatabaseSync (Node 22+)
    try {
      // Use dynamic safeRequire to avoid bundling issues
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeSqlite = safeRequire('node:sqlite');
      if (nodeSqlite && nodeSqlite.DatabaseSync) {
        const nativeDb = new nodeSqlite.DatabaseSync(this.dbFilePath);
        this.db = {
          exec: (sql: string) => nativeDb.exec(sql),
          run: (sql: string, params?: any[]) => {
            const stmt = nativeDb.prepare(sql);
            return stmt.run(...(params || []));
          },
          all: <T = any>(sql: string, params?: any[]): T[] => {
            const stmt = nativeDb.prepare(sql);
            return stmt.all(...(params || [])) as T[];
          },
          get: <T = any>(sql: string, params?: any[]): T | undefined => {
            const stmt = nativeDb.prepare(sql);
            return stmt.get(...(params || [])) as T | undefined;
          },
          close: () => nativeDb.close(),
        };
        console.log(`[SQLite] Initialized native node:sqlite engine at ${this.dbFilePath}`);
        this.bootstrapSchema();
        this.isInitialized = true;
        return;
      }
    } catch (nodeSqliteErr: any) {
      console.log(`[SQLite] Native node:sqlite not available (${nodeSqliteErr?.message || nodeSqliteErr}). Attempting sql.js fallback...`);
    }

    // 2. Fallback to sql.js (WebAssembly SQLite)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const initSqlJs = safeRequire('sql.js');
      // For synchronous fallback if possible or empty memory until loaded
      let fileBuffer: Buffer | null = null;
      if (fs.existsSync(this.dbFilePath)) {
        fileBuffer = fs.readFileSync(this.dbFilePath);
      }

      // Initialize sql.js synchronously via promise resolution if possible
      initSqlJs().then((SQL: any) => {
        const sqlDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
        const saveToDisk = () => {
          try {
            const data = sqlDb.export();
            fs.writeFileSync(this.dbFilePath, Buffer.from(data));
          } catch (err) {
            console.error('[SQLite] Failed to write sql.js database to disk:', err);
          }
        };

        this.db = {
          exec: (sql: string) => {
            sqlDb.run(sql);
            saveToDisk();
          },
          run: (sql: string, params?: any[]) => {
            sqlDb.run(sql, params || []);
            saveToDisk();
            return { changes: 1 };
          },
          all: <T = any>(sql: string, params?: any[]): T[] => {
            const stmt = sqlDb.prepare(sql);
            if (params && params.length > 0) stmt.bind(params);
            const results: T[] = [];
            while (stmt.step()) {
              results.push(stmt.getAsObject() as T);
            }
            stmt.free();
            return results;
          },
          get: <T = any>(sql: string, params?: any[]): T | undefined => {
            const stmt = sqlDb.prepare(sql);
            if (params && params.length > 0) stmt.bind(params);
            let row: T | undefined;
            if (stmt.step()) {
              row = stmt.getAsObject() as T;
            }
            stmt.free();
            return row;
          },
          close: () => {
            saveToDisk();
            sqlDb.close();
          },
        };
        console.log(`[SQLite] Initialized sql.js WebAssembly engine at ${this.dbFilePath}`);
        this.bootstrapSchema();
        this.isInitialized = true;
      }).catch((e: any) => {
        console.error('[SQLite] Failed to initialize sql.js fallback:', e);
      });
    } catch (sqlJsErr: any) {
      console.error('[SQLite] Fatal error loading SQLite drivers:', sqlJsErr);
    }
  }

  /**
   * Bootstraps table schemas and migrates historical json data if tables are empty.
   */
  private bootstrapSchema(): void {
    if (!this.db) return;

    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS automation_rules (
          id TEXT PRIMARY KEY,
          keyword TEXT NOT NULL,
          replyText TEXT NOT NULL,
          reply TEXT NOT NULL,
          matchType TEXT NOT NULL DEFAULT 'contains',
          match TEXT NOT NULL DEFAULT 'contains',
          scope TEXT NOT NULL DEFAULT 'all',
          isEnabled INTEGER NOT NULL DEFAULT 1,
          timesTriggered INTEGER NOT NULL DEFAULT 0,
          used_count INTEGER NOT NULL DEFAULT 0,
          last_used INTEGER NOT NULL DEFAULT 0,
          lastTriggeredAt TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS batch_messages (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL,
          hasImages INTEGER NOT NULL DEFAULT 0,
          imagesCount INTEGER NOT NULL DEFAULT 0,
          groupsCount INTEGER NOT NULL DEFAULT 0,
          targets TEXT NOT NULL DEFAULT '[]',
          date TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS private_auto_replies (
          id TEXT PRIMARY KEY,
          keyword TEXT NOT NULL,
          reply TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      this.migrateInitialData();
    } catch (e) {
      console.error('[SQLite] bootstrapSchema error:', e);
    }
  }

  /**
   * Migrates existing settings.json and batches.json if SQLite tables are empty.
   */
  private migrateInitialData(): void {
    if (!this.db) return;

    try {
      // 1. Check automation_rules table
      const rulesCountRow = this.db.get<{ count: number }>('SELECT count(*) as count FROM automation_rules');
      const rulesCount = Number(rulesCountRow?.count || 0);

      if (rulesCount === 0) {
        console.log('[SQLite] Empty automation_rules table detected. Migrating initial data...');
        const settingsFile = path.join(process.cwd(), 'settings.json');
        let initialRules: any[] = [];
        let initialGlobalEnabled = true;

        if (fs.existsSync(settingsFile)) {
          try {
            const raw = fs.readFileSync(settingsFile, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.auto_replies) && parsed.auto_replies.length > 0) {
              initialRules = parsed.auto_replies;
            }
            if (typeof parsed.auto_replies_enabled === 'boolean') {
              initialGlobalEnabled = parsed.auto_replies_enabled;
            }
          } catch (err) {
            console.warn('[SQLite] Error reading legacy settings.json for migration:', err);
          }
        }

        // Default seeds if settings.json didn't have rules
        if (initialRules.length === 0) {
          initialRules = [
            {
              id: 'rule_1',
              keyword: 'السلام عليكم',
              replyText: 'وعليكم السلام ورحمة الله وبركاته، مرحباً بك! كيف يمكنني مساعدتك؟ 🌸',
              reply: 'وعليكم السلام ورحمة الله وبركاته، مرحباً بك! كيف يمكنني مساعدتك؟ 🌸',
              matchType: 'contains',
              match: 'contains',
              scope: 'all',
              isEnabled: true,
              timesTriggered: 0,
              used_count: 0,
              last_used: 0,
            },
            {
              id: 'rule_2',
              keyword: 'الأسعار',
              replyText: 'أهلاً بك! يمكنك الاطلاع على باقاتنا وعروضنا الحالية عبر الرابط المثبت أو إرسال تفاصيل طلبك مباشرة ✨',
              reply: 'أهلاً بك! يمكنك الاطلاع على باقاتنا وعروضنا الحالية عبر الرابط المثبت أو إرسال تفاصيل طلبك مباشرة ✨',
              matchType: 'contains',
              match: 'contains',
              scope: 'all',
              isEnabled: true,
              timesTriggered: 0,
              used_count: 0,
              last_used: 0,
            },
          ];
        }

        for (const rule of initialRules) {
          this.addRule(rule);
        }

        this.setAutoRepliesEnabled(initialGlobalEnabled);
        console.log(`[SQLite] Successfully migrated ${initialRules.length} automation rules into SQLite.`);
      }

      // 2. Check batch_messages table
      const batchesCountRow = this.db.get<{ count: number }>('SELECT count(*) as count FROM batch_messages');
      const batchesCount = Number(batchesCountRow?.count || 0);

      if (batchesCount === 0) {
        console.log('[SQLite] Empty batch_messages table detected. Migrating initial batches...');
        const batchesFile = path.join(process.cwd(), 'batches.json');
        let initialBatches: any[] = [];

        if (fs.existsSync(batchesFile)) {
          try {
            const raw = fs.readFileSync(batchesFile, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              initialBatches = parsed;
            }
          } catch (err) {
            console.warn('[SQLite] Error reading legacy batches.json for migration:', err);
          }
        }

        if (initialBatches.length === 0) {
          initialBatches = [
            {
              id: 'batch_101',
              text: 'السلام عليكم ورحمة الله، يتوفر لدينا خدمات دعم أكاديمي متخصصة 📚',
              hasImages: false,
              imagesCount: 0,
              groupsCount: 3,
              targets: [
                { chatId: '-1001749201928', chatTitle: 'قروب المطورين العربي', messageId: '8901' },
                { chatId: '-1001594839201', chatTitle: 'منصة التقنية والذكاء الاصطناعي', messageId: '8902' },
                { chatId: '-1001892019283', chatTitle: 'ملتقى رواد الأعمال', messageId: '8903' },
              ],
              date: '2026-09-04',
              timestamp: '10:45 AM',
            },
          ];
        }

        for (const batch of initialBatches) {
          this.addBatch(batch);
        }

        console.log(`[SQLite] Successfully migrated ${initialBatches.length} batch message records into SQLite.`);
      }
    } catch (e) {
      console.error('[SQLite] migrateInitialData error:', e);
    }
  }

  // =========================================================================
  // AUTOMATION RULES CRUD (Persisted in SQLite)
  // =========================================================================

  public getRules(): StoredAutomationRule[] {
    if (!this.db) return [];
    try {
      const rows = this.db.all<any>('SELECT * FROM automation_rules ORDER BY created_at ASC');
      return rows.map((r) => ({
        id: r.id,
        keyword: r.keyword,
        replyText: r.replyText,
        reply: r.reply || r.replyText,
        matchType: r.matchType || 'contains',
        match: r.match || r.matchType || 'contains',
        scope: r.scope || 'all',
        isEnabled: Boolean(r.isEnabled),
        timesTriggered: Number(r.timesTriggered || 0),
        used_count: Number(r.used_count || 0),
        last_used: Number(r.last_used || 0),
        lastTriggeredAt: r.lastTriggeredAt || undefined,
        created_at: Number(r.created_at || 0),
        updated_at: Number(r.updated_at || 0),
      }));
    } catch (e) {
      console.error('[SQLite] getRules error:', e);
      return [];
    }
  }

  public getRuleById(id: string): StoredAutomationRule | null {
    if (!this.db || !id) return null;
    try {
      const r = this.db.get<any>('SELECT * FROM automation_rules WHERE id = ?', [id]);
      if (!r) return null;
      return {
        id: r.id,
        keyword: r.keyword,
        replyText: r.replyText,
        reply: r.reply || r.replyText,
        matchType: r.matchType || 'contains',
        match: r.match || r.matchType || 'contains',
        scope: r.scope || 'all',
        isEnabled: Boolean(r.isEnabled),
        timesTriggered: Number(r.timesTriggered || 0),
        used_count: Number(r.used_count || 0),
        last_used: Number(r.last_used || 0),
        lastTriggeredAt: r.lastTriggeredAt || undefined,
        created_at: Number(r.created_at || 0),
        updated_at: Number(r.updated_at || 0),
      };
    } catch (e) {
      console.error(`[SQLite] getRuleById(${id}) error:`, e);
      return null;
    }
  }

  public addRule(rule: Partial<StoredAutomationRule>): StoredAutomationRule {
    const id = rule.id || `rule_${Date.now()}`;
    const keyword = (rule.keyword || '').trim();
    const replyText = (rule.replyText || rule.reply || '').trim();
    const reply = replyText;
    const matchType = rule.matchType || rule.match || 'contains';
    const match = matchType;
    const scope = rule.scope || 'all';
    const isEnabled = rule.isEnabled !== false ? 1 : 0;
    const timesTriggered = Number(rule.timesTriggered || 0);
    const used_count = Number(rule.used_count || 0);
    const last_used = Number(rule.last_used || 0);
    const lastTriggeredAt = rule.lastTriggeredAt || null;
    const now = Date.now();

    if (this.db) {
      try {
        this.db.run(
          `INSERT OR REPLACE INTO automation_rules 
           (id, keyword, replyText, reply, matchType, match, scope, isEnabled, timesTriggered, used_count, last_used, lastTriggeredAt, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, keyword, replyText, reply, matchType, match, scope, isEnabled, timesTriggered, used_count, last_used, lastTriggeredAt, now, now]
        );
      } catch (e) {
        console.error('[SQLite] addRule error:', e);
      }
    }

    return {
      id,
      keyword,
      replyText,
      reply,
      matchType,
      match,
      scope,
      isEnabled: Boolean(isEnabled),
      timesTriggered,
      used_count,
      last_used,
      lastTriggeredAt: lastTriggeredAt || undefined,
      created_at: now,
      updated_at: now,
    };
  }

  public updateRule(id: string, updates: Partial<StoredAutomationRule>): StoredAutomationRule | null {
    const existing = this.getRuleById(id);
    if (!existing || !this.db) return null;

    const keyword = updates.keyword !== undefined ? updates.keyword.trim() : existing.keyword;
    const replyText = updates.replyText !== undefined ? updates.replyText.trim() : (updates.reply !== undefined ? updates.reply.trim() : existing.replyText);
    const reply = replyText;
    const matchType = updates.matchType || updates.match || existing.matchType;
    const match = matchType;
    const scope = updates.scope || existing.scope;
    const isEnabled = updates.isEnabled !== undefined ? (updates.isEnabled ? 1 : 0) : (existing.isEnabled ? 1 : 0);
    const now = Date.now();

    try {
      this.db.run(
        `UPDATE automation_rules 
         SET keyword = ?, replyText = ?, reply = ?, matchType = ?, match = ?, scope = ?, isEnabled = ?, updated_at = ?
         WHERE id = ?`,
        [keyword, replyText, reply, matchType, match, scope, isEnabled, now, id]
      );
      return this.getRuleById(id);
    } catch (e) {
      console.error(`[SQLite] updateRule(${id}) error:`, e);
      return null;
    }
  }

  public deleteRule(id: string): boolean {
    if (!this.db || !id) return false;
    try {
      this.db.run('DELETE FROM automation_rules WHERE id = ?', [id]);
      return true;
    } catch (e) {
      console.error(`[SQLite] deleteRule(${id}) error:`, e);
      return false;
    }
  }

  public toggleRule(id: string): StoredAutomationRule | null {
    const existing = this.getRuleById(id);
    if (!existing || !this.db) return null;

    const nextState = existing.isEnabled ? 0 : 1;
    const now = Date.now();
    try {
      this.db.run('UPDATE automation_rules SET isEnabled = ?, updated_at = ? WHERE id = ?', [nextState, now, id]);
      return this.getRuleById(id);
    } catch (e) {
      console.error(`[SQLite] toggleRule(${id}) error:`, e);
      return null;
    }
  }

  public incrementRuleUsage(id: string, timestamp: number = Date.now()): void {
    if (!this.db || !id) return;
    try {
      const formattedDate = new Date(timestamp).toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      this.db.run(
        `UPDATE automation_rules 
         SET timesTriggered = timesTriggered + 1,
             used_count = used_count + 1,
             last_used = ?,
             lastTriggeredAt = ?,
             updated_at = ?
         WHERE id = ?`,
        [timestamp, formattedDate, timestamp, id]
      );
    } catch (e) {
      console.error(`[SQLite] incrementRuleUsage(${id}) error:`, e);
    }
  }

  // =========================================================================
  // PRIVATE CHAT AUTO REPLIES (Dedicated Independent Table: private_auto_replies)
  // Strictly independent from automation_rules and keyword monitoring.
  // =========================================================================

  public getPrivateAutoReplies(): StoredPrivateAutoReply[] {
    if (!this.db) return [];
    try {
      const rows = this.db.all<any>('SELECT * FROM private_auto_replies ORDER BY created_at ASC');
      return rows.map((r) => ({
        id: r.id,
        keyword: r.keyword,
        reply: r.reply,
        is_active: Boolean(r.is_active),
        created_at: Number(r.created_at || 0),
        updated_at: Number(r.updated_at || 0),
      }));
    } catch (e) {
      console.error('[SQLite] getPrivateAutoReplies error:', e);
      return [];
    }
  }

  public getPrivateAutoReplyById(id: string): StoredPrivateAutoReply | null {
    if (!this.db || !id) return null;
    try {
      const r = this.db.get<any>('SELECT * FROM private_auto_replies WHERE id = ?', [id]);
      if (!r) return null;
      return {
        id: r.id,
        keyword: r.keyword,
        reply: r.reply,
        is_active: Boolean(r.is_active),
        created_at: Number(r.created_at || 0),
        updated_at: Number(r.updated_at || 0),
      };
    } catch (e) {
      console.error(`[SQLite] getPrivateAutoReplyById(${id}) error:`, e);
      return null;
    }
  }

  public addPrivateAutoReply(data: { id?: string; keyword: string; reply: string; is_active?: boolean | number }): StoredPrivateAutoReply {
    const id = data.id || `par_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const keyword = (data.keyword || '').trim();
    const reply = (data.reply || '').trim();
    const is_active = data.is_active !== false && data.is_active !== 0 ? 1 : 0;
    const now = Date.now();

    if (this.db) {
      try {
        this.db.run(
          `INSERT OR REPLACE INTO private_auto_replies (id, keyword, reply, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, keyword, reply, is_active, now, now]
        );
      } catch (e) {
        console.error('[SQLite] addPrivateAutoReply error:', e);
      }
    }

    return {
      id,
      keyword,
      reply,
      is_active: Boolean(is_active),
      created_at: now,
      updated_at: now,
    };
  }

  public updatePrivateAutoReply(
    id: string,
    updates: { keyword?: string; reply?: string; is_active?: boolean | number }
  ): StoredPrivateAutoReply | null {
    const existing = this.getPrivateAutoReplyById(id);
    if (!existing || !this.db) return null;

    const keyword = updates.keyword !== undefined ? updates.keyword.trim() : existing.keyword;
    const reply = updates.reply !== undefined ? updates.reply.trim() : existing.reply;
    const is_active = updates.is_active !== undefined
      ? (updates.is_active ? 1 : 0)
      : (existing.is_active ? 1 : 0);
    const now = Date.now();

    try {
      this.db.run(
        `UPDATE private_auto_replies 
         SET keyword = ?, reply = ?, is_active = ?, updated_at = ?
         WHERE id = ?`,
        [keyword, reply, is_active, now, id]
      );
      return this.getPrivateAutoReplyById(id);
    } catch (e) {
      console.error(`[SQLite] updatePrivateAutoReply(${id}) error:`, e);
      return null;
    }
  }

  public deletePrivateAutoReply(id: string): boolean {
    if (!this.db || !id) return false;
    try {
      this.db.run('DELETE FROM private_auto_replies WHERE id = ?', [id]);
      return true;
    } catch (e) {
      console.error(`[SQLite] deletePrivateAutoReply(${id}) error:`, e);
      return false;
    }
  }

  public togglePrivateAutoReply(id: string): StoredPrivateAutoReply | null {
    const existing = this.getPrivateAutoReplyById(id);
    if (!existing || !this.db) return null;

    const nextState = existing.is_active ? 0 : 1;
    const now = Date.now();
    try {
      this.db.run('UPDATE private_auto_replies SET is_active = ?, updated_at = ? WHERE id = ?', [nextState, now, id]);
      return this.getPrivateAutoReplyById(id);
    } catch (e) {
      console.error(`[SQLite] togglePrivateAutoReply(${id}) error:`, e);
      return null;
    }
  }

  // =========================================================================
  // GLOBAL AUTO RESPONDER SETTING
  // =========================================================================

  public isAutoRepliesEnabled(): boolean {
    if (!this.db) return true;
    try {
      const row = this.db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', ['auto_replies_enabled']);
      if (!row) return true;
      return row.value !== 'false';
    } catch (e) {
      console.error('[SQLite] isAutoRepliesEnabled error:', e);
      return true;
    }
  }

  public setAutoRepliesEnabled(enabled: boolean): void {
    if (!this.db) return;
    try {
      this.db.run(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        ['auto_replies_enabled', enabled ? 'true' : 'false']
      );
    } catch (e) {
      console.error('[SQLite] setAutoRepliesEnabled error:', e);
    }
  }

  // =========================================================================
  // MONITOR KEYWORDS PERSISTENCE (Keyword alerts)
  // =========================================================================

  public getMonitorKeywords(): string[] {
    if (!this.db) return [];
    try {
      const row = this.db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', ['monitor_keywords']);
      if (row && row.value) {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((k: any) => String(k).trim()).filter(Boolean);
        }
      }
    } catch (e) {
      console.error('[SQLite] getMonitorKeywords error:', e);
    }
    return [];
  }

  public setMonitorKeywords(keywords: string[]): string[] {
    if (!this.db) return [];
    try {
      const cleaned = Array.from(new Set(keywords.map((k) => String(k).trim()).filter(Boolean)));
      this.db.run(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        ['monitor_keywords', JSON.stringify(cleaned)]
      );
      return cleaned;
    } catch (e) {
      console.error('[SQLite] setMonitorKeywords error:', e);
      return [];
    }
  }

  // =========================================================================
  // BATCH MESSAGES PERSISTENCE (Sent Batches in SQLite)
  // =========================================================================

  public getBatches(): StoredBatchMessage[] {
    if (!this.db) return [];
    try {
      const rows = this.db.all<any>('SELECT * FROM batch_messages ORDER BY created_at DESC');
      return rows.map((r) => {
        let targets: any[] = [];
        try {
          targets = JSON.parse(r.targets || '[]');
        } catch (_) {
          targets = [];
        }
        return {
          id: r.id,
          text: r.text,
          hasImages: Boolean(r.hasImages),
          imagesCount: Number(r.imagesCount || 0),
          groupsCount: Number(r.groupsCount || 0),
          targets,
          date: r.date,
          timestamp: r.timestamp,
          created_at: Number(r.created_at || 0),
          updated_at: Number(r.updated_at || 0),
        };
      });
    } catch (e) {
      console.error('[SQLite] getBatches error:', e);
      return [];
    }
  }

  public getBatchById(id: string): StoredBatchMessage | null {
    if (!this.db || !id) return null;
    try {
      const r = this.db.get<any>('SELECT * FROM batch_messages WHERE id = ?', [id]);
      if (!r) return null;
      let targets: any[] = [];
      try {
        targets = JSON.parse(r.targets || '[]');
      } catch (_) {
        targets = [];
      }
      return {
        id: r.id,
        text: r.text,
        hasImages: Boolean(r.hasImages),
        imagesCount: Number(r.imagesCount || 0),
        groupsCount: Number(r.groupsCount || 0),
        targets,
        date: r.date,
        timestamp: r.timestamp,
        created_at: Number(r.created_at || 0),
        updated_at: Number(r.updated_at || 0),
      };
    } catch (e) {
      console.error(`[SQLite] getBatchById(${id}) error:`, e);
      return null;
    }
  }

  public addBatch(batch: StoredBatchMessage | any): StoredBatchMessage {
    const id = batch.id || `batch_${Date.now()}`;
    const text = batch.text || '';
    const hasImages = batch.hasImages ? 1 : 0;
    const imagesCount = Number(batch.imagesCount || 0);
    const groupsCount = Number(batch.groupsCount || (batch.targets ? batch.targets.length : 0));
    const targets = Array.isArray(batch.targets) ? batch.targets : [];
    const targetsJson = JSON.stringify(targets);
    const date = batch.date || new Date().toISOString().split('T')[0];
    const timestamp = batch.timestamp || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const now = Date.now();

    if (this.db) {
      try {
        this.db.run(
          `INSERT OR REPLACE INTO batch_messages 
           (id, text, hasImages, imagesCount, groupsCount, targets, date, timestamp, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, text, hasImages, imagesCount, groupsCount, targetsJson, date, timestamp, now, now]
        );
      } catch (e) {
        console.error('[SQLite] addBatch error:', e);
      }
    }

    return {
      id,
      text,
      hasImages: Boolean(hasImages),
      imagesCount,
      groupsCount,
      targets,
      date,
      timestamp,
      created_at: now,
      updated_at: now,
    };
  }

  public updateBatchText(id: string, newText: string): boolean {
    if (!this.db || !id) return false;
    const now = Date.now();
    try {
      this.db.run('UPDATE batch_messages SET text = ?, updated_at = ? WHERE id = ?', [newText, now, id]);
      return true;
    } catch (e) {
      console.error(`[SQLite] updateBatchText(${id}) error:`, e);
      return false;
    }
  }

  public deleteBatch(id: string): boolean {
    if (!this.db || !id) return false;
    try {
      this.db.run('DELETE FROM batch_messages WHERE id = ?', [id]);
      return true;
    } catch (e) {
      console.error(`[SQLite] deleteBatch(${id}) error:`, e);
      return false;
    }
  }

  // =========================================================================
  // UTILITIES & STATS
  // =========================================================================

  public getStats(): { rulesCount: number; batchesCount: number; dbPath: string; isReady: boolean } {
    const rules = this.getRules();
    const batches = this.getBatches();
    return {
      rulesCount: rules.length,
      batchesCount: batches.length,
      dbPath: this.dbFilePath,
      isReady: this.isInitialized && this.db !== null,
    };
  }

  public close(): void {
    if (this.db && this.db.close) {
      this.db.close();
      this.db = null;
    }
  }
}

// Global SQLite Database Service singleton instance
export const sqliteDatabase = new SQLiteDatabaseService();
