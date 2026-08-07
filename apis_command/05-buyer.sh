#!/bin/bash
# Buyer Module - Buyer shopping, orders, cart
# Base URL: http://localhost:4001/api/v1/buyer

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== BUYER ENDPOINTS ===${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 1. GET SHOPPING CART
echo -e "${GREEN}1. GET MY CART${NC}"
curl -s -X GET http://localhost:4001/api/v1/buyer/cart \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}2. ADD TO CART${NC}"
curl -s -X POST http://localhost:4001/api/v1/buyer/cart \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "quantity": 5
  }' | jq .

echo -e "\n${GREEN}3. UPDATE CART ITEM QUANTITY${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/buyer/cart/1 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 10
  }' | jq .

echo -e "\n${GREEN}4. REMOVE FROM CART${NC}"
curl -s -X DELETE http://localhost:4001/api/v1/buyer/cart/1 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${GREEN}5. CLEAR CART${NC}"
curl -s -X DELETE http://localhost:4001/api/v1/buyer/cart \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${GREEN}6. GET FAVORITES${NC}"
curl -s -X GET http://localhost:4001/api/v1/buyer/favorites \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${GREEN}7. ADD TO FAVORITES${NC}"
curl -s -X POST http://localhost:4001/api/v1/buyer/favorites \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1
  }' | jq .

echo -e "\n${GREEN}8. REMOVE FROM FAVORITES${NC}"
curl -s -X DELETE http://localhost:4001/api/v1/buyer/favorites/1 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${GREEN}9. GET MY ORDERS${NC}"
curl -s -X GET http://localhost:4001/api/v1/buyer/orders \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${GREEN}10. GET ORDER DETAILS${NC}"
curl -s -X GET http://localhost:4001/api/v1/buyer/orders/42 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${GREEN}11. CREATE ORDER (Checkout)${NC}"
echo "First step of checkout - creates pending order"
curl -s -X POST http://localhost:4001/api/v1/buyer/orders \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": 1,
    "delivery_address": "123 Ikoyi Lane, Lagos",
    "notes": "Please call before delivery"
  }' | jq .

echo -e "\n${GREEN}12. CANCEL ORDER${NC}"
echo "Only works if order is still pending"
curl -s -X PATCH http://localhost:4001/api/v1/buyer/orders/42/cancel \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Found cheaper elsewhere"
  }' | jq .

echo -e "\n${GREEN}13. GET ORDER QUOTE${NC}"
echo "Calculate total before checkout (delivery fee, taxes, etc)"
curl -s -X POST http://localhost:4001/api/v1/buyer/orders/quote \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": 1,
    "product_quantities": {
      "1": 5,
      "2": 10
    }
  }' | jq .

echo -e "\n${GREEN}14. APPLY REFERRAL CODE${NC}"
echo "Apply agent referral code during checkout"
curl -s -X POST http://localhost:4001/api/v1/buyer/referral/apply \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_code": "AGENT-A3F2B1C9"
  }' | jq .

echo -e "\n${GREEN}15. GET PROFILE${NC}"
curl -s -X GET http://localhost:4001/api/v1/buyer/profile \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${GREEN}16. UPDATE PROFILE${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/buyer/profile \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "08098765432",
    "delivery_address": "New address"
  }' | jq .

echo -e "\n${BLUE}=== WALLET ENDPOINTS ===${NC}\n"

echo -e "${GREEN}17. GET WALLET BALANCE & TRANSACTIONS${NC}"
curl -s -X GET "http://localhost:4001/api/v1/buyer/wallet?page=1&limit=10" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${GREEN}18. INITIATE WALLET DEPOSIT (₦200 min)${NC}"
echo "Min: ₦200 (20,000 kobo) | Max: ₦100,000 (10,000,000 kobo)"
curl -s -X POST http://localhost:4001/api/v1/buyer/wallet/deposit \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_kobo": 20000
  }' | jq .

echo -e "\n${GREEN}19. CONFIRM WALLET DEPOSIT${NC}"
echo "Called by Paystack webhook"
curl -s -X POST http://localhost:4001/api/v1/buyer/wallet/deposit/confirm \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "paystack_order_123_1691234567"
  }' | jq .

echo -e "\n${BLUE}=== ORDER PAYMENT ENDPOINTS ===${NC}\n"

echo -e "${GREEN}20. PAY ORDER WITH WALLET${NC}"
echo "Requires X-Payment-Key headers (2 keys)"
curl -s -X POST http://localhost:4001/api/v1/buyer/orders/42/pay \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Payment-Key: payment_key_1_change_in_production" \
  -H "X-Payment-Key_2: payment_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "wallet",
    "amount_kobo": 50000
  }' | jq .

echo -e "\n${GREEN}21. PAY ORDER WITH PAYSTACK${NC}"
echo "Returns checkout URL"
curl -s -X POST http://localhost:4001/api/v1/buyer/orders/42/pay \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Payment-Key: payment_key_1_change_in_production" \
  -H "X-Payment-Key_2: payment_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "paystack",
    "amount_kobo": 50000
  }' | jq .

echo -e "\n${GREEN}22. CANCEL ORDER${NC}"
echo "Only works if order is pending/unpaid"
curl -s -X POST http://localhost:4001/api/v1/buyer/orders/42/cancel \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Found cheaper elsewhere"
  }' | jq .

echo -e "\n${GREEN}23. REQUEST REFUND${NC}"
echo "Only works if order is already paid"
curl -s -X POST http://localhost:4001/api/v1/buyer/orders/42/refund \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Product arrived damaged, needs replacement"
  }' | jq .

echo -e "\n${BLUE}=== NOTIFICATIONS ENDPOINTS ===${NC}\n"

echo -e "${GREEN}24. GET NOTIFICATIONS${NC}"
curl -s -X GET "http://localhost:4001/api/v1/buyer/notifications?page=1&limit=10" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${GREEN}25. MARK NOTIFICATION AS READ${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/buyer/notifications/1/read \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${GREEN}26. MARK ALL NOTIFICATIONS AS READ${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/buyer/notifications/mark-all/read \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Key: request_key_change_in_production" | jq .

echo -e "\n${BLUE}=== NOTES ===${NC}"
echo "• Cart: Manage shopping cart before checkout"
echo "• Favorites: Save products for later purchase"
echo "• Orders: View order history and status"
echo "• Create Order: First step - creates pending order from cart"
echo "• Quote: Calculate total cost before payment"
echo "• Referral: Apply agent referral code for discount"
echo "• Profile: Manage buyer account details"
echo "• Wallet: Deposit funds (min ₦200) and view balance"
echo "• Payment: Pay with wallet or Paystack"
echo "• Refunds: Cancel pending orders or request refunds for paid orders"
echo "• Notifications: Get order and payment status updates"
