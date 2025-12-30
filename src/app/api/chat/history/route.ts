import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const historySchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // Validate input
    const validationResult = historySchema.safeParse({ sessionId });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { sessionId: validationResult.data.sessionId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            sender: true,
            text: true,
            timestamp: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ messages: [], sessionId });
    }

    return NextResponse.json({
      messages: conversation.messages,
      sessionId: conversation.sessionId,
    });
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}