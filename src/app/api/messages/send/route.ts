import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { spaceId, content, messageType = 'text', expiresMode = 'never', replyToId } = body

    if (!spaceId || (!content && messageType === 'text')) {
      return NextResponse.json({ error: 'Missing spaceId or message content' }, { status: 400 })
    }

    let senderId = 'demo-user-1'

    // If Supabase is connected, verify user and insert authoritative message record
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    ) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 })
      }

      senderId = user.id

      // Verify membership
      const { data: membership } = await supabase
        .from('private_space_members')
        .select('role')
        .eq('space_id', spaceId)
        .eq('user_id', senderId)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Forbidden: Caller is not a space member' }, { status: 403 })
      }

      // Find or create conversation
      let { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('space_id', spaceId)
        .single()

      if (!conv) {
        const serviceClient = createServiceClient()
        const { data: newConv } = await serviceClient
          .from('conversations')
          .insert({ space_id: spaceId })
          .select('id')
          .single()
        conv = newConv
      }

      if (!conv) {
        return NextResponse.json({ error: 'Failed to resolve conversation' }, { status: 500 })
      }

      // Insert message with RLS check
      const { data: newMsg, error: insertErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conv.id,
          space_id: spaceId,
          sender_id: senderId,
          content,
          message_type: messageType,
          reply_to_id: replyToId || null,
          expires_mode: expiresMode,
        })
        .select('*')
        .single()

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
      }

      return NextResponse.json({ message: newMsg })
    }

    // Demo/offline response when Supabase is not yet populated
    return NextResponse.json({
      message: {
        id: `msg-${Date.now()}`,
        space_id: spaceId,
        sender_id: senderId,
        content,
        message_type: messageType,
        expires_mode: expiresMode,
        created_at: new Date().toISOString(),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
