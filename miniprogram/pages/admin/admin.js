Page({
  data: { user: null, userInitial: 'D' },
  onLoad() { const user = getApp().globalData.user || {}; this.setData({ user, userInitial: String(user.username || 'D').slice(0, 1).toUpperCase() }) },
  openSettings() { wx.navigateTo({ url: '../settings/settings' }) },
  openNotifications() { wx.navigateTo({ url: '../notifications/notifications' }) },
  back() { wx.navigateBack({ delta: 1 }) },
})
