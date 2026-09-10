const api = require('../../utils/api')

Page({
  data: { unreadOnly: false, items: [], unreadCount: 0, total: 0, offset: 0, loading: true, hasMore: false, error: '' },
  onLoad() { this.load() },
  load(reset = true) {
    const offset = reset ? 0 : this.data.offset
    this.setData({ loading: true, error: '' })
    return api.listNotifications(this.data.unreadOnly, offset).then((data) => {
      const incoming = data.notifications || data.items || []
      const items = reset ? incoming : this.data.items.concat(incoming)
      this.setData({
        items,
        unreadCount: Number(data.unread_count) || items.filter(item => !item.is_read).length,
        total: Number(data.total) || items.length,
        offset: items.length,
        hasMore: items.length < (Number(data.total) || items.length),
      })
    }).catch((error) => this.setData({ error: error.errMsg || '通知加载失败' })).finally(() => this.setData({ loading: false }))
  },
  toggleFilter() { this.setData({ unreadOnly: !this.data.unreadOnly }, () => this.load()) },
  loadMore() { if (this.data.hasMore && !this.data.loading) this.load(false) },
  markAllRead() { api.markAllNotificationsRead().then(() => this.load()).catch(() => {}) },
  deleteAll() { api.deleteAllNotifications().then(() => this.load()).catch(() => {}) },
  markRead(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    if (item && !item.is_read) api.markNotificationRead(item.id).then(() => {
      const items = this.data.items.map(row => row.id === item.id ? Object.assign({}, row, { is_read: true }) : row)
      this.setData({ items, unreadCount: Math.max(0, this.data.unreadCount - 1) })
    }).catch(() => {})
  },
  remove(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    if (item) api.deleteNotification(item.id).then(() => {
      const items = this.data.items.filter(row => row.id !== item.id)
      this.setData({ items, total: Math.max(0, this.data.total - 1), unreadCount: item.is_read ? this.data.unreadCount : Math.max(0, this.data.unreadCount - 1) })
    }).catch(() => {})
  },
  goHome() { wx.navigateBack({ delta: 1 }) },
  openCalendar() { wx.navigateTo({ url: '../vacay/vacay' }) },
  openAtlas() { wx.navigateTo({ url: '../atlas/atlas' }) },
  openTools() { wx.navigateTo({ url: '../tools/tools' }) },
})
