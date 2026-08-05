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
  -H "Authorization: Bearer buyer_access_token_here" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}2. ADD TO CART${NC}"
curl -s -X POST http://localhost:4001/api/v1/buyer/cart \
  -H "Authorization: Bearer buyer_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "quantity": 5
  }' | jq .

echo -e "\n${GREEN}3. UPDATE CART ITEM QUANTITY${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/buyer/cart/1 \
  -H "Authorization: Bearer buyer_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 10
  }' | jq .

echo -e "\n${GREEN}4. REMOVE FROM CART${NC}"
curl -s -X DELETE http://localhost:4001/api/v1/buyer/cart/1 \
  -H "Authorization: Bearer buyer_access_token_here" | jq .

echo -e "\n${GREEN}5. CLEAR CART${NC}"
curl -s -X DELETE http://localhost:4001/api/v1/buyer/cart \
  -H "Authorization: Bearer buyer_access_token_here" | jq .

echo -e "\n${GREEN}6. GET FAVORITES${NC}"
curl -s -X GET http://localhost:4001/api/v1/buyer/favorites \
  -H "Authorization: Bearer buyer_access_token_here" | jq .

echo -e "\n${GREEN}7. ADD TO FAVORITES${NC}"
curl -s -X POST http://localhost:4001/api/v1/buyer/favorites \
  -H "Authorization: Bearer buyer_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1
  }' | jq .

echo -e "\n${GREEN}8. REMOVE FROM FAVORITES${NC}"
curl -s -X DELETE http://localhost:4001/api/v1/buyer/favorites/1 \
  -H "Authorization: Bearer buyer_access_token_here" | jq .

echo -e "\n${GREEN}9. GET MY ORDERS${NC}"
curl -s -X GET http://localhost:4001/api/v1/buyer/orders \
  -H "Authorization: Bearer buyer_access_token_here" | jq .

echo -e "\n${GREEN}10. GET ORDER DETAILS${NC}"
curl -s -X GET http://localhost:4001/api/v1/buyer/orders/42 \
  -H "Authorization: Bearer buyer_access_token_here" | jq .

echo -e "\n${GREEN}11. CREATE ORDER (Checkout)${NC}"
echo "First step of checkout - creates pending order"
curl -s -X POST http://localhost:4001/api/v1/buyer/orders \
  -H "Authorization: Bearer buyer_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": 1,
    "delivery_address": "123 Ikoyi Lane, Lagos",
    "notes": "Please call before delivery"
  }' | jq .

echo -e "\n${GREEN}12. CANCEL ORDER${NC}"
echo "Only works if order is still pending"
curl -s -X PATCH http://localhost:4001/api/v1/buyer/orders/42/cancel \
  -H "Authorization: Bearer buyer_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Found cheaper elsewhere"
  }' | jq .

echo -e "\n${GREEN}13. GET ORDER QUOTE${NC}"
echo "Calculate total before checkout (delivery fee, taxes, etc)"
curl -s -X POST http://localhost:4001/api/v1/buyer/orders/quote \
  -H "Authorization: Bearer buyer_access_token_here" \
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
  -H "Authorization: Bearer buyer_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_code": "AGENT-A3F2B1C9"
  }' | jq .

echo -e "\n${GREEN}15. GET PROFILE${NC}"
curl -s -X GET http://localhost:4001/api/v1/buyer/profile \
  -H "Authorization: Bearer buyer_access_token_here" | jq .

echo -e "\n${GREEN}16. UPDATE PROFILE${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/buyer/profile \
  -H "Authorization: Bearer buyer_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "08098765432",
    "delivery_address": "New address"
  }' | jq .

echo -e "\n${BLUE}=== NOTES ===${NC}"
echo "• Cart: Manage shopping cart before checkout"
echo "• Favorites: Save products for later purchase"
echo "• Orders: View order history and status"
echo "• Create Order: First step - fills pending order with cart items"
echo "• Quote: Calculate total cost before payment"
echo "• Referral: Apply agent referral code for discount"
echo "• Profile: Manage buyer account details"
