# 🚀 插件自动化构建仓库示例 (Plugin Hub)

这是一个专为“多插件/多模块”仓库设计的自动化构建模板。它通过 GitHub Actions 自动扫描、安装、构建并发布插件包。

## 🌟 核心特性

- **自动化扫描**：无需手动修改配置文件，系统会自动识别包含 `spark.json` 的文件夹。
- **智能构建**：
  - 如果检测到 `package.json`，会自动执行 `npm install` 和 `npm run build`。
  - 支持纯静态插件（无 Node 环境需求）直接打包。
- **自动发布**：推送到 `v*` 格式的 Git Tag 时，会自动生成 Release 并挂载每个插件的独立 `.zip` 包。

## 📁 目录结构要求

开发者只需按照以下规范存放代码即可触发构建：

```text
.
├── plugin-a/
│   ├── spark.json      # 必须：作为打包开关
│   ├── package.json    # 可选：存在则会自动执行 npm 安装/构建
│   └── index.js
├── plugin-b/
│   ├── spark.json
│   └── static_files/   # 纯静态插件，直接打包
└── .github/workflows/  # 包含构建脚本
```
## 📦构建方法

在本地提交代码并打标签推送：

``` Bash
git add .
git commit -m "fix sth"
git tag v1.0.1
git push origin v1.0.1
```

## 📝 构建结果

构建完成后，会自动生成 Release，并挂载每个插件的 `.zip` 包。

注意：spark.json 文件中的 `name` 字段仅能包含数字、字母与下划线，否则会被插件安装器拦截。`spark.json`中的version仅能填写数组，如：`[1,0,0]`。
