const api = require('../../utils/api')

Page({
  data: { id: '', trip: null, days: [], places: [], loading: true, error: '', selectedDayId: '', showPlacePicker: false, activeTab: 'plan', tabItems: [], tabLoading: false, tabTotal: 0, collabTab: 'notes', collabNotes: [], collabMessages: [], collabPolls: [], chatInput: '', files: [], uploadingFile: false, listKind: 'todo', listItems: [], listTotal: 0 },
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
    if (tab === 'collab') return this.loadCollab().finally(() => this.setData({ tabLoading: false }))
    if (tab === 'files') return api.listTripFiles(this.data.id).then((result) => this.setData({ files: result.files || [] })).catch((error) => this.setData({ error: error.errMsg || '文件列表加载失败' })).finally(() => this.setData({ tabLoading: false }))
    return api.listReservations(this.data.id).then((result) => {
      const reservations = Array.isArray(result.reservations) ? result.reservations : (Array.isArray(result.items) ? result.items : [])
      const transportTypes = ['flight', 'train', 'bus', 'car', 'taxi', 'bicycle', 'ferry', 'transport', 'transport_other']
      const items = tab === 'transports'
        ? reservations.filter((item) => transportTypes.includes(String(item.type || '').toLowerCase()))
        : reservations.filter((item) => !transportTypes.includes(String(item.type || '').toLowerCase()))
      this.setData({ tabItems: items, tabTotal: items.length })
    }).catch((error) => this.setData({ error: error.errMsg || '行程数据加载失败' })).finally(() => this.setData({ tabLoading: false }))
  },
  switchCollab(event) {
    const collabTab = event.currentTarget.dataset.tab
    if (!collabTab || collabTab === this.data.collabTab) return
    this.setData({ collabTab, tabLoading: true })
    this.loadCollab().finally(() => this.setData({ tabLoading: false }))
  },
  loadCollab() {
    const requests = {
      notes: () => api.listCollabNotes(this.data.id).then((result) => this.setData({ collabNotes: result.notes || [] })),
      chat: () => api.listCollabMessages(this.data.id).then((result) => this.setData({ collabMessages: (result.messages || []).map((message) => ({ ...message, avatarText: String(message.username || 'T').slice(0, 1).toUpperCase() })) })),
      polls: () => api.listCollabPolls(this.data.id).then((result) => this.setData({ collabPolls: result.polls || [] })),
    }
    return (requests[this.data.collabTab] || requests.notes)().catch((error) => this.setData({ error: error.errMsg || '协作记录加载失败' }))
  },
  inputChat(event) { this.setData({ chatInput: event.detail.value || '' }) },
  sendChat() {
    const text = String(this.data.chatInput || '').trim()
    if (!text) return
    api.createCollabMessage(this.data.id, { text }).then(() => { this.setData({ chatInput: '' }); return this.loadCollab() }).catch((error) => wx.showToast({ title: error.errMsg || '发送失败', icon: 'none' }))
  },
  removeChatMessage(event) {
    const message = this.data.collabMessages[event.currentTarget.dataset.index]
    if (!message) return
    wx.showModal({ title: '删除这条消息？', success: (result) => { if (result.confirm) api.deleteCollabMessage(this.data.id, message.id).then(() => this.loadCollab()).catch((error) => wx.showToast({ title: error.errMsg || '删除失败', icon: 'none' })) } })
  },
  createPoll() {
    Promise.all([
      this.askReservationField('投票问题', '', '例如：下一站去哪里？'),
      this.askReservationField('选项（用逗号分隔）', '', '例如：京都，大阪，奈良'),
    ]).then(([question, rawOptions]) => {
      const options = String(rawOptions || '').split(/[，,]/).map((item) => item.trim()).filter(Boolean).slice(0, 8)
      if (!question || options.length < 2) return wx.showToast({ title: '至少填写问题和两个选项', icon: 'none' })
      return api.createCollabPoll(this.data.id, { question, options, multiple: false }).then(() => { wx.showToast({ title: '投票已创建', icon: 'success' }); return this.loadCollab() })
    }).catch((error) => wx.showToast({ title: error.errMsg || '创建投票失败', icon: 'none' }))
  },
  votePoll(event) {
    const poll = this.data.collabPolls[event.currentTarget.dataset.pollIndex]
    const optionIndex = Number(event.currentTarget.dataset.optionIndex)
    if (!poll || poll.is_closed) return
    api.voteCollabPoll(this.data.id, poll.id, optionIndex).then(() => this.loadCollab()).catch((error) => wx.showToast({ title: error.errMsg || '投票失败', icon: 'none' }))
  },
  closePoll(event) {
    const poll = this.data.collabPolls[event.currentTarget.dataset.index]
    if (!poll) return
    api.closeCollabPoll(this.data.id, poll.id).then(() => this.loadCollab()).catch((error) => wx.showToast({ title: error.errMsg || '关闭失败', icon: 'none' }))
  },
  deletePoll(event) {
    const poll = this.data.collabPolls[event.currentTarget.dataset.index]
    if (!poll) return
    wx.showModal({ title: '删除这个投票？', success: (result) => { if (result.confirm) api.deleteCollabPoll(this.data.id, poll.id).then(() => this.loadCollab()).catch((error) => wx.showToast({ title: error.errMsg || '删除失败', icon: 'none' })) } })
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
      if (kind !== 'budget') {
        const request = kind === 'todo' ? api.createTodo(this.data.id, { name }) : api.createPacking(this.data.id, { name })
        return request.then(() => this.loadInlineList(kind)).catch((error) => wx.showToast({ title: error.errMsg || '添加失败', icon: 'none' }))
      }
      this.askReservationField('金额', '0', '例如：128.50').then((amount) => {
        const total_price = Number(String(amount || '0').replace(',', '.'))
        if (!Number.isFinite(total_price) || total_price < 0) return wx.showToast({ title: '请输入有效金额', icon: 'none' })
        return api.createBudget(this.data.id, { name, total_price, category: 'other' }).then(() => this.loadInlineList(kind))
      }).catch((error) => wx.showToast({ title: error.errMsg || '添加失败', icon: 'none' }))
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
    const request = this.data.activeTab === 'costs' ? api.deleteBudget(this.data.id, item.id) : this.data.listKind === 'todo' ? api.deleteTodo(this.data.id, item.id) : api.deletePacking(this.data.id, item.id)
    wx.showModal({ title: '删除项目？', success: (result) => { if (result.confirm) request.then(() => this.loadInlineList(this.data.listKind)).catch((error) => wx.showToast({ title: error.errMsg || '删除失败', icon: 'none' })) } })
  },
  editBudgetItem(event) {
    if (this.data.activeTab !== 'costs') return
    const item = this.data.listItems[event.currentTarget.dataset.index]
    if (!item) return
    Promise.all([
      this.askReservationField('费用名称', item.name || item.title || '', '例如：京都酒店'),
      this.askReservationField('金额', String(item.total_price || 0), '例如：128.50'),
    ]).then(([name, amount]) => {
      const total_price = Number(String(amount || '0').replace(',', '.'))
      if (!name || !Number.isFinite(total_price) || total_price < 0) return wx.showToast({ title: '请输入有效名称和金额', icon: 'none' })
      return api.updateBudget(this.data.id, item.id, { name, total_price }).then(() => this.loadInlineList('budget'))
    }).catch((error) => wx.showToast({ title: error.errMsg || '保存失败', icon: 'none' }))
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
  openDayActions(event) {
    const day = this.data.days.find((item) => String(item.id) === String(event.currentTarget.dataset.id))
    if (!day) return
    wx.showActionSheet({ itemList: ['编辑当天标题和备注', '删除这一天'], success: (result) => {
      if (result.tapIndex === 1) return this.removeDay({ currentTarget: { dataset: { id: day.id } } })
      Promise.all([
        this.askReservationField('当天标题', day.title || '', '例如：抵达京都'),
        this.askReservationField('当天备注', day.notes || '', '记录当天的提醒或路线'),
      ]).then(([title, notes]) => api.updateDay(this.data.id, day.id, { title: title || null, notes: notes || '' }))
        .then(() => { wx.showToast({ title: '已保存', icon: 'success' }); return this.load() })
        .catch((error) => wx.showToast({ title: error.errMsg || '保存失败', icon: 'none' }))
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
  openAssignmentMenu(event) {
    const dayId = event.currentTarget.dataset.dayId
    const placeId = event.currentTarget.dataset.placeId
    const place = this.data.places.find((item) => String(item.id) === String(placeId))
    const day = this.data.days.find((item) => String(item.id) === String(dayId))
    const assignment = day?.assignments?.find((item) => String(item.place_id || item.placeId) === String(placeId))
    if (!place || !assignment) return
    wx.showActionSheet({ itemList: ['编辑地点', '打开地图', '从当天移除'], success: (result) => {
      if (result.tapIndex === 0) return this.editPlace(place)
      if (result.tapIndex === 1) return wx.navigateTo({ url: `/pages/map/map?lat=${place.lat}&lng=${place.lng}` })
      this.removeAssignment({ currentTarget: { dataset: { dayId, id: assignment.id } } })
    } })
  },
  editPlace(place) {
    Promise.all([
      this.askReservationField('地点名称', place.name || '', '例如：清水寺'),
      this.askReservationField('地址（可选）', place.address || '', '例如：京都市东山区'),
    ]).then(([name, address]) => {
      if (!name) return
      return api.updatePlace(this.data.id, place.id, { name, address: address || null }).then(() => { wx.showToast({ title: '地点已更新', icon: 'success' }); return this.load() })
    }).catch((error) => wx.showToast({ title: error.errMsg || '地点更新失败', icon: 'none' }))
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
  uploadFile() {
    if (this.data.uploadingFile) return
    wx.chooseMessageFile({ count: 1, type: 'all', success: async (result) => {
      const file = result.tempFiles && result.tempFiles[0]
      if (!file || Number(file.size || 0) > 10 * 1024 * 1024) return wx.showToast({ title: '小程序端附件不能超过 10MB', icon: 'none' })
      this.setData({ uploadingFile: true })
      try {
        const fs = wx.getFileSystemManager()
        const chunkSize = 48 * 1024
        const totalParts = Math.max(1, Math.ceil(Number(file.size || 0) / chunkSize))
        const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
        const readChunk = (position, length) => new Promise((resolve, reject) => fs.readFile({ filePath: file.path, position, length, encoding: 'base64', success: (res) => resolve(res.data), fail: reject }))
        const ext = String(file.name || file.path || '').split('.').pop().toLowerCase()
        const mimeMap = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv', txt: 'text/plain', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }
        for (let partIndex = 0; partIndex < totalParts; partIndex += 1) {
          const position = partIndex * chunkSize
          const data = await readChunk(position, Math.min(chunkSize, Number(file.size || 0) - position))
          await api.uploadTripFileChunk(this.data.id, { upload_id: uploadId, part_index: partIndex, total_parts: totalParts, filename: file.name || `attachment.${ext || 'bin'}`, mime_type: mimeMap[ext] || file.type || 'application/octet-stream', data })
        }
        wx.showToast({ title: '文件已上传', icon: 'success' })
        this.loadTab()
      } catch (error) { wx.showToast({ title: error.errMsg || error.message || '上传失败', icon: 'none' }) }
      finally { this.setData({ uploadingFile: false }) }
    } })
  },
  removeReservation(event) {
    const item = this.data.tabItems[event.currentTarget.dataset.index]
    if (!item) return
    wx.showModal({ title: '删除这条记录？', content: '删除后不会影响行程中的地点。', success: (result) => {
      if (!result.confirm) return
      api.deleteReservation(this.data.id, item.id).then(() => this.loadTab()).catch((error) => wx.showToast({ title: error.errMsg || '删除失败', icon: 'none' }))
    } })
  },
  addReservation() {
    const isTransport = this.data.activeTab === 'transports'
    this.openReservationEditor(null, isTransport)
  },
  editReservation(event) {
    const item = this.data.tabItems[event.currentTarget.dataset.index]
    if (item) this.openReservationEditor(item, this.data.activeTab === 'transports')
  },
  openReservationEditor(item, isTransport) {
    const transportTypes = ['flight', 'train', 'bus', 'car', 'taxi', 'ferry']
    const bookingTypes = ['hotel', 'restaurant', 'event', 'tour', 'activity', 'parking', 'other']
    const types = isTransport ? transportTypes : bookingTypes
    const labels = { flight: '航班', train: '火车', bus: '巴士', car: '自驾', taxi: '出租车', ferry: '轮渡', hotel: '酒店', restaurant: '餐厅', event: '活动', tour: '旅行团', activity: '体验', parking: '停车', other: '其他' }
    const currentType = types.includes(String(item?.type || '').toLowerCase()) ? String(item.type).toLowerCase() : types[0]
    wx.showActionSheet({ itemList: types.map((type) => labels[type]), success: (choice) => {
      const type = types[choice.tapIndex]
      this.askReservationField('名称', item?.title || '', isTransport ? '例如：东京到京都 新干线' : '例如：京都酒店').then((title) => {
        if (!title) return null
        return this.askReservationField('日期（可选）', item?.start_date || item?.date || '', '例如：2026-10-01').then((date) => ({ title, date, type }))
      }).then((draft) => {
        if (!draft) return null
        return this.askReservationField('地点（可选）', item?.location || '', '例如：京都站').then((location) => ({ ...draft, location }))
      }).then((draft) => {
        if (!draft) return
        const payload = { title: draft.title, type: draft.type, start_date: draft.date || null, location: draft.location || null }
        const request = item ? api.updateReservation(this.data.id, item.id, payload) : api.createReservation(this.data.id, payload)
        request.then(() => { wx.showToast({ title: item ? '已更新' : '已添加', icon: 'success' }); return this.loadTab() }).catch((error) => wx.showToast({ title: error.errMsg || '保存失败', icon: 'none' }))
      }).catch((error) => wx.showToast({ title: error.errMsg || '编辑失败', icon: 'none' }))
    } })
  },
  askReservationField(title, content, placeholderText) {
    return new Promise((resolve) => wx.showModal({ title, editable: true, content, placeholderText, success: (result) => resolve(result.confirm ? String(result.content || '').trim() : '') }))
  },
  openCreateMenu() {
    wx.showActionSheet({ itemList: ['添加地点', '添加一天', '添加交通', '添加预订', '打开旅行工具'], success: (result) => {
      if (result.tapIndex === 0) return this.setData({ showPlacePicker: true })
      if (result.tapIndex === 1) return this.addDay()
      if (result.tapIndex === 2) { this.setData({ activeTab: 'transports' }); return this.openReservationEditor(null, true) }
      if (result.tapIndex === 3) { this.setData({ activeTab: 'bookings' }); return this.openReservationEditor(null, false) }
      wx.navigateTo({ url: `../tools/tools?tripId=${this.data.id}&tab=todo` })
    } })
  },
  openMap() { wx.navigateTo({ url: `../map/map?tripId=${this.data.id}&dayId=${this.data.selectedDayId}` }) },
  openTools(event) { wx.navigateTo({ url: `../tools/tools?tripId=${this.data.id}&tab=${event.currentTarget.dataset.tab || 'todo'}` }) },
  goCalendar() { wx.navigateTo({ url: '../calendar/calendar' }) },
  goHome() { wx.navigateBack({ delta: 1 }) },
})
