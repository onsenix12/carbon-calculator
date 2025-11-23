/**
 * Health check endpoint for Vercel deployment
 * Visit this in your browser to verify the deployment is working
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({
    status: 'ok',
    message: 'Proxy server is running',
    endpoint: '/api/categorize',
    method: 'POST',
    hasApiKey: !!process.env.CLAUDE_API_KEY
  });
}

