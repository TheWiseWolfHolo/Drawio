'use client';

import { useState, useEffect } from 'react';
import { configManager } from '../lib/config-manager.js';
import Notification from './Notification';
import ConfirmDialog from './ConfirmDialog';

export default function ConfigManager({ isOpen, onClose, onConfigSelect }) {
  const [configs, setConfigs] = useState([]);
  const [activeConfigId, setActiveConfigId] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Load configs when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConfigs();
    }
  }, [isOpen]);

  const loadConfigs = () => {
    try {
      const allConfigs = configManager.getAllConfigs();
      const activeId = configManager.getActiveConfigId();
      setConfigs(allConfigs);
      setActiveConfigId(activeId);
    } catch (err) {
      setError('加载配置失败: ' + err.message);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingConfig({
      name: '',
      type: 'openai',
      baseUrl: '',
      apiKey: '',
      model: '',
      description: ''
    });
  };

  const handleEdit = (config) => {
    setIsCreating(false);
    setEditingConfig({ ...config });
  };

  const handleDelete = async (configId) => {
    setConfirmDialog({
      isOpen: true,
      title: '确认删除',
      message: '确定要删除这个配置吗？此操作不可恢复。',
      onConfirm: async () => {
        try {
          await configManager.deleteConfig(configId);
          loadConfigs();
          setError('');
          setNotification({
            isOpen: true,
            title: '删除成功',
            message: '配置已成功删除',
            type: 'success'
          });
        } catch (err) {
          setError('删除配置失败: ' + err.message);
        }
      }
    });
  };

  const handleClone = (config) => {
    const newName = `${config.name} (副本)`;

    try {
      configManager.cloneConfig(config.id, newName);
      loadConfigs();
      setError('');
    } catch (err) {
      setError('克隆配置失败: ' + err.message);
    }
  };

  const handleSetActive = async (configId) => {
    try {
      await configManager.setActiveConfig(configId);
      loadConfigs();
      onConfigSelect?.(configManager.getActiveConfig());
      setError('');
    } catch (err) {
      setError('切换配置失败: ' + err.message);
    }
  };

  const handleTestConnection = async (config) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await configManager.testConnection(config);
      if (result.success) {
        setNotification({
          isOpen: true,
          title: '连接测试成功',
          message: result.message,
          type: 'success'
        });
      } else {
        setNotification({
          isOpen: true,
          title: '连接测试失败',
          message: result.message,
          type: 'error'
        });
      }
    } catch (err) {
      setNotification({
        isOpen: true,
        title: '连接测试失败',
        message: err.message,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = (configData) => {
    try {
      if (isCreating) {
        const newConfig = configManager.createConfig(configData);
        if (configs.length === 0) {
          onConfigSelect?.(newConfig);
        }
      } else {
        configManager.updateConfig(editingConfig.id, configData);
        if (editingConfig.id === activeConfigId) {
          onConfigSelect?.(configManager.getConfig(editingConfig.id));
        }
      }

      setEditingConfig(null);
      setIsCreating(false);
      loadConfigs();
      setError('');
    } catch (err) {
      setError('保存配置失败: ' + err.message);
    }
  };

  const handleExport = () => {
    try {
      const exportData = configManager.exportConfigs();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'llm-configs.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('导出配置失败: ' + err.message);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = configManager.importConfigs(text);
        if (result.success) {
          setNotification({
            isOpen: true,
            title: '导入成功',
            message: `成功导入 ${result.count} 个配置`,
            type: 'success'
          });
          loadConfigs();
        } else {
          setError('导入配置失败: ' + result.message);
        }
      } catch (err) {
        setError('导入配置失败: ' + err.message);
      }
    };
    input.click();
  };

  const filteredConfigs = searchQuery
    ? configManager.searchConfigs(searchQuery)
    : configs;

  if (!isOpen) return null;

  if (editingConfig) {
    return <ConfigEditor
      config={editingConfig}
      isCreating={isCreating}
      onSave={handleSaveConfig}
      onCancel={() => {
        setEditingConfig(null);
        setIsCreating(false);
      }}
    />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card text-foreground rounded border border-border w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold font-heading text-foreground">配置管理</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-card">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-4 px-4 py-3 rounded border border-accent bg-accent/40 text-accent-foreground">
            <p className="text-sm">提示：如果启用了访问密码，将优先使用服务器端配置，此处配置将被忽略</p>
          </div>

          {/* Actions Bar */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary-hover transition-colors duration-200 shadow-sm"
            >
              新建配置
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-card border border-border text-foreground rounded hover:bg-muted transition-colors duration-200"
            >
              导出配置
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-card border border-border text-foreground rounded hover:bg-muted transition-colors duration-200"
            >
              导入配置
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索配置..."
              className="w-full px-3 py-2 border border-input bg-card text-foreground rounded focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>

          {/* Config List */}
          <div className="space-y-3">
            {filteredConfigs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '没有找到匹配的配置' : '暂无配置，点击"新建配置"创建第一个配置'}
              </div>
            ) : (
              filteredConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    config.id === activeConfigId
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/40 bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-foreground">{config.name}</h3>
                        {config.id === activeConfigId && (
                          <span className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground">当前使用</span>
                        )}
                        <span className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground">
                          {config.type}
                        </span>
                      </div>
                      {config.description && (
                        <p className="text-sm text-muted-foreground mb-2">{config.description}</p>
                      )}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>URL: {config.baseUrl}</div>
                        <div>模型: {config.model}</div>
                        <div>创建时间: {new Date(config.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {config.id !== activeConfigId && (
                        <button
                          onClick={() => handleSetActive(config.id)}
                          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary-hover transition-colors duration-200"
                        >
                          设为当前
                        </button>
                      )}
                      <button
                        onClick={() => handleTestConnection(config)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs rounded border border-border bg-card text-foreground hover:bg-muted transition-colors duration-200 disabled:bg-muted disabled:text-muted-foreground"
                      >
                        测试
                      </button>
                      <button
                        onClick={() => handleEdit(config)}
                        className="px-3 py-1 text-xs rounded border border-border bg-card text-foreground hover:bg-muted transition-colors duration-200"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleClone(config)}
                        className="px-3 py-1 text-xs rounded border border-border bg-card text-foreground hover:bg-muted transition-colors duration-200"
                      >
                        克隆
                      </button>
                      {configs.length > 1 && (
                        <button
                          onClick={() => handleDelete(config.id)}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notification */}
      <Notification
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="danger"
      />
    </div>
  );
}

// Configuration Editor Component
function ConfigEditor({ config, isCreating, onSave, onCancel }) {
  const [formData, setFormData] = useState({ ...config });
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useCustomModel, setUseCustomModel] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (formData.model) {
      if (models.length > 0) {
        const exists = models.some(m => m.id === formData.model);
        setUseCustomModel(!exists);
      } else {
        setUseCustomModel(true);
      }
    }
  }, [models, formData.model]);

  const handleLoadModels = async () => {
    if (!formData.type || !formData.baseUrl || !formData.apiKey) {
      setError('请先填写提供商类型、基础 URL 和 API 密钥');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        type: formData.type,
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey,
      });

      const response = await fetch(`/api/models?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '加载模型失败');
      }

      setModels(data.models);
    } catch (err) {
      setError(err.message);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.type || !formData.baseUrl || !formData.apiKey || !formData.model) {
      setError('请填写所有必填字段');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="relative bg-card rounded border border-border w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isCreating ? '新建配置' : '编辑配置'}
          </h2>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              配置名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：我的 OpenAI"
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              描述
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="配置描述（可选）"
              rows={2}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              提供商类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value, model: '' })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              基础 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              placeholder={formData.type === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com/v1'}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              API 密钥 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <button
              onClick={handleLoadModels}
              disabled={loading}
              className="w-full px-4 py-2 bg-card border border-border text-foreground rounded hover:bg-muted disabled:bg-muted disabled:text-muted-foreground transition-colors duration-200 font-medium"
            >
              {loading ? '加载模型中...' : '加载可用模型'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              模型 <span className="text-red-500">*</span>
            </label>

            {models.length > 0 && (
              <div className="mb-2 flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={!useCustomModel}
                    onChange={() => {
                      setUseCustomModel(false);
                      if (models.length > 0) {
                        setFormData({ ...formData, model: models[0].id });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-foreground">从列表选择</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={useCustomModel}
                    onChange={() => {
                      setUseCustomModel(true);
                      setFormData({ ...formData, model: '' });
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-foreground">手动输入</span>
                </label>
              </div>
            )}

            {models.length > 0 && !useCustomModel && (
              <select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            )}

            {(useCustomModel || models.length === 0) && (
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="例如：gpt-4、claude-3-opus-20240229"
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-foreground bg-card border border-border rounded hover:bg-muted transition-colors duration-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-primary-foreground bg-primary rounded hover:bg-primary-hover transition-colors duration-200 shadow-sm"
          >
            {isCreating ? '创建' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}