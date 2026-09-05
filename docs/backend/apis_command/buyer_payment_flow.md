# Login

curl -s -X POST http://localhost:4001/api/v1/auth/login \ ─╯
-H "Content-Type: application/json" \ -d '{
"email": "fatima@example.com",
"password": "SecurePass@123"
}' | jq '.data.accessToken'

"eyJhbGciOiJIUzI1NiIs..."

# Test 1: Missing X-Request-Key

curl -s -X POST http://localhost:4001/api/v1/buyer/orders/initialize-payment \
 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
 -H "X-Payment-Key: payment_key_1_change_in_production" \
 -H "X-Payment-Key_2: payment_key_2_change_in_production" \
 -H "Content-Type: application/json" \
 -d '{}' | jq .

{
"statusCode": 403,
"message": "Missing key: request",
"timestamp": "2026-08-06T09:01:17.825Z",
"path": "/api/v1/buyer/orders/initialize-payment"
}

# Test 2: Missing X-Payment-Key

curl -s -X POST http://localhost:4001/api/v1/buyer/orders/initialize-payment \
 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
 -H "X-Request-Key: request_key_change_in_production" \
 -H "X-Payment-Key_2: payment_key_2_change_in_production" \
 -H "Content-Type: application/json" \
 -d '{}' | jq .

{
"statusCode": 403,
"message": "Missing key: payment1",
"timestamp": "2026-08-06T09:01:55.684Z",
"path": "/api/v1/buyer/orders/initialize-payment"
}

# Test 3: Missing X-Payment-Key_2

curl -s -X POST http://localhost:4001/api/v1/buyer/orders/initialize-payment \
 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
 -H "X-Request-Key: request_key_change_in_production" \
 -H "X-Payment-Key: payment_key_1_change_in_production" \
 -H "Content-Type: application/json" \
 -d '{}' | jq .

{
"statusCode": 403,
"message": "Missing key: payment2",
"timestamp": "2026-08-06T09:02:03.530Z",
"path": "/api/v1/buyer/orders/initialize-payment"
}

# Test 4: All 3 headers present

curl -s -X POST http://localhost:4001/api/v1/buyer/orders/initialize-payment \
 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
 -H "X-Request-Key: request_key_change_in_production" \
 -H "X-Payment-Key: payment_key_1_change_in_production" \
 -H "X-Payment-Key_2: payment_key_2_change_in_production" \
 -H "Content-Type: application/json" \
 -d '{"delivery_address": "123 Barnawa", "zone_id": 1, "delivery_time": "today", "cart": [{"product_id": 1, "name": "Rice", "price_kobo": 50000, "unit": "bag", "qty": 2}]}' | jq .

{
"statusCode": 201,
"message": "Payment initialized",
"data": {
"authorization_url": "https://checkout.paystack.com/n9p74atxcp8snex",
"reference": "pph9vr8dsn",
"order_id": 5,
"totals": {
"zoneFeeKobo": 50000,
"extraPackages": 1,
"extraPackagesKobo": 50000,
"deliveryFeeKobo": 100000,
"deliveryFeeBeforePromoKobo": 100000,
"freeDelivery": false,
"itemsTotalKobo": 100000,
"handlingFeeKobo": 10000,
"totalKobo": 210000
}
},
"timestamp": "2026-08-06T09:02:13.323Z",
"version": "v1",
"path": "/api/v1/buyer/orders/initialize-payment"
}
