import axios from "axios";
import type {
  BaziResponse,
  CastResponse,
  HexagramOut,
} from "./types";

const client = axios.create({ baseURL: "" });

// 八字排盘结果缓存（相同输入不重复请求）
const baziCache = new Map<string, BaziResponse>();

function baziCacheKey(input: BaziInput): string {
  return `${input.date}_${input.time}_${input.calendar}_${input.gender}`;
}

export async function divineCast(question?: string): Promise<CastResponse> {
  const { data } = await client.post<CastResponse>("/api/divine/cast", {
    question: question ?? null,
  });
  return data;
}

export async function getHexagram(num: number): Promise<HexagramOut> {
  const { data } = await client.get<HexagramOut>(`/api/divine/hexagram/${num}`);
  return data;
}

export interface BaziInput {
  date: string;
  time: string;
  calendar: "solar" | "lunar";
  gender: "m" | "f";
}

export async function baziChart(input: BaziInput): Promise<BaziResponse> {
  const key = baziCacheKey(input);
  const cached = baziCache.get(key);
  if (cached) return cached;

  const { data } = await client.post<BaziResponse>("/api/bazi/chart", input);
  baziCache.set(key, data);
  return data;
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail ?? err.response?.data?.error;
    if (typeof detail === "object" && detail && "message" in detail) {
      return detail.message as string;
    }
    if (typeof detail === "string") return detail;
    if (err.response) return `请求失败（${err.response.status}）`;
    if (err.request) return "网络错误：无法连接到服务器";
  }
  return "发生未知错误";
}
