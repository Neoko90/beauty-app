// ============================================================
// REFERLY — Typy TypeScript
// ============================================================

export type SalonPlan = 'trial' | 'solo' | 'grow' | 'pro' | 'max'
export type StaffRole = 'owner' | 'admin' | 'receptionist' | 'employee'
export type AppointmentStatus = 'confirmed' | 'pending' | 'awaiting_deposit' | 'done' | 'cancelled' | 'no_show'
export type PaymentMethod = 'cash' | 'blik' | 'card' | 'transfer'
export type BookingSource = 'manual' | 'online'
export type SmsType = 'reminder' | 'confirmation' | 'cancellation' | 'waiting_list' | 'custom'
export type SmsStatus = 'sent' | 'failed' | 'delivered' | 'pending'
export type ReferralStatus = 'pending' | 'used' | 'expired'
export type RewardType = 'amount' | 'percent'
export type FinanceType = 'income' | 'expense'
export type InventoryChangeType = 'add' | 'use' | 'sell' | 'adjust'
export type ChangeType = 'created' | 'updated' | 'status_changed' | 'cancelled' | 'rescheduled'
export type WaitingStatus = 'waiting' | 'notified' | 'booked' | 'cancelled'

export interface DayHours {
  open?: string
  close?: string
  start?: string
  end?: string
  is_open?: boolean
  is_working?: boolean
}

export interface OpeningHours {
  [day: string]: DayHours
}

// ============================================================
// SALON
// ============================================================
export interface Salon {
  id: string
  owner_id: string
  name: string
  slug: string
  phone?: string
  email?: string
  address?: string
  city?: string
  website?: string
  description?: string
  plan: SalonPlan
  trial_ends_at?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  sms_balance: number
  sms_used_this_month: number
  sms_reset_date?: string
  smsplanet_api_key?: string
  smsplanet_sender?: string
  opening_hours: OpeningHours
  booking_enabled: boolean
  booking_min_advance_hours: number
  booking_max_days_ahead: number
  booking_slot_interval: number
  deposit_enabled: boolean
  deposit_after_no_shows: number
  deposit_blik_number?: string
  deposit_amount?: number
  deposit_no_refund_hours: number
  deposit_terms?: string
  hero_image_url?: string
  logo_url?: string
  gallery_urls: string[]
  facebook_url?: string
  instagram_url?: string
  google_maps_url?: string
  onboarding_completed: boolean
  onboarding_step: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// STAFF
// ============================================================
export interface Staff {
  id: string
  salon_id: string
  user_id?: string
  name: string
  email?: string
  phone?: string
  role: StaffRole
  color: string
  photo_url?: string
  working_hours: OpeningHours
  visible_in_calendar: boolean
  can_be_booked_online: boolean
  commission_percent: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// CLIENT
// ============================================================
export interface Client {
  id: string
  salon_id: string
  name: string
  phone: string
  email?: string
  address?: string
  birthdate?: string
  notes?: string
  referral_code?: string
  referred_by?: string
  total_spent: number
  visit_count: number
  no_show_count: number
  last_visit_at?: string
  active_discount: number
  active_discount_type: RewardType
  discount_expires_at?: string
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// SERVICE
// ============================================================
export interface Service {
  id: string
  salon_id: string
  name: string
  description?: string
  price: number
  price_max?: number
  duration_minutes: number
  staff_ids: string[]
  resource_ids: string[]
  category?: string
  color?: string
  is_active: boolean
  is_online_bookable: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// RESOURCE
// ============================================================
export interface Resource {
  id: string
  salon_id: string
  name: string
  type: string
  description?: string
  is_active: boolean
  created_at: string
}

// ============================================================
// APPOINTMENT
// ============================================================
export interface Appointment {
  id: string
  salon_id: string
  client_id?: string
  staff_id: string
  service_id: string
  resource_id?: string
  starts_at: string
  ends_at: string
  price: number
  original_price: number
  discount: number
  discount_type?: RewardType
  status: AppointmentStatus
  payment_method?: PaymentMethod
  referral_code?: string
  referral_id?: string
  source: BookingSource
  notes?: string
  client_name?: string
  client_phone?: string
  deposit_paid: boolean
  deposit_amount?: number
  created_at: string
  updated_at: string
  // Joins
  client?: Client
  staff?: Staff
  service?: Service
  resource?: Resource
}

// ============================================================
// REFERRAL
// ============================================================
export interface Referral {
  id: string
  salon_id: string
  referrer_id: string
  referred_id?: string
  reward_referrer: number
  reward_new: number
  reward_type: RewardType
  status: ReferralStatus
  appointment_id?: string
  used_at?: string
  created_at: string
  // Joins
  referrer?: Client
  referred?: Client
}

export interface MultiReward {
  count: number
  reward: number
  description?: string
}

export interface ReferralSettings {
  id: string
  salon_id: string
  is_active: boolean
  reward_type: RewardType
  reward_referrer: number
  reward_new: number
  commission_on_original_price: boolean
  multi_rewards: MultiReward[]
  created_at: string
  updated_at: string
}

// ============================================================
// INVENTORY
// ============================================================
export interface InventoryItem {
  id: string
  salon_id: string
  name: string
  description?: string
  category?: string
  quantity: number
  unit: string
  price_per_unit: number
  alert_threshold: number
  service_usage: Record<string, number>
  supplier?: string
  sku?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryHistoryEntry {
  id: string
  item_id: string
  salon_id: string
  change_type: InventoryChangeType
  quantity_before: number
  quantity_change: number
  quantity_after: number
  unit_price?: number
  client_id?: string
  appointment_id?: string
  notes?: string
  changed_by?: string
  created_at: string
  client?: Client
}

// ============================================================
// FINANCE
// ============================================================
export interface FinanceEntry {
  id: string
  salon_id: string
  type: FinanceType
  category: string
  amount: number
  description?: string
  date: string
  appointment_id?: string
  staff_id?: string
  payment_method?: PaymentMethod
  receipt_url?: string
  created_by?: string
  created_at: string
  staff?: Staff
}

// ============================================================
// SMS
// ============================================================
export interface SmsLog {
  id: string
  salon_id: string
  appointment_id?: string
  client_id?: string
  type: SmsType
  phone: string
  message: string
  status: SmsStatus
  smsplanet_message_id?: string
  error_message?: string
  sent_at: string
  delivered_at?: string
  appointment?: Appointment
  client?: Client
}

export interface SmsTemplate {
  id: string
  salon_id: string
  type: SmsType
  name: string
  content: string
  hours_before: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// BLOCK
// ============================================================
export interface Block {
  id: string
  salon_id: string
  staff_id?: string
  title: string
  reason?: string
  starts_at: string
  ends_at: string
  notes?: string
  recurrence_type: string
  recurrence_until?: string
  color: string
  created_at: string
  staff?: Staff
}

// ============================================================
// PARTNER SALON
// ============================================================
export interface PartnerSalon {
  id: string
  salon_id: string
  partner_name: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  discount_type: RewardType
  discount_value: number
  points_per_visit: number
  points_balance: number
  notes?: string
  is_settled: boolean
  last_settlement_at?: string
  created_at: string
  updated_at: string
}

// ============================================================
// REVIEW
// ============================================================
export interface Review {
  id: string
  salon_id: string
  client_name: string
  client_phone?: string
  rating: number
  comment?: string
  photo_urls: string[]
  is_approved: boolean
  salon_reply?: string
  replied_at?: string
  verified_by_referly: boolean
  created_at: string
}

// ============================================================
// WAITING LIST
// ============================================================
export interface WaitingListEntry {
  id: string
  salon_id: string
  service_id: string
  client_name: string
  client_phone: string
  client_email?: string
  preferred_date?: string
  preferred_staff_id?: string
  notified_at?: string
  status: WaitingStatus
  created_at: string
  service?: Service
  staff?: Staff
}

// ============================================================
// BLOG
// ============================================================
export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  category?: string
  tags: string[]
  meta_title?: string
  meta_description?: string
  og_image_url?: string
  is_published: boolean
  published_at?: string
  author_id?: string
  read_time_minutes: number
  views: number
  created_at: string
  updated_at: string
}

// ============================================================
// PLANY
// ============================================================
export const PLANS = {
  trial: { name: 'Okres próbny', price: 0, staff_limit: 1, sms_limit: 30, color: 'gray' },
  solo: { name: 'SOLO', price: 99, staff_limit: 1, sms_limit: 200, color: 'green' },
  grow: { name: 'GROW', price: 129, staff_limit: 2, sms_limit: 400, color: 'yellow' },
  pro: { name: 'PRO', price: 159, staff_limit: 4, sms_limit: 600, color: 'red' },
  max: { name: 'MAX', price: 229, staff_limit: 999, sms_limit: 1000, color: 'purple' },
} as const

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  confirmed: 'Potwierdzona',
  pending: 'Oczekuje na potw.',
  awaiting_deposit: 'Czeka na zadatek',
  done: 'Odbyta',
  cancelled: 'Anulowana',
  no_show: 'Nieobecność',
}

export const STATUS_ICONS: Record<AppointmentStatus, string> = {
  confirmed: '✅',
  pending: '⏳',
  awaiting_deposit: '💳',
  done: '✔️',
  cancelled: '❌',
  no_show: '🚫',
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Gotówka',
  blik: 'BLIK',
  card: 'Karta',
  transfer: 'Przelew',
}

export const DAY_NAMES = ['', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
export const DAY_SHORT = ['', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

export const FINANCE_CATEGORIES = {
  income: ['Usługi fryzjerskie', 'Usługi kosmetyczne', 'Sprzedaż produktów', 'Zadatki', 'Inne przychody'],
  expense: ['Czynsz', 'Media', 'Produkty/Materiały', 'Wynagrodzenia', 'Marketing', 'Sprzęt', 'Szkolenia', 'Ubezpieczenie', 'Inne koszty'],
}

export const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240]

export const BLOCK_REASONS = [
  { value: 'przerwa', label: 'Przerwa' },
  { value: 'urlop', label: 'Urlop' },
  { value: 'l4', label: 'L4 / Zwolnienie' },
  { value: 'szkolenie', label: 'Szkolenie' },
  { value: 'wolne', label: 'Dzień wolny' },
  { value: 'inne', label: 'Inne' },
]
