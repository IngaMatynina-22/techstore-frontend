import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'techstore.customer.cart'

export type CartItem = {
  productId: number
  productName: string
  variantId: number
  variantName: string
  sku: string
  unitPrice: number
  quantity: number
}

type CartState = {
  items: CartItem[]
  itemCount: number
  total: number
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  setQuantity: (variantId: number, quantity: number) => void
  removeItem: (variantId: number) => void
  clear: () => void
}

const CartContext = createContext<CartState | null>(null)

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const qty = item.quantity ?? 1
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId)
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, quantity: i.quantity + qty } : i,
        )
      }
      return [...prev, { ...item, quantity: qty }]
    })
  }, [])

  const setQuantity = useCallback((variantId: number, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.variantId !== variantId)
      return prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
    })
  }, [])

  const removeItem = useCallback((variantId: number) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartState>(() => {
    const itemCount = items.reduce((s, i) => s + i.quantity, 0)
    const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    return { items, itemCount, total, addItem, setQuantity, removeItem, clear }
  }, [items, addItem, setQuantity, removeItem, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart outside CartProvider')
  return ctx
}
