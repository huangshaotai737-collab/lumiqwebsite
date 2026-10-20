import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '../generated/database';
export async function refreshSession(request: NextRequest, respond: (request: NextRequest) => NextResponse = (req) => NextResponse.next({request:req})) {
  let response = respond(request);
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const client = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
      cookieOptions: {name:'lumiq-website-auth',sameSite:'lax',path:'/',secure:process.env.APP_ORIGIN?.startsWith('https://') ?? false},
      cookies:{
        getAll:()=>request.cookies.getAll(),
        setAll(values) {
          values.forEach(({name,value})=>request.cookies.set(name,value));
          response = respond(request);
          values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
        },
      },
      global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})},
    });
    // getUser verifies with Auth and refreshes expired tokens; cookie data alone is never authority.
    await client.auth.getUser();
  }
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
