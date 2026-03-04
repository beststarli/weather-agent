// main.ts
import 'dotenv/config'
import { TOOLKIT, type ToolName } from './tools'
import { readFile } from 'node:fs/promises'

interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

// 解析模型输出，提取工具调用或最终回答
function parseAssistant(text: string): {
    action?: { tool: string; input: string }
    final?: string
} {
    const xmlFinalMatch = text.match(/<final>([\s\S]*?)<\/final>/i)
    if (xmlFinalMatch) {
        return { final: xmlFinalMatch[1].trim() }
    }

    const xmlActionMatch = text.match(
        /<action\s+tool=["']([^"']+)["']\s*>([\s\S]*?)<\/action>/i,
    )
    if (xmlActionMatch) {
        return {
            action: {
                tool: xmlActionMatch[1].trim(),
                input: xmlActionMatch[2].trim(),
            },
        }
    }

    const toolCallMatch = text.match(
        /\[TOOL_CALL\]\s*tool:\s*(\w+)\s*input:\s*(.+)/s,
    )
    if (toolCallMatch) {
        return {
            action: {
                tool: toolCallMatch[1],
                input: toolCallMatch[2].trim(),
            },
        }
    }

    const finalMatch = text.match(/\[FINAL\]\s*(.+)/s)
    if (finalMatch) {
        return { final: finalMatch[1].trim() }
    }

    return {}
}

// 调用 LLM（这里以 OpenAI 兼容接口为例）
async function callLLMs(messages: ChatMessage[]): Promise<string> {
    const apiKey = process.env.LLM_API_KEY?.trim()
    if (!apiKey) {
        throw new Error('未读取到 LLM_API_KEY，请检查 .env 是否存在且格式正确。')
    }

    const response = await fetch(
        process.env.LLM_API_URL || 'https://api.deepseek.com/v1/chat/completions',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: process.env.LLM_MODEL || 'deepseek-chat',
                messages,
                temperature: 0.7,
            }),
        },
    )

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(`LLM 请求失败: ${response.status} ${errText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
}

// 核心 Agent Loop
async function AgentLoop(question: string) {
    const systemPrompt = await readFile('prompt.md', 'utf-8')

    const history: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
    ]

    for (let step = 0; step < 10; step++) {
        const assistantText = await callLLMs(history)
        console.log(`\n[LLM 第 ${step + 1} 轮输出]\n${assistantText}\n`)
        history.push({ role: 'assistant', content: assistantText })

        const parsed = parseAssistant(assistantText)
        if (parsed.final) {
            return parsed.final
        }

        if (parsed.action) {
            const toolAliasMap: Record<string, ToolName> = {
                getTime: 'getCurrentTime',
            }

            const normalizedToolName =
                toolAliasMap[parsed.action.tool] || parsed.action.tool
            const toolFn = TOOLKIT[normalizedToolName as ToolName]
            let observation: string

            if (toolFn) {
                observation = await toolFn(parsed.action.input)
            } else {
                observation = `未知工具: ${parsed.action.tool}`
            }

            console.log(`<observation>${observation}</observation>\n`)

            history.push({
                role: 'user',
                content: `<observation>${observation}</observation>`,
            })
            continue
        }

        break // 未产生 action 或 final
    }

    return '未能生成最终回答，请重试或调整问题。'
}

// 主入口
const region = process.argv.slice(2).join(' ').trim() || '南京'
const question = `${region}今天天气怎么样？`
console.log(`\n用户问题: ${question}`)
console.log('─'.repeat(50))

AgentLoop(question).then((answer) => {
    console.log('─'.repeat(50))
    console.log(`\n最终回答: ${answer}\n`)
})
