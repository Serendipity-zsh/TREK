const { listJourneys, createJourney } = require('../../utils/api')

Page({
  data: { journeys: [], heroJourney: null, otherJourneys: [], loading: true, showCreate: false, title: '', error: '' },
  onShow() { this.load() },
  load() {
    this.setData({ loading: true, error: '' })
    listJourneys().then((data) => {
      const journeys = Array.isArray(data.journeys || data) ? (data.journeys || data) : []
      const decorated = journeys.map((journey, index) => ({
        ...journey,
        coverColor: ['#132039', '#235044', '#4b2d4f', '#7a4932'][index % 4],
      }))
      this.setData({ journeys: decorated, heroJourney: decorated[0] || null, otherJourneys: decorated.slice(1), loading: false })
    }).catch((err) => this.setData({ loading: false, error: err.message || '旅记加载失败' }))
  },
  openCreate() { this.setData({ showCreate: true, title: '' }) },
  closeCreate() { this.setData({ showCreate: false }) },
  onTitleInput(e) { this.setData({ title: e.detail.value }) },
  submitCreate() {
    const title = (this.data.title || '').trim()
    if (!title) return wx.showToast({ title: '请输入旅记名称', icon: 'none' })
    createJourney({ title }).then(() => { this.closeCreate(); this.load() }).catch((err) => wx.showToast({ title: err.message || '创建失败', icon: 'none' }))
  },
  openJourney(e) { wx.navigateTo({ url: `/pages/journey-detail/journey-detail?id=${e.currentTarget.dataset.id}` }) },
  noop() {},
  openTools() { wx.navigateTo({ url: '/pages/tools/tools' }) },
  openMap() { wx.switchTab ? wx.navigateTo({ url: '/pages/map/map' }) : null },
  openHome() { wx.navigateBack({ delta: 1 }) },
  openCalendar() { wx.navigateTo({ url: '/pages/vacay/vacay' }) },
  openAtlas() { wx.navigateTo({ url: '/pages/atlas/atlas' }) },
})
