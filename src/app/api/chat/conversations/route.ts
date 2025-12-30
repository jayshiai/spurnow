import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((conv) => ({
        id: conv.id,
        sessionId: conv.sessionId,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv._count.messages,
        firstMessage: conv.messages[0]?.text || 'New conversation',
      })),
    });
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}