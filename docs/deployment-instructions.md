# Deployment Instructions

## 1. Supabase Database Setup

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (usually 2-3 minutes)
3. Go to Settings > API and copy your keys:
   - Project URL
   - `anon` key (for frontend)
   - `service_role` key (for backend)

### Run Database Schema
1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `database/schema.sql`
3. Paste and run the SQL to create tables, indexes, and RLS policies
4. Verify tables were created in Table Editor

### Create Test Data (Optional)
```sql
-- Run this in Supabase SQL Editor for testing
INSERT INTO users (id, email) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'demo@example.com');

INSERT INTO subscriptions (user_id, plan, status) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'premium', 'pending');
```

## 2. Backend Deployment (Deno Deploy)

### Option A: Deploy to Deno Deploy

1. **Create Deno Deploy Project**:
   - Go to [dash.deno.com](https://dash.deno.com)
   - Create a new project
   - Connect your GitHub repository or upload files

2. **Set Environment Variables**:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   PRIMER_API_KEY=your-primer-api-key
   PRIMER_WEBHOOK_SECRET=your-primer-webhook-secret
   PRIMER_ENV=sandbox
   COINBASE_COMMERCE_API_KEY=your-coinbase-commerce-api-key
   COINBASE_COMMERCE_WEBHOOK_SECRET=your-coinbase-commerce-webhook-secret
   ```

3. **Deploy**:
   - Upload `backend/main.ts`
   - Set entry point to `main.ts`
   - Deploy and get your URL (e.g., `https://your-project.deno.dev`)

### Option B: Deploy to Supabase Edge Functions

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Initialize and Deploy**:
   ```bash
   supabase login
   supabase init
   
   # Copy backend/main.ts to supabase/functions/stripe-alternative/index.ts
   mkdir -p supabase/functions/stripe-alternative
   cp backend/main.ts supabase/functions/stripe-alternative/index.ts
   
   # Deploy function
   supabase functions deploy stripe-alternative
   ```

3. **Set Environment Variables**:
   ```bash
   supabase secrets set PRIMER_API_KEY=your-key
   supabase secrets set PRIMER_WEBHOOK_SECRET=your-secret
   # ... set all other environment variables
   ```

## 3. Configure Payment Providers

### Primer Setup
1. Sign up at [primer.io](https://primer.io)
2. Go to Developers > API Keys
3. Copy your sandbox API key
4. Go to Developers > Webhooks
5. Add webhook endpoint: `https://your-backend-url/api/webhooks/primer`
6. Select events: `PAYMENT_CAPTURED`, `PAYMENT_FAILED`
7. Copy the webhook secret

### Coinbase Commerce Setup
1. Sign up at [commerce.coinbase.com](https://commerce.coinbase.com)
2. Go to Settings > API Keys
3. Create new API key with `charge:create` permission
4. Go to Settings > Webhook subscriptions
5. Add webhook endpoint: `https://your-backend-url/api/webhooks/coinbase`
6. Select events: `charge:confirmed`, `charge:failed`
7. Copy the webhook secret

## 4. Frontend Deployment (Expo)

### Update Configuration
1. Edit `frontend/App.js` and update:
   ```javascript
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   const BACKEND_URL = 'https://your-backend-url';
   ```

### Install Dependencies and Run
```bash
cd frontend
npm install
npx expo start
```

### Deploy to Expo (Optional)
```bash
# Install Expo CLI
npm install -g @expo/cli

# Login to Expo
npx expo login

# Publish to Expo
npx expo publish
```

## 5. Testing the Deployment

### Test Backend Endpoints
```bash
# Test Primer client session
curl -X POST https://your-backend-url/api/primer/client-session \
  -H "Content-Type: application/json" \
  -d '{"amount": 2999, "currency": "USD", "userId": "550e8400-e29b-41d4-a716-446655440000"}'

# Test Coinbase Commerce charge
curl -X POST https://your-backend-url/api/crypto/charge \
  -H "Content-Type: application/json" \
  -d '{"amount": 2999, "currency": "USD", "userId": "550e8400-e29b-41d4-a716-446655440000", "plan": "premium"}'
```

### Test Frontend
1. Open Expo Go app on your phone
2. Scan QR code from `npx expo start`
3. Test both payment flows:
   - Card payment (use test card: 4242 4242 4242 4242)
   - Crypto payment (use test amounts)

## 6. Production Considerations

### Security
- Use HTTPS for all endpoints
- Verify webhook signatures properly
- Use environment variables for all secrets
- Enable RLS policies in Supabase
- Implement proper authentication

### Monitoring
- Set up logging in Deno Deploy/Supabase Functions
- Monitor webhook delivery success rates
- Set up alerts for payment failures
- Track subscription conversion rates

### Scaling
- Consider database connection pooling
- Implement rate limiting
- Add caching for frequently accessed data
- Monitor API usage limits

## 7. Troubleshooting

### Common Issues
1. **CORS errors**: Check CORS headers in backend
2. **Webhook signature failures**: Verify secrets match
3. **Database connection errors**: Check service role key
4. **Payment provider errors**: Verify API keys and sandbox/live mode
5. **React Native build errors**: Check Expo SDK compatibility

### Debug Steps
1. Check backend logs in Deno Deploy/Supabase dashboard
2. Test API endpoints with curl commands
3. Verify database tables and data in Supabase
4. Check webhook delivery logs in payment provider dashboards
5. Use React Native debugger for frontend issues

## 8. Going Live

### Before Production
1. Switch Primer from sandbox to live mode
2. Ensure Coinbase Commerce is configured for live payments
3. Update environment variables for production
4. Test with real (small) amounts
5. Set up proper monitoring and alerting
6. Implement user authentication
7. Add proper error handling and user feedback
8. Consider PCI compliance requirements
9. Set up backup and disaster recovery
10. Review and test all security measures

### Production Checklist
- [ ] Database schema deployed
- [ ] Backend deployed with production environment variables
- [ ] Frontend updated with production URLs
- [ ] Payment provider webhooks configured
- [ ] SSL certificates in place
- [ ] Monitoring and logging configured
- [ ] Error handling tested
- [ ] Security review completed
- [ ] Backup strategy implemented
- [ ] Documentation updated
