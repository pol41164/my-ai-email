// 組合每日晨報：天氣、股價、新聞 + AI 統整
import { taipeiDateString } from "./date";
import { getTodayTechNews, type NewsItem } from "./news";
import { getYesterdayStock, type StockInfo } from "./stock";
import { generateDailySummary, type DailySummary } from "./summary";
import { getTodayWeather, type WeatherInfo } from "./weather";

export type DailyBrief = {
  date: string;
  generatedAt: string;
  summary: DailySummary | null;
  data: {
    weather: WeatherInfo | null;
    stock: StockInfo | null;
    news: NewsItem[] | null;
  };
  errors?: Record<string, string>;
};

const errorMessage = (r: PromiseSettledResult<unknown>) =>
  r.status === "rejected" ? String(r.reason?.message ?? r.reason) : undefined;

export async function buildDailyBrief(): Promise<DailyBrief> {
  const date = taipeiDateString();
  const [weather, stock, news] = await Promise.allSettled([
    getTodayWeather(),
    getYesterdayStock(),
    getTodayTechNews(),
  ]);

  const data = {
    weather: weather.status === "fulfilled" ? weather.value : null,
    stock: stock.status === "fulfilled" ? stock.value : null,
    news: news.status === "fulfilled" ? news.value : null,
  };
  const errors: Record<string, string> = {};
  if (weather.status === "rejected") errors.weather = errorMessage(weather)!;
  if (stock.status === "rejected") errors.stock = errorMessage(stock)!;
  if (news.status === "rejected") errors.news = errorMessage(news)!;

  let summary = null;
  try {
    summary = await generateDailySummary({ date, ...data });
  } catch (e) {
    errors.summary = e instanceof Error ? e.message : String(e);
  }

  return {
    date,
    generatedAt: new Date().toISOString(),
    summary,
    data,
    ...(Object.keys(errors).length > 0 && { errors }),
  };
}
