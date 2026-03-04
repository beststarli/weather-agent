# LLM-Based Agent Viable Architecture初尝试
## 介绍
这是一个基于LLM的Agent架构的初步实现，旨在展示如何使用LLM来驱动一个简单的Agent系统。该系统能够接受用户输入的问题，并通过调用预定义的工具来获取答案。当前实现了一个天气查询工具，用户可以询问特定城市的天气情况。

## 如何运行
1. 克隆仓库并进入项目目录。
    ```bash
    git clone https://github.com/your-username/agent-loop.git
    cd agent-loop
2. 安装依赖：
   ```bash
   npm install
   ```
3. 在根目录下创建一个 `.env` 文件，并添加你的LLM API密钥：
   ```
   LLM_API_KEY=你的API密钥
   ```
4. 运行主程序：
   ```bash
   npm start -- "城市名称"
   ```
   例如：
   ```bash
   npm start -- "南京"
   ```
