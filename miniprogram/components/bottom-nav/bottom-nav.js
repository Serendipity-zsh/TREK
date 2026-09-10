Component({
  properties: {
    active: { type: String, value: 'home' },
  },

  methods: {
    navigate(event) {
      const target = event.currentTarget.dataset.target
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
  },
})
