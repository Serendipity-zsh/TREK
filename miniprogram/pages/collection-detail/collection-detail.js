const { getCollection } = require('../../utils/api')
Page({
  data: { id: '', collection: null, places: [], loading: true, error: '' },
  onLoad(options) { this.setData({ id: options.id || '' }); this.load() },
  load() { getCollection(this.data.id).then((data) => { const collection = data.collection || data; this.setData({ collection, places: data.places || collection.places || [], loading: false }) }).catch((err) => this.setData({ loading: false, error: err.message || '收藏清单加载失败' })) },
  back() { wx.navigateBack({ delta: 1 }) },
  openMap(e) { const p = this.data.places[e.currentTarget.dataset.index]; if (p?.lat != null) wx.navigateTo({ url: `/pages/map/map?lat=${p.lat}&lng=${p.lng}` }) },
})
