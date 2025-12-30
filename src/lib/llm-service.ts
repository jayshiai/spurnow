import OpenAI from 'openai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a helpful support agent for "SpurMart", a small e-commerce store. Answer clearly and concisely.

Here is what you know about our store:

## Shipping Policy
- We offer free shipping on orders over $50
- Standard shipping takes 3-5 business days within the US
- Express shipping (1-2 business days) is available for $12.99
- We ship to all 50 US states and Puerto Rico
- International shipping is not currently available

## Return & Refund Policy
- Returns are accepted within 30 days of purchase
- Items must be unworn, unwashed, and in original packaging
- Return shipping is free for defective items
- For other returns, customer pays return shipping ($5.99 flat rate)
- Refunds are processed within 5-7 business days of receiving the return
- Gift cards and final sale items cannot be returned

## Support Hours
- Our support team is available Monday-Friday, 9 AM - 6 PM EST
- Weekend support is limited to email only
- Response time: typically within 2 hours during business hours

## Payment Methods
- We accept all major credit cards (Visa, Mastercard, Amex, Discover)
- PayPal, Apple Pay, and Google Pay are also accepted
- All payments are securely processed

If you don't know the answer to a question, politely say you don't have that information and suggest they contact our support team at support@spurmart.com.`;

export class LLMService {
  private client: OpenAI | null = null;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  private formatHistory(messages: Array<{ sender: string; text: string }>): ChatMessage[] {
    return messages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));
  }

  async generateReply(
    history: Array<{ sender: string; text: string }>,
    userMessage: string
  ): Promise<{ reply: string; error?: string }> {
    if (!this.client) {
      return {
        reply: '',
        error: 'LLM service not configured. Please check API key.',
      };
    }

    try {
      const formattedHistory = this.formatHistory(history);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...formattedHistory.slice(-10), // Keep last 10 messages for context
          { role: 'user', content: userMessage },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const reply = response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

      return { reply };
    } catch (error) {
      console.error('LLM API error:', error);

      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          return {
            reply: '',
            error: 'Invalid API key. Please contact support.',
          };
        }
        if (error.status === 429) {
          return {
            reply: '',
            error: 'Service is experiencing high demand. Please try again in a moment.',
          };
        }
        if (error.status === 500 || error.status === 502 || error.status === 503) {
          return {
            reply: '',
            error: 'Our AI service is temporarily unavailable. Please try again.',
          };
        }
      }

      return {
        reply: '',
        error: 'Something went wrong. Please try again.',
      };
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }
}

// Singleton instance
let llmServiceInstance: LLMService | null = null;

export function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
  }
  return llmServiceInstance;
}