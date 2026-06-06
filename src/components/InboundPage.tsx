/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, LedgerLog } from '../types';
import { translations } from '../translations';
import { Truck, CheckSquare, Square, Printer, Download, ChevronRight, ListPlus, Trash, RotateCcw, Search } from 'lucide-react';

interface InboundPageProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState, description: string) => void;
  triggerPrint: (type: 'inbound' | 'outbound' | 'balance' | 'register' | 'discrepancy', selectedLogIds?: string[]) => void;
}

export default function InboundPage({ state, updateState, triggerPrint }: InboundPageProps) {
  const t = translations[state.language];
  const isRTL = state.language === 'AR';

  const [selectedElementId, setSelectedElementId] = useState(state.elements[0]?.id || '');
  const [receivedQty, setReceivedQty] = useState<number>(0);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Live Ingredient Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Selected logs checklist state
  const [checkedLogIds, setCheckedLogIds] = useState<string[]>([]);

  // Sync search query overlay with current selected element, unless user is typing manually
  React.useEffect(() => {
    // Only automatically sync if dropdown is closed
    if (!isOpen) {
      const active = state.elements.find((e) => e.id === selectedElementId);
      if (active) {
        setSearchQuery(active.name);
      }
    }
  }, [selectedElementId, state.elements, isOpen]);

  // Filter logs to Inbound deliveries only
  const inboundLogs = state.logs.filter((log) => log.type === 'Inbound');

  // Master checkbox selection
  const handleSelectAll = () => {
    if (checkedLogIds.length === inboundLogs.length) {
      setCheckedLogIds([]); // clear
    } else {
      setCheckedLogIds(inboundLogs.map((log) => log.id)); // select all
    }
  };

  const toggleLogCheckbox = (id: string) => {
    if (checkedLogIds.includes(id)) {
      setCheckedLogIds(checkedLogIds.filter((x) => x !== id));
    } else {
      setCheckedLogIds([...checkedLogIds, id]);
    }
  };

  // Log Delivery
  const handleLogDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElementId || receivedQty <= 0) return;

    const matchedElement = state.elements.find((el) => el.id === selectedElementId);
    if (!matchedElement) return;

    const newLog: LedgerLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Inbound',
      actionType: 'delivery',
      targetName: matchedElement.name,
      details: deliveryNotes.trim() || 'Inbound stock shipment logged.',
      elementsImpacted: [
        {
          elementId: matchedElement.id,
          elementName: matchedElement.name,
          quantity: receivedQty,
          unit: matchedElement.unit,
        },
      ],
    };

    updateState((prev) => {
      // update stock level of elements
      const updatedElements = prev.elements.map((el) => {
        if (el.id === selectedElementId) {
          return { ...el, currentStock: el.currentStock + receivedQty };
        }
        return el;
      });

      return {
        ...prev,
        elements: updatedElements,
        logs: [newLog, ...prev.logs],
      };
    }, `Added stock shipment: Received ${receivedQty} ${matchedElement.unit} of ${matchedElement.name}`);

    // clear fields
    setReceivedQty(0);
    setDeliveryNotes('');
  };

  // CSV Exporter for selected logs
  const handleExportCsv = () => {
    const logsToExport = inboundLogs.filter((l) =>
      checkedLogIds.length > 0 ? checkedLogIds.includes(l.id) : true
    );

    if (logsToExport.length === 0) {
      alert('No inbound logs exist to export.');
      return;
    }

    // CSV structure header
    let csvContent = 'data:text/csv;charset=utf-8,Date,Ingredient,Quantity,Unit,Notes\n';

    logsToExport.forEach((log) => {
      const dateFormatted = new Date(log.timestamp).toLocaleString();
      const firstImpact = log.elementsImpacted[0];
      const ingredientName = firstImpact ? firstImpact.elementName : log.targetName;
      const qtyLogged = firstImpact ? firstImpact.quantity : 0;
      const unit = firstImpact ? firstImpact.unit : '';
      const notesClean = log.details.replace(/"/g, '""');

      csvContent += `"${dateFormatted}","${ingredientName}",${qtyLogged},"${unit}","${notesClean}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', `delivery_manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Trigger print engine for selected deliveries
  const handlePrintA4 = () => {
    const effectiveIds = checkedLogIds.length > 0 ? checkedLogIds : inboundLogs.map((l) => l.id);
    if (effectiveIds.length === 0) {
      alert('No logs selected or available to print.');
      return;
    }
    triggerPrint('inbound', effectiveIds);
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} id="inbound-page-root">
      
      {/* Page Title */}
      <div className="border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {t.inboundTitle}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Receive newly delivered ingredients, add them directly to physical stocks, and document digital manifest receipts.
        </p>
      </div>

      {/* Grid: Delivery form vs Recent Inbound entries with Print Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Delivery form */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="text-green-600 dark:text-green-400" size={18} />
            Incoming Delivery Form
          </h3>

          {state.elements.length === 0 ? (
            <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-lg dark:bg-amber-950/20 dark:text-amber-400">
              No raw ingredients defined. Go to <strong>Menu Recipes</strong> to add elements first.
            </div>
          ) : (
            <form onSubmit={handleLogDelivery} className="space-y-4">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="select-element-inbound">
                  {t.selectElement}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="select-element-inbound"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-600"
                    placeholder="Type to search raw ingredient..."
                    value={searchQuery}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Allow click to execute first
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsOpen(true);
                    }}
                  />
                  <Search size={14} className="absolute right-3.5 top-3.5 text-gray-400 pointer-events-none" />
                </div>

                {/* Dropdown list of closest matching elements */}
                {isOpen && (
                  <div className="absolute z-50 left-0 right-0 top-[100%] mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xl divide-y divide-gray-100 dark:divide-slate-800/80 animate-in fade-in slide-in-from-top-1.5 duration-150">
                    {state.elements
                      .filter((el) => el.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((el) => (
                        <button
                          key={el.id}
                          type="button"
                          className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-green-50 hover:text-green-800 dark:hover:bg-green-950/20 dark:hover:text-green-400 transition-colors flex items-center justify-between"
                          onMouseDown={() => {
                            setSelectedElementId(el.id);
                            setSearchQuery(el.name);
                            setIsOpen(false);
                          }}
                        >
                          <span className="truncate">{el.name}</span>
                          <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-150/50 dark:bg-slate-900 px-1.5 py-0.5 rounded ml-2 shrink-0">
                            {el.unit}
                          </span>
                        </button>
                      ))}
                    {state.elements.filter((el) => el.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <div className="p-3 text-[11px] text-gray-400 text-center italic">
                        No matches found
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="received-quantity">
                  {t.receivedQty}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    id="received-quantity"
                    required
                    min="0.001"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="0.00"
                    value={receivedQty || ''}
                    onChange={(e) => setReceivedQty(parseFloat(e.target.value) || 0)}
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-gray-550 dark:text-slate-405 text-gray-500 dark:text-slate-400">
                    {state.elements.find((el) => el.id === selectedElementId)?.unit || 'kg'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="delivery-notes">
                  {t.notes}
                </label>
                <textarea
                  id="delivery-notes"
                  className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none h-24"
                  placeholder="Carrier tracking numbers, farm source, batch details..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                id="log-delivery-btn"
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ListPlus size={16} />
                {t.logDelivery}
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Recent Inbound Table and controls */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t.recentDeliveries}
            </h3>

            {/* Print Selection buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                id="inbound-export-csv-btn"
                onClick={handleExportCsv}
                className="px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                <Download size={14} />
                {t.exportCsv}
              </button>
              <button
                type="button"
                id="inbound-print-a4-btn"
                onClick={handlePrintA4}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Printer size={14} />
                {t.printA4}
              </button>
            </div>
          </div>

          {inboundLogs.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-slate-400 text-sm">
              <Truck size={32} className="mx-auto mb-2 text-gray-400 dark:text-slate-500" />
              No delivery shipments logged in system. Fill the form to log deliveries.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="inbound-manifest-table" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-800 text-left text-xs text-gray-500 dark:text-slate-400 font-semibold selection-row bg-slate-50/50 dark:bg-slate-850/20">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <button
                        type="button"
                        id="inbound-select-all-btn"
                        onClick={handleSelectAll}
                        className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-400 cursor-pointer"
                        title={t.selectAll}
                      >
                        {checkedLogIds.length === inboundLogs.length ? (
                          <CheckSquare size={16} className="text-green-600 dark:text-green-400 inline" />
                        ) : (
                          <Square size={16} className="inline" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 pr-2">Date/Time</th>
                    <th className="py-2.5">Raw Ingredient</th>
                    <th className="py-2.5 text-right">Quantity</th>
                    <th className="py-2.5 px-2">Delivery Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {inboundLogs.map((log) => {
                    const isChecked = checkedLogIds.includes(log.id);
                    const impactItem = log.elementsImpacted[0];
                    return (
                      <tr 
                        key={log.id} 
                        className={`hover:bg-gray-50/50 dark:hover:bg-slate-850/20 transition-colors ${isChecked ? 'bg-green-50/20 dark:bg-green-950/5' : ''}`}
                      >
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            id={`inbound-checkbox-${log.id}`}
                            onClick={() => toggleLogCheckbox(log.id)}
                            className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-400 cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare size={16} className="text-green-600 dark:text-green-400 inline" />
                            ) : (
                              <Square size={16} className="inline" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 pr-2 text-xs font-medium text-gray-500 dark:text-slate-400">
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 font-semibold text-gray-900 dark:text-white">
                          {log.targetName}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{impactItem ? impactItem.quantity : 0} {impactItem ? impactItem.unit : ''}
                        </td>
                        <td className="py-3 px-2 text-xs text-gray-500 dark:text-slate-400 max-w-xs truncate" title={log.details}>
                          {log.details}
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
    </div>
  );
}
