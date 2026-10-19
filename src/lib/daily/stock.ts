// 股價資料來源：台灣證券交易所 公開資料（免金鑰）
import { shiftDateString, taipeiDateString } from "./date";

export type StockInfo = {
  stockNo: string;
  name: string;
  tradeDate: string; // 實際交易日 YYYY-MM-DD
  isYesterday: boolean; // 昨天若休市，會回傳最近一個交易日
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  changePercent: number;
  volume: number; // 成交股數
  source: string;
};

type TwseRow = string[];

const toNumber = (s: string) => Number(s.replace(/,/g, "").replace(/^X/, ""));

// 民國日期 "115/10/15" -> "2026-10-15"
function rocToIso(roc: string): string {
  const [y, m, d] = roc.split("/");
  return `${Number(y) + 1911}-${m}-${d}`;
}

async function fetchMonth(stockNo: string, ymd: string): Promise<TwseRow[]> {
  const date = ymd.replace(/-/g, "");
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${stockNo}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TWSE 回應 ${res.status}`);
  const data = await res.json();
  if (data.stat !== "OK") return [];
  return data.data as TwseRow[];
}

export async function getYesterdayStock(
  stockNo = "2330",
  name = "台積電",
): Promise<StockInfo> {
  const today = taipeiDateString();
  const yesterday = shiftDateString(today, -1);

  // 找昨天（含）以前最近的交易日；本月若沒有，往前一個月找
  let rows = (await fetchMonth(stockNo, yesterday)).filter(
    (r) => rocToIso(r[0]) <= yesterday,
  );
  if (rows.length === 0) {
    const lastMonth = shiftDateString(`${yesterday.slice(0, 8)}01`, -1);
    rows = await fetchMonth(stockNo, lastMonth);
  }
  const row = rows.at(-1);
  if (!row) throw new Error("找不到最近的交易資料");

  const close = toNumber(row[6]);
  const change = toNumber(row[7]);
  const tradeDate = rocToIso(row[0]);

  return {
    stockNo,
    name,
    tradeDate,
    isYesterday: tradeDate === yesterday,
    open: toNumber(row[3]),
    high: toNumber(row[4]),
    low: toNumber(row[5]),
    close,
    change,
    changePercent: Number(((change / (close - change)) * 100).toFixed(2)),
    volume: toNumber(row[1]),
    source: "台灣證券交易所",
  };
}
