import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  PERCEPTION_QUESTIONS,
  type MBTIType,
} from '@mbti/shared';
import { apiCall } from '@/lib/api';
import { safeCapture } from '@/lib/posthog';
import { useTestStore } from '@/features/test/store/useTestStore';
import { QuestionCard } from '@/features/test/components/QuestionCard';

type GetInviteResponse = {
  data: {
    inviteToken: string;
    inviterPersonaName: string;
    inviterMbtiType: MBTIType;
    expiredAt: string;
  } | null;
  error: { code: string; message: string } | null;
};

type VoteResponse = {
  data: { voteId: string } | null;
  error: { code: string; message: string } | null;
};

type Step = 'landing' | 'voting' | 'submitting' | 'error';

function CenteredMessage({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <main
      id="main"
      className="min-h-svh bg-surface-deep flex items-center justify-center px-6"
    >
      <div className="text-center max-w-sm bg-surface-elevated border border-[var(--hairline)] rounded-2xl shadow-[var(--shadow-e2)] px-8 py-10">
        <h1 className="font-clash text-[24px] font-bold text-white mb-3">{title}</h1>
        <p className="text-slate-400 text-[15px] mb-7 leading-relaxed">{body}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cta-primary hover:bg-cta-hover text-white font-semibold text-[15px] transition-[transform,background-color] duration-[var(--dur-fast)] hover:-translate-y-[1px] active:translate-y-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-deep"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}

export function InviteeLanding() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setInviteSource = useTestStore((s) => s.setInviteSource);
  const [step, setStep] = useState<Step>('landing');
  const [answers, setAnswers] = useState<Array<{ questionId: string; value: number }>>([]);
  const [questionIndex, setQuestionIndex] = useState(0);

  const {
    data: invite,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => apiCall<GetInviteResponse>(`/api/invites/${token}`),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (invite?.data) safeCapture('invite_opened', { inviteToken: token });
  }, [invite, token]);

  const voteMutation = useMutation({
    mutationFn: (payload: {
      inviteToken: string;
      answers: typeof answers;
    }) =>
      apiCall<VoteResponse>('/api/social/vote', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      if (!token) return;
      setInviteSource(token);
      safeCapture('perception_vote_submitted_client', { inviteToken: token });
      navigate(`/test?inviteSource=${token}`, { replace: true });
    },
    onError: () => {
      setStep('error');
    },
  });

  if (isLoading) {
    return (
      <main
        id="main"
        className="min-h-svh bg-surface-deep flex items-center justify-center"
        aria-label="Đang tải link mời"
        aria-live="polite"
      >
        <svg
          className="animate-spin text-white/20"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
        </svg>
      </main>
    );
  }

  if (isError || !invite?.data) {
    const code = invite?.error?.code ?? '';
    if (code === 'INVITE_EXPIRED') {
      return (
        <CenteredMessage
          title="Link này đã hết hạn"
          body="Bạn có thể nhờ người gửi tạo link mới."
        />
      );
    }
    return (
      <CenteredMessage
        title="Không tìm thấy link"
        body="Có thể link đã bị xóa hoặc nhập sai."
      />
    );
  }

  const inviter = invite.data;

  if (step === 'landing') {
    return (
      <main
        id="main"
        className="min-h-svh bg-surface-deep flex flex-col items-center justify-center px-6 text-center"
      >
        <div className="max-w-sm w-full flex flex-col gap-6">
          <p className="text-[14px] tracking-[0.3em] uppercase text-slate-400">
            Một người mời bạn
          </p>
          <h1
            className={`font-clash text-[40px] leading-tight text-type-${inviter.inviterMbtiType}`}
          >
            {inviter.inviterPersonaName}
          </h1>
          <p
            className={`text-[14px] tracking-[0.3em] uppercase text-type-${inviter.inviterMbtiType}`}
          >
            {inviter.inviterMbtiType}
          </p>
          <p className="text-slate-300 text-[15px] leading-relaxed">
            3 câu hỏi ngắn về cách bạn cảm nhận họ — rồi bạn cũng được làm bài test 12 câu.
          </p>
          <button
            type="button"
            onClick={() => setStep('voting')}
            data-testid="invitee-continue"
            className={`mt-4 w-full h-[56px] rounded-2xl font-semibold text-[15px] cursor-pointer shadow-[var(--shadow-e2)] transition-[transform,opacity] duration-[var(--dur-fast)] bg-type-${inviter.inviterMbtiType} text-white hover:-translate-y-[1px] hover:opacity-95 active:translate-y-0 active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-deep`}
          >
            Tiếp tục
          </button>
        </div>
      </main>
    );
  }

  if (step === 'error') {
    return (
      <CenteredMessage
        title="Có lỗi xảy ra"
        body="Không gửi được câu trả lời. Vui lòng thử lại."
      />
    );
  }

  // Voting flow — reuse QuestionCard
  const q = PERCEPTION_QUESTIONS[questionIndex];
  if (!q) {
    return null;
  }

  const handleAnswer = (questionId: string, value: number) => {
    const next = [...answers.filter((a) => a.questionId !== questionId), { questionId, value }];
    setAnswers(next);
    if (questionIndex + 1 < PERCEPTION_QUESTIONS.length) {
      setQuestionIndex(questionIndex + 1);
      return;
    }
    setStep('submitting');
    voteMutation.mutate({ inviteToken: inviter.inviteToken, answers: next });
  };

  return (
    // `key` remounts QuestionCard per question so its internal `selected`
    // state resets — without it, after Q1 every option stays disabled and the
    // invitee is stuck (mirrors TestFlow.tsx which keys on currentQuestion.id).
    <QuestionCard
      key={q.id}
      question={{
        id: q.id,
        text: q.text.replace('Người này', inviter.inviterPersonaName),
        dimension: 'E_I',
        options: q.options.map((o) => ({ label: o.label, value: o.value })),
      }}
      questionIndex={questionIndex}
      onAnswer={handleAnswer}
    />
  );
}
