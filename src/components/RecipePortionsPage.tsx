/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState } from '../types';
import { translations } from '../translations';
import { Layers, Printer, Search, CheckSquare, Square, Info, AlertTriangle, Utensils } from 'lucide-react';

interface RecipePortionsPageProps {
  state: AppState;
  triggerPrint: (type: 'inbound' | 'outbound' | 'balance' | 'register' | 'discrepancy' | 'composed' | 'recipe_portions', selectedIds?: string[]) => void;
}

export default function RecipePortionsPage({ state, triggerPrint }: RecipePortionsPageProps) {
  const isRTL = state.language === 'AR';
  const lang = state.language;

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected IDs for printing
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // 1. Local translations dictionary for exact French & Arabic alignment
  const labels: Record<string, Record<string, string>> = {
    title: {
      EN: 'Recipe Assembly & Portion Thresholds',
      FR: 'Assemblage des Recettes & Seuil de Portions',
      AR: 'تجميع الوصفات والحد الأقصى للوجبات'
    },
    subtitle: {
      EN: 'Live capacity analysis linking menu recipes to inventory raw ingredients to pinpoint production bottlenecks.',
      FR: 'Analyse de capacité en temps réel liant les recettes aux ingrédients pour identifier les goulots d\'étranglement.',
      AR: 'تحليل فوري لطاقة العمل لربط وصفات قائمة الطعام بالمخزون الحالي وتحديد المكونات المسببة للعجز.'
    },
    searchPlaceholder: {
      EN: 'Filter recipes / items by name...',
      FR: 'Filtrer les recettes par nom...',
      AR: 'فلترة وتصفية الأطباق والوصفات...'
    },
    printSelected: {
      EN: 'Print Portion Portfolio',
      FR: 'Imprimer le Portefeuille des Portions',
      AR: 'طباعة كشف ومعدلات الأطباق'
    },
    limitingFactor: {
      EN: 'Limiting Bottleneck Factor:',
      FR: 'Facteur Limitant (Goulot d\'étranglement) :',
      AR: 'عامل العجز والحد الفاصل (البوتلنك):'
    },
    requiredPerServing: {
      EN: 'required per serving',
      FR: 'requis par portion',
      AR: 'مطلوب لكل حصة'
    },
    inStock: {
      EN: 'available in stock',
      FR: 'disponible en stock',
      AR: 'متوفر حالياً بالرف'
    },
    servingsReady: {
      EN: 'portions ready to serve',
      FR: 'portions prêtes à servir',
      AR: 'حصص جاهزة للتقديم فوراً'
    },
    unlimited: {
      EN: 'Unlimited (No raw ingredients linked)',
      FR: 'Illimité (Aucun ingrédient brut lié)',
      AR: 'غير محدود (لا توجد مكونات مرتبطة)'
    },
    depleted: {
      EN: 'DEPLETED / NO RAW STOCK',
      FR: 'ÉPUISÉ / STOCK BRUT NUL',
      AR: 'منتهي تماماً / نفاد المكونات'
    }
  };

  const getLabel = (key: string): string => {
    return labels[key]?.[lang] || labels[key]?.['EN'] || '';
  };

  // 2. Compute dynamic portions ceilings & limiting bottlenecks based on live raw ingredient stocks
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
        // Linked ingredient is missing or deleted from catalog
        maxServings = 0;
        bottleneckElement = lang === 'FR' ? 'Ingrédient inconnu' : (isRTL ? 'مكون غير معروف' : 'Unknown Ingredient');
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

  // Filter listings
  const filteredRecipes = calculatedRecipes.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Selector functions
  const handleSelectAll = () => {
    if (checkedIds.length === filteredRecipes.length) {
      setCheckedIds([]); // deselect all
    } else {
      setCheckedIds(filteredRecipes.map((r) => r.id));
    }
  };

  const toggleCheckbox = (id: string) => {
    if (checkedIds.includes(id)) {
      setCheckedIds(checkedIds.filter((x) => x !== id));
    } else {
      setCheckedIds([...checkedIds, id]);
    }
  };

  // Print Orchestrion Trigger
  const handlePrint = () => {
    const effectiveIds = checkedIds.length > 0 ? checkedIds : filteredRecipes.map((r) => r.id);
    triggerPrint('recipe_portions', effectiveIds);
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-100 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <Layers size={22} />
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl tracker-tight font-display">
              {getLabel('title')}
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {getLabel('subtitle')}
          </p>
        </div>

        {/* Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          id="btn-print-portions-report"
          className="px-4 py-2 bg-slate-900 text-white hover:bg-black rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer dark:bg-white dark:text-black dark:hover:bg-slate-100 dark:shadow-none"
        >
          <Printer size={14} />
          <span>
            {checkedIds.length > 0
              ? (isRTL ? `طباعة المحدد (${checkedIds.length})` : `Print Checked (${checkedIds.length})`)
              : (isRTL ? 'طباعة كامل كشف الكفاءة والوجبات' : getLabel('printSelected'))}
          </span>
        </button>
      </div>

      {/* Control Search bar & Checklist status */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 dark:bg-slate-900 dark:border-slate-850 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            placeholder={getLabel('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Selection toggling options */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={handleSelectAll}
            className="p-2 border border-gray-200 dark:border-slate-755 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer text-gray-600 dark:text-slate-300 flex items-center gap-1.5"
          >
            {checkedIds.length === filteredRecipes.length && filteredRecipes.length > 0 ? (
              <CheckSquare size={13} className="text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Square size={13} />
            )}
            <span>
              {checkedIds.length === filteredRecipes.length && filteredRecipes.length > 0 
                ? (isRTL ? 'إلغاء تحديد الكل' : 'Deselect All') 
                : (isRTL ? 'تحديد الكل' : 'Select All')}
            </span>
          </button>
          
          {checkedIds.length > 0 && (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-bold dark:bg-indigo-950/20 dark:text-indigo-400">
              {checkedIds.length} Selected
            </span>
          )}
        </div>
      </div>

      {/* Grid mapping of recipe assembly ceiling cards */}
      {filteredRecipes.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-gray-400 text-sm">
          <Info className="mx-auto mb-2 text-gray-300 dark:text-slate-550" size={32} />
          {isRTL ? 'لا توجد وصفات أو أطباق مطابقة للبحث.' : 'No recipes matched your search criteria.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((r) => {
            const isChecked = checkedIds.includes(r.id);
            const isDepleted = r.maxServings === 0;
            const isLow = r.maxServings > 0 && r.maxServings < 15;

            return (
              <div
                key={r.id}
                className={`p-5 rounded-2xl border transition-all duration-200 relative ${
                  isChecked
                    ? 'border-indigo-300 bg-indigo-50/5 dark:border-indigo-800'
                    : 'border-gray-200 dark:border-slate-850 bg-white dark:bg-slate-900 hover:shadow-md'
                }`}
              >
                {/* Checkbox selector on top-right */}
                <button
                  type="button"
                  onClick={() => toggleCheckbox(r.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {isChecked ? (
                    <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>

                {/* Main Card Header */}
                <div className="space-y-3.5 pr-6">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isDepleted 
                      ? 'bg-red-50 text-red-650 dark:bg-red-950/40 dark:text-red-400' 
                      : isLow 
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' 
                        : 'bg-green-50 text-green-600 dark:bg-green-950/25 dark:text-green-400'
                  }`}>
                    <Utensils size={16} />
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-950 dark:text-white leading-tight">
                      {r.name}
                    </h3>
                    <span className="text-[9px] font-mono text-gray-400 mt-0.5 block uppercase tracking-widest">
                      ID: {r.id}
                    </span>
                  </div>

                  {/* Serving Portion Yield */}
                  <div className="pt-1.5 border-t border-gray-100 dark:border-slate-800/60 pb-1">
                    {r.maxServings === Infinity ? (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/55 dark:text-indigo-300 px-2.5 py-1 rounded-lg">
                        {getLabel('unlimited')}
                      </span>
                    ) : isDepleted ? (
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 dark:bg-red-950/40 dark:text-red-300 px-2.5 py-1 rounded-lg animate-pulse">
                        {getLabel('depleted')}
                      </span>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-mono font-bold ${
                          isLow ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-450'
                        }`}>
                          {r.maxServings}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                          {getLabel('servingsReady')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottleneck report Details */}
                  {r.bottleneckElement && (
                    <div className="mt-3.5 pt-2.5 border-t border-gray-150 dark:border-slate-800 text-[10px] text-gray-500 dark:text-slate-400 flex flex-col gap-1 bg-slate-50 dark:bg-slate-850/40 p-2.5 rounded-xl">
                      <span className="font-bold text-gray-700 dark:text-slate-300">
                        {getLabel('limitingFactor')}
                      </span>
                      <span className="font-semibold text-gray-950 dark:text-white">
                        {r.bottleneckElement}
                      </span>
                      <span className="text-[9px] text-gray-400 italic font-mono leading-tight">
                        ({r.bottleneckRequired} {r.unit} {getLabel('requiredPerServing')} — {r.bottleneckAvailable.toFixed(2)} {r.unit} {getLabel('inStock')})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
