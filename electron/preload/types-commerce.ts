// Commerce domain types
export interface ExpenseRow {
  id: string
  amount: number
  category: string
  note: string
  date: string
  created_at: string
}

export interface ExpenseInput {
  amount: number
  category?: string
  note?: string
  date: string
}
