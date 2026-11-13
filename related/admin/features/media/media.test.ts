import { execFileSync } from 'node:child_process';
const installedProbe = process.env.MEDIA_FFPROBE_PATH || execFileSync('which', ['ffprobe'], { encoding: 'utf8' }).trim();
import { describe, expect, it, vi } from 'vitest';
import { validateUpload, inspectMedia } from './validate';
vi.mock('server-only', () => ({}));
const profile = 'asset_012d3bf8af92d486';
describe('trusted media inspection', () => {
  it('disguised_html_is_rejected', async () => {
    await expect(inspectMedia(Buffer.from('<!doctype html><script>alert(1)</script>'), { fileName: 'x.jpg', size: 40, mime: 'image/jpeg', profile })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('rejects empty, over-limit, unknown profile, and unsupported advertised types', () => {
    for (const change of [{ size: 0 }, { size: 20 * 1024 * 1024 + 1 }, { profile: 'browser-profile' }, { profile: '__proto__' }, { profile: 'constructor' }, { mime: 'text/html' }])
      expect(() => validateUpload({ fileName: 'x.jpg', size: 100, mime: 'image/jpeg', profile, ...change }, 52428800)).toThrow();
  });
  it('advertises the lesser of host cap and application cap', () => {
    expect(validateUpload({ fileName: 'x.jpg', size: 100, mime: 'image/jpeg', profile }, 1024).maxBytes).toBe(1024);
    expect(() => validateUpload({ fileName: 'x.jpg', size: 1025, mime: 'image/jpeg', profile }, 1024)).toThrow();
  });
});

import { beforeEach } from 'vitest';
import { syntheticImage, syntheticVideo, syntheticJpeg, syntheticWebp } from './fixtures';
import { createUpload, completeUpload, listMediaOptions } from './service';
const deps = vi.hoisted(() => ({ staff: vi.fn(), rpc: vi.fn(), bucket: vi.fn(), sign: vi.fn(), info: vi.fn(), download: vi.fn() }));
vi.mock('@/lib/auth/require-staff', () => ({ requireStaff: deps.staff }));
vi.mock('@/lib/http/rate-limit', () => ({ enforceRateLimit: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ createClient: async () => ({ rpc: deps.rpc }) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ storage: { getBucket: deps.bucket, from: () => ({ createSignedUploadUrl: deps.sign, info: deps.info, download: deps.download }) } }) }));
beforeEach(() => {
  vi.resetAllMocks();
  process.env.MEDIA_FFPROBE_PATH = installedProbe;
  process.env.MEDIA_STORAGE_MAX_BYTES = '52428800';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic';
  deps.staff.mockResolvedValue({ userId: '70000000-0000-4000-8000-000000000001', role: 'editor' });
  deps.bucket.mockResolvedValue({ data: { public: false, file_size_limit: 52428800 }, error: null });
  deps.rpc.mockResolvedValue({ data: { assetId: '70000000-0000-4000-8000-000000000010', path: 'fixed-prefix/fixed-id', maxBytes: 20971520 }, error: null });
  deps.sign.mockResolvedValue({ data: { signedUrl: 'http://127.0.0.1:54321/signed' }, error: null });
});
describe('actual file metadata', () => {
  it('extracts real PNG dimensions and hash instead of browser claims', async () => {
    const actual = await inspectMedia(syntheticImage, { fileName: 'blue.png', size: syntheticImage.length, mime: 'image/png', profile });
    expect(actual).toMatchObject({ width: 64, height: 36, mime: 'image/png', size: syntheticImage.length, codec: 'png' }); expect(actual.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it('rejects advertised size/type disguises and short opening or background clips', async () => {
    for (const input of [{ fileName: 'blue.png', size: syntheticImage.length + 1, mime: 'image/png', profile }, { fileName: 'blue.jpg', size: syntheticImage.length, mime: 'image/jpeg', profile }])
      await expect(inspectMedia(syntheticImage, input)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    for (const usage of ['asset_a4b2063e90484449', 'asset_8335171d62b1df69'])
      await expect(inspectMedia(syntheticVideo, { fileName: 'red.mp4', size: syntheticVideo.length, mime: 'video/mp4', profile: usage })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('accepts an ordinary H264 film with matching source aspect', async () => {
    expect(await inspectMedia(syntheticVideo, { fileName: 'red.mp4', size: syntheticVideo.length, mime: 'video/mp4', profile: 'asset_3f0e57544d2610e7' })).toMatchObject({ codec: 'h264', width: 64, height: 36, duration: 0.5 });
  });
  it('fails closed when the explicit probe dependency is absent', async () => {
    delete process.env.MEDIA_FFPROBE_PATH;
    await expect(inspectMedia(syntheticImage, { fileName: 'blue.png', size: syntheticImage.length, mime: 'image/png', profile })).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });
  it('keeps every transparent variant and poster read only', () => {
    for (const usage of ['asset_a6510e681604d2f9','asset_6f36183e6da5cc73','asset_3a0fc68ee0629037','asset_57246e2797dd7da7'])
      expect(() => validateUpload({ fileName: 'x.png', size: 100, mime: 'image/png', profile: usage }, 52428800)).toThrow();
  });
});
describe('upload host boundary', () => {
  it('returns an accurate lower host cap and rejects bytes above it before creating a signed URL', async () => {
    process.env.MEDIA_STORAGE_MAX_BYTES = '1024';
    expect(await createUpload({ fileName: 'blue.png', size: 100, mime: 'image/png', profile })).toMatchObject({ ok: true, data: { maxBytes: 1024 } });
    expect(await createUpload({ fileName: 'blue.png', size: 1025, mime: 'image/png', profile })).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    expect(deps.sign).toHaveBeenCalledTimes(1);
  });
  it('fails closed without a confirmed host cap or if the bucket becomes public', async () => {
    delete process.env.MEDIA_STORAGE_MAX_BYTES;
    expect(await createUpload({ fileName: 'blue.png', size: 100, mime: 'image/png', profile })).toMatchObject({ ok: false, error: 'UNAVAILABLE' });
    process.env.MEDIA_STORAGE_MAX_BYTES = '52428800'; deps.bucket.mockResolvedValue({ data: { public: true, file_size_limit: 52428800 } });
    expect(await createUpload({ fileName: 'blue.png', size: 100, mime: 'image/png', profile })).toMatchObject({ ok: false, error: 'UNAVAILABLE' }); expect(deps.sign).not.toHaveBeenCalled();
  });
});

it('rejects actual object size before downloading a disguised large object', async () => {
  const id='70000000-0000-4000-8000-000000000010';
  deps.rpc.mockResolvedValue({data:[{id,created_by:'70000000-0000-4000-8000-000000000001',file_name:'x.png',advertised_size:100,mime:'image/png',usage_key:profile,original_path:'fixed/id',status:'pending'}],error:null});
  deps.info.mockResolvedValue({data:{size:50*1024*1024},error:null});
  deps.download.mockResolvedValue({data:new Blob(['wrong size']),error:null});
  expect(await completeUpload({assetId:id})).toMatchObject({ok:false,error:'INVALID_INPUT'});
  expect(deps.download).not.toHaveBeenCalled();
});

it('inspects actual JPEG and WebP containers with the restricted demuxers', async () => {
  for(const [bytes,mime,codec] of [[syntheticJpeg,'image/jpeg','mjpeg'],[syntheticWebp,'image/webp','webp']] as const)
    expect(await inspectMedia(bytes,{fileName:'synthetic',size:bytes.length,mime,profile})).toMatchObject({width:64,height:36,mime,codec});
});

import { createServer } from 'node:http';
it('never follows external MOV track references to HTTP during real probing', async () => {
  let requests = 0; const server = createServer((_request, response) => { requests++; response.end(syntheticVideo); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = (server.address() as {port:number}).port;
    const reference = Buffer.from(`http://127.0.0.1:${port}/external-track\0`);
    const position = syntheticVideo.indexOf(Buffer.from('url ')) - 4;
    expect(position).toBeGreaterThan(0);
    const previousSize = syntheticVideo.readUInt32BE(position); const replacement = Buffer.alloc(12 + reference.length);
    replacement.writeUInt32BE(replacement.length); replacement.write('url ',4); reference.copy(replacement,12); // flags=0: external, rather than self-contained
    const delta = replacement.length - previousSize;
    const bytes = Buffer.concat([syntheticVideo.subarray(0,position),replacement,syntheticVideo.subarray(position+previousSize)]);
    for(const box of ['moov','trak','mdia','minf','dinf','dref']) {
      const start=syntheticVideo.indexOf(Buffer.from(box))-4;bytes.writeUInt32BE(syntheticVideo.readUInt32BE(start)+delta,start);
    }
    const chunk=bytes.indexOf(Buffer.from('stco')); const count=bytes.readUInt32BE(chunk+8);
    for(let index=0;index<count;index++){const offset=chunk+12+index*4;bytes.writeUInt32BE(bytes.readUInt32BE(offset)+delta,offset);}
    try {
      expect(await inspectMedia(bytes,{fileName:'external.mp4',size:bytes.length,mime:'video/mp4',profile:'asset_3f0e57544d2610e7'})).toMatchObject({width:64,height:36,codec:'h264'});
    } catch(error) { expect(error).toMatchObject({code:'INVALID_INPUT'}); } // Rejection is also safe; missing probe dependency is not a pass.
    expect(requests).toBe(0);
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve())); }
});

describe('bounded media option queries',()=>{
  it('passes one usage, literal search and complete cursor to the protected RPC',async()=>{
    const cursor={createdAt:'2030-01-01T00:00:00.000Z',id:'80000000-0000-4000-8000-000000000010'};
    deps.rpc.mockResolvedValue({data:{items:[{id:cursor.id,fileName:'older-ready.png'}],nextCursor:null},error:null});
    expect(await listMediaOptions({usageKey:profile,q:'older',cursor})).toMatchObject({ok:true,data:{items:[{id:cursor.id}],nextCursor:null}});
    expect(deps.rpc).toHaveBeenCalledWith('list_media_options',{usage_key:profile,search:'older',after_created_at:cursor.createdAt,after_id:cursor.id});
    expect(deps.staff).toHaveBeenCalledWith(['admin','editor']);
  });
  it('rejects unknown usage, excessive search and malformed cursor before querying',async()=>{
    for(const input of [{usageKey:'__proto__',q:''},{usageKey:profile,q:'x'.repeat(101)},{usageKey:profile,q:'',cursor:{createdAt:'not-a-date',id:'80000000-0000-4000-8000-000000000010'}},{usageKey:profile,q:'',cursor:{createdAt:'2030-01-01',id:'bad'}}])
      expect(await listMediaOptions(input)).toMatchObject({ok:false,error:'INVALID_INPUT'});
    expect(deps.rpc).not.toHaveBeenCalled();
  });
});
