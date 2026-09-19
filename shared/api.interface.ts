export type UserRole = 'buyer' | 'admin';

export type ProductStatus = 'on_sale' | 'off_sale';

export type ProductResult = 'pending' | 'red' | 'black' | 'no_result';

export type OrderStatus = 'paid';

export interface UserInfo {
  id: string;
  username: string;
  role: UserRole;
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
  username: string;
  password: string;
  captchaId: string;
  captchaCode: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  captchaId: string;
  captchaCode: string;
}

export interface LoginResponse {
  user: UserInfo;
  token: string;
}

export interface CaptchaResponse {
  captchaId: string;
  image: string;
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
