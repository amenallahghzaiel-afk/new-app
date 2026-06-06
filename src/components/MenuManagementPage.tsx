/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, ElementEntity, ItemEntity, ComposedEntity, ItemIngredient, ComposedItem } from '../types';
import { translations } from '../translations';
import { Plus, Trash, Check, Lock, Info, Server, Layers, HelpCircle, Utensils, AlertTriangle } from 'lucide-react';

interface MenuManagementPageProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState, description: string) => void;
}

export default function MenuManagementPage({ state, updateState }: MenuManagementPageProps) {
  const t = translations[state.language];
  const isRTL = state.language === 'AR';
  const isLocked = state.config.isLocked;

  // Internal tab: 'elements' | 'items' | 'composed'
  const [activeSubTab, setActiveSubTab] = useState<'elements' | 'items' | 'composed'>('elements');

  // Elements State
  const [elementName, setElementName] = useState('');
  const [elementUnit, setElementUnit] = useState('kg');
  const [elementAlert, setElementAlert] = useState(1.0);

  // Items State
  const [itemName, setItemName] = useState('');
  const [itemIngredients, setItemIngredients] = useState<ItemIngredient[]>([]);

  // Composed State
  const [composedName, setComposedName] = useState('');
  const [composedItems, setComposedItems] = useState<ComposedItem[]>([]);

  // Add Element Action
  const handleAddElement = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !elementName.trim()) return;

    const newElement: ElementEntity = {
      id: `el-${Date.now()}`,
      name: elementName.trim(),
      unit: elementUnit,
      currentStock: 0,
      alertThreshold: elementAlert,
    };

    updateState((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }), `Created raw ingredient: ${newElement.name}`);

    // Clean inputs
    setElementName('');
    setElementAlert(1.0);
  };

  // Delete Element Action
  const handleDeleteElement = (id: string, name: string) => {
    if (isLocked) return;
    if (!confirm(`Are you sure you want to delete "${name}"? This could break recipes referencing it.`)) return;

    updateState((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }), `Deleted raw ingredient: ${name}`);
  };

  // Add Ingredient row line to Item Form
  const addIngredientRow = () => {
    if (state.elements.length === 0) return;
    setItemIngredients([
      ...itemIngredients,
      { elementId: state.elements[0].id, quantity: 0.1 },
    ]);
  };

  const removeIngredientRow = (index: number) => {
    setItemIngredients(itemIngredients.filter((_, idx) => idx !== index));
  };

  const updateIngredientRow = (index: number, field: keyof ItemIngredient, value: string | number) => {
    const updated = [...itemIngredients];
    if (field === 'elementId') {
      updated[index].elementId = value as string;
    } else {
      updated[index].quantity = Math.max(0, Number(value));
    }
    setItemIngredients(updated);
  };

  // Add Item Action
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !itemName.trim() || itemIngredients.length === 0) return;

    const newItem: ItemEntity = {
      id: `itm-${Date.now()}`,
      name: itemName.trim(),
      elements: itemIngredients,
    };

    updateState((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }), `Created recipe: ${newItem.name}`);

    // Clean inputs
    setItemName('');
    setItemIngredients([]);
  };

  // Delete Item Action
  const handleDeleteItem = (id: string, name: string) => {
    if (isLocked) return;
    if (!confirm(`Are you sure you want to delete recipe "${name}"? This will affect combo formulas using it.`)) return;

    updateState((prev) => ({
      ...prev,
      items: prev.items.filter((itm) => itm.id !== id),
    }), `Deleted recipe: ${name}`);
  };

  // Add Item row line to Composed Form
  const addItemRow = () => {
    if (state.items.length === 0) return;
    setComposedItems([
      ...composedItems,
      { itemId: state.items[0].id, quantity: 1 },
    ]);
  };

  const removeItemRow = (index: number) => {
    setComposedItems(composedItems.filter((_, idx) => idx !== index));
  };

  const updateItemRow = (index: number, field: keyof ComposedItem, value: string | number) => {
    const updated = [...composedItems];
    if (field === 'itemId') {
      updated[index].itemId = value as string;
    } else {
      updated[index].quantity = Math.max(1, Math.round(Number(value)));
    }
    setComposedItems(updated);
  };

  // Add Composed Combo Action
  const handleAddComposed = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !composedName.trim() || composedItems.length === 0) return;

    const newComposed: ComposedEntity = {
      id: `comp-${Date.now()}`,
      name: composedName.trim(),
      items: composedItems,
    };

    updateState((prev) => ({
      ...prev,
      composed: [...prev.composed, newComposed],
    }), `Created combo package: ${newComposed.name}`);

    // Clean inputs
    setComposedName('');
    setComposedItems([]);
  };

  // Delete Composed combo
  const handleDeleteComposed = (id: string, name: string) => {
    if (isLocked) return;
    if (!confirm(`Are you sure you want to delete combo package "${name}"?`)) return;

    updateState((prev) => ({
      ...prev,
      composed: prev.composed.filter((c) => c.id !== id),
    }), `Deleted combo package: ${name}`);
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} id="menu-management-root">
      
      {/* Locked System Indicator banner */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center gap-3 text-sm font-medium dark:bg-amber-950/20 dark:border-amber-900/60 dark:text-amber-400">
          <AlertTriangle size={18} />
          <span>Recipe adjustments are currently locked for safety. Please enter the manager password in the <strong>Settings</strong> page to make changes.</span>
        </div>
      )}

      {/* Primary header description */}
      <div className="border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {t.menuMgmt}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Catalog raw elements, write formulas mapping recipes to grains, and bind complex multi-item combo combos.
        </p>
      </div>

      {/* Visual Sub-tabs selection */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button
          id="btn-subtab-elements"
          onClick={() => setActiveSubTab('elements')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'elements'
              ? 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400'
          }`}
        >
          <Server size={16} />
          {t.elementsTab} ({state.elements.length})
        </button>
        <button
          id="btn-subtab-items"
          onClick={() => setActiveSubTab('items')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'items'
              ? 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400'
          }`}
        >
          <Utensils size={16} />
          {t.itemsTab} ({state.items.length})
        </button>
        <button
          id="btn-subtab-composed"
          onClick={() => setActiveSubTab('composed')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'composed'
              ? 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400'
          }`}
        >
          <Layers size={16} />
          {t.composedTab} ({state.composed.length})
        </button>
      </div>

      {/* Elements Sub-tab view */}
      {activeSubTab === 'elements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Create Element card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t.addElement}
            </h3>
            
            <form onSubmit={handleAddElement} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="element-name">
                  {t.elementName}
                </label>
                <input
                  type="text"
                  id="element-name"
                  required
                  placeholder="e.g. Milk chocolate drops"
                  disabled={isLocked}
                  className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50"
                  value={elementName}
                  onChange={(e) => setElementName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="element-unit">
                    {t.unitOfMeasure}
                  </label>
                  <select
                    id="element-unit"
                    disabled={isLocked}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50"
                    value={elementUnit}
                    onChange={(e) => setElementUnit(e.target.value)}
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="L">L (Liters)</option>
                    <option value="g">g (Grams)</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="ml">ml (Milliliters)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="element-alert">
                    {t.alertQty}
                  </label>
                  <input
                    type="number"
                    step="any"
                    id="element-alert"
                    required
                    min="0"
                    disabled={isLocked}
                    className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50"
                    value={elementAlert}
                    onChange={(e) => setElementAlert(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-save-ingredient"
                disabled={isLocked}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                {t.addElement}
              </button>
            </form>
          </div>

          {/* List ingredients table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 lg:col-span-2 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Raw Ingredients List
            </h3>

            {state.elements.length === 0 ? (
              <div className="py-12 text-center text-gray-500 dark:text-slate-400 text-sm">
                <Info className="mx-auto mb-2 text-gray-400 dark:text-slate-500" size={28} />
                {t.noIngredients}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-800 text-left text-xs text-gray-500 dark:text-slate-400 font-semibold">
                      <th className="py-2.5">Name</th>
                      <th className="py-2.5 text-center">Unit</th>
                      <th className="py-2.5 text-right font-mono text-gray-400">Current Stock</th>
                      <th className="py-2.5 text-right font-mono text-gray-400">Min Alert Limit</th>
                      {!isLocked && <th className="py-2.5 text-center w-20">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {state.elements.map((el) => (
                      <tr key={el.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/10">
                        <td className="py-3 font-semibold text-gray-900 dark:text-white">{el.name}</td>
                        <td className="py-3 text-center text-gray-500 dark:text-slate-400 font-mono">{el.unit}</td>
                        <td className="py-3 text-right font-mono font-medium text-gray-900 dark:text-white">
                          {el.currentStock.toFixed(3).replace(/\.?0+$/, '')} {el.unit}
                        </td>
                        <td className="py-3 text-right font-mono text-gray-500 dark:text-slate-400">
                          {el.alertThreshold} {el.unit}
                        </td>
                        {!isLocked && (
                          <td className="py-3 text-center">
                            <button
                              id={`delete-el-btn-${el.id}`}
                              onClick={() => handleDeleteElement(el.id, el.name)}
                              className="p-1 px-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors cursor-pointer dark:bg-red-950/20 dark:text-red-400"
                              title={t.delete}
                            >
                              <Trash size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items Sub-tab view (Recipe Setup) */}
      {activeSubTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Create recipes form card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t.addItem}
            </h3>

            {state.elements.length === 0 ? (
              <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-lg dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/50">
                Please create at least one raw ingredient first before writing a recipe!
              </div>
            ) : (
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="item-name">
                    {t.itemName}
                  </label>
                  <input
                    type="text"
                    id="item-name"
                    required
                    placeholder="e.g. Classic Cappuccino"
                    disabled={isLocked}
                    className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>

                {/* Recipe Ingredient matrix bindings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
                      {t.linkIngredient}
                    </span>
                    <button
                      type="button"
                      id="btn-add-ingredient-row"
                      onClick={addIngredientRow}
                      disabled={isLocked}
                      className="text-xs px-2.5 py-1 text-green-700 hover:bg-green-50 rounded-lg border border-green-200 dark:text-green-400 dark:hover:bg-green-950/20 dark:border-green-900/50 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Add Row
                    </button>
                  </div>

                  {itemIngredients.length === 0 ? (
                    <p className="text-xs text-gray-400">No formula bindings mapped. Add at least 1 raw element row.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {itemIngredients.map((ing, idx) => {
                        const targetEl = state.elements.find((e) => e.id === ing.elementId);
                        return (
                          <div key={idx} className="flex gap-2 items-center bg-gray-50 dark:bg-slate-850 p-2 rounded-lg border border-gray-100 dark:border-slate-800">
                            <select
                              className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              value={ing.elementId}
                              onChange={(e) => updateIngredientRow(idx, 'elementId', e.target.value)}
                            >
                              {state.elements.map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.name}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1 w-24">
                              <input
                                type="number"
                                step="any"
                                required
                                min="0.0001"
                                className="w-16 px-1.5 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                value={ing.quantity}
                                onChange={(e) => updateIngredientRow(idx, 'quantity', e.target.value)}
                              />
                              <span className="text-xs font-semibold text-gray-400">
                                {targetEl?.unit || 'kg'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeIngredientRow(idx)}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  id="btn-save-recipe"
                  disabled={isLocked || itemIngredients.length === 0}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                  {t.addItem}
                </button>
              </form>
            )}
          </div>

          {/* List Recipes table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 lg:col-span-2 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Recipes Formulas (Items)
            </h3>

            {state.items.length === 0 ? (
              <div className="py-12 text-center text-gray-500 dark:text-slate-400 text-sm">
                <Info className="mx-auto mb-2 text-gray-400 dark:text-slate-500" size={28} />
                {t.noItems}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.items.map((itm) => (
                  <div key={itm.id} className="relative p-4 rounded-xl border border-gray-150 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-850/40 hover:shadow-sm transition-shadow">
                    
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-gray-900 dark:text-white">{itm.name}</h4>
                      {!isLocked && (
                        <button
                          id={`delete-itm-btn-${itm.id}`}
                          onClick={() => handleDeleteItem(itm.id, itm.name)}
                          className="p-1 text-red-600 bg-white hover:bg-red-50 border border-red-200/50 rounded dark:bg-slate-800 dark:hover:bg-slate-900 dark:border-slate-700 cursor-pointer"
                        >
                          <Trash size={12} />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 border-t border-dashed border-gray-200 dark:border-slate-700 pt-2 space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 tracking-wider block">CONSTITUENT REQUISITION:</span>
                      {itm.elements.map((elRef, idx) => {
                        const originalEl = state.elements.find((el) => el.id === elRef.elementId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs text-gray-600 dark:text-slate-350">
                            <span>{originalEl ? originalEl.name : 'Unknown Ingredient'}</span>
                            <span className="font-mono text-gray-900 dark:text-white font-semibold">
                              {elRef.quantity.toFixed(3).replace(/\.?0+$/, '')} {originalEl?.unit || 'unit'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Composed Sub-tab view (Combo Group Deals) */}
      {activeSubTab === 'composed' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Create Composed Cards */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t.addComposed}
            </h3>

            {state.items.length === 0 ? (
              <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-lg dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/50">
                Please configure recipes/items first before arranging a multi-item package deal combo.
              </div>
            ) : (
              <form onSubmit={handleAddComposed} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="composed-name">
                    {t.composedName}
                  </label>
                  <input
                    type="text"
                    id="composed-name"
                    required
                    placeholder="e.g. Continental Brunch Special"
                    disabled={isLocked}
                    className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50"
                    value={composedName}
                    onChange={(e) => setComposedName(e.target.value)}
                  />
                </div>

                {/* Combos links recipes matrix */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
                      {t.linkItems}
                    </span>
                    <button
                      type="button"
                      id="btn-add-item-row"
                      onClick={addItemRow}
                      disabled={isLocked}
                      className="text-xs px-2.5 py-1 text-green-700 hover:bg-green-50 rounded-lg border border-green-200 dark:text-green-400 dark:hover:bg-green-950/20 dark:border-green-900/50 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Add Recipe
                    </button>
                  </div>

                  {composedItems.length === 0 ? (
                    <p className="text-xs text-gray-400">No packaged dishes. Add at least 1 active recipe line.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {composedItems.map((cRow, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-gray-50 dark:bg-slate-850 p-2 rounded-lg border border-gray-100 dark:border-slate-800">
                          <select
                            className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            value={cRow.itemId}
                            onChange={(e) => updateItemRow(idx, 'itemId', e.target.value)}
                          >
                            {state.items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.name}
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1 w-20">
                            <input
                              type="number"
                              required
                              min="1"
                              step="1"
                              className="w-12 px-1.5 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              value={cRow.quantity}
                              onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                            />
                            <span className="text-[10px] font-bold text-gray-400">Qty</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer"
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  id="btn-save-combo"
                  disabled={isLocked || composedItems.length === 0}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                  {t.addComposed}
                </button>
              </form>
            )}
          </div>

          {/* List Composed Combo Formulas */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 lg:col-span-2 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Combo Meal Packages Layout (Composed)
            </h3>

            {state.composed.length === 0 ? (
              <div className="py-12 text-center text-gray-500 dark:text-slate-400 text-sm">
                <Info className="mx-auto mb-2 text-gray-400 dark:text-slate-500" size={28} />
                No combo meals packaged.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.composed.map((comp) => (
                  <div key={comp.id} className="relative p-4 rounded-xl border border-gray-150 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-850/40 hover:shadow-sm transition-shadow">
                    
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-gray-900 dark:text-white">{comp.name}</h4>
                      {!isLocked && (
                        <button
                          id={`delete-comp-btn-${comp.id}`}
                          onClick={() => handleDeleteComposed(comp.id, comp.name)}
                          className="p-1 text-red-600 bg-white hover:bg-red-50 border border-red-200/50 rounded dark:bg-slate-800 dark:hover:bg-slate-900 dark:border-slate-700 cursor-pointer"
                        >
                          <Trash size={12} />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 border-t border-dashed border-gray-200 dark:border-slate-700 pt-2 space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 tracking-wider block">CONTAINING DISHES:</span>
                      {comp.items.map((rowItem, index) => {
                        const originalItem = state.items.find((it) => it.id === rowItem.itemId);
                        return (
                          <div key={index} className="flex justify-between items-center text-xs text-gray-600 dark:text-slate-350">
                            <span>{originalItem ? originalItem.name : 'Unknown Recipe'}</span>
                            <span className="font-mono text-gray-900 dark:text-white font-semibold">
                              x {rowItem.quantity}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
