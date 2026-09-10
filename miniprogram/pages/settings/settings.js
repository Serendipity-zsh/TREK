Page({
  data: { dark: false },
  onLoad() { this.setData({ dark: wx.getStorageSync('trek_theme') === 'dark' }) },
  toggleTheme() { const dark = !this.data.dark; wx.setStorageSync('trek_theme', dark ? 'dark' : 'light'); this.setData({ dark }) },
  logout() {
    const app = getApp()
    app.globalData.token = ''
    app.globalData.user = null
    wx.removeStorageSync('trek_token')
    wx.removeStorageSync('trek_user')
    wx.reLaunch({ url: '../index/index' })
  },
  goHome() { wx.navigateBack({ delta: 1 }) },
})
