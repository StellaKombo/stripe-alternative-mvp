# Stripe Alternative MVP for High-Risk Markets

A demo payment processing system supporting both card payments (via Primer) and cryptocurrency payments (via Coinbase Commerce).

## Tech Stack
- **Frontend**: React Native (Expo)
- **Backend**: Deno
- **Database**: Supabase (Postgres + Auth + RLS)
- **Card Processing**: Primer (sandbox)
- **Crypto Processing**: Coinbase Commerce (live)

## Project Structure
```
stripe-alternative-mvp/
├── backend/           # Deno API server
├── frontend/          # React Native (Expo) app
├── database/          # Supabase SQL schema
├── docs/             # Documentation and examples
└── README.md
```

## Quick Start
1. Set up Supabase database using `database/schema.sql`
2. Configure environment variables
3. Deploy Deno backend to Deno Deploy or Supabase Edge Functions
4. Run React Native app with Expo Go

See individual directories for detailed setup instructions.
