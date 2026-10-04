export type UserRole = 'buyer' | 'seller' | 'admin';

export type ProductStatus = 'on_sale' | 'off_sale';

export type ProductResult = 'pending' | 'red' | 'black' | 'no_result';

export type OrderStatus = 'paid';

export interface UserInfo {
  id: string;
  phone: string;
  role: UserRole;
}

// ===== 比赛系统（V0.2） =====

export interface MatchInfo {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
}

export interface MatchListResponse {
  items: MatchInfo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateMatchRequest {
  league?: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
}

export interface ProductPublic {
  id: string;
  anchorName: string;
  matchTime: string;
  homeTeam: string;
  awayTeam: string;
  price: string;
  status: ProductStatus;
  result: ProductResult;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends ProductPublic {
  hasPurchased: boolean;
  content?: string;
}

export interface ProductListResponse {
  items: ProductPublic[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrderItem {
  id: string;
  userId: string;
  productId: string;
  price: string;
  status: OrderStatus;
  createdAt: string;
  product?: ProductPublic;
}

export interface AdminOrderItem extends OrderItem {
  username?: string;
}

export interface OrderListResponse {
  items: OrderItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminOrderListResponse {
  items: AdminOrderItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RegisterRequest {
  phone: string;
  password: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  user: UserInfo;
  token: string;
}

export interface BuyResponse {
  orderId: string;
  productId: string;
}

export interface AdminCreateProductRequest {
  anchorName: string;
  matchTime: string;
  homeTeam: string;
  awayTeam: string;
  content: string;
  price: number;
}

export interface AdminUpdateProductRequest {
  anchorName?: string;
  matchTime?: string;
  homeTeam?: string;
  awayTeam?: string;
  content?: string;
}

export interface AdminSetResultRequest {
  result: ProductResult;
}
