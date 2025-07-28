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
    preview: `<div style="line-height: 1.6; font-size: 14px;">
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">阿里新发布的Qwen3模型</div>
      <div style="margin-bottom: 8px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@TechGuru</a>：性能超越GPT-4的国产大模型 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
      <div style="margin-bottom: 16px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@AIExpert</a>：开源策略将改变AI格局 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
      
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">OpenAI发布GPT-5预告</div>
      <div><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@SamAltman</a>：多模态能力将是核心突破 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
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
    preview: `<div style="line-height: 1.6; font-size: 14px;">
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">大语言模型技术突破</div>
      <div style="margin-bottom: 8px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">Sam Altman</a> AGI即将到来：我们正在开发的新模型将具有推理能力，这将彻底改变人类与AI的交互方式 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
      <div style="margin-bottom: 16px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">Elon Musk</a> 开源才是未来：Grok将完全开源，让每个人都能构建自己的AI助手 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
      
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">产品创新动态</div>
      <div><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">Brian Chesky</a> AI改变旅行：Airbnb正在开发AI旅行规划师，根据你的偏好自动生成完美行程 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
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
    preview: `<div style="line-height: 1.6; font-size: 14px;">
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">AI应用类</div>
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px;"><a href="#" style="color: #4A99E9; text-decoration: none;">Claude Desktop</a> <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
        <div style="margin-bottom: 4px; color: #6b7280;"><strong>介绍：</strong>Anthropic推出的桌面版AI助手，支持多模态交互</div>
        <div style="margin-bottom: 4px; color: #6b7280;"><strong>解决的问题：</strong>提供更便捷的AI交互体验，支持文档分析和代码编写</div>
        <div style="color: #6b7280;"><strong>用户评价：</strong>开发者普遍反馈界面友好，响应速度快</div>
      </div>
      
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">技术开发类</div>
      <div>
        <div style="font-weight: 600; margin-bottom: 8px;"><a href="#" style="color: #4A99E9; text-decoration: none;">Cursor IDE</a> <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
        <div style="margin-bottom: 4px; color: #6b7280;"><strong>介绍：</strong>AI辅助的代码编辑器，基于VSCode构建</div>
        <div style="margin-bottom: 4px; color: #6b7280;"><strong>解决的问题：</strong>提高编程效率，智能代码补全和重构</div>
        <div style="color: #6b7280;"><strong>用户评价：</strong>程序员称赞其AI建议准确度高</div>
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
    preview: `<div style="line-height: 1.6; font-size: 14px;">
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">项目介绍</div>
      <div style="margin-bottom: 16px; color: #6b7280;">PEPE是基于经典网络梗Pepe the Frog的meme币，于2023年4月发行，主打社区驱动和去中心化理念 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
      
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">开发团队</div>
      <div style="margin-bottom: 16px; color: #6b7280;">匿名团队运营，强调社区自治，无预挖矿和团队份额，100%代币公平发行 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
      
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">KOL评价</div>
      <div style="margin-bottom: 8px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@CryptoWhale</a> PEPE展现了meme币的强大社区力量，但投资需谨慎 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
      <div style="margin-bottom: 16px;"><a href="#" style="color: #4A99E9; text-decoration: none; font-weight: 500;">@DeFiGuru</a> 纯粹的投机标的，缺乏实际应用场景 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
      
      <div style="color: #1f2937; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">市场情绪</div>
      <div style="color: #6b7280;">社区情绪高涨，但波动极大，散户参与度高，鲸鱼动向值得关注 <a href="#" style="color: #4A99E9; font-size: 12px;">[查看推文]</a></div>
    </div>`
  },

  custom: {
    id: 'custom',
    title: '自定义提示词',
    description: '创建专属的分析模板',
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