Page({
  data: { dark: false, user: {}, avatarText: 'D' },
  onLoad() {
    const user = getApp().globalData.user || wx.getStorageSync('trek_user') || {}
    this.setData({ dark: wx.getStorageSync('trek_theme') === 'dark', user, avatarText: String(user.username || 'D').slice(0, 1).toUpperCase() })
  },
  toggleTheme() { const dark = !this.data.dark; wx.setStorageSync('trek_theme', dark ? 'dark' : 'light'); this.setData({ dark }) },
  logout() {
    const app = getApp()
    app.globalData.token = ''
    app.globalData.user = null
    wx.removeStorageSync('trek_token')
    wx.removeStorageSync('trek_user')
    wx.reLaunch({ url: '../index/index' })
  },
  openCalendar() { wx.navigateTo({ url: '../vacay/vacay' }) },
  openMap() { wx.navigateTo({ url: '../atlas/atlas' }) },
  openTools() { wx.navigateTo({ url: '../tools/tools' }) },
  openNotifications() { wx.navigateTo({ url: '../notifications/notifications' }) },
  goHome() { wx.navigateBack({ delta: 1 }) },
})
