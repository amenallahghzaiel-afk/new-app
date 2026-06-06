/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppState, OutboundCategory, LedgerLog, Language } from '../types';
import { translations } from '../translations';
import { Layers, ShoppingBag, Trash2, Users, MinusCircle, Info, TrendingDown, ArrowDown, CheckSquare, Square, Search } from 'lucide-react';

interface OutboundPageProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState, description: string) => void;
}

interface BreakdownLine {
  elementId: string;
  elementName: string;
  totalQuantity: number;
  unit: string;
}

export default function OutboundPage({ state, updateState }: OutboundPageProps) {
  const t = translations[state.language];
  const isRTL = state.language === 'AR';

  // Outbound working mode
  const [outboundMode, setOutboundMode] = useState<'single' | 'batch'>('single');

  // Selection state
  const [targetType, setTargetType] = useState<'element' | 'item' | 'composed'>('element');
  const [selectedId, setSelectedId] = useState('');
  const [deductQty, setDeductQty] = useState<number>(0);
  const [category, setCategory] = useState<OutboundCategory>('Sold');
  const [customMsg, setCustomMsg] = useState('');

  // Single Outbound search state
  const [singleSearchQuery, setSingleSearchQuery] = useState('');
  const [singleIsOpen, setSingleIsOpen] = useState(false);

  // Batch selection state
  const [batchSearch, setBatchSearch] = useState('');
  const [batchCheckedIds, setBatchCheckedIds] = useState<string[]>([]);
  const [batchQuantities, setBatchQuantities] = useState<Record<string, number>>({});

  const getBatchLabel = (key: string) => {
    const lang = state.language;
    const labels: Record<string, Record<Language, string>> = {
      batchModeSingle: {
        EN: 'Single Item',
        FR: 'Déduction Unique',
        AR: 'خصم فردي'
      },
      batchModeBatch: {
        EN: 'Batch Removal',
        FR: 'Retrait en lot',
        AR: 'سحب كميات متعددة'
      },
      batchToolTitle: {
        EN: 'Batch Stock Depletion Tool',
        FR: 'Outil de retrait en lot',
        AR: 'أداة سحب المخزون المتعددة'
      },
      searchPlaceholder: {
        EN: 'Search raw ingredients...',
        FR: 'Rechercher des ingrédients...',
        AR: 'البحث في المواد الخام...'
      },
      noIngredientsFound: {
        EN: 'No ingredients matched search.',
        FR: 'Aucun ingrédient ne correspond.',
        AR: 'لا توجد مواد تطابق البحث.'
      },
      selectedCount: {
        EN: 'selected',
        FR: 'sélectionné(s)',
        AR: 'محدد'
      },
      selectAll: {
        EN: 'Select All',
        FR: 'Tout sélectionner',
        AR: 'تحديد الكل'
      },
      clearAll: {
        EN: 'Deselect All',
        FR: 'Tout désélectionner',
        AR: 'إلغاء تحديد الكل'
      },
      batchQtyHeader: {
        EN: 'Deduct Qty',
        FR: 'Qté à déduire',
        AR: 'الكمية المستهلكة'
      },
      batchSubmitBtn: {
        EN: 'Deduct & Register Batch',
        FR: 'Déduire et enregistrer le lot',
        AR: 'خصم وتسجيل الكميات'
      },
      batchSuccessMsg: {
        EN: 'Batch removal recorded. Master ledger has been updated.',
        FR: 'Retrait en lot enregistré. Le grand livre a été mis à jour.',
        AR: 'تم تسجيل السحب المتعدد وتحديث السجل العام بنجاح.'
      },
      emptyBatchAlert: {
        EN: 'Please select at least one ingredient and type a valid quantity.',
        FR: 'Veuillez sélectionner au moins un ingrédient et saisir une quantité valide.',
        AR: 'يرجى تحديد مادة واحدة على الأقل وإدخال كمية صحيحة.'
      }
    };
    return labels[key]?.[lang] || labels[key]?.['EN'] || '';
  };

  const handleToggleBatchElement = (id: string) => {
    if (batchCheckedIds.includes(id)) {
      setBatchCheckedIds(batchCheckedIds.filter((x) => x !== id));
      setBatchQuantities((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setBatchCheckedIds([...batchCheckedIds, id]);
    }
  };

  const handleBatchQtyChange = (id: string, rawVal: string) => {
    const num = parseFloat(rawVal);
    const validNum = isNaN(num) ? 0 : num;
    setBatchQuantities((prev) => ({ ...prev, [id]: validNum }));
    if (validNum > 0 && !batchCheckedIds.includes(id)) {
      setBatchCheckedIds((prev) => [...prev, id]);
    }
  };

  const handleDeductBatch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const activeImpacts = state.elements
      .filter((el) => batchCheckedIds.includes(el.id) && (batchQuantities[el.id] || 0) > 0)
      .map((el) => ({
        elementId: el.id,
        elementName: el.name,
        quantity: batchQuantities[el.id] || 0,
        unit: el.unit
      }));

    if (activeImpacts.length === 0) {
      alert(getBatchLabel('emptyBatchAlert'));
      return;
    }

    // Map Action Type
    let actType: 'sold' | 'waste' | 'staff_meal' = 'sold';
    if (category === 'Waste/Spoiled') actType = 'waste';
    if (category === 'Staff Meal') actType = 'staff_meal';

    const count = activeImpacts.length;
    const itemsDescription = activeImpacts.map(i => `${i.elementName} (${i.quantity} ${i.unit})`).join(', ');
    const descriptionReason = category === 'Sold' ? 'Sold' : (category === 'Waste/Spoiled' ? 'Waste' : 'Staff Meal');
    const briefDescription = customMsg.trim() || `Batch deduction of ${count} ingredients (${itemsDescription}) categorized as ${descriptionReason}.`;

    const newLog: LedgerLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Outbound',
      actionType: actType,
      targetName: `Batch: ${count} Ingredients`,
      parentQuantity: count,
      details: briefDescription,
      elementsImpacted: activeImpacts.map((i) => ({
        elementId: i.elementId,
        elementName: i.elementName,
        quantity: -i.quantity, // Negative for deduction
        unit: i.unit,
      })),
    };

    updateState((prev) => {
      const updatedElements = prev.elements.map((el) => {
        const impact = activeImpacts.find((b) => b.elementId === el.id);
        if (impact) {
          return { ...el, currentStock: el.currentStock - impact.quantity };
        }
        return el;
      });

      return {
        ...prev,
        elements: updatedElements,
        logs: [newLog, ...prev.logs],
      };
    }, `Batch outbound stock deduction: ${count} ingredients for ${category}`);

    // clear inputs
    setBatchQuantities({});
    setBatchCheckedIds([]);
    setCustomMsg('');
    alert(getBatchLabel('batchSuccessMsg'));
  };

  // Auto-fill default ID on type change and keep search query in sync
  useEffect(() => {
    if (!singleIsOpen) {
      if (targetType === 'element') {
        const item = state.elements.find((el) => el.id === selectedId) || state.elements[0];
        setSelectedId(item?.id || '');
        setSingleSearchQuery(item ? item.name : '');
      } else if (targetType === 'item') {
        const item = state.items.find((it) => it.id === selectedId) || state.items[0];
        setSelectedId(item?.id || '');
        setSingleSearchQuery(item ? item.name : '');
      } else if (targetType === 'composed') {
        const item = state.composed.find((c) => c.id === selectedId) || state.composed[0];
        setSelectedId(item?.id || '');
        setSingleSearchQuery(item ? item.name : '');
      }
    }
  }, [targetType, selectedId, state.elements, state.items, state.composed, singleIsOpen]);

  // Outbound filter logs
  const outboundLogs = state.logs.filter((log) => log.type === 'Outbound');

  // Compute the live preview reverse-engineered ingredient breakdown
  const computeBreakdown = (): BreakdownLine[] => {
    if (deductQty <= 0 || !selectedId) return [];

    const lines: Record<string, { name: string; quantity: number; unit: string }> = {};

    if (targetType === 'element') {
      const match = state.elements.find((el) => el.id === selectedId);
      if (match) {
        lines[match.id] = { name: match.name, quantity: deductQty, unit: match.unit };
      }
    } else if (targetType === 'item') {
      const recipe = state.items.find((itm) => itm.id === selectedId);
      if (recipe) {
        recipe.elements.forEach((ing) => {
          const rawEl = state.elements.find((e) => e.id === ing.elementId);
          if (rawEl) {
            const reqQty = ing.quantity * deductQty;
            if (!lines[rawEl.id]) {
              lines[rawEl.id] = { name: rawEl.name, quantity: 0, unit: rawEl.unit };
            }
            lines[rawEl.id].quantity += reqQty;
          }
        });
      }
    } else if (targetType === 'composed') {
      const combo = state.composed.find((c) => c.id === selectedId);
      if (combo) {
        combo.items.forEach((cItem) => {
          const recipe = state.items.find((it) => it.id === cItem.itemId);
          if (recipe) {
            const recipeTotalMultiplier = cItem.quantity * deductQty;
            recipe.elements.forEach((ing) => {
              const rawEl = state.elements.find((e) => e.id === ing.elementId);
              if (rawEl) {
                const reqQty = ing.quantity * recipeTotalMultiplier;
                if (!lines[rawEl.id]) {
                  lines[rawEl.id] = { name: rawEl.name, quantity: 0, unit: rawEl.unit };
                }
                lines[rawEl.id].quantity += reqQty;
              }
            });
          }
        });
      }
    }

    return Object.entries(lines).map(([id, val]) => ({
      elementId: id,
      elementName: val.name,
      totalQuantity: val.quantity,
      unit: val.unit,
    }));
  };

  const breakdownPreview = computeBreakdown();

  // Deduct outbound stock
  const handleDeductInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || deductQty <= 0 || breakdownPreview.length === 0) return;

    let targetName = 'Unknown Target';
    if (targetType === 'element') {
      targetName = state.elements.find((el) => el.id === selectedId)?.name || '';
    } else if (targetType === 'item') {
      targetName = state.items.find((it) => it.id === selectedId)?.name || '';
    } else if (targetType === 'composed') {
      targetName = state.composed.find((c) => c.id === selectedId)?.name || '';
    }

    // Map Action Type
    let actType: 'sold' | 'waste' | 'staff_meal' = 'sold';
    if (category === 'Waste/Spoiled') actType = 'waste';
    if (category === 'Staff Meal') actType = 'staff_meal';

    // Build the LedgerLog record
    const descriptionReason = category === 'Sold' ? 'Sold' : (category === 'Waste/Spoiled' ? 'Waste' : 'Staff Meal');
    const briefDescription = customMsg.trim() || `Deducted ${deductQty} units of "${targetName}" categorized as ${descriptionReason}.`;

    const newLog: LedgerLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Outbound',
      actionType: actType,
      targetName,
      parentQuantity: deductQty,
      details: briefDescription,
      elementsImpacted: breakdownPreview.map((line) => ({
        elementId: line.elementId,
        elementName: line.elementName,
        quantity: -line.totalQuantity, // Negative showing deduction
        unit: line.unit,
      })),
    };

    updateState((prev) => {
      // Loop elements and decrement
      const updatedElements = prev.elements.map((el) => {
        const impact = breakdownPreview.find((b) => b.elementId === el.id);
        if (impact) {
          return { ...el, currentStock: el.currentStock - impact.totalQuantity };
        }
        return el;
      });

      return {
        ...prev,
        elements: updatedElements,
        logs: [newLog, ...prev.logs],
      };
    }, `Outbound stock deduction: ${deductQty} of ${targetName} for ${category}`);

    // clear inputs
    setDeductQty(0);
    setCustomMsg('');
    alert(t.deductSuccess);
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} id="outbound-page-root">
      
      {/* Page Title */}
      <div className="border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {t.outboundTitle}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Deduct ingredients from physical warehouse balances. Outbound depletions recursively breakdown recipe components instantly.
        </p>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Outbound entry form with formula breakdown preview */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="text-red-500" size={18} />
            {outboundMode === 'batch' ? getBatchLabel('batchToolTitle') : 'Stock Depletion Tool'}
          </h3>

          {/* Mode switch tab bar */}
          <div className="flex bg-gray-50 dark:bg-slate-850 p-1 rounded-xl border border-gray-150 dark:border-slate-800/80">
            <button
              type="button"
              id="outbound-mode-single-btn"
              onClick={() => setOutboundMode('single')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                outboundMode === 'single'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-350'
              }`}
            >
              {getBatchLabel('batchModeSingle')}
            </button>
            <button
              type="button"
              id="outbound-mode-batch-btn"
              onClick={() => setOutboundMode('batch')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                outboundMode === 'batch'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-350'
              }`}
            >
              {getBatchLabel('batchModeBatch')}
            </button>
          </div>

          {outboundMode === 'single' ? (
            <form onSubmit={handleDeductInventory} className="space-y-4">
              
              {/* Action categorization reason */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="deduction-category">
                  {t.deductionType}
                </label>
                <select
                  id="deduction-category"
                  className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as OutboundCategory)}
                >
                  <option value="Sold">{t.reasonSold}</option>
                  <option value="Waste/Spoiled">{t.reasonWaste}</option>
                  <option value="Staff Meal">{t.reasonStaff}</option>
                </select>
              </div>

              {/* Target Catalog Tier */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-slate-850 p-1 rounded-lg border border-gray-150 dark:border-slate-800/80">
                <button
                  type="button"
                  id="tab-target-element"
                  onClick={() => setTargetType('element')}
                  className={`py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    targetType === 'element'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  Ingredient
                </button>
                <button
                  type="button"
                  id="tab-target-item"
                  onClick={() => setTargetType('item')}
                  className={`py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    targetType === 'item'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  Recipe
                </button>
                <button
                  type="button"
                  id="tab-target-composed"
                  onClick={() => setTargetType('composed')}
                  className={`py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    targetType === 'composed'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  Combo Meal
                </button>
              </div>

              {/* Select specific target dropdown */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="select-outbound-target">
                  {t.selectProduct}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="select-outbound-target"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white placeholder-gray-400 focus:outline-none focus:border-red-650"
                    placeholder={`Type to search item...`}
                    value={singleSearchQuery}
                    onFocus={() => setSingleIsOpen(true)}
                    onBlur={() => setTimeout(() => setSingleIsOpen(false), 200)} // Allow click to execute first
                    onChange={(e) => {
                      setSingleSearchQuery(e.target.value);
                      setSingleIsOpen(true);
                    }}
                  />
                  <Search size={14} className="absolute right-3.5 top-3.5 text-gray-400 pointer-events-none" />
                </div>

                {/* Dropdown list of filtered/closest options */}
                {singleIsOpen && (
                  <div className="absolute z-50 left-0 right-0 top-[100%] mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xl divide-y divide-gray-100 dark:divide-slate-800/80 animate-in fade-in slide-in-from-top-1.5 duration-150">
                    
                    {targetType === 'element' && state.elements
                      .filter((el) => el.name.toLowerCase().includes(singleSearchQuery.toLowerCase()))
                      .map((el) => (
                        <button
                          key={el.id}
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-800 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors flex items-center justify-between"
                          onMouseDown={() => {
                            setSelectedId(el.id);
                            setSingleSearchQuery(el.name);
                            setSingleIsOpen(false);
                          }}
                        >
                          <span className="truncate">{el.name}</span>
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-150/50 dark:bg-slate-900 px-1.5 py-0.5 rounded ml-2 shrink-0">
                            {el.currentStock.toFixed(2)} {el.unit}
                          </span>
                        </button>
                      ))}

                    {targetType === 'item' && state.items
                      .filter((it) => it.name.toLowerCase().includes(singleSearchQuery.toLowerCase()))
                      .map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-800 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors flex items-center justify-between"
                          onMouseDown={() => {
                            setSelectedId(it.id);
                            setSingleSearchQuery(it.name);
                            setSingleIsOpen(false);
                          }}
                        >
                          <span className="truncate">{it.name}</span>
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-150/50 dark:bg-slate-900 px-1.5 py-0.5 rounded ml-2 shrink-0">
                            {it.elements.length} components
                          </span>
                        </button>
                      ))}

                    {targetType === 'composed' && state.composed
                      .filter((it) => it.name.toLowerCase().includes(singleSearchQuery.toLowerCase()))
                      .map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-800 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors flex items-center justify-between"
                          onMouseDown={() => {
                            setSelectedId(it.id);
                            setSingleSearchQuery(it.name);
                            setSingleIsOpen(false);
                          }}
                        >
                          <span className="truncate">{it.name}</span>
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-150/50 dark:bg-slate-900 px-1.5 py-0.5 rounded ml-2 shrink-0">
                            {it.items.length} items
                          </span>
                        </button>
                      ))}

                    {/* Fallback empty message */}
                    {((targetType === 'element' && state.elements.filter((el) => el.name.toLowerCase().includes(singleSearchQuery.toLowerCase())).length === 0) ||
                      (targetType === 'item' && state.items.filter((it) => it.name.toLowerCase().includes(singleSearchQuery.toLowerCase())).length === 0) ||
                      (targetType === 'composed' && state.composed.filter((it) => it.name.toLowerCase().includes(singleSearchQuery.toLowerCase())).length === 0)) && (
                      <div className="p-3 text-[11px] text-gray-400 text-center italic">
                        No matches found
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Outbound quantity output */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="deduct-qty-input">
                  {t.quantityToDeduct}
                </label>
                <input
                  type="number"
                  id="deduct-qty-input"
                  required
                  min="0.01"
                  step="any"
                  className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder="0.00"
                  value={deductQty || ''}
                  onChange={(e) => setDeductQty(parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Optional deduction notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="outbound-notes">
                  Observations Notes
                </label>
                <input
                  type="text"
                  id="outbound-notes"
                  className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder="e.g. Returned container, damaged label..."
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                />
              </div>

              {/* Live Auto-reverse breakdown recipe visualization */}
              {breakdownPreview.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg dark:bg-slate-850 dark:bg-slate-800/40 border border-gray-150 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider block">
                    {t.recipeUsed}
                  </span>

                  <div className="space-y-1.5">
                    {breakdownPreview.map((line) => {
                      const originalRaw = state.elements.find((el) => el.id === line.elementId);
                      const isBelowAfter = originalRaw ? (originalRaw.currentStock - line.totalQuantity) < originalRaw.alertThreshold : false;

                      return (
                        <div key={line.elementId} className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 dark:text-slate-300 font-medium">
                            {line.elementName}
                          </span>
                          <span className={`font-mono font-bold ${isBelowAfter ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                            -{line.totalQuantity.toFixed(3).replace(/\.?0+$/, '')} {line.unit}
                            {isBelowAfter && ' (Alert Level Qty!)'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                id="deduct-action-btn"
                disabled={deductQty <= 0 || !selectedId}
                className="w-full py-2.5 bg-red-650 hover:bg-red-700 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowDown size={16} />
                Deduct & Register Outbound
              </button>
            </form>
          ) : (
            <form onSubmit={handleDeductBatch} className="space-y-4 animate-in fade-in duration-200">
              
              {/* Action categorization reason */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="batch-deduction-category">
                  {t.deductionType}
                </label>
                <select
                  id="batch-deduction-category"
                  className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as OutboundCategory)}
                >
                  <option value="Sold">{t.reasonSold}</option>
                  <option value="Waste/Spoiled">{t.reasonWaste}</option>
                  <option value="Staff Meal">{t.reasonStaff}</option>
                </select>
              </div>

              {/* Elements Selection list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                    {t.elementsTab}
                  </label>
                  {batchCheckedIds.length > 0 && (
                    <span className="text-[10px] font-bold bg-red-50 border border-red-200 text-red-600 px-1.5 py-0.5 rounded dark:border-red-950 dark:bg-red-950/20 dark:text-red-400">
                      {batchCheckedIds.length} {getBatchLabel('selectedCount')}
                    </span>
                  )}
                </div>

                {/* Batch ingredient search */}
                <div className="relative">
                  <input
                    type="text"
                    id="batch-element-search"
                    className={`w-full ${isRTL ? 'pl-3 pr-8' : 'pl-8 pr-3'} py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-red-650 dark:bg-slate-800 dark:border-slate-700 dark:text-white`}
                    placeholder={getBatchLabel('searchPlaceholder')}
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                  />
                  <Search size={12} className={`absolute ${isRTL ? 'right-2.5' : 'left-2.5'} top-2.5 text-gray-400`} />
                </div>

                {/* Select All / Deselect All Toolbar */}
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <button
                    type="button"
                    onClick={() => {
                      const filteredIds = state.elements
                        .filter((el) => el.name.toLowerCase().includes(batchSearch.toLowerCase()))
                        .map((el) => el.id);
                      setBatchCheckedIds(Array.from(new Set([...batchCheckedIds, ...filteredIds])));
                    }}
                    className="hover:text-red-600 dark:hover:text-red-400 font-semibold cursor-pointer transition-colors"
                  >
                    + {getBatchLabel('selectAll')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const filteredIds = state.elements
                        .filter((el) => el.name.toLowerCase().includes(batchSearch.toLowerCase()))
                        .map((el) => el.id);
                      setBatchCheckedIds(batchCheckedIds.filter((id) => !filteredIds.includes(id)));
                      setBatchQuantities((prev) => {
                        const copy = { ...prev };
                        filteredIds.forEach((id) => delete copy[id]);
                        return copy;
                      });
                    }}
                    className="hover:text-red-600 dark:hover:text-red-400 font-semibold cursor-pointer transition-colors"
                  >
                    - {getBatchLabel('clearAll')}
                  </button>
                </div>

                {/* Ingredients scroll pane */}
                <div className="max-h-[280px] overflow-y-auto border border-gray-200 dark:border-slate-800 rounded-lg p-2 space-y-1 bg-gray-50/50 dark:bg-slate-900/50">
                  {state.elements
                    .filter((el) => el.name.toLowerCase().includes(batchSearch.toLowerCase()))
                    .map((el) => {
                      const isChecked = batchCheckedIds.includes(el.id);
                      const currentQty = batchQuantities[el.id] !== undefined && batchQuantities[el.id] > 0 ? batchQuantities[el.id] : '';
                      const isMinusAlert = (el.currentStock - (Number(currentQty) || 0)) < el.alertThreshold;

                      return (
                        <div 
                          key={el.id}
                          className={`flex items-center justify-between p-2 rounded-md border text-xs gap-2 transition-all ${
                            isChecked 
                              ? 'bg-red-50/20 dark:bg-red-950/5 border-red-200 dark:border-red-900/40 shadow-sm' 
                              : 'bg-white dark:bg-slate-850 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-150 dark:border-slate-800'
                          }`}
                        >
                          {/* Checkbox + Name */}
                          <div className="flex items-center gap-2 text-left flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleBatchElement(el.id)}
                              className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-450 cursor-pointer shrink-0"
                            >
                              {isChecked ? (
                                <CheckSquare size={14} className="text-red-600 dark:text-red-400 inline" />
                              ) : (
                                <Square size={14} className="inline" />
                              )}
                            </button>
                            <div className="truncate">
                              <span className="font-bold text-gray-900 dark:text-white block truncate">
                                {el.name}
                              </span>
                              <span className={`text-[10px] font-mono block ${isMinusAlert && isChecked ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-gray-400'}`}>
                                {t.currentStock}: {el.currentStock.toFixed(2)} {el.unit}
                                {isChecked && Number(currentQty) > 0 && ` → ${(el.currentStock - Number(currentQty)).toFixed(2)}`}
                              </span>
                            </div>
                          </div>

                          {/* Deduction Qty input */}
                          <div className="flex items-center gap-1 shrink-0 w-24">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={currentQty}
                              onChange={(e) => handleBatchQtyChange(el.id, e.target.value)}
                              placeholder="0.00"
                              className={`w-full px-2 py-1 text-right font-mono text-xs border rounded-md focus:outline-none focus:border-red-600 ${
                                isChecked 
                                  ? 'bg-white border-red-305 text-gray-900 dark:bg-slate-900 dark:border-red-900 dark:text-white font-bold' 
                                  : 'bg-white border-gray-200 text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white'
                              }`}
                            />
                            <span className="text-[10px] text-gray-400 w-5 font-mono">
                              {el.unit}
                            </span>
                          </div>

                        </div>
                      );
                    })}

                  {state.elements.filter((el) => el.name.toLowerCase().includes(batchSearch.toLowerCase())).length === 0 && (
                    <div className="py-8 text-center text-xs text-gray-400">
                      {getBatchLabel('noIngredientsFound')}
                    </div>
                  )}
                </div>
              </div>

              {/* Optional custom notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="batch-outbound-notes">
                  Observations Notes
                </label>
                <input
                  type="text"
                  id="batch-outbound-notes"
                  className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder="e.g. Bulk depletion for events..."
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                />
              </div>

              {/* Submit btn */}
              <button
                type="submit"
                id="batch-deduct-action-btn"
                disabled={batchCheckedIds.length === 0}
                className="w-full py-2.5 bg-red-650 hover:bg-red-700 bg-red-600 hover:bg-red-700 disabled:bg-slate-350 dark:disabled:bg-slate-850 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowDown size={16} />
                {getBatchLabel('batchSubmitBtn')}
              </button>

            </form>
          )}
        </div>

        {/* Right Side: Ledger deceptions categorized logs */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 lg:col-span-2 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {t.outboundTitleLabel}
          </h3>

          {outboundLogs.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-slate-400 text-sm">
              <ShoppingBag size={32} className="mx-auto mb-2 text-gray-400 dark:text-slate-500" />
              No outbound deductions reported today. Log customer checkouts or spills.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {outboundLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-xl border border-gray-150 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-850/40 relative">
                  
                  <div className="flex items-start justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-gray-900 dark:text-white">{log.targetName}</h4>
                        <span className="text-xs font-mono text-gray-500 dark:text-slate-400">({log.parentQuantity} standard unit)</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{log.details}</p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {log.actionType === 'sold' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/20 dark:text-green-400">
                          <ShoppingBag size={10} /> {t.reasonSold}
                        </span>
                      )}
                      {log.actionType === 'waste' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400">
                          <Trash2 size={10} /> {t.reasonWaste}
                        </span>
                      )}
                      {log.actionType === 'staff_meal' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400">
                          <Users size={10} /> {t.reasonStaff}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Impact list */}
                  <div className="mt-3 border-t border-dashed border-gray-200 dark:border-slate-700 pt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {log.elementsImpacted.map((item, id) => (
                      <span key={id} className="text-xs font-mono text-gray-500 dark:text-slate-400">
                        {item.elementName}: <strong className="text-red-600 dark:text-red-400">{item.quantity} {item.unit}</strong>
                      </span>
                    ))}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
