const api = require('../../utils/api')
Page({
  data: { collections: [], places: [], visiblePlaces: [], active: null, labels: [], labelFilter: [], loading: true, view: 'list', error: '', query: '', status: 'all', menuOpen: false, labelMenu: false, showAdd: false, addQuery: '', addResults: [], addLoading: false, markers: [], mapLatitude: 31.23, mapLongitude: 121.47 },
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
      const labels = Array.isArray(active.labels) ? active.labels : (Array.isArray(data.labels) ? data.labels : [])
      const rawPlaces = Array.isArray(data.places) ? data.places : (active.places || [])
      const labelNames = Object.fromEntries(labels.map((label) => [Number(label.id), label.name]))
      const places = rawPlaces.map((place) => ({ ...place, label_names: (place.label_ids || []).map((id) => labelNames[Number(id)]).filter(Boolean), category_name: place.category_name || (place.category && place.category.name) || '', category_color: (place.category && place.category.color) || '#6366f1' }))
      this.setData({ active, labels, labelFilter: [], places, visiblePlaces: places, menuOpen: false, labelMenu: false, view: 'list' })
      this.filterPlaces(this.data.query, this.data.status, [])
    }).catch((err) => this.setData({ error: err.errMsg || '清单加载失败' }))
  },
  toggleView() { this.setData({ view: this.data.view === 'list' ? 'map' : 'list' }) },
  toggleMenu() { this.setData({ menuOpen: !this.data.menuOpen }) },
  inputSearch(e) { const query = String(e.detail.value || '').trim().toLowerCase(); this.setData({ query }); this.filterPlaces(query, this.data.status) },
  setStatus(e) { const status = e.currentTarget.dataset.status; this.setData({ status, menuOpen: false }); this.filterPlaces(this.data.query, status, this.data.labelFilter) },
  toggleLabelMenu() { this.setData({ labelMenu: !this.data.labelMenu, menuOpen: false }) },
  filterByLabel(e) {
    const id = Number(e.currentTarget.dataset.id)
    const labelFilter = this.data.labelFilter.includes(id) ? this.data.labelFilter.filter((value) => value !== id) : this.data.labelFilter.concat(id)
    this.setData({ labelFilter })
    this.filterPlaces(this.data.query, this.data.status, labelFilter)
  },
  clearLabelFilter() { this.setData({ labelFilter: [] }); this.filterPlaces(this.data.query, this.data.status, []) },
  filterPlaces(query, status, labelFilter = this.data.labelFilter) {
    const visiblePlaces = this.data.places.filter((place) => {
      const text = `${place.name || ''} ${place.address || ''}`.toLowerCase()
      const placeLabels = Array.isArray(place.label_ids) ? place.label_ids.map(Number) : []
      return (!query || text.includes(query)) && (status === 'all' || place.status === status) && (!labelFilter.length || labelFilter.some((id) => placeLabels.includes(id)))
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
  createLabel() {
    if (!this.data.active) return
    wx.showModal({ title: '新建标签', editable: true, placeholderText: '例如：必去', success: (result) => {
      const name = String(result.content || '').trim()
      if (!result.confirm || !name) return
      api.createCollectionLabel({ collection_id: Number(this.data.active.id), name, color: '#6366f1' }).then(() => this.selectCollection({ currentTarget: { dataset: { id: this.data.active.id } } })).catch((err) => wx.showToast({ title: err.errMsg || '创建标签失败', icon: 'none' }))
    } })
  },
  deleteLabel(e) {
    const label = this.data.labels[e.currentTarget.dataset.index]
    if (!label) return
    wx.showModal({ title: `删除标签「${label.name}」？`, success: (result) => {
      if (!result.confirm) return
      api.deleteCollectionLabel(label.id).then(() => this.selectCollection({ currentTarget: { dataset: { id: this.data.active.id } } })).catch((err) => wx.showToast({ title: err.errMsg || '删除标签失败', icon: 'none' }))
    } })
  },
  managePlaceLabels(e) {
    const place = this.data.visiblePlaces[e.currentTarget.dataset.index]
    if (!place || !this.data.labels.length) return wx.showToast({ title: '请先创建标签', icon: 'none' })
    wx.showActionSheet({ itemList: this.data.labels.map((label) => `${(place.label_ids || []).includes(label.id) ? '取消' : '添加'} ${label.name}`), success: (result) => {
      const label = this.data.labels[result.tapIndex]
      const assigned = Array.isArray(place.label_ids) && place.label_ids.includes(label.id)
      const request = assigned ? api.unassignCollectionLabels([label.id], [place.id]) : api.assignCollectionLabels([label.id], [place.id])
      request.then(() => this.selectCollection({ currentTarget: { dataset: { id: this.data.active.id } } })).catch((err) => wx.showToast({ title: err.errMsg || '标签更新失败', icon: 'none' }))
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
  shareActiveCollection() {
    const active = this.data.active
    if (!active) return
    api.getCollectionAvailableUsers(active.id).then((data) => {
      const users = Array.isArray(data.users) ? data.users : []
      if (!users.length) return wx.showToast({ title: '暂无可邀请的用户', icon: 'none' })
      wx.showActionSheet({ itemList: users.slice(0, 6).map((user) => user.username || user.email || `用户 ${user.id}`), success: (result) => {
        const user = users[result.tapIndex]
        if (!user) return
        wx.showModal({ title: '邀请协作', content: '以只读成员身份加入这个清单？', success: (choice) => {
          if (!choice.confirm) return
          api.inviteCollectionUser(active.id, user.id).then(() => wx.showToast({ title: '邀请已发送', icon: 'success' })).catch((err) => wx.showToast({ title: err.errMsg || '邀请失败', icon: 'none' }))
        } })
      } })
    }).catch((err) => wx.showToast({ title: err.errMsg || '读取成员失败', icon: 'none' }))
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
  openPlace(e) {
    const place = this.data.visiblePlaces[e.currentTarget.dataset.index]
    if (!place) return
    const actions = ['查看详情', '编辑地点', '打开地图', '复制到行程', '管理标签']
    wx.showActionSheet({ itemList: actions, success: (result) => {
      if (result.tapIndex === 0) return wx.navigateTo({ url: `/pages/collection-detail/collection-detail?id=${this.data.active.id}&placeId=${place.id}` })
      if (result.tapIndex === 1) return this.editPlace(place)
      if (result.tapIndex === 2) return this.openMap(e)
      if (result.tapIndex === 3) return this.copyPlaceToTrip(place)
      if (result.tapIndex === 4) return this.managePlaceLabels(e)
    } })
  },
  editPlace(place) {
    const ask = (title, content, placeholderText) => new Promise((resolve) => wx.showModal({ title, editable: true, content: content || '', placeholderText, success: (result) => resolve(result.confirm ? String(result.content || '').trim() : null) }))
    ask('编辑地点名称', place.name, '地点名称').then((name) => {
      if (!name) return null
      return ask('编辑地点地址', place.address, '地址（可选）').then((address) => ({ name, address }))
    }).then((draft) => {
      if (!draft) return null
      return ask('编辑地点描述', place.description, '支持简单的旅行备注').then((description) => ({ ...draft, description }))
    }).then((draft) => {
      if (!draft) return null
      return ask('编辑联系电话', place.phone, '电话（可选）').then((phone) => ({ ...draft, phone }))
    }).then((draft) => {
      if (!draft) return null
      return ask('编辑网址', place.website, '网址（可选）').then((website) => api.updateCollectionPlace(place.id, { name: draft.name, address: draft.address || null, description: draft.description || null, phone: draft.phone || null, website: website || null }))
    }).then((result) => {
      if (!result) return
      wx.showToast({ title: '已保存', icon: 'success' })
      return this.selectCollection({ currentTarget: { dataset: { id: this.data.active.id } } })
    }).catch((err) => wx.showToast({ title: err.errMsg || '保存失败', icon: 'none' }))
  },
  copyPlaceToTrip(place) {
    api.listTrips().then((data) => {
      const trips = Array.isArray(data.trips) ? data.trips : (Array.isArray(data) ? data : [])
      if (!trips.length) return wx.showToast({ title: '暂无可用行程', icon: 'none' })
      wx.showActionSheet({ itemList: trips.slice(0, 6).map((trip) => trip.title || `行程 ${trip.id}`), success: (result) => {
        const trip = trips[result.tapIndex]
        if (!trip) return
        api.copyCollectionPlacesToTrip({ trip_id: Number(trip.id), place_ids: [Number(place.id)], force: false }).then((reply) => {
          const skipped = Array.isArray(reply.skipped) && reply.skipped.length
          if (skipped) {
            wx.showModal({ title: '地点已存在', content: '这个地点已经在行程中，是否仍然复制？', success: (choice) => {
              if (choice.confirm) api.copyCollectionPlacesToTrip({ trip_id: Number(trip.id), place_ids: [Number(place.id)], force: true }).then(() => wx.showToast({ title: '已复制', icon: 'success' }))
            } })
          } else wx.showToast({ title: '已复制到行程', icon: 'success' })
        }).catch((err) => wx.showToast({ title: err.errMsg || '复制失败', icon: 'none' }))
      } })
    }).catch((err) => wx.showToast({ title: err.errMsg || '读取行程失败', icon: 'none' }))
  },
  openMap(e) { const p = this.data.visiblePlaces[e?.currentTarget?.dataset?.index] || this.data.visiblePlaces[0]; wx.navigateTo({ url: p?.lat != null ? `/pages/map/map?lat=${p.lat}&lng=${p.lng}` : '/pages/map/map' }) },
  openCalendar() { wx.navigateTo({ url: '/pages/vacay/vacay' }) },
  openAtlas() { wx.navigateTo({ url: '/pages/atlas/atlas' }) },
  openHome() { wx.navigateBack({ delta: 1 }) },
  openMore() { wx.navigateTo({ url: '/pages/tools/tools' }) },
  noop() {},
})
