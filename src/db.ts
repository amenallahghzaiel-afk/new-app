/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, LedgerLog } from './types';

const DB_NAME = 'RestaurantInventoryDB';
const STORE_NAME = 'InventoryStore';
const STATE_KEY = 'current_app_state';
const FILE_HANDLE_KEY = 'sync_file_handle';

// Pre-seeded default data for premium presentation out-of-the-box
const INITIAL_STATE: AppState = {
  config: {
    restaurantName: 'Le Petit Bistro / المقصف الصغير',
    restaurantLogo: '', // Can be uploaded as base64
    passwordHash: '1234', // default password
    isLocked: false
  },
  theme: 'light',
  language: 'EN',
  elements: [
    { id: 'el-1', name: 'Arabica Espresso Beans', unit: 'kg', currentStock: 18.5, alertThreshold: 5.0 },
    { id: 'el-2', name: 'Fresh Whole Milk', unit: 'L', currentStock: 35.0, alertThreshold: 10.0 },
    { id: 'el-3', name: 'Butter Croissants (Pre-baked)', unit: 'pcs', currentStock: 48, alertThreshold: 15 },
    { id: 'el-4', name: 'Hot Chocolate Cocoa Powder', unit: 'kg', currentStock: 7.2, alertThreshold: 2.0 },
    { id: 'el-5', name: 'Artisanal Orange Juice', unit: 'L', currentStock: 12.0, alertThreshold: 4.0 }
  ],
  items: [
    {
      id: 'itm-1',
      name: 'Single Espresso Shot',
      elements: [{ elementId: 'el-1', quantity: 0.015 }] // 15g beans
    },
    {
      id: 'itm-2',
      name: 'Café Grande Latte',
      elements: [
        { elementId: 'el-1', quantity: 0.015 },
        { elementId: 'el-2', quantity: 0.220 } // 220ml milk
      ]
    },
    {
      id: 'itm-3',
      name: 'Pain au Croissant',
      elements: [{ elementId: 'el-3', quantity: 1 }] // 1 croissant
    },
    {
      id: 'itm-4',
      name: 'Velvet Hot Cocoa',
      elements: [
        { elementId: 'el-4', quantity: 0.030 }, // 30g powder
        { elementId: 'el-2', quantity: 0.250 }  // 250ml milk
      ]
    }
  ],
  composed: [
    {
      id: 'comp-1',
      name: 'Classic Breakfast Combo',
      items: [
        { itemId: 'itm-2', quantity: 1 }, // 1 Latte
        { itemId: 'itm-3', quantity: 1 }  // 1 Croissant
      ]
    },
    {
      id: 'comp-2',
      name: 'Gourmet Double Morning Package',
      items: [
        { itemId: 'itm-2', quantity: 2 }, // 2 Lattes
        { itemId: 'itm-3', quantity: 2 }  // 2 Croissants
      ]
    }
  ],
  logs: [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 24 * 3600 * 1000 * 3).toISOString(), // 3 days ago
      type: 'Inbound',
      actionType: 'delivery',
      targetName: 'Arabica Espresso Beans',
      details: 'Opening Balance Delivery - Restocked coffee cellar.',
      elementsImpacted: [{ elementId: 'el-1', elementName: 'Arabica Espresso Beans', quantity: 20.0, unit: 'kg' }]
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 24 * 3600 * 1000 * 2).toISOString(), // 2 days ago
      type: 'Inbound',
      actionType: 'delivery',
      targetName: 'Fresh Whole Milk',
      details: 'Cold chain delivery from regional farm.',
      elementsImpacted: [{ elementId: 'el-2', elementName: 'Fresh Whole Milk', quantity: 40.0, unit: 'L' }]
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(), // 4 hours ago
      type: 'Outbound',
      actionType: 'sold',
      targetName: 'Classic Breakfast Combo',
      parentQuantity: 10,
      details: 'Sold 10 Classic Breakfast Combos (Calculated: -1.5kg Beans, -2.2L Milk, -10 Croissants)',
      elementsImpacted: [
        { elementId: 'el-1', elementName: 'Arabica Espresso Beans', quantity: -0.150, unit: 'kg' },
        { elementId: 'el-2', elementName: 'Fresh Whole Milk', quantity: -2.2, unit: 'L' },
        { elementId: 'el-3', elementName: 'Butter Croissants (Pre-baked)', quantity: -10, unit: 'pcs' }
      ]
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(), // 2 hours ago
      type: 'Outbound',
      actionType: 'waste',
      targetName: 'Fresh Whole Milk',
      details: 'Spill incident near the active barista station.',
      elementsImpacted: [{ elementId: 'el-2', elementName: 'Fresh Whole Milk', quantity: -2.8, unit: 'L' }]
    }
  ]
};

// Simple helper to wrap IndexedDB requests
function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadStateFromIndexedDB(): Promise<AppState> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          resolve(INITIAL_STATE);
        }
      };
      request.onerror = () => {
        resolve(INITIAL_STATE);
      };
    });
  } catch (error) {
    console.error('Failed to access IndexedDB, falling back to Seed data:', error);
    return INITIAL_STATE;
  }
}

export async function saveStateToIndexedDB(state: AppState): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, STATE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to preserve state in IndexedDB:', err);
  }
}

/**
 * Access File System handle stored in IDB (Chrome only, safely falls back)
 */
export async function loadFileSystemHandle(): Promise<any | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(FILE_HANDLE_KEY);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveFileSystemHandle(handle: any): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(handle, FILE_HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Could not save File System handle:', err);
  }
}

export async function clearFileSystemHandle(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(FILE_HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Could not clear File System handle:', err);
  }
}

/**
 * Perform sync export writing directly to the custom FileSystemFileHandle
 */
export async function syncToFile(handle: any, state: AppState): Promise<boolean> {
  try {
    // Request permission if not already granted
    const options = { mode: 'readwrite' };
    if ((await handle.queryPermission(options)) !== 'granted') {
      if ((await handle.requestPermission(options)) !== 'granted') {
        return false;
      }
    }
    const writable = await handle.createWritable();
    const dataString = JSON.stringify(state, null, 2);
    await writable.write(dataString);
    await writable.close();
    return true;
  } catch (e) {
    console.warn('Silent fallback: Browser file output refused or running inside narrow iframe sandbox.', e);
    return false;
  }
}

/**
 * Standard Browser Manual Download fallback
 */
export function manualDownloadBackup(state: AppState) {
  try {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    const safeName = state.config.restaurantName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateFormatted = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${safeName}_inventory_${dateFormatted}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error('Manual download failed:', err);
  }
}
