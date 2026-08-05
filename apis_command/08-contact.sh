#!/bin/bash
# Contact Module - Customer support and messaging
# Base URL: http://localhost:4001/api/v1/contact

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== CONTACT/SUPPORT ENDPOINTS ===${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 1. SUBMIT SUPPORT TICKET
echo -e "${GREEN}1. CREATE SUPPORT TICKET${NC}"
curl -s -X POST http://localhost:4001/api/v1/contact/tickets \
  -H "Authorization: Bearer user_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Order #42 not delivered yet",
    "category": "delivery",
    "message": "Expected delivery was yesterday but no update",
    "order_id": 42
  }' | jq .

echo -e "\n${GREEN}2. GET MY TICKETS${NC}"
curl -s -X GET "http://localhost:4001/api/v1/contact/tickets?status=open" \
  -H "Authorization: Bearer user_access_token_here" | jq .

echo -e "\n${GREEN}3. GET TICKET DETAILS${NC}"
curl -s -X GET http://localhost:4001/api/v1/contact/tickets/1 \
  -H "Authorization: Bearer user_access_token_here" | jq .

echo -e "\n${GREEN}4. REPLY TO TICKET${NC}"
curl -s -X POST http://localhost:4001/api/v1/contact/tickets/1/replies \
  -H "Authorization: Bearer user_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Thanks for looking into this"
  }' | jq .

echo -e "\n${GREEN}5. CLOSE TICKET${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/contact/tickets/1 \
  -H "Authorization: Bearer user_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed"
  }' | jq .

echo -e "\n${GREEN}6. ADMIN - LIST ALL TICKETS${NC}"
curl -s -X GET "http://localhost:4001/api/v1/contact/admin/tickets?status=open&limit=20" \
  -H "Authorization: Bearer admin_access_token_here" | jq .

echo -e "\n${GREEN}7. ADMIN - ASSIGN TO SUPPORT STAFF${NC}"
curl -s -X PATCH http://localhost:4001/api/v1/contact/admin/tickets/1/assign \
  -H "Authorization: Bearer admin_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "assigned_to": 12
  }' | jq .

echo -e "\n${GREEN}8. ADMIN - REPLY TO TICKET${NC}"
curl -s -X POST http://localhost:4001/api/v1/contact/admin/tickets/1/replies \
  -H "Authorization: Bearer admin_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "We have escalated this to our delivery team. You will receive an update within 2 hours."
  }' | jq .

echo -e "\n${BLUE}=== NOTES ===${NC}"
echo "• Tickets: Support requests from users"
echo "• Categories: delivery, payment, product_quality, account, other"
echo "• Statuses: open, in_progress, waiting_customer, closed"
echo "• Admin can assign to support staff and respond"
echo "• Notifications sent to both parties on updates"
