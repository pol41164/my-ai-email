import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { Resend } from "resend";
import { buildDailyBrief } from "@/lib/daily/brief";
import { renderDailyBriefEmail } from "@/lib/daily/email";
import { connectDB } from "@/lib/mongodb";
import { SentBriefModel } from "@/models/SentBrief";

// 回應送出後，after() 裡的工作最多可以再跑這麼久（秒）
export const maxDuration = 60;

// Resend 預設寄件人（未驗證網域時只能寄給 Resend 帳號本人的信箱）
const FROM = "每日晨報 <onboarding@resend.dev>";
const TO = "pol41164@gmail.com";

// 驗證 cron-job.org 帶來的 Header：Authorization: Bearer <CRON_SECRET>
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// 抓資料 → 寄信 → 存進 MongoDB（在回應送出後才執行，結果只看 log 與資料庫）
async function sendBrief(apiKey: string) {
  // 先連資料庫，連不上就不寄，避免寄出卻沒留下紀錄
  await connectDB();

  const brief = await buildDailyBrief();
  const { subject, html } = renderDailyBriefEmail(brief);

  const { data, error } = await new Resend(apiKey).emails.send({
    from: FROM,
    to: TO,
    subject,
    html,
  });

  await SentBriefModel.create({
    date: brief.date,
    from: FROM,
    to: TO,
    subject,
    status: error ? "failed" : "sent",
    resendId: data?.id,
    error: error?.message,
    summary: brief.summary,
    weather: brief.data.weather,
    stock: brief.data.stock,
    news: brief.data.news,
    dataErrors: brief.errors,
    html,
  });

  if (error) throw new Error(`Resend 寄信失敗：${error.message}`);
  console.log(`[send-brief] 已寄出 ${brief.date} 晨報至 ${TO}（${data?.id}）`);
}

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return Response.json({ error: "缺少環境變數 CRON_SECRET" }, { status: 500 });
  }
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "缺少環境變數 RESEND_API_KEY" }, { status: 500 });
  }

  // 不等寄信完成，先回應 cron-job.org，避免超過 30 秒逾時
  after(async () => {
    try {
      await sendBrief(apiKey);
    } catch (e) {
      console.error("[send-brief] 失敗：", e);
    }
  });

  return Response.json({ accepted: true, to: TO }, { status: 202 });
}
