const api = require('../../utils/api')
Page({
  data: { id: '', journey: null, entries: [], loading: true, showCreate: false, title: '', body: '', error: '' },
  onLoad(options) { this.setData({ id: options.id || '' }); this.load() },
  load() {
    if (!this.data.id) return
    this.setData({ loading: true, error: '' })
    Promise.all([api.getJourney(this.data.id), api.listJourneyEntries(this.data.id)]).then(([journey, entries]) => {
      this.setData({ journey: journey.journey || journey, entries: entries.entries || entries || [], loading: false })
    }).catch((err) => this.setData({ loading: false, error: err.message || '旅记加载失败' }))
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
  back() { wx.navigateBack({ delta: 1 }) },
})
