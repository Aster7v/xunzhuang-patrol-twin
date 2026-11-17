# 巡桩问诊 · 日间优化版 V1.1

在原版上优化日间光照、浅色监控界面和设备几何，并新增组委会网页编辑器原生交付。

**只有网页编辑权限时，优先使用 platform/ 中的 GLB 与大屏 JSON。** 先新建测试大屏再导入。本包按公开编辑器格式生成，尚未在用户账号里完成导入、保存和复开验收。

原生查看器未发现内部节点位姿或动作播放能力，不能承诺独立动画随 GLB 接入。真实数据要使用平台数据源绑定。

详情见 [平台接入说明](docs/平台接入说明.md) 与 [使用说明](使用说明.txt)。

独立动态演示用于辅助查看，可双击交付文件中的“巡桩问诊-日间优化版.html”，或运行：

```sh
python -m http.server 8090
```

再访问 http://localhost:8090/ 。无框架、npm 或运行时外部 CDN。

使用 [Anthropic frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design)，案例和设计记录见 [日间版设计与参考](docs/日间版设计与参考.md)。
