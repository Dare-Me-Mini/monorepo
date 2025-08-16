import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { validateServerEnv } from '@/lib/env'

function parseSuggestionsFromText(rawText: string): string[] {
  let text = rawText.trim()
  // Strip code fences like ```json ... ``` or ``` ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim()
  }
  // Extract first JSON array substring
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  let candidates: string[] = []
  if (start !== -1 && end !== -1 && end > start) {
    const jsonSlice = text.slice(start, end + 1)
    try {
      const parsed = JSON.parse(jsonSlice)
      if (Array.isArray(parsed)) {
        candidates = parsed
      }
    } catch {
      // ignore, will try regex extraction below
    }
  }
  // If still empty, capture quoted strings
  if (candidates.length === 0) {
    const quoted: string[] = []
    const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      quoted.push(match[1])
    }
    if (quoted.length > 0) candidates = quoted
  }
  // Sanitize and normalize
  const cleaned = Array.from(new Set(
    candidates
      .map((s) => String(s))
      .map((s) => s.replace(/^[-*\s]+/, '').trim())
      .filter((s) => s.length > 0)
  ))
  // Ensure exactly 3 items
  if (cleaned.length >= 3) return cleaned.slice(0, 3)
  return cleaned
}

export async function POST(request: NextRequest) {
  let requestType: 'betName' | 'description' = 'betName'
  let currentText: string = ''
  let betName: string = ''
  const env = validateServerEnv();
  
  try {
    const body = await request.json()
    const { type, currentText: ct, betName: bn } = body
    if (type === 'betName' || type === 'description') requestType = type
    currentText = typeof ct === 'string' ? ct : ''
    betName = typeof bn === 'string' ? bn : ''
    
    if (!requestType || !['betName', 'description'].includes(requestType)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "betName" or "description"' },
        { status: 400 }
      )
    }

    const genAI = new GoogleGenerativeAI(env.geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    let prompt = ''
    
    if (requestType === 'betName') {
      if (currentText && currentText.trim()) {
        // Analyze existing text and suggest improvements
        prompt = `You are a sharp and creative assistant who helps users refine their bet ideas to be more fun and clear. The user has started typing a bet name: "${currentText.trim()}"

Based on their input, suggest 3 improved versions. The suggestions should make the bet more practical, simple, and engaging for a friendly challenge.

Follow these rules strictly:
- Build on the user's idea, don't replace it completely.
- Make the action obvious and measurable.
- Use simple, everyday language.
- Short phrase (3-6 words).
- No emojis or special characters.

Respond with EXACTLY and ONLY a raw JSON array of 3 strings. Do not include markdown, code fences, or any other text.
Example response for user input "who can run fastest":
["Fastest to Run One Mile", "First to Finish a 5k Run", "Who Can Run a Lap Faster"]`
      } else {
        // Suggest popular bet ideas
        prompt = `You are a witty and clever assistant specializing in fun, casual bets between friends. The user needs 3 simple, fun, and practical bet suggestions.

The suggestions should be common, real-world challenges friends would actually make. Think about everyday life, social media trends, fitness goals, or funny dares.

Here are some examples of what makes a good suggestion:
- **Good:** "First to reply to story", "Run a 5k this month", "No junk food for a week" (These are clear, actionable, and fun).
- **Bad:** "Metaphysical Quandary Contest", "Achieve Global Harmony", "Quantum Entanglement Race" (These are abstract, impossible, or too complex).

Please provide 3 bet name suggestions. Follow these rules strictly:
- Simple, everyday language. No jargon.
- Clear and direct action.
- Short phrase (3-6 words).
- No emojis or special characters.

Respond with EXACTLY and ONLY a raw JSON array of 3 strings. Do not include markdown, code fences, or any other text.
Example response format:
["First One to Text Back", "Who Can Cook Better", "Post an Old Photo"]`
      }
    } else if (requestType === 'description') {
      const betNameContext = betName && betName.trim() ? `for the bet "${betName.trim()}"` : ''
      
      if (currentText && currentText.trim()) {
        // Analyze existing description and suggest improvements
        prompt = `You are a helpful assistant who writes crystal-clear bet descriptions. The user has started typing a description ${betNameContext}: "${currentText.trim()}"

Help them finish by suggesting 3 complete, clear, and concise descriptions. The descriptions must define a clear win/loss condition.

Rules for descriptions:
- Be specific and unambiguous.
- Include measurable criteria (e.g., "by Friday at 5 PM", "post a video as proof").
- Keep it under 150 characters.
- Maintain a fun, friendly tone.

Respond with EXACTLY and ONLY a raw JSON array of 3 strings. Do not include markdown, code fences, or any other text.`
      } else {
        // Suggest descriptions based on bet name
        prompt = `You are a helpful assistant who writes crystal-clear bet descriptions. ${betNameContext ? `The bet name is "${betName.trim()}".` : 'The user needs a bet description.'}

Suggest 3 clear, detailed, and engaging descriptions that define a clear win/loss condition.

Rules for descriptions:
- Be specific and unambiguous.
- Include measurable criteria (e.g., "by Friday at 5 PM", "post a video as proof").
- Keep it under 150 characters.
- Maintain a fun, friendly tone.

Respond with EXACTLY and ONLY a raw JSON array of 3 strings. Do not include markdown, code fences, or any other text.
Example response for bet name "Workout Challenge":
["First to complete 5 workouts this week, tracked in an app.", "Whoever works out for the most hours by Sunday wins.", "Complete a 30-minute workout every day for 5 days."]`
      }
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse the AI response robustly and normalize to up to 3 strings
    let suggestions = parseSuggestionsFromText(text)
    if (suggestions.length < 3) {
      // Heuristic fill to reach 3 items without hard fallback
      const fillers = requestType === 'betName'
        ? [
            'First to Reply to Story',
            'Run a 5k This Month',
            'No Junk Food for a Week'
          ]
        : [
            'Complete the challenge within the specified time frame',
            'Provide photo/video proof of completion',
            'Meet the agreed criteria for success'
          ]
      for (const f of fillers) {
        if (suggestions.length >= 3) break
        if (!suggestions.includes(f)) suggestions.push(f)
      }
    }

    return NextResponse.json({ suggestions })

  } catch (error: any) {
    console.error('AI suggestion error:', error)
    
    // Return fallback suggestions on error
    const fallbackSuggestions = {
      betName: [
        'First to Reply to Story',
        'Run a 5k This Month',
        'No Junk Food for a Week'
      ],
      description: [
        'Complete the challenge within the specified time frame',
        'Provide photo/video proof of completion',
        'Meet the agreed criteria for success'
      ]
    }

    return NextResponse.json({ 
      suggestions: requestType === 'betName' ? fallbackSuggestions.betName : fallbackSuggestions.description
    })
  }
}
