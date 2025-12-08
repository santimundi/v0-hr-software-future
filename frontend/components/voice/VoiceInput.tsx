"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Mic, X, Check, Loader2, Volume2, PlayCircle, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VoiceInputProps {
  employeeId: string
  employeeName: string
  jobTitle: string
  role?: string
  onTranscript?: (transcript: string) => void
  onResponse?: (text: string, audioUrl: string, voiceText?: string) => void
  onError?: (error: string) => void
  onInterrupt?: (interrupts: any[]) => void
  className?: string
  disabled?: boolean
}

type VoiceState = "idle" | "recording" | "processing" | "playing"

export function VoiceInput({
  employeeId,
  employeeName,
  jobTitle,
  role = "employee",
  onTranscript,
  onResponse,
  onError,
  onInterrupt,
  className,
  disabled = false,
}: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>("idle")
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRecording()
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.src = ""
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []
      setRecordingTime(0)

      // Prefer webm but fall back to other formats
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/ogg"

      // Hint the browser to keep bitrate modest to reduce payload size.
      // (May be ignored by some browsers.)
      const mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(250) // Collect data every 250ms
      setState("recording")

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to access microphone"
      onError?.(errorMsg)
      setState("idle")
    }
  }, [onError])

  const stopRecordingStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const cancelRecording = useCallback(() => {
    stopRecordingStream()
    audioChunksRef.current = []
    setRecordingTime(0)
    setState("idle")
  }, [stopRecordingStream])

  const confirmRecording = useCallback(async () => {
    // Stop the media recorder - this will trigger ondataavailable for remaining data
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    
    // Wait a bit for final data chunk
    await new Promise(resolve => setTimeout(resolve, 100))
    
    stopRecordingStream()
    setRecordingTime(0)
    setState("processing")

    // Get the mimeType from the recorder
    const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm"
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
    
    if (audioBlob.size === 0) {
      onError?.("No audio recorded")
      setState("idle")
      return
    }

    await sendAudioToBackend(audioBlob, mimeType)
  }, [stopRecordingStream, onError])

  const sendAudioToBackend = async (audioBlob: Blob, mimeType: string) => {
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      formData.append("employee_id", employeeId)
      formData.append("employee_name", employeeName)
      formData.append("job_title", jobTitle)
      formData.append("role", role)

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      const response = await fetch(`${backendUrl}/voice`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new Error(`Voice API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()

      // Handle interrupt (HITL)
      if (data.type === "interrupt") {
        onTranscript?.(data.transcript || "")
        onInterrupt?.(data.interrupts || [])
        setState("idle")
        return
      }

      // Handle voice response
      if (data.type === "voice_final") {
        const chatText = data.text || ""
        const voiceText = data.voice_text || chatText

        onTranscript?.(data.transcript || "")
        onResponse?.(chatText, data.audio_url || "", voiceText)
        setAudioUrl(data.audio_url || "")

        // Auto-play audio response
        if (data.audio_url) {
          playAudio(data.audio_url)
        } else {
          setState("idle")
        }
      } else {
        setState("idle")
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to process voice input"
      onError?.(errorMsg)
      setState("idle")
    }
  }

  const playAudio = useCallback((url: string) => {
    if (!url) return

    // Stop any existing playback
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
    }

    const audio = new Audio(url)
    audioPlayerRef.current = audio

    audio.onplay = () => {
      setIsAudioPlaying(true)
      setState("playing")
    }

    audio.onended = () => {
      setIsAudioPlaying(false)
      setState("idle")
    }

    audio.onerror = () => {
      setIsAudioPlaying(false)
      setState("idle")
      onError?.("Failed to play audio response")
    }

    audio.play().catch((err) => {
      setIsAudioPlaying(false)
      setState("idle")
      onError?.("Failed to play audio: " + err.message)
    })
  }, [onError])

  const stopAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current.currentTime = 0
      setIsAudioPlaying(false)
      setState("idle")
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Idle state - show microphone button
  if (state === "idle") {
    return (
      <div className={cn("flex items-center shrink-0", className)} style={{ minWidth: '40px', minHeight: '40px' }}>
        <Button
          onClick={startRecording}
          disabled={disabled}
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full border-2 border-gray-400 dark:border-gray-500 hover:border-gray-600 dark:hover:border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 shadow-md"
          title="Start voice recording"
          style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Mic className="h-5 w-5 text-gray-700 dark:text-gray-200" strokeWidth={2} />
        </Button>
        
        {/* Replay button if there's a previous audio */}
        {audioUrl && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => playAudio(audioUrl)}
            className="h-8 w-8 ml-1"
            title="Replay last response"
          >
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>
    )
  }

  // Recording state - show waveform animation with X and ✓
  if (state === "recording") {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-full border border-red-500/30", className)}>
        {/* Cancel button */}
        <Button
          onClick={cancelRecording}
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-red-500/20"
          title="Cancel recording"
        >
          <X className="h-4 w-4 text-red-500" />
        </Button>

        {/* Recording indicator with animation */}
        <div className="flex items-center gap-2 px-2">
          <div className="flex items-center gap-1">
            {/* Animated waveform bars */}
            <div className="flex items-center gap-0.5 h-5">
              <div className="w-1 bg-red-500 rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
              <div className="w-1 bg-red-500 rounded-full animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
              <div className="w-1 bg-red-500 rounded-full animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
              <div className="w-1 bg-red-500 rounded-full animate-pulse" style={{ height: '80%', animationDelay: '450ms' }} />
              <div className="w-1 bg-red-500 rounded-full animate-pulse" style={{ height: '50%', animationDelay: '600ms' }} />
            </div>
          </div>
          <span className="text-sm font-medium text-red-500 min-w-[40px]">
            {formatTime(recordingTime)}
          </span>
        </div>

        {/* Confirm button */}
        <Button
          onClick={confirmRecording}
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-green-500/20"
          title="Send recording"
        >
          <Check className="h-4 w-4 text-green-500" />
        </Button>
      </div>
    )
  }

  // Processing state - show loading
  if (state === "processing") {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full border border-primary/30", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-primary">Processing...</span>
      </div>
    )
  }

  // Playing state - show audio playing indicator
  if (state === "playing") {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full border border-primary/30", className)}>
        <Volume2 className="h-5 w-5 text-primary animate-pulse" />
        <span className="text-sm text-primary">Playing response...</span>
        <Button
          onClick={stopAudio}
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full hover:bg-primary/20"
          title="Stop playback"
        >
          <Square className="h-3 w-3 text-primary" />
        </Button>
      </div>
    )
  }

  return null
}
