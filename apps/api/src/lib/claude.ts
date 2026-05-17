import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { config } from './config.js'

// ─── Auth ────────────────────────────────────────────────────────────────────
// Prefer BEDROCK_API_KEY (ABSK bearer token — no IAM/Marketplace needed).
// Fall back to IAM credentials if both are present or only IAM is configured.

function buildClient(): BedrockRuntimeClient | null {
  if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
    return new BedrockRuntimeClient({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    })
  }
  return null
}

const iamClient = buildClient()

// Bedrock API key bearer-token invocation (no AWS SDK signing needed)
async function invokeWithApiKey(body: object): Promise<unknown> {
  const region = config.AWS_REGION
  const modelId = config.BEDROCK_MODEL_ID
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${config.BEDROCK_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bedrock ${res.status}: ${text}`)
  }
  return res.json()
}

// Unified invoke — picks the right auth method automatically
async function invoke(body: object): Promise<{ content: Array<{ text: string }>; usage?: unknown }> {
  if (config.BEDROCK_API_KEY) {
    return invokeWithApiKey(body) as Promise<{ content: Array<{ text: string }>; usage?: unknown }>
  }

  if (!iamClient) {
    throw new Error('No Bedrock credentials configured — set BEDROCK_API_KEY or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY')
  }

  const command = new InvokeModelCommand({
    modelId: config.BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  })
  const response = await iamClient.send(command)
  return JSON.parse(new TextDecoder().decode(response.body))
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateInsight(prompt: string): Promise<string> {
  const body = await invoke({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })
  return body.content[0].text
}

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; [key: string]: unknown }>
}

export async function generateContent(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens = 8192,
): Promise<string> {
  const body = await invoke({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  })
  return body.content[0].text
}

export async function generateContentFromPdf(
  systemPrompt: string,
  pdfBase64: string,
  userText: string,
  maxTokens = 4096,
): Promise<string> {
  const body = await invoke({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
          },
          { type: 'text', text: userText },
        ],
      },
    ],
  })
  return body.content[0].text
}
