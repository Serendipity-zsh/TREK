const app = getApp()

function call(path, method = 'GET', data) {
  const header = {
    'X-WX-SERVICE': app.globalData.service,
  }
  if (app.globalData.token) header.Authorization = `Bearer ${app.globalData.token}`

  return wx.cloud.callContainer({
    config: { env: app.globalData.envId },
    path,
    header,
    method,
    ...(data === undefined ? {} : { data }),
  }).then((res) => res.data)
}

function login() {
  return call('/api/auth/wechat-login', 'POST', {}).then((data) => {
    app.globalData.token = data.token
    app.globalData.user = data.user
    wx.setStorageSync('trek_token', data.token)
    wx.setStorageSync('trek_user', data.user)
    return data
  })
}
function demoLogin() {
  return call('/api/auth/demo-login', 'POST', {}).then((data) => {
    app.globalData.token = data.token
    app.globalData.user = data.user
    wx.setStorageSync('trek_token', data.token)
    wx.setStorageSync('trek_user', data.user)
    return data
  })
}

function amapSearch(query, city) {
  return call('/api/maps/amap/search', 'POST', { query, city })
}

function amapReverse(lat, lng) {
  return call(`/api/maps/amap/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`)
}
function amapRoute(origin, destination, mode) { return call('/api/maps/amap/route', 'POST', { origin, destination, mode }) }

function getTrip(id) { return call(`/api/trips/${id}`) }
function createTrip(payload) { return call('/api/trips', 'POST', payload) }
function updateTrip(id, payload) { return call(`/api/trips/${id}`, 'PUT', payload) }
function deleteTrip(id) { return call(`/api/trips/${id}`, 'DELETE') }
function listDays(tripId) { return call(`/api/trips/${tripId}/days`) }
function createDay(tripId, payload) { return call(`/api/trips/${tripId}/days`, 'POST', payload || {}) }
function deleteDay(tripId, dayId) { return call(`/api/trips/${tripId}/days/${dayId}`, 'DELETE') }
function listPlaces(tripId) { return call(`/api/trips/${tripId}/places`) }
function createPlace(tripId, payload) { return call(`/api/trips/${tripId}/places`, 'POST', payload) }
function createAssignment(tripId, dayId, payload) { return call(`/api/trips/${tripId}/days/${dayId}/assignments`, 'POST', payload) }
function listTodo(tripId) { return call(`/api/trips/${tripId}/todo`) }
function createTodo(tripId, payload) { return call(`/api/trips/${tripId}/todo`, 'POST', payload) }
function updateTodo(tripId, id, payload) { return call(`/api/trips/${tripId}/todo/${id}`, 'PUT', payload) }
function deleteTodo(tripId, id) { return call(`/api/trips/${tripId}/todo/${id}`, 'DELETE') }
function listPacking(tripId) { return call(`/api/trips/${tripId}/packing`) }
function createPacking(tripId, payload) { return call(`/api/trips/${tripId}/packing`, 'POST', payload) }
function updatePacking(tripId, id, payload) { return call(`/api/trips/${tripId}/packing/${id}`, 'PUT', payload) }
function deletePacking(tripId, id) { return call(`/api/trips/${tripId}/packing/${id}`, 'DELETE') }
function listBudget(tripId) { return call(`/api/trips/${tripId}/budget`) }
function createBudget(tripId, payload) { return call(`/api/trips/${tripId}/budget`, 'POST', payload) }
function listReservations(tripId) { return call(`/api/trips/${tripId}/reservations`) }
function createReservation(tripId, payload) { return call(`/api/trips/${tripId}/reservations`, 'POST', payload) }
function deleteReservation(tripId, id) { return call(`/api/trips/${tripId}/reservations/${id}`, 'DELETE') }
function getWeather(lat, lng, date) { return call(`/api/weather?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}${date ? `&date=${encodeURIComponent(date)}` : ''}&lang=zh`) }
function listNotifications(unreadOnly) { return call(`/api/notifications/in-app?limit=50${unreadOnly ? '&unread_only=true' : ''}`) }
function markAllNotificationsRead() { return call('/api/notifications/in-app/read-all', 'PUT') }
function deleteAllNotifications() { return call('/api/notifications/in-app/all', 'DELETE') }
function markNotificationRead(id) { return call(`/api/notifications/in-app/${id}/read`, 'PUT') }
function deleteNotification(id) { return call(`/api/notifications/in-app/${id}`, 'DELETE') }
function listJourneys() { return call('/api/journeys') }
function createJourney(payload) { return call('/api/journeys', 'POST', payload) }
function getJourney(id) { return call(`/api/journeys/${id}`) }
function listJourneyEntries(id) { return call(`/api/journeys/${id}/entries`) }
function createJourneyEntry(id, payload) { return call(`/api/journeys/${id}/entries`, 'POST', payload) }
function deleteJourneyEntry(id) { return call(`/api/journeys/entries/${id}`, 'DELETE') }
function listCollections() { return call('/api/addons/collections') }
function getCollection(id) { return call(`/api/addons/collections/${id}`) }
function getAtlasStats() { return call('/api/addons/atlas/stats') }
function getAtlasBucketList() { return call('/api/addons/atlas/bucket-list') }
function getVacayPlan() { return call('/api/addons/vacay/plan') }
function getVacayStats(year) { return call(`/api/addons/vacay/stats/${year}`) }

module.exports = { call, login, demoLogin, amapSearch, amapReverse, amapRoute, getWeather, getTrip, createTrip, updateTrip, deleteTrip, listDays, createDay, deleteDay, listPlaces, createPlace, createAssignment, listTodo, createTodo, updateTodo, deleteTodo, listPacking, createPacking, updatePacking, deletePacking, listBudget, createBudget, listReservations, createReservation, deleteReservation, listNotifications, markAllNotificationsRead, deleteAllNotifications, markNotificationRead, deleteNotification, listJourneys, createJourney, getJourney, listJourneyEntries, createJourneyEntry, deleteJourneyEntry, listCollections, getCollection, getAtlasStats, getAtlasBucketList, getVacayPlan, getVacayStats }
