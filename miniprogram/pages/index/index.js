const api = require('../../utils/api')

Page({
  data: {
    loggedIn: false,
    loading: false,
    devTools: false,
    user: null,
    avatarText: 'D',
    trips: [],
    visibleTrips: [],
    featuredTrip: null,
    tripFilter: 'planned',
    viewMode: 'grid',
    menuOpen: false,
    welcomeOpen: false,
    error: '',
  },

  onLoad() {
    const app = getApp()
    this.setData({ devTools: !!app.globalData.devTools })
    if (app.globalData.token) {
      const cachedUser = app.globalData.user
      this.setData({ loggedIn: true, user: cachedUser, avatarText: this.avatarText(cachedUser) })
      this.loadTrips()
    }
  },

  handleDemoLogin() {
    if (this.data.loading) return
    this.setData({ loading: true, error: '' })
    api.demoLogin()
      .then(({ user }) => { this.setData({ loggedIn: true, user, avatarText: this.avatarText(user), welcomeOpen: !wx.getStorageSync('trek_welcome_seen') }); return this.loadTrips() })
      .catch((error) => this.setData({ error: error.errMsg || '预览登录失败，请在云托管开启 DEMO_MODE' }))
      .finally(() => this.setData({ loading: false }))
  },

  handleLogin() {
    if (this.data.loading) return
    this.setData({ loading: true, error: '' })
    api.login()
      .then(({ user }) => {
        this.setData({ loggedIn: true, user, avatarText: this.avatarText(user), welcomeOpen: !wx.getStorageSync('trek_welcome_seen') })
        return this.loadTrips()
      })
      .catch((error) => {
        console.error('TREK WeChat login failed', error)
        this.setData({ error: error.errMsg || '微信登录失败，请稍后重试' })
      })
      .finally(() => this.setData({ loading: false }))
  },

  loadTrips() {
    return api.call('/api/trips').then((data) => {
      const trips = (Array.isArray(data?.trips) ? data.trips : []).map((trip, index) => ({
        ...trip,
        coverColor: ['#1b2844', '#315d55', '#5f3e64', '#81543e'][index % 4],
      }))
      const visibleTrips = this.filterTrips(trips, this.data.tripFilter)
      this.setData({ trips, visibleTrips, featuredTrip: visibleTrips[0] || null })
    })
  },

  filterTrips(trips, filter) {
    const today = new Date().toISOString().slice(0, 10)
    return trips.filter((trip) => {
      if (filter === 'archive') return !!trip.is_archived
      if (filter === 'completed') return !trip.is_archived && !!trip.end_date && trip.end_date < today
      return !trip.is_archived && (!trip.end_date || trip.end_date >= today)
    })
  },

  avatarText(user) {
    return String(user?.username || 'D').slice(0, 1).toUpperCase()
  },

  setTripFilter(event) {
    const tripFilter = event.currentTarget.dataset.filter
    const visibleTrips = this.filterTrips(this.data.trips, tripFilter)
    this.setData({ tripFilter, visibleTrips, featuredTrip: visibleTrips[0] || null })
  },

  toggleViewMode() {
    this.setData({ viewMode: this.data.viewMode === 'grid' ? 'list' : 'grid' })
  },

  toggleUserMenu() { this.setData({ menuOpen: !this.data.menuOpen }) },
  openCalendar() { wx.navigateTo({ url: '../vacay/vacay' }) },
  openSettings() { wx.navigateTo({ url: '../settings/settings' }) },
  openNotifications() { wx.navigateTo({ url: '../notifications/notifications' }) },
  dismissWelcome() { wx.setStorageSync('trek_welcome_seen', true); this.setData({ welcomeOpen: false }) },

  handleLogout() {
    const app = getApp()
    app.globalData.token = ''
    app.globalData.user = null
    wx.removeStorageSync('trek_token')
    wx.removeStorageSync('trek_user')
    this.setData({ loggedIn: false, user: null, avatarText: 'D', trips: [], visibleTrips: [], featuredTrip: null, error: '' })
  },

  openMap() {
    wx.navigateTo({ url: '../atlas/atlas' })
  },

  openTrip(event) {
    wx.navigateTo({ url: `../trip/trip?id=${event.currentTarget.dataset.id}` })
  },

  editFeaturedTrip() {
    const trip = this.data.featuredTrip
    if (!trip) return
    wx.showModal({ title: '编辑行程名称', editable: true, content: trip.title || '', placeholderText: '行程名称', success: (result) => {
      const title = String(result.content || '').trim()
      if (!result.confirm || !title || title === trip.title) return
      api.updateTrip(trip.id, { title }).then(() => this.loadTrips()).catch((error) => wx.showToast({ title: error.errMsg || '保存失败', icon: 'none' }))
    } })
  },

  copyFeaturedTrip() {
    const trip = this.data.featuredTrip
    if (!trip) return
    wx.showModal({ title: '复制行程', content: `复制「${trip.title}」？`, success: (result) => {
      if (!result.confirm) return
      api.createTrip({ title: `${trip.title}（副本）`, description: trip.description || null, start_date: trip.start_date || null, end_date: trip.end_date || null, currency: trip.currency || 'EUR', day_count: trip.day_count || 1 })
        .then(() => { wx.showToast({ title: '已复制', icon: 'success' }); return this.loadTrips() })
        .catch((error) => wx.showToast({ title: error.errMsg || '复制失败', icon: 'none' }))
    } })
  },

  archiveFeaturedTrip() {
    const trip = this.data.featuredTrip
    if (!trip) return
    wx.showModal({ title: '归档行程', content: `归档「${trip.title}」？`, success: (result) => {
      if (!result.confirm) return
      api.updateTrip(trip.id, { is_archived: true }).then(() => { wx.showToast({ title: '已归档', icon: 'success' }); return this.loadTrips() }).catch((error) => wx.showToast({ title: error.errMsg || '归档失败', icon: 'none' }))
    } })
  },

  createTrip() {
    wx.showModal({
      title: '新建行程', editable: true, placeholderText: '例如：东京七日旅行',
      success: (result) => {
        if (!result.confirm || !result.content.trim()) return
        api.createTrip({ title: result.content.trim(), day_count: 1 })
          .then(({ trip }) => { this.loadTrips(); wx.navigateTo({ url: `../trip/trip?id=${trip.id}` }) })
          .catch((error) => wx.showToast({ title: error.errMsg || '创建失败', icon: 'none' }))
      },
    })
  },

  openTools() {
    wx.navigateTo({ url: '../tools/tools' })
  },

  noop() {},
})
