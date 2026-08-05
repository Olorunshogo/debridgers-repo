#!/bin/bash
# Commission Module - Commission tracking and history
# Base URL: http://localhost:4001/api/v1/commission

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== COMMISSION ENDPOINTS ===${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 1. GET MY COMMISSIONS (Agent)
echo -e "${GREEN}1. GET MY COMMISSION HISTORY${NC}"
echo "Agent views their earned commissions"
curl -s -X GET http://localhost:4001/api/v1/commission/my-commissions \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}2. GET COMMISSION SUMMARY${NC}"
echo "Total earnings, pending, paid breakdown"
curl -s -X GET http://localhost:4001/api/v1/commission/summary \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}3. GET COMMISSION BY DATE RANGE${NC}"
curl -s -X GET "http://localhost:4001/api/v1/commission?from=2026-08-01&to=2026-08-31" \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}4. ADMIN - VIEW ALL COMMISSIONS${NC}"
echo "Admin views commissions across all agents"
curl -s -X GET "http://localhost:4001/api/v1/commission/admin?agent_id=5&status=paid" \
  -H "Authorization: Bearer admin_access_token_here" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}5. ADMIN - LIST PENDING COMMISSIONS${NC}"
echo "Commissions earned but not yet marked as paid"
curl -s -X GET "http://localhost:4001/api/v1/commission/admin/pending" \
  -H "Authorization: Bearer admin_access_token_here" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}6. ADMIN - MARK COMMISSIONS AS PAID${NC}"
echo "Manually mark commissions as paid (usually automatic)"
curl -s -X PATCH http://localhost:4001/api/v1/commission/mark-paid \
  -H "Authorization: Bearer admin_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "commission_ids": [1, 2, 3]
  }' | jq .

echo -e "\n${BLUE}=== COMMISSION FLOW ===${NC}"
echo "1. Agent makes sales → Payment webhook confirms charge.success"
echo "2. CommissionService calculates based on rate in system_settings"
echo "3. Commission created with status='paid' (marked at payment time)"
echo "4. Agent can view in commission history"
echo "5. Wallet totals earnings from all commissions"
echo "6. Friday 10 AM: PayoutSchedulerService checks unpaid commissions"
echo "7. If total >= ₦5,000 minimum → Creates payout record → Transfers via Paystack"
echo ""
echo "Commission Rate: Configured in system_settings table"
echo "Min Payout: ₦5,000 (500000 kobo)"
echo "Payout Schedule: Friday 10 AM UTC (automatic)"
