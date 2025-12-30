import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getLLMService } from '@/lib/llm-service';

const MAX_MESSAGE_LENGTH = 2000;

const messageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(MAX_MESSAGE_LENGTH, `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = messageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { message, sessionId } = validationResult.data;

    // Get or create conversation
    let conversation;
    if (sessionId) {
      conversation = await prisma.conversation.findUnique({
        where: { sessionId },
      });
    }

    if (!conversation) {
      const newSessionId = sessionId || crypto.randomUUID();
      conversation = await prisma.conversation.create({
        data: { sessionId: newSessionId },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'USER',
        text: message,
      },
    });

    // Get conversation history for context
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { timestamp: 'asc' },
      select: {
        sender: true,
        text: true,
      },
    });

    // Generate AI reply
    const llmService = getLLMService();
    if (!llmService.isConfigured()) {
      // Fallback response if LLM not configured
      const fallbackReply = "I'm sorry, but our AI support is currently unavailable. Please contact us at support@spurmart.com for assistance.";

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: 'AI',
          text: fallbackReply,
        },
      });

      return NextResponse.json({
        reply: fallbackReply,
        sessionId: conversation.sessionId,
      });
    }

    const { reply, error } = await llmService.generateReply(history, message);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    // Save AI reply
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'AI',
        text: reply,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      reply,
      sessionId: conversation.sessionId,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}