import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${PUBLIC_API_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Public API error: ${res.status}`);
  return res.json();
}


export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || '15000', 10),
});

const ACCESS_COOKIE_EXP_DAYS = 8 / 24;
const REFRESH_COOKIE_EXP_DAYS = 30;

const COOKIE_OPTIONS = {
  sameSite: 'strict' as const,
  secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
};

let refreshPromise: Promise<any> | null = null;

export function clearAuthStorage() {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  Cookies.remove('user');
}

export function redirectToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export async function refreshAuthSession() {
  const refreshToken = Cookies.get('refreshToken');
  if (!refreshToken) {
    clearAuthStorage();
    redirectToLogin();
    throw new Error('No refresh token');
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, { refreshToken })
      .finally(() => { refreshPromise = null; });
  }

  const { data } = await refreshPromise;
  Cookies.set('accessToken', data.accessToken, { expires: ACCESS_COOKIE_EXP_DAYS, ...COOKIE_OPTIONS });
  Cookies.set('refreshToken', data.refreshToken, { expires: REFRESH_COOKIE_EXP_DAYS, ...COOKIE_OPTIONS });
  return data;
}

// ─── Interceptors ─────────────────────────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any;
    const status = error.response?.status;
    const isRefreshRequest = original?.url?.includes('/auth/refresh');

    if (status === 401 && !original?._retry && !isRefreshRequest) {
      original._retry = true;
      try {
        const data = await refreshAuthSession();
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        clearAuthStorage();
        redirectToLogin();
      }
    }

    if (status === 401 && isRefreshRequest) {
      clearAuthStorage();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:   (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  logout:  (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),
  me:      () => api.get('/auth/me').then((r) => r.data),
  reAuth:  (credential: string, type = 'pin') =>
    api.post('/auth/re-auth', { credential, type }).then((r) => r.data),
};

// ─── Tables (v2 — tanpa IoT) ──────────────────────────────────────────────────
export const tablesApi = {
  list:      (includeInactive = false) =>
    api.get('/tables', { params: { includeInactive } }).then((r) => r.data),
  get:       (id: string) => api.get(`/tables/${id}`).then((r) => r.data),
  create:    (data: any) => api.post('/tables', data).then((r) => r.data),
  update:    (id: string, data: any) => api.patch(`/tables/${id}`, data).then((r) => r.data),
  remove:    (id: string) => api.delete(`/tables/${id}`).then((r) => r.data),
  setStatus: (id: string, status: string) =>
    api.patch(`/tables/${id}/status`, { status }).then((r) => r.data),
};

// ─── Billing (v2 — dengan guest/member) ──────────────────────────────────────
export const billingApi = {
  createSession: (data: {
    tableId: string;
    durationMinutes: number;
    rateType?: string;
    billingPackageId?: string;
    guestName?: string;
    memberId?: string;
  }) => api.post('/billing/sessions', data).then((r) => r.data),
  getSessions:      (params?: any) =>
    api.get('/billing/sessions', { params }).then((r) => r.data),
  getActiveSessions: () =>
    api.get('/billing/sessions/active').then((r) => r.data),
  getSession:       (id: string) =>
    api.get(`/billing/sessions/${id}`).then((r) => r.data),
  extendSession:    (id: string, additionalMinutes: number, billingPackageId?: string) =>
    api.patch(`/billing/sessions/${id}/extend`, { additionalMinutes, billingPackageId }).then((r) => r.data),
  stopSession:      (id: string) =>
    api.patch(`/billing/sessions/${id}/stop`).then((r) => r.data),
  moveSession:      (id: string, targetTableId: string) =>
    api.patch(`/billing/sessions/${id}/move`, { targetTableId }).then((r) => r.data),
  deleteSession:    (id: string) =>
    api.delete(`/billing/sessions/${id}`).then((r) => r.data),
};

// ─── Members (baru v2) ────────────────────────────────────────────────────────
export const membersApi = {
  list:        (params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) =>
    api.get('/members', { params }).then((r) => r.data),
  get:         (id: string) => api.get(`/members/${id}`).then((r) => r.data),
  create:      (data: { name: string; phoneNumber: string }) =>
    api.post('/members', data).then((r) => r.data),
  update:      (id: string, data: any) =>
    api.patch(`/members/${id}`, data).then((r) => r.data),
  search:      (q: string) =>
    api.get('/members/search', { params: { q } }).then((r) => r.data),
  myProfile:   () => api.get('/members/profile/me').then((r) => r.data),
};

// ─── Waiting List (baru v2) ───────────────────────────────────────────────────
export const waitingListApi = {
  list:   (status?: string) =>
    api.get('/waiting-list', { params: status ? { status } : undefined }).then((r) => r.data),
  add:    (data: {
    guestName?: string;
    memberId?: string;
    preferredTableId?: string;
    notes?: string;
    partySize?: number;
  }) => api.post('/waiting-list', data).then((r) => r.data),
  call:   (id: string) => api.patch(`/waiting-list/${id}/call`).then((r) => r.data),
  done:   (id: string) => api.patch(`/waiting-list/${id}/done`).then((r) => r.data),
  cancel: (id: string) => api.patch(`/waiting-list/${id}/cancel`).then((r) => r.data),
  remove: (id: string) => api.delete(`/waiting-list/${id}`).then((r) => r.data),
  publicDisplay: () => getPublic<any[]>('/waiting-list/public/display'),
};

// ─── Attendance (baru v2) ─────────────────────────────────────────────────────
export const attendanceApi = {
  checkIn:       (data: { shiftId: string; lat?: number; lng?: number }) =>
    api.post('/attendance/check-in', data).then((r) => r.data),
  myRecords:     (params?: any) =>
    api.get('/attendance/my-records', { params }).then((r) => r.data),
  allRecords:    (params?: any) =>
    api.get('/attendance/records', { params }).then((r) => r.data),
  activeShifts:  () =>
    api.get('/attendance/shifts/active-now').then((r) => r.data),
  listShifts:    (includeInactive = false) =>
    api.get('/attendance/shifts', { params: { includeInactive } }).then((r) => r.data),
  createShift:   (data: any) =>
    api.post('/attendance/shifts', data).then((r) => r.data),
  updateShift:   (id: string, data: any) =>
    api.patch(`/attendance/shifts/${id}`, data).then((r) => r.data),
  deleteShift:   (id: string) =>
    api.delete(`/attendance/shifts/${id}`).then((r) => r.data),
  getSetting:    () =>
    api.get('/attendance/setting').then((r) => r.data),
  updateSetting: (data: any) =>
    api.patch('/attendance/setting', data).then((r) => r.data),
};

// ─── Packages ─────────────────────────────────────────────────────────────────
export const packagesApi = {
  list:        () => api.get('/packages').then((r) => r.data),
  active:      () => api.get('/packages/active').then((r) => r.data),
  targetRates: () => api.get('/packages/target-rates').then((r) => r.data),
  create:      (data: any) => api.post('/packages', data).then((r) => r.data),
  update:      (id: string, data: any) => api.patch(`/packages/${id}`, data).then((r) => r.data),
  remove:      (id: string) => api.delete(`/packages/${id}`).then((r) => r.data),
};

// ─── Menu ─────────────────────────────────────────────────────────────────────
export const menuApi = {
  list:           (params?: any) => api.get('/menu', { params }).then((r) => r.data),
  get:            (id: string) => api.get(`/menu/${id}`).then((r) => r.data),
  categories:     () => api.get('/menu/categories').then((r) => r.data),
  getNextSku:     (categoryId: string) =>
    api.get(`/menu/categories/${categoryId}/next-sku`).then((r) => r.data),
  createCategory: (data: any) => api.post('/menu/categories', data).then((r) => r.data),
  updateCategory: (id: string, data: any) =>
    api.patch(`/menu/categories/${id}`, data).then((r) => r.data),
  deleteCategory: (id: string) =>
    api.delete(`/menu/categories/${id}`).then((r) => r.data),
  create:         (data: any) => api.post('/menu', data).then((r) => r.data),
  update:         (id: string, data: any) => api.patch(`/menu/${id}`, data).then((r) => r.data),
  remove:         (id: string) => api.delete(`/menu/${id}`).then((r) => r.data),
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const ordersApi = {
  list:    (params?: any) => api.get('/orders', { params }).then((r) => r.data),
  get:     (id: string) => api.get(`/orders/${id}`).then((r) => r.data),
  create:  (data: any) => api.post('/orders', data).then((r) => r.data),
  confirm: (id: string) => api.patch(`/orders/${id}/confirm`).then((r) => r.data),
  cancel:  (id: string) => api.patch(`/orders/${id}/cancel`).then((r) => r.data),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentsApi = {
  list:              (params?: any) => api.get('/payments', { params }).then((r) => r.data),
  createCheckout:    (data: any) => api.post('/payments/checkout', data).then((r) => r.data),
  confirmPayment:    (id: string, amountPaid: number) =>
    api.patch(`/payments/${id}/confirm`, { amountPaid }).then((r) => r.data),
  markPrinted:       (id: string) => api.patch(`/payments/${id}/print`).then((r) => r.data),
  getReceipt:        (id: string) => api.get(`/payments/${id}/receipt`).then((r) => r.data),
  requestVoid:       (id: string, reason?: string) =>
    api.patch(`/payments/${id}/void-request`, { reason }).then((r) => r.data),
  listVoidRequests:  (status?: string) =>
    api.get('/payments/void-requests/list', { params: status ? { status } : undefined }).then((r) => r.data),
  approveVoidRequest: (id: string) =>
    api.patch(`/payments/void-requests/${id}/approve`).then((r) => r.data),
  rejectVoidRequest: (id: string, reason?: string) =>
    api.patch(`/payments/void-requests/${id}/reject`, { reason }).then((r) => r.data),
  deletePayment:     (id: string) => api.patch(`/payments/${id}/delete`).then((r) => r.data),
};

// ─── Finance ──────────────────────────────────────────────────────────────────
export const financeApi = {
  getReport:        (startDate: string, endDate: string) =>
    api.get('/finance/report', { params: { startDate, endDate } }).then((r) => r.data),
  getDailyReport:   (date?: string) =>
    api.get('/finance/report/daily', { params: { date } }).then((r) => r.data),
  createExpense:    (data: any) => api.post('/finance/expenses', data).then((r) => r.data),
  updateExpense:    (id: string, data: any) =>
    api.patch(`/finance/expenses/${id}`, data).then((r) => r.data),
  deleteExpense:    (id: string) => api.delete(`/finance/expenses/${id}`).then((r) => r.data),
  listExpenses:     (params?: any) =>
    api.get('/finance/expenses', { params }).then((r) => r.data),
  expenseCategories: () => api.get('/finance/expenses/categories').then((r) => r.data),
};

// ─── Stock ────────────────────────────────────────────────────────────────────
export const stockApi = {
  getFnbStock:    () => api.get('/stock/fnb').then((r) => r.data),
  getLowStock:    () => api.get('/stock/fnb/alerts').then((r) => r.data),
  adjustStock:    (menuItemId: string, data: any) =>
    api.patch(`/stock/fnb/${menuItemId}/adjust`, data).then((r) => r.data),
  getAssets:      () => api.get('/stock/assets').then((r) => r.data),
  createAsset:    (data: any) => api.post('/stock/assets', data).then((r) => r.data),
  updateAsset:    (id: string, data: any) =>
    api.patch(`/stock/assets/${id}`, data).then((r) => r.data),
  deleteAsset:    (id: string) => api.delete(`/stock/assets/${id}`).then((r) => r.data),
};

// ─── Audit ────────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params?: any) => api.get('/audit', { params }).then((r) => r.data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list:           () => api.get('/users').then((r) => r.data),
  listCashiers:   () => api.get('/users/cashiers').then((r) => r.data),
  get:            (id: string) => api.get(`/users/${id}`).then((r) => r.data),
  create:         (data: any) => api.post('/users', data).then((r) => r.data),
  update:         (id: string, data: any) => api.patch(`/users/${id}`, data).then((r) => r.data),
  getMyProfile:   (params?: any) =>
    api.get('/users/profile/me', { params }).then((r) => r.data),
  updateMyProfile: (data: any) =>
    api.patch('/users/profile/me', data).then((r) => r.data),
  uploadMyPhoto:  (formData: FormData) =>
    api.post('/users/profile/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
};

// ─── Company ──────────────────────────────────────────────────────────────────
export const companyApi = {
  getProfile:    () => api.get('/company/profile').then((r) => r.data),
  updateProfile: (data: any) => api.patch('/company/profile', data).then((r) => r.data),
  uploadLogo:    (formData: FormData) =>
    api.post('/company/profile/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  resetLogo:     () => api.patch('/company/profile/logo/reset').then((r) => r.data),
  getPublicProfile: () => getPublic<any>('/company/profile'),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  list:     (params?: any) => api.get('/notifications', { params }).then((r) => r.data),
  markRead: (id?: string) =>
    api.patch('/notifications/read', undefined, { params: id ? { id } : undefined }).then((r) => r.data),
};
