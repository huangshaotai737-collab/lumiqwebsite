import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertLocal,validateTestBoundary,countFixtureBackups} from '../platform/local.mjs';
test('local fixture refuses remote, credentials-in-URL and lookalike endpoints before access',()=>{
 for(const API_URL of ['https://example.supabase.co','http://127.0.0.1.evil.test:54321','http://user@127.0.0.1:54321','http://127.0.0.1:5000'])assert.throws(()=>assertLocal({API_URL,ANON_KEY:'synthetic',SERVICE_ROLE_KEY:'synthetic'}));
});
test('repeat verification refuses preview even stopped, business rows, edited publication and incomplete backup',()=>{
 const empty={previewExists:false,records:0,publishedMatches:true,backups:0};assert.doesNotThrow(()=>validateTestBoundary(empty));
 for(const changed of [{previewExists:true},{records:1},{publishedMatches:false},{backups:1}])assert.throws(()=>validateTestBoundary({...empty,...changed}),/No automatic reset/);
});

test('C3 concurrency, C4 order and C6 privacy leftovers each close the fixture boundary',()=>{
 const clean={previewExists:false,records:0,publishedMatches:true};
 assert.doesNotThrow(()=>validateTestBoundary({...clean,backups:countFixtureBackups(['request_limits','customer_privacy_policy'])}));
 for(const backup of ['c3_saved_offerings','c3_browser_settings','c4_browser_publication','c6_browser_policy'])
  assert.throws(()=>validateTestBoundary({...clean,backups:countFixtureBackups(['customer_privacy_policy',backup])}),/Verification refused/);
});
