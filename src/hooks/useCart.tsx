import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const searchProduct = async (id: number) => {
    const productResponse = await api.get<Product>(`/products/${id}`);
    return productResponse.data;
  };

  const searchStock = async (id: number) => {
    const inStockResponse = await api.get<Stock>(`/stock/${id}`);
    return inStockResponse.data;
  };

  const updateCart = (c: Product[]) => {
    setCart(c);
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(c));
  };

  const addProduct = async (productId: number) => {
    try {
      let productInCart = cart.filter((item) => item.id === productId);
      let newItemToCart: Product = {} as Product;

      if (productInCart.length === 0) {
        const productResponse = await searchProduct(productId);
        newItemToCart = { ...productResponse, amount: 1 };
      }

      if (productInCart.length > 0) {
        newItemToCart = {
          ...productInCart[0],
          amount: productInCart[0].amount + 1,
        };
      }

      const inStock = await searchStock(productId);

      if (newItemToCart.amount > inStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productInCart.length === 0) {
        updateCart([...cart, newItemToCart]);
      }

      if (productInCart.length > 0) {
        const newCart = cart.map((item) =>
          item.id !== productId ? item : newItemToCart
        );
        updateCart(newCart);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let productInCart = cart.filter((item) => item.id === productId);
      if (productInCart.length === 0) {
        throw new Error();
      }

      const newCart = cart.filter((item) => item.id !== productId);
      updateCart(newCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return;
      }

      let productInCart = cart.filter((item) => item.id === productId);
      let newItemToCart: Product = {} as Product;

      if (productInCart.length === 0) {
        throw new Error();
      }

      if (productInCart.length > 0) {
        newItemToCart = {
          ...productInCart[0],
          amount: amount <= 0 ? 0 : amount,
        };
      }

      const inStock = await searchStock(productId);

      if (newItemToCart.amount > inStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productInCart.length === 0) {
        updateCart([...cart, newItemToCart]);
      }

      if (productInCart.length > 0) {
        const newCart = cart.map((item) =>
          item.id !== productId ? item : newItemToCart
        );
        updateCart(newCart);
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
