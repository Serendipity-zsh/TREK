const api = require('../../utils/api')

Page({
  data: { unreadOnly: false, items: [], loading: true, error: '' },
  onLoad() { this.load() },
  load() {
    this.setData({ loading: true, error: '' })
    return api.listNotifications(this.data.unreadOnly).then((data) => {
      this.setData({ items: data.notifications || data.items || [] })
    }).catch((error) => this.setData({ error: error.errMsg || '通知加载失败' })).finally(() => this.setData({ loading: false }))
  },
  toggleFilter() { this.setData({ unreadOnly: !this.data.unreadOnly }, () => this.load()) },
  markAllRead() { api.markAllNotificationsRead().then(() => this.load()).catch(() => {}) },
  deleteAll() { api.deleteAllNotifications().then(() => this.load()).catch(() => {}) },
  markRead(event) { const item = this.data.items[event.currentTarget.dataset.index]; if (item && !item.is_read) api.markNotificationRead(item.id).then(() => this.load()).catch(() => {}) },
  remove(event) { const item = this.data.items[event.currentTarget.dataset.index]; if (item) api.deleteNotification(item.id).then(() => this.load()).catch(() => {}) },
  goHome() { wx.navigateBack({ delta: 1 }) },
  openCalendar() { wx.navigateTo({ url: '../vacay/vacay' }) },
  openAtlas() { wx.navigateTo({ url: '../atlas/atlas' }) },
  openTools() { wx.navigateTo({ url: '../tools/tools' }) },
})
