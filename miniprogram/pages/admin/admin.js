Page({
  data: { user: null, userInitial: 'D', section: 'overview', stats: null, users: [], auditEntries: [], auditTotal: 0, loading: true, error: '' },
  api: require('../../utils/api'),
  onLoad() {
    const user = getApp().globalData.user || {}
    this.setData({ user, userInitial: String(user.username || 'D').slice(0, 1).toUpperCase() })
    this.loadData()
  },
  loadData() {
    this.setData({ loading: true, error: '' })
    Promise.all([this.api.getAdminStats(), this.api.listAdminUsers()]).then(([stats, users]) => {
      const list = (users.users || []).map((item) => ({ ...item, initial: String(item.username || '?').slice(0, 1).toUpperCase() }))
      this.setData({ stats, users: list, loading: false })
    }).catch((err) => this.setData({ loading: false, error: err.errMsg || '管理员数据加载失败' }))
  },
  chooseSection() {
    wx.showActionSheet({ itemList: ['概览', '用户管理', '审计日志', '设置与外观', '通知中心'], success: (result) => {
      const sections = ['overview', 'users', 'audit', 'settings', 'notifications']
      const section = sections[result.tapIndex]
      this.setData({ section })
      if (section === 'audit') this.loadAudit()
      if (section === 'settings') this.openSettings()
      if (section === 'notifications') this.openNotifications()
    } })
  },
  loadAudit() { this.setData({ loading: true, error: '' }); this.api.getAdminAuditLog().then((result) => this.setData({ auditEntries: result.entries || [], auditTotal: Number(result.total || 0), loading: false })).catch((err) => this.setData({ loading: false, error: err.errMsg || '审计日志加载失败' })) },
  openSettings() { wx.navigateTo({ url: '../settings/settings' }) },
  openNotifications() { wx.navigateTo({ url: '../notifications/notifications' }) },
  prompt(label, value) {
    return new Promise((resolve) => wx.showModal({ title: label, editable: true, content: value || '', placeholderText: label, success: (result) => resolve(result.confirm ? String(result.content || '').trim() : null) }))
  },
  async createUser() {
    const username = await this.prompt('用户名')
    if (username === null) return
    const email = await this.prompt('邮箱')
    if (email === null) return
    const password = await this.prompt('初始密码')
    if (password === null) return
    wx.showActionSheet({ itemList: ['普通用户', '管理员'], success: async (result) => {
      try {
        await this.api.createAdminUser({ username, email, password, role: result.tapIndex === 1 ? 'admin' : 'user' })
        wx.showToast({ title: '已创建', icon: 'success' })
        this.loadData()
      } catch (err) { wx.showToast({ title: err.errMsg || '创建失败', icon: 'none' }) }
    } })
  },
  editUser(e) {
    const item = this.data.users[e.currentTarget.dataset.index]
    if (!item) return
    wx.showActionSheet({ itemList: ['编辑资料', '删除用户'], success: async (result) => {
      try {
        if (result.tapIndex === 1) {
          const confirmed = await new Promise((resolve) => wx.showModal({ title: '删除用户', content: `确定删除 ${item.username || item.email || '该用户'} 吗？`, confirmColor: '#d6455d', success: (modal) => resolve(modal.confirm) }))
          if (!confirmed) return
          await this.api.deleteAdminUser(item.id)
          wx.showToast({ title: '已删除', icon: 'success' })
          return this.loadData()
        }
        const username = await this.prompt('用户名', item.username)
        if (username === null) return
        const email = await this.prompt('邮箱', item.email)
        if (email === null) return
        const password = await this.prompt('新密码（不修改请留空）')
        if (password === null) return
        const payload = { username, email }
        if (password) payload.password = password
        await this.api.updateAdminUser(item.id, payload)
        wx.showToast({ title: '已保存', icon: 'success' })
        this.loadData()
      } catch (err) { wx.showToast({ title: err.errMsg || '操作失败', icon: 'none' }) }
    } })
  },
  back() { wx.navigateBack({ delta: 1 }) },
})
