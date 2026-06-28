// src/lib/naming.ts
export const dbFieldMap = {
    // RxDB → PostgreSQL
    localPin: 'local_pin',
    householdId: 'household_id',
    invitedBy: 'invited_by',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    emailVerified: 'email_verified',
    audioUrl: 'audio_url',
    audioSize: 'audio_size',
    recordedAt: 'recorded_at',
    syncedToCloud: 'synced_to_cloud',
    // ... etc
  } as const;
  
  export const toSnakeCase = (obj: Record<string, any>) => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const dbKey = dbFieldMap[key as keyof typeof dbFieldMap] || key;
      result[dbKey] = value;
    }
    return result;
  };