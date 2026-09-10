function buildMonth(year, month) {
  const first = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const cells = Array(first).fill('')
  for (let day = 1; day <= days; day += 1) cells.push(String(day))
  while (cells.length % 7) cells.push('')
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return { title: `${month + 1}月`, weeks }
}

Page({
  data: { year: new Date().getFullYear(), months: [], weekdays: ['日', '一', '二', '三', '四', '五', '六'] },
  onLoad() { this.rebuild() },
  rebuild() { this.setData({ months: Array.from({ length: 12 }, (_, index) => buildMonth(this.data.year, index)) }) },
  previousYear() { this.setData({ year: this.data.year - 1 }, () => this.rebuild()) },
  nextYear() { this.setData({ year: this.data.year + 1 }, () => this.rebuild()) },
  goHome() { wx.navigateBack({ delta: 1 }) },
  openTools() { wx.navigateTo({ url: '../tools/tools' }) },
})
