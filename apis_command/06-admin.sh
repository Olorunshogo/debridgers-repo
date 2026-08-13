#!/bin/bash
# Admin Module - Administrative operations
# Base URL: http://localhost:4001/api/v1/admin

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== ADMIN ENDPOINTS ===${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 1. GET DASHBOARD STATS
echo -e "${GREEN}1. GET DASHBOARD STATS${NC}"
echo "Overview of platform metrics"
curl -s -X GET http://localhost:4001/api/v1/admin/dashboard \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}2. LIST USERS${NC}"
echo "List all users (paginated)"
curl -s -X GET "http://localhost:4001/api/v1/admin/users?role=agent&status=pending&limit=20&offset=0" \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}3. GET USER DETAILS${NC}"
curl -s -X GET http://localhost:4001/api/v1/admin/users/5 \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}4. APPROVE AGENT APPLICATION${NC}"
echo "Agent status: pending → approved"
curl -s -X PATCH http://localhost:4001/api/v1/admin/agents/5/approve \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Documents verified"
  }' | jq .

echo -e "\n${GREEN}5. REJECT AGENT APPLICATION${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/admin/agents/5/reject \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Missing KYC documents"
  }' | jq .

echo -e "\n${GREEN}6. SUSPEND AGENT${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/admin/agents/5/suspend \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Inactive for 30 days"
  }' | jq .

echo -e "\n${GREEN}7. LIST WITHDRAWALS${NC}"
echo "All pending withdrawal requests"
curl -s -X GET "http://localhost:4001/api/v1/admin/withdrawals?status=pending" \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}8. APPROVE WITHDRAWAL${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/admin/withdrawals/3/approve \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}9. REJECT WITHDRAWAL${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/admin/withdrawals/3/reject \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Invalid bank details"
  }' | jq .

echo -e "\n${GREEN}10. LIST ORDERS${NC}"
echo "Filter orders by status, date, buyer, etc"
curl -s -X GET "http://localhost:4001/api/v1/admin/orders?status=pending&limit=20" \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}11. GET ORDER DETAILS${NC}"
curl -s -X GET http://localhost:4001/api/v1/admin/orders/42 \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}12. ASSIGN RIDER TO ORDER${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/admin/orders/42/assign-rider \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "rider_id": 8
  }' | jq .

echo -e "\n${GREEN}13. UPDATE ORDER STATUS${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/admin/orders/42/status \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "out_for_delivery"
  }' | jq .

echo -e "\n${GREEN}14. LIST PRODUCTS${NC}"
curl -s -X GET "http://localhost:4001/api/v1/admin/products?limit=50" \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}15. CREATE PRODUCT${NC}"
curl -s -X POST http://localhost:4001/api/v1/admin/products \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Rice 50kg",
    "description": "Long grain rice",
    "price_kobo": 50000,
    "category_id": 1,
    "unit": "bag",
    "measure_value": 50,
    "measure_unit": "kg"
  }' | jq .

echo -e "\n${GREEN}16. UPDATE PRODUCT${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/admin/products/1 \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "price_kobo": 55000,
    "is_active": true
  }' | jq .

echo -e "\n${GREEN}17. LIST DISPUTES/COMPLAINTS${NC}"
curl -s -X GET "http://localhost:4001/api/v1/admin/disputes?status=open" \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}18. RESOLVE DISPUTE${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/admin/disputes/1/resolve \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "refund",
    "notes": "Chargeback confirmed valid"
  }' | jq .

echo -e "\n${GREEN}19. GET AUDIT LOG${NC}"
echo "Track all admin actions for compliance"
curl -s -X GET "http://localhost:4001/api/v1/admin/audit-log?limit=50" \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}20. CREATE API KEY (for OAuth apps)${NC}"
curl -s -X POST http://localhost:4001/api/v1/admin/api-keys \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App Integration"
  }' | jq .

echo -e "\n${BLUE}=== BUYER MANAGEMENT ===${NC}\n"

echo -e "${GREEN}21. LIST BUYERS (with zone filter)${NC}"
echo "Filter: ?zone_id=1&is_suspended=false"
curl -s -X GET "http://localhost:4001/api/v1/admin/buyers?zone_id=1" \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}22. GET BUYER DETAILS${NC}"
curl -s -X GET http://localhost:4001/api/v1/admin/buyers/12 \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}23. VIEW BUYER WALLET TRANSACTIONS${NC}"
echo "Check deposit/withdrawal history"
curl -s -X GET "http://localhost:4001/api/v1/admin/buyers/12/wallet/transactions?page=1&limit=20" \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}24. BLOCK BUYER${NC}"
echo "Prevents buyer from placing orders"
curl -s -X PATCH http://localhost:4001/api/v1/admin/buyers/12/block \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}25. UNBLOCK BUYER${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/admin/buyers/12/unblock \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}26. SUSPEND BUYER${NC}"
echo "Temporary suspension (different from block)"
curl -s -X PATCH http://localhost:4001/api/v1/admin/buyers/12/suspend \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${GREEN}27. UNSUSPEND BUYER${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/admin/buyers/12/unsuspend \
  -H "X-Admin-Key-1: admin_key_1_change_in_production" \
  -H "X-Admin-Key-2: admin_key_2_change_in_production" | jq .

echo -e "\n${BLUE}=== NOTES ===${NC}"
echo "• Dashboard: Platform overview and KPIs"
echo "• Users: List and manage all users"
echo "• Agents: Approve/reject/suspend agents"
echo "• Withdrawals: Approve pending payout requests"
echo "• Orders: Manage order fulfillment"
echo "• Products: Create and manage inventory"
echo "• Disputes: Handle chargebacks and complaints"
echo "• Audit Log: Track all changes for compliance"
echo "• API Keys: Create credentials for external apps"
echo "• Buyers: View, block, suspend buyer accounts"
echo "• Wallet: Monitor buyer deposits and spending"
