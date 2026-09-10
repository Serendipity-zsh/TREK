const api = require('../../utils/api')

Page({
  data: {
    loggedIn: false,
    loading: false,
    user: null,
    trips: [],
    error: '',
  },

  onLoad() {
    const app = getApp()
    if (app.globalData.token) {
      this.setData({ loggedIn: true, user: app.globalData.user })
      this.loadTrips()
    }
  },

  handleLogin() {
    if (this.data.loading) return
    this.setData({ loading: true, error: '' })
    api.login()
      .then(({ user }) => {
        this.setData({ loggedIn: true, user })
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
      this.setData({ trips: Array.isArray(data?.trips) ? data.trips : [] })
    })
  },

  handleLogout() {
    const app = getApp()
    app.globalData.token = ''
    app.globalData.user = null
    wx.removeStorageSync('trek_token')
    wx.removeStorageSync('trek_user')
    this.setData({ loggedIn: false, user: null, trips: [], error: '' })
  },

  openMap() {
    wx.navigateTo({ url: '../map/map' })
  },

  openTrip(event) {
    wx.navigateTo({ url: `../trip/trip?id=${event.currentTarget.dataset.id}` })
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
})
