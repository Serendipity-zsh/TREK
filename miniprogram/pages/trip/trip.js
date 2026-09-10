const api = require('../../utils/api')

Page({
  data: { id: '', trip: null, days: [], places: [], loading: true, error: '', selectedDayId: '', showPlacePicker: false, activeTab: 'plan', tabItems: [], tabLoading: false, tabTotal: 0, collabNotes: [], files: [], listKind: 'todo', listItems: [], listTotal: 0 },
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
    this.loadTab()
  },
  loadTab() {
    const tab = this.data.activeTab
    if (tab === 'plan' || tab === 'map') return Promise.resolve()
    if (tab === 'lists') return this.loadInlineList(this.data.listKind)
    if (tab === 'costs') return this.loadInlineList('budget')
    this.setData({ tabLoading: true })
    if (tab === 'collab') return api.listCollabNotes(this.data.id).then((result) => this.setData({ collabNotes: result.notes || [] })).catch((error) => this.setData({ error: error.errMsg || '协作记录加载失败' })).finally(() => this.setData({ tabLoading: false }))
    if (tab === 'files') return api.listTripFiles(this.data.id).then((result) => this.setData({ files: result.files || [] })).catch((error) => this.setData({ error: error.errMsg || '文件列表加载失败' })).finally(() => this.setData({ tabLoading: false }))
    return api.listReservations(this.data.id).then((result) => {
      const items = Array.isArray(result.items) ? result.items : []
      this.setData({ tabItems: items, tabTotal: items.length })
    }).catch((error) => this.setData({ error: error.errMsg || '行程数据加载失败' })).finally(() => this.setData({ tabLoading: false }))
  },
  loadInlineList(kind) {
    const request = kind === 'todo' ? api.listTodo(this.data.id) : kind === 'packing' ? api.listPacking(this.data.id) : api.listBudget(this.data.id)
    this.setData({ tabLoading: true, listKind: kind })
    return request.then((result) => {
      const listItems = result.items || []
      const listTotal = listItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0)
      this.setData({ listItems, listTotal })
    }).catch((error) => this.setData({ error: error.errMsg || '列表加载失败' })).finally(() => this.setData({ tabLoading: false }))
  },
  switchListKind(event) { this.loadInlineList(event.currentTarget.dataset.kind) },
  addInlineItem() {
    const kind = this.data.activeTab === 'costs' ? 'budget' : this.data.listKind
    const labels = { todo: '待办事项', packing: '行李物品', budget: '费用名称' }
    wx.showModal({ title: `添加${labels[kind]}`, editable: true, placeholderText: '请输入名称', success: (result) => {
      if (!result.confirm || !result.content.trim()) return
      const name = result.content.trim()
      const request = kind === 'todo' ? api.createTodo(this.data.id, { name }) : kind === 'packing' ? api.createPacking(this.data.id, { name }) : api.createBudget(this.data.id, { name, total_price: 0 })
      request.then(() => this.loadInlineList(kind)).catch((error) => wx.showToast({ title: error.errMsg || '添加失败', icon: 'none' }))
    } })
  },
  toggleInlineItem(event) {
    const item = this.data.listItems[event.currentTarget.dataset.index]
    if (!item || this.data.activeTab !== 'lists') return
    const request = this.data.listKind === 'todo' ? api.updateTodo(this.data.id, item.id, { checked: !item.checked }) : api.updatePacking(this.data.id, item.id, { checked: !item.checked })
    request.then(() => this.loadInlineList(this.data.listKind)).catch((error) => wx.showToast({ title: error.errMsg || '更新失败', icon: 'none' }))
  },
  removeInlineItem(event) {
    const item = this.data.listItems[event.currentTarget.dataset.index]
    if (!item) return
    const request = this.data.activeTab === 'costs' ? null : this.data.listKind === 'todo' ? api.deleteTodo(this.data.id, item.id) : api.deletePacking(this.data.id, item.id)
    if (!request) return wx.showToast({ title: '费用删除请从费用工具操作', icon: 'none' })
    wx.showModal({ title: '删除项目？', success: (result) => { if (result.confirm) request.then(() => this.loadInlineList(this.data.listKind)).catch((error) => wx.showToast({ title: error.errMsg || '删除失败', icon: 'none' })) } })
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
  toggleFileStar(event) {
    const file = this.data.files[event.currentTarget.dataset.index]
    if (!file) return
    api.toggleTripFileStar(this.data.id, file.id).then(() => this.loadTab()).catch((error) => wx.showToast({ title: error.errMsg || '更新文件失败', icon: 'none' }))
  },
  removeFile(event) {
    const file = this.data.files[event.currentTarget.dataset.index]
    if (!file) return
    wx.showModal({ title: '移除这个文件？', content: '文件会进入回收站，可在网页端恢复。', success: (result) => {
      if (!result.confirm) return
      api.deleteTripFile(this.data.id, file.id).then(() => this.loadTab()).catch((error) => wx.showToast({ title: error.errMsg || '移除文件失败', icon: 'none' }))
    } })
  },
  openMap() { wx.navigateTo({ url: `../map/map?tripId=${this.data.id}&dayId=${this.data.selectedDayId}` }) },
  openTools(event) { wx.navigateTo({ url: `../tools/tools?tripId=${this.data.id}&tab=${event.currentTarget.dataset.tab || 'todo'}` }) },
  goCalendar() { wx.navigateTo({ url: '../calendar/calendar' }) },
  goHome() { wx.navigateBack({ delta: 1 }) },
})
