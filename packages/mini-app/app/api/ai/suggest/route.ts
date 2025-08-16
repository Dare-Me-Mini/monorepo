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
        prompt = `You are a creative bet name generator. The user has started typing a bet name: "${currentText.trim()}"

Please suggest 3 creative, fun, and engaging bet names based on what they've started typing. The bet names should be:
- Use simple, everyday English
- Be crystal clear; avoid puns, wordplay, or jargon
- One short phrase (3–5 words), 10–40 characters
- No emojis; no punctuation except spaces
- Make the action obvious
- Suitable for friendly betting between friends

Respond with EXACTLY and ONLY a raw JSON array with exactly 3 plain strings. No code fences, no markdown, no language tags, no explanations, no trailing text. Your entire response must look like:
["Bet Name 1", "Bet Name 2", "Bet Name 3"]`
      } else {
        // Suggest popular bet ideas
        prompt = `You are a creative bet name generator. The user wants suggestions for fun bet names between friends.

Please suggest 3 popular, creative, and engaging bet names that friends commonly make. The bet names should be:
- Use simple, everyday English
- Be crystal clear; avoid puns, wordplay, or jargon
- One short phrase (3–5 words), 10–40 characters
- No emojis; no punctuation except spaces
- Make the action obvious
- Suitable for friendly betting between friends
- Cover different types of activities (sports, personal challenges, predictions, etc.)

Respond with EXACTLY and ONLY a raw JSON array with exactly 3 plain strings. No code fences, no markdown, no language tags, no explanations, no trailing text. Your entire response must look like:
["Bet Name 1", "Bet Name 2", "Bet Name 3"]`
      }
    } else if (requestType === 'description') {
      const betNameContext = betName && betName.trim() ? `for the bet "${betName.trim()}"` : ''
      
      if (currentText && currentText.trim()) {
        // Analyze existing description and suggest improvements
        prompt = `You are a helpful assistant that creates clear bet descriptions. The user has started typing a description ${betNameContext}: "${currentText.trim()}"

Please suggest 3 improved, clear, and detailed descriptions based on what they've started typing. The descriptions should be:
- Clear and specific about the challenge
- Include measurable criteria when possible
- Be engaging and fun
- Under 200 characters each
- Make it clear what constitutes winning/losing

Respond with EXACTLY and ONLY a raw JSON array with exactly 3 plain strings. No code fences, no markdown, no language tags, no explanations, no trailing text. Your entire response must look like:
["Description 1", "Description 2", "Description 3"]`
      } else {
        // Suggest descriptions based on bet name
        prompt = `You are a helpful assistant that creates clear bet descriptions. ${betNameContext ? `The bet name is "${betName.trim()}".` : 'The user needs a bet description.'}

Please suggest 3 clear, detailed, and engaging descriptions ${betNameContext}. The descriptions should be:
- Clear and specific about the challenge
- Include measurable criteria when possible
- Be engaging and fun
- Under 200 characters each
- Make it clear what constitutes winning/losing

Respond with EXACTLY and ONLY a raw JSON array with exactly 3 plain strings. No code fences, no markdown, no language tags, no explanations, no trailing text. Your entire response must look like:
["Description 1", "Description 2", "Description 3"]`
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
            'Winner Takes All',
            'Double or Nothing',
            'Final Showdown'
          ]
        : [
            'Finish within the agreed timeframe',
            'Share proof to verify completion',
            'Meet the success criteria clearly'
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
        'Jump into the Pool',
        'Run 5 Miles This Week', 
        'Learn a New Skill'
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
