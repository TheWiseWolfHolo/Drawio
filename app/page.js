'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Chat from '@/components/Chat';
import CodeEditor from '@/components/CodeEditor';
import ConfigManager from '@/components/ConfigManager';
import ContactModal from '@/components/ContactModal';
import HistoryModal from '@/components/HistoryModal';
import AccessPasswordModal from '@/components/AccessPasswordModal';
import OptimizationPanel from '@/components/OptimizationPanel';
import Notification from '@/components/Notification';
import { getConfig, isConfigValid } from '@/lib/config';
import { optimizeExcalidrawCode } from '@/lib/optimizeArrows';
import { historyManager } from '@/lib/history-manager';
import { OPTIMIZATION_SYSTEM_PROMPT, createOptimizationPrompt, createContinuationPrompt } from '@/lib/prompts';

// Dynamically import DrawioCanvas to avoid SSR issues
const DrawioCanvas = dynamic(() => import('@/components/DrawioCanvas'), {
  ssr: false,
});

export default function Home() {
  const [config, setConfig] = useState(null);
  const [isConfigManagerOpen, setIsConfigManagerOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAccessPasswordModalOpen, setIsAccessPasswordModalOpen] = useState(false);
  const [isOptimizationPanelOpen, setIsOptimizationPanelOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedXml, setGeneratedXml] = useState('');
  const [elements, setElements] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [isOptimizingCode, setIsOptimizingCode] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(25); // Percentage of viewport width
  const [isResizingHorizontal, setIsResizingHorizontal] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [jsonError, setJsonError] = useState(null);
  const [currentInput, setCurrentInput] = useState('');
  const [currentChartType, setCurrentChartType] = useState('auto');
  const [usePassword, setUsePassword] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  const abortControllerRef = useRef(null);
  const layoutRef = useRef(null);

  // Load config on mount and listen for config changes
  useEffect(() => {
    const savedConfig = getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }

    // Load password access state
    const passwordEnabled = localStorage.getItem('smart-excalidraw-use-password') === 'true';
    setUsePassword(passwordEnabled);

    // Listen for storage changes to sync across tabs
    const handleStorageChange = (e) => {
      if (e.key === 'smart-excalidraw-active-config' || e.key === 'smart-excalidraw-configs') {
        const newConfig = getConfig();
        setConfig(newConfig);
      }
      if (e.key === 'smart-excalidraw-use-password') {
        const passwordEnabled = localStorage.getItem('smart-excalidraw-use-password') === 'true';
        setUsePassword(passwordEnabled);
      }
    };

    // Listen for custom event from AccessPasswordModal (same tab)
    const handlePasswordSettingsChanged = (e) => {
      setUsePassword(e.detail.usePassword);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('password-settings-changed', handlePasswordSettingsChanged);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('password-settings-changed', handlePasswordSettingsChanged);
    };
  }, []);

  // Post-process draw.io XML code: remove markdown wrappers
  const postProcessDrawioCode = (code) => {
    if (!code || typeof code !== 'string') return code;

    let processed = code.trim();

    // Remove markdown code fence wrappers (```xml, ```mxgraph, or just ```)
    processed = processed.replace(/^```(?:xml|mxgraph)?\s*\n?/i, '');
    processed = processed.replace(/\n?```\s*$/, '');
    processed = processed.trim();

    // Validate XML structure
    if (!processed.includes('<mxfile>') || !processed.includes('</mxfile>')) {
      console.warn('Generated code does not contain valid mxfile structure');
    }

    return processed;
  };


  // Handle stopping generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setApiError(null);
  };

  // Handle sending a message (single-turn)
  const handleSendMessage = async (userMessage, chartType = 'auto') => {
    const usePassword = typeof window !== 'undefined' && localStorage.getItem('smart-excalidraw-use-password') === 'true';
    const accessPassword = typeof window !== 'undefined' ? localStorage.getItem('smart-excalidraw-access-password') : '';

    if (!usePassword && !isConfigValid(config)) {
      setNotification({
        isOpen: true,
        title: '配置提醒',
        message: '请先配置您的 LLM 提供商或启用访问密码',
        type: 'warning'
      });
      setIsConfigManagerOpen(true);
      return;
    }

    setCurrentInput(userMessage);
    setCurrentChartType(chartType);
    setIsGenerating(true);
    setApiError(null); // Clear previous errors
    setJsonError(null); // Clear previous JSON errors

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (usePassword && accessPassword) {
        headers['x-access-password'] = accessPassword;
      }

      // Clean userInput if it contains image data
      let cleanedUserInput = userMessage;
      if (typeof userMessage === 'object' && userMessage.image) {
        cleanedUserInput = {
          text: userMessage.text,
          image: {
            data: userMessage.image.data,
            mimeType: userMessage.image.mimeType
          }
        };
      }

      console.log('[DEBUG] Sending to API:', {
        hasImage: !!cleanedUserInput?.image,
        imageDataLength: cleanedUserInput?.image?.data?.length,
        imageDataPreview: cleanedUserInput?.image?.data?.substring(0, 50),
        mimeType: cleanedUserInput?.image?.mimeType
      });

      // Call generate API with streaming
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          config: usePassword ? null : config,
          userInput: cleanedUserInput,
          chartType,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // Parse error response body if available
        let errorMessage = '生成代码失败';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If response body is not JSON, use status-based messages
          switch (response.status) {
            case 400:
              errorMessage = '请求参数错误，请检查输入内容';
              break;
            case 401:
            case 403:
              errorMessage = 'API 密钥无效或权限不足，请检查配置';
              break;
            case 429:
              errorMessage = '请求过于频繁，请稍后再试';
              break;
            case 500:
            case 502:
            case 503:
              errorMessage = '服务器错误，请稍后重试';
              break;
            default:
              errorMessage = `请求失败 (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedCode = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulatedCode += data.content;
                // Post-process and set the cleaned code to editor
                const processedCode = postProcessDrawioCode(accumulatedCode);
                setGeneratedCode(processedCode);
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // SSE parsing errors - show to user
              if (e.message && !e.message.includes('Unexpected')) {
                setApiError('数据流解析错误：' + e.message);
              }
              console.error('Failed to parse SSE:', e);
            }
          }
        }
      }

      // Try to parse and apply the generated code (already post-processed)
      const processedCode = postProcessDrawioCode(accumulatedCode);
      setGeneratedCode(processedCode);
      tryParseAndApply(processedCode);

      // Save to history (only for text input)
      if (userMessage && processedCode) {
        historyManager.addHistory({
          chartType,
          userInput: userMessage,
          generatedCode: processedCode,
          config: {
            name: config.name || config.type,
            model: config.model
          }
        });
      }
    } catch (error) {
      console.error('Error generating code:', error);

      // If user aborted, exit silently
      if (error.name === 'AbortError') {
        console.log('Generation aborted by user');
        return;
      }

      // Check if it's a network error
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        setApiError('网络连接失败，请检查网络连接');
      } else {
        setApiError(error.message);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Try to parse and apply code to canvas
  const tryParseAndApply = (code) => {
    try {
      setJsonError(null);
      const cleanedCode = code.trim();

      console.log('[DEBUG] tryParseAndApply - code preview:', cleanedCode.substring(0, 200));

      // 多层级截断检测
      const hasStart = cleanedCode.includes('<mxfile');
      const hasDiagram = cleanedCode.includes('<diagram');
      const hasModel = cleanedCode.includes('<mxGraphModel');
      const hasRoot = cleanedCode.includes('<root');

      const hasEndFile = cleanedCode.includes('</mxfile>');
      const hasEndDiagram = cleanedCode.includes('</diagram>');
      const hasEndModel = cleanedCode.includes('</mxGraphModel>');
      const hasEndRoot = cleanedCode.includes('</root>');

      // 检测任何层级的截断
      const isTruncatedCheck = (
        (hasStart && !hasEndFile) ||
        (hasDiagram && !hasEndDiagram) ||
        (hasModel && !hasEndModel) ||
        (hasRoot && !hasEndRoot)
      );

      if (isTruncatedCheck) {
        setIsTruncated(true);
        setCanContinue(true);

        // 生成详细的错误信息
        const missingTags = [];
        if (hasStart && !hasEndFile) missingTags.push('</mxfile>');
        if (hasDiagram && !hasEndDiagram) missingTags.push('</diagram>');
        if (hasModel && !hasEndModel) missingTags.push('</mxGraphModel>');
        if (hasRoot && !hasEndRoot) missingTags.push('</root>');

        setJsonError(`代码生成被截断，缺少闭合标签：${missingTags.join(', ')}。请点击"继续生成"按钮完成剩余部分。`);

        // Still try to apply the incomplete XML for preview
        setGeneratedXml(cleanedCode);
        setElements([]);
        return;
      } else {
        // Reset truncation state if complete
        setIsTruncated(false);
        setCanContinue(false);
      }

      // Try to extract XML from anywhere in the code (more flexible)
      const xmlMatch = cleanedCode.match(/<mxfile[\s\S]*?<\/mxfile>/);
      if (xmlMatch) {
        console.log('[DEBUG] Found XML, length:', xmlMatch[0].length);
        setGeneratedXml(xmlMatch[0]);
        setElements([]);
        return;
      }

      // Try to parse as JSON array
      const arrayMatch = cleanedCode.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) {
            setElements(parsed);
            setGeneratedXml('');
            return;
          }
        } catch (error) {
          console.error('Failed to parse JSON:', error);
        }
      }

      // If nothing found, show error
      console.log('[DEBUG] No XML or JSON found. Code length:', cleanedCode.length);
      setJsonError('代码中未找到有效的 JSON 数组或 XML。LLM 可能返回了解释性文字。');
      console.error('No array or XML found in generated code');
    } catch (error) {
      console.error('Failed to parse generated code:', error);
      if (error instanceof SyntaxError) {
        setJsonError('语法错误：' + error.message);
      } else {
        setJsonError('解析失败：' + error.message);
      }
    }
  };

  // Handle applying code from editor
  const handleApplyCode = async () => {
    setIsApplyingCode(true);
    try {
      // Simulate async operation for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      tryParseAndApply(generatedCode);
    } catch (error) {
      console.error('Error applying code:', error);
    } finally {
      setIsApplyingCode(false);
    }
  };

  // Handle optimizing code
  const handleOptimizeCode = async () => {
    setIsOptimizingCode(true);
    try {
      // XML doesn't need optimization, just reapply
      await new Promise(resolve => setTimeout(resolve, 300));
      tryParseAndApply(generatedCode);
    } catch (error) {
      console.error('Error applying code:', error);
    } finally {
      setIsOptimizingCode(false);
    }
  };

  // Handle clearing code
  const handleClearCode = () => {
    setGeneratedCode('');
  };

  // Handle opening optimization panel
  const handleOpenOptimizationPanel = () => {
    if (!generatedCode.trim()) {
      setNotification({
        isOpen: true,
        title: '提示',
        message: '请先生成图表代码',
        type: 'warning'
      });
      return;
    }
    setIsOptimizationPanelOpen(true);
  };

  // Handle advanced optimization
  const handleAdvancedOptimize = async (suggestions) => {
    if (!generatedCode.trim()) {
      return;
    }

    setIsOptimizationPanelOpen(false);

    // Build optimization prompt
    const optimizationPrompt = createOptimizationPrompt(generatedCode, suggestions);

    // Use optimization system prompt
    const usePassword = typeof window !== 'undefined' && localStorage.getItem('smart-excalidraw-use-password') === 'true';
    const accessPassword = typeof window !== 'undefined' ? localStorage.getItem('smart-excalidraw-access-password') : '';

    if (!usePassword && !isConfigValid(config)) {
      setNotification({
        isOpen: true,
        title: '配置提醒',
        message: '请先配置您的 LLM 提供商或启用访问密码',
        type: 'warning'
      });
      setIsConfigManagerOpen(true);
      return;
    }

    setIsGenerating(true);
    setApiError(null);
    setJsonError(null);

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (usePassword && accessPassword) {
        headers['x-access-password'] = accessPassword;
      }

      let finalConfig = usePassword ? null : config;
      if (usePassword && accessPassword) {
        // Server will use server-side config
        finalConfig = null;
      }

      // Call generate API with optimization prompt
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          config: finalConfig,
          userInput: optimizationPrompt,
          chartType: 'auto',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorMessage = '优化失败';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          errorMessage = `请求失败 (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedCode = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulatedCode += data.content;
                const processedCode = postProcessDrawioCode(accumulatedCode);
                setGeneratedCode(processedCode);
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              if (e.message && !e.message.includes('Unexpected')) {
                setApiError('数据流解析错误：' + e.message);
              }
              console.error('Failed to parse SSE:', e);
            }
          }
        }
      }

      // Apply optimized code
      const processedCode = postProcessDrawioCode(accumulatedCode);
      setGeneratedCode(processedCode);
      tryParseAndApply(processedCode);

      setNotification({
        isOpen: true,
        title: '优化完成',
        message: '图表已成功优化',
        type: 'info'
      });
    } catch (error) {
      console.error('Error optimizing code:', error);

      // If user aborted, exit silently
      if (error.name === 'AbortError') {
        console.log('Optimization aborted by user');
        return;
      }

      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        setApiError('网络连接失败，请检查网络连接');
      } else {
        setApiError(error.message);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Handle continuing truncated generation
  const handleContinueGeneration = async () => {
    if (!generatedCode.trim() || !isTruncated) {
      return;
    }

    const usePassword = typeof window !== 'undefined' && localStorage.getItem('smart-excalidraw-use-password') === 'true';
    const accessPassword = typeof window !== 'undefined' ? localStorage.getItem('smart-excalidraw-access-password') : '';

    if (!usePassword && !isConfigValid(config)) {
      setNotification({
        isOpen: true,
        title: '配置提醒',
        message: '请先配置您的 LLM 提供商或启用访问密码',
        type: 'warning'
      });
      setIsConfigManagerOpen(true);
      return;
    }

    setIsGenerating(true);
    setApiError(null);
    setJsonError(null);
    setCanContinue(false); // Disable continue button during generation

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (usePassword && accessPassword) {
        headers['x-access-password'] = accessPassword;
      }

      let finalConfig = usePassword ? null : config;

      // Build continuation prompt
      const continuationPrompt = createContinuationPrompt(generatedCode);

      // Call generate API with continuation prompt and flag
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          config: finalConfig,
          userInput: continuationPrompt,
          chartType: 'auto',
          isContinuation: true, // Flag to use CONTINUATION_SYSTEM_PROMPT
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorMessage = '续写失败';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          errorMessage = `请求失败 (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedCode = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulatedCode += data.content;

                // 智能拼接：去除 LLM 可能重复的开始标签
                let continuationCode = accumulatedCode.trim();

                // 去除可能重复的 XML 声明和开始标签
                continuationCode = continuationCode.replace(/^<\?xml[^>]*>\s*/i, '');
                continuationCode = continuationCode.replace(/^<mxfile[^>]*>\s*/i, '');
                continuationCode = continuationCode.replace(/^<diagram[^>]*>\s*/i, '');
                continuationCode = continuationCode.replace(/^<mxGraphModel[^>]*>\s*/i, '');
                continuationCode = continuationCode.replace(/^<root>\s*/i, '');

                // 拼接：原代码 + 清理后的续写代码
                const completeCode = generatedCode + '\n' + continuationCode;
                const processedCode = postProcessDrawioCode(completeCode);
                setGeneratedCode(processedCode);
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Try to parse and apply the completed code
      // 智能拼接：去除 LLM 可能重复的开始标签
      let continuationCode = accumulatedCode.trim();

      // 去除可能重复的 XML 声明和开始标签
      continuationCode = continuationCode.replace(/^<\?xml[^>]*>\s*/i, '');
      continuationCode = continuationCode.replace(/^<mxfile[^>]*>\s*/i, '');
      continuationCode = continuationCode.replace(/^<diagram[^>]*>\s*/i, '');
      continuationCode = continuationCode.replace(/^<mxGraphModel[^>]*>\s*/i, '');
      continuationCode = continuationCode.replace(/^<root>\s*/i, '');

      // 拼接：原代码 + 清理后的续写代码
      const completeCode = generatedCode + '\n' + continuationCode;
      const processedCode = postProcessDrawioCode(completeCode);
      setGeneratedCode(processedCode);
      tryParseAndApply(processedCode);

      // Save to history
      if (processedCode) {
        historyManager.addHistory({
          chartType: currentChartType,
          userInput: currentInput + ' (续写)',
          generatedCode: processedCode,
          config: {
            name: config?.name || config?.type || 'server',
            model: config?.model || 'unknown'
          }
        });
      }
    } catch (error) {
      console.error('Error continuing generation:', error);

      // If user aborted, exit silently
      if (error.name === 'AbortError') {
        console.log('Continuation aborted by user');
        return;
      }

      // Check if it's a network error
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        setApiError('网络连接失败，请检查网络连接');
      } else {
        setApiError(error.message);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Handle config selection from manager
  const handleConfigSelect = (selectedConfig) => {
    if (selectedConfig) {
      setConfig(selectedConfig);
    }
  };

  // Handle applying history
  const handleApplyHistory = (history) => {
    setCurrentInput(history.userInput);
    setCurrentChartType(history.chartType);
    setGeneratedCode(history.generatedCode);
    tryParseAndApply(history.generatedCode);
  };

  // Handle horizontal resizing (left panel vs right panel)
  const handleHorizontalMouseDown = (e) => {
    setIsResizingHorizontal(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingHorizontal || !layoutRef.current) return;

      const rect = layoutRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;

      setLeftPanelWidth(Math.min(Math.max(percentage, 20), 80));
    };

    const handleMouseUp = () => {
      setIsResizingHorizontal(false);
    };

    if (isResizingHorizontal) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingHorizontal]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
        <div>
          <h1 className="text-lg font-semibold font-heading text-foreground">Drawio</h1>
          <p className="text-xs text-muted-foreground">AI 驱动的图表生成</p>
        </div>
        <div className="flex items-center space-x-3">
          {(usePassword || (config && isConfigValid(config))) && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 rounded border border-green-300">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-900 font-medium">
                {usePassword ? '密码访问' : `${config.name || config.type} - ${config.model}`}
              </span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded hover:bg-muted transition-colors duration-200"
            >
              历史记录
            </button>
            <button
              onClick={() => setIsAccessPasswordModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded hover:bg-muted transition-colors duration-200"
            >
              访问密码
            </button>
            <button
              onClick={() => setIsConfigManagerOpen(true)}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary border border-primary rounded hover:bg-primary-hover transition-colors duration-200"
            >
              管理配置
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div ref={layoutRef} className="flex flex-1 overflow-hidden pb-1">
        {/* Left Panel - Chat and Code Editor */}
        <div id="left-panel" style={{ width: `${leftPanelWidth}%` }} className="flex flex-col border-r border-border bg-card">
          {/* API Error Banner */}
          {apiError && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-start justify-between">
              <div className="flex items-start space-x-2 min-w-0 flex-1">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-red-800">请求失败</p>
                  <p className="text-xs text-red-700 mt-1 break-words">{apiError}</p>
                </div>
              </div>
              <button
                onClick={() => setApiError(null)}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Input Section */}
          <div style={{ height: '50%' }} className="overflow-auto">
            <Chat
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
              initialInput={currentInput}
              initialChartType={currentChartType}
              onStop={handleStopGeneration}
            />
          </div>

          {/* Code Editor Section */}
          <div style={{ height: '50%' }} className="overflow-hidden">
            <CodeEditor
              code={generatedCode}
              onChange={setGeneratedCode}
              onApply={handleApplyCode}
              onOptimize={handleOptimizeCode}
              onAdvancedOptimize={handleOpenOptimizationPanel}
              onClear={handleClearCode}
              jsonError={jsonError}
              onClearJsonError={() => setJsonError(null)}
              isGenerating={isGenerating}
              isApplyingCode={isApplyingCode}
              isOptimizingCode={isOptimizingCode}
              isTruncated={isTruncated}
              canContinue={canContinue}
              onContinue={handleContinueGeneration}
            />
          </div>
        </div>

        {/* Horizontal Resizer */}
        <div
          onMouseDown={handleHorizontalMouseDown}
          className="w-1 bg-border hover:bg-primary/60 cursor-col-resize transition-colors duration-200 flex-shrink-0"
        />

        {/* Right Panel - Drawio Canvas */}
        <div
          style={{ width: `${100 - leftPanelWidth}%`, height: '100%' }}
          className={`relative bg-canvas border-l border-border shadow-inner ${
            isResizingHorizontal ? 'select-none' : ''
          }`}
        >
          {isResizingHorizontal && (
            <div className="absolute inset-0 z-10 cursor-col-resize" />
          )}
          <DrawioCanvas
            elements={elements}
            xml={generatedXml}
            disablePointerEvents={isResizingHorizontal}
          />
        </div>
      </div>

      {/* Config Manager Modal */}
      <ConfigManager
        isOpen={isConfigManagerOpen}
        onClose={() => setIsConfigManagerOpen(false)}
        onConfigSelect={handleConfigSelect}
      />

      {/* Footer */}
      <footer className="bg-card border-t border-border px-6 py-3">
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <span>Drawio  |  Powered by WolfHolo</span>
        </div>
      </footer>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onApply={handleApplyHistory}
      />

      {/* Access Password Modal */}
      <AccessPasswordModal
        isOpen={isAccessPasswordModalOpen}
        onClose={() => setIsAccessPasswordModalOpen(false)}
      />

      {/* Optimization Panel */}
      <OptimizationPanel
        isOpen={isOptimizationPanelOpen}
        onClose={() => setIsOptimizationPanelOpen(false)}
        onOptimize={handleAdvancedOptimize}
        isOptimizing={isGenerating}
      />

      {/* Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      {/* Notification */}
      <Notification
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
