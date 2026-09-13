import api from './client'

export const announcementApi = {
  listAnnouncements: (params = {}) => api.get('/announcements', { params }),
  
  getUnreadCount: () => api.get('/announcements/unread-count'),

  getCandidates: () => api.get('/announcements/candidates'),

  createAnnouncement: (data) => api.post('/announcements', data),

  getAnnouncementDetail: (id) => api.get(`/announcements/${id}`),

  updateAnnouncement: (id, data) => api.patch(`/announcements/${id}`, data),

  deleteAnnouncement: (id) => api.delete(`/announcements/${id}`),

  publishAnnouncement: (id) => api.post(`/announcements/${id}/publish`),

  markAnnouncementRead: (id) => api.post(`/announcements/${id}/read`),

  acknowledgeAnnouncement: (id) => api.post(`/announcements/${id}/acknowledge`),

  getAnnouncementAnalytics: (id) => api.get(`/announcements/${id}/analytics`),

  getConversationMessages: (announcementId) => api.get(`/announcements/${announcementId}/messages`),

  postMessage: (announcementId, data) => api.post(`/announcements/${announcementId}/messages`, data),

  deleteMessage: (messageId) => api.delete(`/announcements/messages/${messageId}`),

  togglePinMessage: (messageId) => api.post(`/announcements/messages/${messageId}/pin`),

  toggleReaction: (messageId, reaction) => api.post(`/announcements/messages/${messageId}/reactions`, { reaction }),

  presignAttachmentUpload: (data) => api.post('/announcements/attachments/presign', data),

  uploadAttachmentStream: async (uploadUrl, file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    // Strip leading '/api' if present since api axios instance already has baseURL = '/api'
    const endpoint = uploadUrl.startsWith('/api/') ? uploadUrl.slice(4) : uploadUrl
    return api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
    })
  },
}

export default announcementApi
