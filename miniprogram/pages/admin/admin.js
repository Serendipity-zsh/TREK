Page({
  data: { user: null },
  onLoad() { this.setData({ user: getApp().globalData.user || {} }) },
  openSettings() { wx.navigateTo({ url: '../settings/settings' }) },
  openNotifications() { wx.navigateTo({ url: '../notifications/notifications' }) },
  back() { wx.navigateBack({ delta: 1 }) },
})
