<script setup>
// 縣市排名長條圖（bar chart race）：
// 參考 D3 Graph Gallery「Barplot – Change input data (upgraded)」與「Animation at loading」
// 以縣市名稱為 key 做 data join，年份改變時長條重新排序、長度與數字同步動畫
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import { METRICS, rankOf, extentOf, colorScale, fmt } from '../data/metrics.js'

const props = defineProps({ year: String, metric: String, hovered: String })
const emit = defineEmits(['hover'])

const svgRef = ref(null)
const N = 12
const W = 480, H = 470
const M = { top: 34, right: 70, bottom: 10, left: 64 }
const iw = W - M.left - M.right, ih = H - M.top - M.bottom
let g, gx, x, y

onMounted(() => {
  const svg = d3.select(svgRef.value)
  g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`)
  x = d3.scaleLinear().range([0, iw])
  y = d3.scaleBand().domain(d3.range(N + 1)).range([0, ih * (N + 1) / N]).padding(0.18)
  gx = g.append('g').attr('class', 'axis')
  g.append('g').attr('class', 'bars')
  update(true)
})

watch(() => [props.year, props.metric], ([, m], [, pm]) => update(false, m !== pm))

watch(() => props.hovered, h => {
  if (!g) return
  g.selectAll('.bar').classed('dim', d => !!h && d.name !== h)
})

function update(initial = false, metricChanged = false) {
  const data = rankOf(props.year, props.metric).slice(0, N)
  const sc = colorScale(props.metric)
  const dur = initial ? 900 : 750
  const t = d3.transition().duration(dur).ease(d3.easeCubicInOut)

  // x 軸範圍取「全部年份」最大值 → 長度可跨年份比較；切換指標時軸也一起 transition
  x.domain([0, extentOf(props.metric)[1]]).nice()
  gx.transition(t).call(d3.axisTop(x).ticks(4).tickFormat(d3.format('~s')).tickSizeOuter(0))
  gx.selectAll('.tick line').attr('y2', ih).attr('stroke', '#eef0f3')

  const rows = g.select('.bars').selectAll('.bar').data(data, d => d.name)

  // enter：從底部長出來（寬度從 0 開始）
  const enter = rows.enter().append('g').attr('class', 'bar')
    .attr('transform', `translate(0,${y(N)})`)
    .on('mousemove', (event, d) => emit('hover', { name: d.name, x: event.clientX, y: event.clientY }))
    .on('mouseleave', () => emit('hover', null))
  enter.append('rect').attr('height', y.bandwidth()).attr('width', 0).attr('rx', 3)
  enter.append('text').attr('class', 'name').attr('x', -8).attr('y', y.bandwidth() / 2).attr('dy', '.35em')
    .attr('text-anchor', 'end').text(d => d.name)
  enter.append('text').attr('class', 'val').attr('y', y.bandwidth() / 2).attr('dy', '.35em').attr('x', 6)
    .each(function () { this._v = 0 })

  const merged = enter.merge(rows)
  merged.transition(t).attr('transform', (d, i) => `translate(0,${y(i)})`).style('opacity', 1)
  merged.select('rect').transition(t)
    .attr('width', d => x(d.value))
    .attr('fill', d => sc(d.value))
  merged.select('.val').transition(t)
    .attr('x', d => x(d.value) + 6)
    .tween('text', function (d) {
      const i = d3.interpolateNumber(this._v ?? 0, d.value)
      this._v = d.value
      return tt => { this.textContent = fmt(i(tt)) }
    })

  // exit：掉出前 12 名的縣市往下淡出
  rows.exit().transition(t).attr('transform', `translate(0,${y(N)})`).style('opacity', 0).remove()
}
</script>

<template>
  <div class="wrap">
    <div class="title">縣市排名（前 {{ N }} 名）· {{ METRICS[metric].label }}（{{ METRICS[metric].unit }}）</div>
    <svg ref="svgRef" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="各縣市稻米指標排名動態長條圖"></svg>
  </div>
</template>

<style scoped>
.title { font-size: 13px; font-weight: 600; color: #1a1a1a; margin: 0 0 2px 4px; }
svg { display: block; width: 100%; height: auto; overflow: visible; }
:deep(.bar) { cursor: pointer; }
:deep(.bar.dim) { opacity: .3 !important; }
:deep(.bar .name) { font-size: 12px; fill: #1a1a1a; }
:deep(.bar .val) { font-size: 11px; fill: #374151; font-variant-numeric: tabular-nums; }
:deep(.axis text) { font-size: 10px; fill: #6b7280; }
:deep(.axis path) { display: none; }
</style>
