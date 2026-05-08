/**
 * readSSE — Async generator that yields parsed SSE data lines from a fetch Response.
 * @param {Response} response - A fetch Response with a readable body stream
 * @yields {string} Each non-empty data line from the SSE stream
 */
export async function* readSSE(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop()
    for (const block of blocks) {
      if (!block.trim()) continue
      let eventType = 'message'
      let eventData = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim()
        if (line.startsWith('data: ')) eventData += (eventData ? '\n' : '') + line.slice(6)
      }
      if (eventData !== '') yield { type: eventType, data: eventData }
    }
  }
}
