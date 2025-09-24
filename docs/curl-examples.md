# API Testing with cURL

Test your backend API endpoints using these cURL commands. Replace `YOUR_BACKEND_URL` with your actual Deno Deploy URL.

## 1. Test Primer Client Session

Create a client session for card payments:

```bash
curl -X POST https://YOUR_BACKEND_URL/api/primer/client-session \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2999,
    "currency": "USD",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

Expected response:
```json
{
  "clientToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 2. Test Crypto Charge Creation

Create a Coinbase Commerce hosted checkout:

```bash
curl -X POST https://YOUR_BACKEND_URL/api/crypto/charge \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2999,
    "currency": "USD",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "plan": "premium"
  }'
```

Expected response:
```json
{
  "chargeId": "f765421e-9c3a-4c65-9c3a-4c659c3a4c65",
  "hostedUrl": "https://commerce.coinbase.com/charges/ABCD1234",
  "code": "ABCD1234"
}
```

## 3. Test Webhook Endpoints

### Primer Webhook Test

```bash
curl -X POST https://YOUR_BACKEND_URL/api/webhooks/primer \
  -H "Content-Type: application/json" \
  -H "x-primer-signature: v1=test-signature" \
  -d '{
    "eventType": "PAYMENT_CAPTURED",
    "data": {
      "id": "payment_123",
      "status": "AUTHORIZED",
      "amount": 2999,
      "currency": "USD"
    }
  }'
```

### Coinbase Commerce Webhook Test

```bash
curl -X POST https://YOUR_BACKEND_URL/api/webhooks/coinbase \
  -H "Content-Type: application/json" \
  -H "X-CC-Webhook-Signature: test-signature" \
  -d '{
    "event": {
      "type": "charge:confirmed",
      "data": {
        "id": "charge_123",
        "code": "ABCD1234",
        "metadata": {
          "user_id": "550e8400-e29b-41d4-a716-446655440000"
        }
      }
    }
  }'
```

## 4. Test Database Queries

After setting up your Supabase database, you can test queries directly:

### Check Users
```sql
SELECT * FROM users;
```

### Check Subscriptions
```sql
SELECT * FROM subscriptions WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
```

### Check Transactions
```sql
SELECT * FROM transactions WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
```

## 5. End-to-End Testing Flow

1. **Create a test user** (run in Supabase SQL editor):
```sql
INSERT INTO users (id, email) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'demo@example.com');

INSERT INTO subscriptions (user_id, plan, status) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'premium', 'pending');
```

2. **Test crypto payment flow**:
   - Create charge with curl command #2
   - Visit the `hostedUrl` in browser
   - Complete payment with test crypto
   - Check webhook receives confirmation
   - Verify subscription status updated to 'active'

3. **Test card payment flow**:
   - Create client session with curl command #1
   - Use clientToken in Primer Universal Checkout
   - Complete payment with test card (4242 4242 4242 4242)
   - Check webhook receives confirmation
   - Verify subscription status updated to 'active'

## Troubleshooting

- **401 Unauthorized**: Check your API keys and environment variables
- **CORS errors**: Ensure your backend URL is correct and CORS headers are set
- **Webhook signature errors**: Verify webhook secrets match between services and backend
- **Database errors**: Check RLS policies and ensure service role key is used in backend
- **Payment failures**: Verify test card numbers and crypto amounts are correct

## Test Cards (Primer Sandbox)

Use these test card numbers in Primer sandbox:

- **Successful payment**: 4242 4242 4242 4242
- **Declined payment**: 4000 0000 0000 0002
- **Insufficient funds**: 4000 0000 0000 9995
- **Expired card**: 4000 0000 0000 0069

Use any future expiry date and any 3-digit CVC.

## Test Crypto (Coinbase Commerce)

In Coinbase Commerce sandbox:
- Use test amounts (small values)
- Test cryptocurrencies are available
- Payments can be simulated without real crypto
