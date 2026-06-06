/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, ElementEntity, Language } from '../types';
import { translations } from '../translations';
import { ShieldCheck, ShieldAlert, CheckSquare, Square, Printer, Download, Filter, Search, AlertTriangle, TrendingDown, Layers, Utensils } from 'lucide-react';

interface LiveBalancePageProps {
  state: AppState;
  triggerPrint: (type: 'inbound' | 'outbound' | 'balance' | 'register' | 'discrepancy', selectedElementIds?: string[]) => void;
}

export default function LiveBalancePage({ state, triggerPrint }: LiveBalancePageProps) {
  const t = translations[state.language];
  const isRTL = state.language === 'AR';

  // Filters state
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected element item keys state
  const [checkedElementIds, setCheckedElementIds] = useState<string[]>([]);

  // Filter elements list
  const filteredElements = state.elements.filter((el) => {
    const matchesSearch = el.name.toLowerCase().includes(searchQuery.toLowerCase());
    const belowThreshold = el.currentStock < el.alertThreshold;
    return matchesSearch && (showLowStockOnly ? belowThreshold : true);
  });

  // 1. Local translations helper for the Dependent Alerts Dashboard
  const getAlertsLabel = (key: string): string => {
    const lang = state.language;
    const labels: Record<string, Record<Language, string>> = {
      dashboardTitle: {
        EN: 'Dependent Recipes & Portions Ceilings',
        FR: 'Assemblage des Recettes & Seuil de Portions',
        AR: 'اعتمادات وصفات الطعام والحد الأقصى للوجبات'
      },
      dashboardSubtitle: {
        EN: 'Analyzes live recipe dependencies to pinpoint raw ingredient bottlenecks and serving ceilings.',
        FR: 'Analyse les dépendances de recettes pour identifier les goulots d\'étranglement et seils de portions.',
        AR: 'يحلل ارتباط المواد الخام بالوصفات للكشف المباشر عن نقاط الاختناق في التوريد.'
      },
      recipesRisk: {
        EN: 'Impacted Recipes:',
        FR: 'Recettes Atteintes :',
        AR: 'الوصفات والوجبات المستهدفة بالخطر:'
      },
      bottleneckHeader: {
        EN: 'Recipe Portions Ceiling Limits',
        FR: 'Plafond Estimé des Recettes',
        AR: 'الحد الأقصى لإنتاج وصفات الطعام'
      },
      combosHeader: {
        EN: 'Combo Meals Yield Potential',
        FR: 'Rendement des Formules Composées',
        AR: 'أقصى مبيعات للوجبات المركبة (العروض)'
      },
      servingsSuffix: {
        EN: 'servings ready to make',
        FR: 'portions prêtes',
        AR: 'طبق أو وجبة جاهزة فورا'
      },
      limitingFactor: {
        EN: 'Limiting Factor:',
        FR: 'Ingrédient Limitant :',
        AR: 'المادة المسببة للعجز:'
      },
      requiredPerServing: {
        EN: 'required per serving',
        FR: 'requis par portion',
        AR: 'مطلوب للوجبة المحددة'
      },
      inStock: {
        EN: 'in stock',
        FR: 'en stock',
        AR: 'متوفر بالرفوف'
      },
      unlimited: {
        EN: 'Unlimited (No raw ingredients linked)',
        FR: 'Illimité (aucun ingrédient lié)',
        AR: 'غير محدود (لا توجد مواد خام مرتبطة بالوصفة)'
      },
      criticalDepleted: {
        EN: 'DEPLETED - INOPERABLE',
        FR: 'ÉPUISÉ - EN PANNE',
        AR: 'منتهية تماماً - غير متوفر للبيع'
      },
      none: {
        EN: 'None',
        FR: 'Aucun',
        AR: 'لا يوجد'
      },
      noDataAlerts: {
        EN: 'Calculated health is green! All recipe thresholds have adequate safety margins.',
        FR: 'État sanitaire optimal ! Toutes les recettes ont des marges suffisantes.',
        AR: 'الحالة ممتازة! جميع الوصفات تتمتع بهامش أمان كافٍ.'
      }
    };
    return labels[key]?.[lang] || labels[key]?.['EN'] || '';
  };

  // 2. Calculate maximum servings possible for all recipes dynamically based on ingredient stocks
  const calculatedRecipes = state.items.map((item) => {
    let maxServings = Infinity;
    let bottleneckElement = '';
    let bottleneckRequired = 0;
    let bottleneckAvailable = 0;
    let elUnit = '';

    if (!item.elements || item.elements.length === 0) {
      return {
        id: item.id,
        name: item.name,
        maxServings: Infinity,
        bottleneckElement: '',
        bottleneckRequired: 0,
        bottleneckAvailable: 0,
        unit: ''
      };
    }

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
        // Linked ingredient doesn't exist anymore
        maxServings = 0;
        bottleneckElement = 'Unknown Ingredient';
      }
    });

    return {
      id: item.id,
      name: item.name,
      maxServings: maxServings === Infinity ? 0 : Math.floor(maxServings),
      bottleneckElement,
      bottleneckRequired,
      bottleneckAvailable,
      unit: elUnit
    };
  });

  // 3. Calculate maximum servings possible for Combo Meals
  const calculatedCombos = state.composed.map((combo) => {
    let maxServings = Infinity;
    let bottleneckRecipeName = '';

    if (!combo.items || combo.items.length === 0) {
      return {
        id: combo.id,
        name: combo.name,
        maxServings: Infinity,
        bottleneckRecipeName: ''
      };
    }

    combo.items.forEach((ci) => {
      const recipeCalc = calculatedRecipes.find((r) => r.id === ci.itemId);
      if (recipeCalc) {
        const potential = recipeCalc.maxServings / ci.quantity;
        if (potential < maxServings) {
          maxServings = potential;
          bottleneckRecipeName = recipeCalc.name;
        }
      } else {
        maxServings = 0;
        bottleneckRecipeName = 'Unknown Recipe';
      }
    });

    return {
      id: combo.id,
      name: combo.name,
      maxServings: maxServings === Infinity ? 0 : Math.floor(maxServings),
      bottleneckRecipeName
    };
  });

  // Toggle selection
  const handleSelectAll = () => {
    if (checkedElementIds.length === filteredElements.length) {
      setCheckedElementIds([]);
    } else {
      setCheckedElementIds(filteredElements.map((el) => el.id));
    }
  };

  const toggleElementSelected = (id: string) => {
    if (checkedElementIds.includes(id)) {
      setCheckedElementIds(checkedElementIds.filter((x) => x !== id));
    } else {
      setCheckedElementIds([...checkedElementIds, id]);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const listToExport = filteredElements.filter((el) =>
      checkedElementIds.length > 0 ? checkedElementIds.includes(el.id) : true
    );

    if (listToExport.length === 0) {
      alert('No elements filtered or selected to export.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Ingredient,Current Stock,Safety Threshold,Unit,Status\n';

    listToExport.forEach((el) => {
      const isLow = el.currentStock < el.alertThreshold;
      const statusText = isLow ? 'ALERT: Restock Needed' : 'Adequate';
      csvContent += `"${el.name}",${el.currentStock},${el.alertThreshold},"${el.unit}","${statusText}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', `live_balance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Print Checklist
  const handlePrintChecklist = () => {
    const selectedIds = checkedElementIds.length > 0 ? checkedElementIds : filteredElements.map((e) => e.id);
    if (selectedIds.length === 0) {
      alert('No items found or selected to print.');
      return;
    }
    triggerPrint('balance', selectedIds);
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} id="live-balance-root">
      
      {/* Page header and action toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {t.liveBalance}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Browse physical quantity metrics. Elements flashing red require immediate purchase orders.
          </p>
        </div>
        
        {/* Global check printing triggers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="balance-export-csv-btn"
            onClick={handleExportCsv}
            className="px-3.5 py-2 border border-gray-200 text-gray-750 font-semibold text-xs hover:bg-gray-50 dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Download size={14} />
            {t.exportCsv}
          </button>
          <button
            type="button"
            id="balance-print-a4-btn"
            onClick={handlePrintChecklist}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Printer size={14} />
            {t.printA4}
          </button>
        </div>
      </div>

      {/* Bento-grid of low stock notifications */}
      {state.elements.some((el) => el.currentStock < el.alertThreshold) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl dark:bg-red-950/20 dark:border-red-900/50 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={20} className="text-red-600 dark:text-red-400" />
            <span className="text-sm font-semibold text-red-800 dark:text-red-300">
              Warning: Some ingredient stock levels are dropping below designated safety thresholds. Restock immediately!
            </span>
          </div>
        </div>
      )}

      {/* PC split screen column container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Ingredients List Viewer (2 Cols on pc grid) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filtration row */}
          <div className="bg-gray-150/40 border border-gray-200 dark:bg-slate-900/40 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search input field */}
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                id="balance-search-input"
                className={`w-full ${isRTL ? 'pl-4 pr-9' : 'pl-9 pr-4'} py-2 bg-white border border-gray-255 rounded-lg text-sm focus:outline-none focus:border-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white`}
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={16} className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5 text-gray-400`} />
            </div>

            {/* Low-stock filter toggle */}
            <label 
              id="btn-toggle-lowstock"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-350 cursor-pointer select-row-block"
            >
              <input
                type="checkbox"
                className="rounded text-green-600 focus:ring-green-500 w-4 h-4"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
              />
              <span>{t.restockCheckboxFilter}</span>
            </label>
          </div>

          {/* Core Grid */}
          {filteredElements.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-gray-250 dark:border-slate-700 rounded-2xl text-gray-400 text-sm">
              No ingredients matched filter. Try adjusting terms.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredElements.map((el) => {
                const isLow = el.currentStock < el.alertThreshold;
                const isChecked = checkedElementIds.includes(el.id);
                const stockPercent = Math.min(100, Math.max(0, el.alertThreshold > 0 ? (el.currentStock / el.alertThreshold) * 100 : 100));

                return (
                  <div 
                    key={el.id} 
                    className={`p-5 rounded-2xl border transition-all duration-300 relative bg-white dark:bg-slate-900 group ${
                      isLow 
                        ? 'border-red-300 shadow-sm shadow-red-50 dark:border-red-950/60' 
                        : 'border-gray-200 hover:shadow-md hover:border-gray-300 dark:border-slate-800'
                    }`}
                  >
                    {/* Checkbox trigger float */}
                    <button
                      type="button"
                      id={`balance-checkbox-${el.id}`}
                      onClick={() => toggleElementSelected(el.id)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 dark:text-slate-500 dark:hover:text-slate-400 cursor-pointer select-row-block"
                    >
                      {isChecked ? (
                        <CheckSquare size={18} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <Square size={18} className="text-gray-300 dark:text-slate-700 hover:text-gray-400" />
                      )}
                    </button>

                    {/* Main Identity */}
                    <div className="space-y-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLow ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                        {isLow ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-green-650 transition-colors">
                          {el.name}
                        </h4>
                        <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400 mt-0.5 block uppercase tracking-wider">
                          Unit: {el.unit}
                        </span>
                      </div>

                      {/* Quantity Indicator */}
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-mono font-bold tracking-tight ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {el.currentStock.toFixed(3).replace(/\.?0+$/, '')}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                          {el.unit}
                        </span>
                      </div>

                      {/* Threshold alerts slider graphic */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 dark:text-slate-400">
                          <span>Threshold: {el.alertThreshold} {el.unit}</span>
                          <span>Stock Status</span>
                        </div>

                        <div className="h-1.5 w-full bg-gray-150 rounded-full overflow-hidden dark:bg-slate-800">
                          <div 
                            style={{ width: `${stockPercent}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
                          />
                        </div>
                      </div>

                      {/* Visual flashing warnings */}
                      {isLow ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                            <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400 animate-ping" />
                            {t.flashLowStock}
                          </span>
                          
                          {/* List of at-risk recipe dependents */}
                          {state.items.filter(item => item.elements.some(sub => sub.elementId === el.id)).length > 0 && (
                            <div className="text-[10px] bg-red-50 dark:bg-red-950/20 p-2 rounded-md border border-red-100 dark:border-red-950/40 text-red-700 dark:text-red-400 leading-normal">
                              <strong>{getAlertsLabel('recipesRisk')}</strong>{' '}
                              <span className="font-medium underline">
                                {state.items.filter(item => item.elements.some(sub => sub.elementId === el.id)).map(it => it.name).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {t.healthyStock}
                        </span>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating master checkbox selector bar */}
          <div className="flex items-center gap-2 text-sm justify-between bg-slate-100/50 dark:bg-slate-900/40 p-4 rounded-xl border border-gray-150 dark:border-slate-800">
            <button
              type="button"
              id="btn-live-balance-selectall"
              onClick={handleSelectAll}
              className="inline-flex items-center gap-2 font-semibold text-gray-700 dark:text-slate-350 hover:text-gray-900 cursor-pointer text-xs"
            >
              {checkedElementIds.length === filteredElements.length && filteredElements.length > 0 ? (
                <CheckSquare size={16} className="text-green-600 dark:text-green-400" />
              ) : (
                <Square size={16} />
              )}
              <span>{checkedElementIds.length === filteredElements.length && filteredElements.length > 0 ? 'Deselect All Checklist' : 'Select All Filtered'}</span>
            </button>

            {checkedElementIds.length > 0 && (
              <span className="text-xs font-bold text-green-600 dark:text-green-400">
                Selected: {checkedElementIds.length} ingredients for batch printing/CSV exports!
              </span>
            )}
          </div>

        </div>

        {/* Right Side: DEPDENDENCE ALERTS & SERVINGS CEILINGS (1 Col on pc grid) */}
        <div className="space-y-6" id="dependent-alerts-dashboard">
          
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
            
            <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {getAlertsLabel('dashboardTitle')}
                  </h3>
                  <span className="text-[10px] text-gray-400 block mt-0.5 leading-normal">
                    {getAlertsLabel('dashboardSubtitle')}
                  </span>
                </div>
              </div>
            </div>

            {/* Tab 1: Recipe Ceilings */}
            <div className="space-y-4">
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {getAlertsLabel('bottleneckHeader')}
              </span>

              {calculatedRecipes.length === 0 ? (
                <div className="text-xs text-gray-500 dark:text-slate-400 py-4 text-center border border-dashed rounded-xl">
                  No recipes found. Link ingredients to items in menu page.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {calculatedRecipes.map((r) => {
                    const isDepleted = r.maxServings === 0;
                    const isLow = r.maxServings > 0 && r.maxServings < 10;
                    
                    return (
                      <div 
                        key={r.id} 
                        className={`p-3 rounded-xl border text-xs flex flex-col gap-2 transition-all ${
                          isDepleted 
                            ? 'bg-red-50/40 dark:bg-red-950/15 border-red-200 dark:border-red-950/40' 
                            : isLow 
                              ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-200 dark:border-amber-950/40'
                              : 'bg-slate-50/50 dark:bg-slate-900/50 border-gray-150 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-gray-900 dark:text-slate-100 inline-flex items-center gap-1.5">
                            <Utensils size={13} className="text-gray-400" />
                            {r.name}
                          </div>
                          
                          {r.maxServings === Infinity ? (
                            <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono font-bold bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {getAlertsLabel('unlimited')}
                            </span>
                          ) : isDepleted ? (
                            <span className="text-[9px] font-mono font-bold text-red-700 bg-red-100 dark:bg-red-950/70 dark:text-red-300 px-2 py-0.5 rounded uppercase animate-pulse">
                              {getAlertsLabel('criticalDepleted')}
                            </span>
                          ) : (
                            <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded flex items-center gap-1 ${
                              isLow 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                                : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                            }`}>
                              {r.maxServings} {getAlertsLabel('servingsSuffix')}
                            </span>
                          )}
                        </div>

                        {/* Bottleneck report details */}
                        {r.bottleneckElement && (
                          <div className="text-[10px] text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800 pt-1.5 flex items-start gap-1 flex-wrap">
                            <span className="font-bold text-gray-700 dark:text-slate-350">{getAlertsLabel('limitingFactor')}</span>{' '}
                            <span className="bg-gray-100 dark:bg-slate-800 px-1 rounded inline-block text-gray-600 dark:text-slate-400 font-medium">
                              {r.bottleneckElement}
                            </span>
                            <span className="italic block mt-0.5 text-[9px] w-full text-gray-400">
                              ({r.bottleneckRequired} {r.unit} {getAlertsLabel('requiredPerServing')} — {r.bottleneckAvailable.toFixed(2)} {r.unit} {getAlertsLabel('inStock')})
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tab 2: Combo Ceilings */}
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-800">
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {getAlertsLabel('combosHeader')}
              </span>

              {calculatedCombos.length === 0 ? (
                <div className="text-[10px] text-gray-500 dark:text-slate-400 py-3 text-center border border-dashed rounded-xl">
                  {state.language === 'AR' ? 'لا توجد وجبات مركبة مسجلة حالياً.' : 'No Combo Meals listed yet.'}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {calculatedCombos.map((c) => {
                    const isDepleted = c.maxServings === 0;
                    const isLow = c.maxServings > 0 && c.maxServings < 10;

                    return (
                      <div 
                        key={c.id}
                        className={`p-2.5 rounded-xl border text-[11px] flex flex-col gap-1.5 transition-all ${
                          isDepleted 
                            ? 'bg-red-50/20 dark:bg-red-950/10 border-red-150 dark:border-red-950/20' 
                            : 'bg-slate-50/50 dark:bg-slate-900/40 border-gray-150 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-gray-800 dark:text-slate-200 inline-flex items-center gap-1.5">
                            <Layers size={12} className="text-gray-400" />
                            {c.name}
                          </span>

                          {c.maxServings === Infinity ? (
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-150 dark:bg-slate-800 px-1.5 py-0.5 rounded">Unlim.</span>
                          ) : (
                            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isDepleted 
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' 
                                : isLow 
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' 
                                  : 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                            }`}>
                              {c.maxServings} qty
                            </span>
                          )}
                        </div>

                        {c.bottleneckRecipeName && (
                          <div className="text-[9px] text-gray-500 dark:text-slate-400 leading-normal">
                            Bottleneck: <span className="underline font-medium text-gray-650 dark:text-slate-300">{c.bottleneckRecipeName}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
