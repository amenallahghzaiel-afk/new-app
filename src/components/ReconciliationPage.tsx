/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, LedgerLog } from '../types';
import { translations } from '../translations';
import { Scale, CheckCircle2, Printer, AlertCircle, FileSpreadsheet, ArrowLeftRight } from 'lucide-react';

interface ReconciliationPageProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState, description: string) => void;
  triggerPrint: (type: 'inbound' | 'outbound' | 'balance' | 'register' | 'discrepancy', selectedLogIds?: string[], printMeta?: any) => void;
}

export default function ReconciliationPage({ state, updateState, triggerPrint }: ReconciliationPageProps) {
  const t = translations[state.language];
  const isRTL = state.language === 'AR';

  // State inputs
  const [selectedElementId, setSelectedElementId] = useState(state.elements[0]?.id || '');
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const targetEl = state.elements.find((el) => el.id === selectedElementId);
  const digitalStock = targetEl ? targetEl.currentStock : 0;
  const unit = targetEl ? targetEl.unit : 'unit';

  // Discrepancy calculation: physical shelf count - app counter state
  const discrepancyGap = physicalCount - digitalStock;

  // Option A Resolve
  const handleResolveOptionA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElementId || !targetEl) return;

    const diff = discrepancyGap;
    const notesString = notes.trim() || 'Audited Physical reconciliation completed.';

    // Create a special ledger log to track this adjustment
    const newLog: LedgerLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Discrepancy',
      actionType: 'reconciliation_adjustment',
      targetName: targetEl.name,
      parentQuantity: physicalCount,
      details: `Reconciliation audit: Calibrated digital inventory to physical shelf count. Notes: ${notesString}`,
      elementsImpacted: [
        {
          elementId: targetEl.id,
          elementName: targetEl.name,
          quantity: diff, // can be positive (surplus) or negative (shortage)
          unit: targetEl.unit,
        },
      ],
    };

    updateState((prev) => {
      // Set the elements stock directly to Physical Count
      const updatedElements = prev.elements.map((el) => {
        if (el.id === selectedElementId) {
          return { ...el, currentStock: physicalCount };
        }
        return el;
      });

      return {
        ...prev,
        elements: updatedElements,
        logs: [newLog, ...prev.logs],
      };
    }, `Reconciled physical stock for ${targetEl.name}. Inventory calibrated to ${physicalCount} ${targetEl.unit}.`);

    // Reset inputs
    setPhysicalCount(0);
    setNotes('');

    // Print discrepancy layout with specific log reference
    alert('Stock calibrated successfully. Spawning A4 print manifest.');
    triggerPrint('discrepancy', [newLog.id], {
      targetName: targetEl.name,
      digitalStock,
      physicalCount,
      gap: diff,
      unit,
      notes: notesString,
      isAutoBalanced: true,
    });
  };

  // Option B Print Only
  const handleResolveOptionB = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElementId || !targetEl) return;

    const diff = discrepancyGap;
    const notesString = notes.trim() || 'Draft/Manual worksheet report compiled.';

    alert('Preserving digital records untouched. Spawning A4 print report.');
    triggerPrint('discrepancy', [], {
      targetName: targetEl.name,
      digitalStock,
      physicalCount,
      gap: diff,
      unit,
      notes: notesString,
      isAutoBalanced: false,
    });
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} id="reconciliation-root">
      
      {/* Page header banner */}
      <div className="border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {t.reconcileTitle}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Perform audits, track differences between system trackers and physical counters, and compile discrepancy manifests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Audit Form cards */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 lg:col-span-2 space-y-6">
          
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Scale className="text-green-650 text-green-600" size={18} />
            Physical Shelf Audit Form
          </h3>

          {state.elements.length === 0 ? (
            <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-lg dark:bg-amber-950/20 dark:text-amber-400">
              No raw ingredients defined. Go to <strong>Menu Recipes</strong> to add elements first.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Selections element selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="reconcile-select-element">
                    {t.selectElement}
                  </label>
                  <select
                    id="reconcile-select-element"
                    className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
                    value={selectedElementId}
                    onChange={(e) => setSelectedElementId(e.target.value)}
                  >
                    {state.elements.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Handcount Physical input quantity */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="shelf-count-qty">
                    {t.physicalCountLabel}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      id="shelf-count-qty"
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none"
                      placeholder="0.00"
                      value={physicalCount || ''}
                      onChange={(e) => setPhysicalCount(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-3.5 top-3 text-xs font-bold text-gray-500 dark:text-slate-400">
                      {unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic stats preview cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 p-4 border border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 block tracking-wider">SYSTEM BALANCES</span>
                  <span className="text-lg font-mono font-bold text-gray-900 dark:text-white mt-1 block">
                    {digitalStock.toFixed(3).replace(/\.?0+$/, '')} {unit}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 p-4 border border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 block tracking-wider">PHYSICAL HANDCOUNT</span>
                  <span className="text-lg font-mono font-bold text-gray-900 dark:text-white mt-1 block">
                    {physicalCount.toFixed(3).replace(/\.?0+$/, '')} {unit}
                  </span>
                </div>

                <div className={`p-4 rounded-xl p-4 border ${discrepancyGap === 0 ? 'bg-gray-50 border-gray-100 dark:bg-slate-850 dark:border-slate-800' : (discrepancyGap > 0 ? 'bg-green-50/50 border-green-205 dark:bg-green-950/10 border-green-900/30' : 'bg-red-50/50 border-red-200 dark:bg-red-950/10 border-red-900/30')}`}>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 block tracking-wider">DISCREPANCY IMPACT</span>
                  <span className={`text-lg font-mono font-bold mt-1 block ${discrepancyGap === 0 ? 'text-gray-900 dark:text-white' : (discrepancyGap > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400')}`}>
                    {discrepancyGap > 0 ? '+' : ''}
                    {discrepancyGap.toFixed(3).replace(/\.?0+$/, '')} {unit}
                  </span>
                </div>
              </div>

              {/* Notes Input textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="reconciliation-notes">
                  {t.discrepancyNotes}
                </label>
                <textarea
                  id="reconciliation-notes"
                  className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none h-20"
                  placeholder="Reasons for shortages (e.g. barista spilled milk, waste logs omitted under crunch, evaporation of raw goods)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Form Option Decisions Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-150 dark:border-slate-850 pt-6">
                
                {/* Option A trigger box */}
                <div className="p-4 rounded-xl border border-green-200 bg-green-50/30 dark:border-green-900/40 dark:bg-green-950/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider block">
                      {t.actionA}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                      {t.actionADesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="resolve-option-a-btn"
                    onClick={handleResolveOptionA}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-3"
                  >
                    <CheckCircle2 size={14} />
                    Audit & Calibrate State
                  </button>
                </div>

                {/* Option B trigger box */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-850/20 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider block">
                      {t.actionB}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-slate-300 leading-relaxed">
                      {t.actionBDesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="resolve-option-b-btn"
                    onClick={handleResolveOptionB}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold text-xs rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-3"
                  >
                    <Printer size={14} />
                    {t.printOnlyDesc || 'Print Discrepancy Only'}
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Right Side: Quick info on Audit regulations and recent adjustments */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="text-amber-500" size={18} />
            Safety Auditting Directives
          </h3>

          <div className="text-xs text-gray-500 dark:text-slate-400 space-y-3 leading-relaxed">
            <p>
              Under physical food hygiene and regulatory guidelines (e.g. food hygiene compliance checklists), discrepancies in stock can indicate severe spoilage, theft, or bar kitchen wastage.
            </p>
            <p>
              <strong>Calibration Audit logs</strong> reconcile digital values to true physical stock. The auto-adjust tool makes it simple to reset app stock counters to the physical count.
            </p>
            <p>
              Shortage adjustments are automatically categorized under Outbound movements for transparent ledger transparency.
            </p>
          </div>

          {/* Quick list of recent reconciliation actions */}
          <div className="border-t border-gray-150 dark:border-slate-800 pt-4 space-y-3">
            <span className="text-[10px] font-bold text-gray-400 tracking-wider block">RECENT RECONCILIATION ADJUSTMENTS</span>

            <div className="space-y-2">
              {state.logs.filter((log) => log.actionType === 'reconciliation_adjustment').slice(0, 3).map((log) => {
                const impact = log.elementsImpacted[0];
                return (
                  <div key={log.id} className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-850/50 border border-gray-100 dark:border-slate-800 text-[11px]">
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-900 dark:text-white">
                      <span>{log.targetName}</span>
                      <span className={impact && impact.quantity < 0 ? 'text-red-500' : 'text-green-600'}>
                        {impact && impact.quantity > 0 ? '+' : ''}
                        {impact ? impact.quantity.toFixed(3).replace(/\.?0+$/, '') : 0} {impact?.unit}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 inline-block mt-0.5">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
              {state.logs.filter((log) => log.actionType === 'reconciliation_adjustment').length === 0 && (
                <p className="text-[10px] text-gray-400">No adjustment occurrences logged yet.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
