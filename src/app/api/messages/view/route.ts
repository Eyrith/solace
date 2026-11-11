import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messageId } = body

    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 })
    }

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    ) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Call the stored procedure: mark_message_viewed
      const { error: rpcErr } = await supabase.rpc('mark_message_viewed', {
        p_message_id: messageId,
        p_user_id: user.id,
      })

      if (rpcErr) {
        return NextResponse.json({ error: rpcErr.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, messageId })
    }

    return NextResponse.json({ success: true, messageId, demo: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

