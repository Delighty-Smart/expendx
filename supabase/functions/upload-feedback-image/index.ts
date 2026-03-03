declare const Deno: any;
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')

    if (!file || !userId) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded or user ID missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create a Supabase client with the Admin key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Ensure the feedback_screenshots bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find((bucket: any) => bucket.name === 'feedback_screenshots')) {
      await supabase.storage.createBucket('feedback_screenshots', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      })
    }

    // Sanitize filename
    const fileName = file.name.replace(/[^\x00-\x7F]/g, '')
    const fileExt = fileName.split('.').pop()
    const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`

    const { data, error: uploadError } = await supabase.storage
      .from('feedback_screenshots')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error("Upload error:", JSON.stringify(uploadError))
      return new Response(
        JSON.stringify({ error: 'Failed to upload file', details: uploadError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from('feedback_screenshots')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry

    if (urlError) {
      console.error("URL creation error:", JSON.stringify(urlError))
      return new Response(
        JSON.stringify({ error: 'Failed to create signed URL', details: urlError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        message: 'File uploaded successfully',
        filePath,
        url: urlData.signedUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error("Unexpected error:", error.message)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
