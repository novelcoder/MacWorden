import { NextRequest, NextResponse } from "next/server";

// Legacy URL compatibility: the old static site linked to Series.html?series=<slug>.
// Redirect to the new clean route without echoing the query string back.
export function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("series");
  const destination = slug ? `/series/${encodeURIComponent(slug)}` : "/#series";
  return NextResponse.redirect(new URL(destination, request.nextUrl.origin), 308);
}
