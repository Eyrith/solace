import { NextResponse, type NextRequest } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { spaceId, participantName } = body

    if (!spaceId) {
      return NextResponse.json({ error: 'Missing spaceId' }, { status: 400 })
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

    let userId = 'demo-user-' + Math.random().toString(36).substring(7)
    let identityName = participantName || 'Partner'

    // Verify session & space membership if Supabase is connected
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    ) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 })
      }

      userId = user.id

      // Verify user is a member of this space
      const { data: membership } = await supabase
        .from('private_space_members')
        .select('role')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Forbidden: Not a space member' }, { status: 403 })
      }

      // Fetch user profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (profile?.display_name) {
        identityName = profile.display_name
      }
    }

    // Check if LiveKit credentials exist
    if (!apiKey || !apiSecret || !wsUrl) {
      // In development / demo mode, return simulated token payload
      return NextResponse.json({
        token: 'demo-livekit-token-' + Buffer.from(`${spaceId}:${userId}`).toString('base64url'),
        room: spaceId,
        identity: userId,
        serverUrl: wsUrl || 'wss://demo.livekit.cloud',
        isDemo: true,
      })
    }

    // Create LiveKit access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: identityName,
      ttl: '2h',
    })

    at.addGrant({
      room: spaceId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const jwt = await at.toJwt()

    return NextResponse.json({
      token: jwt,
      room: spaceId,
      identity: userId,
      serverUrl: wsUrl,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to mint LiveKit token' },
      { status: 500 }
    )
  }
}
