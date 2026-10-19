// 把每日晨報排成 HTML email（table 排版 + inline style，相容各家信箱）
import type { DailyBrief } from "./brief";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const unavailable = (message?: string) =>
  `<p style="margin:0;color:#dc2626;font-size:14px;">暫時無法取得資料${message ? `：${esc(message)}` : ""}</p>`;

const note = (text: string) =>
  `<p style="margin:12px 0 0;color:#52525b;font-size:14px;line-height:22px;">${esc(text)}</p>`;

const meta = (text: string) =>
  `<p style="margin:10px 0 0;color:#a1a1aa;font-size:12px;">${esc(text)}</p>`;

function card(title: string, body: string) {
  return `
  <tr><td style="padding:0 0 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;color:#71717a;font-size:13px;font-weight:600;">${esc(title)}</p>
        ${body}
      </td></tr>
    </table>
  </td></tr>`;
}

function stats(items: [string, string][]) {
  const cells = items
    .map(
      ([label, value]) => `
      <td style="padding:0 16px 0 0;vertical-align:top;">
        <p style="margin:0;color:#71717a;font-size:12px;">${esc(label)}</p>
        <p style="margin:2px 0 0;color:#18181b;font-size:14px;font-weight:600;">${esc(value)}</p>
      </td>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>${cells}</tr></table>`;
}

function weatherSection(brief: DailyBrief) {
  const w = brief.data.weather;
  if (!w) return card("今日天氣", unavailable(brief.errors?.weather));
  return card(
    "今日天氣",
    `<p style="margin:0;color:#18181b;"><span style="font-size:32px;font-weight:600;">${w.currentTemperature}°C</span>
      <span style="font-size:16px;margin-left:8px;">${esc(w.description)}</span></p>
    ${stats([
      ["最高", `${w.maxTemperature}°C`],
      ["最低", `${w.minTemperature}°C`],
      ["降雨機率", w.precipitationProbability === null ? "—" : `${w.precipitationProbability}%`],
    ])}
    ${brief.summary ? note(brief.summary.weatherSummary) : ""}
    ${meta(`${w.location} · ${w.date} · 資料來源：${w.source}`)}`,
  );
}

function stockSection(brief: DailyBrief) {
  const s = brief.data.stock;
  if (!s) return card("台積電（2330）", unavailable(brief.errors?.stock));
  // 台股慣例：漲紅跌綠
  const color = s.change === 0 ? "#71717a" : s.change > 0 ? "#dc2626" : "#16a34a";
  const sign = s.change > 0 ? "+" : "";
  return card(
    `${s.name}（${s.stockNo}）`,
    `<p style="margin:0;color:#18181b;"><span style="font-size:32px;font-weight:600;">${s.close.toLocaleString()}</span>
      <span style="font-size:16px;margin-left:8px;color:${color};font-weight:600;">${sign}${s.change}（${sign}${s.changePercent}%）</span></p>
    ${stats([
      ["開盤", s.open.toLocaleString()],
      ["最高", s.high.toLocaleString()],
      ["最低", s.low.toLocaleString()],
      ["成交張數", Math.round(s.volume / 1000).toLocaleString()],
    ])}
    ${brief.summary ? note(brief.summary.stockSummary) : ""}
    ${meta(`交易日 ${s.tradeDate}${s.isYesterday ? "" : "（昨日休市，顯示最近交易日）"} · 資料來源：${s.source}`)}`,
  );
}

function newsSection(brief: DailyBrief) {
  const news = brief.data.news;
  const summary = brief.summary
    ? `<p style="margin:0 0 12px;padding:12px 16px;background:#f4f4f5;border-radius:8px;color:#3f3f46;font-size:14px;line-height:22px;">${esc(brief.summary.newsSummary)}</p>`
    : "";
  const list = news
    ? news
        .map(
          (n) => `
        <tr><td style="padding:10px 0;border-top:1px solid #f4f4f5;">
          <a href="${esc(n.link)}" style="color:#18181b;font-size:15px;font-weight:600;line-height:22px;text-decoration:none;">${esc(n.title)}</a>
          <p style="margin:4px 0 0;color:#a1a1aa;font-size:12px;">${esc(n.source)} · ${formatTime(n.publishedAt)}</p>
        </td></tr>`,
        )
        .join("")
    : "";
  return card(
    "今日科技新聞",
    summary +
      (news
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list}</table>`
        : unavailable(brief.errors?.news)),
  );
}

export function renderDailyBriefEmail(brief: DailyBrief) {
  const subject = `每日晨報｜${brief.date}`;
  const encouragement = brief.summary
    ? `<p style="margin:0;color:#18181b;font-size:17px;line-height:28px;">${esc(brief.summary.encouragement)}</p>`
    : unavailable(brief.errors?.summary);

  const html = `<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang TC','Microsoft JhengHei',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="padding:0 0 20px;">
          <p style="margin:0;color:#71717a;font-size:14px;">${esc(brief.date)}</p>
          <h1 style="margin:4px 0 0;color:#18181b;font-size:26px;">每日晨報</h1>
        </td></tr>
        <tr><td style="padding:0 0 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:12px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 8px;color:#92400e;font-size:13px;font-weight:600;">給你的一句話</p>
              ${encouragement}
            </td></tr>
          </table>
        </td></tr>
        ${weatherSection(brief)}
        ${stockSection(brief)}
        ${newsSection(brief)}
        <tr><td style="padding:8px 0 0;color:#a1a1aa;font-size:12px;">產生時間：${formatTime(brief.generatedAt)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
