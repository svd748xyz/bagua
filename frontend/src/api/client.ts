/** API 客户端：优先走后端 /api，本地模块作为 fallback。 */
import axios from "axios";
import type { BaziResponse, CastResponse, LocationsResponse } from './types';

const client = axios.create({ baseURL: "" });

export interface BaziInput {
  date: string;
  time: string;
  calendar: "solar" | "lunar";
  gender: "m" | "f";
  // 时间校正参数
  province?: string | null;
  city?: string | null;
  longitude?: number | null;
  dst_assumed?: boolean | null;   // null=自动 / true=是夏令时 / false=否
  birthplace?: string;
}

// 八字排盘结果缓存
const baziCache = new Map<string, BaziResponse>();

function baziCacheKey(input: BaziInput): string {
  return [input.date, input.time, input.calendar, input.gender,
          input.longitude ?? "", input.dst_assumed ?? "", input.province ?? "", input.city ?? ""].join("_");
}

// --- 金钱卦：用后端（密码学级随机）---
export async function divineCast(question?: string): Promise<CastResponse> {
  const { data } = await client.post<CastResponse>("/api/divine/cast", { question: question ?? null });
  return data;
}

// --- 八字排盘：后端 API（含时间校正）---
export async function baziChart(input: BaziInput): Promise<BaziResponse> {
  const key = baziCacheKey(input);
  const cached = baziCache.get(key);
  if (cached) return cached;

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
}

// --- 地理位置：后端查询省/市列表 ---
let _locationsCache: LocationsResponse | null = null;

export async function fetchLocations(): Promise<LocationsResponse> {
  if (_locationsCache) return _locationsCache;
  const { data } = await client.get<LocationsResponse>("/api/bazi/locations");
  _locationsCache = data;
  return data;
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
