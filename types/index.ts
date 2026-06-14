// ============================================================
// AURA PLUS ERP - TypeScript Types
// ============================================================

export type UserRole = 'super_admin' | 'sales' | 'technician' | 'accountant' | 'manager'
export type CustomerType = 'prospect' | 'active' | 'inactive'
export type CustomerSource = 'lead_conversion' | 'manual' | 'walk_in' | 'referral' | 'online'
export type LeadStage = 'new_lead' | 'contacted' | 'follow_up' | 'quote_sent' | 'won' | 'lost' | 'ghosted'
export type LeadSource = 'facebook' | 'referral' | 'walk_in' | 'phone_call' | 'email' | 'website' | 'other'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export type LineType = 'product' | 'service' | 'labour' | 'installation'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue'
export type InvoiceType = 'standard' | 'proforma'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque'
export type ProjectStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed'
export type TechnicianRole = 'lead' | 'assistant'
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'waiting_for_client' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type ContractStatus = 'active' | 'expired' | 'cancelled' | 'pending_renewal'
export type BillingCycle = 'monthly' | 'quarterly' | 'annually'
export type StockAdjustmentType = 'in' | 'out' | 'correction' | 'sale' | 'write_off' | 'project_use'
export type StockReferenceType = 'invoice' | 'project' | 'manual'
export type DeductionVia = 'invoice' | 'project' | 'manual'

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  phone: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface Customer {
  id: string
  company_name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  physical_address: string | null
  customer_type: CustomerType
  source: CustomerSource
  tpin: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Lead {
  id: string
  customer_id: string | null
  company_name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  physical_address: string | null
  lead_source: LeadSource
  assigned_to: string | null
  expected_value: number
  stage: LeadStage
  notes: string | null
  converted_to_customer_id: string | null
  converted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined fields
  assigned_user?: Pick<User, 'id' | 'full_name' | 'email'>
}

export interface Quotation {
  id: string
  quote_number: string
  customer_id: string
  lead_id: string | null
  created_by: string | null
  assigned_salesperson: string | null
  status: QuoteStatus
  version_number: number
  parent_quote_id: string | null
  subtotal: number
  discount_amount: number
  discount_percent: number
  total: number
  tot_note: string | null
  terms_and_conditions: string | null
  notes: string | null
  valid_until: string | null
  sent_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined
  customer?: Pick<Customer, 'id' | 'company_name' | 'contact_person' | 'email' | 'phone' | 'physical_address'>
  lines?: QuotationLine[]
  salesperson?: Pick<User, 'id' | 'full_name'>
}

export interface QuotationLine {
  id: string
  quotation_id: string
  line_type: LineType
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  line_total: number
  sort_order: number
  created_at: string
  product?: Pick<Product, 'id' | 'sku' | 'product_name'>
}

export interface Invoice {
  id: string
  invoice_number: string
  invoice_type: InvoiceType
  quotation_id: string | null
  customer_id: string
  created_by: string | null
  status: InvoiceStatus
  subtotal: number
  discount_amount: number
  total: number
  amount_paid: number
  outstanding_balance: number
  tot_note: string | null
  terms_and_conditions: string | null
  notes: string | null
  payment_terms: string | null
  due_date: string | null
  sent_at: string | null
  paid_at: string | null
  stock_deducted: boolean
  stock_deducted_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined
  customer?: Pick<Customer, 'id' | 'company_name' | 'contact_person' | 'email' | 'phone' | 'physical_address'>
  lines?: InvoiceLine[]
  payments?: Payment[]
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  line_type: LineType
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
  created_at: string
  product?: Pick<Product, 'id' | 'sku' | 'product_name'>
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  reference_number: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
  recorded_by_user?: Pick<User, 'id' | 'full_name'>
}

export interface ProductCategory {
  id: string
  name: string
  parent_id: string | null
  description: string | null
  created_at: string
}

export interface Supplier {
  id: string
  company_name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  sku: string
  product_name: string
  category_id: string | null
  supplier_id: string | null
  cost_price: number
  selling_price: number
  quantity_in_stock: number
  reorder_level: number
  unit_of_measure: string
  description: string | null
  image_url: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  category?: Pick<ProductCategory, 'id' | 'name'>
  supplier?: Pick<Supplier, 'id' | 'company_name'>
  is_low_stock?: boolean
}

export interface StockAdjustment {
  id: string
  product_id: string
  adjustment_type: StockAdjustmentType
  quantity_before: number
  quantity_change: number
  quantity_after: number
  reference_type: StockReferenceType | null
  reference_id: string | null
  reason: string | null
  adjusted_by: string | null
  created_at: string
  product?: Pick<Product, 'id' | 'sku' | 'product_name'>
  adjusted_by_user?: Pick<User, 'id' | 'full_name'>
}

export interface ProjectChecklist {
  equipment_installed: boolean
  equipment_tested: boolean
  client_trained: boolean
  photos_uploaded: boolean
  client_sign_off: boolean
}

export interface Project {
  id: string
  project_number: string
  customer_id: string
  quotation_id: string | null
  invoice_id: string | null
  project_name: string
  scheduled_date: string | null
  status: ProjectStatus
  notes: string | null
  checklist: ProjectChecklist
  stock_deducted_via: DeductionVia | null
  stock_deducted_at: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined
  customer?: Pick<Customer, 'id' | 'company_name' | 'contact_person' | 'phone'>
  technicians?: ProjectTechnician[]
  products?: ProjectProduct[]
  files?: ProjectFile[]
}

export interface ProjectTechnician {
  id: string
  project_id: string
  technician_id: string
  role: TechnicianRole
  assigned_at: string
  assigned_by: string | null
  technician?: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'>
}

export interface ProjectProduct {
  id: string
  project_id: string
  product_id: string
  quantity_used: number
  created_at: string
  product?: Pick<Product, 'id' | 'sku' | 'product_name' | 'selling_price'>
}

export interface ProjectFile {
  id: string
  project_id: string
  file_type: 'before' | 'after' | 'document'
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
  uploaded_by_user?: Pick<User, 'id' | 'full_name'>
}

export interface SupportTicket {
  id: string
  ticket_number: string
  customer_id: string
  product_id: string | null
  project_id: string | null
  issue_description: string
  priority: TicketPriority
  assigned_technician_id: string | null
  status: TicketStatus
  resolution_notes: string | null
  sla_due_at: string | null
  escalated_to_project_id: string | null
  resolved_at: string | null
  closed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined
  customer?: Pick<Customer, 'id' | 'company_name' | 'contact_person'>
  product?: Pick<Product, 'id' | 'sku' | 'product_name'>
  assigned_technician?: Pick<User, 'id' | 'full_name' | 'avatar_url'>
  comments?: TicketComment[]
}

export interface TicketComment {
  id: string
  ticket_id: string
  comment: string
  is_internal: boolean
  created_by: string | null
  created_at: string
  created_by_user?: Pick<User, 'id' | 'full_name' | 'avatar_url'>
}

export interface MaintenanceContract {
  id: string
  contract_number: string
  customer_id: string
  contract_name: string
  start_date: string
  end_date: string
  renewal_date: string | null
  value: number
  billing_cycle: BillingCycle
  status: ContractStatus
  products_covered: Array<{ name: string; description?: string }>
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  customer?: Pick<Customer, 'id' | 'company_name' | 'contact_person'>
}

export interface ActivityLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_label: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  user?: Pick<User, 'id' | 'full_name' | 'avatar_url'>
}

export interface SystemSetting {
  id: string
  key: string
  value: unknown
  updated_by: string | null
  updated_at: string
}

// ============================================================
// UI / Application Types
// ============================================================

export interface NavItem {
  label: string
  href: string
  icon: string
  roles: UserRole[]
  badge?: number
}

export interface DashboardMetric {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  trend?: 'up' | 'down' | 'neutral'
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface SelectOption {
  value: string
  label: string
}

// Form types for creating/updating records
export type CreateCustomerInput = Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by'>
export type UpdateCustomerInput = Partial<CreateCustomerInput>

export type CreateLeadInput = Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'converted_at' | 'converted_to_customer_id' | 'customer_id' | 'assigned_user'>
export type UpdateLeadInput = Partial<CreateLeadInput>

export type CreateQuotationInput = Omit<Quotation, 'id' | 'quote_number' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'sent_at' | 'accepted_at' | 'rejected_at' | 'customer' | 'lines' | 'salesperson'>
export type UpdateQuotationInput = Partial<CreateQuotationInput>
