import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previewEnvironment} from '../platform/preview-environment.mjs';
const local='http://127.0.0.1:54321';
test('missing saved waitlist endpoint cannot inherit an unrelated caller endpoint',()=>{
 assert.throws(()=>previewEnvironment({env:{NEXT_PUBLIC_SUPABASE_URL:local}},{SUPABASE_URL:'https://unrelated.invalid'}),/persisted loopback/);
});
test('both saved endpoints must match the owned local project',()=>{
 for(const endpoint of ['https://unrelated.invalid','http://127.0.0.1:54322'])assert.throws(()=>previewEnvironment({env:{SUPABASE_URL:endpoint,NEXT_PUBLIC_SUPABASE_URL:local}}),/persisted loopback/);
 assert.throws(()=>previewEnvironment({env:{SUPABASE_URL:local,NEXT_PUBLIC_SUPABASE_URL:'https://unrelated.invalid'}}),/persisted loopback/);
 assert.equal(previewEnvironment({env:{SUPABASE_URL:local,NEXT_PUBLIC_SUPABASE_URL:local}},{SUPABASE_URL:'https://unrelated.invalid'}).SUPABASE_URL,local);
});
