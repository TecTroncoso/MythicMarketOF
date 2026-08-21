import { NextResponse } from "next/server";
import { getOnDutyInfo } from "@/lib/support-schedule";

export function GET(request: Request) {
  const countryCode =
    request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");

  return NextResponse.json(getOnDutyInfo(new Date(), countryCode), {
    headers: { "Cache-Control": "no-store" },
  });
}