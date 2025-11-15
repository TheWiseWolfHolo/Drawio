'use client';

import { useState, useRef } from 'react';
import {
  validateImage,
  createImageObject,
  getImagePreviewUrl,
  formatFileSize,
  getFileExtension
} from '@/lib/image-utils';
import { CHART_TYPES } from '@/lib/constants';

export default function ImageUpload({ onImageSelect, isGenerating, chartType, onChartTypeChange, onImageGenerate, onStop }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(''); // '', 'uploading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  // 处理文件选择
  const handleFileSelect = async (file) => {
    if (!file) return;

    // 重置状态
    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      // 验证文件
      const validation = validateImage(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // 创建预览
      const previewUrl = await getImagePreviewUrl(file);
      setImagePreview(previewUrl);
      setSelectedFile(file);

      // 处理图片对象
      const imageObject = await createImageObject(file);

      setUploadStatus('success');

      // 回调父组件
      if (onImageSelect) {
        onImageSelect({
          ...imageObject,
          previewUrl,
          file
        });
      }
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error.message);
      console.error('图片处理失败:', error);
    }
  };

  // 文件输入变化处理
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 点击上传按钮
  const handleUploadClick = () => {
    if (!isGenerating && uploadStatus !== 'uploading') {
      fileInputRef.current?.click();
    }
  };

  // 拖拽处理
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 清除图片
  const handleClearImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setUploadStatus('');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageSelect) {
      onImageSelect(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* 图表类型选择器 */}
      <div className="w-full mb-4">
        {/* <label htmlFor="chart-type-image" className="block text-xs font-medium text-gray-700 mb-1">
          图表类型
        </label> */}
        <select
          id="chart-type-image"
          value={chartType}
          onChange={(e) => onChartTypeChange?.(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-input bg-card text-foreground rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
          disabled={isGenerating || uploadStatus === 'uploading'}
        >
          {Object.entries(CHART_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {!selectedFile ? (
        // 上传区域
        <div
          className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors duration-200 ${
            isDragging
              ? 'border-primary bg-accent/60'
              : 'border-border hover:border-primary'
          } bg-card`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-center mb-4 text-foreground">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground mb-3"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-foreground mb-1">上传图片进行识别</p>
            <p className="text-xs text-muted-foreground">
              支持 JPG、PNG、WebP、GIF 格式，最大 5MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isGenerating || uploadStatus === 'uploading'}
          />

          <button
            onClick={handleUploadClick}
            disabled={isGenerating || uploadStatus === 'uploading'}
            className="px-6 py-2 bg-primary text-primary-foreground text-sm rounded hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
          >
            {uploadStatus === 'uploading' ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                <span>处理中...</span>
              </>
            ) : isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                <span>生成中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span>选择图片</span>
              </>
            )}
          </button>

          {isDragging && (
            <p className="mt-3 text-sm text-primary">松开鼠标上传图片</p>
          )}
        </div>
      ) : (
        // 图片预览区域
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex justify-center relative bg-card rounded-lg overflow-hidden border border-border">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="预览"
                className="w-full object-contain"
              />
            )}

            {/* 删除按钮 */}
            <button
              onClick={handleClearImage}
              disabled={isGenerating || uploadStatus === 'uploading'}
              className="absolute top-3 right-3 p-2 bg-card rounded-full shadow-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              title="删除图片"
            >
              <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 成功状态指示器 */}
            {uploadStatus === 'success' && (
              <div className="absolute top-3 left-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}

            {/* 状态指示器 */}
            {uploadStatus === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/80">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* 图片信息 - 绝对定位在图片下方 */}
            {selectedFile && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                {/* TODO: 文字居中显示 */}
                <p className="text-xs font-medium text-white mb-1 truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
              </div>
            )}
          </div>

          {/* 错误消息 */}
          {errorMessage && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-xs text-red-600">{errorMessage}</p>
            </div>
          )}

          {/* 生成按钮 */}
          {uploadStatus === 'success' && (
            <div className="mt-2">
              {isGenerating ? (
                <button
                  onClick={onStop}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>停止生成</span>
                </button>
              ) : (
                <button
                  onClick={onImageGenerate}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>开始生成</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}