import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ThreeScene from './components/ThreeScene'
import { batchEvents, initSession, submitExperiment, type EventPayload, type Step } from './lib/api'

type Option = {
  id: string
  label: string
  image?: string
}

type ItemQuestion = {
  id: string
  name: string
  question: string
  correctOptionId: string
  options: Option[]
}

type PracticeAnswer = {
  itemId: string
  selectedOptionId: string
  durationMs: number
  isCorrect: boolean
}

type FormalAnswer = {
  itemId: string
  selectedOptionId: string
  durationMs: number
  orderIndex: number
}

type SurveyData = {
  hardestQuestion: string
  judgmentBasis: string
  readUbikBefore: string
  feedback: string
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const USER_ID_STORAGE_KEY = 'ubik_user_id'

function getOrCreateUserId() {
  const cached = window.localStorage.getItem(USER_ID_STORAGE_KEY)
  if (cached) return cached
  const next = window.crypto.randomUUID()
  window.localStorage.setItem(USER_ID_STORAGE_KEY, next)
  return next
}

const PRACTICE_QUESTION: ItemQuestion = {
  id: 'practice-cube',
  name: '正方体',
  question: '练习题（单选）：正方体有几个面？',
  correctOptionId: 'D',
  options: [
    { id: 'A', label: 'A. 3个' },
    { id: 'B', label: 'B. 4个' },
    { id: 'C', label: 'C. 5个' },
    { id: 'D', label: 'D. 6个' },
  ],
}

const PRACTICE_FEEDBACK_TEXT = {
  correctTitle: '回答正确',
  correctReason: '正确答案是 D（6个）。',
  wrongTitle: '回答错误',
  wrongReason: '正确答案是 D（6个）。',
}

const FORMAL_ITEMS: ItemQuestion[] = [
  {
    id: 'smart-speaker',
    name: '智能音箱',
    question: '如果这个智能音箱退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 留声机' },
      { id: 'B', label: 'B. 收音机' },
      { id: 'C', label: 'C. 传呼机' },
      { id: 'D', label: 'D. 麦克风' },
    ],
  },
  {
    id: 'wireless-charger',
    name: '无线充电器',
    question: '如果这个无线充电器退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 有线充电底座' },
      { id: 'B', label: 'B. 插线板' },
      { id: 'C', label: 'C. 电池盒' },
      { id: 'D', label: 'D. 变压器' },
    ],
  },
  {
    id: 'lcd-tv',
    name: '液晶电视',
    question: '如果这个液晶电视退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 幻灯机' },
      { id: 'B', label: 'B. 投影幕布' },
      { id: 'C', label: 'C. 电影放映机' },
      { id: 'D', label: 'D. CRT 电视' },
    ],
  },
  {
    id: 'air-purifier',
    name: '空气净化器',
    question: '如果这个空气净化器退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 电风扇' },
      { id: 'B', label: 'B. 加湿器' },
      { id: 'C', label: 'C. 机械通风器' },
      { id: 'D', label: 'D. 香薰机' },
    ],
  },
  {
    id: 'robot-vacuum',
    name: '扫地机器人',
    question: '如果这个扫地机器人退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 手推吸尘器' },
      { id: 'B', label: 'B. 鸡毛掸子' },
      { id: 'C', label: 'C. 拖把' },
      { id: 'D', label: 'D. 扫帚' },
    ],
  },
  {
    id: 'smartwatch',
    name: '智能手表',
    question: '如果这个智能手表退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 秒表' },
      { id: 'B', label: 'B. 机械计步器' },
      { id: 'C', label: 'C. 电子表' },
      { id: 'D', label: 'D. 机械腕表' },
    ],
  },
  {
    id: 'tablet',
    name: '平板电脑',
    question: '如果这个平板电脑退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 打字机' },
      { id: 'B', label: 'B. 纸质笔记本' },
      { id: 'C', label: 'C. 电话簿' },
      { id: 'D', label: 'D. 黑板' },
    ],
  },
  {
    id: 'bluetooth-headset',
    name: '蓝牙耳机',
    question: '如果这个蓝牙耳机退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 扩音喇叭' },
      { id: 'B', label: 'B. 收音机天线' },
      { id: 'C', label: 'C. 有线耳机' },
      { id: 'D', label: 'D. 助听器' },
    ],
  },
  {
    id: 'induction-cooker',
    name: '电磁炉',
    question: '如果这个电磁炉退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 电热炉' },
      { id: 'B', label: 'B. 炭火炉' },
      { id: 'C', label: 'C. 酒精炉' },
      { id: 'D', label: 'D. 煤气灶' },
    ],
  },
  {
    id: 'smart-door-lock',
    name: '智能门锁',
    question: '如果这个智能门锁退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 门铃' },
      { id: 'B', label: 'B. 插销' },
      { id: 'C', label: 'C. 门把手' },
      { id: 'D', label: 'D. 机械钥匙锁' },
    ],
  },
]

function shuffleOptions(options: Option[]): Option[] {
  return [...options].sort(() => Math.random() - 0.5)
}

function getInitialStepFromQuery(): Step {
  const stepParam = new URLSearchParams(window.location.search).get('step')
  if (stepParam === 'welcome') return 'welcome'
  if (stepParam === 'tutorial') return 'practice'
  if (stepParam === 'practice') return 'practice'
  if (stepParam === 'formal') return 'formal'
  if (stepParam === 'survey') return 'survey'
  return 'welcome'
}

function App() {
  const [step, setStep] = useState<Step>(() => getInitialStepFromQuery())
  const [sessionId, setSessionId] = useState('')
  const [userId] = useState(() => getOrCreateUserId())
  const [participantPhone, setParticipantPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  const [practicePanelOpen, setPracticePanelOpen] = useState(false)
  const [practiceSelected, setPracticeSelected] = useState('')
  const [practiceAnswer, setPracticeAnswer] = useState<PracticeAnswer | null>(null)
  const [showPracticeFeedback, setShowPracticeFeedback] = useState(false)
  const [showEnterFormalButton, setShowEnterFormalButton] = useState(false)
  const [practiceFeedbackShownAt, setPracticeFeedbackShownAt] = useState<number | null>(null)
  const [practiceActiveItemIds, setPracticeActiveItemIds] = useState<string[]>([])

  const [formalPanelItem, setFormalPanelItem] = useState<ItemQuestion | null>(null)
  const [formalSelected, setFormalSelected] = useState('')
  const [formalAnswers, setFormalAnswers] = useState<FormalAnswer[]>([])

  const [surveyData, setSurveyData] = useState<SurveyData>({
    hardestQuestion: '',
    judgmentBasis: '',
    readUbikBefore: '',
    feedback: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [surveyQuestionDurationsMs, setSurveyQuestionDurationsMs] = useState<Record<string, number>>({})

  const [position, setPosition] = useState({ x: 0, z: 0 })
  const [nowMs, setNowMs] = useState(Date.now())

  const eventsRef = useRef<EventPayload[]>([])
  const practiceFeedbackTimerRef = useRef<number | null>(null)
  const experimentStartAtRef = useRef<number>(0)
  const panelOpenAtRef = useRef<number>(0)
  const formalOrderRef = useRef<number>(0)
  const surveyQuestionOpenAtRef = useRef<Record<string, number>>({})

  const formalAnsweredIds = useMemo(
    () => new Set(formalAnswers.map((a) => a.itemId)),
    [formalAnswers],
  )

  const formalOptionMap = useMemo(() => {
    return new Map(FORMAL_ITEMS.map((item) => [item.id, shuffleOptions(item.options)]))
  }, [])

  const track = (eventName: string, payload?: Record<string, unknown>) => {
    if (!sessionId) return
    eventsRef.current.push({
      event_id: uid(),
      event_name: eventName,
      event_time: new Date().toISOString(),
      step,
      session_id: sessionId,
      page_url: window.location.pathname,
      payload,
    })
  }

  const flushEvents = async () => {
    if (eventsRef.current.length === 0) return
    const batch = [...eventsRef.current]
    eventsRef.current = []
    try {
      await batchEvents(batch)
    } catch {
      eventsRef.current = [...batch, ...eventsRef.current]
    }
  }

  useEffect(() => {
    void (async () => {
      const session = await initSession(userId)
      setSessionId(session.sessionId)
    })()
  }, [userId])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void flushEvents()
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const beforeUnload = () => {
      void flushEvents()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    track(`${step}_view`)
    if (step === 'practice') {
      track('tutorial_view')
      track('practice_scene_loaded')
    }
  }, [sessionId, step])


  useEffect(() => {
    if (step !== 'survey') return
    const openedAt = Date.now()
    surveyQuestionOpenAtRef.current = {
      hardestQuestion: openedAt,
      judgmentBasis: openedAt,
      readUbikBefore: openedAt,
      feedback: openedAt,
    }
    setSurveyQuestionDurationsMs({})
  }, [step])


  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 200)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (practiceFeedbackTimerRef.current) {
        window.clearTimeout(practiceFeedbackTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (step !== 'practice' && step !== 'formal') return
    const listener = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!['w', 'a', 's', 'd'].includes(key)) return
      setPosition((prev) => {
        const delta = 1
        if (key === 'w') return { ...prev, z: prev.z - delta }
        if (key === 's') return { ...prev, z: prev.z + delta }
        if (key === 'a') return { ...prev, x: prev.x - delta }
        return { ...prev, x: prev.x + delta }
      })
      track('movement_key_press', { key })
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [step, sessionId])

  const goToStep = (next: Step) => {
    setLoading(true)
    setTimeout(() => {
      setStep(next)
      setLoading(false)
    }, 500)
  }

  const openPracticePanel = useCallback(() => {
    setPracticePanelOpen(true)
    setPracticeSelected('')
    setPracticeAnswer(null)
    setShowPracticeFeedback(false)
    setShowEnterFormalButton(false)
    setPracticeFeedbackShownAt(null)
    if (practiceFeedbackTimerRef.current) {
      window.clearTimeout(practiceFeedbackTimerRef.current)
      practiceFeedbackTimerRef.current = null
    }
    panelOpenAtRef.current = Date.now()
    track('practice_object_clicked', { itemId: PRACTICE_QUESTION.id })
  }, [sessionId, step])

  const submitPractice = () => {
    if (!practiceSelected) return
    const isCorrect = practiceSelected === PRACTICE_QUESTION.correctOptionId
    const answer: PracticeAnswer = {
      itemId: PRACTICE_QUESTION.id,
      selectedOptionId: practiceSelected,
      isCorrect,
      durationMs: Date.now() - panelOpenAtRef.current,
    }
    setPracticeAnswer(answer)
    setShowPracticeFeedback(true)
    setShowEnterFormalButton(false)
    setPracticeFeedbackShownAt(Date.now())
    track('practice_answer_submitted', {
      itemId: answer.itemId,
      selectedOptionId: answer.selectedOptionId,
      isCorrect: answer.isCorrect,
      durationMs: answer.durationMs,
    })
    track('practice_feedback_shown', {
      itemId: answer.itemId,
      isCorrect: answer.isCorrect,
    })

    if (practiceFeedbackTimerRef.current) {
      window.clearTimeout(practiceFeedbackTimerRef.current)
    }
    practiceFeedbackTimerRef.current = window.setTimeout(() => {
      setShowEnterFormalButton(true)
    }, 3000)
  }

  const enterFormal = () => {
    if (practiceFeedbackTimerRef.current) {
      window.clearTimeout(practiceFeedbackTimerRef.current)
      practiceFeedbackTimerRef.current = null
    }
    experimentStartAtRef.current = Date.now()
    goToStep('formal')
    track('enter_formal_experiment_click')
  }

  const openFormalPanel = useCallback(
    (item: ItemQuestion) => {
      if (formalAnsweredIds.has(item.id)) return
      setFormalPanelItem(item)
      setFormalSelected('')
      panelOpenAtRef.current = Date.now()
      track('formal_question_opened', { itemId: item.id })
    },
    [formalAnsweredIds, sessionId, step],
  )

  const submitFormal = () => {
    if (!formalPanelItem || !formalSelected) return
    formalOrderRef.current += 1
    const answer: FormalAnswer = {
      itemId: formalPanelItem.id,
      selectedOptionId: formalSelected,
      durationMs: Date.now() - panelOpenAtRef.current,
      orderIndex: formalOrderRef.current,
    }
    const nextAnswers = [...formalAnswers, answer]
    setFormalAnswers(nextAnswers)
    setFormalPanelItem(null)
    track('formal_answer_submitted', {
      itemId: answer.itemId,
      selectedOptionId: answer.selectedOptionId,
      durationMs: answer.durationMs,
      orderIndex: answer.orderIndex,
    })

    if (nextAnswers.length === FORMAL_ITEMS.length) {
      track('formal_all_completed')
      setTimeout(() => goToStep('survey'), 400)
    }
  }

  const markSurveyAnswered = (questionKey: keyof SurveyData) => {
    const openedAt = surveyQuestionOpenAtRef.current[questionKey]
    if (!openedAt) return
    setSurveyQuestionDurationsMs((prev) => {
      if (prev[questionKey]) return prev
      return {
        ...prev,
        [questionKey]: Date.now() - openedAt,
      }
    })
  }

  const surveyValid =
    Boolean(surveyData.hardestQuestion) &&
    Boolean(surveyData.judgmentBasis) &&
    Boolean(surveyData.readUbikBefore)

  const submitSurvey = async () => {
    if (!surveyValid || submitting) return
    setSubmitting(true)
    track('survey_submit_click')

    const payload = {
      sessionId,
      userId,
      totalDurationMs: Date.now() - experimentStartAtRef.current,
      practiceAnswer,
      formalAnswers,
      surveyData,
      surveyQuestionDurationsMs,
      eventBufferLength: eventsRef.current.length,
    }

    try {
      await flushEvents()
      await submitExperiment(payload)
      track('survey_submit_success')
      setSubmitSuccess(true)
      setToast('提交成功！再次感谢您的参与！')
    } catch {
      track('survey_submit_failed')
      setToast('提交失败，请检查网络后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const practiceSceneItems = useMemo(
    () => [
      {
        id: PRACTICE_QUESTION.id,
        name: PRACTICE_QUESTION.name,
        answered: false,
        slotOverride: 14,
      },
    ],
    [],
  )

  const formalSceneItems = useMemo(
    () =>
      FORMAL_ITEMS.map((item) => ({
        id: item.id,
        name: item.name,
        answered: formalAnsweredIds.has(item.id),
      })),
    [formalAnsweredIds],
  )

  const handlePracticeItemClick = useCallback(() => {
    openPracticePanel()
  }, [])

  const handleFormalItemClick = useCallback((itemId: string) => {
    const item = FORMAL_ITEMS.find((it) => it.id === itemId)
    if (!item) return
    openFormalPanel(item)
  }, [formalAnsweredIds])

  const isSceneStep = step === 'practice' || step === 'formal'


  const navSteps = [
    { key: 'consent', label: 'Step 0 知情同意' },
    { key: 'tutorial', label: 'Step 1 操作教学' },
    { key: 'formal', label: 'Step 2 正式试验' },
    { key: 'survey', label: 'Step 3 问卷与反馈' },
    { key: 'thanks', label: '☑️谢谢参与' },
  ] as const

  const activeNavStepKey = submitSuccess
    ? 'thanks'
    : step === 'welcome'
      ? 'consent'
      : step === 'practice' || step === 'tutorial'
        ? 'tutorial'
        : step === 'formal'
          ? 'formal'
          : 'survey'

  return (
    <div className={isSceneStep ? 'app-shell app-shell--scene' : 'app-shell'}>
      <header className={isSceneStep ? 'global-nav global-nav--overlay' : 'global-nav'}>
        <div className="global-nav__brand">Ubik Experiment</div>
        <nav className="global-nav__steps" aria-label="实验步骤导航">
          {navSteps.map((item, index) => (
            <div key={item.key} className="global-nav__step-item-wrap">
              <span className={item.key === activeNavStepKey ? 'global-nav__step-item active' : 'global-nav__step-item'}>
                {item.label}
                {item.key === 'formal' && step === 'formal' && (
                  <span className="global-nav__progress">（{formalAnswers.length}/10）</span>
                )}
              </span>
              {index < navSteps.length - 1 && <span className="global-nav__step-sep">----</span>}
            </div>
          ))}
        </nav>
      </header>

      {loading && <div className="loading">加载中，请稍候...</div>}

      {!loading && step === 'welcome' && (
        <section className="panel hero">
          <h2>尤比克退行认知匹配实验</h2>
          <p className="hero-intro">
            在著名科幻作家菲利普迪克所著小说《尤比克》的世界观中，现代物品会“退行”为1930年代在功能上对应的物品，你将进入
            2030现代客厅并完成 10 道判断题。
          </p>

          <label className="phone-input-row">
            <span>填写用户ID：请填写你的电话号码</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="请输入电话号码"
              value={participantPhone}
              onChange={(e) => {
                const nextValue = e.target.value.replace(/[^\d]/g, '').slice(0, 20)
                setParticipantPhone(nextValue)
              }}
            />
          </label>

          <button
            className="start-btn"
            disabled={!participantPhone}
            onClick={() => {
              track('start_experiment_click', { participantPhone })
              goToStep('practice')
            }}
          >
            开始
          </button>
        </section>
      )}

      {!loading && step === 'practice' && (
        <section className="scene-wrap">
          {!practicePanelOpen && (
            <div className="scene-overlay-top scene-overlay-top--tutorial">
              <div>
                <p>键盘W,A, S, D 可控制前后左右移动，鼠标可控制视角</p>
              </div>
            </div>
          )}

          <div className="scene scene--practice">
            {!practicePanelOpen && (
              <div className="scene-hud scene-hud--practice">
                <span>
                  {practiceActiveItemIds.length > 0
                    ? '请点击物体'
                    : '请靠近物体直到物体发光'}
                </span>
              </div>
            )}
            <ThreeScene
              items={practiceSceneItems}
              onItemClick={handlePracticeItemClick}
              onActiveItemsChange={setPracticeActiveItemIds}
              scenePreset="practice"
              interactionLocked={practicePanelOpen}
              renderUnusedSlots={false}
              initialCameraPosition={[-1.5, 2.4, 5.6]}
              initialTarget={[-3.2, 1.25, 3.5]}
            />
          </div>

          {practicePanelOpen && (
            <div className="qa-panel qa-panel--practice">
              {showEnterFormalButton ? (
                <>
                  <h3 className="practice-finish-title">恭喜完成操作教学环节！</h3>
                  <div className="bottom-action bottom-action--in-panel">
                    <button onClick={enterFormal}>进入正式实验</button>
                  </div>
                </>
              ) : (
                <>
                  {!showPracticeFeedback && (
                    <>
                      <div className="qa-panel-meta">练习题（单题）</div>
                      <h3>{PRACTICE_QUESTION.question}</h3>
                      <div className="options-grid">
                        {PRACTICE_QUESTION.options.map((opt) => (
                          <button
                            key={opt.id}
                            className={practiceSelected === opt.id ? 'opt selected' : 'opt'}
                            onClick={() => {
                              setPracticeSelected(opt.id)
                              track('practice_option_selected', { optionId: opt.id })
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <button disabled={!practiceSelected} onClick={submitPractice}>
                        确认选择
                      </button>
                    </>
                  )}

                  {showPracticeFeedback && practiceAnswer && (
                    <div className={practiceAnswer.isCorrect ? 'feedback feedback--correct' : 'feedback feedback--wrong'}>
                      <strong>
                        {practiceAnswer.isCorrect
                          ? PRACTICE_FEEDBACK_TEXT.correctTitle
                          : PRACTICE_FEEDBACK_TEXT.wrongTitle}
                      </strong>
                      <p>
                        {practiceAnswer.isCorrect
                          ? PRACTICE_FEEDBACK_TEXT.correctReason
                          : PRACTICE_FEEDBACK_TEXT.wrongReason}
                      </p>
                    </div>
                  )}

                  {showPracticeFeedback && !showEnterFormalButton && practiceFeedbackShownAt && (
                    <div className="practice-delay-tip">
                      {Math.max(0, 3 - Math.floor((nowMs - practiceFeedbackShownAt) / 1000))} 秒后可进入正式实验
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {!loading && step === 'formal' && (
        <section className="scene-wrap">
          <div className="scene-overlay-top">
            <h1>《尤比克》物品退行认知实验平台</h1>
            <div className="scene-top-actions">
              <div className="counter counter--overlay">{formalAnswers.length}/10 已完成</div>
              <button className="ghost-btn" onClick={() => goToStep('survey')}>
                跳到问卷页
              </button>
            </div>
          </div>

          <div className="scene">
            <div className="scene-hud">
              <span>
                坐标 X:{position.x} Z:{position.z}
              </span>
              <span>自由移动并点击发光物品作答</span>
            </div>
            <ThreeScene items={formalSceneItems} onItemClick={handleFormalItemClick} />
          </div>

          {formalPanelItem && (
            <div className="qa-panel">
              <h3>{formalPanelItem.question}</h3>
              <div className="options-grid">
                {(formalOptionMap.get(formalPanelItem.id) ?? formalPanelItem.options).map((opt) => (
                  <button
                    key={opt.id}
                    className={formalSelected === opt.id ? 'opt selected' : 'opt'}
                    onClick={() => {
                      setFormalSelected(opt.id)
                      track('formal_option_selected', {
                        itemId: formalPanelItem.id,
                        optionId: opt.id,
                      })
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button disabled={!formalSelected} onClick={submitFormal}>
                确认选择
              </button>
            </div>
          )}
        </section>
      )}

      {!loading && step === 'survey' && (
        <section className="panel survey">
          <h2>实验完成！感谢你的参与！</h2>

          <label>
            1. 你觉得哪道题最难做判断？
            <select
              value={surveyData.hardestQuestion}
              onChange={(e) => {
                markSurveyAnswered('hardestQuestion')
                setSurveyData((prev) => ({ ...prev, hardestQuestion: e.target.value }))
              }}
            >
              <option value="">请选择</option>
              {FORMAL_ITEMS.map((_, index) => (
                <option key={index + 1} value={`第${index + 1}题`}>
                  第{index + 1}题
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend>2. 你在做判断时主要依据什么？</legend>
            {['物品的功能用途', '物品的外形相似度', '物品的时代感', '直觉'].map((item) => (
              <label key={item} className="radio-line">
                <input
                  type="radio"
                  name="basis"
                  checked={surveyData.judgmentBasis === item}
                  onChange={() => {
                    markSurveyAnswered('judgmentBasis')
                    setSurveyData((prev) => ({ ...prev, judgmentBasis: item }))
                  }}
                />
                {item}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>3. 你之前是否读过《尤比克》或了解这个世界观？</legend>
            {['是', '否'].map((item) => (
              <label key={item} className="radio-line">
                <input
                  type="radio"
                  name="ubik"
                  checked={surveyData.readUbikBefore === item}
                  onChange={() => {
                    markSurveyAnswered('readUbikBefore')
                    setSurveyData((prev) => ({ ...prev, readUbikBefore: item }))
                  }}
                />
                {item}
              </label>
            ))}
          </fieldset>

          <label>
            4. 任何想补充的反馈？（选填）
            <textarea
              maxLength={500}
              value={surveyData.feedback}
              onChange={(e) => {
                markSurveyAnswered('feedback')
                setSurveyData((prev) => ({ ...prev, feedback: e.target.value }))
              }}
              rows={5}
              placeholder="请输入你的反馈（最多500字）"
            />
          </label>

          <button disabled={!surveyValid || submitting} onClick={() => void submitSurvey()}>
            {submitting ? '提交中...' : '提交问卷'}
          </button>
        </section>
      )}


      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
