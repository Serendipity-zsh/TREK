const { getAtlasStats, getAtlasRegions, getAtlasRegionGeo, getAtlasLocate, getAtlasCountry, markAtlasCountry, unmarkAtlasCountry, getAtlasBucketList, createAtlasBucketItem, deleteAtlasBucketItem, amapSearch } = require('../../utils/api')

const STATUS_COLORS = {
  visited: { fillColor: '#7568d966', strokeColor: '#5c50c9', strokeWidth: 2 },
  planned: { fillColor: '#42bca866', strokeColor: '#239c86', strokeWidth: 2 },
  idea: { fillColor: '#a7adb766', strokeColor: '#858b95', strokeWidth: 1 },
}

function trimRing(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return []
  const step = Math.max(1, Math.ceil(ring.length / 180))
  return ring.filter((_, index) => index % step === 0 || index === ring.length - 1)
    .map(([longitude, latitude]) => ({ latitude, longitude }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
}

function toPolygons(geo, regions, showPlanned = true) {
  const statusByRegion = {}
  Object.keys(regions || {}).forEach((country) => (regions[country] || []).forEach((region) => { statusByRegion[region.code] = region.status || 'visited' }))
  const polygons = []
  ;(geo?.features || []).forEach((feature) => {
    const geometry = feature?.geometry
    const code = feature?.properties?.ISO_3166_2 || feature?.properties?.iso_3166_2 || feature?.properties?.code || feature?.properties?.region_code
    const status = statusByRegion[code] || 'visited'
    if (!showPlanned && status === 'planned') return
    const colors = STATUS_COLORS[status] || STATUS_COLORS.visited
    const groups = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : []
    groups.forEach((polygon) => {
      const points = trimRing(polygon?.[0])
      if (points.length >= 3) polygons.push({ points, ...colors })
    })
  })
  return polygons
}
Page({
  data: { stats: {}, regions: {}, regionGeo: null, polygons: [], bucket: [], query: '', searchOpen: false, searchResults: [], bucketOpen: false, countrySheet: false, countryCode: '', countryDetail: null, showPlanned: true, loading: true, error: '', latitude: 25, longitude: 10, scale: 3, markers: [], selectedPlace: null },
  onLoad() { this.load() },
  load() {
    Promise.all([getAtlasStats(), getAtlasRegions(), getAtlasBucketList()]).then(async ([stats, regions, bucket]) => {
      const regionMap = regions.regions || {}
      const countries = Object.keys(regionMap)
      const geo = countries.length ? await getAtlasRegionGeo(countries) : { features: [] }
      const items = bucket.items || bucket || []
      this.setData({ stats: stats.stats || stats || {}, regions: regionMap, regionGeo: geo, polygons: toPolygons(geo, regionMap, this.data.showPlanned), bucket: items, markers: items.filter(i => i.lat != null && i.lng != null).map((i, n) => ({ id: n, latitude: i.lat, longitude: i.lng, title: i.name })), loading: false })
    }).catch((err) => this.setData({ loading: false, error: err.message || 'Atlas 数据加载失败' }))
  },
  toggleSearch() { this.setData({ searchOpen: !this.data.searchOpen }) },
  input(e) { this.setData({ query: e.detail.value }) },
  search() { const q = (this.data.query || '').trim(); if (!q) return; this.setData({ loading: true, searchResults: [] }); amapSearch(q).then((data) => { const results = Array.isArray(data.suggestions) ? data.suggestions : (Array.isArray(data.pois) ? data.pois : (Array.isArray(data.results) ? data.results : [])); this.setData({ searchResults: results.slice(0, 8) }); }).catch(() => wx.showToast({ title: '搜索失败', icon: 'none' })).finally(() => this.setData({ loading: false })) },
  selectSearchResult(e) {
    const item = this.data.searchResults[e.currentTarget.dataset.index] || e.currentTarget.dataset.item
    const location = item?.location || item?.position || {}
    const parts = typeof location === 'string' ? location.split(',').map(Number) : []
    const latitude = Number(location?.lat ?? item?.lat ?? item?.latitude ?? parts[1])
    const longitude = Number(location?.lng ?? item?.lng ?? item?.longitude ?? parts[0])
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return wx.showToast({ title: '地点坐标不可用', icon: 'none' })
    this.setData({ selectedPlace: item, latitude, longitude, scale: 10, searchResults: [] })
  },
  togglePlanned() {
    const showPlanned = !this.data.showPlanned
    this.setData({ showPlanned, polygons: toPolygons(this.data.regionGeo, this.data.regions, showPlanned) })
  },
  tapMap(e) {
    const { latitude, longitude } = e.detail || {}
    if (latitude == null || longitude == null) return
    getAtlasLocate(latitude, longitude).then((located) => {
      if (!located.country_code) return wx.showToast({ title: '这里还没有国家边界数据', icon: 'none' })
      return getAtlasCountry(located.country_code).then((country) => {
        const placeCount = (country.places || []).length
        const action = country.manually_marked ? '取消手动标记' : '标记为已访问'
        this.setData({ countryCode: located.country_code, countryDetail: { ...country, placeCount, action }, countrySheet: true })
      })
    }).catch(() => wx.showToast({ title: '国家信息加载失败', icon: 'none' }))
  },
  closeCountry() { this.setData({ countrySheet: false }) },
  toggleCountryMark() {
    const code = this.data.countryCode
    const marked = !!this.data.countryDetail?.manually_marked
    const request = marked ? unmarkAtlasCountry(code) : markAtlasCountry(code)
    request.then(() => { this.setData({ countrySheet: false }); wx.showToast({ title: marked ? '已取消标记' : '已标记为已访问', icon: 'success' }); this.load() }).catch(() => wx.showToast({ title: '更新失败', icon: 'none' }))
  },
  openBucket() { this.setData({ bucketOpen: true }) },
  closeBucket() { this.setData({ bucketOpen: false }) },
  createBucket() {
      wx.showModal({ title: '加入愿望单', editable: true, content: this.data.selectedPlace?.name || '', placeholderText: '例如：京都清水寺', success: (result) => {
      if (!result.confirm || !result.content.trim()) return
      createAtlasBucketItem({ name: result.content.trim(), lat: this.data.latitude, lng: this.data.longitude, country_code: this.data.selectedPlace?.country || null }).then(() => { wx.showToast({ title: '已加入', icon: 'success' }); this.load() }).catch((err) => wx.showToast({ title: err.errMsg || '加入失败', icon: 'none' }))
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
