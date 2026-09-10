const api = require('../../utils/api')
Page({
  data: { collections: [], places: [], visiblePlaces: [], active: null, loading: true, view: 'list', error: '', query: '', status: 'all', menuOpen: false, showAdd: false, addQuery: '', addResults: [], addLoading: false, markers: [], mapLatitude: 31.23, mapLongitude: 121.47 },
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
  editActiveCollection() {
    const active = this.data.active
    if (!active) return
    wx.showModal({ title: '编辑清单名称', editable: true, content: active.name || active.title || '', placeholderText: '清单名称', success: (result) => {
      const name = String(result.content || '').trim()
      if (!result.confirm || !name || name === active.name) return
      api.updateCollection(active.id, { name }).then(() => { this.load(); this.selectCollection({ currentTarget: { dataset: { id: active.id } } }) }).catch((err) => wx.showToast({ title: err.errMsg || '保存失败', icon: 'none' }))
    } })
  },
  deleteActiveCollection() {
    const active = this.data.active
    if (!active) return
    wx.showModal({ title: '删除这个清单？', content: '清单中的收藏地点也会被移除。', success: (result) => {
      if (!result.confirm) return
      api.deleteCollection(active.id).then(() => { this.setData({ active: null, places: [], visiblePlaces: [], markers: [] }); this.load() }).catch((err) => wx.showToast({ title: err.errMsg || '删除失败', icon: 'none' }))
    } })
  },
  setPlaceStatus(e) {
    const place = this.data.visiblePlaces[e.currentTarget.dataset.index]
    if (!place) return
    const next = place.status === 'visited' ? 'idea' : (place.status === 'want' ? 'visited' : 'want')
    api.setCollectionPlaceStatus(place.id, next).then(() => this.selectCollection({ currentTarget: { dataset: { id: this.data.active.id } } })).catch((err) => wx.showToast({ title: err.errMsg || '状态更新失败', icon: 'none' }))
  },
  openAddPlace() {
    if (!this.data.active) {
      wx.showToast({ title: '请先选择清单', icon: 'none' })
      return
    }
    this.setData({ showAdd: true, addQuery: '', addResults: [] })
  },
  closeAddPlace() { this.setData({ showAdd: false, addLoading: false, addResults: [] }) },
  inputAddQuery(e) { this.setData({ addQuery: String(e.detail.value || '') }) },
  searchAddPlace() {
    const query = this.data.addQuery.trim()
    if (!query) {
      wx.showToast({ title: '输入地点名称', icon: 'none' })
      return
    }
    this.setData({ addLoading: true })
    api.amapSearch(query).then((data) => {
      const results = Array.isArray(data.suggestions) ? data.suggestions : (Array.isArray(data.pois) ? data.pois : (Array.isArray(data.results) ? data.results : []))
      this.setData({ addResults: results.slice(0, 12), addLoading: false })
    }).catch((err) => this.setData({ addLoading: false, error: err.message || '地点搜索失败' }))
  },
  saveAddPlace(e) {
    const item = this.data.addResults[e.currentTarget.dataset.index]
    if (!item || !this.data.active) return
    const location = item.location || item.position || {}
    const lat = Number(item.lat ?? location.lat ?? item.latitude)
    const lng = Number(item.lng ?? location.lng ?? item.longitude)
    const payload = {
      collection_id: Number(this.data.active.id),
      name: item.name || item.title || item.address || '未命名地点',
      address: item.address || item.adname || item.district || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      website: item.website || null,
      phone: item.tel || item.phone || null,
      status: 'idea',
      force: false,
    }
    api.saveCollectionPlace(payload).then((result) => {
      if (result && result.duplicate && result.duplicateOf) {
        wx.showModal({ title: '地点已在清单中', content: '是否仍要再次添加？', success: (choice) => {
          if (!choice.confirm) return
          api.saveCollectionPlace({ ...payload, force: true }).then(() => this.finishAddPlace()).catch((err) => wx.showToast({ title: err.errMsg || '保存失败', icon: 'none' }))
        } })
        return
      }
      this.finishAddPlace()
    }).catch((err) => wx.showToast({ title: err.errMsg || '保存地点失败', icon: 'none' }))
  },
  finishAddPlace() {
    this.setData({ showAdd: false, addResults: [] })
    this.selectCollection({ currentTarget: { dataset: { id: this.data.active.id } } })
    wx.showToast({ title: '已加入清单', icon: 'success' })
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
  noop() {},
})
