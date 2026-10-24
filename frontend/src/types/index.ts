// Match backend DTOs and Prisma models

export enum ExpenseType {
  INCOME = 'income',
  OUTCOME = 'outcome',
}

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  color: string;
  textColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  textColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  item: string;
  amount: number;
  categoryId: string | null;
  category: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  archivedAt: string | null;
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSummary {
  id: string;
  userId: string;
  name: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  total: number;
}

export interface Expense {
  id: string;
  userId: string;
  type: ExpenseType;
  amount: number;
  description: string;
  date: string; // ISO date string
  creditCardId: string | null;
  creditCard: CreditCard | null;
  categoryId: string | null;
  category: Category | null;
  createdAt: string;
  updatedAt: string;
}

// Request DTOs
export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateExpenseDto {
  type: ExpenseType;
  amount: number;
  description: string;
  date: string;
  creditCardId?: string;
  categoryId?: string;
}

export interface UpdateExpenseDto extends Partial<CreateExpenseDto> {}

export interface CreateCreditCardDto {
  name: string;
  color: string;
  textColor?: string;
}

export interface UpdateCreditCardDto extends Partial<CreateCreditCardDto> {}

export interface CreateCategoryDto {
  name: string;
  color: string;
  textColor?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface CreateBudgetItemDto {
  item: string;
  amount: number;
  categoryId?: string;
}

export interface UpdateBudgetItemDto extends Partial<CreateBudgetItemDto> {}

export interface CreateBudgetDto {
  name: string;
}

export interface UpdateBudgetDto {
  name?: string;
  archived?: boolean;
}

export interface ExpenseFilters {
  type?: ExpenseType;
  creditCardId?: string; // 'none' for expenses without credit card
}

// Response types
export interface AuthResponse {
  access_token: string;
  user: Partial<User>;
}

