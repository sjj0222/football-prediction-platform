export type UserRole = 'buyer' | 'seller' | 'admin';

// ===== 商品系统（V0.2） =====
// 商品生命周期：draft → pending_review → online → offline / deleted
export type ProductStatus = 'draft' | 'pending_review' | 'online' | 'offline' | 'deleted';

export type OrderStatus = 'paid' | 'refunded';

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

// ===== 商品（V0.2） =====

export interface ProductPublic {
  id: string;
  sellerId: string;
  matchId: string;
  title: string;
  description: string;
  price: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  // 关联信息（服务端 join 返回，便于展示）
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  matchTime?: string;
}

export interface ProductDetail extends ProductPublic {
  hasPurchased: boolean;
  /** 仅已购买用户 / 商品所属卖家 / 管理员可见 */
  content?: string;
  /** 卖家后续追加的补充内容（仅已购买用户可见） */
  additions?: string[];
}

export interface ProductListResponse {
  items: ProductPublic[];
  total: number;
  page: number;
  pageSize: number;
}

/** 卖家创建商品 */
export interface SellerCreateProductRequest {
  matchId: string;
  title: string;
  description?: string;
  content: string;
  price: number;
}

/** 卖家补充商品内容（发布后追加） */
export interface SellerAddAdditionRequest {
  content: string;
}

// ===== 订单（V0.2） =====

export interface OrderItem {
  id: string;
  buyerId: string;
  productId: string;
  price: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  product?: ProductPublic;
}

export interface OrderListResponse {
  items: OrderItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BuyResponse {
  orderId: string;
  productId: string;
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

export interface AdminCreateProductRequest {
  matchId: string;
  title: string;
  description?: string;
  content: string;
  price: number;
}
