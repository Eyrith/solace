import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Space name is required' }, { status: 400 })
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

      const serviceClient = createServiceClient()

      // 1. Create space
      const { data: space, error: spaceErr } = await serviceClient
        .from('private_spaces')
        .insert({
          name: name.trim(),
          created_by: user.id,
        })
        .select('*')
        .single()

      if (spaceErr || !space) {
        return NextResponse.json({ error: spaceErr?.message || 'Failed to create space' }, { status: 500 })
      }

      // 2. Add creator as owner member
      await serviceClient.from('private_space_members').insert({
        space_id: space.id,
        user_id: user.id,
        role: 'owner',
      })

      // 3. Create conversation container
      await serviceClient.from('conversations').insert({
        space_id: space.id,
      })

      return NextResponse.json({ space })
    }

    return NextResponse.json({
      space: {
        id: `space-${Date.now()}`,
        name: name.trim(),
        created_at: new Date().toISOString(),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
