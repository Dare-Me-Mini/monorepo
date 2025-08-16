import { createClient } from '@supabase/supabase-js'
import { validatePublicEnv } from './env'

const env = validatePublicEnv()

// Create a single supabase client for interacting with your database
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey)

// Storage bucket name for proof files
export const PROOF_BUCKET = 'dare-me'

// Supported file types for proof uploads
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
]

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/mov',
  'video/avi',
  'video/webm',
  'video/quicktime'
]

export const SUPPORTED_FILE_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES]

// Maximum file size (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024

// File validation function
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file selected' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size must be less than 50MB' }
  }

  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return { isValid: false, error: 'File type not supported. Please upload an image or video file.' }
  }

  return { isValid: true }
}

// Generate unique filename for proof uploads
export const generateProofFileName = (betId: number, originalFileName: string): string => {
  const timestamp = Date.now()
  const extension = originalFileName.split('.').pop()
  return `proof-${betId}-${timestamp}.${extension}`
}

// Upload file to Supabase storage
export const uploadProofFile = async (
  file: File,
  betId: number,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Validate file
    const validation = validateFile(file)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }



    // Generate unique filename
    const fileName = generateProofFileName(betId, file.name)

    // Simulate progress for better UX (Supabase doesn't provide real-time progress)
    if (onProgress) {
      onProgress(10)
    }

    // Upload file to Supabase storage
    const { error } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (onProgress) {
      onProgress(80)
    }

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: `Upload failed: ${error.message}` }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(PROOF_BUCKET)
      .getPublicUrl(fileName)

    if (onProgress) {
      onProgress(100)
    }

    if (!urlData?.publicUrl) {
      return { success: false, error: 'Failed to get public URL' }
    }

    return { success: true, url: urlData.publicUrl }
  } catch (error: any) {
    console.error('Upload error:', error)
    return { success: false, error: error.message || 'Upload failed' }
  }
}

// Get file type category for display purposes
export const getFileTypeCategory = (fileType: string): 'image' | 'video' | 'unknown' => {
  if (SUPPORTED_IMAGE_TYPES.includes(fileType)) {
    return 'image'
  }
  if (SUPPORTED_VIDEO_TYPES.includes(fileType)) {
    return 'video'
  }
  return 'unknown'
}

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}






