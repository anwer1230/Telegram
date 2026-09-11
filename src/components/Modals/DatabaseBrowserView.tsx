import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  Table as TableIcon,
  Search,
  RefreshCw,
  Play,
  Download,
  Eye,
  ArrowDownUp,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  HardDrive,
  Layers,
  Sparkles,
  Terminal,
  Activity,
  Sliders,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { telegramDB } from '../../utils/sqliteStorage';
import { useTelegram } from '../../context/TelegramContext';

interface TableMeta {
  name: string;
  rowCount: number;
  columns: Array<{ cid: number; name: string; type: string; notnull: number; pk: number }>;
}

export const DatabaseBrowserView: React.FC = () => {
  const { showToast } = useTelegram();

  // Navigation tabs within Database Browser
  const [activeTab, setActiveTab] = useState<'tables' | 'sync_troubleshooter' | 'sql_console'>('tables');

  // Metadata & Stats
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [dbStats, setDbStats] = useState<{
    storageKey: string;
    byteSize: number;
    formattedSize: string;
    tableCount: number;
    totalRows: number;
  }>({
    storageKey: 'telegram_sqlite_database_v1',
    byteSize: 0,
    formattedSize: '0 KB',
    tableCount: 0,
    totalRows: 0,
  });

  // Table Data View State
  const [selectedTable, setSelectedTable] = useState<string>('chats');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');
  const [tableData, setTableData] = useState<{
    columns: string[];
    rows: any[];
    total: number;
  }>({ columns: [], rows: [], total: 0 });
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  // Selected row for Detail Modal / View
  const [inspectedRow, setInspectedRow] = useState<any | null>(null);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  // Sync Diagnostics State
  const [syncReport, setSyncReport] = useState<{
    diffParams: any;
    channelPtsList: Array<{ channelId: string; pts: number; updatedAt?: string }>;
    totalChats: number;
    totalMessages: number;
    totalUsers: number;
    activeSecretSessions: number;
    lastMessageTime?: string;
  } | null>(null);

  // SQL Console State
  const [customSql, setCustomSql] = useState<string>(
    'SELECT channel_id, pts, datetime(updated_at/1000, "unixepoch") as updated_time FROM channel_pts ORDER BY updated_at DESC LIMIT 20;'
  );
  const [sqlResult, setSqlResult] = useState<{
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTimeMs: number;
    error?: string;
  } | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState<boolean>(false);

  // Refresh table list and stats
  const refreshTables = useCallback(async () => {
    setIsLoading(true);
    try {
      await telegramDB.init();
      const [tableList, stats, sync] = await Promise.all([
        telegramDB.inspectAllTables(),
        telegramDB.getDatabaseStorageStats(),
        telegramDB.getSyncDiagnosticsReport(),
      ]);

      setTables(tableList);
      setDbStats(stats);
      setSyncReport(sync);

      if (tableList.length > 0 && !tableList.some((t) => t.name === selectedTable)) {
        setSelectedTable(tableList[0].name);
      }
    } catch (e: any) {
      console.error('[DatabaseBrowser] Failed to load schema:', e);
      showToast('تعذر تحميل بيانات قاعدة البيانات المحلية', '⚠️');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, showToast]);

  // Initial load
  useEffect(() => {
    refreshTables();
  }, [refreshTables]);

  // Load selected table data
  const loadTableData = useCallback(async () => {
    if (!selectedTable) return;
    setIsDataLoading(true);
    try {
      const data = await telegramDB.queryTableData(selectedTable, {
        page,
        pageSize,
        search: tableSearch,
        sortCol: sortCol || undefined,
        sortDir,
      });
      setTableData({
        columns: data.columns,
        rows: data.rows,
        total: data.total,
      });
    } catch (e: any) {
      console.error('[DatabaseBrowser] Query table error:', e);
      showToast(`خطأ في قراءة الجدول: ${e?.message || e}`, '⚠️');
    } finally {
      setIsDataLoading(false);
    }
  }, [selectedTable, page, pageSize, tableSearch, sortCol, sortDir, showToast]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  // Reset page when switching tables or changing search
  const handleSelectTable = (name: string) => {
    setSelectedTable(name);
    setPage(1);
    setTableSearch('');
    setSortCol('');
  };

  const handleSearchChange = (val: string) => {
    setTableSearch(val);
    setPage(1);
  };

  const handleToggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortCol(col);
      setSortDir('ASC');
    }
  };

  // Execute custom SQL query
  const handleRunCustomSql = async (overrideQuery?: string) => {
    const queryToRun = overrideQuery || customSql;
    if (!queryToRun.trim()) return;

    setIsExecutingSql(true);
    try {
      const res = await telegramDB.runDevSql(queryToRun);
      setSqlResult(res);
      if (res.error) {
        showToast('خطأ في استعلام SQL', '⚠️');
      } else {
        showToast(`تم تنفيذ الاستعلام بنجاح (${res.rowCount} صف في ${res.executionTimeMs}ms)`, '⚡');
      }
    } catch (err: any) {
      setSqlResult({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: err?.message || String(err),
      });
    } finally {
      setIsExecutingSql(false);
    }
  };

  // Export SQLite database binary
  const handleExportDatabase = async () => {
    try {
      const dbInstance = telegramDB.getDatabaseInstance();
      if (!dbInstance) {
        showToast('قاعدة البيانات غير مهيأة بعد للتصدير', '⚠️');
        return;
      }
      const binary = dbInstance.export();
      const blob = new Blob([binary], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telegram_sqlite_backup_${Date.now()}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('تم تصدير ملف قاعدة بيانات SQLite بنجاح (.db)', '💾');
    } catch (e) {
      showToast('فشل تصدير قاعدة البيانات', '⚠️');
    }
  };

  // Copy cell or row JSON
  const handleCopyValue = (val: any, label: string) => {
    try {
      const text = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '');
      navigator.clipboard.writeText(text);
      setCopiedCell(label);
      showToast('تم النسخ إلى الحافظة', '📋');
      setTimeout(() => setCopiedCell(null), 2000);
    } catch (_) {}
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(tableData.total / pageSize));

  // Current active table meta
  const currentTableMeta = useMemo(() => {
    return tables.find((t) => t.name === selectedTable);
  }, [tables, selectedTable]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0c131c] text-white overflow-hidden select-text">
      {/* Dev Tool Banner & Top Metrics */}
      <div className="px-5 py-3 bg-[#131d2a] border-b border-cyan-500/25 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white m-0 flex items-center gap-1.5">
                <span>متصفح قاعدة بيانات SQLite المحلية</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  IndexedDB MMAP v1
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  أداة المطورين (Dev Tool)
                </span>
              </h4>
            </div>
            <p className="text-[11px] text-gray-400 m-0">
              فحص وبحث الجداول المحلية لتشخيص مشاكل المزامنة (PTS, Diff Params, Unread Counters, Secret Sessions)
            </p>
          </div>
        </div>

        {/* Database Quick Stats */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-gray-400 text-[11px]">حجم التخزين:</span>
            <span className="font-mono font-bold text-cyan-300">{dbStats.formattedSize}</span>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-gray-400 text-[11px]">الجداول:</span>
            <span className="font-mono font-bold text-blue-300">{tables.length}</span>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5">
            <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-gray-400 text-[11px]">إجمالي السجلات:</span>
            <span className="font-mono font-bold text-emerald-300">{dbStats.totalRows}</span>
          </div>

          <button
            type="button"
            onClick={handleExportDatabase}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="تصدير ملف قاعدة بيانات SQLite بصيغة .db"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير .db</span>
          </button>

          <button
            type="button"
            onClick={refreshTables}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
            title="تحديث بيانات قاعدة البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="px-5 py-2 bg-[#0e1622] border-b border-white/10 flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tables'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>تصفح الجداول والبيانات ({tables.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync_troubleshooter')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sync_troubleshooter'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>تشخيص مؤشرات المزامنة (PTS Sync)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sql_console')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sql_console'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>مشغّل استعلامات SQL (SQL Console)</span>
          </button>
        </div>

        {/* Informative micro-badge */}
        <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>SQLite WASM Storage: Active</span>
        </div>
      </div>

      {/* TAB 1: TABLES AND DATA BROWSER */}
      {activeTab === 'tables' && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Sidebar: Table Selection List */}
          <div className="w-full md:w-64 bg-[#0a0f16] border-b md:border-b-0 md:border-l border-white/10 flex flex-col shrink-0">
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>الجداول المتاحة ({tables.length})</span>
              </span>
              <span className="text-[10px] text-gray-500 font-mono">SQLite Tables</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {tables.map((tbl) => {
                const isSelected = tbl.name === selectedTable;
                const isSyncRelated =
                  tbl.name === 'channel_pts' || tbl.name === 'diff_params' || tbl.name === 'chats';

                return (
                  <button
                    key={tbl.name}
                    type="button"
                    onClick={() => handleSelectTable(tbl.name)}
                    className={`w-full text-right p-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold shadow-sm'
                        : 'bg-white/[0.02] text-gray-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <TableIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-gray-500'}`} />
                      <span className="truncate">{tbl.name}</span>
                      {isSyncRelated && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="جدول حيوي للمزامنة" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isSelected ? 'bg-cyan-500/30 text-white' : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      {tbl.rowCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Area: Table Data, Search & Pagination */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0c131c]">
            {/* Table Header & Search Bar */}
            <div className="p-3 bg-[#111924] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                  {selectedTable}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {tableData.total} {tableData.total === 1 ? 'row' : 'rows'}
                </span>
                {currentTableMeta && (
                  <span className="text-[11px] text-gray-500">
                    ({currentTableMeta.columns.length} أعمدة)
                  </span>
                )}
              </div>

              {/* Search in Current Table */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={`البحث في جدول ${selectedTable}...`}
                    className="w-full pr-8 pl-7 py-1.5 bg-[#17212b] border border-white/10 focus:border-cyan-500/50 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
                  />
                  {tableSearch && (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-[#17212b] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-gray-300 font-mono focus:outline-none"
                >
                  <option value={10}>10 / صفحة</option>
                  <option value={25}>25 / صفحة</option>
                  <option value={50}>50 / صفحة</option>
                  <option value={100}>100 / صفحة</option>
                </select>
              </div>
            </div>

            {/* Table View / Grid */}
            <div className="flex-1 overflow-auto min-h-0 relative">
              {isDataLoading ? (
                <div className="h-64 flex flex-col items-center justify-center text-cyan-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-mono">قراءة بيانات الجدول من SQLite...</span>
                </div>
              ) : tableData.rows.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <TableIcon className="w-10 h-10 text-gray-600 mb-2" />
                  <p className="text-xs font-bold text-gray-300">لا توجد سجلات في هذا الجدول</p>
                  <p className="text-[11px] text-gray-500 max-w-sm mt-1">
                    {tableSearch
                      ? `لم يتم العثور على أي تطابق مع استعلام البحث "${tableSearch}"`
                      : `الجدول "${selectedTable}" فارغ حالياً.`}
                  </p>
                </div>
              ) : (
                <table className="w-full text-right border-collapse text-xs font-mono">
                  <thead className="bg-[#141e2b] sticky top-0 z-10 border-b border-white/10 text-gray-300 shadow-sm">
                    <tr>
                      <th className="p-2.5 text-center w-12 border-l border-white/5 text-gray-500 font-normal">
                        #
                      </th>
                      {tableData.columns.map((col) => {
                        const isSorted = sortCol === col;
                        return (
                          <th
                            key={col}
                            onClick={() => handleToggleSort(col)}
                            className="p-2.5 border-l border-white/5 hover:bg-white/5 cursor-pointer select-none transition-colors whitespace-nowrap"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-bold text-cyan-200">{col}</span>
                              <ArrowDownUp
                                className={`w-3 h-3 transition-colors ${
                                  isSorted ? 'text-cyan-400' : 'text-gray-600'
                                }`}
                              />
                            </div>
                          </th>
                        );
                      })}
                      <th className="p-2.5 text-center w-16 text-gray-400 font-normal">معاينة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {tableData.rows.map((row, idx) => {
                      const rowNumber = (page - 1) * pageSize + idx + 1;
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-cyan-500/[0.06] transition-colors group cursor-pointer"
                          onClick={() => setInspectedRow(row)}
                        >
                          <td className="p-2.5 text-center text-gray-500 border-l border-white/5 text-[11px]">
                            {rowNumber}
                          </td>
                          {tableData.columns.map((col) => {
                            const val = row[col];
                            const isJson =
                              typeof val === 'string' &&
                              ((val.startsWith('{') && val.endsWith('}')) ||
                                (val.startsWith('[') && val.endsWith(']')));

                            let displayVal = String(val ?? '');
                            if (val === null || val === undefined) {
                              displayVal = 'NULL';
                            } else if (isJson && displayVal.length > 50) {
                              displayVal = displayVal.substring(0, 47) + '...';
                            } else if (displayVal.length > 60) {
                              displayVal = displayVal.substring(0, 57) + '...';
                            }

                            return (
                              <td
                                key={col}
                                className="p-2.5 border-l border-white/5 max-w-xs truncate text-[11px]"
                                title={String(val ?? '')}
                              >
                                {val === null || val === undefined ? (
                                  <span className="text-gray-600 italic">NULL</span>
                                ) : isJson ? (
                                  <span className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded text-[10px] font-mono">
                                    {displayVal}
                                  </span>
                                ) : (
                                  <span>{displayVal}</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedRow(row);
                              }}
                              className="p-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-300 transition-colors"
                              title="عرض تفاصيل السجل بالكامل"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-[#111924] border-t border-white/10 flex items-center justify-between text-xs text-gray-400 shrink-0">
              <div className="flex items-center gap-2">
                <span>
                  الصفحة <strong className="text-white font-mono">{page}</strong> من{' '}
                  <strong className="text-white font-mono">{totalPages}</strong>
                </span>
                <span>•</span>
                <span>
                  السجلات المعروضة:{' '}
                  <strong className="text-cyan-300 font-mono">
                    {tableData.total > 0 ? (page - 1) * pageSize + 1 : 0} -{' '}
                    {Math.min(page * pageSize, tableData.total)}
                  </strong>{' '}
                  من <strong className="text-white font-mono">{tableData.total}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-gray-300 transition-colors flex items-center gap-1"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-gray-300 transition-colors flex items-center gap-1"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SYNC TROUBLESHOOTER (PTS, Channel PTS, Messages/Chats Consistency) */}
      {activeTab === 'sync_troubleshooter' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-sm text-white">
                لوحة فحص وتشخيص تزامن تيليجرام (Telegram MTProto Sync Diagnostics)
              </h5>
              <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                تعتمد مزامنة تيليجرام على مؤشرات الحالة (PTS - Persistent Timestamp Sequence). إذا توقفت الرسائل عن الوصول أو علقت الحالة على "جاري المزامنة"، يمكنك فحص قيم مؤشرات <code className="bg-black/30 px-1 rounded text-cyan-300 font-mono">diff_params</code> و <code className="bg-black/30 px-1 rounded text-cyan-300 font-mono">channel_pts</code> في قاعدة البيانات المحلية أدناه.
              </p>
            </div>
          </div>

          {/* Account Diff Params Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Diff Params Card */}
            <div className="p-4 rounded-2xl bg-[#111924] border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>مؤشرات تحديثات الحساب (Account diff_params)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-mono">
                  Primary State
                </span>
              </div>

              {syncReport?.diffParams ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400 text-[10px] block">PTS (Update Counter)</span>
                    <span className="text-base font-bold text-cyan-400">
                      {syncReport.diffParams.pts}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400 text-[10px] block">SEQ (Sequence)</span>
                    <span className="text-base font-bold text-emerald-400">
                      {syncReport.diffParams.seq}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400 text-[10px] block">QTS (Secret Chats PTS)</span>
                    <span className="text-base font-bold text-purple-400">
                      {syncReport.diffParams.qts}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-400 text-[10px] block">Date (Timestamp)</span>
                    <span className="text-base font-bold text-blue-400">
                      {syncReport.diffParams.date}
                    </span>
                  </div>

                  {syncReport.diffParams.updatedAt && (
                    <div className="col-span-2 p-2 rounded-lg bg-white/[0.02] text-[11px] text-gray-400">
                      <span>آخر تحديث محلي للمؤشر: </span>
                      <strong className="text-white">{syncReport.diffParams.updatedAt}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-400 space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
                  <p>لم يتم تخزين diff_params بعد في قاعدة البيانات المحلية.</p>
                  <p className="text-[11px] text-gray-500">
                    سيتم إنشاؤها تلقائياً عند أول عملية GetDifference مع خوادم تيليجرام.
                  </p>
                </div>
              )}
            </div>

            {/* Storage Consistency Card */}
            <div className="p-4 rounded-2xl bg-[#111924] border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                  <TableIcon className="w-4 h-4 text-emerald-400" />
                  <span>تناسق الجداول المحلية (Data Consistency)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono">
                  Integrity
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-gray-400 text-[10px] block">المحادثات المخزنة (Chats)</span>
                  <span className="text-base font-bold text-white font-mono">
                    {syncReport?.totalChats || 0}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-gray-400 text-[10px] block">الرسائل المخزنة (Messages)</span>
                  <span className="text-base font-bold text-white font-mono">
                    {syncReport?.totalMessages || 0}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-gray-400 text-[10px] block">جهات الاتصال (Users)</span>
                  <span className="text-base font-bold text-white font-mono">
                    {syncReport?.totalUsers || 0}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-gray-400 text-[10px] block">المحادثات السرية النشطة</span>
                  <span className="text-base font-bold text-amber-400 font-mono">
                    {syncReport?.activeSecretSessions || 0}
                  </span>
                </div>

                {syncReport?.lastMessageTime && (
                  <div className="col-span-2 p-2 rounded-lg bg-white/[0.02] text-[11px] text-gray-400 truncate">
                    <span>توقيت أحدث رسالة مخزنة: </span>
                    <strong className="text-cyan-300 font-mono">{syncReport.lastMessageTime}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Supergroups and Channel PTS Pointers */}
          <div className="p-4 rounded-2xl bg-[#111924] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>
                  مؤشرات القنوات والمجموعات الخارقة (Supergroup & Channel PTS Cursors) -{' '}
                  {syncReport?.channelPtsList?.length || 0} قناة
                </span>
              </span>
              <button
                type="button"
                onClick={refreshTables}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>تحديث</span>
              </button>
            </div>

            {syncReport?.channelPtsList && syncReport.channelPtsList.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                <div className="grid grid-cols-12 p-2 rounded-lg bg-black/40 text-gray-400 text-[11px] font-bold">
                  <span className="col-span-6">معرف القناة (Channel ID)</span>
                  <span className="col-span-3 text-center">مؤشر PTS</span>
                  <span className="col-span-3 text-left">آخر تحديث</span>
                </div>
                {syncReport.channelPtsList.map((cp) => (
                  <div
                    key={cp.channelId}
                    className="grid grid-cols-12 p-2 rounded-lg bg-white/[0.02] hover:bg-white/5 border border-white/5 items-center text-[11px]"
                  >
                    <span className="col-span-6 truncate font-bold text-cyan-200">
                      {cp.channelId}
                    </span>
                    <span className="col-span-3 text-center font-bold text-emerald-400">
                      {cp.pts}
                    </span>
                    <span className="col-span-3 text-left text-gray-400 text-[10px]">
                      {cp.updatedAt || '--'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-gray-400 space-y-1 bg-black/20 rounded-xl">
                <p>لا توجد قنوات أو مجموعات خارقة مسجلة في جدول channel_pts حالياً.</p>
                <p className="text-[11px] text-gray-500">
                  عند فتح القنوات أو استلام تحديثات ChannelDifference سيتم تسجيل مؤشرات PTS هنا.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SQL CONSOLE */}
      {activeTab === 'sql_console' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 space-y-3">
          {/* Presets Toolbar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs shrink-0">
            <span className="text-[11px] text-gray-400 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>استعلامات جاهزة:</span>
            </span>
            <button
              type="button"
              onClick={() =>
                setCustomSql(
                  'SELECT channel_id, pts, datetime(updated_at/1000, "unixepoch") as updated_time FROM channel_pts ORDER BY updated_at DESC LIMIT 20;'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 font-mono text-[11px] transition-colors shrink-0"
            >
              Channel PTS
            </button>
            <button
              type="button"
              onClick={() => setCustomSql('SELECT * FROM diff_params;')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 font-mono text-[11px] transition-colors shrink-0"
            >
              Account Diff Params
            </button>
            <button
              type="button"
              onClick={() =>
                setCustomSql(
                  'SELECT id, title, type, unread_count, last_message_time FROM chats ORDER BY unread_count DESC LIMIT 20;'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 font-mono text-[11px] transition-colors shrink-0"
            >
              Unread Chats
            </button>
            <button
              type="button"
              onClick={() =>
                setCustomSql(
                  'SELECT id, chat_id, text, timestamp, status FROM messages ORDER BY timestamp DESC LIMIT 25;'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 font-mono text-[11px] transition-colors shrink-0"
            >
              Latest Messages
            </button>
            <button
              type="button"
              onClick={() =>
                setCustomSql(
                  'SELECT chat_id, count(*) as message_count FROM messages GROUP BY chat_id ORDER BY message_count DESC LIMIT 15;'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 font-mono text-[11px] transition-colors shrink-0"
            >
              Messages per Chat
            </button>
          </div>

          {/* SQL Editor Area */}
          <div className="p-3 rounded-2xl bg-[#111924] border border-cyan-500/30 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 flex items-center gap-1.5 font-mono">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>SQLite Query Editor (Read & Diagnostic Queries)</span>
              </span>
              <button
                type="button"
                onClick={() => handleRunCustomSql()}
                disabled={isExecutingSql}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${isExecutingSql ? 'animate-spin' : ''}`} />
                <span>{isExecutingSql ? 'جاري التنفيذ...' : 'تشغيل الاستعلام (Run SQL)'}</span>
              </button>
            </div>

            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              rows={3}
              placeholder="اكتب استعلام SQL هنا (مثال: SELECT * FROM chats LIMIT 10;)"
              className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-cyan-200 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 dir-ltr resize-none"
            />
          </div>

          {/* SQL Results Area */}
          <div className="flex-1 min-h-0 rounded-2xl bg-[#111924] border border-white/10 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-[#141e2b] flex items-center justify-between text-xs shrink-0">
              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>نتائج الاستعلام</span>
              </span>
              {sqlResult && (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  {sqlResult.error ? (
                    <span className="text-rose-400 font-bold">خطأ في الاستعلام</span>
                  ) : (
                    <>
                      <span className="text-emerald-400 font-bold">
                        {sqlResult.rowCount} {sqlResult.rowCount === 1 ? 'row' : 'rows'}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-cyan-300">{sqlResult.executionTimeMs} ms</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-2">
              {sqlResult?.error ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>SQL Execution Error:</span>
                  </div>
                  <p className="dir-ltr select-text">{sqlResult.error}</p>
                </div>
              ) : sqlResult && sqlResult.rows.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-gray-400 font-mono">
                  تم تنفيذ الاستعلام بنجاح بدون إرجاع أي صفوف (0 rows returned).
                </div>
              ) : sqlResult && sqlResult.rows.length > 0 ? (
                <table className="w-full text-right border-collapse text-xs font-mono">
                  <thead className="bg-[#141e2b] sticky top-0 border-b border-white/10 text-gray-300">
                    <tr>
                      {sqlResult.columns.map((c) => (
                        <th key={c} className="p-2 border-l border-white/5 font-bold text-cyan-200">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {sqlResult.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        {sqlResult.columns.map((c) => (
                          <td key={c} className="p-2 border-l border-white/5 text-[11px] truncate max-w-xs">
                            {String(row[c] ?? 'NULL')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-xs text-gray-500 space-y-1">
                  <Terminal className="w-8 h-8 text-gray-600 mb-1" />
                  <p>اكتب استعلام SQL واضغط على "تشغيل الاستعلام" لمشاهدة النتائج مباشرة.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Row Detail Inspector Modal / Flyout */}
      {inspectedRow && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-[#111924] border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 bg-[#16212e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-cyan-400" />
                <h5 className="font-bold text-sm text-white">
                  معاينة تفاصيل السجل في جدول <code className="text-cyan-300 font-mono">[{selectedTable}]</code>
                </h5>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyValue(inspectedRow, 'full_row')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-gray-200 flex items-center gap-1.5 transition-colors"
                  title="نسخ السجل كاملاً بصيغة JSON"
                >
                  {copiedCell === 'full_row' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCell === 'full_row' ? 'تم النسخ!' : 'نسخ JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedRow(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content: Key-Value Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              {Object.entries(inspectedRow).map(([key, val]) => {
                const isJson =
                  typeof val === 'string' &&
                  ((val.startsWith('{') && val.endsWith('}')) ||
                    (val.startsWith('[') && val.endsWith(']')));

                let formattedJson = '';
                if (isJson) {
                  try {
                    formattedJson = JSON.stringify(JSON.parse(val as string), null, 2);
                  } catch (_) {}
                }

                return (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300 font-mono text-xs">{key}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyValue(val, key)}
                        className="text-gray-400 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
                        title="نسخ القيمة"
                      >
                        {copiedCell === key ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedCell === key ? 'تم!' : 'نسخ'}</span>
                      </button>
                    </div>

                    {isJson && formattedJson ? (
                      <pre className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-[11px] text-amber-200 overflow-x-auto dir-ltr max-h-48 leading-relaxed">
                        {formattedJson}
                      </pre>
                    ) : (
                      <div className="text-gray-200 select-text break-words dir-ltr text-[11px]">
                        {val === null || val === undefined ? (
                          <span className="text-gray-600 italic">NULL</span>
                        ) : (
                          String(val)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#16212e] border-t border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setInspectedRow(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseBrowserView;
