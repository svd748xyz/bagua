/** API 客户端（纯前端实现） */

import type { BaziResponse, CastResponse } from './types';
import { divineCast as localDivineCast } from '../core/iching';
import { buildChart } from '../core/bazi';

export interface BaziInput {
  date: string;
  time: string;
  calendar: "solar" | "lunar";
  gender: "m" | "f";
}

// 八字排盘结果缓存
const baziCache = new Map<string, BaziResponse>();

function baziCacheKey(input: BaziInput): string {
  return `${input.date}_${input.time}_${input.calendar}_${input.gender}`;
}

export async function divineCast(question?: string): Promise<CastResponse> {
  const result = localDivineCast(question);
  return result as CastResponse;
}

export async function baziChart(input: BaziInput): Promise<BaziResponse> {
  const key = baziCacheKey(input);
  const cached = baziCache.get(key);
  if (cached) return cached;

  // 解析日期和时间
  const [year, month, day] = input.date.split('-').map(Number);
  const [hour, minute] = input.time.split(':').map(Number);

  const chart = buildChart(year, month, day, hour, minute, {
    calendar: input.calendar,
    gender: input.gender,
  });

  // 转换为前端响应格式
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
    shensha_detail: chart.shensha_detail,
    analysis: chart.analysis,
  };

  baziCache.set(key, response);
  return response;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "发生未知错误";
}
