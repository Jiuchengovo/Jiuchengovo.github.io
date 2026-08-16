# Jiucheng's CTF Note 🚩

久诚（Jiucheng）的个人笔记站，目前以 **CTF 学习笔记**为主，后续会逐步补充其他课程的笔记。

🌐 在线访问：<https://jiuchengovo.github.io/>

## ✨ 特性

- 🖥️ **终端风格首页** —— 可交互（输入 `1/2/3`、`ls`、`cd` 即可跳转分区）
- 📚 **CTF 全方向笔记** —— Web / Reverse / Pwn / Crypto / Misc
- 🌙 **深色默认 + 浅色切换** —— 右上角一键切换，浏览器记住你的选择
- 🔆 **代码高亮** —— highlight.js 运行时高亮，GitHub 明暗两套配色
- ∑ **公式支持** —— MathJax 按需加载（仅含公式的页面才下载，其余页面零开销）
- 📊 **GitHub 贡献图** —— 每次部署自动刷新
- ⚡ **国内访问优化** —— 字体与高亮资源全部本地自托管，不依赖被墙的 Google Fonts / cdnjs

## 📁 目录结构

```
docs/
├── index.md            # 首页（终端 hero + 更新日志 + 友链 + 贡献图）
├── study/              # 学习笔记 —— 每个课程一个目录
│   └── ctf/            # CTF 夺旗赛（当前唯一课程）
│       ├── index.md    # CTF 目录页
│       ├── Crypto Lab 0~3.md
│       ├── Lab 1：Web.md / Web_Lab1.md / Pwn.md / Lab 1 Misc.md / rev lab 1.md
│       ├── Misc Lab 2~3.md
│       └── （图片 / PDF / 脚本等附件）
├── tools/              # 工具折腾（预留）
├── diaries/            # 随笔（预留）
├── theme/              # 自定义主题：css / js / 字体 / 贡献图数据
└── overrides/          # Material 模板覆盖（防闪烁主题脚本等）
```

## 🚀 本地运行

```bash
pip install mkdocs mkdocs-material
mkdocs serve          # 打开 http://localhost:8000
```

## 📦 部署

推送到 `master` 分支即自动部署（`.github/workflows/deploy.yml`）：

1. `pip install mkdocs mkdocs-material`
2. 刷新贡献图数据（`python .github/scripts/fetch-contributions.py`）
3. `mkdocs build` 后推送到 `gh-pages` 分支
4. GitHub Pages 自动生效：<https://jiuchengovo.github.io/>

## ➕ 新增笔记 / 课程

每个课程一个目录，参考 `study/ctf/` 的结构：

```bash
mkdir -p docs/study/<课程名>
# 放入笔记 .md 与图片（同目录相对引用即可）
```

然后在 `mkdocs.yml` 的 `nav` → `学习` 下平级加一个条目：

```yaml
nav:
  - 学习:
      - 学习: study/index.md
      - CTF 夺旗赛:
          - CTF 目录: study/ctf/index.md
          # ...
      - 新课程名:          # ← 新增课程
          - 课程首页: study/<course>/index.md
```

提交并 `git push origin master`，几分钟后自动上线。

## 🎨 主题说明

- 默认**深色**（slate），未保存偏好时直接深色；已手动切换过的用户尊重其选择
- 字体：Inter / JetBrains Mono 本地托管（woff2），中文回退系统字体（苹方 / 微软雅黑）
- 代码高亮：highlight.js 本地托管（`theme/js/hljs/`）
- 公式：MathJax 惰性加载，仅在检测到 `.arithmatex` 的页面注入

## 📝 版权与内容

笔记内容均为个人学习记录，代码与实验截图来自课程实验与 CTF 练习。主题样式参考 [bfyes.github.io](https://bfyes.github.io/)。
