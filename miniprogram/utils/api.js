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
function listTrips(archived) { return call(`/api/trips${archived ? '?archived=1' : ''}`) }
function copyCollectionPlacesToTrip(payload) { return call('/api/addons/collections/copy-to-trip', 'POST', payload) }
function createTrip(payload) { return call('/api/trips', 'POST', payload) }
function updateTrip(id, payload) { return call(`/api/trips/${id}`, 'PUT', payload) }
function deleteTrip(id) { return call(`/api/trips/${id}`, 'DELETE') }
function listDays(tripId) { return call(`/api/trips/${tripId}/days`) }
function createDay(tripId, payload) { return call(`/api/trips/${tripId}/days`, 'POST', payload || {}) }
function deleteDay(tripId, dayId) { return call(`/api/trips/${tripId}/days/${dayId}`, 'DELETE') }
function listPlaces(tripId) { return call(`/api/trips/${tripId}/places`) }
function createPlace(tripId, payload) { return call(`/api/trips/${tripId}/places`, 'POST', payload) }
function createAssignment(tripId, dayId, payload) { return call(`/api/trips/${tripId}/days/${dayId}/assignments`, 'POST', payload) }
function deleteAssignment(tripId, dayId, assignmentId) { return call(`/api/trips/${tripId}/days/${dayId}/assignments/${assignmentId}`, 'DELETE') }
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
function listTripFiles(tripId) { return call(`/api/trips/${tripId}/files`) }
function toggleTripFileStar(tripId, fileId) { return call(`/api/trips/${tripId}/files/${fileId}/star`, 'PATCH') }
function deleteTripFile(tripId, fileId) { return call(`/api/trips/${tripId}/files/${fileId}`, 'DELETE') }
function listCollabNotes(tripId) { return call(`/api/trips/${tripId}/collab/notes`) }
function createCollabNote(tripId, payload) { return call(`/api/trips/${tripId}/collab/notes`, 'POST', payload) }
function deleteCollabNote(tripId, id) { return call(`/api/trips/${tripId}/collab/notes/${id}`, 'DELETE') }
function getWeather(lat, lng, date) { return call(`/api/weather?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}${date ? `&date=${encodeURIComponent(date)}` : ''}&lang=zh`) }
function listNotifications(unreadOnly) { return call(`/api/notifications/in-app?limit=50${unreadOnly ? '&unread_only=true' : ''}`) }
function markAllNotificationsRead() { return call('/api/notifications/in-app/read-all', 'PUT') }
function deleteAllNotifications() { return call('/api/notifications/in-app/all', 'DELETE') }
function markNotificationRead(id) { return call(`/api/notifications/in-app/${id}/read`, 'PUT') }
function deleteNotification(id) { return call(`/api/notifications/in-app/${id}`, 'DELETE') }
function listJourneys() { return call('/api/journeys') }
function createJourney(payload) { return call('/api/journeys', 'POST', payload) }
function getJourney(id) { return call(`/api/journeys/${id}`) }
function getJourneyShareLink(id) { return call(`/api/journeys/${id}/share-link`) }
function createJourneyShareLink(id, payload) { return call(`/api/journeys/${id}/share-link`, 'POST', payload) }
function deleteJourneyShareLink(id) { return call(`/api/journeys/${id}/share-link`, 'DELETE') }
function updateJourneyPreferences(id, payload) { return call(`/api/journeys/${id}/preferences`, 'PATCH', payload) }
function listJourneyEntries(id) { return call(`/api/journeys/${id}/entries`) }
function createJourneyEntry(id, payload) { return call(`/api/journeys/${id}/entries`, 'POST', payload) }
function deleteJourneyEntry(id) { return call(`/api/journeys/entries/${id}`, 'DELETE') }
function getPhotoThumbnailData(id) { return call(`/api/photos/${id}/thumbnail-data`) }
function listCollections() { return call('/api/addons/collections') }
function createCollection(payload) { return call('/api/addons/collections', 'POST', payload) }
function getCollection(id) { return call(`/api/addons/collections/${id}`) }
function updateCollection(id, payload) { return call(`/api/addons/collections/${id}`, 'PATCH', payload) }
function deleteCollection(id) { return call(`/api/addons/collections/${id}`, 'DELETE') }
function saveCollectionPlace(payload) { return call('/api/addons/collections/places', 'POST', payload) }
function deleteCollectionPlace(id) { return call(`/api/addons/collections/places/${id}`, 'DELETE') }
function setCollectionPlaceStatus(id, status) { return call(`/api/addons/collections/places/${id}/status`, 'POST', { status }) }
function createCollectionLabel(payload) { return call('/api/addons/collections/labels', 'POST', payload) }
function updateCollectionLabel(id, payload) { return call(`/api/addons/collections/labels/${id}`, 'PATCH', payload) }
function deleteCollectionLabel(id) { return call(`/api/addons/collections/labels/${id}`, 'DELETE') }
function assignCollectionLabels(labelIds, placeIds) { return call('/api/addons/collections/labels/assign', 'POST', { label_ids: labelIds, place_ids: placeIds }) }
function unassignCollectionLabels(labelIds, placeIds) { return call('/api/addons/collections/labels/unassign', 'POST', { label_ids: labelIds, place_ids: placeIds }) }
function getCollectionAvailableUsers(id) { return call(`/api/addons/collections/${id}/available-users`) }
function inviteCollectionUser(collectionId, userId, role = 'viewer') { return call('/api/addons/collections/invite', 'POST', { collection_id: Number(collectionId), user_id: Number(userId), role }) }
function getAtlasStats() { return call('/api/addons/atlas/stats') }
function getAtlasRegions() { return call('/api/addons/atlas/regions') }
function getAtlasRegionGeo(countries) {
  const list = Array.isArray(countries) ? countries.filter(Boolean) : []
  return call(`/api/addons/atlas/regions/geo?countries=${encodeURIComponent(list.join(','))}`)
}
function getAtlasLocate(lat, lng) { return call(`/api/addons/atlas/locate?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`) }
function getAtlasCountry(code) { return call(`/api/addons/atlas/country/${encodeURIComponent(code)}`) }
function markAtlasCountry(code) { return call(`/api/addons/atlas/country/${encodeURIComponent(code)}/mark`, 'POST') }
function unmarkAtlasCountry(code) { return call(`/api/addons/atlas/country/${encodeURIComponent(code)}/mark`, 'DELETE') }
function getAtlasBucketList() { return call('/api/addons/atlas/bucket-list') }
function createAtlasBucketItem(payload) { return call('/api/addons/atlas/bucket-list', 'POST', payload) }
function deleteAtlasBucketItem(id) { return call(`/api/addons/atlas/bucket-list/${id}`, 'DELETE') }
function getVacayPlan() { return call('/api/addons/vacay/plan') }
function updateVacayPlan(payload) { return call('/api/addons/vacay/plan', 'PUT', payload) }
function getVacayStats(year) { return call(`/api/addons/vacay/stats/${year}`) }
function getVacayEntries(year) { return call(`/api/addons/vacay/entries/${year}`) }
function toggleVacayEntry(payload) { return call('/api/addons/vacay/entries/toggle', 'POST', payload) }
function toggleCompanyHoliday(payload) { return call('/api/addons/vacay/entries/company-holiday', 'POST', payload) }
function updateVacayStats(year, payload) { return call(`/api/addons/vacay/stats/${year}`, 'PUT', payload) }
function getVacayAvailableUsers() { return call('/api/addons/vacay/available-users') }
function inviteVacayUser(userId) { return call('/api/addons/vacay/invite', 'POST', { user_id: userId }) }
function getVacayShares() { return call('/api/addons/vacay/shares') }
function getVacayShareUsers() { return call('/api/addons/vacay/shares/available-users') }
function shareVacayCalendar(userId) { return call('/api/addons/vacay/shares', 'POST', { user_id: userId }) }
function updateVacayShare(id, hidden) { return call(`/api/addons/vacay/shares/${id}`, 'PUT', { hidden }) }
function deleteVacayShare(id) { return call(`/api/addons/vacay/shares/${id}`, 'DELETE') }
function getAdminStats() { return call('/api/admin/stats') }
function listAdminUsers() { return call('/api/admin/users') }

module.exports = { call, login, demoLogin, amapSearch, amapReverse, amapRoute, getWeather, getTrip, listTrips, copyCollectionPlacesToTrip, createTrip, updateTrip, deleteTrip, listDays, createDay, deleteDay, listPlaces, createPlace, createAssignment, deleteAssignment, listTodo, createTodo, updateTodo, deleteTodo, listPacking, createPacking, updatePacking, deletePacking, listBudget, createBudget, listReservations, createReservation, deleteReservation, listTripFiles, toggleTripFileStar, deleteTripFile, listCollabNotes, createCollabNote, deleteCollabNote, listNotifications, markAllNotificationsRead, deleteAllNotifications, markNotificationRead, deleteNotification, listJourneys, createJourney, getJourney, getJourneyShareLink, createJourneyShareLink, deleteJourneyShareLink, updateJourneyPreferences, listJourneyEntries, createJourneyEntry, deleteJourneyEntry, getPhotoThumbnailData, listCollections, createCollection, getCollection, updateCollection, deleteCollection, saveCollectionPlace, deleteCollectionPlace, setCollectionPlaceStatus, createCollectionLabel, updateCollectionLabel, deleteCollectionLabel, assignCollectionLabels, unassignCollectionLabels, getCollectionAvailableUsers, inviteCollectionUser, getAtlasStats, getAtlasRegions, getAtlasRegionGeo, getAtlasLocate, getAtlasCountry, markAtlasCountry, unmarkAtlasCountry, getAtlasBucketList, createAtlasBucketItem, deleteAtlasBucketItem, getVacayPlan, updateVacayPlan, getVacayStats, getVacayEntries, toggleVacayEntry, toggleCompanyHoliday, updateVacayStats, getVacayAvailableUsers, inviteVacayUser, getVacayShares, getVacayShareUsers, shareVacayCalendar, updateVacayShare, deleteVacayShare, getAdminStats, listAdminUsers }
