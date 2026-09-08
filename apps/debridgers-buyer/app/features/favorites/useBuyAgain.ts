import { useEffect, useState } from "react";
import { apiFetch } from "@debridgers/api-client";
import { useAuth, type ProductCardProduct } from "@debridgers/ui-web";

/*
 * "Buy again": the products this buyer orders most, ranked server-side by frequency then recency from their order history.
 *
 * Not a stored list and not the same as favourites - nobody has to remember to bookmark their usual bag of rice for it to show up here.
 */

export interface BuyAgainProduct extends ProductCardProduct {
  times_ordered: number;
}

/* `hasHistory` is false until the buyer has ordered something, so the rail can hide. */
export interface UseBuyAgainResult {
  products: BuyAgainProduct[];
  isLoading: boolean;
  hasHistory: boolean;
}

export function useBuyAgain(): UseBuyAgainResult {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<BuyAgainProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    apiFetch<BuyAgainProduct[]>("/buyer/buy-again")
      .then(setProducts)
      .catch(() => {
        /* No history yet, or the call failed - the rail simply does not show. */
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  return { products, isLoading, hasHistory: products.length > 0 };
}
