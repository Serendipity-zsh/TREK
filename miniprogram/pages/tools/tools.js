const api = require('../../utils/api')

Page({
  data: { tripId: '', tab: 'todo', overview: false, items: [], loading: false, error: '', total: 0, weather: null, weatherPlace: '', weatherTemperature: '' },
  onLoad(options) { const tripId = options.tripId || ''; this.setData({ tripId, tab: options.tab || 'todo', overview: !tripId }); if (tripId) this.load() },
  switchTab(event) { this.setData({ tab: event.currentTarget.dataset.tab }); this.load() },
  load() {
    this.setData({ loading: true, error: '' })
    if (this.data.tab === 'weather') {
      return api.listPlaces(this.data.tripId).then(({ places }) => {
        const place = places && places[0]
        if (!place || place.lat == null || place.lng == null) throw new Error('请先在行程中保存一个有坐标的地点')
        this.setData({ weatherPlace: place.name })
        return api.getWeather(place.lat, place.lng)
      }).then((weather) => {
        this.setData({ weather, weatherTemperature: weather.temp ?? '--' })
      }).catch((error) => this.setData({ error: error.errMsg || error.message || '天气加载失败' })).finally(() => this.setData({ loading: false }))
    }
    const request = this.data.tab === 'todo' ? api.listTodo(this.data.tripId) : this.data.tab === 'packing' ? api.listPacking(this.data.tripId) : this.data.tab === 'budget' ? api.listBudget(this.data.tripId) : api.listReservations(this.data.tripId)
    return request.then((data) => {
      const items = data.items || []
      const total = this.data.tab === 'budget' ? items.reduce((sum, item) => sum + Number(item.total_price || 0), 0) : 0
      this.setData({ items, total })
    }).catch((error) => this.setData({ error: error.errMsg || '加载失败' })).finally(() => this.setData({ loading: false }))
  },
  addItem() {
    if (this.data.tab === 'weather') return
    const labels = { todo: '待办事项', packing: '行李物品', budget: '费用名称', reservations: '预订' }
    wx.showModal({ title: `添加${labels[this.data.tab]}`, editable: true, placeholderText: '请输入名称', success: (result) => {
      if (!result.confirm || !result.content.trim()) return
      const name = result.content.trim()
      const request = this.data.tab === 'todo' ? api.createTodo(this.data.tripId, { name }) : this.data.tab === 'packing' ? api.createPacking(this.data.tripId, { name }) : this.data.tab === 'budget' ? api.createBudget(this.data.tripId, { name, total_price: 0 }) : api.createReservation(this.data.tripId, { title: name })
      request.then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '添加失败', icon: 'none' }))
    } })
  },
  toggle(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    if (!item) return
    const request = this.data.tab === 'todo' ? api.updateTodo(this.data.tripId, item.id, { checked: !item.checked }) : api.updatePacking(this.data.tripId, item.id, { checked: !item.checked })
    request.then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '更新失败', icon: 'none' }))
  },
  remove(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    if (!item) return
    wx.showModal({ title: '删除项目？', success: (result) => {
      if (!result.confirm) return
      const request = this.data.tab === 'todo' ? api.deleteTodo(this.data.tripId, item.id) : this.data.tab === 'packing' ? api.deletePacking(this.data.tripId, item.id) : api.deleteReservation(this.data.tripId, item.id)
      request.then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '删除失败', icon: 'none' }))
    } })
  },
  openSettings() { wx.navigateTo({ url: '../settings/settings' }) },
  openMap() { wx.navigateTo({ url: '../map/map' }) },
  openJourney() { wx.navigateTo({ url: '../journey/journey' }) },
  openCollections() { wx.navigateTo({ url: '../collections/collections' }) },
  goHome() { wx.navigateBack({ delta: 1 }) },
})
