Page({
  data: { dark: false, user: {}, avatarText: 'D', dropOpen: false, activeTab: 'display', activeLabel: '常规', integrationStatus: { airtrail: null, immich: null, synology: null }, prefs: { default_currency: '', language: 'zh', temperature_unit: 'celsius', distance_unit: 'metric', time_format: '24h', start_page: 'dashboard', start_trip_tab: 'plan', map_booking_labels: false, map_poi_pill_enabled: true, blur_booking_codes: false, optimize_from_accommodation: true }, widgets: { collections: true, upcomingReservations: true, currency: true, timezones: true }, widgetOrder: ['currency', 'collections', 'timezones', 'upcomingReservations'], tabs: [{ id: 'display', label: '常规' }, { id: 'appearance', label: '外观' }, { id: 'map', label: '地图' }, { id: 'notifications', label: '通知' }, { id: 'integrations', label: '集成' }, { id: 'offline', label: '离线' }, { id: 'account', label: '账号' }, { id: 'about', label: '关于 TREK' }] },
  onLoad(options = {}) {
    const user = getApp().globalData.user || wx.getStorageSync('trek_user') || {}
    const requestedTab = this.data.tabs.some((item) => item.id === options.tab) ? options.tab : 'display'
    const requestedLabel = this.data.tabs.find((item) => item.id === requestedTab)?.label || '常规'
    this.setData({ dark: wx.getStorageSync('trek_theme') === 'dark', user, avatarText: String(user.username || 'D').slice(0, 1).toUpperCase(), activeTab: requestedTab, activeLabel: requestedLabel })
    const api = require('../../utils/api')
    api.getSettings().then((result) => { const settings = result.settings || {}; const mobile = settings.appearance?.dashboard?.mobile || {}; const known = ['currency', 'collections', 'timezones', 'upcomingReservations']; const stored = settings.appearance?.dashboard?.mobileOrder; const widgetOrder = (Array.isArray(stored) ? stored : []).filter((item, index, list) => known.includes(item) && list.indexOf(item) === index).concat(known.filter((item) => !(Array.isArray(stored) ? stored : []).includes(item))); this.setData({ prefs: Object.assign({}, this.data.prefs, Object.fromEntries(Object.keys(this.data.prefs).map((key) => [key, settings[key] ?? this.data.prefs[key]]))), widgets: { collections: mobile.collections !== false, upcomingReservations: mobile.upcomingReservations !== false, currency: mobile.currency !== false, timezones: mobile.timezones !== false }, widgetOrder }) }).catch(() => {})
    Promise.all([api.getAirtrailStatus().catch(() => ({ connected: false })), api.getImmichStatus().catch(() => ({ connected: false })), api.getSynologyStatus().catch(() => ({ connected: false }))]).then(([airtrail, immich, synology]) => this.setData({ integrationStatus: { airtrail, immich, synology } }))
  },
  toggleTheme() { const dark = !this.data.dark; wx.setStorageSync('trek_theme', dark ? 'dark' : 'light'); this.setData({ dark }); require('../../utils/api').setSetting('dark_mode', dark ? 'dark' : 'light').catch(() => wx.showToast({ title: '主题保存失败', icon: 'none' })) },
  toggleTabs() { this.setData({ dropOpen: !this.data.dropOpen }) },
  selectTab(e) { const id = e.currentTarget.dataset.id; const tab = this.data.tabs.find((item) => item.id === id); this.setData({ activeTab: id, activeLabel: tab ? tab.label : id, dropOpen: false }) },
  choosePref(e) {
    const key = e.currentTarget.dataset.key
    const options = { default_currency: ['跟随行程', 'CNY', 'USD', 'EUR', 'JPY'], language: ['简体中文', 'English'], temperature_unit: ['摄氏度', '华氏度'], distance_unit: ['公里', '英里'], time_format: ['24 小时制', '12 小时制'], start_page: ['首页', '当前行程'], start_trip_tab: ['计划', '交通', '预订', '清单', '费用', '文件', '协作'] }[key]
    const values = { default_currency: ['', 'CNY', 'USD', 'EUR', 'JPY'], language: ['zh', 'en'], temperature_unit: ['celsius', 'fahrenheit'], distance_unit: ['metric', 'imperial'], time_format: ['24h', '12h'], start_page: ['dashboard', 'active_trip'], start_trip_tab: ['plan', 'transports', 'bookings', 'lists', 'costs', 'files', 'collab'] }[key]
    if (!options || !values) return
    wx.showActionSheet({ itemList: options, success: (result) => { const value = values[result.tapIndex]; const prefs = Object.assign({}, this.data.prefs, { [key]: value }); this.setData({ prefs }); require('../../utils/api').setSetting(key, value).catch(() => wx.showToast({ title: '设置保存失败', icon: 'none' })) } })
  },
  togglePref(e) { const key = e.currentTarget.dataset.key; const value = !!e.detail.value; this.setData({ prefs: Object.assign({}, this.data.prefs, { [key]: value }) }); require('../../utils/api').setSetting(key, value).catch(() => wx.showToast({ title: '设置保存失败', icon: 'none' })) },
  toggleWidget(e) {
    const key = e.currentTarget.dataset.key
    const widgets = Object.assign({}, this.data.widgets, { [key]: !!e.detail.value })
    this.setData({ widgets })
    const api = require('../../utils/api')
    api.getSettings().then((result) => {
      const appearance = result.settings?.appearance || {}
      const dashboard = appearance.dashboard || {}
      const mobile = Object.assign({ collections: true, upcomingReservations: true, currency: true, timezones: true }, dashboard.mobile || {}, widgets)
      return api.setSetting('appearance', Object.assign({}, appearance, { dashboard: Object.assign({}, dashboard, { mobile }) }))
    }).catch(() => wx.showToast({ title: '设置保存失败', icon: 'none' }))
  },
  moveWidget(e) {
    const index = Number(e.currentTarget.dataset.index)
    const direction = Number(e.currentTarget.dataset.direction)
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= this.data.widgetOrder.length) return
    const widgetOrder = this.data.widgetOrder.slice()
    const moved = widgetOrder[index]
    widgetOrder[index] = widgetOrder[nextIndex]
    widgetOrder[nextIndex] = moved
    this.setData({ widgetOrder })
    const api = require('../../utils/api')
    api.getSettings().then((result) => {
      const appearance = result.settings?.appearance || {}
      const dashboard = appearance.dashboard || {}
      return api.setSetting('appearance', Object.assign({}, appearance, { dashboard: Object.assign({}, dashboard, { mobileOrder: widgetOrder }) }))
    }).catch(() => wx.showToast({ title: '顺序保存失败', icon: 'none' }))
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
