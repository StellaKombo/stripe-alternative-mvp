#!/bin/bash

# Test script for Stripe Alternative MVP Backend
# Your Deno Deploy URL: https://stripe-alt-backend-2hnj1c244xr7.deno.dev/

BACKEND_URL="https://stripe-alt-backend-2hnj1c244xr7.deno.dev"
USER_ID="550e8400-e29b-41d4-a716-446655440000"

echo "🚀 Testing Stripe Alternative MVP Backend API"
echo "Backend URL: $BACKEND_URL"
echo "=========================================="

echo ""
echo "1️⃣ Testing Primer Client Session (Mock Mode)"
echo "curl -X POST $BACKEND_URL/api/primer/client-session"
curl -X POST "$BACKEND_URL/api/primer/client-session" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 2999,
    \"currency\": \"USD\",
    \"userId\": \"$USER_ID\"
  }" | jq '.' 2>/dev/null || cat

echo ""
echo ""
echo "2️⃣ Testing Primer Create Payment (Mock Mode)"
echo "curl -X POST $BACKEND_URL/api/primer/create-payment"
curl -X POST "$BACKEND_URL/api/primer/create-payment" \
  -H "Content-Type: application/json" \
  -d "{
    \"paymentMethodToken\": \"mock_token_123\",
    \"amount\": 2999,
    \"currency\": \"USD\",
    \"userId\": \"$USER_ID\"
  }" | jq '.' 2>/dev/null || cat

echo ""
echo ""
echo "3️⃣ Testing Crypto Charge Creation (Coinbase Commerce)"
echo "curl -X POST $BACKEND_URL/api/crypto/charge"
curl -X POST "$BACKEND_URL/api/crypto/charge" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 2999,
    \"currency\": \"USD\",
    \"userId\": \"$USER_ID\",
    \"plan\": \"premium\"
  }" | jq '.' 2>/dev/null || cat

echo ""
echo ""
echo "4️⃣ Testing CORS (OPTIONS request)"
echo "curl -X OPTIONS $BACKEND_URL/api/primer/client-session"
curl -X OPTIONS "$BACKEND_URL/api/primer/client-session" \
  -H "Origin: http://localhost:3000" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control)"

echo ""
echo ""
echo "5️⃣ Testing 404 (Invalid endpoint)"
echo "curl -X GET $BACKEND_URL/api/invalid"
curl -X GET "$BACKEND_URL/api/invalid" 2>/dev/null || echo "Request failed as expected"

echo ""
echo ""
echo "✅ API Testing Complete!"
echo ""
echo "Expected Results:"
echo "- Test 1 & 2: Should return mock responses with 'mock: true'"
echo "- Test 3: Should return Coinbase Commerce charge data OR error if no API key"
echo "- Test 4: Should show CORS headers"
echo "- Test 5: Should return 'Not Found'"
