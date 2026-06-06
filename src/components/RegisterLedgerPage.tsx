/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { AppState, LedgerLog } from '../types';
import { translations } from '../translations';
import { Search, Calendar, ChevronRight, CheckSquare, Square, Printer, Download, Filter, RotateCcw, ArrowUpRight, ArrowDownRight, RefreshCw, XCircle } from 'lucide-react';

interface RegisterLedgerPageProps {
  state: AppState;
  triggerPrint: (type: 'inbound' | 'outbound' | 'balance' | 'register' | 'discrepancy', selectedLogIds?: string[]) => void;
}

export default function RegisterLedgerPage({ state, triggerPrint }: RegisterLedgerPageProps) {
  const t = translations[state.language];
  const isRTL = state.language === 'AR';

  // Filters state
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'All' | 'Inbound' | 'Outbound' | 'Discrepancy'>('All');
  const [reasonFilter, setReasonFilter] = useState<'All' | 'delivery' | 'sold' | 'waste' | 'staff_meal' | 'reconciliation_adjustment'>('All');
  
  // Date boundaries (Default last 30 days)
  const defaultStartDate = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const defaultEndDate = new Date(Date.now() + 24 * 3600 * 1050).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // Checked logs state
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // Filtering calculation logic
  const filteredLogs = state.logs.filter((log) => {
    // 1. Search Query
    const query = search.toLowerCase();
    const matchesSearch = 
      log.targetName.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query) ||
      log.type.toLowerCase().includes(query);

    // 2. Flow direction
    const matchesDirection = directionFilter === 'All' ? true : log.type === directionFilter;

    // 3. Reason filter
    const matchesReason = reasonFilter === 'All' ? true : log.actionType === reasonFilter;

    // 4. Date ranges
    const logDate = log.timestamp.split('T')[0];
    const afterStart = startDate ? logDate >= startDate : true;
    const beforeEnd = endDate ? logDate <= endDate : true;

    return matchesSearch && matchesDirection && matchesReason && afterStart && beforeEnd;
  });

  // Toggle checklist selectors
  const toggleSelectAll = () => {
    if (checkedIds.length === filteredLogs.length) {
      setCheckedIds([]); // clear
    } else {
      setCheckedIds(filteredLogs.map((log) => log.id)); // select all
    }
  };

  const toggleCheck = (id: string) => {
    if (checkedIds.includes(id)) {
      setCheckedIds(checkedIds.filter((x) => x !== id));
    } else {
      setCheckedIds([...checkedIds, id]);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setDirectionFilter('All');
    setReasonFilter('All');
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setCheckedIds([]);
  };

  // CSV Generator
  const handleExportCsv = () => {
    const logsToExport = filteredLogs.filter((log) => 
      checkedIds.length > 0 ? checkedIds.includes(log.id) : true
    );

    if (logsToExport.length === 0) {
      alert('No ledger records available to export.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Date,Direction,Action Type,Item/Target,Qty,Details,Impacted Elements\n';

    logsToExport.forEach((log) => {
      const dateStr = new Date(log.timestamp).toLocaleString();
      const firstImpact = log.elementsImpacted[0];
      const qtyStr = firstImpact ? firstImpact.quantity : 0;
      const impactsAggregated = log.elementsImpacted.map(item => `${item.elementName}: ${item.quantity}${item.unit}`).join('; ');
      
      const targetNameClean = log.targetName.replace(/"/g, '""');
      const detailsClean = log.details.replace(/"/g, '""');

      csvContent += `"${dateStr}","${log.type}","${log.actionType}","${targetNameClean}",${qtyStr},"${detailsClean}","${impactsAggregated}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloader = document.createElement('a');
    downloader.setAttribute('href', encodedUri);
    downloader.setAttribute('download', `ledger_audit_journal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloader);
    downloader.click();
    downloader.remove();
  };

  // Print selected log manifests
  const handlePrintLedger = () => {
    const selectedIds = checkedIds.length > 0 ? checkedIds : filteredLogs.map((l) => l.id);
    if (selectedIds.length === 0) {
      alert('No ledger rows selected to output.');
      return;
    }
    triggerPrint('register', selectedIds);
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} id="ledger-page-root">
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {t.ledgerTitle}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Chronological audit registry tracking physical quantities. Fully compliant with food regulatory standards.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="ledger-export-csv-btn"
            onClick={handleExportCsv}
            className="px-3.5 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-800 font-semibold text-xs inline-flex items-center gap-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Download size={14} />
            {t.exportCsv}
          </button>
          <button
            type="button"
            id="ledger-print-a4-btn"
            onClick={handlePrintLedger}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Printer size={14} />
            {t.printA4}
          </button>
        </div>
      </div>

      {/* Filter and selector dashboard card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 dark:bg-slate-900 dark:border-slate-850 space-y-4">
        
        {/* Row 1: Search Queries and Filters dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search box input */}
          <div className="relative md:col-span-2">
            <input
              type="text"
              id="ledger-search-input"
              className={`w-full ${isRTL ? 'pl-4 pr-9' : 'pl-9 pr-4'} py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white`}
              placeholder={t.searchLedger}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3.5 text-gray-400`} />
          </div>

          {/* Direction filters dropdown */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400">Direction Type</span>
            <select
              id="ledger-direction-filter"
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as any)}
            >
              <option value="All">All Movements</option>
              <option value="Inbound">Inbound (Addition)</option>
              <option value="Outbound">Outbound (Depletion)</option>
              <option value="Discrepancy">Discrepancy (Audit)</option>
            </select>
          </div>

          {/* Reason filters dropdown */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400">Action Reason Category</span>
            <select
              id="ledger-reason-filter"
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as any)}
            >
              <option value="All">All Categories</option>
              <option value="delivery">Deliveries (Cargo)</option>
              <option value="sold">Customer Sales</option>
              <option value="waste">Wastages / Shortages</option>
              <option value="staff_meal">Staff Consumption</option>
              <option value="reconciliation_adjustment">Reconciliation Adjustments</option>
            </select>
          </div>

        </div>

        {/* Row 2: Date calendars and Clear filter button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-100 dark:border-slate-800/40 pt-4">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">From</span>
              <input
                type="date"
                id="ledger-start-date"
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">To</span>
              <input
                type="date"
                id="ledger-end-date"
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            id="ledger-reset-filters-btn"
            onClick={resetFilters}
            className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-350 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            {t.clearAll}
          </button>
        </div>

      </div>

      {/* Main Ledger movements table card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 dark:bg-slate-900 dark:border-slate-850 space-y-4">
        
        {/* Table summary selection stats */}
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-slate-450">
          <span>Journal Log occurrences matched: {filteredLogs.length}</span>
          {checkedIds.length > 0 && (
            <span className="text-green-600 dark:text-green-400">Checkmarked rows: {checkedIds.length}</span>
          )}
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-gray-500 dark:text-slate-400 text-sm">
            <XCircle size={32} className="mx-auto mb-2 text-gray-400 dark:text-slate-500" />
            {t.noData} Try adjusting query search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="daily-ledger-table" className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 text-left text-xs text-gray-500 dark:text-slate-400 font-semibold subtitle-row bg-slate-50/50 dark:bg-slate-850/20">
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      id="ledger-master-checkbox"
                      onClick={toggleSelectAll}
                      className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-400 cursor-pointer"
                      title={t.selectAll}
                    >
                      {checkedIds.length === filteredLogs.length ? (
                        <CheckSquare size={16} className="text-green-600 dark:text-green-400 inline" />
                      ) : (
                        <Square size={16} className="inline" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 pr-2 w-32">Date & Time</th>
                  <th className="py-3 w-28">{t.flowLabel}</th>
                  <th className="py-3 w-44">{t.sourceLabel}</th>
                  <th className="py-3">{t.detailsLabel}</th>
                  <th className="py-3 text-right pr-3">Elemental Quantities Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-[13px]">
                {filteredLogs.map((log) => {
                  const isChecked = checkedIds.includes(log.id);
                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-gray-50/50 dark:hover:bg-slate-850/20 transition-all ${isChecked ? 'bg-green-50/25 dark:bg-green-950/5' : ''}`}
                    >
                      {/* Interactive block selections checkboxes */}
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          id={`ledger-checkbox-${log.id}`}
                          onClick={() => toggleCheck(log.id)}
                          className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-400 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare size={16} className="text-green-600 dark:text-green-400 inline" />
                          ) : (
                            <Square size={16} className="inline" />
                          )}
                        </button>
                      </td>

                      {/* Date/Time column */}
                      <td className="py-4 pr-2 text-xs text-gray-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>

                      {/* Flow directional badges */}
                      <td className="py-4">
                        {log.type === 'Inbound' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/20 dark:text-green-400">
                            <ArrowUpRight size={10} />
                            {t.inboundShort}
                          </span>
                        )}
                        {log.type === 'Outbound' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400">
                            <ArrowDownRight size={10} />
                            {t.outboundShort}
                          </span>
                        )}
                        {log.type === 'Discrepancy' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                            <RefreshCw size={10} />
                            {t.discrepancyShort}
                          </span>
                        )}
                      </td>

                      {/* Target Subject Name */}
                      <td className="py-4 font-bold text-gray-900 dark:text-white">
                        {log.targetName}
                        {log.parentQuantity !== undefined && (
                          <span className="text-[10px] text-gray-400 font-mono block font-normal">Qty: x{log.parentQuantity}</span>
                        )}
                      </td>

                      {/* Details commentary text */}
                      <td className="py-4 text-xs text-gray-500 dark:text-slate-350 pr-4">
                        {log.details}
                      </td>

                      {/* Impacted Elements signed metrics summary */}
                      <td className="py-4 text-right pr-3 font-mono text-[11px] font-semibold whitespace-nowrap">
                        <div className="flex flex-col items-end gap-1">
                          {log.elementsImpacted.map((item, idx) => {
                            const isPositive = item.quantity > 0;
                            return (
                              <span 
                                key={idx} 
                                className={isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}
                              >
                                {item.elementName}: {isPositive ? '+' : ''}{item.quantity.toFixed(3).replace(/\.?0+$/, '')} {item.unit}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
