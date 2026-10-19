// 科技新聞來源：RSS
import { XMLParser } from "fast-xml-parser";
import { taipeiDateString } from "./date";

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string; // ISO 8601
};

const FEEDS = [
  {
    name: "Google 新聞 科技",
    url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
  },
  { name: "iThome", url: "https://www.ithome.com.tw/rss" },
];

const parser = new XMLParser({ ignoreAttributes: true, processEntities: true });

// iThome 的 pubDate 格式為 "2026-10-16  06:10:16"（台北時間），其餘為 RFC 822
function parseDate(raw: string): Date {
  const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/);
  return m ? new Date(`${m[1]}T${m[2]}+08:00`) : new Date(raw);
}

async function fetchFeed(feed: (typeof FEEDS)[number]): Promise<NewsItem[]> {
  const res = await fetch(feed.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${feed.name} RSS 回應 ${res.status}`);
  const xml = parser.parse(await res.text());
  const items = [xml.rss?.channel?.item ?? []].flat();

  return items.map((item) => {
    let title = String(item.title ?? "").trim();
    let source = feed.name;
    // Google 新聞標題格式為「標題 - 媒體名稱」
    const sourceName = item.source ? String(item.source) : undefined;
    if (sourceName && title.endsWith(` - ${sourceName}`)) {
      title = title.slice(0, -(sourceName.length + 3));
      source = sourceName;
    }
    return {
      title,
      link: String(item.link ?? ""),
      source,
      publishedAt: parseDate(String(item.pubDate ?? "")).toISOString(),
    };
  });
}

export async function getTodayTechNews(limit = 10): Promise<NewsItem[]> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (all.length === 0) throw new Error("所有 RSS 來源都抓取失敗");

  const today = taipeiDateString();
  const sorted = all.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const todays = sorted.filter(
    (n) => taipeiDateString(new Date(n.publishedAt)) === today,
  );
  // 今天的新聞太少時（例如剛過午夜），用最新的新聞補足
  return (todays.length >= 3 ? todays : sorted).slice(0, limit);
}
