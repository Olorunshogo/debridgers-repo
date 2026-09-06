import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@debridgers/api-client";
import { useAuth, type ProductCardProduct } from "@debridgers/ui-web";

/*
 * Favourites: explicit bookmarks, kept server-side because they are meant to
 * follow the account across devices.
 *
 * Distinct from "buy again", which is derived from order history. A favourite
 * is a stated intention; a frequent purchase is observed behaviour. Conflating
 * them makes the heart unpredictable.
 *
 * Requires a session, so for anonymous visitors this reports `canFavorite:
 * false` and the shop hides the heart rather than showing a control that
 * always fails.
 */

export interface UseFavoritesResult {
  favorites: ProductCardProduct[];
  favoriteIds: ReadonlySet<number>;
  isFavorite: (productId: number) => boolean;
  toggleFavorite: (productId: number) => Promise<void>;
  canFavorite: boolean;
  isLoading: boolean;
}

export function useFavorites(): UseFavoritesResult {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<ProductCardProduct[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavorites([]);
      setFavoriteIds(new Set());
      return;
    }

    setIsLoading(true);
    apiFetch<ProductCardProduct[]>("/buyer/favorites")
      .then((rows) => {
        setFavorites(rows);
        setFavoriteIds(new Set(rows.map((row) => row.id)));
      })
      .catch(() => {
        /* A failed read should not break the shop - just no hearts filled. */
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const isFavorite = useCallback(
    (productId: number): boolean => favoriteIds.has(productId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (productId: number): Promise<void> => {
      if (!isAuthenticated) return;

      const wasFavorite = favoriteIds.has(productId);

      /*
       * Optimistic: the heart must respond on the tap, not after a round trip.
       * Reverted below if the request fails.
       */
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(productId);
        else next.add(productId);
        return next;
      });

      try {
        await apiFetch(`/buyer/favorites/${productId}`, {
          method: wasFavorite ? "DELETE" : "POST",
        });
      } catch {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(productId);
          else next.delete(productId);
          return next;
        });
      }
    },
    [isAuthenticated, favoriteIds],
  );

  return {
    favorites,
    favoriteIds,
    isFavorite,
    toggleFavorite,
    canFavorite: isAuthenticated,
    isLoading,
  };
}
