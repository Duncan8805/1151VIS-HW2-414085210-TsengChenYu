<script setup>
// 狀態集中在 App（Vue 管狀態），三個 D3 元件依 props 重繪（D3 管繪圖與動畫）
import { ref, computed, onBeforeUnmount } from 'vue'
import TaiwanMap from './components/TaiwanMap.vue'
import RankBars from './components/RankBars.vue'
import TrendLine from './components/TrendLine.vue'
import { YEARS, METRICS, valueOf, nationalOf, rankOf, fmt } from './data/metrics.js'

const idx = ref(0)
const year = computed(() => YEARS[idx.value])
const metric = ref('production')
const hovered = ref(null)
const tip = ref(null)
const playing = ref(false)
let timer = null

function play() {
  if (playing.value) return stop()
  if (idx.value >= YEARS.length - 1) idx.value = 0
  playing.value = true
  timer = setInterval(() => {
    if (idx.value >= YEARS.length - 1) return stop()
    idx.value++
  }, 1300)
}
function stop() { playing.value = false; clearInterval(timer); timer = null }
onBeforeUnmount(stop)

function onHover(h) { hovered.value = h?.name ?? null; tip.value = h }
function selectYear(y) { stop(); idx.value = YEARS.indexOf(y) }
function onSlider() { stop() }

// 與前一年比較（▲▼）
function yoy(cur, prev) {
  if (cur == null || prev == null || prev === 0) return null
  return (cur - prev) / prev
}
const pct = v => (v > 0 ? '▲ ' : v < 0 ? '▼ ' : '') + Math.abs(v * 100).toFixed(1) + '%'
const prevYear = computed(() => (idx.value > 0 ? YEARS[idx.value - 1] : null))

const kpi = computed(() => {
  const cur = nationalOf(year.value, metric.value)
  const prev = prevYear.value ? nationalOf(prevYear.value, metric.value) : null
  return { cur, change: yoy(cur, prev), top: rankOf(year.value, metric.value)[0] }
})

const tipInfo = computed(() => {
  if (!tip.value) return null
  const name = tip.value.name
  const cur = valueOf(year.value, name, metric.value)
  const prev = prevYear.value ? valueOf(prevYear.value, name, metric.value) : null
  const rank = rankOf(year.value, metric.value).findIndex(d => d.name === name) + 1
  return { name, cur, change: yoy(cur, prev), rank }
})
</script>

<template>
  <div class="page">
    <header>
      <h1>台灣稻米產量的十年變化（2005–2014）</h1>
      <p class="sub">Vue 3 + D3.js 動態視覺化 · 按播放看逐年變化，或拖曳年份、切換指標、滑過縣市</p>
    </header>

    <section class="controls">
      <button class="play" :class="{ on: playing }" @click="play" :aria-label="playing ? '暫停' : '播放'">
        <span v-if="!playing">▶ 播放</span><span v-else>❚❚ 暫停</span>
      </button>
      <div class="slider">
        <input type="range" min="0" :max="YEARS.length - 1" step="1" v-model.number="idx" @input="onSlider" aria-label="年份" />
        <div class="ticks"><span v-for="y in YEARS" :key="y" :class="{ on: y === year }">{{ y }}</span></div>
      </div>
      <div class="seg" role="group" aria-label="指標">
        <button v-for="(m, k) in METRICS" :key="k" :class="{ on: metric === k }" @click="metric = k">{{ m.label }}</button>
      </div>
    </section>

    <section class="kpis">
      <div class="kpi">
        <div class="k-label">{{ year }} 全國{{ METRICS[metric].label }}</div>
        <div class="k-val">{{ fmt(kpi.cur) }} <small>{{ METRICS[metric].unit }}</small></div>
        <div class="k-chg" :class="{ up: kpi.change > 0, down: kpi.change < 0 }">
          {{ kpi.change == null ? '—（起始年）' : pct(kpi.change) + ' vs ' + prevYear }}
        </div>
      </div>
      <div class="kpi">
        <div class="k-label">{{ year }} 第一名</div>
        <div class="k-val">{{ kpi.top.name }}</div>
        <div class="k-chg">{{ fmt(kpi.top.value) }} {{ METRICS[metric].unit }}</div>
      </div>
    </section>

    <section class="grid">
      <div class="card map"><TaiwanMap :year="year" :metric="metric" :hovered="hovered" @hover="onHover" /></div>
      <div class="card bars"><RankBars :year="year" :metric="metric" :hovered="hovered" @hover="onHover" /></div>
      <div class="card trend"><TrendLine :year="year" :metric="metric" @select="selectYear" /></div>
    </section>

    <div v-if="tipInfo" class="tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
      <b>{{ tipInfo.name }}</b> · {{ year }}<br />
      <template v-if="tipInfo.cur != null">
        {{ METRICS[metric].label }}：{{ fmt(tipInfo.cur) }} {{ METRICS[metric].unit }}<br />
        全國第 {{ tipInfo.rank }} 名
        <span v-if="tipInfo.change != null" :class="tipInfo.change >= 0 ? 'up' : 'down'"> · {{ pct(tipInfo.change) }}</span>
      </template>
      <template v-else>無稻作生產統計</template>
    </div>

    <footer>
      資料來源：農業部農業資料開放平臺《臺灣地區稻作種植、收穫面積及產量》（產量為糙米公噸）。2010 年前之台北縣、台中縣、台南縣、高雄縣已併入現行縣市。
      2015 年起開放資料出現縣市錯置、重複列與缺漏，經清理檢核後僅採用結構完整、無異常的 2005–2014 年。金門、連江無稻作資料。地圖：g0v twgeojson。
    </footer>
  </div>
</template>

<style>
* { box-sizing: border-box; }
body {
  margin: 0; background: #f6f7f5; color: #1a1a1a;
  font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.page { max-width: 1040px; margin: 0 auto; padding: 24px 20px 40px; }
header h1 { font-size: 24px; margin: 0 0 4px; letter-spacing: .5px; }
header .sub { margin: 0; color: #6b7280; font-size: 14px; }

.controls { display: flex; align-items: center; gap: 16px; margin: 18px 0 12px; flex-wrap: wrap;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 16px; }
.play { border: 0; background: #2f7d36; color: #fff; font-size: 14px; font-weight: 700;
  padding: 9px 16px; border-radius: 8px; cursor: pointer; min-width: 92px; font-family: inherit; }
.play.on { background: #14532d; }
.slider { flex: 1; min-width: 260px; }
.slider input { width: 100%; accent-color: #2f7d36; margin: 0; }
.ticks { display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; padding: 0 2px; font-variant-numeric: tabular-nums; }
.ticks .on { color: #14532d; font-weight: 700; }
.seg { display: inline-flex; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
.seg button { border: 0; background: #fff; padding: 8px 12px; font-size: 13px; cursor: pointer; color: #374151; font-family: inherit; }
.seg button + button { border-left: 1px solid #d1d5db; }
.seg button.on { background: #e8f2e2; color: #14532d; font-weight: 700; }

.kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
.kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 16px; }
.k-label { font-size: 12px; color: #6b7280; }
.k-val { font-size: 24px; font-weight: 800; margin-top: 2px; font-variant-numeric: tabular-nums; }
.k-val small { font-size: 13px; font-weight: 500; color: #6b7280; }
.k-chg { font-size: 13px; color: #6b7280; margin-top: 2px; font-variant-numeric: tabular-nums; }
.up { color: #15803d !important; }
.down { color: #b91c1c !important; }

.grid { display: grid; grid-template-columns: minmax(0, 46fr) minmax(0, 54fr); gap: 12px; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
.card.trend { grid-column: 1 / -1; }

.tip { position: fixed; pointer-events: none; background: #111; color: #fff; font-size: 12px; line-height: 1.5;
  padding: 7px 10px; border-radius: 8px; transform: translate(14px, 14px); white-space: nowrap; z-index: 10;
  box-shadow: 0 4px 14px rgba(0,0,0,.25); }
.tip .up { color: #86efac !important; } .tip .down { color: #fca5a5 !important; }

footer { margin-top: 14px; color: #6b7280; font-size: 12px; line-height: 1.7; }

@media (max-width: 760px) {
  .grid { grid-template-columns: 1fr; }
  .kpis { grid-template-columns: 1fr; }
}
</style>
