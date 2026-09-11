// Commerce domain types
export interface ExpenseRow {
  id: string
  amount: number
  category: string
  note: string
  date: string
  status: 'pending' | 'approved' | 'paid'
  paid_at: string | null
  created_at: string
}

export interface ExpenseInput {
  amount: number
  category?: string
  note?: string
  date: string
  vendor?: string
}

export interface RecurringExpenseRow {
  id: string
  shop_id: string
  category: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly'
  next_due_date: string
  is_active: number
  created_at: string
}

export interface RecurringExpenseInput {
  amount: number
  category?: string
  frequency: string
  nextDueDate: string
}
