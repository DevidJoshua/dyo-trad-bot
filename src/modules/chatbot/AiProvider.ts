import { logger } from '../../common/utils/logger';

export interface AiProvider {
  chat(messages: { role: string; content: string }[], systemPrompt: string): Promise<string>;
}

export class OpenAiProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${err}`);
    }

      const data: any = await res.json();
      return data.choices[0].message.content;
  }
}

export class AnthropicProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-haiku-20240307') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
    const body = {
      model: this.model,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      max_tokens: 1024,
    };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error: ${res.status} ${err}`);
    }

      const data: any = await res.json();
      return data.content[0].text;
  }
}

export class GeminiProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${res.status} ${err}`);
    }

    const data: any = await res.json();
    return data.candidates[0].content.parts[0].text;
  }
}

export class OllamaProvider implements AiProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chat(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: false,
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama API error: ${res.status} ${err}`);
    }

    const data: any = await res.json();
    return data.message.content;
  }
}

export class CustomProvider implements AiProvider {
  private endpoint: string;
  private apiKey: string;
  private model: string;

  constructor(endpoint: string, apiKey: string, model: string) {
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
    const url = this.endpoint.includes('/chat/completions')
      ? this.endpoint
      : `${this.endpoint}/v1/chat/completions`;

    const body = {
      model: this.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Custom API error (${res.status}): ${err}`);
    }

    const data: any = await res.json();

    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    if (data.message?.content) {
      return data.message.content;
    }
    if (data.response) {
      return data.response;
    }
    return JSON.stringify(data);
  }
}

export function createProvider(provider: string, apiKey: string, model: string, baseUrl?: string): AiProvider {
  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAiProvider(apiKey, model);
    case 'anthropic':
      return new AnthropicProvider(apiKey, model);
    case 'gemini':
      return new GeminiProvider(apiKey, model);
    case 'ollama':
      return new OllamaProvider(baseUrl, model);
    case 'custom':
      if (!baseUrl) throw new Error('API endpoint is required for custom provider');
      return new CustomProvider(baseUrl, apiKey, model);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
