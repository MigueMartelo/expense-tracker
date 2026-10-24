import type {
  RegisterDto,
  LoginDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  AuthResponse,
  ExpenseFilters,
  Expense,
  CreditCard,
  CreateCreditCardDto,
  UpdateCreditCardDto,
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
  Budget,
  BudgetItem,
  BudgetSummary,
  CreateBudgetDto,
  UpdateBudgetDto,
  CreateBudgetItemDto,
  UpdateBudgetItemDto,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Token management
const TOKEN_KEY = 'expense_tracker_token';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null; // SSR: localStorage not available
  }
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return; // SSR: localStorage not available
  }
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === 'undefined') {
    return; // SSR: localStorage not available
  }
  localStorage.removeItem(TOKEN_KEY);
};

// API client with error handling
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<T> => {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });
  // Handle 401 Unauthorized - only redirect if not skipping auth redirect (e.g., during login/register)
  if (response.status === 401) {
    removeToken();
    if (!skipAuthRedirect && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    const error = await response
      .json()
      .catch(() => ({ message: 'Unauthorized' }));
    throw new Error(error.message || 'Unauthorized');
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP Error! status: ${response.status}`);
  }

  return response.json();
};

// Auth API
export const authApi = {
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuthRedirect: true, // Don't redirect on 401 during registration
    });
    setToken(response.access_token);
    return response;
  },
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuthRedirect: true, // Don't redirect on 401 during login
    });
    setToken(response.access_token);
    return response;
  },
  getMe: async (): Promise<{ id: string; email: string; name: string | null }> => {
    return apiRequest<{ id: string; email: string; name: string | null }>('/auth/me');
  },
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuthRedirect: true,
    });
  },
  verifyResetToken: async (token: string): Promise<{ valid: boolean }> => {
    return apiRequest<{ valid: boolean }>(`/auth/verify-reset-token/${token}`, {
      skipAuthRedirect: true,
    });
  },
  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
      skipAuthRedirect: true,
    });
  },
};

// Expenses API
export const expensesApi = {
  getAll: async (filters?: ExpenseFilters): Promise<Expense[]> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.creditCardId) params.append('creditCardId', filters.creditCardId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<Expense[]>(`/expenses${query}`);
  },
  getById: async (id: string): Promise<Expense> => {
    return apiRequest<Expense>(`/expenses/${id}`);
  },
  create: async (data: CreateExpenseDto): Promise<Expense> => {
    return apiRequest<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: UpdateExpenseDto): Promise<Expense> => {
    return apiRequest<Expense>(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<Expense> => {
    return apiRequest<Expense>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },
};

// Credit Cards API
export const creditCardsApi = {
  getAll: async (): Promise<CreditCard[]> => {
    return apiRequest<CreditCard[]>('/credit-cards');
  },
  getById: async (id: string): Promise<CreditCard> => {
    return apiRequest<CreditCard>(`/credit-cards/${id}`);
  },
  create: async (data: CreateCreditCardDto): Promise<CreditCard> => {
    return apiRequest<CreditCard>('/credit-cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: UpdateCreditCardDto): Promise<CreditCard> => {
    return apiRequest<CreditCard>(`/credit-cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<CreditCard> => {
    return apiRequest<CreditCard>(`/credit-cards/${id}`, {
      method: 'DELETE',
    });
  },
};

// Categories API
export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    return apiRequest<Category[]>('/categories');
  },
  getById: async (id: string): Promise<Category> => {
    return apiRequest<Category>(`/categories/${id}`);
  },
  create: async (data: CreateCategoryDto): Promise<Category> => {
    return apiRequest<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: UpdateCategoryDto): Promise<Category> => {
    return apiRequest<Category>(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<Category> => {
    return apiRequest<Category>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};

// Budget API
export const budgetApi = {
  get: async (): Promise<Budget> => {
    return apiRequest<Budget>('/budget');
  },
  createItem: async (data: CreateBudgetItemDto): Promise<BudgetItem> => {
    return apiRequest<BudgetItem>('/budget/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateItem: async (
    id: string,
    data: UpdateBudgetItemDto
  ): Promise<BudgetItem> => {
    return apiRequest<BudgetItem>(`/budget/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteItem: async (id: string): Promise<BudgetItem> => {
    return apiRequest<BudgetItem>(`/budget/items/${id}`, {
      method: 'DELETE',
    });
  },
};

// Budgets API (multiple budgets per user)
export const budgetKeys = {
  all: ['budgets'] as const,
  list: (archived: boolean) => ['budgets', { archived }] as const,
  detail: (id: string) => ['budgets', id] as const,
};

export const budgetsApi = {
  list: async (archived = false): Promise<BudgetSummary[]> => {
    return apiRequest<BudgetSummary[]>(`/budgets?archived=${archived}`);
  },
  get: async (id: string): Promise<Budget> => {
    return apiRequest<Budget>(`/budgets/${id}`);
  },
  create: async (data: CreateBudgetDto): Promise<Budget> => {
    return apiRequest<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: UpdateBudgetDto): Promise<Budget> => {
    return apiRequest<Budget>(`/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  remove: async (id: string): Promise<Omit<Budget, 'items'>> => {
    return apiRequest<Omit<Budget, 'items'>>(`/budgets/${id}`, {
      method: 'DELETE',
    });
  },
  createItem: async (
    budgetId: string,
    data: CreateBudgetItemDto
  ): Promise<BudgetItem> => {
    return apiRequest<BudgetItem>(`/budgets/${budgetId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateItem: async (
    itemId: string,
    data: UpdateBudgetItemDto
  ): Promise<BudgetItem> => {
    return apiRequest<BudgetItem>(`/budgets/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteItem: async (itemId: string): Promise<BudgetItem> => {
    return apiRequest<BudgetItem>(`/budgets/items/${itemId}`, {
      method: 'DELETE',
    });
  },
};
