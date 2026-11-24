'use server'

import { revalidatePath } from 'next/cache'
import {
  createThought,
  deleteThought,
  initiateDiscourse,
  sendDiscourseMessage,
} from '@/lib/discourse/discourse-service'
import type { ContentType } from '@/lib/discourse/types'

export async function createThoughtAction(input: {
  contentType: ContentType
  contentId: string
  thoughtBody: string
  anchorText?: string
  tags?: string[]
}) {
  const res = await createThought(input)
  if (res.success) {
    revalidatePath('/discourse')
    revalidatePath('/my-space')
  }
  return res
}

export async function deleteThoughtAction(id: string) {
  const res = await deleteThought(id)
  if (res.success) {
    revalidatePath('/discourse')
    revalidatePath('/my-space')
  }
  return res
}

export async function initiateDiscourseAction(input: {
  originThoughtId: string
  recipientId: string
  contentType: ContentType
  contentId: string
  initialMessage?: string
}) {
  const res = await initiateDiscourse(input)
  if (res.success) {
    revalidatePath('/discourse')
    revalidatePath('/my-space')
  }
  return res
}

export async function sendDiscourseMessageAction(
  threadId: string,
  content: string,
  parentMessageId?: string
) {
  const res = await sendDiscourseMessage(threadId, content, parentMessageId)
  if (res.success) {
    revalidatePath(`/discourse/${threadId}`)
    revalidatePath('/discourse')
  }
  return res
}
