// Twitter Scanner Analysis Templates
// 这里管理所有的分析模板，可以方便地编辑而不影响主要业务逻辑

const PROMPT_TEMPLATES = {
  hot_topics: {
    id: 'hot_topics',
    title: '目录式总结',
    description: '从Twitter中找到大家讨论的具体热点事件，按话题分类聚合相关讨论',
    prompt: `帮我从Twitter List中，找到大家都在讨论的一些话题，给到我一些洞见和启发。内容用中文输出

流程：
1、请先浏览我给你的全部Twitter
2、帮我筛选出大家在讨论的热点话题，这个话题需要是一个具体的事件，而不是笼统抽象的概述。例如应该是"阿里新发布的Qwen3模型"，而不是"AI模型发展"。
3、按照话题来分类，每个话题聚合相关的讨论
4、每个讨论中，列举参与讨论的人的核心观点
5、话题的呈现按照讨论的人数倒序排列，优先呈现讨论人数更多的话题

输出格式：
1、markdown格式输出
2、用中文输出
3、链接需要是可点击形式，在"作者"和"原文"这两部分分别加上作者主页的地址链接，和原推文的链接。核心观点部分不要加链接

### 话题
@[作者昵称](作者链接) [20字以内核心观点] [查看推文](推文链接)
@[作者昵称](作者链接) [20字以内核心观点] [查看推文](推文链接)

### 话题
@[作者昵称](作者链接) [20字以内核心观点] [查看推文](推文链接)

❌ 内容筛选有如下要求：
1、个人生活、日常琐事、情感表达
2、广告推广、纯营销内容
3、政治观点、争议话题
4、很短没有意义的`,
    preview: `<div style="line-height: 1.4; font-size: 13px;">
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">AI Agent框架热议</div>
      <div style="margin-bottom: 4px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@AndrewNg</a> LangChain新架构简化多模态Agent开发 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div style="margin-bottom: 4px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@OpenAI</a> Assistant API支持函数调用和文件上传 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div style="margin-bottom: 8px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@GoogleAI</a> Gemini Pro在代码生成任务上超越GPT-4 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">Meta开源Llama3-70B争议</div>
      <div style="margin-bottom: 4px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@ylecun</a> 开源大模型将终结AI垄断格局 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@elonmusk</a> xAI的Grok将全面开源对抗封闭模型 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
    </div>`
  },

  tech_insights: {
    id: 'tech_insights',
    title: '深度观点呈现',
    description: '筛选内容中的深度观点，为你总结呈现',
    prompt: `✅请帮我筛选有价值的内容来呈现。请用中文，markdown格式输出：

### 讨论主题
[作者昵称](作者链接) [10个字核心观点]：[推文原文（英文需要翻译成中文）] [查看推文](推文链接)
[作者昵称](作者链接) [10个字核心观点]：[推文原文（英文需要翻译成中文）] [查看推文](推文链接)

### 讨论主题
[作者昵称](作者链接) [10个字核心观点]：[推文原文（英文需要翻译成中文）] [查看推文](推文链接)

展示排列有如下要求：
1、互联网产品和新的ai技术相关
2、相同主题的内容，放在一起
3、英文的内容，用中文重写之后呈现
4、同一个人的相同内容，综合合并输出

❌ 内容筛选有如下要求：
1、个人生活、日常琐事、情感表达
2、广告推广、纯营销内容
3、政治观点、争议话题
4、很短没有意义的

我关注的一些博主：elon musk , sam altman`,
    preview: `<div style="line-height: 1.4; font-size: 13px;">
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">Transformer架构进化</div>
      <div style="margin-bottom: 4px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">Andrej Karpathy</a> 状态空间模型：Mamba架构在长序列建模上的突破表明，我们正在见证Post-Transformer时代的到来。其线性复杂度和选择性状态更新机制，将重新定义大规模语言模型的计算范式 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div style="margin-bottom: 8px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">Yann LeCun</a> 世界模型训练：传统的自回归预测已达极限，真正的AGI需要通过世界模型学习因果关系和物理直觉。Meta的V-JEPA证明了视觉表征学习的巨大潜力 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">AI Agent智能体革命</div>
      <div style="margin-bottom: 4px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">Dario Amodei</a> 宪法AI进展：通过Constitutional AI和RLHF的结合，我们实现了AI系统的自我监督和价值对齐。这种方法将成为未来AGI安全性的基石 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">Demis Hassabis</a> 多模态推理：AlphaGeometry的成功证明，AI在数学推理上已具备创造性。下一步是将符号推理与神经网络深度融合，实现真正的通用推理能力 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
    </div>`
  },

  product_discovery: {
    id: 'product_discovery',
    title: '新产品发现',
    description: '发现Twitter中提到的新产品或新功能，分类整理并分析其价值',
    prompt: `帮我发现Twitter List中，提炼出大家提到的或者在用的新产品

流程：
1、请先浏览我给你的全部Twitter
2、帮我筛选出大家在讨论的新产品或者新功能
3、针对产品，根据用户的关注点分类
4、每一个产品，都要说明三部分，这个产品是做什么的，帮用户解决什么问题，有谁在用评价怎么样

输出格式：
要求链接是markdown可以点击的形式。将链接直接放在产品名称上，不要单独展示出链接的文本

# AI应用类
### 产品 [原文链接]
介绍：
解决的问题：
用户评价：

# 技术开发类
### 产品 [原文链接]
介绍：
解决的问题：
用户评价：

我关注的产品领域：和人们生活相关的，和生产效率相关的，和行业领域的AI应用相关的等等。`,
    preview: `<div style="line-height: 1.4; font-size: 13px;">
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">AI原生产品</div>
      <div style="margin-bottom: 8px;">
        <div style="font-weight: 600; margin-bottom: 3px;"><a href="#" style="color: #4A99E9; text-decoration: none;">Perplexity Pages</a> <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
        <div style="margin-bottom: 2px; color: #374151; font-size: 12px;"><strong>介绍：</strong>AI驱动的协作式知识页面生成工具，支持实时搜索和多人编辑</div>
        <div style="margin-bottom: 2px; color: #374151; font-size: 12px;"><strong>解决问题：</strong>传统Wiki编辑门槛高，内容更新滞后，团队协作效率低</div>
        <div style="color: #374151; font-size: 12px;"><strong>用户评价：</strong>YC创始人称其为"Wikipedia杀手"，月活跃用户增长300%</div>
      </div>
      <div style="margin-bottom: 8px;">
        <div style="font-weight: 600; margin-bottom: 3px;"><a href="#" style="color: #4A99E9; text-decoration: none;">v0.dev</a> <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
        <div style="margin-bottom: 2px; color: #374151; font-size: 12px;"><strong>介绍：</strong>Vercel推出的AI界面生成工具，从文本描述直接生成React组件</div>
        <div style="margin-bottom: 2px; color: #374151; font-size: 12px;"><strong>解决问题：</strong>前端原型开发耗时长，设计师与开发者沟通成本高</div>
        <div style="color: #374151; font-size: 12px;"><strong>用户评价：</strong>独立开发者@levelsio称"节省90%原型时间"，获得产品猎人年度金奖</div>
      </div>
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">生产力革新</div>
      <div>
        <div style="font-weight: 600; margin-bottom: 3px;"><a href="#" style="color: #4A99E9; text-decoration: none;">Replit Agent</a> <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
        <div style="margin-bottom: 2px; color: #374151; font-size: 12px;"><strong>介绍：</strong>全自动编程助手，支持从需求描述到部署的完整开发流程</div>
        <div style="margin-bottom: 2px; color: #374151; font-size: 12px;"><strong>解决问题：</strong>非技术人员无法快速实现创意，小项目开发成本过高</div>
        <div style="color: #374151; font-size: 12px;"><strong>用户评价：</strong>48小时内构建10万用户产品，被誉为"No-code终结者"</div>
      </div>
    </div>`
  },

  crypto_analysis: {
    id: 'crypto_analysis',
    title: 'Meme背景分析',
    description: '从搜索结果中帮你分析meme的背景信息',
    prompt: `这是一个加密货币，meme币的Twitter搜索结果列表，我需要你帮我梳理这个代币大家对他的评论，输出这个代币的总结

流程：
1、阅读全部我给你的Twitter内容
2、基于这些信息，对这个代币进行总结，包括项目的背景，项目发行方的介绍，kol评价，人们的情绪等等多个维度
3、输出分析报告

输出格式：
1、要求链接是markdown可以点击的形式，不要出现链接的文本
2、用中文输出

## 项目介绍
…… 链接[原文链接]

## dev介绍
…… 链接[原文链接]
……`,
    preview: `<div style="line-height: 1.4; font-size: 13px;">
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">项目背景</div>
      <div style="margin-bottom: 6px; color: #374151; font-size: 12px;">$BONK是Solana生态首个社区meme币，2022年12月空投给SOL持有者，总供应量100万亿枚，50%分配给社区。项目核心是成为Solana DeFi的"狗狗币"，推动生态应用采用 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">创始团队</div>
      <div style="margin-bottom: 6px; color: #374151; font-size: 12px;">匿名团队运营，核心成员包括前FTX员工和Solana早期贡献者。团队持有5%代币，承诺3年线性释放。与Magic Eden、Jupiter等主要DEX深度合作 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">KOL观点</div>
      <div style="margin-bottom: 3px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@SolanaFloor</a> BONK救活了Solana NFT市场，交易量暴增400%，是生态复苏的催化剂 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div style="margin-bottom: 3px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@DefiLlama</a> 与其他meme币不同，BONK有实用性：DeFi质押、NFT交易费折扣、游戏代币 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div style="margin-bottom: 6px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@CoinBureau</a> 谨慎看待：代币经济学存在通胀风险，大部分价值来自投机而非基本面 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">社区情绪</div>
      <div style="color: #374151; font-size: 12px;">社区FOMO情绪浓厚，Telegram群20万成员，日活跃度75%。巨鲸地址持仓集中度较高，前100持有者占比45%，存在砸盘风险。散户多为短期投机，缺乏长期持有共识 <a href="#" style="color: #4A99E9; font-size: 11px;">[查看推文]</a></div>
    </div>`
  },

  custom: {
    id: 'custom',
    title: '自定义提示词',
    description: '',
    prompt: '',
    preview: `<div style="line-height: 1.6; font-size: 14px;">
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">自定义分析示例</div>
      <div style="color: #6b7280;">你可以在这里定义专属的分析模板，比如投资视角、技术深度、产品思维等不同的分析角度</div>
    </div>`,
    isCustom: true
  }
};

// 导出到全局作用域，供content.js使用
if (typeof window !== 'undefined') {
  window.PROMPT_TEMPLATES = PROMPT_TEMPLATES;
  console.log('Simple templates loaded:', Object.keys(PROMPT_TEMPLATES));
}

// Node.js环境导出（如果需要）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PROMPT_TEMPLATES };
}