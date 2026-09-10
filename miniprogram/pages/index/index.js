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
    upcomingReservations: [],
    collectionsCount: 0,
    collectionItems: [],
    showCollections: true,
    showUpcoming: true,
    showCurrency: true,
    showTimezones: true,
    currencyFrom: 'EUR',
    currencyTo: 'USD',
    currencyRate: null,
    currencyValue: '—',
    currencyAmount: '100',
    timezoneCards: [],
    widgetLoading: false,
    tripFilter: 'planned',
    viewMode: 'grid',
    menuOpen: false,
    welcomeOpen: false,
    createOpen: false,
    createForm: { title: '', description: '', start_date: '', end_date: '', currency: 'EUR' },
    error: '',
  },

  onLoad() {
    const app = getApp()
    this.setData({ devTools: !!app.globalData.devTools })
    if (app.globalData.token) {
      const cachedUser = app.globalData.user
      this.setData({ loggedIn: true, user: cachedUser, avatarText: this.avatarText(cachedUser) })
      this.loadWidgetPreferences()
      this.loadTrips()
    }
  },

  loadWidgetPreferences() {
    return api.getSettings().then((result) => {
      const settings = result.settings || {}
      const appearance = settings.appearance || {}
      const mobile = appearance.dashboard?.mobile || {}
      this.setData({ showCollections: mobile.collections !== false, showUpcoming: mobile.upcomingReservations !== false, showCurrency: mobile.currency !== false, showTimezones: mobile.timezones !== false, currencyFrom: result.settings?.dashboard_fx_from || 'EUR', currencyTo: result.settings?.dashboard_fx_to || 'USD' })
    }).catch(() => {})
  },

  handleDemoLogin() {
    if (this.data.loading) return
    this.setData({ loading: true, error: '' })
    api.demoLogin()
      .then(({ user }) => { this.setData({ loggedIn: true, user, avatarText: this.avatarText(user), welcomeOpen: !wx.getStorageSync('trek_welcome_seen') }); this.loadWidgetPreferences(); return this.loadTrips() })
      .catch((error) => this.setData({ error: error.errMsg || '预览登录失败，请在云托管开启 DEMO_MODE' }))
      .finally(() => this.setData({ loading: false }))
  },

  handleLogin() {
    if (this.data.loading) return
    this.setData({ loading: true, error: '' })
    api.login()
      .then(({ user }) => {
        this.setData({ loggedIn: true, user, avatarText: this.avatarText(user), welcomeOpen: !wx.getStorageSync('trek_welcome_seen') })
        this.loadWidgetPreferences()
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
      return this.loadDashboardWidgets(visibleTrips[0])
    })
  },

  loadDashboardWidgets(trip) {
    this.setData({ widgetLoading: true })
    const sourceTrips = (this.data.visibleTrips.length ? this.data.visibleTrips : this.data.trips).slice(0, 8)
    const reservations = Promise.all(sourceTrips.map((item) => api.listReservations(item.id).then((data) => (data.reservations || data.items || []).map((reservation) => ({ ...reservation, trip_id: item.id, trip_title: item.title }))).catch(() => [])))
      .then((groups) => groups.flat().filter((item) => item.start_date || item.date || item.reservation_time).sort((a, b) => String(a.start_date || a.date || a.reservation_time).localeCompare(String(b.start_date || b.date || b.reservation_time))).slice(0, 6))
    const collections = api.listCollections().then((data) => data.collections || data || []).catch(() => [])
    const rates = api.getRates(this.data.currencyFrom).catch(() => ({ rates: null }))
    return Promise.all([reservations, collections, rates]).then(([upcomingReservations, collectionList, rateData]) => {
      const ratesMap = rateData && rateData.rates
      const currencyRate = ratesMap && ratesMap[this.data.currencyTo] ? Number(ratesMap[this.data.currencyTo]) : null
      this.setData({ upcomingReservations, collectionItems: Array.isArray(collectionList) ? collectionList.slice(0, 4) : [], collectionsCount: Array.isArray(collectionList) ? collectionList.length : 0, currencyRate, currencyValue: currencyRate ? (Number(this.data.currencyAmount) * currencyRate).toFixed(2) : '—', timezoneCards: this.timezoneCards() })
    }).finally(() => this.setData({ widgetLoading: false }))
  },

  timezoneCards() {
    const now = new Date()
    return ['Asia/Shanghai', 'Europe/London', 'Asia/Tokyo'].map((zone) => ({ zone, name: zone.split('/').pop().replace('_', ' '), time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone }) }))
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
    this.setData({ loggedIn: false, user: null, avatarText: 'D', trips: [], visibleTrips: [], featuredTrip: null, upcomingReservations: [], collectionItems: [], collectionsCount: 0, showCollections: true, showUpcoming: true, showCurrency: true, showTimezones: true, error: '' })
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

  createTrip() { this.setData({ createOpen: true, createForm: { title: '', description: '', start_date: '', end_date: '', currency: 'EUR' } }) },
  closeCreate() { this.setData({ createOpen: false }) },
  inputCreate(e) { this.setData({ [`createForm.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  changeCreateDate(e) { this.setData({ [`createForm.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  submitCreate() {
    const form = this.data.createForm
    const title = String(form.title || '').trim()
    if (!title) return wx.showToast({ title: '请输入行程名称', icon: 'none' })
    if (form.start_date && form.end_date && form.end_date < form.start_date) return wx.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
    api.createTrip({ title, description: String(form.description || '').trim() || null, start_date: form.start_date || null, end_date: form.end_date || null, currency: form.currency || 'EUR', day_count: form.start_date && form.end_date ? Math.max(1, Math.round((new Date(form.end_date) - new Date(form.start_date)) / 86400000) + 1) : 1 })
      .then(({ trip }) => { this.closeCreate(); this.loadTrips(); wx.navigateTo({ url: `../trip/trip?id=${trip.id}` }) })
      .catch((error) => wx.showToast({ title: error.errMsg || '创建失败', icon: 'none' }))
  },

  openTools() {
    wx.navigateTo({ url: '../tools/tools' })
  },

  openCollections() {
    wx.navigateTo({ url: '../collections/collections' })
  },

  noop() {},
})
