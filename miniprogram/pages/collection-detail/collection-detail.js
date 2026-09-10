const { getCollection } = require('../../utils/api')
Page({
  data: { id: '', placeId: '', collection: null, places: [], place: null, loading: true, error: '' },
  onLoad(options) { this.setData({ id: options.id || '', placeId: options.placeId || '' }); this.load() },
  load() { getCollection(this.data.id).then((data) => { const collection = data.collection || data; const labels = data.labels || collection.labels || []; const labelNames = Object.fromEntries(labels.map((label) => [Number(label.id), label.name])); const rawPlaces = data.places || collection.places || []; const places = rawPlaces.map((item) => ({ ...item, label_names: (item.label_ids || []).map((id) => labelNames[Number(id)]).filter(Boolean) })); const place = places.find((item) => String(item.id) === String(this.data.placeId)) || places[0] || null; this.setData({ collection, places, place, loading: false }) }).catch((err) => this.setData({ loading: false, error: err.message || '收藏清单加载失败' })) },
  back() { wx.navigateBack({ delta: 1 }) },
  openMap(e) { const index = e?.currentTarget?.dataset?.index; const p = index === undefined ? this.data.place : this.data.places[index]; if (p?.lat != null) wx.navigateTo({ url: `/pages/map/map?lat=${p.lat}&lng=${p.lng}` }) },
})
