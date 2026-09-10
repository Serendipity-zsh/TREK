Component({
  data: { moreOpen: false },
  properties: {
    active: { type: String, value: 'home' },
    centerMode: { type: String, value: 'create' },
  },

  methods: {
    navigate(event) {
      const target = event.currentTarget.dataset.target
      if (target === 'more') return this.setData({ moreOpen: !this.data.moreOpen })
      const urls = {
        home: '../index/index',
        calendar: '../vacay/vacay',
        atlas: '../atlas/atlas',
        more: '../tools/tools',
      }
      const url = urls[target]
      // Main navigation is a root switch in TREK. Re-launching prevents a
      // long trip through the five primary areas from exhausting WeChat's
      // page stack, while detail pages keep their own back buttons.
      if (url) wx.reLaunch({ url })
    },

    create() {
      this.triggerEvent('create')
    },

    closeMore() { this.setData({ moreOpen: false }) },
    openMorePage(event) {
      const target = event.currentTarget.dataset.target
      this.setData({ moreOpen: false })
      const urls = { journey: '../journey/journey', collections: '../collections/collections', settings: '../settings/settings', notifications: '../notifications/notifications', tools: '../tools/tools' }
      if (urls[target]) wx.navigateTo({ url: urls[target] })
    },
  },
})
