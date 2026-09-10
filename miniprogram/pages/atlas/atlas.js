const { getAtlasStats, getAtlasBucketList, createAtlasBucketItem, deleteAtlasBucketItem, amapSearch } = require('../../utils/api')
Page({
  data: { stats: {}, bucket: [], query: '', searchOpen: false, bucketOpen: false, loading: true, error: '', latitude: 25, longitude: 10, scale: 3, markers: [] },
  onLoad() { this.load() },
  load() { Promise.all([getAtlasStats(), getAtlasBucketList()]).then(([stats, bucket]) => { const items = bucket.items || bucket || []; this.setData({ stats: stats.stats || stats || {}, bucket: items, markers: items.filter(i => i.lat != null && i.lng != null).map((i, n) => ({ id: n, latitude: i.lat, longitude: i.lng, title: i.name })) , loading: false }) }).catch((err) => this.setData({ loading: false, error: err.message || 'Atlas 数据加载失败' })) },
  toggleSearch() { this.setData({ searchOpen: !this.data.searchOpen }) },
  input(e) { this.setData({ query: e.detail.value }) },
  search() { const q = (this.data.query || '').trim(); if (!q) return; this.setData({ loading: true }); amapSearch(q).then((data) => { const item = (data.suggestions || [])[0]; if (item?.location) this.setData({ latitude: item.location.lat, longitude: item.location.lng, scale: 6 }); }).catch(() => wx.showToast({ title: '搜索失败', icon: 'none' })).finally(() => this.setData({ loading: false })) },
  openBucket() { this.setData({ bucketOpen: true }) },
  closeBucket() { this.setData({ bucketOpen: false }) },
  createBucket() {
    wx.showModal({ title: '加入愿望单', editable: true, placeholderText: '例如：京都清水寺', success: (result) => {
      if (!result.confirm || !result.content.trim()) return
      createAtlasBucketItem({ name: result.content.trim(), lat: this.data.latitude, lng: this.data.longitude }).then(() => { wx.showToast({ title: '已加入', icon: 'success' }); this.load() }).catch((err) => wx.showToast({ title: err.errMsg || '加入失败', icon: 'none' }))
    } })
  },
  removeBucket(e) {
    const item = this.data.bucket[e.currentTarget.dataset.index]
    if (!item) return
    wx.showModal({ title: '移除愿望？', success: (result) => { if (!result.confirm) return; deleteAtlasBucketItem(item.id).then(() => this.load()).catch((err) => wx.showToast({ title: err.errMsg || '移除失败', icon: 'none' })) } })
  },
  openCalendar() { wx.navigateTo({ url: '../vacay/vacay' }) },
  openCollections() { wx.navigateTo({ url: '../collections/collections' }) },
  openTools() { wx.navigateTo({ url: '../tools/tools' }) },
  goHome() { wx.navigateBack({ delta: 1 }) },
  noop() {},
})
