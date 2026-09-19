import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly apiKey?: string;
  private readonly model = 'nvidia/nemotron-3-super-120b-a12b:free';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
  }

  private async callAI(systemPrompt: string, userData: any, timeout = 15000) {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'failed to generate AI response due to internet connection',
      );
    }

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: JSON.stringify(userData),
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'DevPilot',
          },
          timeout,
        },
      );

      const content = String(
        response.data?.choices?.[0]?.message?.content ?? '{}',
      );

      return this.parseJsonResponse(content);
    } catch (error) {
      const errorMessage =
        axios.isAxiosError(error) && error.response?.data
          ? JSON.stringify(error.response.data)
          : error instanceof Error
            ? error.message
            : 'Unknown error';

      console.error('AI request failed:', errorMessage);

      throw new ServiceUnavailableException(
        'failed to generate AI response due to internet connection',
      );
    }
  }

  /**
   * Generates a complete project plan.
   */
  async generateProject(data: {
    name: string;
    goal: string;
    priority: string;
  }) {
    return this.callAI(
      `
You are DevPilot, an AI project planning assistant.

Generate a realistic software development project plan.

Return ONLY valid JSON.

{
  "description": "string",
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "difficulty": "EASY | MEDIUM | HARD | EPIC",
      "xpReward": number,
      "tasks": [
        {
          "title": "string",
          "description": "string",
          "priority": "LOW | MEDIUM | HIGH",
          "xpReward": number
        }
      ]
    }
  ]
}

Rules:
- Generate at least 3 milestones.
- Generate 2 to 5 tasks inside every milestone.
- Every milestone must have an XP reward.
- Every task must have an XP reward.
- EASY = 50-100 XP.
- MEDIUM = 100-200 XP.
- HARD = 200-400 XP.
- EPIC = 400-750 XP.
- Make tasks concrete and actionable.
-Each Task must be unique
      `.trim(),
      data,
    );
  }

  /**
   * Generates tasks for a project/milestone.
   */
  async generateTasks(data: any) {
    return this.callAI(
      `
You are DevPilot, an AI task planning assistant.

Generate concrete software development tasks from the supplied project or milestone.

Return ONLY valid JSON.

{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "priority": "LOW | MEDIUM | HIGH",
      "xpReward": number
    }
  ]
}

Rules:
- Generate 3 to 8 tasks.
- Tasks must be specific and actionable.
- Do not create vague tasks such as "work on backend".
- Assign XP based on complexity.
      `.trim(),
      data,
    );
  }

  /**
   * Generates code based on the user's request.
   */
  async generateCode(data: any) {
    return this.callAI(
      `
You are DevPilot, an expert software development assistant.

Generate production-quality code based on the user's request.

Return ONLY valid JSON.

{
  "language": "string",
  "filename": "string",
  "code": "string",
  "explanation": "string"
}

Rules:
- The "code" field must contain the actual code.
- Keep the code complete and runnable whenever possible.
- Do not put Markdown code fences inside the code field.
- Follow the language/framework requested by the user.
- Use the supplied workspace context to tailor generated code to the user's projects, technologies, and current work when relevant.
      `.trim(),
      data,
    );
  }

  /**
   * General AI assistant.
   */
  async assist(data: any) {
    return this.callAI(
      `
You are DevPilot, an AI coding assistant.

Help the user with software development questions, debugging,
architecture, implementation, and programming concepts.

Return ONLY valid JSON.

{
  "answer": "string",
  "tasks": [
    { "title": "string", "description": "string", "priority": "LOW|MEDIUM|HIGH" }
  ],
  "suggestions": [
    "string"
  ]
}

Rules:
- Give technically accurate answers.
- Keep suggestions actionable.
- When the user asks to create, break down, or list tasks, include those tasks in the 'tasks' array. Otherwise return an empty array.
- Do not invent APIs or libraries.
- Use the supplied workspace context when relevant. Prefer the user's actual project names, statuses, milestones, tasks, goals, and technologies over generic advice.
- If the workspace context is empty or insufficient, say what is missing and provide useful general guidance.
      `.trim(),
      data,
    );
  }

  /**
   * Safely parses JSON returned by the AI.
   */
  private parseJsonResponse(content: string) {
    if (!content || typeof content !== 'string') {
      throw new ServiceUnavailableException('failed to generate AI response');
    }

    // First attempt: direct JSON
    try {
      return JSON.parse(content);
    } catch {
      // Continue with cleanup
    }

    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      // Some providers wrap otherwise valid JSON in a short explanation.
      // Extract only an object/array candidate before giving up.
      const objectStart = cleaned.indexOf('{');
      const objectEnd = cleaned.lastIndexOf('}');
      const arrayStart = cleaned.indexOf('[');
      const arrayEnd = cleaned.lastIndexOf(']');
      const candidates = [
        objectStart >= 0 && objectEnd > objectStart
          ? cleaned.slice(objectStart, objectEnd + 1)
          : '',
        arrayStart >= 0 && arrayEnd > arrayStart
          ? cleaned.slice(arrayStart, arrayEnd + 1)
          : '',
      ].filter(Boolean);

      for (const candidate of candidates) {
        try {
          return JSON.parse(candidate);
        } catch {
          // Try the next candidate.
        }
      }

      console.error('AI returned invalid JSON:', content);

      throw new ServiceUnavailableException('failed to generate AI response');
    }
  }
}
