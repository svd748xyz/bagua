/** API 客户端（纯前端实现，无需后端） */
import type { BaziResponse, CastResponse, LocationsResponse } from './types';
import { divineCast as localDivineCast } from '../core/iching';
import { buildChart } from '../core/bazi';
import { fetchLocationsLocal } from '../core/birthplace';

export interface BaziInput {
  date: string;
  time: string;
  calendar: "solar" | "lunar";
  gender: "m" | "f";
  province?: string | null;
  city?: string | null;
  district?: string | null;
  longitude?: number | null;
  dst_assumed?: boolean | null;
  birthplace?: string;
}

const baziCache = new Map<string, BaziResponse>();

function baziCacheKey(input: BaziInput): string {
  return [input.date, input.time, input.calendar, input.gender,
          input.longitude ?? "", input.dst_assumed ?? "", input.province ?? "", input.city ?? ""].join("_");
}

export async function divineCast(question?: string): Promise<CastResponse> {
  return localDivineCast(question) as CastResponse;
}

export async function baziChart(input: BaziInput): Promise<BaziResponse> {
  const key = baziCacheKey(input);
  if (baziCache.has(key)) return baziCache.get(key)!;

  const [year, month, day] = input.date.split('-').map(Number);
  const [hour, minute] = input.time.split(':').map(Number);

  const chart = buildChart(year, month, day, hour, minute, {
    calendar: input.calendar,
    gender: input.gender,
    province: input.province ?? undefined,
    city: input.city ?? undefined,
    district: input.district ?? undefined,
    longitude: input.longitude ?? 120,
    dst_assumed: input.dst_assumed ?? null,
    birthplace: input.birthplace ?? undefined,
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
    time_correction: chart.time_correction ?? null,
  };

  baziCache.set(key, response);
  return response;
}

export async function fetchLocations(): Promise<LocationsResponse> {
  return fetchLocationsLocal();
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
