import { NextRequest, NextResponse } from 'next/server';


// https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Paris&types=geocode&&language=de_DE&key=${process.env.NEXT_PUBLIC_LOCATION_API_KEY} 


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get('input') || 'No input provided';

  const apiKey = process.env.NEXT_PUBLIC_LOCATION_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=geocode&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google API responded with status ${response.status}`);
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error:any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ input: body.input || 'No input provided' });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}