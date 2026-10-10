import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyReport } from "@/lib/weeklyReport";

// Cron hebdomadaire, lundi 11 h UTC (7 h au Québec en été, 6 h en hiver) :
// rapport du lundi (lib/weeklyReport.ts).
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await generateWeeklyReport();
  if (result.error) console.error("[weekly-report]", result.error);
  return NextResponse.json(result, { status: result.id ? 200 : 500 });
}
