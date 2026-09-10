const api = require('../../utils/api')
Page({
  data: { id: '', journey: null, entries: [], gallery: [], shareLink: null, uploading: false, showCreate: false, showEditEntry: false, editEntryId: '', showSettings: false, title: '', body: '', entryDate: '', entryTime: '', entryLocation: '', mood: '', moodText: '', weather: '', weatherText: '', tags: '', pros: '', cons: '', editTitle: '', editSubtitle: '', editEntryTitle: '', editEntryBody: '', editEntryDate: '', editEntryTime: '', editEntryLocation: '', editEntryMood: '', editEntryMoodText: '', editEntryWeather: '', editEntryWeatherText: '', editEntryTags: '', editEntryPros: '', editEntryCons: '', showTripTracks: false, availableTrips: [], selectedTripIds: [], error: '', view: 'list', activeId: '', markers: [], mapLatitude: 31.23, mapLongitude: 121.47 },
  onLoad(options) { this.setData({ id: options.id || '' }); this.load() },
  load() {
    if (!this.data.id) return
    this.setData({ loading: true, error: '' })
    Promise.all([api.getJourney(this.data.id), api.listJourneyEntries(this.data.id)]).then(([journey, entries]) => {
      const list = (entries.entries || entries || []).map((entry) => ({ ...entry, moodLabel: this.moodLabel(entry.mood), weatherLabel: this.weatherLabel(entry.weather), tagsText: Array.isArray(entry.tags) ? entry.tags.map((tag) => `#${tag}`).join('  ') : '', prosText: entry.pros_cons?.pros?.filter(Boolean).join('、') || '', consText: entry.pros_cons?.cons?.filter(Boolean).join('、') || '' }))
      const full = journey.journey || journey
      const gallery = (Array.isArray(full.gallery) ? full.gallery : []).map((photo) => ({ ...photo, durationLabel: photo.duration_ms ? `${Math.round(Number(photo.duration_ms) / 1000)} 秒` : '' }))
      this.setData({ journey: full, entries: list, gallery, loading: false })
      api.getJourneyShareLink(this.data.id).then((share) => this.setData({ shareLink: share.link || null })).catch(() => {})
      Promise.all(gallery.map((photo) => {
        if (photo.media_type === 'video' || !photo.photo_id) return Promise.resolve(photo)
        return api.getPhotoThumbnailData(photo.photo_id).then((data) => ({ ...photo, photo_url: data.data_url })).catch(() => photo)
      })).then((withImages) => this.setData({ gallery: withImages }))
      this.updateMarkers(list)
    }).catch((err) => this.setData({ loading: false, error: err.message || '旅记加载失败' }))
  },
  selectEntry(e) {
    const id = String(e.currentTarget.dataset.id)
    if (id !== this.data.activeId) return this.setData({ activeId: id })
    const entry = this.data.entries.find((item) => String(item.id) === id)
    wx.showActionSheet({ itemList: ['编辑记录', '收起'], success: (result) => { if (result.tapIndex === 0) this.editEntry(entry); else this.setData({ activeId: '' }) } })
  },
  editEntry(entry) {
    if (!entry) return
    const moodText = this.moodLabel(entry.mood)
    const weatherText = this.weatherLabel(entry.weather)
    this.setData({ showEditEntry: true, editEntryId: entry.id, editEntryTitle: entry.title || '', editEntryBody: entry.story || entry.body || '', editEntryDate: entry.entry_date || entry.date || '', editEntryTime: entry.entry_time || '', editEntryLocation: entry.location_name || entry.place_name || '', editEntryMood: entry.mood || '', editEntryMoodText: moodText, editEntryWeather: entry.weather || '', editEntryWeatherText: weatherText, editEntryTags: Array.isArray(entry.tags) ? entry.tags.join('，') : '', editEntryPros: entry.pros_cons?.pros?.join('，') || '', editEntryCons: entry.pros_cons?.cons?.join('，') || '' })
  },
  showList() { this.setData({ view: 'list' }) },
  showMap() { this.setData({ view: 'map' }) },
  showGallery() { this.setData({ view: 'gallery' }) },
  openPhotoActions(e) {
    const photo = this.data.gallery[e.currentTarget.dataset.index]
    if (!photo || !photo.id) return
    wx.showActionSheet({ itemList: ['查看媒体', '编辑说明', '删除照片'], success: (result) => {
      if (result.tapIndex === 0) {
        const url = photo.url || photo.photo_url
        if (!url) return wx.showToast({ title: '媒体暂不可预览', icon: 'none' })
        if (photo.media_type === 'video') return wx.previewMedia({ sources: [{ url, type: 'video' }] })
        return wx.previewImage({ current: url, urls: this.data.gallery.map((item) => item.url || item.photo_url).filter(Boolean) })
      }
      if (result.tapIndex === 1) {
        wx.showModal({ title: '编辑照片说明', editable: true, content: photo.caption || '', placeholderText: '例如：抵达京都的第一天', success: (choice) => {
          if (!choice.confirm) return
          api.updateJourneyPhoto(photo.id, { caption: String(choice.content || '').trim() }).then(() => { wx.showToast({ title: '已保存', icon: 'success' }); this.load() }).catch((err) => wx.showToast({ title: err.errMsg || '保存失败', icon: 'none' }))
        } })
        return
      }
      wx.showModal({ title: '删除这张照片？', content: '删除后无法恢复。', success: (choice) => {
        if (!choice.confirm) return
        api.deleteJourneyPhoto(photo.id).then(() => { wx.showToast({ title: '已删除', icon: 'success' }); this.load() }).catch((err) => wx.showToast({ title: err.errMsg || '删除失败', icon: 'none' }))
      } })
    } })
  },
  updateMarkers(entries) {
    const points = entries.filter((entry) => Number.isFinite(Number(entry.lat || entry.latitude)) && Number.isFinite(Number(entry.lng || entry.longitude)))
    const markers = points.map((entry, index) => ({ id: Number(entry.id || index), latitude: Number(entry.lat || entry.latitude), longitude: Number(entry.lng || entry.longitude), width: 30, height: 30, callout: { content: entry.title || '旅记', display: 'ALWAYS', padding: 6, borderRadius: 8 } }))
    const first = points[0]
    this.setData({ markers, mapLatitude: first ? Number(first.lat || first.latitude) : 31.23, mapLongitude: first ? Number(first.lng || first.longitude) : 121.47 })
  },
  openMap() {
    const first = this.data.entries.find((entry) => entry.lat != null || entry.latitude != null)
    wx.navigateTo({ url: first ? `/pages/map/map?lat=${first.lat || first.latitude}&lng=${first.lng || first.longitude}` : '/pages/map/map' })
  },
  openCreate() { this.setData({ showCreate: true, title: '', body: '', entryDate: new Date().toISOString().slice(0, 10), entryTime: '', entryLocation: '', mood: '', moodText: '', weather: '', weatherText: '', tags: '', pros: '', cons: '' }) },
  closeCreate() { this.setData({ showCreate: false }) },
  closeEditEntry() { this.setData({ showEditEntry: false }) },
  inputTitle(e) { this.setData({ title: e.detail.value }) },
  inputBody(e) { this.setData({ body: e.detail.value }) },
  changeEntryTime(e) { this.setData({ entryTime: e.detail.value }) },
  inputEntryLocation(e) { this.setData({ entryLocation: e.detail.value }) },
  inputEntryTags(e) { this.setData({ tags: e.detail.value }) },
  inputEntryPros(e) { this.setData({ pros: e.detail.value }) },
  inputEntryCons(e) { this.setData({ cons: e.detail.value }) },
  inputEditEntryTitle(e) { this.setData({ editEntryTitle: e.detail.value }) },
  inputEditEntryBody(e) { this.setData({ editEntryBody: e.detail.value }) },
  inputEditEntryLocation(e) { this.setData({ editEntryLocation: e.detail.value }) },
  inputEditEntryTags(e) { this.setData({ editEntryTags: e.detail.value }) },
  inputEditEntryPros(e) { this.setData({ editEntryPros: e.detail.value }) },
  inputEditEntryCons(e) { this.setData({ editEntryCons: e.detail.value }) },
  changeEntryDate(e) { this.setData({ entryDate: e.detail.value }) },
  changeEditEntryDate(e) { this.setData({ editEntryDate: e.detail.value }) },
  changeEditEntryTime(e) { this.setData({ editEntryTime: e.detail.value }) },
  chooseMood() {
    const values = ['amazing', 'good', 'neutral', 'rough']
    const labels = ['超棒', '不错', '一般', '有点累']
    wx.showActionSheet({ itemList: labels, success: (result) => this.setData({ mood: values[result.tapIndex], moodText: labels[result.tapIndex] }) })
  },
  chooseWeather() {
    const values = ['sunny', 'partly', 'cloudy', 'rainy', 'stormy', 'cold']
    const labels = ['晴朗', '多云间晴', '阴天', '下雨', '雷雨', '寒冷']
    wx.showActionSheet({ itemList: labels, success: (result) => this.setData({ weather: values[result.tapIndex], weatherText: labels[result.tapIndex] }) })
  },
  chooseEditMood() {
    const values = ['amazing', 'good', 'neutral', 'rough']
    const labels = ['超棒', '不错', '一般', '有点累']
    wx.showActionSheet({ itemList: labels, success: (result) => this.setData({ editEntryMood: values[result.tapIndex], editEntryMoodText: labels[result.tapIndex] }) })
  },
  chooseEditWeather() {
    const values = ['sunny', 'partly', 'cloudy', 'rainy', 'stormy', 'cold']
    const labels = ['晴朗', '多云间晴', '阴天', '下雨', '雷雨', '寒冷']
    wx.showActionSheet({ itemList: labels, success: (result) => this.setData({ editEntryWeather: values[result.tapIndex], editEntryWeatherText: labels[result.tapIndex] }) })
  },
  moodLabel(value) { return ({ amazing: '超棒', good: '不错', neutral: '一般', rough: '有点累' })[value] || '' },
  weatherLabel(value) { return ({ sunny: '晴朗', partly: '多云间晴', cloudy: '阴天', rainy: '下雨', stormy: '雷雨', cold: '寒冷' })[value] || '' },
  submitCreate() {
    const title = (this.data.title || '').trim()
    if (!title) return wx.showToast({ title: '请输入标题', icon: 'none' })
    if (!this.data.entryDate) return wx.showToast({ title: '请选择日期', icon: 'none' })
    const splitLines = (value) => String(value || '').split(/[,，\n]/).map((item) => item.trim()).filter(Boolean)
    api.createJourneyEntry(this.data.id, { title, story: this.data.body || '', body: this.data.body || '', entry_date: this.data.entryDate, entry_time: this.data.entryTime || null, location_name: (this.data.entryLocation || '').trim() || null, mood: this.data.mood || null, weather: this.data.weather || null, tags: splitLines(this.data.tags), pros_cons: { pros: splitLines(this.data.pros), cons: splitLines(this.data.cons) } }).then(() => { this.closeCreate(); this.load() }).catch((err) => wx.showToast({ title: err.message || '保存失败', icon: 'none' }))
  },
  submitEditEntry() {
    const title = String(this.data.editEntryTitle || '').trim()
    if (!title) return wx.showToast({ title: '请输入标题', icon: 'none' })
    if (!this.data.editEntryDate) return wx.showToast({ title: '请选择日期', icon: 'none' })
    const splitLines = (value) => String(value || '').split(/[,，\n]/).map((item) => item.trim()).filter(Boolean)
    api.updateJourneyEntry(this.data.editEntryId, { title, story: this.data.editEntryBody || '', body: this.data.editEntryBody || '', entry_date: this.data.editEntryDate, entry_time: this.data.editEntryTime || null, location_name: String(this.data.editEntryLocation || '').trim() || null, mood: this.data.editEntryMood || null, weather: this.data.editEntryWeather || null, tags: splitLines(this.data.editEntryTags), pros_cons: { pros: splitLines(this.data.editEntryPros), cons: splitLines(this.data.editEntryCons) } }).then(() => { this.closeEditEntry(); wx.showToast({ title: '已保存', icon: 'success' }); this.load() }).catch((err) => wx.showToast({ title: err.errMsg || '保存失败', icon: 'none' }))
  },
  removeEntry(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({ title: '删除这篇记录？', success: (r) => { if (r.confirm) api.deleteJourneyEntry(id).then(() => this.load()) } })
  },
  openActions() {
    const items = ['编辑旅记', '创建/更新公开分享', this.data.journey?.hide_skeletons ? '显示骨架记录' : '隐藏骨架记录', ...(this.data.shareLink ? ['复制分享令牌', '关闭公开分享'] : [])]
    wx.showActionSheet({ itemList: items, success: (result) => {
      if (result.tapIndex === 0) return this.openSettings()
      if (result.tapIndex === 1) {
        return api.createJourneyShareLink(this.data.id, { share_timeline: true, share_gallery: true, share_map: true }).then((share) => {
          this.setData({ shareLink: share });
          wx.setClipboardData({ data: share.token, success: () => wx.showToast({ title: '已创建并复制令牌', icon: 'success' }) })
        }).catch((err) => wx.showToast({ title: err.errMsg || '创建分享失败', icon: 'none' }))
      }
      if (result.tapIndex === 2) {
        const hide = !this.data.journey?.hide_skeletons
        return api.updateJourneyPreferences(this.data.id, { hide_skeletons: hide }).then(() => { this.setData({ 'journey.hide_skeletons': hide }); wx.showToast({ title: hide ? '已隐藏骨架记录' : '已显示骨架记录', icon: 'success' }) }).catch((err) => wx.showToast({ title: err.errMsg || '设置保存失败', icon: 'none' }))
      }
      if (this.data.shareLink && result.tapIndex === 3) return wx.setClipboardData({ data: this.data.shareLink.token, success: () => wx.showToast({ title: '已复制令牌', icon: 'success' }) })
      wx.showModal({ title: '关闭公开分享？', content: '关闭后，之前的公开链接将不能继续访问。', success: (choice) => {
        if (!choice.confirm) return
        api.deleteJourneyShareLink(this.data.id).then(() => { this.setData({ shareLink: null }); wx.showToast({ title: '已关闭分享', icon: 'success' }) }).catch((err) => wx.showToast({ title: err.errMsg || '关闭失败', icon: 'none' }))
      } })
    } })
  },
  openSettings() {
    const linked = Array.isArray(this.data.journey?.trips) ? this.data.journey.trips.map((trip) => Number(trip.id)) : []
    this.setData({ showSettings: true, editTitle: this.data.journey?.title || '', editSubtitle: this.data.journey?.subtitle || '', showTripTracks: !!this.data.journey?.show_trip_tracks, availableTrips: [], selectedTripIds: linked })
    api.listJourneyAvailableTrips().then((data) => { const trips = Array.isArray(data) ? data : data.trips || []; this.setData({ availableTrips: trips.map((trip) => ({ ...trip, id: Number(trip.id) })) }) }).catch(() => {})
  },
  closeSettings() { this.setData({ showSettings: false }) },
  inputEditTitle(e) { this.setData({ editTitle: e.detail.value }) },
  inputEditSubtitle(e) { this.setData({ editSubtitle: e.detail.value }) },
  toggleJourneyTrip(e) {
    const tripId = Number(e.currentTarget.dataset.id)
    const selectedTripIds = this.data.selectedTripIds.includes(tripId) ? this.data.selectedTripIds.filter((id) => id !== tripId) : this.data.selectedTripIds.concat(tripId)
    this.setData({ selectedTripIds })
  },
  toggleJourneyTracks(e) { this.setData({ showTripTracks: !!e.detail.value }) },
  saveSettings() {
    const title = (this.data.editTitle || '').trim()
    if (!title) return wx.showToast({ title: '请输入旅记标题', icon: 'none' })
    const currentIds = Array.isArray(this.data.journey?.trips) ? this.data.journey.trips.map((trip) => Number(trip.id)) : []
    const nextIds = this.data.selectedTripIds
    const added = nextIds.filter((tripId) => !currentIds.includes(tripId))
    const removed = currentIds.filter((tripId) => !nextIds.includes(tripId))
    api.updateJourney(this.data.id, { title, subtitle: (this.data.editSubtitle || '').trim(), show_trip_tracks: this.data.showTripTracks }).then(() => Promise.all([
      ...added.map((tripId) => api.addJourneyTrip(this.data.id, tripId)),
      ...removed.map((tripId) => api.removeJourneyTrip(this.data.id, tripId)),
    ])).then(() => {
      this.setData({ showSettings: false, 'journey.title': title, 'journey.subtitle': (this.data.editSubtitle || '').trim(), 'journey.show_trip_tracks': this.data.showTripTracks })
      wx.showToast({ title: '已保存', icon: 'success' })
    }).catch((err) => wx.showToast({ title: err.errMsg || err.message || '保存失败', icon: 'none' }))
  },
  openUpload() {
    if (this.data.uploading) return
    wx.chooseMedia({ count: 9, mediaType: ['image', 'video'], sourceType: ['album', 'camera'], success: async (result) => {
      const files = result.tempFiles || []
      if (!files.length) return
      const oversized = files.find((file) => Number(file.size || 0) > (file.fileType === 'video' ? 100 : 10) * 1024 * 1024)
      if (oversized) return wx.showToast({ title: oversized.fileType === 'video' ? '单个视频不能超过 100MB' : '单张图片不能超过 10MB', icon: 'none' })
      this.setData({ uploading: true })
      try {
        for (const file of files) await (file.fileType === 'video' ? this.uploadVideoFile(file) : this.uploadPhotoFile(file))
        wx.showToast({ title: '媒体已上传', icon: 'success' })
        this.load()
      } catch (error) {
        wx.showToast({ title: error.errMsg || error.message || '上传失败', icon: 'none' })
      } finally {
        this.setData({ uploading: false })
      }
    } })
  },
  uploadPhotoFile(file) {
    const fs = wx.getFileSystemManager()
    const chunkSize = 48 * 1024
    const totalParts = Math.max(1, Math.ceil(Number(file.size || 0) / chunkSize))
    const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
    const readChunk = (position, length) => new Promise((resolve, reject) => fs.readFile({ filePath: file.tempFilePath, position, length, encoding: 'base64', success: (res) => resolve(res.data), fail: reject }))
    return (async () => {
      for (let partIndex = 0; partIndex < totalParts; partIndex += 1) {
        const position = partIndex * chunkSize
        const data = await readChunk(position, Math.min(chunkSize, Number(file.size || 0) - position))
        await api.uploadJourneyPhotoChunk(this.data.id, { upload_id: uploadId, part_index: partIndex, total_parts: totalParts, filename: file.tempFilePath || 'photo.jpg', mime_type: file.fileType ? `image/${file.fileType}` : 'image/jpeg', data })
      }
    })()
  },
  uploadVideoFile(file) {
    const fs = wx.getFileSystemManager()
    const chunkSize = 48 * 1024
    const totalParts = Math.max(1, Math.ceil(Number(file.size || 0) / chunkSize))
    const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
    const extension = String(file.tempFilePath || '').split('.').pop().toLowerCase()
    const ext = ['mp4', 'm4v', 'webm', 'mov'].includes(extension) ? extension : 'mp4'
    const readChunk = (position, length) => new Promise((resolve, reject) => fs.readFile({ filePath: file.tempFilePath, position, length, encoding: 'base64', success: (res) => resolve(res.data), fail: reject }))
    return (async () => {
      for (let partIndex = 0; partIndex < totalParts; partIndex += 1) {
        const position = partIndex * chunkSize
        const data = await readChunk(position, Math.min(chunkSize, Number(file.size || 0) - position))
        await api.uploadJourneyVideoChunk(this.data.id, { upload_id: uploadId, part_index: partIndex, total_parts: totalParts, filename: `journey.${ext}`, mime_type: `video/${ext === 'm4v' ? 'mp4' : ext}`, duration_ms: Number(file.duration || 0) * 1000, data })
      }
    })()
  },
  noop() {},
  openCalendar() { wx.navigateTo({ url: '/pages/vacay/vacay' }) },
  openAtlas() { wx.navigateTo({ url: '/pages/atlas/atlas' }) },
  openMore() { wx.navigateTo({ url: '/pages/tools/tools' }) },
  back() { wx.navigateBack({ delta: 1 }) },
})
