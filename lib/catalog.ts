// Single source of truth for the product catalog.
// Pure data — safe for both client and server bundles.
// The SERVER remains the price authority (checkout never trusts the client).

export type ProductCategory =
  | "diamonds"
  | "weekly-pass"
  | "twilight-pass"
  | "starlight"
  | "bundle";

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  bonus: string;
  image: string;
  /** Filter group for the top-up grid (Select Top-Up tabs). */
  category: ProductCategory;
}

export const PRODUCTS: CatalogProduct[] = [
  { id: '1', name: '78 Diamonds', price: 1.35, bonus: '8 Diamonds', image: '/products/diamantes.png', category: 'diamonds' },
  { id: '2', name: '156 Diamonds', price: 2.69, bonus: '16 Diamonds', image: '/products/baul.png', category: 'diamonds' },
  { id: '3', name: '234 Diamonds', price: 4.03, bonus: '23 Diamonds', image: '/products/baul1.png', category: 'diamonds' },
  { id: '4', name: '390 Diamonds', price: 6.72, bonus: '39 Diamonds', image: '/products/baul2.png', category: 'diamonds' },
  { id: '5', name: '625 Diamonds', price: 10.75, bonus: '81 Diamonds', image: '/products/baul3.png', category: 'diamonds' },
  { id: '9', name: '1085 Diamonds', price: 16.79, bonus: '153 Diamonds', image: '/products/baul4.png', category: 'diamonds' },
  { id: '6', name: '2195 Diamonds', price: 33.7, bonus: '305 Diamonds', image: '/products/baul5.png', category: 'diamonds' },
  { id: '10', name: '5532 Diamonds', price: 83.11, bonus: '843 Diamonds', image: '/products/baul6.png', category: 'diamonds' },
  { id: '7', name: 'Twilight Pass', price: 9.99, bonus: '', image: '/products/pass5.png', category: 'twilight-pass' },
  { id: '8', name: 'Weekly Diamond Pass', price: 1.99, bonus: 'Save 60%', image: '/products/pass1.png', category: 'weekly-pass' },
];

export function getProductById(id: string): CatalogProduct | undefined {
  return PRODUCTS.find((product) => product.id === id);
}