const { listCollections, getCollection } = require('../../utils/api')
Page({
  data: { collections: [], places: [], active: null, loading: true, view: 'list', error: '' },
  onShow() { this.load() },
  load() {
    this.setData({ loading: true, error: '' })
    listCollections().then((data) => {
      const collections = data.collections || data || []
      this.setData({ collections: Array.isArray(collections) ? collections : [], loading: false })
    }).catch((err) => this.setData({ loading: false, error: err.message || '收藏加载失败' }))
  },
  selectCollection(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/collection-detail/collection-detail?id=${id}` })
  },
  toggleView() { this.setData({ view: this.data.view === 'list' ? 'map' : 'list' }) },
  openMap() { wx.navigateTo({ url: '/pages/map/map' }) },
  openMore() { wx.navigateTo({ url: '/pages/tools/tools' }) },
})
