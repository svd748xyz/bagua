/** API 客户端：后端优先 + 本地 fallback。

- 本地开发（localhost）：走后端 /api，含时间校正等完整功能
- 线上部署（GitHub Pages）：后端不可用，自动切到浏览器内本地计算
*/
import axios from "axios";
import type { BaziResponse, CastResponse, LocationsResponse } from './types';
import { buildChart } from '../core/bazi';
import { divineCast as localDivineCast } from '../core/iching';

const client = axios.create({ baseURL: "", timeout: 8000 });

export interface BaziInput {
  date: string;
  time: string;
  calendar: "solar" | "lunar";
  gender: "m" | "f";
  // 时间校正参数（仅后端可用，本地 fallback 忽略）
  province?: string | null;
  city?: string | null;
  longitude?: number | null;
  dst_assumed?: boolean | null;
  birthplace?: string;
}

const baziCache = new Map<string, BaziResponse>();

function baziCacheKey(input: BaziInput): string {
  return [input.date, input.time, input.calendar, input.gender,
          input.longitude ?? "", input.dst_assumed ?? "", input.province ?? "", input.city ?? ""].join("_");
}

// --- 金钱卦：后端优先（SystemRandom 密码学级随机）---
export async function divineCast(question?: string): Promise<CastResponse> {
  try {
    const { data } = await client.post<CastResponse>("/api/divine/cast", { question: question ?? null });
    return data;
  } catch {
    // fallback to local
    return localDivineCast(question) as CastResponse;
  }
}

// --- 八字排盘：后端优先（含时间校正），失败切本地 ---
export async function baziChart(input: BaziInput): Promise<BaziResponse> {
  const key = baziCacheKey(input);
  if (baziCache.has(key)) return baziCache.get(key)!;

  // 先试后端
  try {
    const payload: Record<string, unknown> = {
      date: input.date,
      time: input.time,
      calendar: input.calendar,
      gender: input.gender,
    };
    if (input.province) payload["province"] = input.province;
    if (input.city) payload["city"] = input.city;
    if (input.longitude != null) payload["longitude"] = input.longitude;
    if (input.dst_assumed !== undefined) payload["dst_assumed"] = input.dst_assumed;
    if (input.birthplace) payload["birthplace"] = input.birthplace;

    const { data } = await client.post<BaziResponse>("/api/bazi/chart", payload);
    baziCache.set(key, data);
    return data;
  } catch {
    // fallback to local（无时间校正，但保证页面不白屏）
  }

  // 本地计算 fallback
  const [year, month, day] = input.date.split('-').map(Number);
  const [hour, minute] = input.time.split(':').map(Number);
  const chart = buildChart(year, month, day, hour, minute, {
    calendar: input.calendar,
    gender: input.gender,
  });
  const response: BaziResponse = {
    pillars: chart.pillars as any,
    day_master: chart.day_master,
    nayin: chart.nayin,
    wuxing: chart.wuxing,
    elements: chart.elements,
    gender: chart.gender,
    solar_display: chart.solar_display,
    lunar_display: chart.lunar_display,
    details: chart.details as any,
    extra: chart.extra,
    yun: chart.yun as any,
    liunian: chart.liunian,
    shensha: chart.shensha,
    shensha_detail: chart.shensha_detail ?? {},
    analysis: chart.analysis ?? {},
    time_correction: null,  // 本地版本无时间校正
  };
  baziCache.set(key, response);
  return response;
}

// --- 地理位置：后端查表，失败返回空列表 ---
let _locationsCache: LocationsResponse | null = null;

export async function fetchLocations(): Promise<LocationsResponse> {
  if (_locationsCache) return _locationsCache;
  try {
    const { data } = await client.get<LocationsResponse>("/api/bazi/locations");
    _locationsCache = data;
    return data;
  } catch {
    // 后端不可用时返回空
    const empty: LocationsResponse = { provinces: [], cities: {} };
    _locationsCache = empty;
    return empty;
  }
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail ?? err.response?.data?.error;
    if (typeof detail === "object" && detail && "message" in (detail as any)) {
      return (detail as any).message as string;
    }
    if (typeof detail === "string") return detail;
    if (err.response) return `Request failed (${err.response.status})`;
    if (err.request) return "Network error: cannot connect to server";
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
