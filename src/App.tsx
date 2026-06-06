/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppState, LedgerLog } from './types';
import { translations } from './translations';
import { 
  loadStateFromIndexedDB, 
  saveStateToIndexedDB, 
  loadFileSystemHandle, 
  saveFileSystemHandle, 
  syncToFile,
  manualDownloadBackup
} from './db';

// Import subcomponents
import SettingsPage from './components/SettingsPage';
import MenuManagementPage from './components/MenuManagementPage';
import RecipePortionsPage from './components/RecipePortionsPage';
import InboundPage from './components/InboundPage';
import OutboundPage from './components/OutboundPage';
import LiveBalancePage from './components/LiveBalancePage';
import ReconciliationPage from './components/ReconciliationPage';
import RegisterLedgerPage from './components/RegisterLedgerPage';

// Import lucide icons
import { 
  Settings, 
  BookOpen, 
  Layers,
  ArrowUpCircle, 
  ArrowDownCircle, 
  Activity, 
  FileText, 
  ClipboardList, 
  RotateCcw, 
  RotateCw, 
  Download, 
  Sun, 
  Moon, 
  Truck, 
  Printer,
  Menu,
  X
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  
  // History Undo/Redo Stacks
  const [pastStates, setPastStates] = useState<AppState[]>([]);
  const [futureStates, setFutureStates] = useState<AppState[]>([]);

  // File system state
  const [fileHandle, setFileHandle] = useState<any | null>(null);
  const [fileLinked, setFileLinked] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'balance' | 'menu' | 'portions' | 'inbound' | 'outbound' | 'reconcile' | 'ledger' | 'settings'>('balance');

  // Mobile navigation drawer toggle
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Print context state
  interface PrintContext {
    type: 'inbound' | 'outbound' | 'balance' | 'register' | 'discrepancy' | 'recipe_portions';
    selectedIds: string[];
    metadata?: any;
  }
  const [printContext, setPrintContext] = useState<PrintContext | null>(null);
  const [printHelpVisible, setPrintHelpVisible] = useState(false);

  // Initialize and load states
  useEffect(() => {
    async function loadData() {
      const loaded = await loadStateFromIndexedDB();
      setState(loaded);
      
      const handle = await loadFileSystemHandle();
      if (handle) {
        setFileHandle(handle);
        setFileLinked(true);
      }
    }
    loadData();
  }, []);

  // Sync theme to document body
  useEffect(() => {
    if (!state) return;
    const rootClass = document.documentElement.classList;
    if (state.theme === 'dark') {
      rootClass.add('dark');
    } else {
      rootClass.remove('dark');
    }
  }, [state?.theme]);

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-sm font-semibold text-gray-500 animate-pulse">
        <Activity size={24} className="mb-2 animate-spin text-green-600" />
        Loading restaurant ledger...
      </div>
    );
  }

  const t = translations[state.language];
  const isRTL = state.language === 'AR';

  // State update proxy capturing historical backups and triggering file sync
  const updateState = (updater: (prev: AppState) => AppState, description: string) => {
    setState((prev) => {
      if (!prev) return prev;
      
      // Cache current state before applying updates
      setPastStates((past) => [...past.slice(-19), prev]);
      setFutureStates([]); // purge redo path

      const next = updater(prev);
      
      // Save cache to IDB
      saveStateToIndexedDB(next);
      
      // Synchronize file systems if linked
      if (fileHandle) {
        syncToFile(fileHandle, next).then(ok => {
          if (!ok) {
            console.warn("Local JSON file handle sync state disconnected.");
          }
        });
      }

      return next;
    });
  };

  // Undo Handler
  const handleUndo = () => {
    if (pastStates.length === 0) return;
    const previous = pastStates[pastStates.length - 1];
    setFutureStates((fut) => [state, ...fut]);
    setPastStates((past) => past.slice(0, -1));
    
    // Commit previous
    setState(previous);
    saveStateToIndexedDB(previous);
    if (fileHandle) syncToFile(fileHandle, previous);
  };

  // Redo Handler
  const handleRedo = () => {
    if (futureStates.length === 0) return;
    const next = futureStates[0];
    setPastStates((past) => [...past, state]);
    setFutureStates((fut) => fut.slice(1));

    // Commit next
    setState(next);
    saveStateToIndexedDB(next);
    if (fileHandle) syncToFile(fileHandle, next);
  };

  // Set up File System links
  const handleRequestFileHandle = async () => {
    try {
      if (typeof (window as any).showSaveFilePicker !== 'function') {
        alert("Chrome File System Access API is narrow or restricted inside this sandboxed frame. Spawning manual JSON backup instead.");
        manualDownloadBackup(state);
        return;
      }

      const options = {
        suggestedName: 'restaurant_inventory_database.json',
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      };

      const handle = await (window as any).showSaveFilePicker(options);
      await saveFileSystemHandle(handle);
      setFileHandle(handle);
      setFileLinked(true);

      // Perform initial backup
      await syncToFile(handle, state);
      alert("Success! Your local file is synchronized. All inventory counts are written securely onto your desktop file.");
    } catch {
      // Fallback manual export
      manualDownloadBackup(state);
    }
  };

  // Print Orchestrations
  const triggerPrint = (
    type: 'inbound' | 'outbound' | 'balance' | 'register' | 'discrepancy' | 'recipe_portions',
    selectedIds: string[] = [],
    metadata: any = null
  ) => {
    setPrintContext({ type, selectedIds, metadata });
    setPrintHelpVisible(true);
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn("Print action: sandboxed frame restriction detected.", err);
      }
    }, 350);
  };

  return (
    <div 
      className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans"
      dir={isRTL ? 'rtl' : 'ltr'}
      id="app-container-root"
    >
      {/* 1. Mobile & Tablet Top Bar (Visible on mobile/tablet ONLY, hidden on desktop) */}
      <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30 no-print shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="mobile-hamburger-trigger"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 -mx-1.5 rounded-lg text-gray-600 hover:text-gray-950 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-850 transition-colors cursor-pointer"
            aria-label="Open navigation sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            {state.config.restaurantLogo ? (
              <img
                src={state.config.restaurantLogo}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-md object-cover border border-gray-200 dark:border-slate-700 bg-white"
              />
            ) : (
              <span className="w-7 h-7 bg-green-600 rounded-md text-white font-black text-xs flex items-center justify-center shadow">
                R
              </span>
            )}
            <span className="font-display font-bold text-sm text-gray-900 dark:text-white tracking-tight truncate max-w-[140px]">
              {state.config.restaurantName}
            </span>
          </div>
        </div>

        {/* Compact quick utilities on Mobile */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 border border-gray-200/50 dark:border-slate-700/50">
            <button
              type="button"
              disabled={pastStates.length === 0}
              onClick={handleUndo}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded disabled:opacity-40 transition-all cursor-pointer"
              title={`${t.undo} (${pastStates.length})`}
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              disabled={futureStates.length === 0}
              onClick={handleRedo}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded disabled:opacity-40 transition-all cursor-pointer"
              title={`${t.redo} (${futureStates.length})`}
            >
              <RotateCw size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => updateState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }), 'Toggled visual theme')}
            className="p-2 border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
          >
            {state.theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </header>

      {/* Backdrop overlay for mobile menu drawer */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden no-print"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Unified Sidebar: Drawer on mobile/tablet, Permanent column on Desktop */}
      <aside 
        id="app-nav-sidebar"
        className={`fixed inset-y-0 z-50 w-72 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800/80 flex flex-col justify-between p-5 transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 shrink-0 no-print shadow-2xl lg:shadow-none ${
          isRTL 
            ? 'right-0 border-l lg:border-l border-r-0 ' + (isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full')
            : 'left-0 border-r lg:border-r border-l-0 ' + (isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full')
        }`}
      >
        {/* Top brand header area */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {state.config.restaurantLogo ? (
                <img
                  src={state.config.restaurantLogo}
                  alt="Brand seal"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover border border-gray-200/80 dark:border-slate-700 bg-gray-50 shadow-sm"
                />
              ) : (
                <span className="w-10 h-10 bg-green-600 rounded-xl text-white font-display font-black text-base flex items-center justify-center shadow">
                  R
                </span>
              )}
              <div className="min-w-0">
                <span className="font-display font-bold text-gray-900 dark:text-white tracking-tight block truncate text-sm">
                  {state.config.restaurantName}
                </span>
                <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400 block uppercase font-extrabold tracking-wider relative -top-0.5">
                  {t.appTitle}
                </span>
              </div>
            </div>

            {/* Mobile Close Button drawer */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Insights Seal */}
          <div className="border-y border-gray-100 dark:border-slate-800/85 py-3.5 my-1">
            <span className="text-[9px] font-mono font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest block mb-2 font-black">
              {isRTL ? 'مراقب المخزون' : 'Inventory Monitor'}
            </span>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-500 dark:text-slate-400">
                  {isRTL ? 'تنبيهات نقص الكميات:' : 'Restock Alerts:'}
                </span>
                {state.elements.filter((el) => el.currentStock < el.alertThreshold).length > 0 ? (
                  <span className="text-red-650 dark:text-red-400 font-extrabold bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-lg animate-pulse">
                    {state.elements.filter((el) => el.currentStock < el.alertThreshold).length} {isRTL ? 'تنبيه' : 'low'}
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg">
                    {isRTL ? 'كافٍ ✓' : 'Ready ✓'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-500 dark:text-slate-400">
                  {isRTL ? 'إجمالي المواد الأولية:' : 'Raw Materials:'}
                </span>
                <span className="font-mono text-gray-800 dark:text-slate-200 flex items-center justify-center bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                  {state.elements.length}
                </span>
              </div>
            </div>
          </div>

          {/* Vertical navigation items */}
          <nav className="flex flex-col gap-1">
            <button
              id="nav-tab-balance"
              onClick={() => {
                setActiveTab('balance');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all duration-155 cursor-pointer ${
                activeTab === 'balance'
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/15'
                  : 'text-gray-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'
              }`}
            >
              <Activity size={16} />
              <span>{t.navBalance}</span>
              {state.elements.filter((el) => el.currentStock < el.alertThreshold).length > 0 && (
                <span className={`text-[10px] font-bold bg-red-550 text-white rounded-full px-1.5 py-0.5 ${isRTL ? 'mr-auto' : 'ml-auto'} animate-pulse`}>
                  {state.elements.filter((el) => el.currentStock < el.alertThreshold).length}
                </span>
              )}
            </button>

            <button
              id="nav-tab-menu"
              onClick={() => {
                setActiveTab('menu');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all duration-155 cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/15'
                  : 'text-gray-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'
              }`}
            >
              <BookOpen size={16} />
              <span>{t.navMenu}</span>
              {state.items.length > 0 && (
                <span className={`text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-bold rounded-lg px-2 py-0.5 ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
                  {state.items.length}
                </span>
              )}
            </button>

            <button
              id="nav-tab-portions"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                setActiveTab('portions');
              }}
              className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all duration-155 cursor-pointer ${
                activeTab === 'portions'
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/15'
                  : 'text-gray-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'
              }`}
            >
              <Layers size={16} />
              <span>
                {state.language === 'FR' 
                  ? 'Assemblage & Seuil Portions' 
                  : (isRTL ? 'تجميع وصفات الطعام وسقف الحصص' : 'Recipe Assembly & Portions')}
              </span>
            </button>

            <button
              id="nav-tab-inbound"
              onClick={() => {
                setActiveTab('inbound');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all duration-155 cursor-pointer ${
                activeTab === 'inbound'
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/15'
                  : 'text-gray-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'
              }`}
            >
              <ArrowUpCircle size={16} />
              <span>{t.navInbound}</span>
            </button>

            <button
              id="nav-tab-outbound"
              onClick={() => {
                setActiveTab('outbound');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all duration-155 cursor-pointer ${
                activeTab === 'outbound'
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/15'
                  : 'text-gray-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'
              }`}
            >
              <ArrowDownCircle size={16} />
              <span>{t.navOutbound}</span>
            </button>

            <button
              id="nav-tab-reconcile"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                setActiveTab('reconcile');
              }}
              className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all duration-155 cursor-pointer ${
                activeTab === 'reconcile'
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/15'
                  : 'text-gray-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'
              }`}
            >
              <ClipboardList size={16} />
              <span>{t.navReconciliation}</span>
            </button>

            <button
              id="nav-tab-ledger"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                setActiveTab('ledger');
              }}
              className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all duration-155 cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/15'
                  : 'text-gray-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'
              }`}
            >
              <FileText size={16} />
              <span>{t.navLedger}</span>
              {state.logs.length > 0 && (
                <span className={`text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-bold rounded-lg px-2 py-0.5 ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
                  {state.logs.length}
                </span>
              )}
            </button>

            <button
              id="nav-tab-settings"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                setActiveTab('settings');
              }}
              className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all duration-155 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/15'
                  : 'text-gray-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'
              }`}
            >
              <Settings size={16} />
              <span>{t.navSettings}</span>
            </button>
          </nav>
        </div>

        {/* Bottom Section: Universal Dock (Undo/Redo, Language, Light/Dark, Sync) */}
        <div className="flex flex-col gap-4 border-t border-gray-100 dark:border-slate-800 pt-4 mt-auto">
          {/* Action Stacks Undo & Redo (Hidden on mobile header if they are redundant, but kept here for complete dock) */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500 font-extrabold uppercase">
              {isRTL ? 'تعديلات:' : 'History:'}
            </span>
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 border border-gray-200/50 dark:border-slate-700/50">
              <button
                type="button"
                id="global-undo-btn"
                disabled={pastStates.length === 0}
                onClick={handleUndo}
                className="p-1 px-1.5 hover:bg-white dark:hover:bg-slate-700 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                title={`${t.undo} (${pastStates.length})`}
              >
                <RotateCcw size={12} />
                <span>{pastStates.length}</span>
              </button>
              <button
                type="button"
                id="global-redo-btn"
                disabled={futureStates.length === 0}
                onClick={handleRedo}
                className="p-1 px-1.5 hover:bg-white dark:hover:bg-slate-700 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                title={`${t.redo} (${futureStates.length})`}
              >
                <RotateCw size={12} />
              </button>
            </div>
          </div>

          {/* Quick manual download JSON backup */}
          <div className="flex items-center justify-between gap-1 text-xs">
            <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500 font-extrabold uppercase">
              {isRTL ? 'نسخة احتياطية:' : 'Local Space:'}
            </span>
            <button
              type="button"
              id="header-backup-btn"
              onClick={() => manualDownloadBackup(state)}
              className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Manual Snapshot Backup (JSON)"
            >
              <Download size={11} />
              <span>JSON Backup</span>
            </button>
          </div>

          {/* Global controls row (Theme and language) */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Theme switcher */}
            <button
              type="button"
              id="header-theme-toggle"
              onClick={() => updateState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }), 'Toggled visual theme')}
              className="p-2 border border-gray-200 text-gray-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-850 rounded-lg transition-colors cursor-pointer flex items-center gap-1 bg-gray-50/50 dark:bg-slate-900"
              title="Toggle Theme style"
            >
              {state.theme === 'light' ? (
                <>
                  <Moon size={14} />
                  <span className="text-[10px] font-bold hidden lg:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun size={14} />
                  <span className="text-[10px] font-bold hidden lg:inline">Light</span>
                </>
              )}
            </button>

            {/* Language Selector */}
            <select
              className="px-2.5 py-1.5 bg-gray-100 dark:bg-slate-800 text-xs border border-transparent rounded-lg font-bold cursor-pointer max-w-[80px]"
              value={state.language}
              onChange={(e) => {
                const lang = e.target.value as any;
                updateState((prev) => ({ ...prev, language: lang }), `Language updated to ${lang}`);
              }}
            >
              <option value="EN">EN 🇺🇸</option>
              <option value="FR">FR 🇫🇷</option>
              <option value="AR">AR 🇸🇦</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main content workspace area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden no-print">
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === 'balance' && <LiveBalancePage state={state} triggerPrint={triggerPrint} />}
          {activeTab === 'menu' && <MenuManagementPage state={state} updateState={updateState} />}
          {activeTab === 'inbound' && <InboundPage state={state} updateState={updateState} triggerPrint={triggerPrint} />}
          {activeTab === 'outbound' && <OutboundPage state={state} updateState={updateState} />}
          {activeTab === 'reconcile' && <ReconciliationPage state={state} updateState={updateState} triggerPrint={triggerPrint} />}
          {activeTab === 'portions' && (
            <RecipePortionsPage 
              state={state} 
              triggerPrint={triggerPrint} 
            />
          )}
          {activeTab === 'ledger' && <RegisterLedgerPage state={state} triggerPrint={triggerPrint} />}
          {activeTab === 'settings' && (
            <SettingsPage 
              state={state} 
              updateState={updateState} 
              fileLinked={fileLinked} 
              setFileLinked={setFileLinked}
              onRequestFileHandle={handleRequestFileHandle}
            />
          )}
        </div>
      </main>

      {/* 2. PRINT-ONLY A4 RENDER CANVAS (Strictly hidden when on-screen, only visible during printer triggers) */}
      {printContext && (
        <div className="print-only-container hidden print:block overflow-visible p-6 text-black bg-white select-none">
          
          {/* Centered Logo & Header section */}
          <div className="text-center mb-8 border-b-2 border-dashed border-gray-400 pb-5">
            {state.config.restaurantLogo ? (
              <img
                src={state.config.restaurantLogo}
                alt="Logo Stamp"
                referrerPolicy="no-referrer"
                className="h-16 w-auto mx-auto mb-2 object-contain"
              />
            ) : (
              <div className="w-12 h-12 bg-black text-white font-extrabold text-2xl flex items-center justify-center rounded mx-auto mb-2">
                R
              </div>
            )}
            <h1 className="text-2xl font-bold uppercase tracking-tight">{state.config.restaurantName}</h1>
            <p className="text-xs uppercase tracking-wider font-mono text-gray-500 mt-1">
              Physical Inventory Manifest — {t.appTitle}
            </p>
            <div className="text-[10px] text-gray-500 font-mono mt-2 space-y-0.5">
              <div>Date Printed: {new Date().toLocaleString()}</div>
              <div>Report Category: {printContext.type.toUpperCase()} DOCUMENT</div>
            </div>
          </div>

          {/* Table Router based on printed action type context */}

          {/* Render Inbound shipment list */}
          {printContext.type === 'inbound' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase border-b pb-1">INBOUND INGREDIENTS ARRIVALS</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 font-bold text-left bg-slate-100 text-slate-800">
                    <th className="py-2 px-1">Arrival Date</th>
                    <th className="py-2">Raw Ingredient</th>
                    <th className="py-2 text-right">Quantity Received</th>
                    <th className="py-2 px-2 text-left">Notes / Carrier details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {state.logs
                    .filter((l) => printContext.selectedIds.includes(l.id))
                    .map((log) => {
                      const elementRef = log.elementsImpacted[0];
                      return (
                        <tr key={log.id} className="even:bg-gray-50">
                          <td className="py-1.5 px-1 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="py-1.5 font-bold">{log.targetName}</td>
                          <td className="py-1.5 text-right font-bold text-green-700">+{elementRef ? elementRef.quantity : 0} {elementRef ? elementRef.unit : ''}</td>
                          <td className="py-1.5 px-2 text-gray-600 max-w-xs">{log.details}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* Render Outbound depletion logs */}
          {printContext.type === 'outbound' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase border-b pb-1">OUTBOUND DEPLETION JOURNAL REPORT</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 font-bold text-left bg-slate-100 text-slate-800">
                    <th className="py-2 px-1">Date Logged</th>
                    <th className="py-2">Item Deduced</th>
                    <th className="py-2">Flow Reason</th>
                    <th className="py-2 text-right">Deconstruction Depletions</th>
                  </tr>
                </thead>
                <tbody className="divide-y col-span-4">
                  {state.logs
                    .filter((l) => printContext.selectedIds.includes(l.id))
                    .map((log) => (
                      <tr key={log.id} className="even:bg-gray-50">
                        <td className="py-2 px-1 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-2 font-bold">{log.targetName} x{log.parentQuantity}</td>
                        <td className="py-2 font-semibold capitalize">{log.actionType}</td>
                        <td className="py-2 text-right font-mono text-[10px] max-w-sm">
                          {log.elementsImpacted.map((el) => `${el.elementName}: ${el.quantity}${el.unit}`).join(', ')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Render Purchase restock checklist balance */}
          {printContext.type === 'balance' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase border-b pb-1">RESTOCK ORDER CHECKLIST / BALANCE AUDIT</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 font-bold text-left bg-slate-100 text-slate-800">
                    <th className="py-2 px-2 w-8">TICK</th>
                    <th className="py-2">Raw Ingredient</th>
                    <th className="py-2 text-center">Unit</th>
                    <th className="py-2 text-right">Current Stock</th>
                    <th className="py-2 text-right">Min Threshold</th>
                    <th className="py-2 text-center">Status Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y select-list">
                  {state.elements
                    .filter((el) => printContext.selectedIds.includes(el.id))
                    .map((el) => {
                      const isLow = el.currentStock < el.alertThreshold;
                      return (
                        <tr key={el.id} className="even:bg-gray-50">
                          <td className="py-2 px-2 text-center">
                            <span className="inline-block w-4 h-4 border border-black text-transparent rounded">_</span>
                          </td>
                          <td className="py-2 font-bold">{el.name}</td>
                          <td className="py-2 text-center font-mono">{el.unit}</td>
                          <td className="py-2 text-right font-mono">{el.currentStock.toFixed(3).replace(/\.?0+$/, '')}</td>
                          <td className="py-2 text-right font-mono">{el.alertThreshold}</td>
                          <td className="py-2 text-center">
                            {isLow ? <strong className="text-red-600 uppercase text-[9px] badge-low-stock">RESTOCK REQ</strong> : <span className="text-gray-500 text-[10px]">Adequate</span>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* Render Register log entries layout list */}
          {printContext.type === 'register' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase border-b pb-1">DAILY ACTIVITY AUDIT LEDGER JOURNAL</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 font-bold text-left bg-slate-100 text-slate-800">
                    <th className="py-2 px-1">Timestamp</th>
                    <th className="py-2">Direction</th>
                    <th className="py-2">Subject / Target Name</th>
                    <th className="py-2 max-w-xs">Audit Commentary Comments</th>
                    <th className="py-2 text-right pr-2">Elemental Weights Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[10px]">
                  {state.logs
                    .filter((l) => printContext.selectedIds.includes(l.id))
                    .map((log) => (
                      <tr key={log.id} className="even:bg-gray-50">
                        <td className="py-2 px-1 font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-2 font-bold uppercase">{log.type}</td>
                        <td className="py-2 font-bold">{log.targetName} {log.parentQuantity !== undefined && `(x${log.parentQuantity})`}</td>
                        <td className="py-2">{log.details}</td>
                        <td className="py-2 text-right pr-2 font-mono whitespace-nowrap">
                          {log.elementsImpacted.map((itm) => `${itm.elementName}: ${itm.quantity > 0 ? '+' : ''}${itm.quantity}${itm.unit}`).join('\n')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Render Discrepancy Reconciliation Form certificate */}
          {printContext.type === 'discrepancy' && printContext.metadata && (
            <div className="space-y-6 pt-2">
              <h2 className="text-sm font-bold uppercase text-center border-b pb-1.5 tracking-wider">RECONCILIATION DISCREPANCY AUDIT CERTIFICATE</h2>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-mono border p-4 bg-slate-50/50 rounded-xl">
                <div>
                  <strong>Ingredient:</strong> {printContext.metadata.targetName}
                </div>
                <div>
                  <strong>Unit Packaging:</strong> {printContext.metadata.unit}
                </div>
                <div>
                  <strong>App System Target:</strong> {printContext.metadata.digitalStock.toFixed(3)} {printContext.metadata.unit}
                </div>
                <div>
                  <strong>Physical Shelf Count:</strong> {printContext.metadata.physicalCount.toFixed(3)} {printContext.metadata.unit}
                </div>
                <div className="col-span-2 border-t pt-2 mt-2">
                  <strong className={printContext.metadata.gap < 0 ? 'text-red-600' : 'text-green-600'}>
                    Discrepancy Gap Offset: {printContext.metadata.gap > 0 ? '+' : ''}{printContext.metadata.gap.toFixed(3)} {printContext.metadata.unit}
                  </strong>
                </div>
              </div>

              {/* Status information */}
              <div className={`text-xs text-gray-700 leading-relaxed ${isRTL ? 'border-r-4 pr-3 text-right' : 'border-l-4 pl-3 text-left'} py-1.5 space-y-1 bg-slate-50`}>
                <div>
                  <strong>{isRTL ? 'حالة المعالجة والتحديث:' : 'Resolution Status:'}</strong> {printContext.metadata.isAutoBalanced 
                    ? (isRTL ? 'الخيار (أ) (تم تحديث رصيد النظام ومطابقة الفروقات يدوياً وبنجاح.)' : 'OPTION A (System counters calibrated successfully with loss/gain registration).')
                    : (isRTL ? 'الخيار (ب) (مسوّدة طباعة فقط. تم الحفاظ على الأرصدة الرقمية كما هي دون تعديل.)' : 'OPTION B (Printed only. Digital balances preserved exactly as previous).')}
                </div>
                {printContext.metadata.notes && (
                  <div>
                    <strong>{isRTL ? 'تعليقات المدقق وملاحظات الفارق:' : 'Audit Commentary Comments:'}</strong> {printContext.metadata.notes}
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs">
                <div className="space-y-4">
                  <div className="border-b border-black w-32 h-6 mx-auto" />
                  <span>Submitting Auditor (Floor Chef)</span>
                </div>
                <div className="space-y-4">
                  <div className="border-b border-black w-32 h-6 mx-auto" />
                  <span>Authorized Supervisor (Manager)</span>
                </div>
              </div>

            </div>
          )}

          {/* Render Recipe assembly stock capacity portions report */}
          {printContext.type === 'recipe_portions' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase border-b pb-1">RECIPE PORTIONS CAPACITY & PRODUCTION CEILINGS (ASSEMBLAGE)</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 font-bold text-left bg-slate-100 text-slate-800 font-mono text-[11px]">
                    <th className="py-2 px-2 w-8">TICK</th>
                    <th className="py-2">Recipe Item Name</th>
                    <th className="py-2 text-right">Max Serving Portions Capacity</th>
                    <th className="py-2 text-right">Production Bottleneck (Limiting Raw Material)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px]">
                  {state.items
                    .filter((r) => printContext.selectedIds.includes(r.id))
                    .map((item) => {
                      let maxServings = Infinity;
                      let bottleneckElement = '';
                      let bottleneckRequired = 0;
                      let bottleneckAvailable = 0;
                      let elUnit = '';

                      if (!item.elements || item.elements.length === 0) {
                        maxServings = Infinity;
                      } else {
                        item.elements.forEach((link) => {
                          const match = state.elements.find((el) => el.id === link.elementId);
                          if (match) {
                            if (link.quantity <= 0) return;
                            const potential = match.currentStock / link.quantity;
                            if (potential < maxServings) {
                              maxServings = potential;
                              bottleneckElement = match.name;
                              bottleneckRequired = link.quantity;
                              bottleneckAvailable = match.currentStock;
                              elUnit = match.unit;
                            }
                          } else {
                            maxServings = 0;
                            bottleneckElement = 'Unknown Ingredient';
                          }
                        });
                      }

                      const finalMax = maxServings === Infinity ? 'Unlimited' : Math.floor(maxServings);

                      return (
                        <tr key={item.id} className="even:bg-gray-50">
                          <td className="py-2 px-2 text-center">
                            <span className="inline-block w-4 h-4 border border-black text-transparent rounded">_</span>
                          </td>
                          <td className="py-2 font-bold">{item.name}</td>
                          <td className={`py-2 text-right font-mono font-bold ${
                            maxServings === 0 
                              ? 'text-red-650 font-semibold' 
                              : maxServings > 0 && maxServings < 15 
                                ? 'text-amber-600 font-semibold' 
                                : 'text-green-700 font-semibold'
                          }`}>
                            {finalMax} servings
                          </td>
                          <td className="py-2 text-right font-mono text-[10px] text-gray-500">
                            {bottleneckElement ? (
                              <span>
                                {bottleneckElement} ({bottleneckRequired} {elUnit} per portion / {bottleneckAvailable.toFixed(2)} {elUnit} in stock)
                              </span>
                            ) : (
                              'None (Zero raw ingredients linked)'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs font-semibold">
                <div className="space-y-4">
                  <div className="border-b border-black w-32 h-6 mx-auto" />
                  <span>Submitting Auditor (Floor Chef)</span>
                </div>
                <div className="space-y-4">
                  <div className="border-b border-black w-32 h-6 mx-auto" />
                  <span>Authorized Supervisor (Manager)</span>
                </div>
              </div>
            </div>
          )}

          {/* Standard Footer */}
          <div className="mt-12 text-center text-[9px] text-gray-400 font-mono border-t pt-4">
            Generated via compliant Restaurant Inventory Ledger Engine. Locally synchronized - strictly valid offline.
          </div>

        </div>
      )}

      {/* Dynamic print-help alert toast */}
      {printHelpVisible && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-blue-50 dark:bg-slate-900 border-l-4 border-blue-600 p-4 rounded-r-xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 no-print">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <Printer size={18} />
            </div>
            <div className="space-y-1.5 flex-1 p-0.5">
              <h5 className="font-bold text-xs text-blue-900 dark:text-blue-200">
                {isRTL ? 'مساعد الطباعة والتقارير' : 'PDF Report Printer Guide'}
              </h5>
              <p className="text-[11px] text-blue-750 dark:text-gray-300 leading-normal">
                {isRTL 
                  ? 'إذا تم حظر الطباعة بواسطة المتصفح في نافذة المعاينة، يرجى فتح التطبيق في تبويب مستقل (بالنقر على أيقونة السهم في أعلى يمين الشاشة) لتفعيل الطباعة والتحميل بنجاح.'
                  : 'If printing did not respond, your browser blocks print dialogs inside this preview frame. Please open the app in a new tab by clicking the "Open in new tab" arrow icon at the very top right corner next to preview to trigger the print dialog successfully.'}
              </p>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setPrintHelpVisible(false)}
                  className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  {isRTL ? 'حسناً جرب الآن' : 'Got it! Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
