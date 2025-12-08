type CurrentUser = {
  name: string
  title: string
}

type SubmitApprovalParams = {
  backendUrl: string
  isVoice: boolean
  threadId: string
  currentUser: CurrentUser
  role: string
  approved: boolean
  autoPlayAudio?: boolean
}

type SubmitApprovalResult = {
  data: any
  finalContent: string
  audioUrl?: string
  voiceText?: string
}

const fallbackMessage = (approved: boolean) =>
  approved ? "The operation has been approved and executed." : "The operation has been rejected."

export async function submitApproval({
  backendUrl,
  isVoice,
  threadId,
  currentUser,
  role,
  approved,
  autoPlayAudio = true,
}: SubmitApprovalParams): Promise<SubmitApprovalResult> {
  let response: Response

  if (isVoice) {
    const formData = new FormData()
    formData.append("employee_id", threadId)
    formData.append("employee_name", currentUser.name || "")
    formData.append("job_title", currentUser.title || "")
    formData.append("role", role)
    formData.append(
      "resume",
      JSON.stringify({
        approved: approved,
        user_feedback: approved ? "Approved" : "Rejected",
      })
    )

    response = await fetch(`${backendUrl}/voice`, {
      method: "POST",
      body: formData,
    })
  } else {
    response = await fetch(`${backendUrl}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employee_id: threadId,
        resume: {
          approved: approved,
          user_feedback: approved ? "Approved" : "Rejected",
        },
      }),
    })
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    throw new Error(`Backend error (${response.status}): ${errorText}`)
  }

  const data = await response.json()

  let finalContent = ""
  if (data.type === "final") {
    finalContent = data.data
  } else if (data.type === "voice_final") {
    finalContent = data.text || data.voice_text
  }
  if (!finalContent) {
    finalContent = fallbackMessage(approved)
  }

  if (autoPlayAudio && isVoice && data.type === "voice_final" && data.audio_url) {
    try {
      const audio = new Audio(data.audio_url)
      await audio.play()
    } catch {
      // Ignore audio playback errors; text has already rendered
    }
  }

  return {
    data,
    finalContent,
    audioUrl: data.audio_url,
    voiceText: data.voice_text,
  }
}

