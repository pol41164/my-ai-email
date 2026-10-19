// 天氣資料來源：Open-Meteo（免金鑰） https://open-meteo.com/

export type WeatherInfo = {
  location: string;
  date: string;
  description: string;
  currentTemperature: number;
  maxTemperature: number;
  minTemperature: number;
  precipitationProbability: number | null;
  source: string;
};

// WMO 天氣代碼對照
const WMO_CODES: Record<number, string> = {
  0: "晴朗",
  1: "大致晴朗",
  2: "局部多雲",
  3: "陰天",
  45: "有霧",
  48: "霧凇",
  51: "毛毛雨（輕）",
  53: "毛毛雨",
  55: "毛毛雨（強）",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  80: "陣雨（輕）",
  81: "陣雨",
  82: "強陣雨",
  95: "雷雨",
  96: "雷雨伴隨冰雹",
  99: "強雷雨伴隨冰雹",
};

export async function getTodayWeather(
  latitude = 24.1477,
  longitude = 120.6736,
  location = "台中",
): Promise<WeatherInfo> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    timezone: "Asia/Taipei",
    forecast_days: "1",
  }).toString();

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Open-Meteo 回應 ${res.status}`);
  const data = await res.json();

  const code: number = data.daily.weather_code[0];
  return {
    location,
    date: data.daily.time[0],
    description: WMO_CODES[code] ?? `天氣代碼 ${code}`,
    currentTemperature: data.current.temperature_2m,
    maxTemperature: data.daily.temperature_2m_max[0],
    minTemperature: data.daily.temperature_2m_min[0],
    precipitationProbability: data.daily.precipitation_probability_max[0] ?? null,
    source: "Open-Meteo",
  };
}
