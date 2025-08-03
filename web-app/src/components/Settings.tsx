import React from 'react';
import { ArrowLeft, Shield, Upload, Video, Bell, Smartphone, Download, Trash2 } from 'lucide-react';
import type { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange, onBack }) => {
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleExportData = () => {
    // In a real app, this would export user data
    alert('Data export functionality would be implemented here');
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear the local cache? This will remove any locally stored data.')) {
      localStorage.clear();
      alert('Cache cleared successfully');
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      alert('Account deletion would be implemented here');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Recording Settings */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Video size={24} className="text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Recording Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Quality
                </label>
                <select
                  value={settings.videoQuality}
                  onChange={(e) => updateSetting('videoQuality', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="low">Low (720p) - Smaller file size</option>
                  <option value="medium">Medium (1080p) - Balanced quality</option>
                  <option value="high">High (4K) - Best quality</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Auto-save recordings</h3>
                  <p className="text-sm text-gray-600">Automatically save recordings locally</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoSaveEnabled}
                    onChange={(e) => updateSetting('autoSaveEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Upload Settings */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Upload size={24} className="text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Upload Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Background uploads</h3>
                  <p className="text-sm text-gray-600">Upload recordings automatically in the background</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowsBackgroundUploads}
                    onChange={(e) => updateSetting('allowsBackgroundUploads', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Shield size={24} className="text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Privacy & Legacy</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">After Death Mode</h3>
                  <p className="text-sm text-gray-600">Reveal content only after death verification</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.afterDeathModeEnabled}
                    onChange={(e) => updateSetting('afterDeathModeEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {settings.afterDeathModeEnabled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    When enabled, your AI avatar and recordings will only be accessible after death verification 
                    through designated family members or legal documentation.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Bell size={24} className="text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Push notifications</h3>
                  <p className="text-sm text-gray-600">Receive updates about uploads and processing</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={(e) => updateSetting('notificationsEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Smartphone size={24} className="text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">WhatsApp Integration</h3>
                  <p className="text-sm text-gray-600">Enable AI avatar chat through WhatsApp</p>
                </div>
                <button
                  onClick={() => updateSetting('whatsAppConnected', !settings.whatsAppConnected)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.whatsAppConnected
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {settings.whatsAppConnected ? 'Connected' : 'Connect'}
                </button>
              </div>

              {settings.whatsAppConnected && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    Your AI avatar is connected to WhatsApp. Family members can chat with your digital legacy 
                    through the configured WhatsApp number.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Data Management */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Download size={24} className="text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Data Management</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Export your data</h3>
                  <p className="text-sm text-gray-600">Download all your recordings and data</p>
                </div>
                <button
                  onClick={handleExportData}
                  className="btn-secondary"
                >
                  Export Data
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Clear local cache</h3>
                  <p className="text-sm text-gray-600">Remove locally stored data and settings</p>
                </div>
                <button
                  onClick={handleClearCache}
                  className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium hover:bg-yellow-200 transition-colors"
                >
                  Clear Cache
                </button>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-red-900">Delete account</h3>
                    <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About Legacy.AI</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Version:</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Privacy Policy:</span>
                <a href="#" className="text-primary-600 hover:text-primary-700">View</a>
              </div>
              <div className="flex justify-between">
                <span>Terms of Service:</span>
                <a href="#" className="text-primary-600 hover:text-primary-700">View</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;