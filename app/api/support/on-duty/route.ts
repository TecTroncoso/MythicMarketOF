import { NextResponse } from "next/server";
import { getOnDutyInfo } from "@/lib/support-schedule";

// The answer only depends on (country, current hour), so it is cacheable for
// minutes at the edge/CDN instead of invoking a serverless function on every
// page load. `Vary` keys the shared cache by the geo headers, otherwise an
// Argentine visitor could be served the Spanish agent's schedule.
export function GET(request: Request) {
  const countryCode =
    request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");

  return NextResponse.json(getOnDutyInfo(new Date(), countryCode), {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      Vary: "x-vercel-ip-country, cf-ipcountry",
    },
  });
}