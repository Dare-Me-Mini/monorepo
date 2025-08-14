import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length <= max ? text : text.slice(0, max - 1) + '…'
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const url = new URL(req.url)
    const { searchParams } = url
    const desc = truncate(searchParams.get('desc') || 'A bold new challenge', 90)
    const stake = String(searchParams.get('stake') || '20')
    const from = truncate(searchParams.get('from') || 'Someone', 24)
    const to = truncate(searchParams.get('to') || 'Friend', 24)
    const status = (searchParams.get('status') || 'pending').toUpperCase()

    // Server-side logs (visible in Vercel logs)
    try {
      console.log('[og-dare]', {
        id: ctx?.params?.id,
        url: url.toString(),
        desc,
        stake,
        from,
        to,
        status,
        time: new Date().toISOString(),
      })
    } catch {}

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0b0b15',
            color: '#fff',
            padding: 48,
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', fontSize: 54, fontWeight: 900, textAlign: 'center', lineHeight: 1.2, maxWidth: 960 }}>{desc}</div>
          <div style={{ marginTop: 20, display: 'flex', gap: 18, fontSize: 28, opacity: 0.9 }}>
            <div style={{ display: 'flex' }}>{`From ${from}`}</div>
            <div style={{ display: 'flex' }}>{'->'}</div>
            <div style={{ display: 'flex' }}>{`To ${to}`}</div>
          </div>
          <div style={{ display: 'flex', marginTop: 20, fontSize: 36, fontWeight: 800 }}>{`$${stake} | ${status}`}</div>
        </div>
      ),
      {
        width: 1200,
        height: 800,
        headers: {
          'Cache-Control': 'public, immutable, no-transform, max-age=300',
        },
      }
    )
  } catch (e) {
    try {
      console.error('[og-dare:error]', (e as Error)?.message)
    } catch {}
    // Fallback minimal PNG via ImageResponse
    return new ImageResponse(
      (
        <div
          style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b15', color: '#fff', fontSize: 48, fontWeight: 800 }}
        >
          Dare
        </div>
      ),
      { width: 1200, height: 800 }
    )
  }
}


