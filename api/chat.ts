import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, userKey, provider } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const groqKey = userKey || process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    let reply = '';

    // 1. Try Groq (Llama 3.3 70B - Ultra fast & conversational)
    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.6,
            max_tokens: 1000,
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          reply = data.choices?.[0]?.message?.content || '';
        } else {
          console.warn('Groq server error:', await groqRes.text());
        }
      } catch (groqErr) {
        console.warn('Groq fetch error:', groqErr);
      }
    }

    // 2. Fallback to Gemini if Groq did not reply
    if (!reply && geminiKey) {
      try {
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || 'Analyze my trading performance.';
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const combinedPrompt = `${systemMessage}\n\nUser Question: ${lastUserMessage}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: combinedPrompt }] }],
            }),
          }
        );

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          reply = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (geminiErr) {
        console.warn('Gemini fetch error:', geminiErr);
      }
    }

    if (!reply) {
      // 3. Fallback to Pollinations Free AI Text Router (100% free open-access, no keys needed)
      try {
        const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || 'Analyze my trading';
        const sysMsg = messages.find(m => m.role === 'system')?.content || '';
        
        const pollRes = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: sysMsg },
              ...messages.slice(-6).filter(m => m.role !== 'system'),
            ],
            model: 'openai',
            seed: 42,
          })
        });

        if (pollRes.ok) {
          const pollText = await pollRes.text();
          if (pollText && pollText.trim().length > 5) {
            reply = pollText.trim();
          }
        }
      } catch (pollErr) {
        console.warn('Free text router fallback error:', pollErr);
      }
    }

    if (!reply) {
      return res.status(500).json({
        error: 'No active LLM provider responded. Please click AI Keys at the top right to paste your free Groq API key.',
      });
    }

    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Internal Server Error',
    });
  }
}
