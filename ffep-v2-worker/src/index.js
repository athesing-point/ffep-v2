// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    // Handle address suggestions endpoint
    if (url.pathname === '/api/ffep/suggestions') {
      try {
        const query = url.searchParams.get('q');
        if (!query || query.length < 3) {
          return new Response(JSON.stringify({ suggestions: [] }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // Forward request to Smarty Streets API
        const smartyResponse = await fetch(
          \`https://us-autocomplete-pro.api.smartystreets.com/lookup?\${new URLSearchParams({
            'auth-id': env.SMARTY_KEY,
            'key': env.SMARTY_WEBSITE_KEY,
            'search': query,
            'source': 'all'
          })}\`
        );

        if (!smartyResponse.ok) {
          throw new Error('Smarty Streets API error');
        }

        const data = await smartyResponse.json();

        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    // Handle unknown endpoints
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }
}; 