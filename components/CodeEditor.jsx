'use client';

import { Editor } from '@monaco-editor/react';
import Spinner from './ui/Spinner';

export default function CodeEditor({ code, onChange, onApply, onOptimize, onAdvancedOptimize, onClear, jsonError, onClearJsonError, isGenerating, isApplyingCode, isOptimizingCode, isTruncated, canContinue, onContinue }) {
  return (
    <div className="flex relative flex-col h-full bg-card border-t border-border">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">生成的代码</h3>
        <div className="flex space-x-2">
          <button
            onClick={onClear}
            disabled={isGenerating || isApplyingCode || isOptimizingCode}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded hover:bg-muted disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
          >
            清除
            {isGenerating && (
              <Spinner size="sm" color="primary" />
            )}
          </button>
          {isTruncated && (
            <button
              onClick={onContinue}
              disabled={!canContinue || isGenerating}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
              title="继续生成剩余代码"
            >
              {isGenerating ? (
                <>
                  <Spinner size="sm" color="white" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <span>继续生成</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
                  </svg>
                </>
              )}
            </button>
          )}
          <button
            onClick={onOptimize}
            disabled={isGenerating || isApplyingCode || isOptimizingCode || !code.trim()}
            className="px-4 py-2 text-sm font-medium rounded text-accent-foreground border border-accent/40 hover:border-accent transition-colors duration-200 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            style={{ backgroundColor: 'var(--color-accent-soft)' }}
            title="优化图标布局和箭头连接"
          >
            {isOptimizingCode ? (
              <>
                <Spinner size="sm" color="primary" />
                <span>优化中...</span>
              </>
            ) : (
              <>
                <span>优化</span>
                {isGenerating && (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </>
            )}
          </button>
          <button
            onClick={onAdvancedOptimize}
            disabled={isGenerating || isApplyingCode || isOptimizingCode || !code.trim()}
            className="px-4 py-2 text-sm font-medium rounded text-accent-foreground border border-accent/50 hover:border-accent transition-colors duration-200 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            style={{ backgroundColor: 'var(--color-accent-strong)' }}
            title="高级优化选项"
          >
            <span>高级优化</span>
          </button>
          <button
            onClick={onApply}
            disabled={isGenerating || isApplyingCode || isOptimizingCode || !code.trim()}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary-active rounded hover:bg-primary disabled:bg-muted disabled:text-muted-foreground transition-colors duration-200 flex items-center gap-2 shadow-sm"
          >
            {isApplyingCode ? (
              <>
                <Spinner size="sm" color="white" />
                <span>应用中...</span>
              </>
            ) : (
              <>
                <span>应用</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                {isGenerating && <Spinner size="sm" color="white" />}
              </>
            )}
          </button>
        </div>
      </div>

      {/* JSON Error Banner */}
      {jsonError && (
        <div className="absolute bottom-0 z-1 border-b border-red-200 px-4 py-3 flex items-start justify-between bg-white" >
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-red-700 mt-1 font-mono" style={{ fontSize: '12px' }}>{jsonError}</p>
            </div>
          </div>
          <button
            onClick={onClearJsonError}
            className="text-red-600 hover:text-red-800 transition-colors ml-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onChange={onChange}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}

