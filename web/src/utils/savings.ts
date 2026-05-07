import { DiagnoseResponse, TradeType } from '../types';

const FALLBACK_PRO: Record<TradeType, [number, number]> = {
  plumber: [80, 180],
  electrician: [80, 200],
  joiner: [80, 200],
  builder: [100, 250],
  roofer: [150, 350],
  general: [60, 150],
};

export function parseCostMidpoint(range: string): number | null {
  const nums = [...range.matchAll(/(\d+)/g)]
    .map(m => parseInt(m[1], 10))
    .filter(n => n > 0 && n < 10000);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function getProCostMidpoint(result: DiagnoseResponse): number {
  if (result.estimatedProCost?.likelyCostRange) {
    const mid = parseCostMidpoint(result.estimatedProCost.likelyCostRange);
    if (mid !== null) return mid;
  }
  const [lo, hi] = FALLBACK_PRO[result.tradeType] ?? FALLBACK_PRO.general;
  return Math.round((lo + hi) / 2);
}

export function calculateSavings(result: DiagnoseResponse): number | null {
  if (result.status !== 'ready_for_repair' && result.status !== 'planning_complete') return null;
  const pro = getProCostMidpoint(result);
  const diy = result.estimatedDIYCost ?? 20;
  return Math.max(0, pro - diy);
}
