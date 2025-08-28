import { type NextRequest } from 'next/server'
import { getInfo } from '@/app/api/utils/common'
import { API_KEY, API_URL } from '@/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      inputs,
      files,
      response_mode = 'streaming',
    } = body
    const { user } = getInfo(request)

    // Prepare the request body for the Dify API
    const difyRequestBody = {
      inputs,
      files: files || [],
      user,
      response_mode,
    }

    // Make a direct fetch to the Dify API
    const difyResponse = await fetch(`${API_URL}/completion-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(difyRequestBody),
    })

    if (!difyResponse.ok) {
      console.error('Dify API error:', difyResponse.status, difyResponse.statusText)
      return new Response(JSON.stringify({
        error: 'Failed to connect to Dify API',
        status: difyResponse.status
      }), {
        status: difyResponse.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if the response is a stream
    if (difyResponse.body) {
      // Forward the streaming response with proper SSE headers
      return new Response(difyResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    } else {
      // Fallback for non-streaming response
      const data = await difyResponse.text()
      return new Response(data, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }
  } catch (error) {
    console.error('Error in completion messages API:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
