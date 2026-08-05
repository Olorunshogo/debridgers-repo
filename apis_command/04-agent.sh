#!/bin/bash
# Agent Module - Agent operations, stock, KYC, wallet
# Base URL: http://localhost:4001/api/v1/agent

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== AGENT ENDPOINTS ===${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 1. AGENT APPLICATION (Public - no auth)
echo -e "${GREEN}1. SUBMIT AGENT APPLICATION${NC}"
echo "Public endpoint for agent signup"
curl -s -X POST http://localhost:4001/api/v1/agent/apply \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Amina",
    "last_name": "Yusuf",
    "email": "amina@example.com",
    "phone": "08012345678",
    "lga": "Kaduna North",
    "address": "12 Barnawa Market Road, Kaduna",
    "password": "Password@123",
    "confirm_password": "Password@123"
  }' | jq .

echo -e "\n${GREEN}2. GET AGENT LEADERBOARD${NC}"
echo "Top 20 agents by performance (public)"
curl -s -X GET http://localhost:4001/api/v1/agent/leaderboard \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}3. GET MY PROFILE (Authenticated)${NC}"
echo "Agent views their own profile"
curl -s -X GET http://localhost:4001/api/v1/agent/profile \
  -H "Authorization: Bearer agent_access_token_here" | jq .

echo -e "\n${GREEN}4. UPDATE PROFILE${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/agent/profile \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "08012345678",
    "address": "New address here"
  }' | jq .

echo -e "\n${GREEN}5. GET WALLET (Earnings)${NC}"
curl -s -X GET http://localhost:4001/api/v1/agent/wallet \
  -H "Authorization: Bearer agent_access_token_here" | jq .

echo -e "\n${GREEN}6. REQUEST WITHDRAWAL${NC}"
curl -s -X POST http://localhost:4001/api/v1/agent/withdrawals/request \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "bank_name": "Guaranty Trust Bank",
    "bank_code": "058",
    "account_number": "0123456789"
  }' | jq .

echo -e "\n${GREEN}7. GET BANK LIST${NC}"
curl -s -X GET http://localhost:4001/api/v1/agent/banks \
  -H "Authorization: Bearer agent_access_token_here" | jq .

echo -e "\n${GREEN}8. RESOLVE BANK ACCOUNT${NC}"
echo "Verify account name before saving"
curl -s -X POST http://localhost:4001/api/v1/agent/bank/resolve \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "bank_code": "058",
    "account_number": "0123456789"
  }' | jq .

echo -e "\n${GREEN}9. UPDATE BANK DETAILS${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/agent/bank-details \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "bank_code": "058",
    "account_number": "0123456789"
  }' | jq .

echo -e "\n${GREEN}10. GET BANK DETAILS${NC}"
curl -s -X GET http://localhost:4001/api/v1/agent/bank-details \
  -H "Authorization: Bearer agent_access_token_here" | jq .

echo -e "\n${GREEN}11. SUBMIT KYC${NC}"
echo "Submit Know Your Customer verification"
curl -s -X POST http://localhost:4001/api/v1/agent/kyc/submit \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "id_type": "nin",
    "id_number": "12345678901",
    "bank_name": "Guaranty Trust Bank",
    "bank_account_number": "0123456789",
    "business_reg_number": "RC123456"
  }' | jq .

echo -e "\n${GREEN}12. REQUEST STOCK${NC}"
echo "Agent requests stock from warehouse"
curl -s -X POST http://localhost:4001/api/v1/agent/stock/request \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "quantity": 100,
    "urgency": "standard"
  }' | jq .

echo -e "\n${GREEN}13. REMIT STOCK (Return unsold)${NC}"
echo "Agent returns unsold stock"
curl -s -X POST http://localhost:4001/api/v1/agent/stock/remit \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "quantity": 20,
    "reason": "expired_at_shop"
  }' | jq .

echo -e "\n${GREEN}14. GET STOCK HISTORY${NC}"
curl -s -X GET http://localhost:4001/api/v1/agent/stock/history \
  -H "Authorization: Bearer agent_access_token_here" | jq .

echo -e "\n${GREEN}15. SUBMIT PERFORMANCE REPORT${NC}"
curl -s -X POST http://localhost:4001/api/v1/agent/report \
  -H "Authorization: Bearer agent_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "period": "2026-08",
    "bags_sold": 150,
    "revenue": 7500000,
    "notes": "Good month, strong demand"
  }' | jq .

echo -e "\n${BLUE}=== NOTES ===${NC}"
echo "• Apply: Public endpoint for agent signup"
echo "• Profile: View/update agent information"
echo "• Wallet: See earnings and commission history"
echo "• Withdrawals: Request payout (admin must approve)"
echo "• Bank Details: Store account for payouts"
echo "• KYC: Submit identity verification for compliance"
echo "• Stock: Request/remit inventory"
echo "• Report: Submit performance metrics"
