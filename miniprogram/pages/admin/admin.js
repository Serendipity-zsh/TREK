Page({
  data: { user: null, userInitial: 'D', section: 'overview', stats: null, users: [], loading: true, error: '' },
  onLoad() {
    const user = getApp().globalData.user || {}
    this.setData({ user, userInitial: String(user.username || 'D').slice(0, 1).toUpperCase() })
    Promise.all([require('../../utils/api').getAdminStats(), require('../../utils/api').listAdminUsers()]).then(([stats, users]) => {
      const list = (users.users || []).map((item) => ({ ...item, initial: String(item.username || '?').slice(0, 1).toUpperCase() }))
      this.setData({ stats, users: list, loading: false })
    }).catch((err) => this.setData({ loading: false, error: err.errMsg || '管理员数据加载失败' }))
  },
  chooseSection() {
    wx.showActionSheet({ itemList: ['概览', '用户管理', '设置与外观', '通知中心'], success: (result) => {
      const sections = ['overview', 'users', 'settings', 'notifications']
      const section = sections[result.tapIndex]
      this.setData({ section })
      if (section === 'settings') this.openSettings()
      if (section === 'notifications') this.openNotifications()
    } })
  },
  openSettings() { wx.navigateTo({ url: '../settings/settings' }) },
  openNotifications() { wx.navigateTo({ url: '../notifications/notifications' }) },
  back() { wx.navigateBack({ delta: 1 }) },
})
