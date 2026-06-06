/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, ElementEntity, Language, Theme } from '../types';
import { translations } from '../translations';
import { Lock, Unlock, Eye, ShieldAlert, Upload, RefreshCw, FileCode, CheckCircle, Save } from 'lucide-react';
import { saveFileSystemHandle, clearFileSystemHandle } from '../db';

interface SettingsPageProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState, description: string) => void;
  fileLinked: boolean;
  setFileLinked: (active: boolean) => void;
  onRequestFileHandle: () => void;
}

export default function SettingsPage({
  state,
  updateState,
  fileLinked,
  setFileLinked,
  onRequestFileHandle,
}: SettingsPageProps) {
  const t = translations[state.language];
  const isRTL = state.language === 'AR';

  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Handle image upload and convert to base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateState((prev) => ({
          ...prev,
          config: {
            ...prev.config,
            restaurantLogo: base64String,
          },
        }), 'Uploaded Restaurant Logo');
      };
      reader.readAsDataURL(file);
    }
  };

  // Password Unlock Check
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === state.config.passwordHash) {
      updateState((prev) => ({
        ...prev,
        config: { ...prev.config, isLocked: false },
      }), 'Unlocked Settings');
      setPasswordInput('');
      setPasswordError('');
      alert(t.unlockedSuccess);
    } else {
      setPasswordError(t.wrongPassword);
    }
  };

  // Password Lock
  const handleLock = () => {
    updateState((prev) => ({
      ...prev,
      config: { ...prev.config, isLocked: true },
    }), 'Locked Settings');
    setPasswordSuccess('');
  };

  // Save new password
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    updateState((prev) => ({
      ...prev,
      config: { ...prev.config, passwordHash: newPassword },
    }), 'Changed Access Password');
    setNewPassword('');
    setPasswordSuccess('Password saved successfully!');
  };

  // Update a single element threshold inline
  const handleThresholdChange = (elementId: string, value: number) => {
    updateState((prev) => {
      const updatedElements = prev.elements.map((el) => {
        if (el.id === elementId) {
          return { ...el, alertThreshold: Math.max(0, value) };
        }
        return el;
      });
      return { ...prev, elements: updatedElements };
    }, `Updated alert threshold for ID ${elementId}`);
  };

  // Manage Local File Handle disconnection
  const disconnectFileHandle = async () => {
    await clearFileSystemHandle();
    setFileLinked(false);
  };

  return (
    <div className={`space-y-8 ${isRTL ? 'text-right' : 'text-left'}`} id="settings-page-root">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {t.controlCenter}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Configure restaurant variables, units, local backup logs, and language preference.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          {state.config.isLocked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
              <Lock size={14} /> Locked Status
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
              <Unlock size={14} /> Unlocked Status
            </span>
          )}
        </div>
      </div>

      {/* Security Gateway (PIN Form) if currently locked */}
      {state.config.isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-lg text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
              <ShieldAlert size={24} />
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {t.secSettings}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  {t.appIsLockedMsg} (Default password is <code className="bg-amber-200 dark:bg-amber-900/60 px-1 py-0.5 rounded font-bold">1234</code>)
                </p>
              </div>
              <form onSubmit={handleUnlock} className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="password"
                  id="lock-password-input"
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder={t.passwordPlaceholder}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  id="unlock-submit-btn"
                  className="px-5 py-2 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
                >
                  <Unlock size={16} />
                  {t.unlockApp}
                </button>
              </form>
              {passwordError && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {passwordError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main settings options, layout responsive grids */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${state.config.isLocked ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        
        {/* Left Side: localization & core settings */}
        <div className="space-y-8">
          
          {/* Identity Widget */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-5">
            <h2 className="text-lg font-display font-semibold text-gray-900 dark:text-white">
              {t.bizInfo}
            </h2>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="restaurant-name-input">
                  {t.bizName}
                </label>
                <input
                  type="text"
                  id="restaurant-name-input"
                  className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  value={state.config.restaurantName}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateState((prev) => ({
                      ...prev,
                      config: { ...prev.config, restaurantName: val },
                    }), 'Changed Restaurant Name');
                  }}
                />
              </div>

              {/* Logo Upload Box */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 block">
                  {t.bizLogo}
                </span>
                
                <div className="flex items-center gap-4">
                  {state.config.restaurantLogo ? (
                    <img
                      src={state.config.restaurantLogo}
                      alt="Brand Seal"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-slate-700 bg-gray-50"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 text-xs">
                      No Seal
                    </div>
                  )}

                  <label 
                    id="logo-upload-label"
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    <Upload size={16} />
                    <span>{t.uploadLogo}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Localization & Preferences */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-5">
            <h2 className="text-lg font-display font-semibold text-gray-900 dark:text-white">
              {t.activeTheme} & {t.language}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="language-select">
                  {t.language}
                </label>
                <select
                  id="language-select"
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  value={state.language}
                  onChange={(e) => {
                    const l = e.target.value as Language;
                    updateState((prev) => ({ ...prev, language: l }), `Switched language to ${l}`);
                  }}
                >
                  <option value="EN">English (EN)</option>
                  <option value="FR">Français (FR)</option>
                  <option value="AR">العربية (AR)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400" htmlFor="theme-select">
                  {t.activeTheme}
                </label>
                <select
                  id="theme-select"
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  value={state.theme}
                  onChange={(e) => {
                    const th = e.target.value as Theme;
                    updateState((prev) => ({ ...prev, theme: th }), `Switched theme to ${th}`);
                  }}
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>
            </div>
          </div>

          {/* Key Change Form & Lock Trigger */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-gray-900 dark:text-white">
                {t.passwordSetup}
              </h2>
              <button
                type="button"
                id="lock-now-btn"
                onClick={handleLock}
                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium text-xs rounded-lg transition-colors cursor-pointer dark:bg-red-950/25 dark:text-red-400 dark:border-red-900/50"
              >
                Lock App Access Now
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="password"
                    id="new-password-input"
                    className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="Set new manager PIN..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  id="save-pin-btn"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Save size={14} />
                  Change
                </button>
              </div>
              {passwordSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">{passwordSuccess}</p>
              )}
            </form>
          </div>

        </div>

        {/* Right Side: database sync & threshold configuration */}
        <div className="space-y-8">
          
          {/* File Synchronizer Control Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileCode className="text-green-600 dark:text-green-400" size={20} />
                  {t.dbFileSync}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {t.dbSyncDesc}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl dark:bg-slate-850 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-slate-400">Connection State:</span>
                {fileLinked ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={14} /> Synchronized
                  </span>
                ) : (
                  <span className="font-bold text-amber-500">
                    Not linked (Saves sandbox IDB only)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  id="trigger-file-sync-btn"
                  onClick={onRequestFileHandle}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw size={16} />
                  {t.syncNow}
                </button>
                {fileLinked && (
                  <button
                    type="button"
                    id="disconnect-file-sync-btn"
                    onClick={disconnectFileHandle}
                    className="px-3 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    Disconnect Sync
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Alarm warning configurations tab */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-900 dark:text-white">
                {t.alertConfig}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {t.thresholdWarning}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-800">
                    <th className="py-2 text-left font-semibold text-gray-500 dark:text-slate-400">Ingredient</th>
                    <th className="py-2 text-center font-semibold text-gray-500 dark:text-slate-400">Unit</th>
                    <th className="py-2 text-right font-semibold text-gray-500 dark:text-slate-400 w-28">Alert Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {state.elements.map((el) => (
                    <tr key={el.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      <td className="py-3 text-left font-medium text-gray-900 dark:text-white">
                        {el.name}
                      </td>
                      <td className="py-3 text-center font-mono text-gray-500 dark:text-slate-400">
                        {el.unit}
                      </td>
                      <td className="py-3 text-right">
                        <input
                          type="number"
                          step="any"
                          id={`threshold-input-${el.id}`}
                          className="w-24 text-right px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          value={el.alertThreshold}
                          onChange={(e) => handleThresholdChange(el.id, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
