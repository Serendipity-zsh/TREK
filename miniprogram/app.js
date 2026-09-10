const ENV_ID = 'prod-d2g3gxl9k1f7f0f14'

App({
  globalData: {
    envId: ENV_ID,
    service: 'trek',
    token: '',
    user: null,
  },

  onLaunch() {
    wx.cloud.init({ env: ENV_ID, traceUser: true })
    this.globalData.devTools = wx.getSystemInfoSync().platform === 'devtools'
    this.globalData.token = wx.getStorageSync('trek_token') || ''
    this.globalData.user = wx.getStorageSync('trek_user') || null
  },
})
