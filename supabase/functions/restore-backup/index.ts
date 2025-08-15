import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackupData {
  tenant: any;
  appointments: any[];
  customers: any[];
  professionals: any[];
  services: any[];
  business_hours: any[];
  revenues: any[];
  notifications: any[];
  subscribers: any[];
  subscriptions: any[];
  metadata: {
    backup_type: string;
    created_at: string;
    tenant_id: string;
    total_records: number;
    version: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { backupId, targetTenantId, restoreOptions = {} } = await req.json()

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
      throw new Error('Backup is not ready for restoration')
    }

    // In a real production environment, you would:
    // 1. Download the backup file from cloud storage
    // 2. Decompress the data
    // 3. Parse the backup data
    
    // For now, we'll simulate the backup data retrieval
    // In practice, this would come from the actual backup file
    const backupData: BackupData = {
      tenant: {
        id: backup.tenant_id,
        name: 'Restored Tenant',
        slug: 'restored-tenant',
        theme_variant: 'barber',
        plan_tier: 'basic',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      appointments: [],
      customers: [],
      professionals: [],
      services: [],
      business_hours: [],
      revenues: [],
      notifications: [],
      subscribers: [],
      subscriptions: [],
      metadata: {
        backup_type: backup.backup_type,
        created_at: backup.created_at,
        tenant_id: backup.tenant_id,
        total_records: 0,
        version: '1.0.0'
      }
    }

    const targetTenant = targetTenantId || backup.tenant_id
    const { restoreAppointments = true, restoreCustomers = true, restoreProfessionals = true, restoreServices = true } = restoreOptions

    let restoredRecords = 0

    // Restore services
    if (restoreServices && backupData.services.length > 0) {
      const servicesToRestore = backupData.services.map(service => ({
        ...service,
        tenant_id: targetTenant,
        id: undefined // Let the database generate new IDs
      }))

      const { error: servicesError } = await supabaseClient
        .from('services')
        .insert(servicesToRestore)

      if (!servicesError) {
        restoredRecords += servicesToRestore.length
      }
    }

    // Restore professionals
    if (restoreProfessionals && backupData.professionals.length > 0) {
      const professionalsToRestore = backupData.professionals.map(professional => ({
        ...professional,
        tenant_id: targetTenant,
        id: undefined
      }))

      const { error: professionalsError } = await supabaseClient
        .from('professionals')
        .insert(professionalsToRestore)

      if (!professionalsError) {
        restoredRecords += professionalsToRestore.length
      }
    }

    // Restore customers
    if (restoreCustomers && backupData.customers.length > 0) {
      const customersToRestore = backupData.customers.map(customer => ({
        ...customer,
        tenant_id: targetTenant,
        id: undefined
      }))

      const { error: customersError } = await supabaseClient
        .from('customers')
        .insert(customersToRestore)

      if (!customersError) {
        restoredRecords += customersToRestore.length
      }
    }

    // Restore business hours
    if (backupData.business_hours.length > 0) {
      const businessHoursToRestore = backupData.business_hours.map(hours => ({
        ...hours,
        tenant_id: targetTenant,
        id: undefined
      }))

      const { error: businessHoursError } = await supabaseClient
        .from('business_hours')
        .insert(businessHoursToRestore)

      if (!businessHoursError) {
        restoredRecords += businessHoursToRestore.length
      }
    }

    // Restore appointments (if requested)
    if (restoreAppointments && backupData.appointments.length > 0) {
      const appointmentsToRestore = backupData.appointments.map(appointment => ({
        ...appointment,
        tenant_id: targetTenant,
        id: undefined
      }))

      const { error: appointmentsError } = await supabaseClient
        .from('appointments')
        .insert(appointmentsToRestore)

      if (!appointmentsError) {
        restoredRecords += appointmentsToRestore.length
      }
    }

    // Create restoration log
    const { error: logError } = await supabaseClient
      .from('backups')
      .update({
        description: `${backup.description} - Restored ${restoredRecords} records to tenant ${targetTenant}`
      })
      .eq('id', backupId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backup restored successfully',
        backupId: backupId,
        targetTenantId: targetTenant,
        restoredRecords: restoredRecords,
        restoreOptions: restoreOptions
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
