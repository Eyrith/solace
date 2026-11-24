import { createClient } from '@/lib/supabase/server'
import type { ContentThought, ContentType, DiscourseThread, DiscourseMessage } from './types'

export async function getUserThoughts(
  contentType?: ContentType,
  contentId?: string
): Promise<ContentThought[]> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) return []

    let q = supabase
      .from('content_thoughts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (contentType) {
      q = q.eq('content_type', contentType)
    }
    if (contentId) {
      q = q.eq('content_id', contentId)
    }

    const { data, error } = await q
    if (error || !data) return []

    return data.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      contentType: r.content_type,
      contentId: r.content_id,
      anchorText: r.anchor_text,
      anchorOffsetStart: r.anchor_offset_start,
      anchorOffsetEnd: r.anchor_offset_end,
      thoughtBody: r.thought_body,
      tags: r.tags || [],
      isPrivate: Boolean(r.is_private),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  } catch {
    return []
  }
}

export async function createThought(input: {
  contentType: ContentType
  contentId: string
  thoughtBody: string
  anchorText?: string
  tags?: string[]
}): Promise<{ success: boolean; thought?: ContentThought; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) return { success: false, error: 'Authentication required' }

    const { data, error } = await supabase
      .from('content_thoughts')
      .insert({
        user_id: userId,
        content_type: input.contentType,
        content_id: input.contentId,
        thought_body: input.thoughtBody.trim(),
        anchor_text: input.anchorText || null,
        tags: input.tags || [],
        is_private: true,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    return {
      success: true,
      thought: {
        id: data.id,
        userId: data.user_id,
        contentType: data.content_type,
        contentId: data.content_id,
        anchorText: data.anchor_text,
        anchorOffsetStart: data.anchor_offset_start,
        anchorOffsetEnd: data.anchor_offset_end,
        thoughtBody: data.thought_body,
        tags: data.tags || [],
        isPrivate: Boolean(data.is_private),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create thought' }
  }
}

export async function deleteThought(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('content_thoughts').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete thought' }
  }
}

export async function getUserDiscourseThreads(): Promise<DiscourseThread[]> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) return []

    const { data, error } = await supabase
      .from('discourse_threads')
      .select(`
        id,
        origin_thought_id,
        author_id,
        recipient_id,
        content_type,
        content_id,
        status,
        created_at,
        updated_at,
        origin_thought:content_thoughts(id, user_id, content_type, content_id, thought_body, anchor_text, tags),
        author:profiles!discourse_threads_author_id_fkey(id, display_name, avatar_url),
        recipient:profiles!discourse_threads_recipient_id_fkey(id, display_name, avatar_url),
        messages:discourse_messages(id, thread_id, sender_id, content, created_at)
      `)
      .order('updated_at', { ascending: false })

    if (error || !data) return []

    return data.map((r: any) => ({
      id: r.id,
      originThoughtId: r.origin_thought_id,
      authorId: r.author_id,
      recipientId: r.recipient_id,
      contentType: r.content_type,
      contentId: r.content_id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      author: r.author
        ? { id: r.author.id, displayName: r.author.display_name, avatarUrl: r.author.avatar_url }
        : undefined,
      recipient: r.recipient
        ? { id: r.recipient.id, displayName: r.recipient.display_name, avatarUrl: r.recipient.avatar_url }
        : undefined,
      originThought: r.origin_thought
        ? {
            id: r.origin_thought.id,
            userId: r.origin_thought.user_id,
            contentType: r.origin_thought.content_type,
            contentId: r.origin_thought.content_id,
            thoughtBody: r.origin_thought.thought_body,
            anchorText: r.origin_thought.anchor_text,
            tags: r.origin_thought.tags || [],
            isPrivate: true,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }
        : undefined,
      messages: (r.messages || []).map((m: any) => ({
        id: m.id,
        threadId: m.thread_id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
      })),
    }))
  } catch {
    return []
  }
}

export async function initiateDiscourse(input: {
  originThoughtId: string
  recipientId: string
  contentType: ContentType
  contentId: string
  initialMessage?: string
}): Promise<{ success: boolean; threadId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) return { success: false, error: 'Authentication required' }

    if (userId === input.recipientId) {
      return { success: false, error: 'Cannot initiate discourse with yourself' }
    }

    const { data: thread, error: threadErr } = await supabase
      .from('discourse_threads')
      .insert({
        origin_thought_id: input.originThoughtId,
        author_id: userId,
        recipient_id: input.recipientId,
        content_type: input.contentType,
        content_id: input.contentId,
        status: 'active',
      })
      .select('id')
      .single()

    if (threadErr) return { success: false, error: threadErr.message }

    if (input.initialMessage && input.initialMessage.trim()) {
      await supabase.from('discourse_messages').insert({
        thread_id: thread.id,
        sender_id: userId,
        content: input.initialMessage.trim(),
      })
    }

    return { success: true, threadId: thread.id }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to initiate discourse' }
  }
}

export async function sendDiscourseMessage(
  threadId: string,
  content: string,
  parentMessageId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) return { success: false, error: 'Authentication required' }

    const { data, error } = await supabase
      .from('discourse_messages')
      .insert({
        thread_id: threadId,
        sender_id: userId,
        parent_message_id: parentMessageId || null,
        content: content.trim(),
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    await supabase
      .from('discourse_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId)

    return { success: true, messageId: data.id }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send message' }
  }
}
