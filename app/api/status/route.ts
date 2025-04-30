import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

// ...existing code for reading serviceAccount JSON...
const serviceAccount = JSON.parse(process.env.NEXT_PUBLIC_SERVICE_ACCOUNT || '{}')
const ga4PropertyId = process.env.NEXT_PUBLIC_GA4_PROPERTY_ID || ''

// initialize GA4 Data API client
const analyticsClient = new BetaAnalyticsDataClient({ credentials: serviceAccount })

export async function GET(request: NextRequest) {
  // fetch realtime active users (last ~30 minutes)
  const [rtRes] = await analyticsClient.runRealtimeReport({
    property: `properties/${ga4PropertyId}`,
    metrics: [{ name: 'activeUsers' }],
  })
  const currentUsers30Min = rtRes.rows?.[0]?.metricValues?.[0]?.value ?? '0'

  // fetch 30‑day active users
  const [reportRes] = await analyticsClient.runReport({
    property: `properties/${ga4PropertyId}`,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    metrics: [{ name: 'activeUsers' }],
  })
  const totalUsersLast30Days = reportRes.rows?.[0]?.metricValues?.[0]?.value ?? '0'

  return NextResponse.json({
    currentUsers30Min: Number(currentUsers30Min),
    totalUsersLast30Days: Number(totalUsersLast30Days),
  })
}
