const api = require('../../utils/api')

Page({
  data: { id: '', trip: null, days: [], places: [], loading: true, error: '', selectedDayId: '', showPlacePicker: false, activeTab: 'plan', tabItems: [], tabLoading: false, tabTotal: 0, collabNotes: [], files: [] },
  onLoad(options) { this.setData({ id: options.id || '', activeTab: options.tab || 'plan' }); this.load() },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()) },
  load() {
    if (!this.data.id) return Promise.resolve()
    this.setData({ loading: true, error: '' })
    return Promise.all([api.getTrip(this.data.id), api.listDays(this.data.id), api.listPlaces(this.data.id)])
      .then(([tripResult, dayResult, placeResult]) => {
        const days = dayResult.days || []
        this.setData({ trip: tripResult.trip, days, places: placeResult.places || [], selectedDayId: this.data.selectedDayId || (days[0] && String(days[0].id)) || '' })
        return this.loadTab()
      })
      .catch((error) => this.setData({ error: error.errMsg || '行程加载失败' }))
      .finally(() => this.setData({ loading: false }))
  },
  switchTab(event) {
    const activeTab = event.currentTarget.dataset.tab
    if (!activeTab || activeTab === this.data.activeTab) return
    this.setData({ activeTab, tabItems: [], tabTotal: 0 })
    if (activeTab === 'map') return this.openMap()
    if (activeTab === 'lists') return this.openTools({ currentTarget: { dataset: { tab: 'todo' } } })
    if (activeTab === 'costs') return this.openTools({ currentTarget: { dataset: { tab: 'budget' } } })
    this.loadTab()
  },
  loadTab() {
    const tab = this.data.activeTab
    if (tab === 'plan' || tab === 'map' || tab === 'lists' || tab === 'costs') return Promise.resolve()
    this.setData({ tabLoading: true })
    if (tab === 'collab') return api.listCollabNotes(this.data.id).then((result) => this.setData({ collabNotes: result.notes || [] })).catch((error) => this.setData({ error: error.errMsg || '协作记录加载失败' })).finally(() => this.setData({ tabLoading: false }))
    if (tab === 'files') return api.listTripFiles(this.data.id).then((result) => this.setData({ files: result.files || [] })).catch((error) => this.setData({ error: error.errMsg || '文件列表加载失败' })).finally(() => this.setData({ tabLoading: false }))
    return api.listReservations(this.data.id).then((result) => {
      const items = Array.isArray(result.items) ? result.items : []
      this.setData({ tabItems: items, tabTotal: items.length })
    }).catch((error) => this.setData({ error: error.errMsg || '行程数据加载失败' })).finally(() => this.setData({ tabLoading: false }))
  },
  addCollabNote() {
    wx.showModal({ title: '新增协作笔记', editable: true, placeholderText: '记录一个想法或提醒', success: (result) => {
      if (!result.confirm || !result.content.trim()) return
      api.createCollabNote(this.data.id, { title: '旅行笔记', content: result.content.trim() }).then(() => this.loadTab()).catch((error) => wx.showToast({ title: error.errMsg || '保存失败', icon: 'none' }))
    } })
  },
  removeCollabNote(e) { const note = this.data.collabNotes[e.currentTarget.dataset.index]; if (!note) return; api.deleteCollabNote(this.data.id, note.id).then(() => this.loadTab()).catch((error) => wx.showToast({ title: error.errMsg || '删除失败', icon: 'none' })) },
  addDay() { api.createDay(this.data.id).then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '添加日期失败', icon: 'none' })) },
  editTrip() {
    wx.showModal({ title: '编辑行程名称', editable: true, content: this.data.trip?.title || '', success: (result) => {
      if (!result.confirm || !result.content.trim()) return
      api.updateTrip(this.data.id, { title: result.content.trim() }).then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '保存失败', icon: 'none' }))
    } })
  },
  removeTrip() {
    wx.showModal({ title: '删除这段行程？', content: '删除后行程和计划内容将无法在小程序中恢复。', success: (result) => {
      if (!result.confirm) return
      api.deleteTrip(this.data.id).then(() => { wx.showToast({ title: '已删除', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500) }).catch((error) => wx.showToast({ title: error.errMsg || '删除失败', icon: 'none' }))
    } })
  },
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
  removeAssignment(event) {
    const day = this.data.days.find((item) => String(item.id) === String(event.currentTarget.dataset.dayId))
    const assignment = day?.assignments?.find((item) => String(item.id) === String(event.currentTarget.dataset.id))
    if (!day || !assignment) return
    wx.showModal({ title: '移除这个地点？', content: '只会从当天计划中移除，不会删除地点本身。', success: (result) => {
      if (!result.confirm) return
      api.deleteAssignment(this.data.id, day.id, assignment.id).then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '移除失败', icon: 'none' }))
    } })
  },
  openMap() { wx.navigateTo({ url: `../map/map?tripId=${this.data.id}&dayId=${this.data.selectedDayId}` }) },
  openTools(event) { wx.navigateTo({ url: `../tools/tools?tripId=${this.data.id}&tab=${event.currentTarget.dataset.tab || 'todo'}` }) },
  goCalendar() { wx.navigateTo({ url: '../calendar/calendar' }) },
  goHome() { wx.navigateBack({ delta: 1 }) },
})
