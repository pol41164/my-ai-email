import { connection } from "next/server";
import type { DailyBrief } from "@/lib/daily/brief";
import { connectDB } from "@/lib/mongodb";
import { SentBriefModel } from "@/models/SentBrief";

// 最多回傳幾筆寄信紀錄
const LIMIT = 30;

export type SentBriefRecord = {
  id: string;
  subject: string;
  status: "sent" | "failed";
  error?: string;
  sentAt: string;
  brief: DailyBrief; // 寄出當下的晨報內容，格式與 /api/daily-brief 相同
};

// 讀取已寄出的晨報紀錄（新到舊）；不回傳收件人與 email HTML
export async function GET() {
  // 每次請求都讀最新資料，不在 build 時預先產生
  await connection();
  await connectDB();

  const docs = await SentBriefModel.find()
    .sort({ createdAt: -1 })
    .limit(LIMIT)
    .select("-html -from -to -resendId")
    .lean();

  const records: SentBriefRecord[] = docs.map((d) => ({
    id: String(d._id),
    subject: d.subject,
    status: d.status,
    error: d.error ?? undefined,
    sentAt: d.createdAt.toISOString(),
    brief: {
      date: d.date,
      generatedAt: d.createdAt.toISOString(),
      summary: d.summary ?? null,
      data: {
        weather: d.weather ?? null,
        stock: d.stock ?? null,
        news: d.news ?? null,
      },
      ...(d.dataErrors && { errors: d.dataErrors }),
    },
  }));

  return Response.json(records);
}
