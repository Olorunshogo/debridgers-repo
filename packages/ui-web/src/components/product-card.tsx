import { motion } from "framer-motion";
import { Minus, Package, Plus, ShoppingCart } from "lucide-react";

export interface ProductCardProduct {
  id: number;
  name: string;
  unit: string;
  price_kobo: number;
  description: string | null;
  image_url: string | null;
}

interface ProductCardProps {
  product: ProductCardProduct;
  quantity: number;
  inCart: boolean;
  formattedPrice: string;
  animationDelay: number;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  onAddToCart: () => void;
}

export function ProductCard({
  product,
  quantity,
  inCart,
  formattedPrice,
  animationDelay,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onAddToCart,
}: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className="border-gray-border h-full overflow-hidden rounded-2xl border bg-white"
    >
      <div className="bg-bg-light relative h-40 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package size={44} className="text-text opacity-15" />
          </div>
        )}

        {product.description && (
          <span className="text-heading absolute top-2.5 left-2.5 rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
            {product.description}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex flex-col gap-1">
          <p className="font-syne text-heading text-sm leading-snug font-bold">
            {product.name}
          </p>

          {product.description && (
            <p className="text-text flex-1 text-xs">{product.description}</p>
          )}
        </div>

        <p className="font-syne text-heading text-lg font-bold">
          {formattedPrice}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 items-center justify-between gap-3">
            <span className="border-gray-border bg-bg-light text-text rounded-lg border px-2 py-1 text-xs font-medium">
              {product.unit}
            </span>

            <div className="border-gray-border flex items-center rounded-lg border">
              <button
                type="button"
                onClick={onDecreaseQuantity}
                className="text-heading cursor-pointer px-2 py-1 text-xs hover:opacity-60"
              >
                <Minus size={10} />
              </button>

              <span className="text-heading w-5 text-center text-xs font-semibold">
                {quantity}
              </span>

              <button
                type="button"
                onClick={onIncreaseQuantity}
                className="text-heading cursor-pointer px-2 py-1 text-xs hover:opacity-60"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddToCart}
            className="bg-primary flex min-w-[100px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-85"
          >
            {inCart ? (
              <>
                <Plus size={11} /> Add more
              </>
            ) : (
              <>
                <ShoppingCart size={11} /> Add to cart
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
