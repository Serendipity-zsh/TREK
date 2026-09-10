const api = require('../../utils/api')

Page({
  data: { id: '', trip: null, days: [], places: [], loading: true, error: '', selectedDayId: '', showPlacePicker: false },
  onLoad(options) { this.setData({ id: options.id || '' }); this.load() },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()) },
  load() {
    if (!this.data.id) return Promise.resolve()
    this.setData({ loading: true, error: '' })
    return Promise.all([api.getTrip(this.data.id), api.listDays(this.data.id), api.listPlaces(this.data.id)])
      .then(([tripResult, dayResult, placeResult]) => {
        const days = dayResult.days || []
        this.setData({ trip: tripResult.trip, days, places: placeResult.places || [], selectedDayId: this.data.selectedDayId || (days[0] && String(days[0].id)) || '' })
      })
      .catch((error) => this.setData({ error: error.errMsg || '行程加载失败' }))
      .finally(() => this.setData({ loading: false }))
  },
  addDay() { api.createDay(this.data.id).then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '添加日期失败', icon: 'none' })) },
  removeDay(event) {
    const dayId = event.currentTarget.dataset.id
    wx.showModal({ title: '删除这一天？', content: '当天的安排也会从行程中移除。', success: (result) => {
      if (result.confirm) api.deleteDay(this.data.id, dayId).then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '删除失败', icon: 'none' }))
    } })
  },
  selectDay(event) { this.setData({ selectedDayId: String(event.currentTarget.dataset.id) }) },
  openPlacePicker(event) { this.setData({ selectedDayId: String(event.currentTarget.dataset.id), showPlacePicker: true }) },
  closePlacePicker() { this.setData({ showPlacePicker: false }) },
  noop() {},
  addPlace(event) {
    const place = this.data.places[event.currentTarget.dataset.index]
    if (!place || !this.data.selectedDayId) return
    api.createAssignment(this.data.id, this.data.selectedDayId, { place_id: place.id })
      .then(() => { this.setData({ showPlacePicker: false }); return this.load() })
      .catch((error) => wx.showToast({ title: error.errMsg || '添加地点失败', icon: 'none' }))
  },
  openMap() { wx.navigateTo({ url: `../map/map?tripId=${this.data.id}&dayId=${this.data.selectedDayId}` }) },
  openTools(event) { wx.navigateTo({ url: `../tools/tools?tripId=${this.data.id}&tab=${event.currentTarget.dataset.tab}` }) },
})
