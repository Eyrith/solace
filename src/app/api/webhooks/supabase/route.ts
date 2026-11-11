import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
    const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization')

    if (webhookSecret && authHeader !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized webhook call' }, { status: 401 })
    }

    const payload = await request.json()
    const { type, table, record, old_record } = payload

    // 1. Handle auto-cleanup trigger on message expiration
    if (type === 'DELETE' && table === 'messages' && old_record) {
      // If message had media attachment, purge the corresponding storage files
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
      ) {
        const supabase = createServiceClient()
        // Query attachments for this message if logged
        const { data: attachments } = await supabase
          .from('message_attachments')
          .select('storage_path')
          .eq('message_id', old_record.id)

        if (attachments && attachments.length > 0) {
          const filePaths = attachments.map((a) => a.storage_path)
          await supabase.storage.from('sanctuary-media').remove(filePaths)
        }
      }
    }

    return NextResponse.json({ received: true, table, type })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
