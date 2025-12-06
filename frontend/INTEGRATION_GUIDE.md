# 🔌 AI Integration Guide

This guide shows you how to replace the mock AI responses with real LLM APIs like Groq, OpenAI, or Anthropic.

---

## Overview

Currently, the system uses pre-written response templates. To make it truly intelligent, you need to:

1. Choose an AI provider (Groq, OpenAI, Anthropic, etc.)
2. Add API credentials to Supabase Edge Functions
3. Modify the debate function to call the LLM
4. Generate embeddings for transaction similarity

---

## Option 1: Groq (Recommended - Fastest)

Groq provides Llama 3.3 70B with 500+ tokens/second throughput.

### Step 1: Get Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for free
3. Create an API key
4. Copy the key (starts with `gsk_...`)

### Step 2: Add to Supabase

1. In Supabase dashboard, go to "Edge Functions"
2. Click "Manage secrets"
3. Add secret:
   - Name: `GROQ_API_KEY`
   - Value: Your Groq API key

### Step 3: Update Edge Function

Replace the content in `/supabase/functions/council-debate/index.ts`:

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

async function callGroq(prompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, userId, amount } = await req.json();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const surplus = profile.monthly_income - profile.monthly_expenses;
    const savingsRate = (surplus / profile.monthly_income) * 100;

    const baseContext = `
User Profile:
- Income: $${profile.monthly_income}/month (${profile.income_type})
- Expenses: $${profile.monthly_expenses}/month
- Surplus: $${surplus}/month
- Savings Rate: ${savingsRate.toFixed(1)}%
- Risk Tolerance: ${profile.risk_tolerance}
- Goal: ${profile.financial_goal}

Query: ${query}
${amount ? `Amount in question: $${amount}` : ''}
`;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Miser Agent
        sendEvent({ agent: 'miser', status: 'thinking', response: '' });
        const miserPrompt = `${baseContext}

You are "The Miser", a conservative financial advisor. Your role is to:
- Highlight financial risks and downsides
- Emphasize the importance of emergency funds and savings
- Question unnecessary spending
- Provide cautious, risk-averse analysis

Respond in 2-3 sentences with your conservative perspective on this financial decision.`;

        const miserResponse = await callGroq(miserPrompt);
        for (const char of miserResponse) {
          sendEvent({ agent: 'miser', status: 'speaking', response: char });
          await new Promise(r => setTimeout(r, 20));
        }

        // Visionary Agent
        await new Promise(r => setTimeout(r, 500));
        sendEvent({ agent: 'visionary', status: 'thinking', response: '' });

        const visionaryPrompt = `${baseContext}

You are "The Visionary", an ambitious financial advisor. Your role is to:
- Focus on growth opportunities and potential returns
- Align spending with the user's stated goal
- Encourage calculated risks
- Emphasize the cost of missed opportunities

Respond in 2-3 sentences with your ambitious perspective on this financial decision.`;

        const visionaryResponse = await callGroq(visionaryPrompt);
        for (const char of visionaryResponse) {
          sendEvent({ agent: 'visionary', status: 'speaking', response: char });
          await new Promise(r => setTimeout(r, 20));
        }

        // Twin Agent
        await new Promise(r => setTimeout(r, 500));
        sendEvent({ agent: 'twin', status: 'thinking', response: '' });

        const twinPrompt = `${baseContext}

You are "The Twin", a balanced financial advisor. Your role is to:
- Synthesize both conservative and ambitious viewpoints
- Provide practical, actionable recommendations
- Consider both short-term stability and long-term goals
- Give a clear yes/no/conditional decision

Consider both the Miser's caution and the Visionary's ambition.
Respond in 2-3 sentences with your balanced recommendation.`;

        const twinResponse = await callGroq(twinPrompt);
        for (const char of twinResponse) {
          sendEvent({ agent: 'twin', status: 'speaking', response: char });
          await new Promise(r => setTimeout(r, 20));
        }

        await supabase.from('agent_conversations').insert({
          user_id: userId,
          query,
          miser_response: miserResponse,
          visionary_response: visionaryResponse,
          twin_response: twinResponse,
          final_decision: twinResponse,
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Step 4: Redeploy the Function

The function is automatically deployed. Test it by asking a question in the dashboard.

---

## Option 2: OpenAI

OpenAI provides GPT-4 and GPT-3.5-turbo models.

### Get API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Add to Supabase secrets as `OPENAI_API_KEY`

### API Call
```typescript
async function callOpenAI(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## Option 3: Anthropic Claude

Anthropic provides Claude 3 models.

### Get API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Add to Supabase secrets as `ANTHROPIC_API_KEY`

### API Call
```typescript
async function callClaude(prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  return data.content[0].text;
}
```

---

## Adding Vector Search (Transaction Similarity)

To enable semantic search of past transactions:

### Step 1: Get OpenAI API Key
Vector embeddings require a separate API call (usually OpenAI's text-embedding-ada-002).

### Step 2: Create Embedding Function

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

### Step 3: Generate Embeddings on Insert

Create a new Edge Function called `generate-embedding`:

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const { transactionId } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: tx } = await supabase
    .from('transactions')
    .select('description, amount, category')
    .eq('id', transactionId)
    .single();

  const text = `${tx.description} ${tx.category} $${tx.amount}`;
  const embedding = await generateEmbedding(text);

  await supabase
    .from('transactions')
    .update({ embedding })
    .eq('id', transactionId);

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

### Step 4: Use Vector Search in Debate

```typescript
// In council-debate function
const queryEmbedding = await generateEmbedding(query);

const { data: similarTx } = await supabase.rpc('match_transactions', {
  query_embedding: queryEmbedding,
  match_threshold: 0.7,
  match_count: 5,
  filter_user_id: userId,
});

const contextString = similarTx
  .map(tx => `- ${tx.description}: $${tx.amount}`)
  .join('\n');

// Add to agent prompts:
const enhancedContext = `
${baseContext}

Similar Past Transactions:
${contextString}
`;
```

---

## Cost Estimates

### Groq (Recommended)
- **Cost**: Free tier: 14,400 requests/day
- **Speed**: 500+ tokens/second
- **Model**: Llama 3.3 70B

### OpenAI
- **GPT-4**: ~$0.03 per debate (3 agents × 300 tokens)
- **GPT-3.5-turbo**: ~$0.002 per debate
- **Embeddings**: ~$0.0001 per transaction

### Anthropic
- **Claude 3 Sonnet**: ~$0.015 per debate
- **Claude 3 Haiku**: ~$0.0025 per debate

---

## Testing Your Integration

1. **Add console logging**:
   ```typescript
   console.log('Calling LLM with prompt:', prompt);
   console.log('LLM response:', response);
   ```

2. **Check Edge Function logs**:
   - Supabase dashboard > Edge Functions > council-debate
   - Click "Logs" tab
   - Monitor for errors

3. **Test in production**:
   - Deploy the updated function
   - Ask a test question
   - Verify responses are dynamic and contextual

---

## Advanced: RAG Pipeline

For production-grade context awareness:

1. **Index all transactions** with embeddings
2. **Create a knowledge base** of financial principles
3. **Retrieve relevant context** for each query
4. **Augment prompts** with retrieved information
5. **Generate responses** with full context

Example architecture:
```
User Query
  ↓
Generate Query Embedding
  ↓
Vector Search Similar Transactions
  ↓
Retrieve User Profile
  ↓
Build Context (Profile + Transactions + Query)
  ↓
Agent 1 (Miser) → LLM Call with Context
Agent 2 (Visionary) → LLM Call with Context
Agent 3 (Twin) → LLM Call with Context
  ↓
Stream Results to Frontend
  ↓
Save to Conversation History
```

---

## Troubleshooting

### Issue: "API key not found"
- Verify secret name matches exactly (case-sensitive)
- Redeploy function after adding secrets

### Issue: "Rate limit exceeded"
- Implement caching for similar queries
- Use cheaper models (GPT-3.5 instead of GPT-4)
- Add exponential backoff retry logic

### Issue: "Embedding dimension mismatch"
- OpenAI ada-002: 1536 dimensions
- Ensure database column matches: `vector(1536)`

---

## Next Steps

1. Start with Groq for fastest, cheapest testing
2. Add embeddings for transaction similarity
3. Implement caching to reduce API calls
4. Add conversation memory (reference past debates)
5. Fine-tune prompts based on user feedback

For questions, see the main [README.md](./README.md) and [SETUP_GUIDE.md](./SETUP_GUIDE.md).
