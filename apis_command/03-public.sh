#!/bin/bash
# Public Module - No authentication required
# Base URL: http://localhost:4001/api/v1

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== PUBLIC ENDPOINTS (No Auth Required) ===${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 1. GET PRODUCTS
echo -e "${GREEN}1. GET ALL PRODUCTS${NC}"
curl -s -X GET http://localhost:4001/api/v1/products \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}2. GET DELIVERY ZONES${NC}"
curl -s -X GET http://localhost:4001/api/v1/zones \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}3. GET CATEGORY TAXONOMY${NC}"
echo "Returns nested category tree (Category > Type > Variety)"
curl -s -X GET http://localhost:4001/api/v1/categories \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}4. GET PUBLIC CONFIG${NC}"
echo "Returns commission rate, referral discount, currency"
curl -s -X GET http://localhost:4001/api/v1/config/public \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}5. SUBMIT WEB LEAD (Contact form)${NC}"
echo "Public form for interested retailers/wholesalers"
curl -s -X POST http://localhost:4001/api/v1/outreach/submit \
  -H "Content-Type: application/json" \
  -d '{
    "owner_name": "Chukwu Emmanuel",
    "phone": "08012345678",
    "shop_name": "Emmanuel Grains Store",
    "lga": "Ibadan",
    "area": "Dugbe",
    "product_interest": "Rice, Beans",
    "quantity": 50,
    "how_heard": "Google Search",
    "notes": "Interested in wholesale supply"
  }' | jq .

echo -e "\n${BLUE}=== NOTES ===${NC}"
echo "• All endpoints require NO authentication"
echo "• Use these to fetch data for frontend (products, zones, categories)"
echo "• Public config shows commission rates & settings"
echo "• Web lead form for capturing interest from website visitors"
