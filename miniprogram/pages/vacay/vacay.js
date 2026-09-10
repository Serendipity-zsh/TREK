const { getVacayPlan, getVacayStats } = require('../../utils/api')
function month(year, m) { const start = (new Date(year, m, 1).getDay() + 6) % 7; const count = new Date(year, m + 1, 0).getDate(); const cells = Array(start).fill(null); for (let d = 1; d <= count; d += 1) cells.push({ day: d, weekend: ((start + d - 1) % 7) > 4 }); while (cells.length % 7) cells.push(null); const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7)); return { title: `${m + 1}月`, weeks } }
Page({
  data: { year: new Date().getFullYear(), months: [], weekdays: ['一', '二', '三', '四', '五', '六', '日'], plan: {}, stats: {}, userInitial: '我', loading: true, error: '' },
  onLoad() { this.setData({ userInitial: String(getApp().globalData.user?.username || '我').slice(0, 1).toUpperCase() }); this.load() },
  load() { this.setData({ loading: true }); Promise.all([getVacayPlan(), getVacayStats(this.data.year)]).then(([plan, stats]) => this.setData({ plan: plan.plan || plan, stats: stats.stats || stats, months: this.buildMonths(), loading: false })).catch((err) => this.setData({ months: this.buildMonths(), loading: false, error: err.message || '假期日历加载失败' })) },
  buildMonths() { return Array.from({ length: 12 }, (_, i) => month(this.data.year, i)) },
  previousYear() { this.setData({ year: this.data.year - 1 }, () => this.load()) },
  nextYear() { this.setData({ year: this.data.year + 1 }, () => this.load()) },
  goHome() { wx.navigateBack({ delta: 1 }) },
  openTools() { wx.navigateTo({ url: '../tools/tools' }) },
})
