const api = require('../../utils/api')

Page({
  data: { unreadOnly: false, items: [], unreadCount: 0, total: 0, offset: 0, loading: true, hasMore: false, error: '' },
  onLoad() { this.load() },
  compactTime(value) {
    const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
    if (!Number.isFinite(minutes) || minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    return `${Math.floor(hours / 24)}天前`
  },
  decorate(items) {
    return items.map(item => Object.assign({}, item, { displayTime: this.compactTime(item.created_at) }))
  },
  load(reset = true) {
    const offset = reset ? 0 : this.data.offset
    this.setData({ loading: true, error: '' })
    return api.listNotifications(this.data.unreadOnly, offset).then((data) => {
      const incoming = data.notifications || data.items || []
      const items = this.decorate(reset ? incoming : this.data.items.concat(incoming))
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
  markAllRead() { api.markAllNotificationsRead().then(() => this.load()).catch(() => wx.showToast({ title: '操作失败', icon: 'none' })) },
  deleteAll() {
    wx.showModal({ title: '删除通知', content: '确定删除全部通知吗？', confirmColor: '#d6455d', success: (result) => {
      if (!result.confirm) return
      api.deleteAllNotifications().then(() => this.load()).catch(() => wx.showToast({ title: '删除失败', icon: 'none' }))
    } })
  },
  markRead(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    if (item && !item.is_read) api.markNotificationRead(item.id).then(() => {
      const items = this.data.items.map(row => row.id === item.id ? Object.assign({}, row, { is_read: true }) : row)
      this.setData({ items, unreadCount: Math.max(0, this.data.unreadCount - 1) })
    }).catch(() => wx.showToast({ title: '操作失败', icon: 'none' }))
  },
  respond(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    const response = event.currentTarget.dataset.response
    if (!item || item.response || !response) return
    api.respondNotification(item.id, response).then((data) => {
      const updated = data.notification || Object.assign({}, item, { response, is_read: true })
      const items = this.data.items.map(row => row.id === item.id ? Object.assign({}, updated, { displayTime: this.compactTime(updated.created_at || item.created_at) }) : row)
      this.setData({ items, unreadCount: item.is_read ? this.data.unreadCount : Math.max(0, this.data.unreadCount - 1) })
    }).catch(() => wx.showToast({ title: '操作失败', icon: 'none' }))
  },
  remove(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    if (item) api.deleteNotification(item.id).then(() => {
      const items = this.data.items.filter(row => row.id !== item.id)
      this.setData({ items, total: Math.max(0, this.data.total - 1), unreadCount: item.is_read ? this.data.unreadCount : Math.max(0, this.data.unreadCount - 1) })
    }).catch(() => wx.showToast({ title: '删除失败', icon: 'none' }))
  },
  goHome() { wx.navigateBack({ delta: 1 }) },
  openCalendar() { wx.navigateTo({ url: '../vacay/vacay' }) },
  openAtlas() { wx.navigateTo({ url: '../atlas/atlas' }) },
  openTools() { wx.navigateTo({ url: '../tools/tools' }) },
})
