// Single source of truth for the product catalog.
// Pure data — safe for both client and server bundles.
// The SERVER remains the price authority (checkout never trusts the client).

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  bonus: string;
  image: string;
}

export const PRODUCTS: CatalogProduct[] = [
  { id: '1', name: '86 Diamonds', price: 1.49, bonus: '8 Diamonds', image: '/products/mlbb1.jpg' },
  { id: '2', name: '172 Diamonds', price: 2.99, bonus: '16 Diamonds', image: '/products/mlbb2.jpg' },
  { id: '3', name: '257 Diamonds', price: 4.49, bonus: '24 Diamonds', image: '/products/mlbb3.jpg' },
  { id: '4', name: '429 Diamonds', price: 7.49, bonus: '40 Diamonds', image: '/products/mlbb4.jpg' },
  { id: '5', name: '706 Diamonds', price: 11.99, bonus: '66 Diamonds', image: '/products/mlbb5.jpg' },
  { id: '6', name: '2195 Diamonds', price: 34.99, bonus: '205 Diamonds', image: '/products/mlbb5.jpg' },
  { id: '7', name: 'Twilight Pass', price: 9.99, bonus: '', image: '/products/mlbbtp.jpg' },
  { id: '8', name: 'Weekly Diamond Pass', price: 1.99, bonus: 'Save 60%', image: '/products/mlbbwdp.jpg' },
];

export function getProductById(id: string): CatalogProduct | undefined {
  return PRODUCTS.find((product) => product.id === id);
}