// These persisted values are the local data boundary, never caller-shell fallbacks.
export function previewEnvironment(settings,inherited={}) {
 const saved=settings?.env;
 if(saved?.SUPABASE_URL!=='http://127.0.0.1:54321'||saved?.NEXT_PUBLIC_SUPABASE_URL!==saved.SUPABASE_URL)throw Error('Preview requires matching persisted loopback SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL');
 return {...inherited,...saved};
}
