import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: 'playlist-modify-private playlist-modify-public',
    show_dialog: 'true',
  });
  return NextResponse.redirect('https://accounts.spotify.com/authorize?' + params.toString());
}
