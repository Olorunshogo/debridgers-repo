import { AnimatePresence, motion } from "framer-motion";
import { Heart, Minus, Package, Plus, ShoppingCart } from "lucide-react";
import {
  cartControlVariants,
  fadeUpVariants,
  springPanel,
  staggerDelay,
} from "../lib/motion/variants";

export interface ProductCardProduct {
  id: number;
  name: string;
  unit: string;
  price_kobo: number;
  description: string | null;
  image_url: string | null;
  category?: string | null;
}

/*
 * `isFavorite` and `onToggleFavorite` are optional together, so this component
 * stays usable where favouriting does not apply. Omit `onToggleFavorite` and no
 * heart renders at all - the card knows nothing about who is signed in, which
 * is the consumer's business.
 */
interface ProductCardProps {
  product: ProductCardProduct;
  /*
   * The quantity actually in the cart. 0 means not in the cart, which is what
   * swaps the button for the stepper - there is deliberately no separate
   * `inCart` flag, so the two can never disagree.
   */
  quantityInCart: number;
  formattedPrice: string;
  /** Index in the grid, used to stagger the entrance. */
  animationIndex: number;
  onAddToCart: () => void;
  onIncrement: () => void;
  /** At a quantity of 1 this removes the item from the cart. */
  onDecrement: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

/* Keeps the button and the stepper the same height so the grid does not reflow
   when one slides in to replace the other. */
const CONTROL_SLOT_HEIGHT = "h-9";

export function ProductCard({
  product,
  quantityInCart,
  formattedPrice,
  animationIndex,
  onAddToCart,
  onIncrement,
  onDecrement,
  isFavorite = false,
  onToggleFavorite,
}: ProductCardProps) {
  const inCart = quantityInCart > 0;

  return (
    <motion.div
      variants={fadeUpVariants}
      initial="initial"
      animate="animate"
      transition={staggerDelay(animationIndex)}
      className="border-line flex h-full flex-col overflow-hidden rounded-2xl border bg-white"
    >
      <div className="bg-light-bg relative h-40 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package size={44} className="text-body opacity-15" />
          </div>
        )}

        {/*
          Category when we have one, pack size otherwise. Short labels only -
          this used to render `description`, which is sentence-length copy and
          overflowed the pill.
        */}
        <span className="text-heading absolute top-2.5 left-2.5 rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
          {product.category ?? product.unit}
        </span>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite
                ? `Remove ${product.name} from favourites`
                : `Save ${product.name} to favourites`
            }
            className="absolute top-2.5 right-2.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/85 backdrop-blur-sm transition-transform hover:scale-110"
          >
            <Heart
              size={16}
              /* Filled when saved, outline when not - the fill is the state. */
              className={
                isFavorite ? "fill-error-red text-error-red" : "text-heading"
              }
            />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/*
          The text block absorbs all slack, so price and the cart control sit on
          the floor of every card regardless of how long the name or description
          runs. That is what keeps a row of cards visually aligned without
          propping anything up with a fixed height.
        */}
        <div className="flex flex-1 flex-col gap-1.5">
          <p className="font-syne text-heading line-clamp-2 text-base leading-snug font-bold">
            {product.name}
          </p>

          {product.description && (
            <p className="text-body line-clamp-3 flex-1 text-sm leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <p className="font-syne text-heading text-lg font-bold">
          {formattedPrice}
        </p>

        <div className={`relative ${CONTROL_SLOT_HEIGHT}`}>
          <AnimatePresence mode="wait" initial={false}>
            {inCart ? (
              <motion.div
                key="stepper"
                variants={cartControlVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springPanel}
                className="border-primary absolute inset-0 flex items-center justify-between rounded-full border px-1"
              >
                <button
                  type="button"
                  onClick={onDecrement}
                  aria-label={
                    quantityInCart === 1
                      ? `Remove ${product.name} from cart`
                      : `Decrease quantity of ${product.name}`
                  }
                  /*
                   * Fills on hover to match the increment button's resting
                   * state. Without it the minus reads as inert next to a solid
                   * plus, and users miss that it is the control for removing.
                   */
                  className="text-primary hover:bg-primary flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:text-white"
                >
                  <Minus size={14} />
                </button>

                <span
                  aria-live="polite"
                  className="text-heading text-sm font-semibold"
                >
                  {quantityInCart} in cart
                </span>

                <button
                  type="button"
                  onClick={onIncrement}
                  aria-label={`Increase quantity of ${product.name}`}
                  className="bg-primary flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white transition-opacity hover:opacity-85"
                >
                  <Plus size={14} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                type="button"
                onClick={onAddToCart}
                variants={cartControlVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springPanel}
                className="bg-primary absolute inset-0 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-85"
              >
                <ShoppingCart size={13} /> Add to cart
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
