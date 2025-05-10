export type TransactionType = "sub" | "in" | "out"
export type TransactionCategory = "sub" | "delivery" | "service"

export type Transaction = {
  id: string
  name: string
  type: TransactionType
  category: TransactionCategory
  date: string
  invoiceUrl?: string
}