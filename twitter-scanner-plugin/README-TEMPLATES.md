# Twitter Scanner 模板管理系统

## 🎯 简洁设计原则

现在你可以**专门编辑 `templates.js` 文件来管理所有分析模板，无需触碰主要的业务逻辑代码！**

## 📁 文件结构

```
twitter-scanner-plugin/
├── templates.js          # ✏️ 编辑这个文件管理所有模板！
├── content.js            # 主要业务逻辑（无需修改）
├── manifest.json         # 扩展配置
└── 其他文件...
```

## 📝 如何编辑模板

### 1. 打开 `templates.js` 文件

所有的分析模板都在这个文件中，结构清晰：

```javascript
const PROMPT_TEMPLATES = {
  hot_topics: {
    id: 'hot_topics',
    title: '热点话题聚合',
    description: '从Twitter中找到大家讨论的具体热点事件...',
    prompt: `你的分析提示词...`,
    preview: `预览内容...`
  },
  // 更多模板...
};
```

### 2. 修改现有模板

只需要编辑对应模板的 `prompt` 字段即可：

```javascript
prompt: `修改这里的提示词内容...`
```

### 3. 添加新模板

在 `PROMPT_TEMPLATES` 对象中添加新的模板：

```javascript
your_new_template: {
  id: 'your_new_template',
  title: '你的模板标题',
  description: '模板描述',
  prompt: `你的分析提示词...`,
  preview: `预览内容...`
}
```

### 4. 应用更改

1. 保存 `templates.js` 文件
2. 重新加载Chrome扩展
3. 刷新Twitter页面
4. ✅ 立即生效！

## 🚀 系统优势

- **简单直观**: 所有模板集中在一个文件中
- **即时生效**: 修改后重新加载扩展即可
- **易于维护**: 不依赖复杂的生成系统
- **版本控制友好**: 可以轻松追踪模板变更

## 🎨 模板字段说明

- `id`: 模板的唯一标识符
- `title`: 在界面中显示的标题
- `description`: 模板功能描述
- `prompt`: AI分析使用的提示词（核心内容）
- `preview`: 在模板选择界面显示的预览内容
- `isCustom`: 是否为自定义模板（可选）

## 💡 最佳实践

1. **备份**: 修改前备份 `templates.js` 文件
2. **测试**: 修改后及时测试功能是否正常
3. **语法检查**: 确保JavaScript语法正确
4. **描述清晰**: 为每个模板写好描述信息

现在你可以专注于内容创作，而不需要担心技术复杂性！🎉