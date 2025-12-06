# 🔧 Supabase Setup Guide for Project Fincil

## Overview

Project Fincil uses Supabase as its unified database solution, combining:
- **PostgreSQL** for structured financial data
- **pgvector** for semantic search capabilities
- **Row Level Security (RLS)** for data protection
- **Edge Functions** for AI agent orchestration

---

## Database Architecture

### Tables

#### 1. `user_profiles`
Stores user calibration data from the onboarding wizard.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (also used for auth) |
| `income_type` | text | 'variable' or 'fixed' |
| `risk_tolerance` | text | 'low', 'medium', or 'high' |
| `financial_goal` | text | User's main financial goal |
| `monthly_income` | float | Average monthly income |
| `monthly_expenses` | float | Average monthly expenses |
| `created_at` | timestamptz | Profile creation date |
| `updated_at` | timestamptz | Last update date |

#### 2. `transactions`
Stores all financial transactions with vector embeddings for semantic search.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key to user_profiles |
| `amount` | float | Transaction amount (negative for expenses) |
| `description` | text | Transaction description |
| `category` | text | Category (food, transport, income, etc.) |
| `transaction_date` | timestamptz | When transaction occurred |
| `created_at` | timestamptz | Record creation date |
| `embedding` | vector(1536) | OpenAI Ada-002 embedding |

#### 3. `agent_conversations`
Logs all Financial Council debates for history and analysis.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key to user_profiles |
| `query` | text | User's financial question |
| `miser_response` | text | Conservative agent's response |
| `visionary_response` | text | Ambitious agent's response |
| `twin_response` | text | Balanced synthesis |
| `final_decision` | text | Consensus recommendation |
| `created_at` | timestamptz | Conversation date |

---

## Database Functions

### `match_transactions()`
Hybrid search combining semantic similarity and SQL filtering.

**Parameters:**
- `query_embedding` (vector): The embedding of the user's query
- `match_threshold` (float): Minimum similarity score (0.0 - 1.0)
- `match_count` (int): Maximum number of results
- `filter_user_id` (uuid): User ID to filter by

**Returns:**
Table with columns: `id`, `description`, `amount`, `category`, `transaction_date`, `similarity`

**Example Usage:**
```sql
SELECT * FROM match_transactions(
  query_embedding := '[0.1, 0.2, ...]'::vector,
  match_threshold := 0.7,
  match_count := 10,
  filter_user_id := 'user-uuid-here'
);
```

---

## Security Model

### Row Level Security (RLS)

All tables have RLS enabled. Users can only:
- View their own data
- Create records for themselves
- Update their own records
- Delete their own records (transactions only)

### Authentication Flow

1. User signs up/logs in via Supabase Auth
2. `auth.uid()` is automatically set in the database session
3. RLS policies enforce access control automatically
4. No manual user ID passing required in queries

---

## Initial Data Setup

### Sample Transaction Categories

```
income, salary, freelance, side_hustle
food, groceries, dining, coffee
transport, gas, uber, public_transport
entertainment, movies, games, subscriptions
shopping, clothing, electronics, home
bills, rent, utilities, insurance
health, medical, pharmacy, gym
education, courses, books, subscriptions
savings, investment, emergency_fund
```

### Seeding Data for Testing

For testing the agent system, you'll want sample transactions. Here's how to add them:

```javascript
// In your app or via Supabase SQL Editor
const sampleTransactions = [
  { amount: -15.50, description: "Starbucks coffee", category: "coffee" },
  { amount: -85.00, description: "Grocery shopping at Whole Foods", category: "groceries" },
  { amount: 3500.00, description: "Freelance project payment", category: "freelance" },
  { amount: -45.00, description: "Uber rides", category: "uber" },
  { amount: -120.00, description: "Gym membership", category: "gym" }
];

// Insert via Supabase client
for (const tx of sampleTransactions) {
  await supabase.from('transactions').insert({
    user_id: userId,
    ...tx,
    transaction_date: new Date()
  });
}
```

---

## Embeddings Generation

### Why Embeddings?

Embeddings allow the agents to understand semantic meaning:
- "expensive dinner" matches "luxury dining" and "fine dining"
- "car payment" matches "auto loan" and "vehicle financing"
- Enables context-aware financial advice

### How to Generate

**Option 1: OpenAI (Recommended)**
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data[0].embedding;
}
```

**Option 2: Supabase Edge Function**
Create a function that generates embeddings on insert:

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { description } = await req.json();

  // Call OpenAI or other embedding service
  const embedding = await generateEmbedding(description);

  return new Response(JSON.stringify({ embedding }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## Integration with Frontend

### Environment Variables

Create a `.env` file in your project root:

```bash
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Client Initialization

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### TypeScript Types

Generate types from your schema:

```bash
npx supabase gen types typescript --project-id "your-project-ref" > src/types/database.ts
```

Then import and use:

```typescript
import { Database } from './types/database';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

---

## Agent System Integration

### The Council Workflow

1. **User Query**: "Can I afford a $500 purchase?"
2. **Retrieve Context**:
   ```typescript
   const embedding = await generateEmbedding("$500 purchase");
   const { data: similarTx } = await supabase.rpc('match_transactions', {
     query_embedding: embedding,
     match_threshold: 0.7,
     match_count: 10,
     filter_user_id: userId
   });
   ```
3. **Agent Debate**: Each agent receives:
   - User profile (risk tolerance, goals)
   - Similar past transactions
   - Current financial status
4. **Store Result**:
   ```typescript
   await supabase.from('agent_conversations').insert({
     user_id: userId,
     query: "Can I afford a $500 purchase?",
     miser_response: "...",
     visionary_response: "...",
     twin_response: "...",
     final_decision: "..."
   });
   ```

---

## Troubleshooting

### Common Issues

**Issue: "permission denied for table transactions"**
- **Cause**: RLS is blocking the query
- **Fix**: Ensure user is authenticated and `auth.uid()` matches the `user_id`

**Issue: "function match_transactions does not exist"**
- **Cause**: Migration didn't run or function wasn't created
- **Fix**: Re-run the migration or create the function manually in SQL Editor

**Issue: "extension 'vector' does not exist"**
- **Cause**: pgvector extension not enabled
- **Fix**: Run `CREATE EXTENSION vector;` in SQL Editor (requires project admin)

---

## Performance Optimization

### Indexes
Already created for:
- `user_id` on transactions (for fast user-specific queries)
- `transaction_date` on transactions (for chronological queries)
- `created_at` on conversations (for history retrieval)

### Vector Search Performance
- Embeddings use cosine distance (`<=>` operator)
- Index creation for large datasets:
  ```sql
  CREATE INDEX ON transactions USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
  ```

---

## Backup & Migration

### Export Data
```bash
supabase db dump -f backup.sql
```

### Restore Data
```bash
psql -h your-db-host -U postgres -d postgres < backup.sql
```

---

## Next Steps

1. Set up authentication (see AUTH_SETUP.md if needed)
2. Create Edge Functions for AI agents
3. Build the frontend UI
4. Test the hybrid search
5. Deploy to production

---

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
