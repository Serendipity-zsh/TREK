const { getVacayPlan, updateVacayPlan, getVacayStats, getVacayEntries, toggleVacayEntry, toggleCompanyHoliday, updateVacayStats, getVacayAvailableUsers, inviteVacayUser, getVacayShares, getVacayShareUsers, shareVacayCalendar, deleteVacayShare } = require('../../utils/api')
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
  data: { year: new Date().getFullYear(), months: [], editMonth: new Date().getMonth(), editTitle: `${new Date().getMonth() + 1}月`, weekdays: ['一', '二', '三', '四', '五', '六', '日'], plan: {}, stats: {}, entries: [], companyHolidays: [], userInitial: '我', loading: true, error: '', view: 'grid', mode: 'vacation', halfDay: false, compDay: false, selectedDate: '' },
  onLoad() { this.setData({ userInitial: String(getApp().globalData.user?.username || '我').slice(0, 1).toUpperCase() }); this.load() },
  load() { this.setData({ loading: true, error: '' }); Promise.all([getVacayPlan(), getVacayStats(this.data.year), getVacayEntries(this.data.year)]).then(([plan, stats, entries]) => { const data = entries || {}; this.setData({ plan: plan.plan || plan, stats: stats.stats || stats, entries: data.entries || [], companyHolidays: data.companyHolidays || data.company_holidays || [], loading: false }, () => this.refreshMonths()) }).catch((err) => this.setData({ months: this.buildMonths(), loading: false, error: err.message || '假期日历加载失败' })) },
  buildMonths() { const state = { entries: this.data.entries || [], companyHolidays: this.data.companyHolidays || [], selectedDate: this.data.selectedDate }; return Array.from({ length: 12 }, (_, i) => month(this.data.year, i, state)) },
  refreshMonths() { this.setData({ months: this.buildMonths(), editTitle: `${this.data.editMonth + 1}月` }) },
  previousYear() { this.setData({ year: this.data.year - 1 }, () => this.load()) },
  nextYear() { this.setData({ year: this.data.year + 1 }, () => this.load()) },
  openMonth(e) { const editMonth = Number(e.currentTarget.dataset.month); this.setData({ view: 'edit', editMonth, editTitle: `${editMonth + 1}月` }) },
  toggleView() { this.setData({ view: this.data.view === 'grid' ? 'edit' : 'grid', editMonth: this.data.editMonth == null ? new Date().getMonth() : this.data.editMonth }) },
  previousMonth() { const editMonth = (this.data.editMonth + 11) % 12; this.setData({ editMonth, editTitle: `${editMonth + 1}月` }) },
  nextMonth() { const editMonth = (this.data.editMonth + 1) % 12; this.setData({ editMonth, editTitle: `${editMonth + 1}月` }) },
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
  openInvite() {
    getVacayAvailableUsers().then((data) => {
      const users = data.users || []
      if (!users.length) return wx.showToast({ title: '暂无可邀请的用户', icon: 'none' })
      wx.showActionSheet({ itemList: users.slice(0, 6).map((user) => user.username || user.email || `用户${user.id}`), success: (result) => inviteVacayUser(users[result.tapIndex].id).then(() => wx.showToast({ title: '邀请已发送', icon: 'success' })).catch((err) => wx.showToast({ title: err.errMsg || '邀请失败', icon: 'none' })) })
    }).catch((err) => wx.showToast({ title: err.errMsg || '加载用户失败', icon: 'none' }))
  },
  openShares() {
    Promise.all([getVacayShares(), getVacayShareUsers()]).then(([shares, users]) => {
      const activeShares = shares.shares || shares || []
      const available = users.users || []
      if (available.length) {
        wx.showActionSheet({ itemList: available.slice(0, 6).map((user) => `共享给 ${user.username || user.email}`), success: (result) => shareVacayCalendar(available[result.tapIndex].id).then(() => wx.showToast({ title: '共享已发送', icon: 'success' })).catch((err) => wx.showToast({ title: err.errMsg || '共享失败', icon: 'none' })) })
        return
      }
      if (!activeShares.length) wx.showToast({ title: '暂无共享日历', icon: 'none' })
      else wx.showModal({ title: '共享日历', content: activeShares.map((share) => `${share.username || share.email || '用户'}${share.hidden ? '（已隐藏）' : ''}`).join('\n'), showCancel: false })
    }).catch((err) => wx.showToast({ title: err.errMsg || '共享信息加载失败', icon: 'none' }))
  },
  openSettings() {
    const plan = this.data.plan || {}
    const choices = [`公司假期：${plan.company_holidays_enabled === false ? '关闭' : '开启'}`, `周末计入：${plan.block_weekends === false ? '否' : '是'}`, '切换周起始日']
    wx.showActionSheet({ itemList: choices, success: (result) => {
      if (result.tapIndex === 0) updateVacayPlan({ company_holidays_enabled: plan.company_holidays_enabled === false }).then(() => this.load()).catch((err) => wx.showToast({ title: err.errMsg || '设置保存失败', icon: 'none' }))
      if (result.tapIndex === 1) updateVacayPlan({ block_weekends: plan.block_weekends === false }).then(() => this.load()).catch((err) => wx.showToast({ title: err.errMsg || '设置保存失败', icon: 'none' }))
      if (result.tapIndex === 2) updateVacayPlan({ week_start: Number(plan.week_start) === 0 ? 1 : 0 }).then(() => this.load()).catch((err) => wx.showToast({ title: err.errMsg || '设置保存失败', icon: 'none' }))
    } })
  },
  goHome() { wx.navigateBack({ delta: 1 }) },
  openTools() { wx.navigateTo({ url: '../tools/tools' }) },
})
