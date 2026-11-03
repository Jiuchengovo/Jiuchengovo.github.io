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
└── theme/              # 自定义主题：css / js / 字体 / 贡献图数据
overrides/              # 仓库根目录下的 Material 模板覆盖
```

## 🚀 本地运行

使用 Python 3.13，在独立虚拟环境中安装固定版本依赖。Windows PowerShell：

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m mkdocs serve --dev-addr 127.0.0.1:8000
```

浏览器打开 <http://127.0.0.1:8000/>。本地预览不会发布网站。

macOS / Linux 对应使用 `python3.13 -m venv .venv`，之后以 `.venv/bin/python` 执行相同命令。

提交前先运行 `python -m mkdocs build --strict`（使用虚拟环境中的 Python）；缺失图片、失效的文档引用等警告会让构建失败。大幅修改主题、模板或工作流时，先从 `master` 新建功能分支，通过 PR 检查后再合并。

## 📦 部署

分支职责：

| 分支 | 用途 |
| --- | --- |
| `master` | 默认分支，保存完整源码，是唯一的正式发布入口 |
| `main` | 保留的旧分支，不再用于日常修改或发布 |
| `gh-pages` | 工作流生成的静态站点，不手工修改 |
| 功能分支（如 `docs/my-note`） | 本地修改、预览，通过 PR 合并到 `master` |

`.github/workflows/deploy.yml` 的流程为：

1. PR 指向 `master` 时，只安装固定依赖、执行严格构建并保存构建产物，不部署。
2. 推送或合并到 `master` 后，刷新贡献图数据并执行相同的严格构建。
3. 只有构建成功，独立的发布任务才将产物发布到 `gh-pages`；构建任务本身没有仓库写权限。
4. 同一分支有更新时取消旧流程，避免过时的构建覆盖新版本。`gh-pages` 保留后续发布记录，失败日志保存在 Actions，不再写入公开的 `ci-debug` 分支。

`master` 的保护规则要求通过 PR 合并，并通过 `Validate and build` 检查；检查前分支必须与最新 `master` 同步，讨论必须解决。禁止强制推送、删除分支，要求线性历史，管理员也遵守这些规则。个人维护不要求其他人批准自己的 PR；通常使用 Squash and merge 合并。

GitHub Pages 从 `gh-pages` 的根目录提供服务。默认分支、保护规则和 Pages 来源属于 GitHub 仓库设置，不会因为复制这些文件到另一个仓库而自动生效；复用本项目时需另行配置。

`requirements.txt` 固定了整组构建依赖；Dependabot 每月以 PR 提议更新 Python 包和 Actions，更新后仍需通过严格构建。不要把全局 Python 环境的所有包直接写入这个文件。

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

在本地确认显示正常并通过严格构建，再提交 PR。PR 检查通过后，合并到 `master` 才会自动上线。

### 一次完整的更新

以下示例使用 PowerShell 和 GitHub CLI；首次使用 `gh` 时先运行 `gh auth login`。

```powershell
git switch master
git pull --ff-only origin master
git switch -c docs/my-note

# 编辑笔记、图片和导航，在浏览器里检查预览
.\.venv\Scripts\python.exe -m mkdocs build --strict
# 确认构建成功后，按实际改动指定要提交的文件
git add docs/study/your-course/your-note.md mkdocs.yml
git diff --cached
git commit -m "docs: add my course note"
git push -u origin docs/my-note

gh pr create --base master --fill
gh pr checks --watch
# 检查成功、确认内容后再合并，这一步会触发正式发布
gh pr merge --squash
```

也可以在 GitHub 网页创建 PR、查看检查结果，并选择 Squash and merge。不要直接推送 `master`，不要为绕过检查而强推。若其他 PR 先合并，使当前分支落后，可用 `git fetch origin`、`git merge origin/master` 同步后再次推送，等待检查重新通过。

### 发布失败时

- PR 的构建失败：在功能分支修复并推送，检查会重新运行；未合并前不会影响线上。
- 合并后构建或发布失败：到仓库 Actions 的 `site` 流程查看具体失败步骤。网络等临时故障可重跑失败任务；代码或依赖问题应另开修复 PR。
- `Publish validated master` 成功后，还需确认 GitHub 的 `pages build and deployment` 成功，并打开线上页面检查。浏览器仍显示旧资源时再刷新缓存。
- 需要回退内容：提交 revert PR，通过相同检查后合并。不要重写 `master` 或手动覆盖 `gh-pages`。

### 当前已知内容缺口

`Pwn.md` 原先引用的 `image-47.png` 至 `image-52.png` 没有随提交保存，现用“补充截图待补”提示替代失效链接。补齐原始截图后再恢复引用，不要使用另一篇笔记中同编号的 `rev-image-*` 替代。

## 🎨 主题说明

- 默认**深色**（slate），未保存偏好时直接深色；已手动切换过的用户尊重其选择
- 字体：Inter / JetBrains Mono 本地托管（woff2），中文回退系统字体（苹方 / 微软雅黑）
- 代码高亮：highlight.js 本地托管（`theme/js/hljs/`）
- 公式：MathJax 惰性加载，仅在检测到 `.arithmatex` 的页面注入
- PDF：当前没有内嵌 PDF 页面，已移除未使用的旧 PDF.js 预览脚本；后续可直接链接 PDF，由浏览器原生查看。

## 📝 版权与内容

笔记内容均为个人学习记录，代码与实验截图来自课程实验与 CTF 练习。主题样式参考 [bfyes.github.io](https://bfyes.github.io/)。
