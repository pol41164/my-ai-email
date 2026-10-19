// 用 OpenAI 統整天氣、股價、新聞，並產生鼓勵的話
import type { NewsItem } from "./news";
import type { StockInfo } from "./stock";
import type { WeatherInfo } from "./weather";

export type DailySummary = {
  weatherSummary: string;
  stockSummary: string;
  newsSummary: string;
  encouragement: string;
};

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

export async function generateDailySummary(input: {
  date: string;
  weather: WeatherInfo | null;
  stock: StockInfo | null;
  news: NewsItem[] | null;
}): Promise<DailySummary> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("缺少環境變數 OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是一位溫暖、正向的每日晨報助理，使用繁體中文（台灣用語）。",
            "根據使用者提供的資料，輸出 JSON，欄位如下：",
            '- "weatherSummary": 今日天氣重點與穿著/帶傘建議（1-2 句）',
            '- "stockSummary": 台積電最近交易日的股價表現（1-2 句，只陳述事實，不給投資建議）',
            '- "newsSummary": 今日科技新聞的重點整理（3-5 句）',
            '- "encouragement": 結合以上資訊、給使用者的鼓勵的話（2-3 句，真誠不浮誇）',
            "若某項資料為 null，該欄位請說明今天暫時無法取得此資訊。不要捏造資料。",
          ].join("\n"),
        },
        { role: "user", content: JSON.stringify(input) },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI 回應 ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content) as DailySummary;
}
