<script setup>
// 動態 choropleth：年份 / 指標改變時，各縣市顏色以 transition 平滑漸變
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import geo from '../data/taiwan-counties.json'
import { METRICS, valueOf, colorScale, NODATA } from '../data/metrics.js'

const props = defineProps({ year: String, metric: String, hovered: String })
const emit = defineEmits(['hover'])

const svgRef = ref(null)
const W = 460, H = 600
let paths, yearLabel, legendG

const fillOf = d => {
  const v = valueOf(props.year, d.properties.name, props.metric)
  return v == null ? NODATA : colorScale(props.metric)(v)
}

onMounted(() => {
  const svg = d3.select(svgRef.value)
  const projection = d3.geoMercator().fitExtent([[10, 30], [W - 10, H - 80]], geo)
  const path = d3.geoPath(projection)

  // 背景大字年份（bar chart race 常見手法）
  yearLabel = svg.append('text').attr('class', 'year-label')
    .attr('x', 16).attr('y', 78).text(props.year)

  paths = svg.append('g').selectAll('path')
    .data(geo.features, d => d.properties.name)
    .join('path')
      .attr('class', 'county')
      .attr('d', path)
      .attr('fill', NODATA)
    .on('mousemove', (event, d) => emit('hover', { name: d.properties.name, x: event.clientX, y: event.clientY }))
    .on('mouseleave', () => emit('hover', null))

  // 載入動畫：從灰色漸變成實際顏色
  paths.transition().duration(900).delay((d, i) => i * 25).attr('fill', fillOf)

  legendG = svg.append('g').attr('class', 'legend').attr('transform', `translate(18,${H - 52})`)
  drawLegend()
})

// 年份或指標改變 → 顏色 transition
watch(() => [props.year, props.metric], ([y, m], [, pm]) => {
  if (!paths) return
  paths.transition().duration(750).ease(d3.easeCubicInOut).attr('fill', fillOf)
  yearLabel.text(y)
  if (m !== pm) drawLegend()
})

// 與長條圖聯動的高亮
watch(() => props.hovered, h => {
  if (!paths) return
  paths.classed('dim', d => !!h && d.properties.name !== h)
       .classed('active', d => d.properties.name === h)
  if (h) paths.filter(d => d.properties.name === h).raise()
})

// 連續色階圖例（漸層 + 刻度），切換指標時重畫
function drawLegend() {
  const m = METRICS[props.metric]
  const sc = colorScale(props.metric)
  const w = 220
  const axisScale = (m.scale === 'sqrt' ? d3.scaleSqrt() : d3.scaleLinear())
    .domain(sc.domain()).range([0, w])

  legendG.selectAll('*').remove()
  const grad = legendG.append('defs').append('linearGradient').attr('id', 'map-grad')
  d3.range(0, 1.0001, 0.1).forEach(t =>
    grad.append('stop').attr('offset', t).attr('stop-color', sc(axisScale.invert(t * w))))

  legendG.append('text').attr('class', 'cap').attr('y', -8).text(`${m.label}（${m.unit}）`)
  legendG.append('rect').attr('width', w).attr('height', 10).attr('rx', 2).attr('fill', 'url(#map-grad)')
  // 平方根比例的刻度在右端會擠在一起 → 只保留彼此間距 ≥ 40px 的刻度
  const ticks = []
  let last = -Infinity
  for (const v of axisScale.ticks(12)) {
    const px = axisScale(v)
    if (px - last >= 40) { ticks.push(v); last = px }
  }
  legendG.append('g').attr('class', 'axis').attr('transform', 'translate(0,10)')
    .call(d3.axisBottom(axisScale).tickValues(ticks).tickFormat(d3.format('~s')).tickSizeOuter(0))
  const nd = legendG.append('g').attr('transform', `translate(${w + 18},0)`)
  nd.append('rect').attr('width', 12).attr('height', 10).attr('rx', 2).attr('fill', NODATA)
  nd.append('text').attr('x', 16).attr('y', 9).text('無稻作')

  legendG.attr('opacity', 0).transition().duration(400).attr('opacity', 1)
}
</script>

<template>
  <svg ref="svgRef" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="台灣各縣市稻米指標動態地圖"></svg>
</template>

<style scoped>
svg { display: block; width: 100%; height: auto; }
:deep(.county) { stroke: #fff; stroke-width: .7; cursor: pointer; transition: opacity .2s; }
:deep(.county.dim) { opacity: .35; }
:deep(.county.active) { stroke: #111; stroke-width: 1.6; }
:deep(.year-label) { font-size: 64px; font-weight: 800; fill: #e3e8e1; letter-spacing: 1px; font-variant-numeric: tabular-nums; }
:deep(.legend text) { font-size: 11px; fill: #374151; }
:deep(.legend .cap) { font-size: 12px; font-weight: 600; fill: #1a1a1a; }
:deep(.legend .axis path), :deep(.legend .axis line) { stroke: #9ca3af; }
</style>
