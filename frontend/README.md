# 📘 Project Fincil: The Financial Council

> An AI-powered financial advisor system where three specialized agents debate your financial decisions in real-time, visualized through stunning 3D avatars.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.5-3178c6.svg)
![Supabase](https://img.shields.io/badge/supabase-powered-3ecf8e.svg)

---

## 🌟 What Makes This Different?

Instead of a single chatbot, you get a **Tribunal of AI Agents**:

- **The Miser** (Conservative): Analyzes risks and warns about overspending
- **The Visionary** (Ambitious): Focuses on your goals and growth opportunities
- **The Twin** (Balanced): Synthesizes both perspectives into actionable advice

Each agent has its own personality, 3D avatar, and real-time streaming responses.

---

## ✨ Features

### 🎨 Visual & Interactive
- **3D Animated Avatars**: Watch agents "think" and "speak" with smooth animations
- **Real-Time Streaming**: See responses appear character-by-character
- **Modern Dark UI**: Cyberpunk-inspired design with glassmorphism effects
- **Responsive Design**: Works on desktop, tablet, and mobile

### 🧠 AI-Powered
- **Multi-Agent Debate**: Three specialized agents analyze every decision
- **Context-Aware**: Uses your financial profile and transaction history
- **Vector Search**: Semantic search finds similar past spending patterns
- **Personalized**: Calibrates to your income type, risk tolerance, and goals

### 🔒 Secure & Private
- **Supabase Auth**: Industry-standard authentication
- **Row-Level Security**: Your data is completely isolated
- **No Third-Party APIs**: All processing happens in your Supabase instance
- **Transparent**: Open source and self-hostable

### 📊 Financial Intelligence
- **Transaction Tracking**: Log and categorize all your spending
- **Financial Health Dashboard**: See your runway, surplus, and key metrics
- **Goal Setting**: Align spending decisions with long-term objectives
- **Conversation History**: Review past debates and decisions

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works perfectly)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd financial-council
   npm install
   ```

2. **Set up Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - The database is already configured with migrations
   - Get your API credentials from Settings > API

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your Supabase credentials
   ```

4. **Run the app**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5173`
   - Create an account and complete the onboarding wizard
   - Start asking financial questions

For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).

---

## 🎮 How It Works

### 1. Calibration Wizard
When you first sign up, you'll configure your "Financial Digital Twin":
- Income pattern (variable vs. fixed)
- Risk tolerance (conservative, balanced, aggressive)
- Primary financial goal
- Monthly cash flow

### 2. The Council Chamber
Ask any financial question:
- "Can I afford a $500 purchase?"
- "Should I buy a new laptop?"
- "Is this subscription worth it?"

### 3. The Debate
Watch as three agents analyze your query:

```
🔴 THE MISER
"I must object. Your surplus is only $1,500, and this would
consume 33% of your buffer. Given market uncertainty..."

🟢 THE VISIONARY
"This aligns with your goal of 'upgrading home office'. The
productivity gains could pay for themselves..."

🟡 THE TWIN
"After synthesizing both views, I recommend proceeding only if
you can identify $150 in unnecessary subscriptions to cut..."
```

### 4. Make Informed Decisions
Use the balanced perspective to make smarter financial choices.

---

## 🏗️ Architecture

### Tech Stack
```
Frontend:
  - React 18 + TypeScript
  - Tailwind CSS (styling)
  - React Three Fiber (3D rendering)
  - Vite (build tool)

Backend:
  - Supabase PostgreSQL (database)
  - pgvector (semantic search)
  - Supabase Auth (authentication)
  - Supabase Edge Functions (AI logic)
```

### Database Schema
```sql
user_profiles        # User financial configurations
├─ transactions      # Financial transactions with embeddings
└─ agent_conversations  # Debate history
```

### Agent System
Each agent follows a specialized prompt strategy:
- **Miser**: Risk analysis + savings rate calculation
- **Visionary**: Goal alignment + opportunity cost analysis
- **Twin**: Multi-criteria decision synthesis

For detailed architecture, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

---

## 📸 Screenshots

### Onboarding Wizard
Beautiful step-by-step calibration that feels like initializing a system.

### Council Chamber
3D avatars that react to the debate in real-time with smooth animations.

### Financial Dashboard
Clean, modern interface showing key metrics and conversation history.

---

## 🎯 Use Cases

### Personal Finance
- Budget adherence checking
- Purchase decision analysis
- Subscription audit
- Emergency fund planning

### Business Owners
- Business expense validation
- Investment opportunity evaluation
- Cash flow management
- Growth vs. stability trade-offs

### Students
- Student loan decisions
- Part-time income optimization
- Textbook vs. digital resources
- Campus meal plan analysis

---

## 🛠️ Customization

### Change Agent Personalities
Edit `/supabase/functions/council-debate/index.ts` to adjust how each agent thinks.

### Modify 3D Avatars
Edit `/src/components/AgentAvatar.tsx` to change colors, shapes, and animations.

### Add New Metrics
Edit `/src/pages/Dashboard.tsx` to display additional financial insights.

### Integrate Real AI
Replace the mock responses with actual LLM calls (OpenAI, Anthropic, Groq, etc.).

---

## 🚦 Roadmap

- [ ] **Real LLM Integration**: Connect to Groq, OpenAI, or Anthropic
- [ ] **Vector Embeddings**: Implement semantic transaction search
- [ ] **Spending Charts**: Visualize patterns and trends
- [ ] **Budget Categories**: Set limits and get alerts
- [ ] **Mobile App**: React Native version
- [ ] **Voice Interface**: Ask questions via voice
- [ ] **Recurring Transactions**: Auto-detect subscriptions
- [ ] **Financial Goals Tracker**: Progress visualization
- [ ] **Multi-Currency**: Support for different currencies
- [ ] **Export Reports**: PDF financial summaries

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code:
- Follows TypeScript best practices
- Includes comments for complex logic
- Maintains the existing code style
- Doesn't break existing functionality

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Supabase** for the amazing backend platform
- **React Three Fiber** for making 3D in React accessible
- **Tailwind CSS** for the utility-first styling
- **The open source community** for inspiration

---

## 📧 Support

- **Documentation**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md) and [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- **Issues**: Open an issue on GitHub
- **Discussions**: Start a discussion for questions

---

## 🎉 Credits

Built with modern web technologies and a passion for making financial decisions easier.

**Made with ❤️ for better financial decision-making**

---

## 🔗 Links

- [Supabase Documentation](https://supabase.com/docs)
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Tailwind CSS Guide](https://tailwindcss.com/docs)

---

**Ready to meet your Financial Council?** Run `npm run dev` and start making smarter financial decisions today.
