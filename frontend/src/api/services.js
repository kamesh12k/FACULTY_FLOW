import api from './client'

export const publicSettingsApi = {
  get: () => api.get('/settings/public'),
}

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
}

export const adminApi = {
  firstLoginSetup: (data) => api.post('/admin/first-login/setup', data),
  listSecondaryAdmins: () => api.get('/admin/secondary-admins'),
  createSecondaryAdmin: (data) => api.post('/admin/secondary-admins', data),
  enableAdmin: (id) => api.patch(`/admin/secondary-admins/${id}/enable`),
  disableAdmin: (id) => api.patch(`/admin/secondary-admins/${id}/disable`),
  auditLogs: () => api.get('/admin/audit-logs'),
  factoryReset: (data) => api.post('/admin/factory-reset', data),
  clearCreditsHistory: () => api.post('/admin/clear-credits-history'),
  clearLeavesHistory: () => api.post('/admin/clear-leaves-history'),
  createDepartmentAdmin: (deptId, data) => api.post(`/departments/${deptId}/admin`, data),
  createPrincipal: (data) => api.post('/admin/principal', data),
  listGlobalUsers: () => api.get('/admin/global-users'),
  deleteGlobalUser: (id) => api.delete(`/admin/global-users/${id}`),
  getSystemMetrics: () => api.get('/admin/system-metrics'),
  clearTrafficLogs: () => api.post('/admin/system-metrics/clear-traffic'),
  masterExport: () => api.get('/admin/master-export', { responseType: 'blob' }),
}

export const teachersApi = {
  list: (includeCrossDepartment = false) => api.get('/teachers/', { params: { include_cross_department: includeCrossDepartment } }),
  create: (data) => api.post('/teachers/', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  me: () => api.get('/teachers/me'),
  credits: (id) => api.get(`/teachers/${id}/credits`),
  remove: (id) => api.delete(`/teachers/${id}`),
}

export const timetableApi = {
  getByTeacher: (teacherId) => api.get(`/timetable/teacher/${teacherId}`),
  getByClass: (classId) => api.get(`/timetable/class/${classId}`),
  createSlot: (data) => api.post('/timetable/slot', data),
  upload: (slots) => api.post('/timetable/', { slots }),
  deleteSlot: (id) => api.delete(`/timetable/${id}`),
  clearTeacherTimetable: (teacherId) => api.delete(`/timetable/teacher/${teacherId}`),
  submitMyEntry: (data) => api.post('/timetable/submissions', data),
  mySubmissions: () => api.get('/timetable/submissions/my'),
  pendingSubmissions: () => api.get('/timetable/submissions/pending'),
  reviewSubmission: (id, data) => api.post(`/timetable/submissions/${id}/review`, data),
  bulkReviewSubmissions: (submissionIds, approved) => api.post('/timetable/submissions/bulk-review', { submission_ids: submissionIds, approved }),
  cancelSubmission: (id) => api.delete(`/timetable/submissions/${id}`),


  /**
   * Import timetable from an Excel file via the admin import endpoint.
   * @param {File} file  - The .xlsx file to upload
   * @param {Function} onUploadProgress - axios progress callback
   */
  importExcel: (file, onUploadProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/admin/timetable/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
  },
  previewImportExcel: (file, onUploadProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/admin/timetable/import/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
  },
  commitImportExcel: (slots, semesterForNewClasses = null) => {
    return api.post('/admin/timetable/import/commit', {
      slots,
      semester_for_new_classes: semesterForNewClasses
    })
  },
  previewImportJson: (payload) => {
    return api.post('/admin/timetable/import/json/preview', payload)
  },
  getJsonPromptTemplate: () => {
    return api.get('/admin/timetable/import/json/prompt-template')
  },
}

export const departmentsApi = {
  list: (includeGlobal = false) => api.get('/departments/', { params: { include_global: includeGlobal } }),
  create: (data) => api.post('/departments/', data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
  remove: (id) => api.delete(`/departments/${id}`),
}

export const subjectsApi = {
  list: (includeArchived = false, includeCrossDepartment = false) => api.get('/subjects/', { params: { include_archived: includeArchived, include_cross_department: includeCrossDepartment } }),
  create: (data) => api.post('/subjects/', data),
  update: (id, data) => api.patch(`/subjects/${id}`, data),
  archive: (id) => api.patch(`/subjects/${id}/archive`),
  unarchive: (id) => api.patch(`/subjects/${id}/unarchive`),
}

export const classesApi = {
  list: () => api.get('/classes/'),
  create: (data) => api.post('/classes/', data),
  update: (id, data) => api.patch(`/classes/${id}`, data),
  remove: (id) => api.delete(`/classes/${id}`),
  directory: () => api.get('/classes/directory'),
  faculty: (id) => api.get(`/classes/${id}/faculty`),
}

export const roomsApi = {
  list: (roomType) => api.get('/rooms/', { params: roomType ? { room_type: roomType } : {} }),
  create: (data) => api.post('/rooms/', data),
  update: (id, data) => api.patch(`/rooms/${id}`, data),
  remove: (id) => api.delete(`/rooms/${id}`),
  availabilityDashboard: (dayOrder, periodNumber) =>
    api.get('/rooms/availability/dashboard', { params: { day_order: dayOrder, period_number: periodNumber } }),
  checkAvailability: (roomId, dayOrder, periodNumber) =>
    api.get(`/rooms/${roomId}/check-availability`, { params: { day_order: dayOrder, period_number: periodNumber } }),
}

export const dayOrderApi = {
  getRange: (start, end) => api.get('/day-order-calendar/', { params: { start, end } }),
  bulkSet: (entries) => api.post('/day-order-calendar/bulk-set', entries),
  resolve: (params) => api.get('/day-order-calendar/resolve', { params }), // { date }
}

// New: Academic Calendar & Holiday Management
export const academicCalendarApi = {
  // Academic years
  listAcademicYears: () => api.get('/academic-calendar/academic-years'),
  createAcademicYear: (data) => api.post('/academic-calendar/academic-years', data),

  // Semesters
  listSemesters: (academicYearId) => api.get('/academic-calendar/semesters', { params: academicYearId ? { academic_year_id: academicYearId } : {} }),
  createSemester: (data) => api.post('/academic-calendar/semesters', data),

  // Calendar days (holidays + day order)
  getRange: (start, end) => api.get('/academic-calendar/days', { params: { start, end } }),
  getDay: (date) => api.get(`/academic-calendar/days/${date}`),
  markDay: (data) => api.post('/academic-calendar/days/mark', data),
  bulkMarkDays: (data) => api.post('/academic-calendar/days/bulk-mark', data),
  assignDayOrder: (data) => api.post('/academic-calendar/days/day-order/assign', data),
  skipDayOrder: (data) => api.post('/academic-calendar/days/day-order/skip', data),
  clearOverride: (date) => api.delete(`/academic-calendar/days/${date}/override`),
  deleteDay: (date) => api.delete(`/academic-calendar/days/${date}`),

  // Resolve
  resolve: (date) => api.get('/academic-calendar/resolve', { params: { date } }),

  // Reports
  workingDayReport: (start, end) => api.get('/academic-calendar/reports/working-days', { params: { start, end } }),
  holidayReport: (start, end) => api.get('/academic-calendar/reports/holidays', { params: { start, end } }),
  dayOrderReport: (start, end) => api.get('/academic-calendar/reports/day-orders', { params: { start, end } }),
  facultyWorkloadReport: () => api.get('/academic-calendar/reports/faculty-workload'),

  // Today / Home summary
  todaySummary: (date) => api.get('/academic-calendar/today-summary', { params: date ? { date } : {} }),
  myTodaySummary: (date) => api.get('/academic-calendar/my-today-summary', { params: date ? { date } : {} }),
}

export const leavesApi = {
  apply: (data) => api.post('/leaves/', data),
  applyBatch: (data) => api.post('/leaves/batch', data),
  myLeaves: () => api.get('/leaves/my'),
  all: () => api.get('/leaves/'),
  approve: (id) => api.patch(`/leaves/${id}/approve`),
  reject: (id) => api.patch(`/leaves/${id}/reject`),
  bulkApprove: (leaveIds) => api.post('/leaves/bulk-approve', { leave_ids: leaveIds }),
  bulkReject: (leaveIds) => api.post('/leaves/bulk-reject', { leave_ids: leaveIds }),
  assignSubstitute: (id, substituteId, filters = {}) => api.post(`/leaves/${id}/assign`, { substitute_teacher_id: substituteId }, { params: filters }),
  freeTeachers: (id, filters = {}) => api.get(`/leaves/${id}/free-teachers`, { params: filters }),
  // Autonomous Substitution Engine
  recommendations: (id, limit = 5, filters = {}) => api.get(`/leaves/${id}/recommendations`, { params: { limit, ...filters } }),
  assignRecommended: (id, substituteId, filters = {}) => api.post(`/leaves/${id}/assign-recommended`, { substitute_teacher_id: substituteId }, { params: filters }),
  overrideSubstitute: (id, newSubstituteId, filters = {}) => api.post(`/leaves/${id}/override`, { new_substitute_teacher_id: newSubstituteId }, { params: filters }),
  undoAssignment: (id) => api.post(`/leaves/${id}/undo-assignment`),
  setLock: (id, locked) => api.post(`/leaves/${id}/lock`, { locked }),
  cancel: (id) => api.post(`/leaves/${id}/cancel`),
  adminCancel: (id, reason) => api.post(`/leaves/${id}/admin-cancel`, { reason }),
  cancelImpact: (id) => api.get(`/leaves/${id}/cancel-impact`),
  adminCreate: (data) => api.post('/leaves/admin-create', data),
}

export const campusOperationsApi = {
  getMode: () => api.get('/campus-operations/mode'),
  setMode: (data) => api.put('/campus-operations/mode', data),
  myPreferences: () => api.get('/campus-operations/preferences/me'),
  updateMyPreferences: (data) => api.put('/campus-operations/preferences/me', data),
  teacherPreferences: (teacherId) => api.get(`/campus-operations/preferences/${teacherId}`),
  updateTeacherPreferences: (teacherId, data) => api.put(`/campus-operations/preferences/${teacherId}`, data),
  bulkUpdateTeacherPreferences: (data) => api.put('/campus-operations/preferences/bulk-override', data),
  getSystemAnalytics: () => api.get('/campus-operations/system-analytics'),
  runDryRun: (data) => api.post('/campus-operations/dry-run', data),
  bulkConfigure: (data) => api.post('/campus-operations/bulk-config', data),
  getCrossDepartmentSubstitutions: () => api.get('/campus-operations/cross-department-substitutions'),
  setCrossDepartmentSubstitutions: (enabled) => api.put('/campus-operations/cross-department-substitutions', null, { params: { enabled } }),
}

export const notificationsApi = {
  list: (unreadOnly = false) => api.get('/notifications/', { params: { unread_only: unreadOnly } }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  vapidPublicKey: () => api.get('/notifications/vapid-public-key'),
  subscribe: (subscription) => api.post('/notifications/subscribe', subscription),
}

export const creditsApi = {
  myTransactions: () => api.get('/credits/my/transactions'),
  allTransactions: () => api.get('/credits/transactions'),
  report: () => api.get('/credits/report'),
  adjust: (data) => api.post('/credits/adjust', data), // data: { teacher_id, change, reason, category? }
}

export const teacherSubstitutionApi = {
  enabled: () => api.get('/teacher/substitution/enabled'),
  myLeaves: () => api.get('/teacher/substitution/my-leaves'),
  candidates: (leaveId) => api.get(`/teacher/substitution/leave/${leaveId}/candidates`),
  assign: (leaveId, substituteId) => api.post(`/teacher/substitution/leave/${leaveId}/assign/${substituteId}`),
  override: (leaveId, substituteId) => api.put(`/teacher/substitution/leave/${leaveId}/override/${substituteId}`),
  clearAllAssignments: () => api.delete('/teacher/substitution/clear-all-assignments'),
  resetPreferences: () => api.delete('/teacher/substitution/reset-preferences'),
}

export const teachersModeApi = {
  getConfig: () => api.get('/teacher/substitution/config'),
  updateConfig: (data) => api.put('/teacher/substitution/config', data),
}

export const substitutionsApi = {
  getToday: (dateStr) => api.get('/substitutions/today', { params: dateStr ? { date: dateStr } : {} }),
}
