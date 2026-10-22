import type { DimensionKey } from './dimensions';

/** 每个选项对维度的影响：只写需要调整的维度 */
export type DimensionEffects = Partial<Record<DimensionKey, number>>;

export interface QuestionOption {
  id: string;
  label: string;
  /** 选项下方的补充说明，可选 */
  note?: string;
  effects: DimensionEffects;
  /** 趣味标签，被选中时进入结果页 */
  tags?: string[];
}

export type Topic = '注意力' | '拖延' | '社交' | '网络依赖' | '消费' | '情绪' | '执行力';

export interface Question {
  id: string;
  /** 所属主题，用于按主题均衡抽题 */
  topic: Topic;
  text: string;
  /** 题干下方的简短提示 */
  hint?: string;
  options: QuestionOption[];
}

/**
 * 题库版本号：题目结构变更时递增，旧版本进度会被识别为过期而不恢复。
 */
export const QUESTION_SET_VERSION = 5;

/** 单次检测的题量。题库远大于此数，每次进入测试都会重新抽题。 */
export const QUESTIONS_PER_TEST = 18;

/**
 * 抽题配额：每个主题固定抽几道，保证任何一份随机试卷都覆盖全部 7 个主题，
 * 不会出现「这次全是社交题」的偏科试卷。各主题配额之和必须等于 QUESTIONS_PER_TEST。
 *
 * 配额的分配不是按主题平均，而是按「各维度被题目触及的密度」反推：
 * 消费与社交在题库里最稀薄，所以给它们更高的配额；
 * 情绪题几乎都带情绪维度（75% 题目触及），配额可以低一些。
 * 结果是六个维度在单份试卷中的有效题数更均衡（权重/题数离散度 CV 从 14% 降到 7%）。
 */
export const TOPIC_QUOTAS: Record<Topic, number> = {
  注意力: 3,
  网络依赖: 2,
  情绪: 2,
  社交: 4,
  拖延: 2,
  执行力: 2,
  消费: 3,
};

export const TOPICS: Topic[] = Object.keys(TOPIC_QUOTAS) as Topic[];

/**
 * 题库。每次开始检测时由 lib/paper.ts 按 TOPIC_QUOTAS 随机抽题，
 * 并打乱题目顺序与每题选项顺序；同一份种子永远得到同一张试卷。
 */
export const QUESTION_POOL: Question[] = [
  /* ================= 网络依赖 ================= */
  {
    id: 'q01',
    topic: '网络依赖',
    text: '早上睁眼之后，你做的第一件事是？',
    hint: '不要美化自己，选最接近的。',
    options: [
      {
        id: 'q01a',
        label: '先摸手机，刷到不得不起床',
        note: '起床时间由内容长度决定',
        effects: { attention: -3, reality: -4, execution: -2 },
        tags: ['睁眼即联网', '闹钟形同虚设'],
      },
      {
        id: 'q01b',
        label: '盯着天花板缓五分钟',
        note: '人已上线，心还在地下室',
        effects: { attention: 3, emotion: 2, reality: 3 },
      },
      {
        id: 'q01c',
        label: '直接起床，手机留在床头',
        note: '已知的少数派',
        effects: { attention: 5, execution: 4, reality: 5 },
      },
      {
        id: 'q01d',
        label: '手机已经响了三轮，我还在睡',
        note: '睡眠债长期未还',
        effects: { emotion: -2, execution: -3 },
        tags: ['睡眠债主'],
      },
    ],
  },
  {
    id: 'q04',
    topic: '网络依赖',
    text: '手机电量掉到 15%，你的第一反应是？',
    options: [
      {
        id: 'q04a',
        label: '立刻找充电器或充电宝',
        note: '手机会死，我不能',
        effects: { reality: -2, emotion: -1 },
        tags: ['低电量焦虑'],
      },
      {
        id: 'q04b',
        label: '关掉所有后台，省电撑到回家',
        effects: { attention: 1, reality: -1 },
      },
      {
        id: 'q04c',
        label: '无所谓，反正还能再刷一小时',
        effects: { attention: -3, reality: -4 },
        tags: ['电量赌徒'],
      },
      {
        id: 'q04d',
        label: '我包里有三个充电宝',
        effects: { wallet: -2, reality: -3 },
        tags: ['充电宝囤积症'],
      },
    ],
  },
  {
    id: 'q17',
    topic: '网络依赖',
    text: '你的「放松方式」更接近哪一种？',
    options: [
      {
        id: 'q17a',
        label: '散步、运动，或者做点手工',
        effects: { attention: 4, emotion: 3, reality: 4 },
      },
      {
        id: 'q17b',
        label: '打游戏，而且和真人一起',
        effects: { social: 3, reality: -1 },
      },
      {
        id: 'q17c',
        label: '刷剧刷视频，弹幕比剧好看',
        effects: { attention: -3, reality: -3 },
        tags: ['电子榨菜'],
      },
      {
        id: 'q17d',
        label: '睡觉，但睡不着',
        effects: { emotion: -2, attention: -1 },
        tags: ['躺下就清醒'],
      },
    ],
  },
  {
    id: 'q18',
    topic: '网络依赖',
    text: '如果手机没网三十分钟，你会？',
    options: [
      {
        id: 'q18a',
        label: '挺好，正好清静',
        effects: { attention: 4, emotion: 3, reality: 5 },
      },
      {
        id: 'q18b',
        label: '反复下拉刷新，明知没网',
        effects: { attention: -3, reality: -4 },
        tags: ['下拉刷新成瘾'],
      },
      {
        id: 'q18c',
        label: '开始焦虑，怕错过什么',
        effects: { emotion: -4, reality: -3 },
        tags: ['信息错失恐惧'],
      },
      {
        id: 'q18d',
        label: '立刻找 Wi-Fi，找不到就回家',
        effects: { reality: -5, emotion: -2 },
        tags: ['WiFi 寻回犬'],
      },
    ],
  },
  {
    id: 'q23',
    topic: '网络依赖',
    text: '出去旅行的时候，你的网络状态是？',
    options: [
      {
        id: 'q23a',
        label: '基本不用手机，回来才发现有未读',
        effects: { reality: 5, attention: 3, social: -1 },
      },
      {
        id: 'q23b',
        label: '照常发朋友圈，一天三条',
        effects: { social: 2, reality: -1 },
        tags: ['旅行直播间'],
      },
      {
        id: 'q23c',
        label: '先确认酒店 Wi-Fi 快不快',
        effects: { reality: -4, attention: -2 },
        tags: ['WiFi 优先选房'],
      },
      {
        id: 'q23d',
        label: '换个地方继续刷，风景拍完就走',
        effects: { reality: -5, attention: -3 },
        tags: ['打卡即离开'],
      },
    ],
  },
  {
    id: 'q24',
    topic: '网络依赖',
    text: '睡前最后半小时，你通常在？',
    options: [
      {
        id: 'q24a',
        label: '看书/听点东西，然后把手机放远',
        effects: { attention: 3, emotion: 2, reality: 3 },
      },
      {
        id: 'q24b',
        label: '躺着刷，直到眼睛睁不开',
        effects: { attention: -4, emotion: -2, reality: -3 },
        tags: ['睡前刷到关机'],
      },
      {
        id: 'q24c',
        label: '一边刷一边跟自己说「再看一个」',
        effects: { attention: -3, emotion: -1 },
        tags: ['再看一个'],
      },
      {
        id: 'q24d',
        label: '回工作消息，把明天的事先想一遍',
        effects: { emotion: -3, execution: 2 },
        tags: ['床上办公'],
      },
    ],
  },

  /* ================= 注意力 ================= */
  {
    id: 'q03',
    topic: '注意力',
    text: '你的浏览器标签页，现在有多少个？',
    hint: '按最接近的数量选。',
    options: [
      { id: 'q03a', label: '3 个以内，用完就关', effects: { attention: 5, execution: 3 } },
      { id: 'q03b', label: '10 个左右，我觉得还好', effects: { attention: 0 } },
      { id: 'q03c', label: '30 个以上，我不敢数', effects: { attention: -5 }, tags: ['标签页坟场'] },
      { id: 'q03d', label: '我重开浏览器就当清理过了', effects: { attention: -2, execution: -2 }, tags: ['重启即整理'] },
    ],
  },
  {
    id: 'q15',
    topic: '注意力',
    text: '短视频弹出「再看一个」的时候，你？',
    options: [
      { id: 'q15a', label: '有明确的停止点，说停就停', effects: { attention: 5, execution: 2 } },
      { id: 'q15b', label: '设了闹钟，但每次都按掉', effects: { attention: -2, execution: -1 }, tags: ['闹钟按掉术'] },
      { id: 'q15c', label: '一抬头，两小时过去了', effects: { attention: -6, reality: -3 }, tags: ['时间黑洞'] },
      { id: 'q15d', label: '我卸载过七次', effects: { attention: -2, execution: -2 }, tags: ['卸载循环'] },
    ],
  },
  {
    id: 'q19',
    topic: '注意力',
    text: '工作或学习时，你多久会主动看一眼手机？',
    options: [
      {
        id: 'q19a',
        label: '专注一整段，中间完全不看',
        effects: { attention: 5, execution: 2 },
      },
      {
        id: 'q19b',
        label: '大概每半小时一次，算正常',
        effects: { attention: 1 },
      },
      {
        id: 'q19c',
        label: '每十分钟左右，不看会心里发痒',
        effects: { attention: -4 },
        tags: ['十分钟一摸'],
      },
      {
        id: 'q19d',
        label: '手机就在手上，我没有「看一眼」这个动作',
        effects: { attention: -5, execution: -3 },
        tags: ['手机长在手上'],
      },
    ],
  },
  {
    id: 'q20',
    topic: '注意力',
    text: '一篇 3000 字以上的长文，你通常？',
    options: [
      {
        id: 'q20a',
        label: '能读完，还会回头划重点',
        effects: { attention: 5, execution: 2 },
      },
      {
        id: 'q20b',
        label: '先看开头结尾，中间跳着看',
        effects: { attention: 1 },
      },
      {
        id: 'q20c',
        label: '扫两段就切走了，收藏了事',
        effects: { attention: -4, execution: -1 },
        tags: ['收藏即读完'],
      },
      {
        id: 'q20d',
        label: '我只看别人总结好的三句话',
        effects: { attention: -5 },
        tags: ['只看结论'],
      },
    ],
  },
  {
    id: 'q21',
    topic: '注意力',
    text: '被打断之后（比如接了个电话），你要多久能回到原来的事上？',
    options: [
      {
        id: 'q21a',
        label: '几秒钟，接着刚才那句继续',
        effects: { attention: 5, execution: 3 },
      },
      {
        id: 'q21b',
        label: '几分钟，重新看一眼就好',
        effects: { attention: 2 },
      },
      {
        id: 'q21c',
        label: '经常回不去，干脆做别的了',
        effects: { attention: -4, execution: -2 },
        tags: ['一断就散'],
      },
      {
        id: 'q21d',
        label: '我同时开着五件事，本来也没在原来的事上',
        effects: { attention: -5 },
        tags: ['五线并行'],
      },
    ],
  },
  {
    id: 'q22',
    topic: '注意力',
    text: '一集 40 分钟的剧，你通常怎么看？',
    options: [
      {
        id: 'q22a',
        label: '一集一集看，专心看完一季',
        effects: { attention: 4, reality: 1 },
      },
      {
        id: 'q22b',
        label: '开 1.5 倍速，还能跟上',
        effects: { attention: -1 },
      },
      {
        id: 'q22c',
        label: '一边看一边刷手机，剧情靠猜',
        effects: { attention: -5, reality: -2 },
        tags: ['双屏人生'],
      },
      {
        id: 'q22d',
        label: '我已经很久没有看完一整集了',
        effects: { attention: -4, emotion: -2 },
        tags: ['从未看完'],
      },
    ],
  },

  /* ================= 情绪 ================= */
  {
    id: 'q05',
    topic: '情绪',
    text: '深夜一点，你正在？',
    options: [
      { id: 'q05a', label: '已经睡了', effects: { emotion: 4, reality: 4, execution: 3 } },
      { id: 'q05b', label: '补白天没做完的事', effects: { execution: 2, emotion: -2 }, tags: ['夜间补作业'] },
      { id: 'q05c', label: '刷「明天一定早睡」的视频', effects: { attention: -4, emotion: -2 }, tags: ['熬夜研究生'] },
      { id: 'q05d', label: '在看购物车、看行情，或者跟人吵架', effects: { wallet: -4, emotion: -3 }, tags: ['午夜理性坍塌'] },
    ],
  },
  {
    id: 'q08',
    topic: '情绪',
    text: '工作日 22:00，老板在群里发了消息。',
    options: [
      { id: 'q08a', label: '立刻处理，怕耽误事', effects: { emotion: -3, execution: 2 }, tags: ['随叫随到'] },
      { id: 'q08b', label: '明早再说，直接静音', effects: { emotion: 4, execution: -1 } },
      { id: 'q08c', label: '看到就睡不着，在心里反复改措辞', effects: { emotion: -5, execution: -1 }, tags: ['已读睡不着'] },
      { id: 'q08d', label: '我根本不在那个群里', effects: { emotion: 3, social: -2 } },
    ],
  },
  {
    id: 'q11',
    topic: '情绪',
    text: '情绪要崩的时候，你会？',
    options: [
      { id: 'q11a', label: '找人聊，及时说出来', effects: { emotion: 3, social: 3 } },
      { id: 'q11b', label: '自己消化，睡一觉就好', effects: { emotion: 2, social: -2 } },
      { id: 'q11c', label: '打开购物软件或外卖软件', effects: { wallet: -4, emotion: -2 }, tags: ['情绪性消费'] },
      { id: 'q11d', label: '刷到凌晨，越刷越空', effects: { attention: -4, emotion: -3, reality: -3 }, tags: ['凌晨四点人类'] },
      { id: 'q11e', label: '我很少有情绪波动（真的）', effects: { emotion: 4, social: -1 }, tags: ['情绪静音模式'] },
    ],
  },
  {
    id: 'q13',
    topic: '情绪',
    text: '朋友发了旅行九宫格，你会？',
    options: [
      { id: 'q13a', label: '点个赞，真心替他开心', effects: { emotion: 3, social: 2 } },
      { id: 'q13b', label: '看完开始比较自己的人生', effects: { emotion: -4, social: -1 }, tags: ['比较型人格'] },
      { id: 'q13c', label: '直接划过，不想看', effects: { social: -2 } },
      { id: 'q13d', label: '我也想去，但一想到出门就算了', effects: { reality: -3, execution: -2 }, tags: ['意念旅行'] },
    ],
  },
  {
    id: 'q25',
    topic: '情绪',
    text: '收到一句不太好听的评价，你会记多久？',
    options: [
      {
        id: 'q25a',
        label: '当下有点不舒服，过十分钟就过去了',
        effects: { emotion: 4 },
      },
      {
        id: 'q25b',
        label: '当天会反复想，睡一觉就好了',
        effects: { emotion: 0 },
      },
      {
        id: 'q25c',
        label: '能记好几天，还会在心里演练怎么反驳',
        effects: { emotion: -4, attention: -2 },
        tags: ['心里预演'],
      },
      {
        id: 'q25d',
        label: '直接改变我对自己的整体判断',
        effects: { emotion: -5 },
        tags: ['一句定生死'],
      },
    ],
  },
  {
    id: 'q26',
    topic: '情绪',
    text: '约好的计划临时被取消，你的第一反应是？',
    options: [
      {
        id: 'q26a',
        label: '正好，省下时间做自己的事',
        effects: { emotion: 4, execution: 2 },
      },
      {
        id: 'q26b',
        label: '有点扫兴，但很快就算了',
        effects: { emotion: 1 },
      },
      {
        id: 'q26c',
        label: '会开始想是不是对方不想见我',
        effects: { emotion: -4, social: -2 },
        tags: ['过度归因'],
      },
      {
        id: 'q26d',
        label: '一整天的心情都跟着塌了',
        effects: { emotion: -5, reality: -2 },
        tags: ['计划依赖症'],
      },
    ],
  },

  /* ================= 社交 ================= */
  {
    id: 'q06',
    topic: '社交',
    text: '群里有人 @ 你，你一般？',
    options: [
      { id: 'q06a', label: '秒回，还顺手接了两句梗', effects: { social: 4, attention: -1 } },
      { id: 'q06b', label: '想好回复，两小时后才发出去', effects: { social: -1, emotion: -1 }, tags: ['延迟回复体'] },
      { id: 'q06c', label: '装作没看见，第二天再说', effects: { social: -3 }, tags: ['已读不回'] },
      { id: 'q06d', label: '我的群全是免打扰', effects: { social: -4, emotion: 2 }, tags: ['免打扰人生'] },
    ],
  },
  {
    id: 'q09',
    topic: '社交',
    text: '上一次和真人面对面吃饭，是？',
    options: [
      { id: 'q09a', label: '今天或昨天', effects: { social: 5, reality: 4 } },
      { id: 'q09b', label: '这周之内', effects: { social: 3, reality: 2 } },
      { id: 'q09c', label: '想不起来，大概一个月前了', effects: { social: -3, reality: -3 }, tags: ['社交内存不足'] },
      { id: 'q09d', label: '面对面吃饭时，我们各自刷手机', effects: { social: 1, reality: -3 }, tags: ['同桌异世界'] },
    ],
  },
  {
    id: 'q14',
    topic: '社交',
    text: '需要打电话预约一件事，你会？',
    options: [
      { id: 'q14a', label: '马上打，也就三十秒的事', effects: { social: 4, execution: 3 } },
      { id: 'q14b', label: '拖三天，最后在 App 里解决', effects: { social: -1, execution: -1 }, tags: ['电话恐惧'] },
      { id: 'q14c', label: '让家人或朋友帮我打', effects: { social: -3, execution: -2 } },
      { id: 'q14d', label: '干脆不办了', effects: { social: -2, execution: -3 }, tags: ['拖延到取消'] },
    ],
  },
  {
    id: 'q16',
    topic: '社交',
    text: '线上会议，突然被点名发言。',
    options: [
      { id: 'q16a', label: '从容开麦，讲得清楚', effects: { social: 4, emotion: 3, execution: 2 } },
      { id: 'q16b', label: '先「呃…」三秒，然后勉强说完', effects: { emotion: -2, social: -1 } },
      { id: 'q16c', label: '装作网络卡了', effects: { social: -3, emotion: -1 }, tags: ['网络卡顿演技派'] },
      { id: 'q16d', label: '摄像头永远关着，能不开麦就不开', effects: { social: -4 }, tags: ['隐身参会者'] },
    ],
  },
  {
    id: 'q27',
    topic: '社交',
    text: '认识了一个聊得来的人，你会主动要联系方式吗？',
    options: [
      {
        id: 'q27a',
        label: '会，直接问，没什么好犹豫的',
        effects: { social: 5 },
      },
      {
        id: 'q27b',
        label: '看气氛，有机会就加',
        effects: { social: 2 },
      },
      {
        id: 'q27c',
        label: '想加，但怕对方觉得我太主动',
        effects: { social: -2, emotion: -2 },
        tags: ['社交犹豫'],
      },
      {
        id: 'q27d',
        label: '算了，加了也不知道说什么',
        effects: { social: -4 },
        tags: ['加了好友也不聊'],
      },
    ],
  },
  {
    id: 'q28',
    topic: '社交',
    text: '朋友约你出门，但你今天只想躺着，你会？',
    options: [
      {
        id: 'q28a',
        label: '直说今天不想动，改天再约',
        effects: { social: 2, emotion: 3 },
      },
      {
        id: 'q28b',
        label: '还是去了，去了反而挺开心',
        effects: { social: 4, reality: 2 },
      },
      {
        id: 'q28c',
        label: '找个借口推掉，然后有点愧疚',
        effects: { social: -3, emotion: -2 },
        tags: ['借口生成器'],
      },
      {
        id: 'q28d',
        label: '答应了，然后在最后一刻说去不了',
        effects: { social: -4, emotion: -1 },
        tags: ['临阵脱逃'],
      },
    ],
  },

  /* ================= 拖延 ================= */
  {
    id: 'q02',
    topic: '拖延',
    text: '打开电脑，准备「开始干活」后的第一个小时，你通常？',
    options: [
      { id: 'q02a', label: '先整理一下环境，然后就中午了', effects: { execution: -4, attention: -2 }, tags: ['环境整理型拖延'] },
      { id: 'q02b', label: '开了三个文档，最后只回了一封邮件', effects: { attention: -3, execution: -1 } },
      { id: 'q02c', label: '直奔最难的那件事', note: '少数人类样本', effects: { execution: 5, attention: 4 } },
      { id: 'q02d', label: '先看行情/新闻/群消息，进入状态要一小时', effects: { attention: -2, reality: -3, execution: -2 } },
      { id: 'q02e', label: '我没有「第一小时」这个概念', note: '作息由心情决定', effects: { execution: -3, emotion: -1 }, tags: ['时区自由人'] },
    ],
  },
  {
    id: 'q29',
    topic: '拖延',
    text: '一件五分钟就能做完的小事（比如回一封邮件），你通常？',
    options: [
      {
        id: 'q29a',
        label: '马上做完，不用记',
        effects: { execution: 5, attention: 2 },
      },
      {
        id: 'q29b',
        label: '记进清单，晚点一起处理',
        effects: { execution: 1 },
      },
      {
        id: 'q29c',
        label: '在心里记着，然后一直记到过期',
        effects: { execution: -3, emotion: -2 },
        tags: ['心里挂账'],
      },
      {
        id: 'q29d',
        label: '拖到最后对方来催',
        effects: { execution: -4, social: -2 },
        tags: ['被催才动'],
      },
    ],
  },
  {
    id: 'q30',
    topic: '拖延',
    text: '「整点就开始」这句话，对你来说？',
    options: [
      {
        id: 'q30a',
        label: '我不用等整点，想做就开始',
        effects: { execution: 5, attention: 2 },
      },
      {
        id: 'q30b',
        label: '偶尔会用，确实有点仪式感',
        effects: { execution: 0 },
      },
      {
        id: 'q30c',
        label: '从 9:00 等到 10:00，再从 10:00 等到明天',
        effects: { execution: -5 },
        tags: ['整点仪式'],
      },
      {
        id: 'q30d',
        label: '我已经不谈什么时候开始了',
        effects: { execution: -4, emotion: -2 },
        tags: ['拒绝开始'],
      },
    ],
  },
  {
    id: 'q31',
    topic: '拖延',
    text: '要交的东西，你通常在什么时候做完？',
    options: [
      {
        id: 'q31a',
        label: '提前完成，然后还能检查一遍',
        effects: { execution: 5, emotion: 3 },
      },
      {
        id: 'q31b',
        label: '刚好卡在截止前，但心里有底',
        effects: { execution: 1 },
      },
      {
        id: 'q31c',
        label: '最后一晚通宵，交完手抖',
        effects: { execution: -3, emotion: -4 },
        tags: ['通宵交付'],
      },
      {
        id: 'q31d',
        label: '拖过了截止，然后去求延期',
        effects: { execution: -5, emotion: -3 },
        tags: ['延期申请专业户'],
      },
    ],
  },
  {
    id: 'q32',
    topic: '拖延',
    text: '洗澡这件事，你会？',
    options: [
      {
        id: 'q32a',
        label: '该洗就洗，不需要想',
        effects: { execution: 4, reality: 3 },
      },
      {
        id: 'q32b',
        label: '要拖半小时才起身，但会洗',
        effects: { execution: -2 },
      },
      {
        id: 'q32c',
        label: '拖到很晚，然后因为太晚更不想洗',
        effects: { execution: -4, reality: -2 },
        tags: ['洗澡拖延'],
      },
      {
        id: 'q32d',
        label: '我的洗不洗取决于今天出不出门',
        effects: { reality: -3, execution: -2 },
        tags: ['居家无视仪容'],
      },
    ],
  },

  /* ================= 执行力 ================= */
  {
    id: 'q07',
    topic: '执行力',
    text: '晚饭这件事，你通常怎么解决？',
    options: [
      { id: 'q07a', label: '自己做，洗碗也算放松', effects: { reality: 5, execution: 3, wallet: 3 } },
      { id: 'q07b', label: '点外卖，选店时间比吃饭时间长', effects: { reality: -3, wallet: -2, execution: -1 }, tags: ['外卖原住民'] },
      { id: 'q07c', label: '泡面/面包/冰箱里有什么吃什么', effects: { reality: -1, execution: -2, wallet: 2 } },
      { id: 'q07d', label: '经常忘了吃', effects: { emotion: -3, execution: -3 }, tags: ['忘记吃饭'] },
    ],
  },
  {
    id: 'q12',
    topic: '执行力',
    text: '你的待办清单，现在是什么状态？',
    options: [
      { id: 'q12a', label: '每天写，完成率挺高', effects: { execution: 5, attention: 2 } },
      { id: 'q12b', label: '写了，但永远完不成', effects: { execution: -2, emotion: -1 }, tags: ['清单收藏家'] },
      { id: 'q12c', label: '都在脑子里，从没写下来', effects: { execution: -2, attention: -1 } },
      { id: 'q12d', label: '我的待办就是别人的消息列表', effects: { execution: -1, social: -2 } },
    ],
  },
  {
    id: 'q33',
    topic: '执行力',
    text: '买了课程或者办了健身卡之后，你？',
    options: [
      {
        id: 'q33a',
        label: '按计划用，基本回本',
        effects: { execution: 5, wallet: 3 },
      },
      {
        id: 'q33b',
        label: '用了一阵，后来慢慢断了',
        effects: { execution: -1 },
      },
      {
        id: 'q33c',
        label: '只用了三次，剩下时间都在自责',
        effects: { execution: -3, wallet: -3, emotion: -2 },
        tags: ['沉没成本自责'],
      },
      {
        id: 'q33d',
        label: '买的那一刻就是全部动力',
        effects: { execution: -4, wallet: -4 },
        tags: ['付款即完成'],
      },
    ],
  },
  {
    id: 'q34',
    topic: '执行力',
    text: '房间乱到一定程度，你会？',
    options: [
      {
        id: 'q34a',
        label: '随手收，不会让它乱起来',
        effects: { execution: 4, reality: 3 },
      },
      {
        id: 'q34b',
        label: '攒到周末一次性大扫除',
        effects: { execution: 1 },
      },
      {
        id: 'q34c',
        label: '乱到自己都受不了，才开始动',
        effects: { execution: -3, reality: -1 },
        tags: ['忍耐阈值高'],
      },
      {
        id: 'q34d',
        label: '我已经习惯了，看得见但不动',
        effects: { execution: -4, reality: -3 },
        tags: ['视而不见'],
      },
    ],
  },
  {
    id: 'q35',
    topic: '执行力',
    text: '给自己定了个目标（比如早起、读书），一周之后？',
    options: [
      {
        id: 'q35a',
        label: '还在坚持，已经有点习惯了',
        effects: { execution: 5, emotion: 2 },
      },
      {
        id: 'q35b',
        label: '断了两天，但捡回来了',
        effects: { execution: 2 },
      },
      {
        id: 'q35c',
        label: '完全忘了这回事',
        effects: { execution: -4, attention: -2 },
        tags: ['目标失忆'],
      },
      {
        id: 'q35d',
        label: '我又定了三个新目标',
        effects: { execution: -3, attention: -1 },
        tags: ['目标收藏家'],
      },
    ],
  },

  /* ================= 消费 ================= */
  {
    id: 'q10',
    topic: '消费',
    text: '购物车里躺得最久的那件东西，是什么？',
    options: [
      { id: 'q10a', label: '我没有购物车，需要才买', effects: { wallet: 5, execution: 2 } },
      { id: 'q10b', label: '「等我瘦下来/等我有时间」才用的东西', effects: { wallet: -2, execution: -3 }, tags: ['购物车守墓人'] },
      { id: 'q10c', label: '收藏但不买，纯看看就很爽', effects: { wallet: 1, emotion: -1 }, tags: ['云购物'] },
      { id: 'q10d', label: '我基本是先买后想', effects: { wallet: -5, emotion: -1 }, tags: ['先买后想'] },
    ],
  },
  {
    id: 'q36',
    topic: '消费',
    text: '看到「限时 3 小时」的折扣，你会？',
    options: [
      {
        id: 'q36a',
        label: '先确认自己需不需要，不需要就关掉',
        effects: { wallet: 5, attention: 2 },
      },
      {
        id: 'q36b',
        label: '比一下价，合适就买',
        effects: { wallet: 2 },
      },
      {
        id: 'q36c',
        label: '倒计时一出现，手就快过脑子',
        effects: { wallet: -4, emotion: -1 },
        tags: ['倒计时上头'],
      },
      {
        id: 'q36d',
        label: '买完才发现根本用不上',
        effects: { wallet: -5 },
        tags: ['买完才想'],
      },
    ],
  },
  {
    id: 'q37',
    topic: '消费',
    text: '对虚拟物品（皮肤、会员、直播打赏），你？',
    options: [
      {
        id: 'q37a',
        label: '几乎不花，觉得没必要',
        effects: { wallet: 4, reality: 2 },
      },
      {
        id: 'q37b',
        label: '偶尔买，主要为了好用',
        effects: { wallet: 1 },
      },
      {
        id: 'q37c',
        label: '不知不觉开了七八个订阅',
        effects: { wallet: -4, attention: -1 },
        tags: ['订阅无底洞'],
      },
      {
        id: 'q37d',
        label: '打赏/抽卡的时候完全控制不住',
        effects: { wallet: -5, emotion: -2 },
        tags: ['抽卡手不听话'],
      },
    ],
  },
  {
    id: 'q38',
    topic: '消费',
    text: '外卖、咖啡这种小额支出，你？',
    options: [
      {
        id: 'q38a',
        label: '有预算，大概知道一个月花多少',
        effects: { wallet: 4, execution: 1 },
      },
      {
        id: 'q38b',
        label: '没算过，但应该是可控的',
        effects: { wallet: 0 },
      },
      {
        id: 'q38c',
        label: '「才三十块」一天三次',
        effects: { wallet: -3, reality: -1 },
        tags: ['三十块不心疼'],
      },
      {
        id: 'q38d',
        label: '月底账单出来才知道自己喝了一台显示器',
        effects: { wallet: -4, emotion: -2 },
        tags: ['账单惊悚片'],
      },
    ],
  },
  {
    id: 'q39',
    topic: '消费',
    text: '查信用卡/花呗账单的时候，你？',
    options: [
      {
        id: 'q39a',
        label: '每笔都认得出，心里有账',
        effects: { wallet: 5, emotion: 2 },
      },
      {
        id: 'q39b',
        label: '大概能对上，偶尔有点意外',
        effects: { wallet: 1 },
      },
      {
        id: 'q39c',
        label: '经常「这什么时候花的？」',
        effects: { wallet: -4, attention: -1 },
        tags: ['失忆消费'],
      },
      {
        id: 'q39d',
        label: '我基本不看，看了会心情不好',
        effects: { wallet: -5, emotion: -3 },
        tags: ['拒绝查账'],
      },
    ],
  },
  {
    id: 'q40',
    topic: '消费',
    text: '深夜刷手机，系统给你推了一件很想要的东西。',
    options: [
      {
        id: 'q40a',
        label: '划走，第二天也不太记得',
        effects: { wallet: 4, attention: 2 },
      },
      {
        id: 'q40b',
        label: '加进收藏，等冷静两天再决定',
        effects: { wallet: 2, execution: 1, emotion: 1 },
      },
      {
        id: 'q40c',
        label: '犹豫半小时，最后还是买了',
        effects: { wallet: -3, attention: -2, emotion: -1 },
        tags: ['犹豫后下单'],
      },
      {
        id: 'q40d',
        label: '立刻下单，反正「深夜更便宜」',
        effects: { wallet: -5, emotion: -2, reality: -1 },
        tags: ['深夜下单'],
      },
    ],
  },
  {
    id: 'q41',
    topic: '消费',
    text: '拆快递的那一刻，你通常？',
    options: [
      {
        id: 'q41a',
        label: '当场就用上了，挺满足',
        effects: { wallet: 1, emotion: 2, reality: 1 },
      },
      {
        id: 'q41b',
        label: '偶尔想不起来自己买了什么',
        effects: { wallet: -3, attention: -2 },
        tags: ['忘了买过'],
      },
      {
        id: 'q41c',
        label: '拆开发现和想象中不一样，有点空',
        effects: { wallet: -2, emotion: -2, reality: -1 },
      },
      {
        id: 'q41d',
        label: '角落堆着几件还没拆的',
        effects: { wallet: -4, execution: -2, reality: -2 },
        tags: ['快递堆积'],
      },
    ],
  },
  {
    id: 'q42',
    topic: '消费',
    text: '朋友甩来一个拼单 / 团购链接。',
    options: [
      {
        id: 'q42a',
        label: '需要就拼，不需要就说不用，不尴尬',
        effects: { wallet: 4, social: 3, emotion: 1 },
      },
      {
        id: 'q42b',
        label: '想一下，多半还是跟着买了',
        effects: { wallet: -2, social: 2 },
      },
      {
        id: 'q42c',
        label: '不好意思拒绝，直接转钱过去',
        effects: { wallet: -3, social: 1, emotion: -2 },
        tags: ['不好意思拒绝'],
      },
      {
        id: 'q42d',
        label: '我从不点开任何人发的链接',
        effects: { social: -3, wallet: 2 },
      },
    ],
  },
  {
    id: 'q43',
    topic: '消费',
    text: '买一件有点贵的东西之前，你会？',
    options: [
      {
        id: 'q43a',
        label: '比价、看评测、想清楚了才买',
        effects: { wallet: 4, attention: 3, execution: 2 },
      },
      {
        id: 'q43b',
        label: '看两三家，差不多就下单',
        effects: { wallet: 1, attention: 1 },
      },
      {
        id: 'q43c',
        label: '只看主图和标题就买了',
        effects: { wallet: -3, attention: -3 },
        tags: ['看图下单'],
      },
      {
        id: 'q43d',
        label: '越研究越上头，最后买的比原来贵',
        effects: { wallet: -4, attention: -1, emotion: -1 },
        tags: ['越看越贵'],
      },
    ],
  },
  {
    id: 'q44',
    topic: '消费',
    text: '订阅制服务（会员、云盘、各种 App），你？',
    options: [
      {
        id: 'q44a',
        label: '列过清单，不用的都退掉了',
        effects: { wallet: 5, execution: 3 },
      },
      {
        id: 'q44b',
        label: '知道有几个，但懒得管',
        effects: { wallet: -2, execution: -1 },
      },
      {
        id: 'q44c',
        label: '每个月自动扣，我说不清有几个',
        effects: { wallet: -4, attention: -2 },
        tags: ['订阅失控'],
      },
      {
        id: 'q44d',
        label: '为了一个功能，直接开了一整年',
        effects: { wallet: -3, execution: -1, emotion: -1 },
      },
    ],
  },
  {
    id: 'q45',
    topic: '消费',
    text: '遇到「买二送一」「囤一年份」这种事。',
    options: [
      {
        id: 'q45a',
        label: '只买用得完的量',
        effects: { wallet: 4, reality: 2 },
      },
      {
        id: 'q45b',
        label: '会多买一点，但基本能用掉',
        effects: { wallet: 1, reality: 1 },
      },
      {
        id: 'q45c',
        label: '囤了一柜子，过期了才想起来',
        effects: { wallet: -4, reality: -2, execution: -1 },
        tags: ['过期才发现'],
      },
      {
        id: 'q45d',
        label: '「便宜就是赚」，家里已经放不下',
        effects: { wallet: -5, reality: -2, attention: -1 },
        tags: ['囤货成瘾'],
      },
    ],
  },

  /* ================= 社交（补充） ================= */
  {
    id: 'q46',
    topic: '社交',
    text: '在餐厅需要叫服务员，你会？',
    options: [
      {
        id: 'q46a',
        label: '直接招手，这很正常',
        effects: { social: 4, emotion: 2 },
      },
      {
        id: 'q46b',
        label: '等对方路过再说',
        effects: { social: 1 },
      },
      {
        id: 'q46c',
        label: '犹豫很久，最后让同行的人叫',
        effects: { social: -3, emotion: -2 },
        tags: ['不敢叫人'],
      },
      {
        id: 'q46d',
        label: '干脆不叫，凑合吃完',
        effects: { social: -2, emotion: -1, wallet: 1 },
      },
    ],
  },
  {
    id: 'q47',
    topic: '社交',
    text: '收到一条 60 秒的语音消息。',
    options: [
      {
        id: 'q47a',
        label: '直接听，听完就回',
        effects: { social: 4, attention: 2, emotion: 1 },
      },
      {
        id: 'q47b',
        label: '转成文字看，再回',
        effects: { social: 2, attention: 1 },
      },
      {
        id: 'q47c',
        label: '先放着，等有精神了再听',
        effects: { social: -2, attention: -1, execution: -1 },
        tags: ['语音未听'],
      },
      {
        id: 'q47d',
        label: '一直没听，对方也没再问',
        effects: { social: -4, emotion: -1 },
        tags: ['语音永久未读'],
      },
    ],
  },
  {
    id: 'q48',
    topic: '社交',
    text: '饭局上突然被要求自我介绍。',
    options: [
      {
        id: 'q48a',
        label: '说两句就过去了，不觉得紧张',
        effects: { social: 4, emotion: 3 },
      },
      {
        id: 'q48b',
        label: '会紧张，但能说完',
        effects: { social: 1, emotion: -1 },
      },
      {
        id: 'q48c',
        label: '脑子空白，说得乱七八糟',
        effects: { social: -2, emotion: -3 },
        tags: ['自我介绍恐惧'],
      },
      {
        id: 'q48d',
        label: '尽量避开需要自我介绍的场合',
        effects: { social: -4, emotion: -1, reality: -1 },
        tags: ['避开饭局'],
      },
    ],
  },
  {
    id: 'q49',
    topic: '社交',
    text: '有人找你借一小笔钱。',
    options: [
      {
        id: 'q49a',
        label: '能借就借，说清楚什么时候还',
        effects: { social: 4, wallet: 1, emotion: 2 },
      },
      {
        id: 'q49b',
        label: '借了，但心里有点别扭',
        effects: { social: 1, emotion: -1, wallet: -1 },
      },
      {
        id: 'q49c',
        label: '不想借，但硬着头皮借了',
        effects: { social: 0, wallet: -2, emotion: -3 },
        tags: ['硬着头皮答应'],
      },
      {
        id: 'q49d',
        label: '直接拒绝，不管对方怎么想',
        effects: { social: -3, wallet: 3 },
      },
    ],
  },
  {
    id: 'q50',
    topic: '社交',
    text: '认识的人发了条朋友圈，你？',
    options: [
      {
        id: 'q50a',
        label: '觉得有意思就评论一句',
        effects: { social: 3, emotion: 1 },
      },
      {
        id: 'q50b',
        label: '点个赞就过去了',
        effects: { social: 1 },
      },
      {
        id: 'q50c',
        label: '看完就算了，从不互动',
        effects: { social: -2, attention: 1 },
      },
      {
        id: 'q50d',
        label: '我基本不刷朋友圈',
        effects: { social: -3, attention: 3, reality: 2 },
        tags: ['不看朋友圈'],
      },
    ],
  },

  /* ================= 拖延（补充） ================= */
  {
    id: 'q51',
    topic: '拖延',
    text: '一封需要认真回的邮件 / 消息。',
    options: [
      {
        id: 'q51a',
        label: '当天回，写完就发',
        effects: { execution: 4, social: 2, attention: 1 },
      },
      {
        id: 'q51b',
        label: '先放一放，想好再回，两天内发出去',
        effects: { execution: 0, social: 0 },
      },
      {
        id: 'q51c',
        label: '拖到对方来催',
        effects: { execution: -4, social: -2 },
        tags: ['被催才回'],
      },
      {
        id: 'q51d',
        label: '一直没回，后来假装没看见',
        effects: { execution: -3, social: -4, emotion: -2 },
        tags: ['假装没看见'],
      },
    ],
  },
  {
    id: 'q52',
    topic: '拖延',
    text: '办证、打客服电话这类麻烦事。',
    options: [
      {
        id: 'q52a',
        label: '一次办完，不拖',
        effects: { execution: 4, emotion: 2 },
      },
      {
        id: 'q52b',
        label: '拖几天，但总会办',
        effects: { execution: 0 },
      },
      {
        id: 'q52c',
        label: '拖到自己都焦虑，还是没办',
        effects: { execution: -4, emotion: -3 },
        tags: ['焦虑但不动'],
      },
      {
        id: 'q52d',
        label: '能花钱代办就花钱代办',
        effects: { execution: 1, wallet: -3, social: 1 },
        tags: ['花钱买省事'],
      },
    ],
  },
  {
    id: 'q53',
    topic: '拖延',
    text: '身体有点小毛病（牙疼、该体检了）。',
    options: [
      {
        id: 'q53a',
        label: '该看就看，不拖',
        effects: { execution: 4, reality: 3, emotion: 1 },
      },
      {
        id: 'q53b',
        label: '观察几天，不好再去',
        effects: { execution: 1, reality: 1 },
      },
      {
        id: 'q53c',
        label: '一直拖，拖到不得不去',
        effects: { execution: -3, reality: -2, emotion: -2 },
        tags: ['拖到必须去'],
      },
      {
        id: 'q53d',
        label: '上网搜一搜，自己给自己诊断',
        effects: { reality: -2, attention: -1, emotion: -2 },
        tags: ['网络自查病'],
      },
    ],
  },

  /* ================= 执行力（补充） ================= */
  {
    id: 'q54',
    topic: '执行力',
    text: '早上闹钟第一次响。',
    options: [
      {
        id: 'q54a',
        label: '立刻起来，不用第二次',
        effects: { execution: 5, reality: 3, attention: 2 },
      },
      {
        id: 'q54b',
        label: '按掉再躺十分钟，然后起',
        effects: { execution: 1 },
      },
      {
        id: 'q54c',
        label: '按掉七八次，最后冲刺出门',
        effects: { execution: -3, attention: -2, emotion: -2 },
        tags: ['按掉七次'],
      },
      {
        id: 'q54d',
        label: '我设了五个闹钟，还是会迟到',
        effects: { execution: -4, reality: -2, emotion: -1 },
        tags: ['五闹钟仍迟到'],
      },
    ],
  },
  {
    id: 'q55',
    topic: '执行力',
    text: '计划今天要运动。',
    options: [
      {
        id: 'q55a',
        label: '到点就动，不跟自己谈判',
        effects: { execution: 5, reality: 3, emotion: 1 },
      },
      {
        id: 'q55b',
        label: '去了，但强度打了折',
        effects: { execution: 2, reality: 1 },
      },
      {
        id: 'q55c',
        label: '换上衣服，然后坐下了',
        effects: { execution: -3, emotion: -2, reality: -1 },
        tags: ['换完衣服就坐下'],
      },
      {
        id: 'q55d',
        label: '想想就算了，明天再开始',
        effects: { execution: -4, reality: -2 },
        tags: ['明天再开始'],
      },
    ],
  },
  {
    id: 'q56',
    topic: '执行力',
    text: '该整理的文件 / 桌面 / 相册。',
    options: [
      {
        id: 'q56a',
        label: '定期整理，找东西很快',
        effects: { execution: 3, attention: 3 },
      },
      {
        id: 'q56b',
        label: '偶尔整理一次',
        effects: { execution: 1 },
      },
      {
        id: 'q56c',
        label: '全塞进一个文件夹，眼不见为净',
        effects: { execution: -2, attention: -2 },
        tags: ['一股脑塞进去'],
      },
      {
        id: 'q56d',
        label: '桌面已经满了，找文件全靠搜索',
        effects: { execution: -3, attention: -3 },
        tags: ['桌面即缓冲池'],
      },
    ],
  },

  /* ================= 注意力（补充） ================= */
  {
    id: 'q57',
    topic: '注意力',
    text: '开会 / 上课时，你的状态更接近？',
    options: [
      {
        id: 'q57a',
        label: '全程跟得上，还会记要点',
        effects: { attention: 5, social: 2, execution: 1 },
      },
      {
        id: 'q57b',
        label: '偶尔走神，能自己拉回来',
        effects: { attention: 2 },
      },
      {
        id: 'q57c',
        label: '走神二十分钟，回来已经听不懂了',
        effects: { attention: -4, execution: -1 },
        tags: ['回来已听不懂'],
      },
      {
        id: 'q57d',
        label: '我在做别的事，反正也没人发现',
        effects: { attention: -4, social: -3, reality: -1 },
        tags: ['会上干别的'],
      },
    ],
  },
  {
    id: 'q58',
    topic: '注意力',
    text: '你同时开着几个窗口 / 几块屏？',
    options: [
      {
        id: 'q58a',
        label: '一次只做一件，窗口不超过三个',
        effects: { attention: 4, execution: 3 },
      },
      {
        id: 'q58b',
        label: '开一堆，但我知道自己在干什么',
        effects: { attention: 1, execution: 1 },
      },
      {
        id: 'q58c',
        label: '同时推进五件事，每件都没做完',
        effects: { attention: -4, execution: -3 },
        tags: ['五线并行'],
      },
      {
        id: 'q58d',
        label: '边开会边刷手机边回消息，最后全忘了',
        effects: { attention: -5, reality: -2, execution: -1 },
        tags: ['三线全忘'],
      },
    ],
  },
  {
    id: 'q59',
    topic: '注意力',
    text: '收到一条很长的消息（工作或朋友的）。',
    options: [
      {
        id: 'q59a',
        label: '仔细读完再回',
        effects: { attention: 4, social: 3 },
      },
      {
        id: 'q59b',
        label: '扫一遍，抓重点',
        effects: { attention: 1, social: 1 },
      },
      {
        id: 'q59c',
        label: '只看最后一句就回了',
        effects: { attention: -3, social: -2 },
        tags: ['只读末句'],
      },
      {
        id: 'q59d',
        label: '太长了，晚点再看（然后忘了）',
        effects: { attention: -4, social: -3, execution: -1 },
        tags: ['晚点再看然后忘'],
      },
    ],
  },

  /* ================= 网络依赖（补充） ================= */
  {
    id: 'q60',
    topic: '网络依赖',
    text: '把手机放到另一个房间，你会？',
    options: [
      {
        id: 'q60a',
        label: '完全没感觉，该干什么干什么',
        effects: { reality: 4, attention: 4, emotion: 2 },
      },
      {
        id: 'q60b',
        label: '会想一下，但能忍住',
        effects: { reality: 1, attention: 1 },
      },
      {
        id: 'q60c',
        label: '过十分钟就去拿回来了',
        effects: { reality: -3, attention: -3 },
        tags: ['十分钟就取回'],
      },
      {
        id: 'q60d',
        label: '我从来不会把手机放出视野',
        effects: { reality: -5, attention: -3, emotion: -1 },
        tags: ['手机不出视野'],
      },
    ],
  },
  {
    id: 'q61',
    topic: '网络依赖',
    text: '打开手机想查个东西，然后？',
    options: [
      {
        id: 'q61a',
        label: '查完就放下，目的很明确',
        effects: { attention: 4, reality: 2 },
      },
      {
        id: 'q61b',
        label: '查到了，顺手又看了两条别的',
        effects: { attention: 0 },
      },
      {
        id: 'q61c',
        label: '十分钟后才想起来，忘了要查什么',
        effects: { attention: -4, reality: -2 },
        tags: ['忘记要查什么'],
      },
      {
        id: 'q61d',
        label: '完全不记得当初为什么拿起手机',
        effects: { attention: -5, reality: -3 },
        tags: ['拿起手机的原因不明'],
      },
    ],
  },
  {
    id: 'q62',
    topic: '网络依赖',
    text: '社交平台的「在线 / 活跃状态」，你？',
    options: [
      {
        id: 'q62a',
        label: '关掉了，不想被人知道我在线',
        effects: { attention: 3, emotion: 2, social: -1 },
      },
      {
        id: 'q62b',
        label: '开着，但我也不太看别人的',
        effects: { social: 2, emotion: 1 },
      },
      {
        id: 'q62c',
        label: '会看谁在线，也在意别人看不看我',
        effects: { social: 1, emotion: -2, attention: -2 },
        tags: ['在线状态焦虑'],
      },
      {
        id: 'q62d',
        label: '谁几点上线、看过我的主页，我都记得',
        effects: { social: 1, emotion: -3, attention: -3 },
        tags: ['访问记录研究员'],
      },
    ],
  },

  /* ================= 情绪（补充） ================= */
  {
    id: 'q63',
    topic: '情绪',
    text: '出门遇到堵车，计划全被打乱了。',
    options: [
      {
        id: 'q63a',
        label: '换条路，情绪基本不受影响',
        effects: { emotion: 4, execution: 3 },
      },
      {
        id: 'q63b',
        label: '有点烦，但很快接受',
        effects: { emotion: 1 },
      },
      {
        id: 'q63c',
        label: '一路烦躁，到地方还在生气',
        effects: { emotion: -3, attention: -2 },
        tags: ['一路烦躁'],
      },
      {
        id: 'q63d',
        label: '直接取消，今天不想去了',
        effects: { emotion: -3, social: -3, execution: -2 },
        tags: ['一生气就取消'],
      },
    ],
  },
  {
    id: 'q64',
    topic: '情绪',
    text: '深夜突然想起白天说错的一句话。',
    options: [
      {
        id: 'q64a',
        label: '想一下就过去了',
        effects: { emotion: 4, attention: 1 },
      },
      {
        id: 'q64b',
        label: '会想一会儿，然后睡着',
        effects: { emotion: 1 },
      },
      {
        id: 'q64c',
        label: '反复回想，越想越清醒',
        effects: { emotion: -4, attention: -3 },
        tags: ['越想越清醒'],
      },
      {
        id: 'q64d',
        label: '会把它写下来，或者找人说说',
        effects: { emotion: 2, social: 2, attention: 1 },
      },
    ],
  },
];

export const QUESTION_MAP: Record<string, Question> = QUESTION_POOL.reduce(
  (acc, q) => {
    acc[q.id] = q;
    return acc;
  },
  {} as Record<string, Question>,
);

export const OPTION_MAP: Record<string, { question: Question; option: QuestionOption }> =
  QUESTION_POOL.reduce(
    (acc, q) => {
      for (const o of q.options) acc[o.id] = { question: q, option: o };
      return acc;
    },
    {} as Record<string, { question: Question; option: QuestionOption }>,
  );

/** 每个主题在题库中的题量，供抽题与自检使用 */
export const TOPIC_POOL_SIZES: Record<string, number> = TOPIC_QUOTAS
  ? QUESTION_POOL.reduce(
      (acc, q) => {
        acc[q.topic] = (acc[q.topic] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    )
  : {};
