import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { spaceId } = body

    if (!spaceId) {
      return NextResponse.json({ error: 'spaceId is required' }, { status: 400 })
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

      // Check user is space owner
      const { data: member } = await supabase
        .from('private_space_members')
        .select('role')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .single()

      if (!member || member.role !== 'owner') {
        return NextResponse.json({ error: 'Forbidden: Only space owners can generate invitations' }, { status: 403 })
      }

      // Check current member count
      const { count } = await supabase
        .from('private_space_members')
        .select('*', { count: 'exact', head: true })
        .eq('space_id', spaceId)

      if (count && count >= 2) {
        return NextResponse.json({ error: 'Space is already at maximum capacity (2 members)' }, { status: 400 })
      }

      const serviceClient = createServiceClient()
      const { data: invite, error: inviteErr } = await serviceClient
        .from('invitations')
        .insert({
          space_id: spaceId,
          created_by: user.id,
        })
        .select('*')
        .single()

      if (inviteErr || !invite) {
        return NextResponse.json({ error: inviteErr?.message || 'Failed to generate invitation' }, { status: 500 })
      }

      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.token}`

      return NextResponse.json({ invite, inviteUrl })
    }

    const demoToken = 'tok_' + Math.random().toString(36).substring(2, 12)
    return NextResponse.json({
      invite: {
        id: `inv-${Date.now()}`,
        space_id: spaceId,
        token: demoToken,
      },
      inviteUrl: `http://localhost:3000/invite/${demoToken}`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

