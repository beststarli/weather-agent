export type ToolName = 'getTime' | 'getCurrentTime' | 'getWeather'

function weatherCodeToText(code: number): string {
    const codeMap: Record<number, string> = {
        0: '晴',
        1: '大部晴朗',
        2: '局部多云',
        3: '阴',
        45: '雾',
        48: '冻雾',
        51: '小毛毛雨',
        53: '毛毛雨',
        55: '强毛毛雨',
        61: '小雨',
        63: '中雨',
        65: '大雨',
        71: '小雪',
        73: '中雪',
        75: '大雪',
        80: '小阵雨',
        81: '中等阵雨',
        82: '强阵雨',
        95: '雷暴',
    }

    return codeMap[code] || '未知天气'
}

export const TOOLKIT: Record<ToolName, (input: string) => Promise<string>> = {
    getTime: async () => {
        return new Date().toISOString()
    },

    getCurrentTime: async () => {
        return new Date().toISOString()
    },

    getWeather: async (input: string) => {
        let city = input.trim()
        let timeFromInput = ''

        if (input.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(input) as {
                    city?: string
                    time?: string
                }
                city = parsed.city?.trim() || city
                timeFromInput = parsed.time?.trim() || ''
            } catch {
                // 保持向后兼容，继续按纯城市名处理
            }
        }

        if (!city) {
            return '缺少城市参数，无法查询天气。'
        }

        try {
            const geocodeResp = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`,
            )
            if (!geocodeResp.ok) {
                return `地理编码服务暂时不可用（${geocodeResp.status}），请稍后重试。`
            }

            const geocodeData = (await geocodeResp.json()) as {
                results?: Array<{ latitude: number; longitude: number; name: string }>
            }
            const location = geocodeData.results?.[0]
            if (!location) {
                return `未找到城市 ${city}，请尝试更具体的城市名。`
            }

            const weatherResp = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code&timezone=Asia%2FShanghai`,
            )
            if (!weatherResp.ok) {
                return `天气服务暂时不可用（${weatherResp.status}），请稍后重试。`
            }

            const weatherData = (await weatherResp.json()) as {
                current?: {
                    temperature_2m?: number
                    weather_code?: number
                }
            }

            const current = weatherData.current
            if (
                !current ||
                typeof current.temperature_2m !== 'number' ||
                typeof current.weather_code !== 'number'
            ) {
                return `天气服务未返回 ${city} 的有效数据，请稍后重试。`
            }

            const timeNote = timeFromInput ? `（查询时间：${timeFromInput}）` : ''
            const weatherText = weatherCodeToText(current.weather_code)
            return `${location.name}${timeNote} 当前天气：${weatherText}，温度 ${current.temperature_2m}°C`
        } catch {
            return `无法获取 ${city} 的天气，请检查城市名称是否正确。`
        }
    },
}
