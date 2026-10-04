import axios from 'axios';
import { logger } from '../utils/logger';

// 自建 axios 实例替代平台 axiosForBackend。
// 开发环境 vite 会把 /api 代理到后端，生产环境同源。
const axiosForBackend = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined) || '',
  timeout: 15000,
});
import type {
  UserInfo,
  ProductPublic,
  ProductDetail,
  ProductListResponse,
  OrderListResponse,
  LoginResponse,
  RegisterRequest,
  LoginRequest,
  BuyResponse,
  SellerCreateProductRequest,
  MatchListResponse,
  MatchInfo,
} from '@shared/api.interface';

const TOKEN_KEY = 'liao_platform_token';
const USER_KEY = 'liao_platform_user';
export const AUTH_401_EVENT = 'liao_platform_auth_401';

let tokenMemory: string | null = null;

function setAuthHeader(token: string): void {
  const h = axiosForBackend.defaults.headers as { common?: Record<string, string> };
  if (!h.common) h.common = {};
  h.common['Authorization'] = `Bearer ${token}`;
}

function clearAuthHeader(): void {
  const h = axiosForBackend.defaults.headers as { common?: Record<string, string> };
  if (h.common) {
    delete h.common['Authorization'];
  }
}

export function getToken(): string | null {
  if (tokenMemory) return tokenMemory;
  try {
    tokenMemory = localStorage.getItem(TOKEN_KEY);
    if (tokenMemory) setAuthHeader(tokenMemory);
  } catch {
    tokenMemory = null;
  }
  return tokenMemory;
}

export function setToken(token: string): void {
  tokenMemory = token;
  setAuthHeader(token);
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    logger.error('setToken failed', e);
  }
}

export function clearToken(): void {
  tokenMemory = null;
  clearAuthHeader();
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    logger.error('clearToken failed', e);
  }
}

export function getStoredUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserInfo): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    logger.error('setStoredUser failed', e);
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    logger.error('clearStoredUser failed', e);
  }
}

function clearAuthStorage(): void {
  clearToken();
  clearStoredUser();
}

axiosForBackend.interceptors.request.use((config) => {
  const token = tokenMemory || getToken();
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (!import.meta.env.PROD) {
    const headerFromConfig = config.headers?.['Authorization'] as string | undefined;
    const headers = axiosForBackend.defaults.headers as { common?: Record<string, string> };
    const headerFromDefaults = headers.common?.['Authorization'];
    const fromConfig = headerFromConfig
      ? `${headerFromConfig.slice(0, 15)}...${headerFromConfig.slice(-8)} (len=${headerFromConfig.length})`
      : '(empty)';
    const fromDefaults = headerFromDefaults
      ? `${headerFromDefaults.slice(0, 15)}...${headerFromDefaults.slice(-8)} (len=${headerFromDefaults.length})`
      : '(empty)';
    logger.warn(`[DEBUG Auth] ${String(config.method ?? '').toUpperCase()} ${config.url}  headerFromConfig: ${fromConfig}  headerFromDefaults_common: ${fromDefaults}  tokenMemory: ${tokenMemory ? 'set' : 'null'}`);
  }
  return config;
}, (error) => Promise.reject(error));

axiosForBackend.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthStorage();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_401_EVENT));
      }
    }
    return Promise.reject(error);
  },
);

// ========== 认证 ==========

export async function register(data: RegisterRequest): Promise<{ user: UserInfo }> {
  const response = await axiosForBackend.post('/api/v1/auth/register', data);
  return response.data;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await axiosForBackend.post('/api/v1/auth/login', data);
  const { user, token } = response.data;
  setToken(token);
  setStoredUser(user);
  return response.data;
}

export async function logout(): Promise<void> {
  // JWT 无状态，登出仅清理本地登录态
  clearAuthStorage();
}

export async function getMe(): Promise<{ user: UserInfo }> {
  const response = await axiosForBackend.get('/api/v1/users/me');
  return response.data;
}

// ========== 商品 ==========

export async function getProducts(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<ProductListResponse> {
  const response = await axiosForBackend.get('/api/v1/products', { params });
  return response.data;
}

export async function getProductDetail(id: string): Promise<ProductDetail> {
  const response = await axiosForBackend.get(`/api/v1/products/${id}`);
  return response.data;
}

// ========== 比赛 ==========

export async function getMatches(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<MatchListResponse> {
  const response = await axiosForBackend.get('/api/v1/matches', { params });
  return response.data;
}

export async function createMatch(data: {
  league?: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
}): Promise<{ match: MatchInfo; created: boolean }> {
  const response = await axiosForBackend.post('/api/v1/matches', data);
  return response.data;
}

// ========== 卖家 ==========

export async function sellerGetMyProducts(): Promise<ProductListResponse> {
  const response = await axiosForBackend.get('/api/v1/seller/products');
  return response.data;
}

export async function sellerCreateProduct(
  data: SellerCreateProductRequest,
): Promise<ProductDetail> {
  const response = await axiosForBackend.post('/api/v1/seller/products', data);
  return response.data;
}

export async function sellerSubmitProduct(id: string): Promise<ProductDetail> {
  const response = await axiosForBackend.post(`/api/v1/seller/products/${id}/submit`);
  return response.data;
}

export async function sellerOfflineProduct(id: string): Promise<ProductDetail> {
  const response = await axiosForBackend.post(`/api/v1/seller/products/${id}/offline`);
  return response.data;
}

export async function sellerAddAddition(
  id: string,
  content: string,
): Promise<{ additions: string[] }> {
  const response = await axiosForBackend.post(`/api/v1/products/${id}/additions`, { content });
  return response.data;
}

// ========== 订单 ==========

export async function buyProduct(productId: string): Promise<BuyResponse> {
  const response = await axiosForBackend.post('/api/v1/orders', { productId });
  return response.data;
}

export async function getMyOrders(params?: {
  page?: number;
  pageSize?: number;
}): Promise<OrderListResponse> {
  const response = await axiosForBackend.get('/api/v1/orders/me', { params });
  return response.data;
}
