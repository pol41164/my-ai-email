"use client";

import { useCallback, useEffect, useState } from "react";
import type { DailyBrief } from "@/lib/daily/brief";

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Unavailable({ message }: { message?: string }) {
  return (
    <p className="text-sm text-red-600 dark:text-red-400">
      暫時無法取得資料{message ? `：${message}` : ""}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function WeatherCard({ brief }: { brief: DailyBrief }) {
  const w = brief.data.weather;
  return (
    <Card title="今日天氣">
      {w ? (
        <>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold tabular-nums">
              {w.currentTemperature}°C
            </span>
            <span className="text-lg">{w.description}</span>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <Stat label="最高" value={`${w.maxTemperature}°C`} />
            <Stat label="最低" value={`${w.minTemperature}°C`} />
            <Stat
              label="降雨機率"
              value={
                w.precipitationProbability === null
                  ? "—"
                  : `${w.precipitationProbability}%`
              }
            />
          </dl>
          {brief.summary && (
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {brief.summary.weatherSummary}
            </p>
          )}
          <p className="mt-3 text-xs text-zinc-400">
            {w.location} · {w.date} · 資料來源：{w.source}
          </p>
        </>
      ) : (
        <Unavailable message={brief.errors?.weather} />
      )}
    </Card>
  );
}

function StockCard({ brief }: { brief: DailyBrief }) {
  const s = brief.data.stock;
  // 台股慣例：漲紅跌綠
  const color =
    !s || s.change === 0
      ? "text-zinc-500"
      : s.change > 0
        ? "text-red-600 dark:text-red-400"
        : "text-green-600 dark:text-green-400";
  const sign = s && s.change > 0 ? "+" : "";
  return (
    <Card title={s ? `${s.name}（${s.stockNo}）` : "台積電（2330）"}>
      {s ? (
        <>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold tabular-nums">
              {s.close.toLocaleString()}
            </span>
            <span className={`font-medium tabular-nums ${color}`}>
              {sign}
              {s.change}（{sign}
              {s.changePercent}%）
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-4 gap-3 text-sm">
            <Stat label="開盤" value={s.open.toLocaleString()} />
            <Stat label="最高" value={s.high.toLocaleString()} />
            <Stat label="最低" value={s.low.toLocaleString()} />
            <Stat
              label="成交張數"
              value={Math.round(s.volume / 1000).toLocaleString()}
            />
          </dl>
          {brief.summary && (
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {brief.summary.stockSummary}
            </p>
          )}
          <p className="mt-3 text-xs text-zinc-400">
            交易日 {s.tradeDate}
            {!s.isYesterday && "（昨日休市，顯示最近交易日）"} · 資料來源：
            {s.source}
          </p>
        </>
      ) : (
        <Unavailable message={brief.errors?.stock} />
      )}
    </Card>
  );
}

function NewsCard({ brief }: { brief: DailyBrief }) {
  const news = brief.data.news;
  return (
    <Card title="今日科技新聞" className="md:col-span-2">
      {brief.summary && (
        <p className="mb-5 rounded-xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200">
          {brief.summary.newsSummary}
        </p>
      )}
      {news ? (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {news.map((n) => (
            <li key={n.link} className="py-3">
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium leading-6 hover:underline"
              >
                {n.title}
              </a>
              <p className="mt-1 text-xs text-zinc-400">
                {n.source} · {formatTime(n.publishedAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <Unavailable message={brief.errors?.news} />
      )}
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="grid animate-pulse gap-6 md:grid-cols-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-56 rounded-2xl bg-zinc-200 dark:bg-zinc-800 ${i === 2 ? "md:col-span-2" : ""}`}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-brief", { cache: "no-store" });
      if (!res.ok) throw new Error(`API 回應 ${res.status}`);
      setBrief(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 頁面載入時抓一次資料
    load();
  }, [load]);

  return (
    <div className="flex-1 bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {brief?.date ?? "載入中…"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              每日晨報
            </h1>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {loading ? "更新中…" : "重新整理"}
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            載入失敗：{error}
          </div>
        )}

        {!brief && loading && <Skeleton />}

        {brief && (
          <div
            className={`grid gap-6 md:grid-cols-2 ${loading ? "opacity-60" : ""}`}
          >
            <section className="rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 p-6 md:col-span-2 dark:from-amber-950 dark:to-rose-950">
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-amber-800 dark:text-amber-300">
                給你的一句話
              </h2>
              {brief.summary ? (
                <p className="text-lg leading-8">
                  {brief.summary.encouragement}
                </p>
              ) : (
                <Unavailable message={brief.errors?.summary} />
              )}
            </section>
            <WeatherCard brief={brief} />
            <StockCard brief={brief} />
            <NewsCard brief={brief} />
            <p className="text-xs text-zinc-400 md:col-span-2">
              產生時間：{formatTime(brief.generatedAt)}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
