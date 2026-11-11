import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const spaceId = formData.get('spaceId') as string | null
    const messageId = formData.get('messageId') as string | null

    if (!file || !spaceId) {
      return NextResponse.json({ error: 'Missing file or spaceId' }, { status: 400 })
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

      // Verify space membership
      const { data: member } = await supabase
        .from('private_space_members')
        .select('role')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .single()

      if (!member) {
        return NextResponse.json({ error: 'Forbidden: Not a space member' }, { status: 403 })
      }

      const fileExt = file.name.split('.').pop() || 'dat'
      const filePath = `${spaceId}/${messageId || 'media'}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const serviceClient = createServiceClient()
      const fileBuffer = Buffer.from(await file.arrayBuffer())

      const { data: uploadData, error: uploadErr } = await serviceClient.storage
        .from('sanctuary-media')
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadErr || !uploadData) {
        return NextResponse.json({ error: uploadErr?.message || 'Storage upload failed' }, { status: 500 })
      }

      // If messageId provided, record attachment metadata
      if (messageId) {
        await serviceClient.from('message_attachments').insert({
          message_id: messageId,
          storage_path: uploadData.path,
          mime_type: file.type,
          file_size_bytes: file.size,
        })
      }

      // Create signed URL (valid for 1 hour)
      const { data: signedData } = await serviceClient.storage
        .from('sanctuary-media')
        .createSignedUrl(uploadData.path, 3600)

      return NextResponse.json({
        storagePath: uploadData.path,
        signedUrl: signedData?.signedUrl,
      })
    }

    return NextResponse.json({
      storagePath: `demo/${spaceId}/${file.name}`,
      signedUrl: URL.createObjectURL(file),
      demo: true,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
