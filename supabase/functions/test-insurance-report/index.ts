// Test function for insurance expiry report
// This allows manual testing of the insurance expiry report functionality

/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('Testing insurance expiry report...');

    // Call the actual insurance-expiry-report Edge Function
    const functionUrl = Deno.env.get('VITE_SUPABASE_URL') + '/functions/v1/insurance-expiry-report';
    const serviceRoleKey = Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY');

    if (!functionUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration for testing');
    }

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Test failed: ${JSON.stringify(result)}`);
    }

    console.log('Test completed successfully:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test completed successfully',
        testResult: result,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      }
    );

  } catch (error) {
    console.error('Test failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Insurance expiry report test failed'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      }
    );
  }
});

/* To test locally:
  1. Run `supabase start`
  2. Set up your environment variables
  3. Make an HTTP request:
  
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/test-insurance-report' \
    --header 'Authorization: Bearer your_supabase_anon_key' \
    --header 'Content-Type: application/json' \
    --data '{}'
*/