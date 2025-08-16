'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileImage, FileVideo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  validateFile,
  uploadProofFile,
  getFileTypeCategory,
  formatFileSize,
  SUPPORTED_FILE_TYPES
} from '@/lib/supabase'
import toast from 'react-hot-toast'

interface FileUploadProps {
  betId: number
  onUploadSuccess: (url: string) => void
  onUploadError: (error: string) => void
  disabled?: boolean
}

export default function FileUpload({ betId, onUploadSuccess, onUploadError, disabled }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    const validation = validateFile(file)
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid file')
      onUploadError(validation.error || 'Invalid file')
      return
    }
    setSelectedFile(file)
  }, [onUploadError])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }, [disabled, handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const result = await uploadProofFile(
        selectedFile, 
        betId,
        (progress) => setUploadProgress(progress)
      )

      if (result.success && result.url) {
        toast.success('File uploaded successfully!')
        onUploadSuccess(result.url)
        setSelectedFile(null)
        setUploadProgress(0)
      } else {
        toast.error(result.error || 'Upload failed')
        onUploadError(result.error || 'Upload failed')
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed'
      toast.error(errorMessage)
      onUploadError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }



  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const fileTypeCategory = selectedFile ? getFileTypeCategory(selectedFile.type) : null
  const acceptedTypes = SUPPORTED_FILE_TYPES.join(',')

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div className={`border-2 border-dashed rounded-2xl transition-all duration-200 ${
        dragActive
          ? 'border-[#6A33FF] bg-purple-50 scale-[1.02]'
          : disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-[#6A33FF] hover:bg-purple-50/30'
      }`}>
        <div
          className="p-6 text-center cursor-pointer"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />
          
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                {fileTypeCategory === 'image' ? (
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                    <FileImage className="w-8 h-8 text-green-600" />
                  </div>
                ) : fileTypeCategory === 'video' ? (
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <FileVideo className="w-8 h-8 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 text-sm">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  clearFile()
                }}
                disabled={uploading}
                className="mx-auto rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  disabled ? 'bg-gray-100' : 'bg-purple-100'
                }`}>
                  <Upload className={`w-8 h-8 ${disabled ? 'text-gray-300' : 'text-[#6A33FF]'}`} />
                </div>
              </div>
              <div className="text-center">
                <p className={`text-base font-semibold ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                  {disabled ? 'Upload disabled' : 'Drop your file here or tap to browse'}
                </p>
                <p className={`text-sm mt-1 ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
                  Images and videos up to 50MB
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="text-gray-700">Uploading...</span>
            <span className="text-[#6A33FF]">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full h-2" />
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !uploading && (
        <Button
          onClick={handleUpload}
          disabled={disabled || uploading}
          className="w-full h-11 rounded-2xl bg-[#6A33FF] hover:bg-[#5A2BD8] text-white font-medium"
        >
          📤 Upload File
        </Button>
      )}



      {/* File Type Info */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded-2xl p-4 space-y-2">
        <div className="font-semibold text-gray-700 text-sm">Supported formats:</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <div><span className="font-medium">Images:</span> JPEG, PNG, GIF, WebP</div>
          <div><span className="font-medium">Videos:</span> MP4, MOV, AVI, WebM</div>
        </div>
        <div className="pt-1 border-t border-gray-200">
          <span className="font-medium">Max size:</span> 50MB
        </div>
      </div>
    </div>
  )
}
