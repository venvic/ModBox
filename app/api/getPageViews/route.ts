// app/api/events/page_view/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const analyticsData = google.analyticsdata('v1beta');
const serviceAccount = JSON.parse(process.env.NEXT_PUBLIC_SERVICE_ACCOUNT || '{}');

async function fetchAnalyticsData() {
  const auth = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  await auth.authorize();

  try {
    console.log('Running report with property ID:', process.env.NEXT_PUBLIC_ANALYTICS_ID);
    const response = await analyticsData.properties.runReport({
      property: `properties/${process.env.NEXT_PUBLIC_ANALYTICS_ID}`,
      requestBody: {
        dimensions: [
          { name: 'pageLocation' }, // Use valid dimension name for page URL
        ],
        metrics: [{ name: 'eventCount' }],
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      },
      auth: auth,
    });

    console.log('Report response:', response.data);
    if (!response.data.rows) {
      console.log('No rows returned in the report response.');
      return [];
    }

    const slugCounts: { [key: string]: number } = {};

    response.data.rows.forEach(row => {
      const pageLocation = row.dimensionValues ? row.dimensionValues[0].value : '';
      console.log('Page location:', pageLocation); // Add logging
      const slugMatch = pageLocation ? pageLocation.match(/\/live\/([^\/]+)/) : null; // Adjust the regex based on your URL structure
      const slug = slugMatch ? slugMatch[1] : null;
      console.log('Slug:', slug); // Add logging
      const eventCount = row.metricValues && row.metricValues[0] && row.metricValues[0].value ? parseInt(row.metricValues[0].value, 10) : 0;

      if (slug) {
        if (!slugCounts[slug]) {
          slugCounts[slug] = 0;
        }
        slugCounts[slug] += eventCount;
      }
    });

    console.log('Slug counts:', slugCounts); // Add logging
    return Object.entries(slugCounts).map(([slug, eventCount]) => ({
      slug,
      eventCount,
    }));
  } catch (error:any) {
    console.error('Error details:', error);
    if (error.code === 403) {
      throw new Error('Google Analytics Data API is not enabled or not authorized. Please enable it and try again.');
    }
    throw error;
  }
}

export async function GET() {
  try {
    const pageViewData = await fetchAnalyticsData();
    console.log('Page view data:', pageViewData); // Add logging

    return NextResponse.json(pageViewData);
  } catch (error:any) {
    console.error('Error fetching analytics data:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
