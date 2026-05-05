import { useState, useCallback } from 'react';

export interface Product {
  id: string;
  name: string;
  type: 'product' | 'supply';
  price: number;
  stock: number;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
}

export interface Addon {
  id?: string;
  name: string;
  price: number;
}

export interface CartItem extends Product {
  quantity: number;
  sugarLevel?: number; // 0, 25, 50, 75, 100
  iceLevel?: string;   // Normal, Less, No Ice, More Ice
  addons?: Addon[];    
  selectedSize?: string;
}

export function usePOS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);

  const addToCart = useCallback((
    product: Product, 
    sugarLevel: number = 100, 
    iceLevel: string = 'Normal', 
    addons: Addon[] = [], 
    selectedSize: string = 'Regular',
    priceOverride?: number
  ) => {
    setCart(prev => {
      const addonKey = addons.map(a => a.name).sort().join(',');
      const finalPrice = priceOverride !== undefined ? priceOverride : product.price;
      
      const existing = prev.find(item => 
        item.id === product.id && 
        item.sugarLevel === sugarLevel && 
        item.iceLevel === iceLevel &&
        item.selectedSize === selectedSize &&
        (item.addons || []).map(a => a.name).sort().join(',') === addonKey
      );

      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => 
          (item.id === product.id && 
           item.sugarLevel === sugarLevel && 
           item.iceLevel === iceLevel &&
           item.selectedSize === selectedSize &&
           (item.addons || []).map(a => a.name).sort().join(',') === addonKey
          ) ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, price: finalPrice, quantity: 1, sugarLevel, iceLevel, addons, selectedSize }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, sugarLevel?: number, iceLevel?: string, addons?: Addon[], selectedSize?: string) => {
    const addonKey = addons?.map(a => a.name).sort().join(',');
    setCart(prev => prev.filter(item => {
      const match = item.id === productId && 
                   (sugarLevel === undefined || item.sugarLevel === sugarLevel) &&
                   (iceLevel === undefined || item.iceLevel === iceLevel) &&
                   (selectedSize === undefined || item.selectedSize === selectedSize) &&
                   (addonKey === undefined || (item.addons || []).map(a => a.name).sort().join(',') === addonKey);
      return !match;
    }));
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number, sugarLevel?: number, iceLevel?: string, addons?: Addon[], selectedSize?: string) => {
    const addonKey = addons?.map(a => a.name).sort().join(',');
    setCart(prev => prev.map(item => {
      const match = item.id === productId && 
                   (sugarLevel === undefined || item.sugarLevel === sugarLevel) &&
                   (iceLevel === undefined || item.iceLevel === iceLevel) &&
                   (selectedSize === undefined || item.selectedSize === selectedSize) &&
                   (addonKey === undefined || (item.addons || []).map(a => a.name).sort().join(',') === addonKey);
      
      if (match) {
        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > item.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setIsSeniorCitizen(false);
  }, []);

  const rawSubtotal = cart.reduce((acc, item) => {
    let itemTotal = item.price * item.quantity;
    
    if (item.addons) {
      item.addons.forEach(addon => {
        itemTotal += (addon.price || 0) * item.quantity;
      });
    }

    return acc + itemTotal;
  }, 0);
  
  // Philippine Senior Citizen / PWD Discount Logic:
  // 1. Remove 12% VAT (Vat-Exempt Sales)
  // 2. Apply 20% Discount on the VAT-exempt amount
  const vatExemptSales = isSeniorCitizen ? rawSubtotal / 1.12 : rawSubtotal;
  const scDiscount = isSeniorCitizen ? vatExemptSales * 0.20 : 0;
  const tax = isSeniorCitizen ? 0 : rawSubtotal * 0.12;
  const total = isSeniorCitizen ? vatExemptSales - scDiscount : rawSubtotal + tax;

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal: rawSubtotal,
    vatExemptSales,
    scDiscount,
    tax,
    total,
    isSeniorCitizen,
    setIsSeniorCitizen
  };
}
