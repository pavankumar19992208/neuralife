import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Part } from '@google/generative-ai'
import { config } from './config.js'

let _client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set — add it to .env')
  if (!_client) _client = new GoogleGenerativeAI(config.GEMINI_API_KEY)
  return _client
}

export interface GeminiMessage {
  role: 'user' | 'assistant'
  content: string
}

// Strips "data:image/jpeg;base64," prefix if present
function stripDataUrlPrefix(s: string): string {
  return s.replace(/^data:image\/\w+;base64,/, '')
}

export async function generateContentGeminiWithImages(
  systemPrompt: string,
  images: string[],
  userText: string,
  maxTokens = 8192,
): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: config.GEMINI_MODEL_ID,
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  })

  const parts: Part[] = [
    ...images.map((img): Part => ({
      inlineData: {
        data: stripDataUrlPrefix(img),
        mimeType: 'image/jpeg',
      },
    })),
    { text: userText },
  ]

  try {
    const result = await model.generateContent(parts)
    return result.response.text()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const status = (err as Record<string, unknown>)?.status
    throw new Error(`Gemini vision (${config.GEMINI_MODEL_ID})${status ? ` [${status}]` : ''}: ${message}`)
  }
}

export async function generateContentGemini(
  systemPrompt: string,
  messages: GeminiMessage[],
  maxTokens = 8192,
): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: config.GEMINI_MODEL_ID,
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  })

  try {
    // All content-studio calls are single-turn (one user message)
    if (messages.length === 1 && messages[0].role === 'user') {
      const result = await model.generateContent(messages[0].content)
      return result.response.text()
    }

    // Multi-turn (chat): convert history, send last message
    const history = messages.slice(0, -1).map((m) => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
      parts: [{ text: m.content }],
    }))
    const last = messages[messages.length - 1]
    const chat = model.startChat({ history })
    const result = await chat.sendMessage(last.content)
    return result.response.text()
  } catch (err) {
    // Gemini SDK errors have non-enumerable properties — re-throw as plain Error
    // so Pino/Fastify can serialize them
    const message = err instanceof Error ? err.message : String(err)
    const status = (err as Record<string, unknown>)?.status
    const details = (err as Record<string, unknown>)?.errorDetails
    const wrapped = new Error(
      `Gemini (${config.GEMINI_MODEL_ID})${status ? ` [${status}]` : ''}: ${message}`,
    )
    if (details) (wrapped as unknown as Record<string, unknown>).details = details
    throw wrapped
  }
}
