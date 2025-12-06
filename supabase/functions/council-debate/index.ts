import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DebateRequest {
  query: string;
  userId: string;
  amount?: number;
}

interface AgentResponse {
  agent: 'miser' | 'visionary' | 'twin';
  response: string;
  status: 'thinking' | 'speaking';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, userId, amount }: DebateRequest = await req.json();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    const { data: recentTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(10);

    const surplus = profile.monthly_income - profile.monthly_expenses;
    const savingsRate = (surplus / profile.monthly_income) * 100;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: AgentResponse) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        sendEvent({
          agent: 'miser',
          status: 'thinking',
          response: '',
        });

        await delay(800);

        const miserResponse = generateMiserResponse({
          query,
          amount,
          surplus,
          savingsRate,
          riskTolerance: profile.risk_tolerance,
          recentTx: recentTx || [],
        });

        for (const chunk of chunkText(miserResponse)) {
          sendEvent({
            agent: 'miser',
            status: 'speaking',
            response: chunk,
          });
          await delay(30);
        }

        await delay(500);

        sendEvent({
          agent: 'visionary',
          status: 'thinking',
          response: '',
        });

        await delay(800);

        const visionaryResponse = generateVisionaryResponse({
          query,
          amount,
          goal: profile.financial_goal,
          surplus,
          riskTolerance: profile.risk_tolerance,
        });

        for (const chunk of chunkText(visionaryResponse)) {
          sendEvent({
            agent: 'visionary',
            status: 'speaking',
            response: chunk,
          });
          await delay(30);
        }

        await delay(500);

        sendEvent({
          agent: 'twin',
          status: 'thinking',
          response: '',
        });

        await delay(800);

        const twinResponse = generateTwinResponse({
          query,
          amount,
          surplus,
          savingsRate,
          goal: profile.financial_goal,
          riskTolerance: profile.risk_tolerance,
        });

        for (const chunk of chunkText(twinResponse)) {
          sendEvent({
            agent: 'twin',
            status: 'speaking',
            response: chunk,
          });
          await delay(30);
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkText(text: string): string[] {
  return text.split('');
}

interface MiserContext {
  query: string;
  amount?: number;
  surplus: number;
  savingsRate: number;
  recentTx?: Record<string, unknown>[];
  riskTolerance?: string;
}

function generateMiserResponse(context: MiserContext): string {
  const { amount, surplus, savingsRate } = context;

  if (amount && amount > surplus) {
    return `I must object strongly. You're considering spending $${amount}, but your monthly surplus is only $${surplus.toFixed(2)}. This would consume ${((amount / surplus) * 100).toFixed(0)}% of your buffer. Looking at your recent transactions, you've already spent significantly on discretionary items. We should preserve our resources for genuine emergencies.`;
  }

  if (savingsRate < 20) {
    return `Your current savings rate is ${savingsRate.toFixed(1)}%, which is concerning. Financial advisors recommend at least 20% savings rate. Before any major purchase, we need to establish a solid emergency fund. I suggest postponing this expense until we've built a more robust financial cushion.`;
  }

  return `While the numbers technically allow for this, I remain cautious. Your monthly surplus of $${surplus.toFixed(2)} provides some flexibility, but market uncertainty demands prudence. Perhaps we could find a more economical alternative that serves the same purpose?`;
}

interface VisionaryContext {
  query: string;
  amount?: number;
  goal: string;
  surplus: number;
  riskTolerance?: string;
}

function generateVisionaryResponse(context: VisionaryContext): string {
  const { amount, goal, surplus, riskTolerance } = context;

  if (riskTolerance === 'high') {
    return `This is exactly the kind of calculated risk that aligns with your goal of "${goal}". Yes, it's $${amount || 'a significant investment'}, but consider the potential returns. You have a ${((surplus / amount!) * 100).toFixed(0)}% safety margin. Winners don't wait for perfect conditions, they create opportunities. This purchase could be a stepping stone toward your vision.`;
  }

  return `I see this differently. Your goal is "${goal}", and every financial decision should serve that North Star. While $${amount || 'this expense'} might seem large, it's an investment in your future self. Your surplus of $${surplus.toFixed(2)} demonstrates you have the capacity. The question isn't if you can afford it, but whether it accelerates your journey toward ${goal}.`;
}

interface TwinContext {
  query: string;
  amount?: number;
  surplus: number;
  savingsRate: number;
  goal: string;
  riskTolerance?: string;
}

function generateTwinResponse(context: TwinContext): string {
  const { amount, surplus, savingsRate, goal } = context;

  const affordabilityRatio = amount ? (amount / surplus) : 0;

  if (affordabilityRatio > 1.5) {
    return `After hearing both perspectives, I recommend against this purchase. The Miser raises valid concerns about exceeding your comfortable spending range. While ambition is admirable, this would strain your finances. My recommendation: Wait 2-3 months while building your buffer, then revisit this decision with more financial breathing room.`;
  }

  if (affordabilityRatio > 0.8 && savingsRate < 15) {
    return `I'm synthesizing both viewpoints. The Visionary's enthusiasm is inspiring, but the Miser's caution is warranted given your ${savingsRate.toFixed(1)}% savings rate. Here's my balanced approach: Proceed only if you can identify $${(amount ? amount * 0.3 : 0).toFixed(2)} in unnecessary subscriptions or expenses to cut. This maintains progress toward "${goal}" while respecting financial boundaries.`;
  }

  return `Both agents make compelling arguments. You're in a reasonable position with $${surplus.toFixed(2)} monthly surplus and a ${savingsRate.toFixed(1)}% savings rate. My recommendation: Approve this purchase, but pair it with a commitment to increase your savings by 5% over the next quarter. This balances your goal of "${goal}" with the need for financial security. Think of it as a controlled experiment in aligned spending.`;
}
