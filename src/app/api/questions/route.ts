import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import {
  answerKidQuestion,
  createKidQuestion,
  listHouseholdQuestions,
} from '@/lib/questions-server';
import { getStoryById } from '@/lib/stories-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (ctx.role !== 'parent' && ctx.role !== 'elder') {
      return NextResponse.json({ error: 'Parents and elders only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const unansweredOnly = searchParams.get('unanswered') === '1';
    try {
      const questions = await listHouseholdQuestions(ctx.householdId, {
        unansweredOnly,
        limit: 40,
      });
      return NextResponse.json({ questions });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('kid_questions') || message.includes('schema cache')) {
        return NextResponse.json({ questions: [], setupRequired: true });
      }
      throw err;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (ctx.role !== 'kid') {
      return NextResponse.json({ error: 'Only learners can ask questions' }, { status: 403 });
    }

    const body = await request.json();
    const storyId = String(body.storyId ?? '').trim();
    const questionText = String(body.questionText ?? '').trim();
    const sentenceId = body.sentenceId ? String(body.sentenceId) : null;
    const sentenceOrder =
      body.sentenceOrder != null && body.sentenceOrder !== ''
        ? Number(body.sentenceOrder)
        : null;

    if (!storyId || !questionText) {
      return NextResponse.json(
        { error: 'storyId and questionText are required' },
        { status: 400 }
      );
    }

    const story = await getStoryById(storyId);
    if (!story || story.story.household_id !== ctx.householdId) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const question = await createKidQuestion({
      householdId: ctx.householdId,
      kidId: ctx.authorId,
      storyId,
      sentenceId,
      sentenceOrder: Number.isFinite(sentenceOrder) ? sentenceOrder : null,
      questionText,
    });

    return NextResponse.json({ question });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save question' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (ctx.role !== 'parent' && ctx.role !== 'elder') {
      return NextResponse.json({ error: 'Parents and elders only' }, { status: 403 });
    }

    const body = await request.json();
    const questionId = String(body.questionId ?? '').trim();
    const answerText = String(body.answerText ?? '').trim();

    if (!questionId || !answerText) {
      return NextResponse.json(
        { error: 'questionId and answerText are required' },
        { status: 400 }
      );
    }

    const question = await answerKidQuestion({
      questionId,
      householdId: ctx.householdId,
      answeredBy: ctx.authorId,
      answerText,
    });

    return NextResponse.json({ question });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save answer' },
      { status: 500 }
    );
  }
}
