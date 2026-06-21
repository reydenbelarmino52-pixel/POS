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

export function isDrinkProduct(p: { name: string; categoryName?: string }): boolean {
  const name = p.name.toLowerCase();
  const cat = (p.categoryName || '').toLowerCase();
  
  // Specific milktea flavors/names
  const milkteaFlavors = [
    'okinawa', 'wintermelon', 'hokkaido', 'taro', 'matcha', 'milktea', 'milk tea', 
    'macchiato', 'latte', 'frappe', 'cookies and cream', 'cookies & cream', 'cookies n cream',
    'dark chocolate', 'salted caramel', 'red velvet', 'hazelnut', 'thai tea', 'brown sugar',
    'cream cheese', 'rock salt', 'oreo', 'cheesecake', 'yakult'
  ];

  // If name or category has an explicit milk tea flavor / drink category, classify as drink first
  const isExplicitMilkteaFlavor = milkteaFlavors.some(flavor => name.includes(flavor));
  const isExplicitDrinkCategory = ['tea', 'milktea', 'milk tea', 'beverage', 'drink', 'frappe', 'shake', 'smoothie', 'coffee', 'juice'].some(keyword => cat.includes(keyword));

  if (isExplicitMilkteaFlavor || isExplicitDrinkCategory) {
    // If it has explicitly food terms like Waffle, Burger, Pancake, Cake, Fries, let's keep it as food
    const foodOverrides = ['waffle', 'burger', 'sandwich', 'fries', 'pasta', 'spaghetti', 'pastry', 'cookie ', 'cookie\n', 'cookie\t'];
    const hasFoodOverride = foodOverrides.some(fo => {
      if (fo === 'cookie ') {
        // Only override if word cookie is standalone and not part of cookies and cream
        return name.includes('cookie') && !name.includes('cookies and cream') && !name.includes('cookies & cream') && !name.includes('cookies n cream');
      }
      return name.includes(fo);
    });
    
    if (!hasFoodOverride) {
      return true;
    }
  }

  // Fallback to keyword classification
  const drinkKeywords = [
    'tea', 'coffee', 'frappe', 'shake', 'beverage', 'drink', 'juice', 'smoothie', 
    'macchiato', 'latte', 'cappuccino', 'espresso', 'matcha', 'soda', 'milk', 'lemonade',
    'cooler', 'yakult', 'fizz', 'mocha', 'brewed', 'cold brew', 'chocolate', 'cocoa',
    'milktea', 'beverages', 'drinks', 'smoothies', 'beers', 'wine', 'alcohol', 'water'
  ];
  
  const foodKeywords = [
    'burger', 'sandwich', 'fries', 'pasta', 'spaghetti', 'waffle', 'snack', 'food', 
    'side', 'nachos', 'chicken', 'rice', 'meal', 'hotdog', 'pizza', 'donut', 'pastry',
    'cake', 'shawarma', 'wrap', 'quesadilla', 'bun', 'croissant', 'muffin',
    'biscuit', 'carbonara', 'pancit', 'lugaw', 'sopas', 'lumpia', 'overload', 'melt',
    'patty', 'patties', 'sirloin', 'beef', 'pork'
  ];

  // Specific check for cookies & cream and oreo so it doesn't get flagged as default "cookie" food
  const isCookiesAndCreamException = name.includes('cookies and cream') || name.includes('cookies & cream') || name.includes('cookies n cream') || name.includes('oreo');

  const hasFoodKeyword = foodKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || (!isCookiesAndCreamException && (name.includes('cookie') || cat.includes('cookie')));
  if (hasFoodKeyword) {
    return false;
  }

  const hasDrinkKeyword = drinkKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || isCookiesAndCreamException;
  if (hasDrinkKeyword) {
    return true;
  }

  return false;
}

export function usePOS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);

  const addToCart = useCallback((
    product: Product, 
    sugarLevel?: number, 
    iceLevel?: string, 
    addons: Addon[] = [], 
    selectedSize: string = 'Regular',
    priceOverride?: number
  ) => {
    setCart(prev => {
      const addonKey = addons.map(a => a.name).sort().join(',');
      const finalPrice = priceOverride !== undefined ? priceOverride : product.price;
      
      const isBeverage = isDrinkProduct(product);
      const sLevel = isBeverage ? (sugarLevel !== undefined ? sugarLevel : 100) : undefined;
      const iLevel = isBeverage ? (iceLevel !== undefined ? iceLevel : 'Normal') : undefined;

      const existing = prev.find(item => 
        item.id === product.id && 
        item.sugarLevel === sLevel && 
        item.iceLevel === iLevel &&
        item.selectedSize === selectedSize &&
        (item.addons || []).map(a => a.name).sort().join(',') === addonKey
      );

      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => 
          (item.id === product.id && 
           item.sugarLevel === sLevel && 
           item.iceLevel === iLevel &&
           item.selectedSize === selectedSize &&
           (item.addons || []).map(a => a.name).sort().join(',') === addonKey
          ) ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, price: finalPrice, quantity: 1, sugarLevel: sLevel, iceLevel: iLevel, addons, selectedSize }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, sugarLevel?: number, iceLevel?: string, addons?: Addon[], selectedSize?: string) => {
    const addonKey = addons?.map(a => a.name).sort().join(',');
    setCart(prev => prev.filter(item => {
      const match = item.id === productId && 
                   item.sugarLevel === sugarLevel &&
                   item.iceLevel === iceLevel &&
                   (selectedSize === undefined || item.selectedSize === selectedSize) &&
                   (addonKey === undefined || (item.addons || []).map(a => a.name).sort().join(',') === addonKey);
      return !match;
    }));
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number, sugarLevel?: number, iceLevel?: string, addons?: Addon[], selectedSize?: string) => {
    const addonKey = addons?.map(a => a.name).sort().join(',');
    setCart(prev => {
      const idx = prev.findIndex(item => 
        item.id === productId && 
        item.sugarLevel === sugarLevel &&
        item.iceLevel === iceLevel &&
        (selectedSize === undefined || item.selectedSize === selectedSize) &&
        (addonKey === undefined || (item.addons || []).map(a => a.name).sort().join(',') === addonKey)
      );
      if (idx === -1) return prev;
      
      const item = prev[idx];
      const newQty = item.quantity + delta;
      
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      
      if (newQty > item.stock) return prev;
      
      const newCart = [...prev];
      newCart[idx] = { ...item, quantity: newQty };
      return newCart;
    });
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
  // Apply 20% Discount directly on the subtotal
  const vatExemptSales = rawSubtotal;
  const scDiscount = isSeniorCitizen ? rawSubtotal * 0.20 : 0;
  const tax = 0;
  const total = rawSubtotal - scDiscount;

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
