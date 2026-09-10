const api = require('../../utils/api')

Page({
  data: { tripId: '', tab: 'todo', items: [], loading: false, error: '', total: 0 },
  onLoad(options) { this.setData({ tripId: options.tripId || '', tab: options.tab || 'todo' }); this.load() },
  switchTab(event) { this.setData({ tab: event.currentTarget.dataset.tab }); this.load() },
  load() {
    this.setData({ loading: true, error: '' })
    const request = this.data.tab === 'todo' ? api.listTodo(this.data.tripId) : this.data.tab === 'packing' ? api.listPacking(this.data.tripId) : api.listBudget(this.data.tripId)
    return request.then((data) => {
      const items = data.items || []
      const total = this.data.tab === 'budget' ? items.reduce((sum, item) => sum + Number(item.total_price || 0), 0) : 0
      this.setData({ items, total })
    }).catch((error) => this.setData({ error: error.errMsg || '加载失败' })).finally(() => this.setData({ loading: false }))
  },
  addItem() {
    const labels = { todo: '待办事项', packing: '行李物品', budget: '费用名称' }
    wx.showModal({ title: `添加${labels[this.data.tab]}`, editable: true, placeholderText: '请输入名称', success: (result) => {
      if (!result.confirm || !result.content.trim()) return
      const name = result.content.trim()
      const request = this.data.tab === 'todo' ? api.createTodo(this.data.tripId, { name }) : this.data.tab === 'packing' ? api.createPacking(this.data.tripId, { name }) : api.createBudget(this.data.tripId, { name, total_price: 0 })
      request.then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '添加失败', icon: 'none' }))
    } })
  },
  toggle(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    if (!item) return
    const request = this.data.tab === 'todo' ? api.updateTodo(this.data.tripId, item.id, { checked: !item.checked }) : api.updatePacking(this.data.tripId, item.id, { checked: !item.checked })
    request.then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '更新失败', icon: 'none' }))
  },
  remove(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    if (!item) return
    wx.showModal({ title: '删除项目？', success: (result) => {
      if (!result.confirm) return
      const request = this.data.tab === 'todo' ? api.deleteTodo(this.data.tripId, item.id) : api.deletePacking(this.data.tripId, item.id)
      request.then(() => this.load()).catch((error) => wx.showToast({ title: error.errMsg || '删除失败', icon: 'none' }))
    } })
  },
})
