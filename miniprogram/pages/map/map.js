const api = require('../../utils/api')

Page({
  data: {
    query: '',
    loading: false,
    error: '',
    results: [],
    latitude: 39.9042,
    longitude: 116.4074,
    markers: [],
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
})
