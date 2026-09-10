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
  },

  onLoad(options) {
    this.setData({ tripId: options.tripId || '', dayId: options.dayId || '' })
  },

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

  saveResult(event) {
    const item = this.data.results[event.currentTarget.dataset.index]
    if (!item || !this.data.tripId) {
      wx.showToast({ title: '请从行程详情进入地图后保存', icon: 'none' })
      return
    }
    api.createPlace(this.data.tripId, { name: item.name, address: item.address || '', lat: item.location.lat, lng: item.location.lng, category: item.type || 'poi' })
      .then(() => wx.showToast({ title: '已保存到行程', icon: 'success' }))
      .catch((error) => wx.showToast({ title: error.errMsg || '保存地点失败', icon: 'none' }))
  },
})
