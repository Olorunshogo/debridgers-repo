# User Balance

 TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsImlkIjozLCJlbWFpbCI6ImZhdGltYUBleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJGYXRpbWEiLCJsYXN0X25hbWUiOiJCZWxsbyIsInJvbGUiOiJidXllciIsImFwaV92ZXJzaW9uIjoidjEiLCJkZXZpY2UiOiJjdXJsLzguNy4xIiwiaXBfYWRkcmVzcyI6Ijo6MSIsImlhdCI6MTc4NjQzNjYzOSwiZXhwIjoxNzg2NDM3NTM5fQ.5-b8uLR8RctybC-GXR7Qpra9pf1ZIF2PLetkLV4CZWM"

curl -s http://localhost:4001/api/v1/buyer/wallet \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-request-key: request_key_change_in_production" | jq '.data.wallet'


# Wallet payment
 TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsImlkIjozLCJlbWFpbCI6ImZhdGltYUBleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJGYXRpbWEiLCJsYXN0X25hbWUiOiJCZWxsbyIsInJvbGUiOiJidXllciIsImFwaV92ZXJzaW9uIjoidjEiLCJkZXZpY2UiOiJjdXJsLzguNy4xIiwiaXBfYWRkcmVzcyI6Ijo6MSIsImlhdCI6MTc4NjQzNTQ5MywiZXhwIjoxNzg2NDM2MzkzfQ.sqHZUzqLb63DORksV02U-c5206LRc_tG2_lJaeOTGVU"

curl -s -X POST http://localhost:4001/api/v1/buyer/orders/39/pay \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-request-key: request_key_change_in_production" \
  -H "x-payment-key: payment_key_1_change_in_production" \
  -H "x-payment-key_2: payment_key_2_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{"payment_method":"wallet","amount_kobo":230000}' | jq .
