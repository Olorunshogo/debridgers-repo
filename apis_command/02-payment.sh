#!/bin/bash
# Payment Module - Payments, Payouts, Refunds
# Base URL: http://localhost:4001/api/v1/payment

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== PAYMENT ENDPOINTS ===${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 1. INITIALIZE BUYER PAYMENT
echo -e "${GREEN}1. INITIALIZE BUYER PAYMENT (for checkout)${NC}"
curl -s -X POST http://localhost:4001/api/v1/payment/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "amount": 5000,
    "agent_id": 1,
    "metadata": {
      "type": "buyer_order",
      "order_id": 42,
      "buyer_id": 7
    }
  }' | jq .

echo -e "\n${GREEN}2. PAYMENT WEBHOOK (Paystack callback)${NC}"
# This would come from Paystack after payment
# Do NOT manually call this - Paystack calls it automatically
echo "Note: This is called by Paystack automatically after payment"
echo "Headers required: x-paystack-signature"
curl -s -X POST http://localhost:4001/api/v1/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: signature_from_paystack" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "reference_from_paystack",
      "amount": 500000,
      "metadata": {
        "type": "buyer_order",
        "order_id": 42,
        "buyer_id": 7
      }
    }
  }' | jq .

echo -e "\n${GREEN}3. CREATE SUBACCOUNT (Admin - for agent commission routing)${NC}"
curl -s -X POST http://localhost:4001/api/v1/payment/subaccount/5 \
  -H "Authorization: Bearer admin_access_token_here" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}4. RUN WEEKLY PAYOUTS (Manual trigger)${NC}"
echo "Processes all approved withdrawals waiting for payout"
curl -s -X POST http://localhost:4001/api/v1/payment/payout/run-weekly \
  -H "Authorization: Bearer admin_access_token_here" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}5. PROCESS SINGLE WITHDRAWAL${NC}"
echo "Admin manually processes an approved withdrawal"
curl -s -X POST http://localhost:4001/api/v1/payment/payout/3 \
  -H "Authorization: Bearer admin_access_token_here" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}6. INITIATE REFUND (Admin)${NC}"
echo "Admin initiates refund for a paid order"
curl -s -X POST http://localhost:4001/api/v1/payment/refund \
  -H "Authorization: Bearer admin_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 42,
    "reason": "Customer requested cancellation"
  }' | jq .

echo -e "\n${BLUE}=== NOTES ===${NC}"
echo "• Initialize: Get authorization_url → Redirect buyer to Paystack checkout"
echo "• Webhook: Paystack calls this automatically (configure in Paystack dashboard)"
echo "• Subaccount: Creates Paystack subaccount for agent to receive commissions"
echo "• Weekly Payouts: Triggers on Friday 10 AM UTC OR call manually"
echo "• Process Withdrawal: For on-demand withdrawals (approved by admin)"
echo "• Refund: Initiates refund via Paystack Refund API"
