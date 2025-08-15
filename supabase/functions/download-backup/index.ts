import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { backupId } = await req.json()

    if (!backupId) {
      throw new Error('Missing backup ID')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get backup details
    const { data: backup, error: backupError } = await supabaseClient
      .from('backups')
      .select('*')
      .eq('id', backupId)
      .single()

    if (backupError || !backup) {
      throw new Error('Backup not found')
    }

    if (backup.status !== 'completed') {
      throw new Error('Backup is not ready for download')
    }

    // In a real production environment, you would:
    // 1. Retrieve the backup file from cloud storage
    // 2. Generate a signed URL for download
    // 3. Return the download URL with expiration
    
    // For now, we'll generate a mock download URL
    // In practice, this would be a real signed URL from your cloud storage
    const downloadUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/backups/${backup.file_path}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    // Update backup record to track downloads
    await supabaseClient
      .from('backups')
      .update({
        description: `${backup.description} - Downloaded at ${new Date().toISOString()}`
      })
      .eq('id', backupId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Download URL generated successfully',
        backupId: backupId,
        downloadUrl: downloadUrl,
        expiresAt: expiresAt,
        fileName: backup.file_path?.split('/').pop() || `backup_${backupId}.json`,
        fileSize: backup.file_size,
        backupType: backup.backup_type,
        createdAt: backup.created_at
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
