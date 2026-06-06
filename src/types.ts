/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'EN' | 'FR' | 'AR';
export type Theme = 'light' | 'dark';

export interface BusinessConfig {
  restaurantName: string;
  restaurantLogo: string; // Base64 or ObjectURL string
  passwordHash: string; // To secure operations under settings
  isLocked: boolean; // Settings lock/unlock state
}

export interface ElementEntity {
  id: string;
  name: string;
  unit: string; // 'kg', 'L', 'g', 'pcs', 'ml', etc.
  currentStock: number;
  alertThreshold: number;
}

export interface ItemIngredient {
  elementId: string;
  quantity: number; // e.g., 0.03 kg or 1 pcs
}

export interface ItemEntity {
  id: string;
  name: string;
  elements: ItemIngredient[]; // ingredient requirements
}

export interface ComposedItem {
  itemId: string;
  quantity: number; // e.g., 2 items
}

export interface ComposedEntity {
  id: string;
  name: string;
  items: ComposedItem[]; // item group requirements
}

export type OutboundCategory = 'Sold' | 'Waste/Spoiled' | 'Staff Meal';

export interface LedgerLog {
  id: string;
  timestamp: string; // ISO String
  type: 'Inbound' | 'Outbound' | 'Discrepancy';
  actionType: 'delivery' | 'sold' | 'waste' | 'staff_meal' | 'reconciliation_adjustment';
  targetName: string; // e.g. "Espresso" or "Coffee"
  parentQuantity?: number; // quantity of Item/Composed selected
  details: string; // human-readable summary
  elementsImpacted: {
    elementId: string;
    elementName: string;
    quantity: number; // Signed change logic (+/-)
    unit: string;
  }[];
}

export interface AppState {
  config: BusinessConfig;
  theme: Theme;
  language: Language;
  elements: ElementEntity[];
  items: ItemEntity[];
  composed: ComposedEntity[];
  logs: LedgerLog[];
}

export interface ActionRecord {
  undoState: AppState;
  redoState: AppState;
  description: string;
}
