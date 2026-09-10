const api = require('../../utils/api')
Page({
  data: { collections: [], places: [], visiblePlaces: [], active: null, loading: true, view: 'list', error: '', query: '', status: 'all', menuOpen: false, markers: [], mapLatitude: 31.23, mapLongitude: 121.47 },
  onShow() { this.load() },
  load() {
    this.setData({ loading: true, error: '' })
    api.listCollections().then((data) => {
      const collections = data.collections || data || []
      this.setData({ collections: Array.isArray(collections) ? collections : [], loading: false })
    }).catch((err) => this.setData({ loading: false, error: err.message || '收藏加载失败' }))
  },
  selectCollection(e) {
    const id = e.currentTarget.dataset.id
    api.getCollection(id).then((data) => {
      const active = data.collection || data
      const places = Array.isArray(data.places) ? data.places : (active.places || [])
      this.setData({ active, places, visiblePlaces: places, menuOpen: false, view: 'list' })
      this.updateMarkers(places)
    }).catch((err) => this.setData({ error: err.errMsg || '清单加载失败' }))
  },
  toggleView() { this.setData({ view: this.data.view === 'list' ? 'map' : 'list' }) },
  toggleMenu() { this.setData({ menuOpen: !this.data.menuOpen }) },
  inputSearch(e) { const query = String(e.detail.value || '').trim().toLowerCase(); this.setData({ query }); this.filterPlaces(query, this.data.status) },
  setStatus(e) { const status = e.currentTarget.dataset.status; this.setData({ status, menuOpen: false }); this.filterPlaces(this.data.query, status) },
  filterPlaces(query, status) {
    const visiblePlaces = this.data.places.filter((place) => {
      const text = `${place.name || ''} ${place.address || ''}`.toLowerCase()
      return (!query || text.includes(query)) && (status === 'all' || place.status === status)
    })
    this.setData({ visiblePlaces })
    this.updateMarkers(visiblePlaces)
  },
  updateMarkers(places) {
    const markers = places.filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))).map((place, index) => ({ id: Number(place.id || index), latitude: Number(place.lat), longitude: Number(place.lng), width: 30, height: 30, callout: { content: place.name || '地点', display: 'ALWAYS', padding: 6, borderRadius: 8 } }))
    const first = places.find((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng)))
    this.setData({ markers, mapLatitude: first ? Number(first.lat) : 31.23, mapLongitude: first ? Number(first.lng) : 121.47 })
  },
  createList() {
    wx.showModal({ title: '新建收藏清单', editable: true, placeholderText: '例如：东京咖啡店', success: (result) => {
      if (!result.confirm || !result.content.trim()) return
      api.createCollection({ name: result.content.trim() }).then(() => this.load()).catch((err) => wx.showToast({ title: err.errMsg || '创建失败', icon: 'none' }))
    } })
  },
  removePlace(e) {
    const place = this.data.visiblePlaces[e.currentTarget.dataset.index]
    if (!place) return
    wx.showModal({ title: '移除这个地点？', success: (result) => {
      if (!result.confirm) return
      api.deleteCollectionPlace(place.id).then(() => this.selectCollection({ currentTarget: { dataset: { id: this.data.active.id } } })).catch((err) => wx.showToast({ title: err.errMsg || '移除失败', icon: 'none' }))
    } })
  },
  openMap(e) { const p = this.data.visiblePlaces[e?.currentTarget?.dataset?.index] || this.data.visiblePlaces[0]; wx.navigateTo({ url: p?.lat != null ? `/pages/map/map?lat=${p.lat}&lng=${p.lng}` : '/pages/map/map' }) },
  openCalendar() { wx.navigateTo({ url: '/pages/vacay/vacay' }) },
  openAtlas() { wx.navigateTo({ url: '/pages/atlas/atlas' }) },
  openHome() { wx.navigateBack({ delta: 1 }) },
  openMore() { wx.navigateTo({ url: '/pages/tools/tools' }) },
})
