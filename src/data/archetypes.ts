import type { DimensionKey } from './dimensions';

/** 结果类型匹配条件，由 scoring.ts 解释执行 */
export type ScoreField = DimensionKey | 'purity';

export interface MatchCondition {
  field: ScoreField;
  op: '>=' | '>' | '<=' | '<';
  value: number;
}

export interface Archetype {
  id: string;
  /** 鉴定名称 */
  name: string;
  /** 英文代号，终端风格展示 */
  code: string;
  /** 一句话副标题 */
  subtitle: string;
  /** 报告正文 */
  description: string;
  strengths: string[];
  weaknesses: string[];
  /** 经典语录 */
  quote: string;
  /** 行动建议 */
  advice: string[];
  /** 趣味标签 */
  tags: string[];
  /** 稀有度提示（纯娱乐） */
  rarity: string;
  /** 匹配条件，全部满足才命中；按数组顺序优先匹配 */
  match: MatchCondition[];
}

/**
 * 结果类型库。
 * 顺序即优先级：越特殊的类型放在越前面，最后一个是不设条件的兜底类型。
 * 新增类型只需往这里加对象，无需改评分引擎。
 */
export const ARCHETYPES: Archetype[] = [
  {
    id: 'industrial-human',
    name: '工业级人类',
    code: 'INDUSTRIAL-HUMAN',
    subtitle: '稳定、清醒、按时交付',
    description:
      '检测仪在你身上出现了罕见的平滑读数：注意力没有漏电，执行力没有掉线，作息大体上还服从太阳。你不是没有欲望，只是能把它推迟到该兑现的时候。在一个所有人都在被推送打断的年代，你像一台被认真保养过的机器。',
    strengths: ['专注力可以连续输出', '说做就做，不依赖情绪启动', '生活节律基本在线'],
    weaknesses: ['对混乱环境的容忍度偏低', '容易被当成「那个靠谱的人」，然后被塞满活'],
    quote: '「先把难的做完，剩下的时间才属于我。」',
    advice: [
      '保留你现在的开工仪式，别为了效率把它优化掉。',
      '给自己排一段空白时间，防止被「靠谱」这两个字吃掉。',
      '偶尔允许一次没有产出的下午。',
    ],
    tags: ['稀缺样本', '低漏电体质', '按时交付'],
    rarity: '检测样本中约 4%',
    match: [
      { field: 'purity', op: '>=', value: 66 },
      { field: 'attention', op: '>=', value: 62 },
      { field: 'execution', op: '>=', value: 64 },
    ],
  },
  {
    id: 'deadline-golem',
    name: '截止日期魔像',
    code: 'DEADLINE-GOLEM',
    subtitle: '平时是石头，DDL 前是神',
    description:
      '你在漫长的平静期里几乎不具备行动能力，但只要截止日期进入视野，身体里就会启动一套代偿系统：通宵、暴走、突然高效。你不是懒，你是靠压力发电的机型。问题是这套系统的燃料，是你的睡眠和内脏。',
    strengths: ['高压下的爆发力惊人', '临场判断准，敢下决定', '对「真正的重点」有野兽般的直觉'],
    weaknesses: ['没有 DDL 就没有行动', '长期透支，恢复速度在变慢'],
    quote: '「不是我做不完，是我还没开始。」',
    advice: [
      '把大 DDL 拆成几个人为的小 DDL，喂给你的压力系统。',
      '给爆发后的那一天留出恢复位，别无缝衔接下一个任务。',
      '记录一次「提前两天完成」的感受，让大脑知道那种状态存在。',
    ],
    tags: ['压力驱动', '通宵体质', '临场觉醒'],
    rarity: '检测样本中约 9%',
    match: [
      { field: 'execution', op: '>=', value: 68 },
      { field: 'attention', op: '<=', value: 62 },
    ],
  },
  {
    id: 'perfectionist-snail',
    name: '完美主义蜗牛',
    code: 'PERFECTIONIST-SNAIL',
    subtitle: '想得很清楚，就是还没开始',
    description:
      '你的注意力其实不差，甚至相当充沛——只是它被用来反复推演「怎么做才对」。方案在脑内已经改到第七版，第一版还没落地。你输的不是能力，是启动那一下的摩擦系数。',
    strengths: ['审美和标准高，做出来不会差', '能在开始前就发现大部分坑'],
    weaknesses: ['过度准备，迟迟不启动', '完成度焦虑导致反复返工'],
    quote: '「再想一下就动手，真的，就一下。」',
    advice: [
      '用「十分钟丑版本」当启动器，先允许自己做得很烂。',
      '把标准拆成两档：交付底线和理想版本，先满足底线。',
      '给自己设一个「不许修改」的截止时间。',
    ],
    tags: ['过度准备', '改到第七版', '启动摩擦大'],
    rarity: '检测样本中约 8%',
    match: [
      { field: 'execution', op: '<=', value: 40 },
      { field: 'attention', op: '>=', value: 52 },
    ],
  },
  {
    id: 'attention-bankrupt',
    name: '注意力破产者',
    code: 'ATTENTION-BANKRUPT',
    subtitle: '余额不足，且已透支',
    description:
      '你的注意力账户长期处于负数状态。每一次「就看一眼」都是一笔小额取现，取到最后，你已经无法读完一段超过三行的文字。这不是意志力问题，是你的注意力被设计好的产品反复收割过。好消息是：账户可以重建，只是需要断掉几个自动扣款。',
    strengths: ['信息扫描速度极快', '对新鲜刺激的敏感度高'],
    weaknesses: ['长内容读不完', '任务切换后很难回到原处'],
    quote: '「等一下，我刚才要干什么来着？」',
    advice: [
      '每天留一段 25 分钟的无输入时间，先不追求效率，只求读完一件事。',
      '关掉所有非人类发来的通知，只保留能被真人 @ 的通道。',
      '把手机放在够不到的地方，物理距离比自律可靠。',
    ],
    tags: ['余额负数', '标签页坟场', '时间黑洞'],
    rarity: '检测样本中约 12%',
    match: [
      { field: 'attention', op: '<=', value: 24 },
    ],
  },
  {
    id: 'reality-tourist',
    name: '互联网原住民，现实世界游客',
    code: 'REALITY-TOURIST',
    subtitle: '在线时长满级，线下偶尔签到',
    description:
      '你的生活主体运行在屏幕上，现实世界对你来说更像一个需要办签证的周边国家。你能在群里同时接住五个话题，却想不起上次和朋友面对面坐着是什么时候。你没有跟世界断联，你只是换了一个更省力的接口。',
    strengths: ['线上社交与信息处理能力极强', '对远程协作、异步沟通天然适应'],
    weaknesses: ['线下关系开始变得「需要安排」', '身体长期处于缺乏日照的状态'],
    quote: '「见面可以，但要先约，最好下下周。」',
    advice: [
      '每周安排一次没有屏幕的线下活动，哪怕是去便利店。',
      '把「出门」的门槛降到 10 分钟以内，别让它变成项目。',
      '给真实的朋友发一条不带目的的消息。',
    ],
    tags: ['在线满级', '线下游客', '意念社交'],
    rarity: '检测样本中约 11%',
    match: [
      { field: 'reality', op: '<=', value: 32 },
      { field: 'social', op: '>=', value: 38 },
    ],
  },
  {
    id: 'offline-hermit',
    name: '半离线隐士',
    code: 'OFFLINE-HERMIT',
    subtitle: '世界很吵，我这边信号不好',
    description:
      '你同时关掉了两个接口：既不太回到现实，也不太参与线上。你不是讨厌人，你只是发现不连接的状态更省电。这套策略确实保护了你，但也让很多本可以发生的事，停在了「算了」那一步。',
    strengths: ['自给自足，不依赖外部反馈', '情绪不易被群体带跑'],
    weaknesses: ['需要帮助时开不了口', '长期低刺激，会让动力系统变钝'],
    quote: '「不用管我，我自己待着挺好的。」',
    advice: [
      '把社交降到「低成本可持续」的频率：一条消息也算。',
      '找一个低门槛的线下场景（书店、球场、兴趣小组）。',
      '记录一周里让你感觉「还不错」的瞬间，看看它们来自哪里。',
    ],
    tags: ['低功耗模式', '免打扰人生', '自给自足'],
    rarity: '检测样本中约 7%',
    match: [
      { field: 'reality', op: '<=', value: 32 },
      { field: 'social', op: '<', value: 38 },
    ],
  },
  {
    id: 'social-timeout',
    name: '社交连接超时',
    code: 'SOCIAL-TIMEOUT',
    subtitle: '请求已发出，未收到响应',
    description:
      '你的社交模块没有损坏，只是握手协议特别长。想回复一条消息，你会在脑内预演三种语气；想打一个电话，你能拖三天。你在乎别人的感受，所以在开口前就把所有可能的尴尬推演了一遍——代价是，对方只看到沉默。',
    strengths: ['共情能力强，不会说伤人的话', '观察细致，能接住别人的情绪'],
    weaknesses: ['把小事拖成不敢做的事', '容易被误解为冷淡'],
    quote: '「我早就想回了，一直在想怎么回。」',
    advice: [
      '允许自己回一句很敷衍但真实的话，比完美回复更重要。',
      '给电话恐惧设一个 30 秒规则：拨号后不管多尴尬都先说第一句。',
      '告诉身边的人你在慢热，别让他们自己猜。',
    ],
    tags: ['延迟回复体', '电话恐惧', '内心戏满分'],
    rarity: '检测样本中约 10%',
    match: [
      { field: 'social', op: '<=', value: 30 },
    ],
  },
  {
    id: 'emo-rollercoaster',
    name: '情绪过山车驾驶员',
    code: 'EMO-ROLLERCOASTER',
    subtitle: '一天之内可以经历三次人生转折',
    description:
      '你的情绪不设缓冲区：一条消息、一个眼神、一段对比，都能让整天的基调重写。这让你对世界的感受比大多数人更细腻，也让你更容易累。你不是不稳定，你只是分辨率太高，又缺少降噪。',
    strengths: ['感受力强，容易被美和真诚打动', '在创作和共情上具备天然优势'],
    weaknesses: ['状态随外部输入剧烈波动', '情绪低谷时会做出后悔的决定'],
    quote: '「我没事，我只是今天换了三次人格。」',
    advice: [
      '在情绪高峰期不做消费和关系方面的决定，先睡一觉。',
      '把「今天情绪不好」和「我的人生有问题」分开记账。',
      '建立一份三分钟的稳定动作清单：走路、洗脸、喝水、呼吸。',
    ],
    tags: ['分辨率过高', '午夜理性坍塌', '情绪潮汐'],
    rarity: '检测样本中约 9%',
    match: [
      { field: 'emotion', op: '<=', value: 32 },
    ],
  },
  {
    id: 'wallet-blackhole',
    name: '钱包黑洞',
    code: 'WALLET-BLACKHOLE',
    subtitle: '钱没有消失，只是转移到了别的地方',
    description:
      '你的消费系统没有中间层：看到、心动、下单，三步之间几乎没有缓冲。深夜和情绪波动是你最大的两个漏洞。你不是不知道自己在花钱，你只是在下单那一刻，真心觉得自己需要它。',
    strengths: ['对喜欢的东西投入毫不吝啬', '愿意为体验和审美付钱'],
    weaknesses: ['情绪一波动就想买东西', '对订阅和自动续费缺乏感知'],
    quote: '「这个月的钱怎么又没了？」',
    advice: [
      '把购物车设成「48 小时后结算」，让冲动有时间过期。',
      '清理一遍自动续费，取消三个月没用过的服务。',
      '给情绪性消费设一个固定额度，花完不补。',
    ],
    tags: ['先买后想', '午夜下单', '订阅失控'],
    rarity: '检测样本中约 8%',
    match: [
      { field: 'wallet', op: '<=', value: 26 },
    ],
  },
  {
    id: 'market-attachment',
    name: '行情依附体',
    code: 'MARKET-ATTACHMENT',
    subtitle: '情绪稳定性：取决于行情',
    description:
      '你的心理状态挂在一个外部指数上：涨了觉得自己是天才，跌了开始怀疑人生。你对不确定性的耐受度正在被反复训练，但训练方式不太健康——因为你把自我价值也一起押了上去。',
    strengths: ['对数字和趋势敏感', '愿意承担不确定性'],
    weaknesses: ['外部指标决定内在状态', '很难真正休息，总觉得要看一眼'],
    quote: '「今天不是我的问题，是大盘的问题。」',
    advice: [
      '给「查看」设置固定时段，其余时间不打开。',
      '把自我评价和某个外部数字解绑，写下来你除了它还有什么。',
      '建立与行情无关的日常：散步、运动、和真人说话。',
    ],
    tags: ['行情驱动', '外部挂载', '一眼难停'],
    rarity: '检测样本中约 7%',
    match: [
      { field: 'emotion', op: '<=', value: 45 },
      { field: 'wallet', op: '<=', value: 52 },
      { field: 'attention', op: '<=', value: 55 },
    ],
  },
  {
    id: 'meme-engine',
    name: '互联网话事人',
    code: 'MEME-ENGINE',
    subtitle: '群里的气氛由你供电',
    description:
      '你是那种在群里永远有回应的人：接梗快、情绪稳、从不让人尴尬。你的社交带宽被充分使用，代价是后台常驻的注意力开销——你很难真正下线，因为总有人在等你回一句。',
    strengths: ['天然的连接者，能把人聚在一起', '表达能力强，情绪价值高'],
    weaknesses: ['注意力被社交持续占用', '很难拒绝，容易被消耗'],
    quote: '「我先回个消息，马上就好。」',
    advice: [
      '设定「不接梗时段」，让你的注意力回到自己身上。',
      '练习一次延迟回复，看看世界并不会塌。',
      '把最好的表达欲，分一点给不在屏幕上的人。',
    ],
    tags: ['气氛供电站', '秒回体质', '群聊中枢'],
    rarity: '检测样本中约 6%',
    match: [
      { field: 'social', op: '>=', value: 70 },
    ],
  },
  {
    id: 'night-ghost',
    name: '夜间游魂',
    code: 'NIGHT-GHOST',
    subtitle: '白天是NPC，凌晨才是主角',
    description:
      '你的高光时刻总在别人睡着之后。夜深了，世界终于没有新消息，你才拿回注意力和自我。问题是，这套节律让你白天的执行力一直处于赊账状态，而赊的账迟早要还。',
    strengths: ['深夜专注力好，思路清晰', '独处时创造力最活跃'],
    weaknesses: ['白天状态长期低迷', '作息与社会时钟错位'],
    quote: '「再等一会儿就睡，真的就一会儿。」',
    advice: [
      '把最需要脑力的任务安排在夜里，但给第二天留够恢复时间。',
      '固定一个「关机仪式」，比如关灯、放下手机、听同一段音频。',
      '每周挑两天把作息往前提半小时，别一次跳太远。',
    ],
    tags: ['凌晨主角', '时区自由人', '昼夜错位'],
    rarity: '检测样本中约 8%',
    match: [
      { field: 'reality', op: '<=', value: 48 },
      { field: 'execution', op: '<=', value: 48 },
      { field: 'emotion', op: '>=', value: 45 },
    ],
  },
  {
    id: 'content-vacuum',
    name: '内容黑洞',
    code: 'CONTENT-VACUUM',
    subtitle: '摄入量惊人，留存率感人',
    description:
      '你每天吸收的信息量超过大多数人一个月，但几乎什么都没留下。刷完一条接一条，大脑像被持续注水，却从未沉淀。你不是不上进，你只是把「输入」当成了「前进」，而这两件事之间隔着一整个动手的环节。',
    strengths: ['视野广，什么都能聊两句', '对新事物接受度高'],
    weaknesses: ['输入多、输出少', '很难把兴趣变成作品'],
    quote: '「这个我收藏了，等有空看。」',
    advice: [
      '每吸收十条内容，强制自己产出一个小东西（一句话、一张图、一段代码）。',
      '给收藏夹设上限，满了必须先清理再收藏。',
      '选一个方向深挖两周，而不是每天换一个方向。',
    ],
    tags: ['收藏从不打开', '输入过载', '留存率感人'],
    rarity: '检测样本中约 9%',
    match: [
      { field: 'attention', op: '<=', value: 45 },
      { field: 'reality', op: '<=', value: 45 },
      { field: 'execution', op: '<=', value: 50 },
    ],
  },
  {
    id: 'calculator-human',
    name: '精算人类',
    code: 'CALCULATOR-HUMAN',
    subtitle: '情绪稳定，钱包冷静，风险可控',
    description:
      '你的消费和情绪都有厚厚的缓冲区：不会深夜下单，不会因为一句评价失眠，也不会在群里被情绪带着跑。你把生活过成了一份被认真维护的预算表。偶尔，你也会怀疑自己是不是太稳了——但稳本身不是问题，问题是你有没有给自己留出一点不计成本的空间。',
    strengths: ['自控力强，很少做后悔的决定', '情绪与财务都可持续'],
    weaknesses: ['可能错过一些「不值得但很快乐」的事', '对波动的容忍度偏低'],
    quote: '「这个月超支了，下个月扣回来。」',
    advice: [
      '每月留一笔「无理由支出」，专门用来买没用的快乐。',
      '偶尔做一件没有计划的事，训练一下对不确定性的耐受。',
      '稳定是优势，别让它变成不允许自己失控的负担。',
    ],
    tags: ['预算表人生', '冷静克制', '风险可控'],
    rarity: '检测样本中约 5%',
    match: [
      { field: 'wallet', op: '>=', value: 72 },
      { field: 'emotion', op: '>=', value: 55 },
    ],
  },
  {
    id: 'quiet-observer',
    name: '静音观察者',
    code: 'QUIET-OBSERVER',
    subtitle: '不说话，但什么都看见了',
    description:
      '你在社交场合里长期处于观察位：不主动开麦，不抢话，但每个人的变化你都记得。你的情绪比你以为的稳定，注意力也还在，只是把它们都留给了自己。你不是不参与，你是在用一种低音量、长时长的方式参与。',
    strengths: ['观察力和记忆力好', '情绪稳定，不被群体情绪裹挟'],
    weaknesses: ['容易被当成「没有意见」', '想说的话常常错过的时机'],
    quote: '「我当时就想说，但没找到那个空档。」',
    advice: [
      '在每次对话里，给自己设一个「至少说一句」的配额。',
      '把观察写成文字发出去，你的视角值得一个出口。',
      '找一个不用即兴反应的小圈子，先在小范围内开口。',
    ],
    tags: ['低音量参与', '隐身参会者', '观察位常驻'],
    rarity: '检测样本中约 8%',
    match: [
      { field: 'social', op: '<=', value: 48 },
      { field: 'emotion', op: '>=', value: 58 },
      { field: 'attention', op: '>=', value: 50 },
    ],
  },
  {
    id: 'buffer-human',
    name: '缓冲中的人类',
    code: 'BUFFERING-HUMAN',
    subtitle: '各项指标均衡，偶尔卡顿',
    description:
      '你的检测曲线非常像普通人该有的样子：没有一项彻底崩掉，也没有一项特别突出。你能上班、能社交、能早睡，也偶尔通宵、偶尔乱花钱、偶尔已读不回。这不是「平庸」，这是一个还在正常运转、尚有余量的系统。',
    strengths: ['各项能力都在可用区间', '状态有弹性，能自我恢复'],
    weaknesses: ['没有明显优势项，容易被平均值掩盖', '坏习惯会慢慢累积'],
    quote: '「还行吧，就那样。」',
    advice: [
      '挑一个你最想改善的维度，只改一项，坚持三周。',
      '把你的「还行」记录下来，看看它真实的样子。',
      '别再等状态变好才开始，用现在的状态开始。',
    ],
    tags: ['均衡型样本', '偶发卡顿', '尚有余量'],
    rarity: '检测样本中约 14%',
    match: [],
  },
];

export const ARCHETYPE_MAP: Record<string, Archetype> = ARCHETYPES.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<string, Archetype>,
);
