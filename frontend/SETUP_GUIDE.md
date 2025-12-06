# 🚀 Complete Setup Guide for Project Fincil

## Quick Start Overview

Project Fincil is a sophisticated AI-powered financial advisor system featuring:
- 3D animated AI agents that debate your financial decisions
- Real-time streaming responses
- Supabase backend with vector search
- Modern React UI with Tailwind CSS

**Total setup time: ~10 minutes**

---

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Basic command line knowledge

---

## Step 1: Supabase Project Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Choose organization and project name (e.g., "financial-council")
5. Set a secure database password (save this!)
6. Choose a region close to you
7. Click "Create new project"
8. Wait 2-3 minutes for provisioning

### 1.2 Get Your API Credentials

1. In your Supabase project dashboard, click "Settings" (gear icon)
2. Click "API" in the left sidebar
3. You'll need two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (under "Project API keys")

### 1.3 Configure Environment Variables

1. In your project root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## Step 2: Database Setup

The database migrations have already been applied automatically. To verify:

1. Go to your Supabase project dashboard
2. Click "Table Editor" in the left sidebar
3. You should see these tables:
   - `user_profiles`
   - `transactions`
   - `agent_conversations`

### What's in the Database?

- **user_profiles**: Stores user financial information and risk profiles
- **transactions**: Stores financial transactions with vector embeddings for semantic search
- **agent_conversations**: Logs all AI debates for history tracking

For detailed database documentation, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

---

## Step 3: Authentication Setup

Authentication is already configured. The system uses Supabase Auth with email/password.

### Email Confirmation (Optional)

By default, email confirmation is DISABLED for easier testing. To enable:

1. In Supabase dashboard, go to "Authentication" > "Providers"
2. Click "Email" provider
3. Toggle "Confirm email" on
4. Configure email templates as needed

---

## Step 4: Install Dependencies & Run

### 4.1 Install Node Modules

```bash
npm install
```

### 4.2 Run Development Server

```bash
npm run dev
```

The app should open at `http://localhost:5173`

---

## Step 5: Test the Application

### 5.1 Create an Account

1. Click "Sign Up"
2. Enter email: `test@example.com`
3. Enter password: `password123`
4. Click "Create Account"

### 5.2 Complete Onboarding

1. **Step 1**: Choose "Variable Income" or "Fixed Income"
2. **Step 2**: Select risk tolerance (try "Balanced")
3. **Step 3**: Enter a goal like "Save for a Tesla"
4. **Step 4**: Enter financial data:
   - Monthly Income: `5000`
   - Monthly Expenses: `3500`
5. Click "Complete Setup"

### 5.3 Test the AI Council

1. You'll see the 3D avatars in the center
2. Try asking: "Can I afford a $500 purchase?"
3. Enter amount: `500`
4. Click "Ask"
5. Watch the agents debate in real-time:
   - **Miser** (red) will be conservative
   - **Visionary** (green) will be optimistic
   - **Twin** (gold) will synthesize both views

---

## Step 6: Add Sample Transaction Data (Optional)

To make the AI responses more realistic, add sample transactions:

1. In Supabase dashboard, click "SQL Editor"
2. Click "New query"
3. Paste this SQL (replace `YOUR_USER_ID` with your actual user ID):

```sql
-- Get your user ID first
SELECT id FROM auth.users LIMIT 1;

-- Then insert sample transactions (replace the UUID below)
INSERT INTO transactions (user_id, amount, description, category, transaction_date)
VALUES
  ('YOUR_USER_ID', -15.50, 'Starbucks morning coffee', 'coffee', NOW() - INTERVAL '1 day'),
  ('YOUR_USER_ID', -85.00, 'Whole Foods grocery shopping', 'groceries', NOW() - INTERVAL '2 days'),
  ('YOUR_USER_ID', 3500.00, 'Freelance project payment', 'freelance', NOW() - INTERVAL '5 days'),
  ('YOUR_USER_ID', -45.00, 'Uber rides this week', 'transport', NOW() - INTERVAL '3 days'),
  ('YOUR_USER_ID', -120.00, 'Gym membership renewal', 'health', NOW() - INTERVAL '7 days'),
  ('YOUR_USER_ID', -199.99, 'New wireless headphones', 'shopping', NOW() - INTERVAL '10 days'),
  ('YOUR_USER_ID', -65.00, 'Dinner at nice restaurant', 'dining', NOW() - INTERVAL '4 days'),
  ('YOUR_USER_ID', 2000.00, 'Client payment', 'freelance', NOW() - INTERVAL '15 days'),
  ('YOUR_USER_ID', -1200.00, 'Rent payment', 'bills', NOW() - INTERVAL '20 days'),
  ('YOUR_USER_ID', -80.00, 'Electric and water bills', 'bills', NOW() - INTERVAL '18 days');
```

4. Click "Run"
5. Refresh your dashboard to see the impact on AI responses

---

## Troubleshooting

### Issue: "Supabase credentials not found"
- **Solution**: Check your `.env` file exists and has correct values
- Make sure to restart dev server after changing `.env`

### Issue: "Failed to fetch" when asking AI
- **Solution**: Check that the Edge Function deployed correctly
- Go to Supabase dashboard > "Edge Functions"
- You should see "council-debate" listed
- Check function logs for errors

### Issue: 3D scene not rendering
- **Solution**: Try a different browser (Chrome/Firefox recommended)
- Check browser console for WebGL errors
- Make sure hardware acceleration is enabled

### Issue: "User not found" or authentication errors
- **Solution**: Clear browser storage and try again
- In Chrome: DevTools > Application > Clear Site Data
- Then sign up with a new account

### Issue: TypeScript errors during build
- **Solution**: Run `npm run typecheck` to see specific errors
- Most common: missing environment variables in `.env`

---

## Architecture Overview

### Frontend Stack
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Three Fiber** for 3D rendering
- **Lucide React** for icons
- **Vite** as build tool

### Backend Stack
- **Supabase PostgreSQL** for data storage
- **pgvector** for semantic search
- **Supabase Auth** for authentication
- **Supabase Edge Functions** for AI agent logic

### AI System
The system uses a three-agent debate model:

1. **The Miser**: Conservative, risk-averse analysis
2. **The Visionary**: Ambitious, goal-oriented perspective
3. **The Twin**: Balanced synthesis of both views

Each agent:
- Analyzes your financial profile
- Reviews recent transactions
- Considers your stated goals
- Provides personalized advice

---

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Deploy"

### Deploy to Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" > "Import from Git"
4. Select your repository
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Add environment variables in "Site settings"
8. Click "Deploy site"

---

## Customization

### Change Agent Personalities

Edit `/supabase/functions/council-debate/index.ts`:
- Modify `generateMiserResponse()` for conservative agent
- Modify `generateVisionaryResponse()` for ambitious agent
- Modify `generateTwinResponse()` for synthesis agent

### Change 3D Avatar Appearance

Edit `/src/components/AgentAvatar.tsx`:
- Modify `colors` object for different agent colors
- Adjust geometry sizes for different shapes
- Add more animations in the `useFrame` hook

### Add More Financial Metrics

Edit `/src/pages/Dashboard.tsx`:
- Add new stat cards in the grid
- Calculate additional metrics from profile data
- Display charts or visualizations

---

## Next Steps

1. **Add Real AI**: Replace mock responses with actual LLM calls (Groq, OpenAI, etc.)
2. **Add Embeddings**: Implement vector search for transaction similarity
3. **Add Charts**: Visualize spending patterns and trends
4. **Add Notifications**: Alert users about unusual spending
5. **Add Goals Tracking**: Progress bars for financial goals
6. **Add Budget Categories**: Automatic categorization and limits

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Database Schema**: See `SUPABASE_SETUP.md`

---

## License

MIT License - Feel free to use this project as a template for your own financial apps.

---

## Credits

Built with modern web technologies:
- Supabase for backend
- React Three Fiber for 3D
- Tailwind CSS for design
- TypeScript for type safety

Enjoy your Financial Council! 🎉
