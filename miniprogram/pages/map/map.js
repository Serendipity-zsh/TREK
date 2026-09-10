const api = require('../../utils/api')

Page({
  data: {
    tripId: '',
    dayId: '',
    query: '',
    loading: false,
    error: '',
    results: [],
    latitude: 39.9042,
    longitude: 116.4074,
    markers: [],
    polyline: [],
    routeSummary: '',
  },

  onLoad(options) {
    this.setData({ tripId: options.tripId || '', dayId: options.dayId || '' })
  },
  goHome() { wx.navigateBack({ delta: 1 }) },
  openCalendar() { wx.navigateTo({ url: '../calendar/calendar' }) },
  openTools() { wx.navigateTo({ url: '../tools/tools' }) },
  openCollections() { wx.navigateTo({ url: '../collections/collections' }) },
  openJourney() { wx.navigateTo({ url: '../journey/journey' }) },

  onQueryInput(event) {
    this.setData({ query: event.detail.value, error: '' })
  },

  search() {
    const query = this.data.query.trim()
    if (!query || this.data.loading) return
    this.setData({ loading: true, error: '' })
    api.amapSearch(query)
      .then((data) => {
        const results = data.suggestions || []
        const first = results[0]?.location
        this.setData({
          results,
          ...(first ? { latitude: first.lat, longitude: first.lng } : {}),
          markers: results.slice(0, 20).map((item, index) => ({
            id: index,
            latitude: item.location.lat,
            longitude: item.location.lng,
            title: item.name,
            callout: { content: item.name, display: 'BYCLICK' },
          })),
        })
      })
      .catch((error) => {
        console.error('AMap search failed', error)
        this.setData({ error: error.errMsg || '地点搜索失败，请检查高德 Key 和云托管日志' })
      })
      .finally(() => this.setData({ loading: false }))
  },

  chooseResult(event) {
    const item = this.data.results[event.currentTarget.dataset.index]
    if (!item) return
    this.setData({
      latitude: item.location.lat,
      longitude: item.location.lng,
      markers: [{
        id: 0,
        latitude: item.location.lat,
        longitude: item.location.lng,
        title: item.name,
        callout: { content: item.name, display: 'ALWAYS' },
      }],
    })
  },

  planRoute() {
    if (this.data.results.length < 2 || this.data.loading) {
      wx.showToast({ title: '至少搜索到两个地点', icon: 'none' })
      return
    }
    const first = this.data.results[0].location
    const last = this.data.results[this.data.results.length - 1].location
    this.setData({ loading: true, error: '' })
    api.amapRoute(first, last, 'driving').then((data) => {
      this.setData({ polyline: [{ points: data.polyline || [], color: '#1aad70', width: 6, dottedLine: false }], routeSummary: `驾车约 ${(data.distance / 1000).toFixed(1)} 公里 · ${(data.duration / 60).toFixed(0)} 分钟` })
    }).catch((error) => this.setData({ error: error.errMsg || '路线规划失败' })).finally(() => this.setData({ loading: false }))
  },

  saveResult(event) {
    const item = this.data.results[event.currentTarget.dataset.index]
    if (!item || !this.data.tripId) {
      wx.showToast({ title: '请从行程详情进入地图后保存', icon: 'none' })
      return
    }
    api.createPlace(this.data.tripId, { name: item.name, address: item.address || '', lat: item.location.lat, lng: item.location.lng })
      .then(({ place }) => this.data.dayId ? api.createAssignment(this.data.tripId, this.data.dayId, { place_id: place.id }) : null)
      .then(() => wx.showToast({ title: this.data.dayId ? '已加入当天计划' : '已保存到行程', icon: 'success' }))
      .catch((error) => wx.showToast({ title: error.errMsg || '保存地点失败', icon: 'none' }))
  },
})
