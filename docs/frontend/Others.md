The plan already in TASKS.md (Option A) is the right call - it's the industry-standard e-commerce pattern for good reason.

Recommendation: Public shop on the landing page, no auth required to browse or add to cart. Gate only at the moment they hit "Checkout" - show a modal (not a redirect), so the cart and page context are fully preserved when they come back. Once logged in, the header "Sign Up" button becomes a "Go to Dashboard" link.

The core insight is timing the ask at peak intent. A user who has already picked products and is ready to pay will tolerate a signup step. That same user asked to sign up just to look at rice prices will just leave. Redirecting them to the dashboard to place the order (Option B) is the worst of both worlds - it breaks the context, the cart, and the visual continuity all at once.

The one tradeoff with Option A is the cart merge complexity on login (localStorage → backend), but that's a one-time engineering cost and the UX gain is permanent. Every major e-commerce store (Amazon, Jumia, Shopify stores) runs this exact pattern.

So the flow in order:

1. Landing page → /shop (no auth, fully public)
2. Browse, add to cart (localStorage, no API calls)
3. Click "Checkout" → modal asks to log in or sign up
4. On success → modal closes, cart is intact, proceed to payment
5. Header link: isAuthenticated === false → "Sign Up" | isAuthenticated === true → "Dashboard" (role-based route)
