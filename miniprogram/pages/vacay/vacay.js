const { getVacayPlan, getVacayStats, getVacayEntries, toggleVacayEntry, toggleCompanyHoliday, updateVacayStats } = require('../../utils/api')
function dateKey(year, month, day) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` }
function month(year, m, state) {
  const start = (new Date(year, m, 1).getDay() + 6) % 7
  const count = new Date(year, m + 1, 0).getDate()
  const cells = Array(start).fill(null)
  for (let d = 1; d <= count; d += 1) {
    const date = dateKey(year, m, d)
    const own = state.entries.find((item) => item.date === date)
    cells.push({ day: d, date, weekend: ((start + d - 1) % 7) > 4, logged: !!own, half: own && Number(own.fraction) === 0.5, comp: own && own.kind === 'comp', company: state.companyHolidays.some((item) => item.date === date), selected: state.selectedDate === date })
  }
  while (cells.length % 7) cells.push(null)
  const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return { title: `${m + 1}月`, year, month: m, weeks }
}
Page({
  data: { year: new Date().getFullYear(), months: [], weekdays: ['一', '二', '三', '四', '五', '六', '日'], plan: {}, stats: {}, entries: [], companyHolidays: [], userInitial: '我', loading: true, error: '', view: 'grid', mode: 'vacation', halfDay: false, compDay: false, selectedDate: '' },
  onLoad() { this.setData({ userInitial: String(getApp().globalData.user?.username || '我').slice(0, 1).toUpperCase() }); this.load() },
  load() { this.setData({ loading: true, error: '' }); Promise.all([getVacayPlan(), getVacayStats(this.data.year), getVacayEntries(this.data.year)]).then(([plan, stats, entries]) => { const data = entries || {}; this.setData({ plan: plan.plan || plan, stats: stats.stats || stats, entries: data.entries || [], companyHolidays: data.companyHolidays || data.company_holidays || [], loading: false }, () => this.refreshMonths()) }).catch((err) => this.setData({ months: this.buildMonths(), loading: false, error: err.message || '假期日历加载失败' })) },
  buildMonths() { const state = { entries: this.data.entries || [], companyHolidays: this.data.companyHolidays || [], selectedDate: this.data.selectedDate }; return Array.from({ length: 12 }, (_, i) => month(this.data.year, i, state)) },
  refreshMonths() { this.setData({ months: this.buildMonths() }) },
  previousYear() { this.setData({ year: this.data.year - 1 }, () => this.load()) },
  nextYear() { this.setData({ year: this.data.year + 1 }, () => this.load()) },
  openMonth(e) { this.setData({ view: 'edit', editMonth: Number(e.currentTarget.dataset.month) }) },
  toggleView() { this.setData({ view: this.data.view === 'grid' ? 'edit' : 'grid' }) },
  dayTap(e) {
    const cell = e.currentTarget.dataset.cell
    if (!cell || !cell.date) return
    if (this.data.view !== 'edit') { this.setData({ view: 'edit', editMonth: Number(cell.date.slice(5, 7)) - 1 }); return }
    this.setData({ selectedDate: cell.date }, () => {
      const payload = this.data.mode === 'company' ? { date: cell.date } : { date: cell.date, fraction: this.data.halfDay ? 0.5 : 1, kind: this.data.compDay ? 'comp' : 'vacation' }
      const request = this.data.mode === 'company' ? toggleCompanyHoliday(payload) : toggleVacayEntry(payload)
      request.then(() => this.load()).catch((err) => this.setData({ error: err.message || '日期保存失败' }))
    })
  },
  changeMode(e) { this.setData({ mode: e.currentTarget.dataset.mode }) },
  toggleHalfDay() { this.setData({ halfDay: !this.data.halfDay }) },
  toggleCompDay() { this.setData({ compDay: !this.data.compDay }) },
  adjustAllowance(e) { const delta = Number(e.currentTarget.dataset.delta); const current = Number(this.data.stats.vacation_days || this.data.stats.total_available || 0); const next = Math.max(0, Math.min(365, current + delta)); updateVacayStats(this.data.year, { vacation_days: next }).then(() => this.load()).catch((err) => this.setData({ error: err.message || '额度保存失败' })) },
  goHome() { wx.navigateBack({ delta: 1 }) },
  openTools() { wx.navigateTo({ url: '../tools/tools' }) },
})
