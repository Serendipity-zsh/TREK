Page({
  data: { dark: false, user: {}, avatarText: 'D', dropOpen: false, activeTab: 'display', activeLabel: '常规', widgets: { collections: true, upcomingReservations: true }, tabs: [{ id: 'display', label: '常规' }, { id: 'appearance', label: '外观' }, { id: 'map', label: '地图' }, { id: 'notifications', label: '通知' }, { id: 'integrations', label: '集成' }, { id: 'offline', label: '离线' }, { id: 'account', label: '账号' }, { id: 'about', label: '关于 TREK' }] },
  onLoad() {
    const user = getApp().globalData.user || wx.getStorageSync('trek_user') || {}
    this.setData({ dark: wx.getStorageSync('trek_theme') === 'dark', user, avatarText: String(user.username || 'D').slice(0, 1).toUpperCase() })
    const api = require('../../utils/api')
    api.getSettings().then((result) => { const mobile = result.settings?.appearance?.dashboard?.mobile || {}; this.setData({ widgets: { collections: mobile.collections !== false, upcomingReservations: mobile.upcomingReservations !== false } }) }).catch(() => {})
  },
  toggleTheme() { const dark = !this.data.dark; wx.setStorageSync('trek_theme', dark ? 'dark' : 'light'); this.setData({ dark }) },
  toggleTabs() { this.setData({ dropOpen: !this.data.dropOpen }) },
  selectTab(e) { const id = e.currentTarget.dataset.id; const tab = this.data.tabs.find((item) => item.id === id); this.setData({ activeTab: id, activeLabel: tab ? tab.label : id, dropOpen: false }) },
  toggleWidget(e) {
    const key = e.currentTarget.dataset.key
    const widgets = Object.assign({}, this.data.widgets, { [key]: !!e.detail.value })
    this.setData({ widgets })
    const api = require('../../utils/api')
    api.getSettings().then((result) => {
      const appearance = result.settings?.appearance || {}
      const dashboard = appearance.dashboard || {}
      const mobile = Object.assign({ collections: true, upcomingReservations: true }, dashboard.mobile || {}, widgets)
      return api.setSetting('appearance', Object.assign({}, appearance, { dashboard: Object.assign({}, dashboard, { mobile }) }))
    }).catch(() => wx.showToast({ title: '设置保存失败', icon: 'none' }))
  },
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
