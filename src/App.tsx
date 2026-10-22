import { useCallback, useEffect, useMemo, useState } from 'react';
import ComputingScreen from './components/ComputingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import ScanOverlay from './components/ScanOverlay';
import SiteFooter from './components/SiteFooter';
import AuthorLink from './components/AuthorLink';
import HomePage from './pages/HomePage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import ReviewPage from './pages/ReviewPage';
import { QUESTIONS_PER_TEST, type Question } from './data/questions';
import { SITE_NAME } from './data/site';
import { computeResult, type Answers, type RawResult } from './lib/scoring';
import { buildDisplayPaper, newSeed } from './lib/paper';
import {
  clearProgress,
  getConsent,
  loadLastResult,
  loadProgress,
  saveLastResult,
  saveProgress,
  setConsent,
  storageAvailable,
  type ConsentState,
} from './lib/storage';

type Route = 'home' | 'quiz' | 'computing' | 'result' | 'review';

function AppInner() {
  const [route, setRoute] = useState<Route>('home');
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<RawResult | null>(null);

  /* 每次开始检测都会生成一份新的随机试卷 */
  const [paperSeed, setPaperSeed] = useState<number>(() => newSeed());
  const [paper, setPaper] = useState<Question[]>(() => buildDisplayPaper(paperSeed));

  const [progress, setProgress] = useState(() => loadProgress());
  const [lastResult, setLastResult] = useState<RawResult | null>(() => loadLastResult<RawResult>());
  const [consent, setConsentState] = useState<ConsentState>(() => getConsent());
  const [storageOk] = useState(() => storageAvailable());

  /* 标题随路由变化 */
  useEffect(() => {
    const map: Record<Route, string> = {
      home: `${SITE_NAME} · 检测一下，你还剩多少人类属性？`,
      quiz: `检测中 · ${SITE_NAME}`,
      computing: `生成报告 · ${SITE_NAME}`,
      result: result ? `${result.archetype.name} · ${SITE_NAME}` : `鉴定报告 · ${SITE_NAME}`,
      review: `回看答案 · ${SITE_NAME}`,
    };
    document.title = map[route];
  }, [route, result]);

  /* 答题过程中随时保存进度（仅在用户同意后生效） */
  useEffect(() => {
    if (route !== 'quiz') return;
    saveProgress(answers, index, paperSeed);
  }, [answers, index, route, paperSeed]);

  /** 开一份全新试卷 */
  const freshPaper = useCallback((): { seed: number; paper: Question[] } => {
    const seed = newSeed();
    return { seed, paper: buildDisplayPaper(seed) };
  }, []);

  const startNew = useCallback(() => {
    const next = freshPaper();
    setPaperSeed(next.seed);
    setPaper(next.paper);
    setAnswers({});
    setIndex(0);
    setResult(null);
    setRoute('quiz');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [freshPaper]);

  const resume = useCallback(() => {
    if (!progress) return;
    // 用保存的种子重建同一份试卷，保证题目、选项顺序与上次完全一致
    setPaperSeed(progress.paperSeed);
    const rebuilt = buildDisplayPaper(progress.paperSeed);
    setPaper(rebuilt);
    setAnswers(progress.answers);
    const firstUnanswered = rebuilt.findIndex((q) => !progress.answers[q.id]);
    const target = firstUnanswered === -1 ? Math.max(0, progress.index) : firstUnanswered;
    setIndex(Math.min(Math.max(0, target), Math.max(0, rebuilt.length - 1)));
    setRoute('quiz');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [progress]);

  const discardProgress = useCallback(() => {
    clearProgress();
    setProgress(null);
  }, []);

  const handleAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }, []);

  /* 先进入「检测中」动画页，再落到结果页 */
  const finish = useCallback(() => {
    setRoute('computing');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const showResult = useCallback(() => {
    const computed = computeResult(answers, { paper, paperSeed });
    setResult(computed);
    saveLastResult(computed);
    clearProgress();
    setProgress(null);
    setRoute('result');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [answers, paper, paperSeed]);

  const restart = useCallback(() => {
    const next = freshPaper();
    setPaperSeed(next.seed);
    setPaper(next.paper);
    setAnswers({});
    setIndex(0);
    setResult(null);
    clearProgress();
    setProgress(null);
    setRoute('quiz');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [freshPaper]);

  const goHome = useCallback(() => {
    // 有未完成答案时，回首页保留进度提示
    setProgress(loadProgress());
    setRoute('home');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const viewLastResult = useCallback(() => {
    if (!lastResult) return;
    setResult(lastResult);
    setRoute('result');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [lastResult]);

  const grantConsent = useCallback(() => {
    setConsent('granted');
    setConsentState('granted');
    saveProgress(answers, index, paperSeed);
  }, [answers, index, paperSeed]);

  const denyConsent = useCallback(() => {
    setConsent('denied');
    setConsentState('denied');
    setProgress(null);
    setLastResult(null);
  }, []);

  const handleFooterCleared = useCallback(() => {
    setProgress(null);
    setLastResult(null);
    setConsentState('unset');
    setAnswers({});
    setIndex(0);
    setResult(null);
    setRoute('home');
  }, []);

  /* 结果不存在时兜底 */
  useEffect(() => {
    if (route === 'result' && !result) {
      const stored = loadLastResult<RawResult>();
      if (stored) setResult(stored);
      else setRoute('home');
    }
  }, [route, result]);

  const storageOn = storageOk && consent === 'granted';

  const content = useMemo(() => {
    if (route === 'computing') {
      return (
        <ComputingScreen
          answeredCount={Object.keys(answers).length}
          total={paper.length}
          onDone={showResult}
        />
      );
    }
    if (route === 'quiz') {
      return (
        <QuizPage
          paper={paper}
          answers={answers}
          index={index}
          onAnswer={handleAnswer}
          onIndexChange={setIndex}
          onFinish={finish}
          onRestart={restart}
          onExit={goHome}
          storageOn={storageOn}
        />
      );
    }
    if (route === 'result' && result) {
      return (
        <ResultPage
          result={result}
          onRestart={restart}
          onHome={goHome}
          onReviewAnswers={() => setRoute('review')}
        />
      );
    }
    if (route === 'review') {
      return (
        <ReviewPage
          paper={paper}
          answers={answers}
          onBack={() => setRoute('result')}
          onRestart={restart}
          onEditQuestion={(questionIndex) => {
            setIndex(questionIndex);
            setRoute('quiz');
          }}
        />
      );
    }
    return (
      <HomePage
        progress={progress}
        lastResult={progress ? null : lastResult}
        consent={consent}
        storageOk={storageOk}
        paperSize={QUESTIONS_PER_TEST}
        onStart={startNew}
        onResume={resume}
        onDiscardProgress={discardProgress}
        onViewLastResult={viewLastResult}
        onGrantConsent={grantConsent}
        onDenyConsent={denyConsent}
      />
    );
  }, [
    route,
    answers,
    index,
    result,
    progress,
    lastResult,
    consent,
    storageOk,
    storageOn,
    paper,
    handleAnswer,
    finish,
    showResult,
    restart,
    goHome,
    resume,
    startNew,
    discardProgress,
    viewLastResult,
    grantConsent,
    denyConsent,
  ]);

  return (
    <div className="app">
      <ScanOverlay />

      <header className="topbar">
        <div className="shell topbar-inner">
          <button
            type="button"
            className="brand"
            onClick={() => {
              if (route !== 'home') goHome();
            }}
            style={{ padding: 0 }}
            aria-label="返回首页"
          >
            <span className="brand-mark" aria-hidden="true">
              CH
            </span>
            <span>
              {SITE_NAME}
              <span className="brand-sub" style={{ display: 'block', letterSpacing: '0.28em' }}>
                CYBER HUMAN LAB
              </span>
            </span>
          </button>

          <div className="topbar-status">
            <span className="status-dot" aria-hidden="true" />
            <span>SYSTEM ONLINE</span>
            <span style={{ color: 'var(--muted-2)' }}>|</span>
            <span>{paper.length || QUESTIONS_PER_TEST} QUERIES</span>
            <span style={{ color: 'var(--muted-2)' }}>|</span>
            <span>LOCAL ONLY</span>
          </div>

          <AuthorLink />
        </div>
      </header>

      <main className="app-main">{content}</main>

      <SiteFooter
        onCleared={handleFooterCleared}
        onViewLastResult={lastResult ? viewLastResult : undefined}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
