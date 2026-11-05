// 資料存取與比例尺：所有元件共用，確保地圖、長條圖、折線圖用同一套數值與顏色
import * as d3 from 'd3'
import series from './riceSeries.json'

export const YEARS = series.years          // ['2005', ..., '2014']
export const COUNTIES = series.counties    // 20 個縣市（金門、連江無稻作資料）

export const METRICS = {
  production: { label: '稻米產量',     unit: '公噸',      scale: 'sqrt'   },
  area:       { label: '收穫面積',     unit: '公頃',      scale: 'sqrt'   },
  yield:      { label: '單位面積產量', unit: '公斤/公頃', scale: 'linear' },
}

export const fmt = d3.format(',.0f')

// 某年某縣市的指標值；無稻作（0）回傳 null，畫成灰色「無資料」
export function valueOf(year, county, metric) {
  const rec = series.data[year]?.[county]
  if (!rec) return null
  const [p, a] = rec               // p = 糙米產量（公噸）、a = 收穫面積（公頃）
  if (p <= 0 || a <= 0) return null
  if (metric === 'production') return p
  if (metric === 'area') return a
  return (p / a) * 1000            // 單位面積產量：公斤/公頃
}

// 全國值（單產用總產量 ÷ 總面積，而不是各縣市平均）
export function nationalOf(year, metric) {
  let P = 0, A = 0
  for (const c of COUNTIES) { const [p, a] = series.data[year][c]; P += p; A += a }
  if (metric === 'production') return P
  if (metric === 'area') return A
  return (P / A) * 1000
}

// 某年依指標排序（大→小）
export function rankOf(year, metric) {
  return COUNTIES
    .map(name => ({ name, value: valueOf(year, name, metric) }))
    .filter(d => d.value != null)
    .sort((a, b) => b.value - a.value)
}

// 以「全部年份」計算範圍 → 比例尺固定，不同年份之間顏色與長度可直接比較
const extentCache = {}
export function extentOf(metric) {
  if (extentCache[metric]) return extentCache[metric]
  const vals = []
  for (const y of YEARS) for (const c of COUNTIES) {
    const v = valueOf(y, c, metric)
    if (v != null) vals.push(v)
  }
  return (extentCache[metric] = d3.extent(vals))
}

// 單一色相（綠）連續色階；產量/面積用平方根比例，避免小縣市全部擠在最淺色
const interp = d3.interpolateRgbBasis(['#eef6e8', '#c4e2b2', '#7cc26a', '#3a8a40', '#0f4a26'])
const scaleCache = {}
export function colorScale(metric) {
  if (scaleCache[metric]) return scaleCache[metric]
  const [lo, hi] = extentOf(metric)
  const s = METRICS[metric].scale === 'sqrt'
    ? d3.scaleSequentialSqrt(interp).domain([0, hi])
    : d3.scaleSequential(interp).domain([lo, hi])
  return (scaleCache[metric] = s)
}

export const NODATA = '#d9dce1'
