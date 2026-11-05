<script setup>
// 全國趨勢折線：參考 D3 Graph Gallery「Line – Transition between input data」與「Add cursor」
// 切換指標時折線與 y 軸 transition；年份改變時游標移動；點擊圓點可跳到該年
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import { YEARS, METRICS, nationalOf, fmt } from '../data/metrics.js'

const props = defineProps({ year: String, metric: String })
const emit = defineEmits(['select'])

const svgRef = ref(null)
const W = 960, H = 210
const M = { top: 26, right: 30, bottom: 28, left: 70 }
const iw = W - M.left - M.right, ih = H - M.top - M.bottom
let g, x, y, gy, line, area, pathL, pathA, dots, cursor, cursorLbl

const series = () => YEARS.map(yr => ({ year: yr, value: nationalOf(yr, props.metric) }))

onMounted(() => {
  const svg = d3.select(svgRef.value)
  g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`)
  x = d3.scalePoint().domain(YEARS).range([0, iw]).padding(0.3)
  y = d3.scaleLinear().range([ih, 0])
  line = d3.line().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX)
  area = d3.area().x(d => x(d.year)).y0(ih).y1(d => y(d.value)).curve(d3.curveMonotoneX)

  g.append('g').attr('class', 'axis x').attr('transform', `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSizeOuter(0))
  gy = g.append('g').attr('class', 'axis y')

  cursor = g.append('line').attr('class', 'cursor').attr('y1', 0).attr('y2', ih)
  pathA = g.append('path').attr('class', 'area')
  pathL = g.append('path').attr('class', 'line')
  dots = g.append('g')
  cursorLbl = g.append('text').attr('class', 'cursor-lbl').attr('text-anchor', 'middle')

  draw(true)
})

watch(() => props.metric, () => draw(false))
watch(() => props.year, () => moveCursor(true))

function draw(initial) {
  const data = series()
  const [lo, hi] = d3.extent(data, d => d.value)
  const pad = (hi - lo) * 0.25 || hi * 0.1
  y.domain([lo - pad, hi + pad]).nice()
  const t = d3.transition().duration(initial ? 0 : 750).ease(d3.easeCubicInOut)

  gy.transition(t).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('~s')).tickSizeOuter(0))
  gy.selectAll('.tick line').attr('x2', iw).attr('stroke', '#eef0f3')

  if (initial) {
    // 載入動畫：折線從左畫到右
    pathL.datum(data).attr('d', line)
    pathA.datum(data).attr('d', area).attr('opacity', 0).transition().duration(1200).attr('opacity', 1)
    const len = pathL.node().getTotalLength()
    pathL.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len)
      .transition().duration(1200).ease(d3.easeCubicOut).attr('stroke-dashoffset', 0)
      .on('end', () => pathL.attr('stroke-dasharray', null))
  } else {
    pathL.datum(data).transition(t).attr('d', line)
    pathA.datum(data).transition(t).attr('d', area)
  }

  dots.selectAll('circle').data(data, d => d.year)
    .join(enter => enter.append('circle').attr('r', 4.5)
      .attr('cx', d => x(d.year)).attr('cy', d => y(d.value))
      .on('click', (e, d) => emit('select', d.year)))
    .transition(t).attr('cx', d => x(d.year)).attr('cy', d => y(d.value))

  moveCursor(!initial)
}

function moveCursor(animate) {
  const d = series().find(s => s.year === props.year)
  const t = d3.transition().duration(animate ? 600 : 0).ease(d3.easeCubicInOut)
  cursor.transition(t).attr('x1', x(d.year)).attr('x2', x(d.year))
  cursorLbl.transition(t).attr('x', x(d.year)).attr('y', y(d.value) - 12).text(fmt(d.value))
  dots.selectAll('circle').classed('on', c => c.year === props.year)
}
</script>

<template>
  <div class="wrap">
    <div class="title">全國{{ METRICS[metric].label }}趨勢（{{ METRICS[metric].unit }}）· 點圓點可跳到該年</div>
    <svg ref="svgRef" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="全國稻米指標逐年趨勢折線圖"></svg>
  </div>
</template>

<style scoped>
.title { font-size: 13px; font-weight: 600; color: #1a1a1a; margin: 0 0 2px 4px; }
svg { display: block; width: 100%; height: auto; overflow: visible; }
:deep(.line) { fill: none; stroke: #2f7d36; stroke-width: 2.4; }
:deep(.area) { fill: #2f7d36; fill-opacity: .08; }
:deep(circle) { fill: #fff; stroke: #2f7d36; stroke-width: 2; cursor: pointer; transition: r .15s; }
:deep(circle:hover) { r: 7; }
:deep(circle.on) { fill: #2f7d36; r: 6.5; }
:deep(.cursor) { stroke: #9ca3af; stroke-dasharray: 3 3; }
:deep(.cursor-lbl) { font-size: 12px; font-weight: 700; fill: #14532d; paint-order: stroke; stroke: #fff; stroke-width: 3px; font-variant-numeric: tabular-nums; }
:deep(.axis text) { font-size: 11px; fill: #6b7280; }
:deep(.axis path) { stroke: #d1d5db; }
:deep(.axis.y path) { display: none; }
</style>
