'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBettingHouse } from '@/hooks/useBettingHouse'
import { useAccount } from 'wagmi'
import FileUpload from '@/components/FileUpload'
import toast from 'react-hot-toast'

type Proof = { url: string; note: string; createdAt: number }

export default function ProofClient({ id }: { id: string }) {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { submitProof, isSubmitting } = useBettingHouse()
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [uploadedFileUrl, setUploadedFileUrl] = useState('')
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload')

  // Use the id from the URL path as the betId
  const betId = Number(id)

  const storageKey = useMemo(() => `dare-proof:${id}`, [id])

  // Redirect if wallet is not connected
  useEffect(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet to submit proof')
      router.replace('/')
      return
    }
  }, [isConnected, router])

  // Don't render the page if wallet is not connected
  if (!isConnected) {
    return (
      <main className="min-h-dvh bg-gray-50 text-foreground pb-24 flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#6A33FF] border-t-transparent"></div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900 mb-2">Wallet Required</div>
            <div className="text-sm text-gray-600">
              Please connect your wallet to submit proof
            </div>
          </div>
        </div>
      </main>
    )
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const p = JSON.parse(raw) as Proof
        setUrl(p.url || '')
        setNote(p.note || '')
      }
    } catch {}
  }, [storageKey])

  const save = () => {
    const p: Proof = { url: url.trim(), note: note.trim(), createdAt: Date.now() }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(p))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
  }

  const submitProofToContract = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!betId) {
      toast.error("Bet ID not found");
      return;
    }

    // Determine which URL to use (uploaded file or manual URL)
    const finalUrl = uploadedFileUrl || url.trim();

    if (!finalUrl) {
      toast.error("Please upload a file or provide a proof URL");
      return;
    }

    const proofText = note.trim() ? `${finalUrl} - ${note.trim()}` : finalUrl;

    const result = await submitProof(betId, proofText);
    if (result.success) {
      save(); // Save to local storage as well
      toast.success("Proof submitted successfully!");
      openReview();
    }
  }

  const openReview = () => {
    router.push(`/dare/${id}/review`)
  }

  const handleFileUploadSuccess = (fileUrl: string) => {
    setUploadedFileUrl(fileUrl)
    // Clear manual URL when file is uploaded
    setUrl('')
    toast.success('File uploaded successfully! You can now submit your proof.')
  }

  const handleFileUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`)
  }

  return (
    <main className="min-h-dvh bg-gray-50 text-foreground pb-24">
      <div className="mx-auto w-full max-w-xl">
        <div className="relative overflow-hidden rounded-b-[32px] bg-[#6A33FF] text-white pt-8 pb-6 px-5 shadow-xl">
          <div className="text-center">
            <div className="font-display font-extrabold text-[24px]">Submit Your Proof</div>
            <div className="text-white/80 text-sm mt-1">Upload evidence or paste a link</div>
          </div>
        </div>

        <div className="px-4 py-5 space-y-5">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'url')}>
            <TabsList className="grid w-full grid-cols-2 bg-white rounded-2xl p-1 shadow-sm border-0">
              <TabsTrigger
                value="upload"
                className="rounded-xl data-[state=active]:bg-[#6A33FF] data-[state=active]:text-white data-[state=active]:shadow-sm font-medium text-sm"
              >
                📁 Upload File
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="rounded-xl data-[state=active]:bg-[#6A33FF] data-[state=active]:text-white data-[state=active]:shadow-sm font-medium text-sm"
              >
                🔗 Paste URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-5">
              <FileUpload
                betId={betId}
                onUploadSuccess={handleFileUploadSuccess}
                onUploadError={handleFileUploadError}
                disabled={isSubmitting}
              />
              {uploadedFileUrl && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ File uploaded successfully!
                    <a
                      href={uploadedFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 underline hover:no-underline"
                    >
                      View file
                    </a>
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="url" className="space-y-4 mt-5">
              <div className="space-y-2">
                <div className="text-[13px] font-semibold text-gray-700">Proof URL</div>
                <Input
                  id="url"
                  placeholder="https://imgur.com/abc123 or https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    // Clear uploaded file URL when manual URL is entered
                    if (e.target.value.trim()) {
                      setUploadedFileUrl('')
                    }
                  }}
                  className="h-11 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <div className="text-[13px] font-semibold text-gray-700">Note (optional)</div>
            <Input
              id="note"
              placeholder="Any additional context about your proof"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11 rounded-2xl bg-white focus-visible:ring-[#6A33FF] border-transparent shadow-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={openReview}
              className="flex-1 h-11 rounded-2xl border-gray-200 hover:bg-gray-50"
            >
              Go to review
            </Button>
            <Button
              variant="outline"
              onClick={save}
              className="flex-1 h-11 rounded-2xl border-gray-200 hover:bg-gray-50"
            >
              {saved ? '✓ Saved' : 'Save locally'}
            </Button>
            <Button
              onClick={submitProofToContract}
              disabled={isSubmitting || !isConnected || !betId || (!uploadedFileUrl && !url.trim())}
              className="flex-1 h-11 rounded-2xl bg-[#6A33FF] hover:bg-[#5A2BD8] text-white font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Proof'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}


