import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(() => {
    if(cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])
  

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]

      const response = await api.get(`/stock/${productId}`)

      const {amount} = response.data as Stock 

      const productExists = updatedCart.find((product) => product.id === productId);
      
      if(productExists && productExists.amount >= amount){
          toast.error('Quantidade solicitada fora de estoque');
          return
      }
      
      if (productExists) {
        productExists.amount += 1;

        const addedProductIndex = updatedCart.findIndex((product) => product.id === productId)

        updatedCart[addedProductIndex] = productExists

        setCart(updatedCart)

        
      } else {
        const response = await api.get(`/products/${productId}`)

        const product = response.data as Product 

        const newProduct = { 
          ...product,
          amount: 1,
        }

        setCart(oldState => [...oldState, newProduct])
      }

    } catch {
      toast.error('Erro na adição do produto');
      return
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]

      const removedProductIndex = updatedCart.findIndex((product) => product.id === productId)

      if(removedProductIndex >=0){        
        updatedCart.splice(removedProductIndex,1)
        setCart(updatedCart)
      } else{
        throw Error()
      }

       
    } catch {
      toast.error('Erro na remoção do produto');
      return
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount <= 0) return
     
      const stockResponse = await api.get(`/stock/${productId}`)

      const stockAmount = stockResponse.data as Stock 
    
      if(amount > stockAmount.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const updatedCart = [...cart]

      const productExists = updatedCart.findIndex((product) => product.id === productId)
    
      if(productExists>=0) {       
        updatedCart[productExists].amount = amount
        setCart(updatedCart)
      } else{
        throw Error()
      }
     
    } catch (err){
      console.error(err)
      toast.error('Erro na alteração de quantidade do produto');
      return
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
