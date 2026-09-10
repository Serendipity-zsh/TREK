const api = require('../../utils/api')
Page({
  data: { id: '', journey: null, entries: [], loading: true, showCreate: false, title: '', body: '', error: '', view: 'list', activeId: '', markers: [], mapLatitude: 31.23, mapLongitude: 121.47 },
  onLoad(options) { this.setData({ id: options.id || '' }); this.load() },
  load() {
    if (!this.data.id) return
    this.setData({ loading: true, error: '' })
    Promise.all([api.getJourney(this.data.id), api.listJourneyEntries(this.data.id)]).then(([journey, entries]) => {
      const list = entries.entries || entries || []
      this.setData({ journey: journey.journey || journey, entries: list, loading: false })
      this.updateMarkers(list)
    }).catch((err) => this.setData({ loading: false, error: err.message || '旅记加载失败' }))
  },
  selectEntry(e) { this.setData({ activeId: String(e.currentTarget.dataset.id) === this.data.activeId ? '' : String(e.currentTarget.dataset.id) }) },
  showList() { this.setData({ view: 'list' }) },
  showMap() { this.setData({ view: 'map' }) },
  updateMarkers(entries) {
    const points = entries.filter((entry) => Number.isFinite(Number(entry.lat || entry.latitude)) && Number.isFinite(Number(entry.lng || entry.longitude)))
    const markers = points.map((entry, index) => ({ id: Number(entry.id || index), latitude: Number(entry.lat || entry.latitude), longitude: Number(entry.lng || entry.longitude), width: 30, height: 30, callout: { content: entry.title || '旅记', display: 'ALWAYS', padding: 6, borderRadius: 8 } }))
    const first = points[0]
    this.setData({ markers, mapLatitude: first ? Number(first.lat || first.latitude) : 31.23, mapLongitude: first ? Number(first.lng || first.longitude) : 121.47 })
  },
  openMap() {
    const first = this.data.entries.find((entry) => entry.lat != null || entry.latitude != null)
    wx.navigateTo({ url: first ? `/pages/map/map?lat=${first.lat || first.latitude}&lng=${first.lng || first.longitude}` : '/pages/map/map' })
  },
  openCreate() { this.setData({ showCreate: true, title: '', body: '' }) },
  closeCreate() { this.setData({ showCreate: false }) },
  inputTitle(e) { this.setData({ title: e.detail.value }) },
  inputBody(e) { this.setData({ body: e.detail.value }) },
  submitCreate() {
    const title = (this.data.title || '').trim()
    if (!title) return wx.showToast({ title: '请输入标题', icon: 'none' })
    api.createJourneyEntry(this.data.id, { title, body: this.data.body || '' }).then(() => { this.closeCreate(); this.load() }).catch((err) => wx.showToast({ title: err.message || '保存失败', icon: 'none' }))
  },
  removeEntry(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({ title: '删除这篇记录？', success: (r) => { if (r.confirm) api.deleteJourneyEntry(id).then(() => this.load()) } })
  },
  noop() {},
  back() { wx.navigateBack({ delta: 1 }) },
})
