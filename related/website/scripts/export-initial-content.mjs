/** One-way seed export from code. Never exports over a published/draft CMS version.
 * B4 must retain source locators/field IDs when replacing literals with adapters.
 * Run from any cwd; --check is read-only and detects stale generated artifacts.
 */
import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { parse } from '@formatjs/icu-messageformat-parser';

const app = fileURLToPath(new URL('../', import.meta.url));
const root = path.resolve(app, '../..');
const check = process.argv.includes('--check');
const locales = ['en', 'zh-hant', 'ja'];
const pages = ['/', '/products', '/products/ola', '/products/ola-go', '/products/tablet', '/products/print', '/products/nest', '/story', '/about', '/contact', '/plans', '/prelaunch', '/members', '/faq', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/child-safety'];
const globalPages = ['global/navigation', 'global/footer', 'global/metadata'];
const text = file => readFile(path.join(app, file), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 16);
const json = value => JSON.stringify(value, null, 2) + '\n';
function execute(source, context = {}) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, ...context }, { timeout: 1000 });
  return exports;
}
const { icuSignature } = execute(await readFile(path.join(root, 'contracts/content-icu.ts'), 'utf8'));
const signature = value => icuSignature(parse(value, { captureLocation: false }));
const productSource = await text('lib/products.ts');
const { PRODUCT_CATALOG, PRODUCT_BY_ID } = execute(productSource);
const planSource = await text('components/PlansContent.tsx');
const planAst = ts.createSourceFile('PlansContent.tsx', planSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const wanted = ['hardware', 'tabletCols', 'tabletRows', 'palCols', 'palRows'];
const declarations = [];
function constants(node) {
  if (ts.isVariableDeclaration(node) && wanted.includes(node.name.getText(planAst))) declarations.push(`export const ${node.name.getText(planAst)} = ${node.initializer.getText(planAst)};`);
  ts.forEachChild(node, constants);
}
constants(planAst);
const planData = execute(declarations.join('\n'), { PRODUCT_BY_ID });
const messages = Object.fromEntries(await Promise.all(locales.map(async locale => [locale, JSON.parse(await text(`messages/${locale}.json`))])));
const metadata = await text('lib/metadata.ts');
const siteUrl = metadata.match(/SITE_URL\s*=\s*"([^"]+)"/)[1];
const contact = await text('app/contact/page.tsx');
const supportEmail = contact.match(/label:\s*t\("support"\),\s*email:\s*"([^"]+)"/)[1];
const snapshot = {
  schemaVersion: 1,
  messages,
  products: Object.fromEntries(PRODUCT_CATALOG.map(product => [product.id, product])),
  media: {},
  plans: [['tablet', 'tablet'], ['ola', 'pal']].map(([group, prefix]) => ({ group, tiers: planData[`${prefix}Cols`], rows: planData[`${prefix}Rows`].map(row => ({ id: row.label, labelKey: `Plans.${row.label}`, values: row.values })) })),
  settings: { siteUrl, supportEmail, contactText: Object.fromEntries(locales.map(locale => [locale, messages[locale].Contact.intro])) },
};

const sources = new Map();
async function resolveImport(file, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/') ? specifier.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
  // Auth/config/request adapters are code, not public display content.
  if (/^(lib\/(auth|generated|content|http)|features|i18n\/request)/.test(base)) return null;
  for (const suffix of ['', '.tsx', '.ts', '.css', '/index.tsx', '/index.ts']) {
    const candidate = base + suffix;
    if (!/\.(tsx?|css)$/.test(candidate)) continue;
    try { await access(path.join(app, candidate)); return candidate; } catch { /* next candidate */ }
  }
  return null;
}
async function visit(file, page, seen = new Set()) {
  if (seen.has(file)) return;
  seen.add(file);
  let source = sources.get(file);
  if (!source) {
    const content = await text(file);
    source = { file, content, pages: new Set(), ast: ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS) };
    sources.set(file, source);
  }
  source.pages.add(page);
  for (const statement of source.ast.statements) {
    if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      const resolved = await resolveImport(file, statement.moduleSpecifier.text);
      if (resolved) await visit(resolved, page, seen);
    }
  }
}
for (const page of pages) {
  await visit(`app/[locale]${page === '/' ? '' : page}/page.tsx`, page);
  await visit('app/layout.tsx', page);
}
await visit('components/SiteHeader.tsx', globalPages[0]);
await visit('components/SiteFooter.tsx', globalPages[1]);
await visit('lib/metadata.ts', globalPages[2]);

const sourceFields = new Map();
const cartData = execute(await text('lib/cart-messages.ts'));
const cartTemplates = {
  en: { unpriced: '{count} selection{count, plural, =1 {} other {s}} without a standalone published price {count, plural, =1 {is} other {are}} excluded.', countLabel: '{count} item{count, plural, =1 {} other {s}}', added: '{name} added to your cart' },
  'zh-hant': { unpriced: '另有 {count} 件未公布單獨售價的選品，不計入合計。', countLabel: '{count} 件選品', added: '已將 {name} 加入購物車' },
  ja: { unpriced: '単体価格が未公開の {count} 点は合計に含まれていません。', countLabel: '{count} 点', added: '{name} をカートに追加しました' },
};
const exclusions = [{ source: { file: 'lib/metadata.ts', locator: 'SITE_URL' }, canonical: 'settings.siteUrl', reason: 'Public canonical-site URL comes from the sole snapshot settings source; never use it as auth/media authorization' }];
const mediaSources = new Map();
const allAssets = [];
async function assetFiles(directory, prefix = '/assets') {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.isDirectory()) await assetFiles(path.join(directory, entry.name), `${prefix}/${entry.name}`);
    else if (/\.(png|jpe?g|webp|avif|svg|gif|mp4|webm|mov)$/i.test(entry.name)) allAssets.push(`${prefix}/${entry.name}`);
  }
}
await assetFiles(path.join(app, 'public/assets'));
const displayProperties = new Set(['name', 'shortName', 'category', 'summary', 'title', 'subtitle', 'label', 'text', 'body', 'description', 'quote', 'eyebrow', 'kicker', 'email', 'tag', 'badge', 'unit', 'value', 'caption', 'alt', 'headline', 'detail', 'heading', 'cta', 'stat', 'number', 'default', 'siteName']);
const displayAttributes = new Set(['alt', 'title', 'placeholder', 'aria-label', 'label', 'eyebrow', 'quote']);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function locator(node, ast) {
  const parts = [];
  let current = node;
  while (current && current !== ast) {
    const parent = current.parent;
    if (ts.isVariableDeclaration(current)) parts.push(`var:${current.name.getText(ast)}`);
    else if (ts.isPropertyAssignment(current)) parts.push(`prop:${current.name.getText(ast)}`);
    else if (ts.isJsxAttribute(current)) parts.push(`attr:${current.name.getText(ast)}`);
    else if (parent) parts.push(`${ts.SyntaxKind[current.kind]}:${(() => { const children = []; ts.forEachChild(parent, child => { children.push(child); }); return children.indexOf(current); })()}`);
    current = parent;
  }
  return parts.reverse().join('/');
}
function mediaAltUse(node, ast, content) {
  if (!node) return { originalAlt: '', altExpression: '' };
  let ancestor = node.parent;
  while (ancestor && !ts.isJsxOpeningElement(ancestor) && !ts.isJsxSelfClosingElement(ancestor) && !ts.isObjectLiteralExpression(ancestor) && !ts.isStatement(ancestor)) ancestor = ancestor.parent;
  if (ancestor && (ts.isJsxOpeningElement(ancestor) || ts.isJsxSelfClosingElement(ancestor))) {
    const alt = ancestor.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(ast) === 'alt');
    if (alt?.initializer) return { originalAlt: ts.isStringLiteral(alt.initializer) ? alt.initializer.text : '', altExpression: alt.initializer.getText(ast) };
  }
  if (ancestor && ts.isObjectLiteralExpression(ancestor)) {
    const alt = ancestor.properties.find(property => ts.isPropertyAssignment(property) && property.name.getText(ast) === 'alt');
    if (alt) {
      const expression = alt.initializer.getText(ast);
      const key = expression.match(/^t\([\"']([^\"']+)[\"']\)$/)?.[1];
      const namespace = content.match(/(?:useTranslations|getTranslations)\([\"']([^\"']+)[\"']\)/)?.[1];
      return { originalAlt: ts.isStringLiteral(alt.initializer) ? alt.initializer.text : '', altExpression: expression, ...(key && namespace ? { altMessagePath: `messages.{locale}.${namespace}.${key}` } : {}) };
    }
  }
  return { originalAlt: '', altExpression: '' };
}
function displayPurpose(node, ast) {
  if (ts.isPropertyAssignment(node.parent)) {
    let parent = node.parent;
    while (parent && !ts.isVariableDeclaration(parent)) parent = parent.parent;
    const property = node.parent.name.getText(ast).replace(/[\"']/g, '');
    return parent?.name.getText(ast) === 'metadata' ? `seo${property}` : property;
  }
  if (ts.isJsxAttribute(node.parent)) return node.parent.name.getText(ast);
  let parent = node.parent;
  while (parent && !ts.isJsxElement(parent) && !ts.isStatement(parent)) parent = parent.parent;
  if (parent && ts.isJsxElement(parent)) {
    const tag = parent.openingElement.tagName.getText(ast);
    if (/^(Heading|h[1-6])$/.test(tag)) return 'title';
    if (/^(a|button|label|summary)$/.test(tag)) return 'label';
  }
  return 'text';
}
function addMedia(url, source, node, expression) {
  if (!/\.(png|jpe?g|webp|avif|svg|gif|mp4|webm|mov)$/i.test(url)) return;
  const id = `asset_${hash(url)}`;
  const list = mediaSources.get(id) ?? [];
  const altUse = mediaAltUse(node, source.ast, source.content);
  const { originalAlt } = altUse;
  list.push({ file: source.file, locator: node ? locator(node, source.ast) : `css:url:${hash(url)}`, expression, ...altUse, pages: [...source.pages].sort() });
  mediaSources.set(id, list);
  snapshot.media[id] = { assetId: null, url, alt: originalAlt || snapshot.media[id]?.alt || '', kind: /\.(mp4|webm|mov)$/i.test(url) ? 'video' : 'image', profile: /background|flow|halo|crystal/.test(url) ? 'background' : /film|video|character/.test(url) ? 'film' : 'public-content' };
}
for (const source of [...sources.values()].sort((a, b) => a.file.localeCompare(b.file, 'en'))) {
  const { ast, file, content } = source;
  const literals = new Set();
  const gather = node => { if (ts.isStringLiteralLike(node)) literals.add(node.text); ts.forEachChild(node, gather); };
  gather(ast);
  // Dynamic URL segments are matched against actual asset files and source literal values.
  const collect = node => {
    if (ts.isStringLiteralLike(node) && node.text.startsWith('/assets/')) addMedia(node.text, source, node, node.getText(ast));
    if (ts.isTemplateExpression(node) && node.head.text.startsWith('/assets/')) {
      const parts = [node.head.text, ...node.templateSpans.map(span => span.literal.text)];
      const pattern = new RegExp(`^${parts.map(escape).join('(.*?)')}$`);
      for (const url of allAssets) {
        const match = url.match(pattern);
        if (!match) continue;
        // A segment may be passed from the parent (film names); source graph literals resolve it.
        const known = new Set([...literals, ...[...sources.values()].filter(item => [...item.pages].some(page => source.pages.has(page))).flatMap(item => [...item.content.matchAll(/["']([^"'\n]+)["']/g)].map(match => match[1]))]);
        if (match.slice(1).every(part => known.has(part) || part === '-safari.mov' || part === '.webm')) addMedia(url, source, node, node.getText(ast));
      }
    }
    if (ts.isStringLiteral(node) && node.text.startsWith('mailto:')) {
      const email = node.text.slice('mailto:'.length);
      const match = [...sourceFields].find(([, field]) => field.value === email);
      const canonical = email === supportEmail ? 'settings.supportEmail' : match ? `messages.{locale}.CmsStatic.${match[0]}` : null;
      if (canonical) exclusions.push({ source: { file, locator: locator(node, ast) }, value: node.text, canonical, transform: 'mailto', reason: 'B4 derives the mailto href from its canonical contact address so text and destination stay consistent' });
    }
    // SiteHeader renders languages[].code as text; locale remains a routing identity.
    // Scope this exception to that exact binding rather than importing arbitrary code properties.
    const navigationLanguageCode = ts.isStringLiteral(node) && file === 'components/SiteHeader.tsx' && ts.isPropertyAssignment(node.parent) && node.parent.name.getText(ast) === 'code' && ts.isObjectLiteralExpression(node.parent.parent) && ts.isArrayLiteralExpression(node.parent.parent.parent) && ts.isVariableDeclaration(node.parent.parent.parent.parent) && node.parent.parent.parent.parent.name.getText(ast) === 'languages';
    let value;
    if (ts.isJsxText(node)) value = node.text.split(/\r?\n/).map((line, index, lines) => (index ? line.trimStart() : line).replace(index === lines.length - 1 ? /$^/ : /\s+$/, '')).filter(Boolean).join(' ');
    else if (ts.isStringLiteral(node)) {
      const parent = node.parent;
      if (navigationLanguageCode) value = node.text;
      else if (ts.isJsxAttribute(parent) && displayAttributes.has(parent.name.getText(ast))) value = node.text;
      else if (ts.isPropertyAssignment(parent) && displayProperties.has(parent.name.getText(ast).replace(/["']/g, ''))) value = node.text;
      else if (ts.isJsxExpression(parent)) value = node.text;
      else if (ts.isConditionalExpression(parent)) {
        let ancestor = parent.parent;
        while (ancestor && !ts.isJsxAttribute(ancestor) && !ts.isJsxExpression(ancestor) && !ts.isStatement(ancestor)) ancestor = ancestor.parent;
        if (ancestor && (ts.isJsxExpression(ancestor) && !ts.isJsxAttribute(ancestor.parent) || ts.isJsxAttribute(ancestor) && displayAttributes.has(ancestor.name.getText(ast)) || ts.isJsxExpression(ancestor) && ts.isJsxAttribute(ancestor.parent) && displayAttributes.has(ancestor.parent.name.getText(ast)))) value = node.text;
      }
      else if (ts.isArrayLiteralExpression(parent) && parent.parent && ts.isVariableDeclaration(parent.parent) && parent.parent.name.getText(ast) === 'years') value = node.text;
    }
    let translatedKey = false;
    let scope = node.parent;
    let previewOnly = false;
    while (scope && scope !== ast) {
      if (ts.isCallExpression(scope) && /^t(?:\.|$)/.test(scope.expression.getText(ast))) translatedKey = true;
      if (ts.isFunctionDeclaration(scope) && scope.name?.text === 'GlassPreview' || ts.isVariableDeclaration(scope) && scope.name.getText(ast) === 'demoProducts') previewOnly = true;
      scope = scope.parent;
    }
    if (value?.trim() && previewOnly) exclusions.push({ source: { file, locator: locator(node, ast) }, value, reason: 'Glass preview/demo defaults are outside the approved public route scope; public GlassCanvas receives the actual product catalogue' });
    if (value?.trim() && !value.startsWith('/assets/') && file !== 'lib/cart-messages.ts' && !translatedKey && !previewOnly) {
      const sourceLocator = locator(node, ast);
      // These already have a canonical public slot; do not create a second writable copy.
      const productMatch = PRODUCT_CATALOG.flatMap(product => ['name', 'shortName', 'category', 'summary'].map(key => ({ value: product[key], path: `products.${product.id}.${key}` }))).find(item => item.value === value);
      let mediaCanonical;
      if (ts.isJsxAttribute(node.parent) && node.parent.name.getText(ast) === 'alt') {
        const element = node.parent.parent.parent;
        if (ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element)) {
          const src = element.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(ast) === 'src');
          if (src?.initializer && ts.isStringLiteral(src.initializer)) {
            const id = `asset_${hash(src.initializer.text)}`;
            if (snapshot.media[id]?.alt === value) mediaCanonical = `media.${id}.alt`;
          }
        }
      }
      const emailMatch = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? [...sourceFields].find(([, field]) => field.value === value) : null;
      const canonical = mediaCanonical ?? (emailMatch ? `messages.{locale}.CmsStatic.${emailMatch[0]}` : null) ?? (file === 'lib/products.ts' ? 'products' : file === 'components/PlansContent.tsx' ? 'plans' : value === supportEmail ? 'settings.supportEmail' : productMatch?.path ?? null);
      if (canonical) exclusions.push({ source: { file, locator: sourceLocator }, value, canonical, reason: 'Already represented by the canonical snapshot field' });
      else {
        const id = `field_${hash(`${file}:${sourceLocator}`)}`;
        sourceFields.set(id, { value, purpose: navigationLanguageCode ? 'label' : displayPurpose(node, ast), source: { file, locator: sourceLocator }, pages: [...source.pages].sort() });
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(ast);
  for (const match of content.matchAll(/url\(["']?(\/assets\/[^\s"'()`{}]+\.(?:png|jpe?g|webp|avif|svg|gif|mp4|webm|mov))/gi)) addMedia(match[1], source, null, match[0]);
  // Existing concatenated home artwork maps use path fragments rather than full URLs.
  for (const literal of literals) {
    if (/^(?:home-|western-|chapter-)[\w/-]+$/.test(literal)) {
      for (const suffix of ['.webp', '.png', '.jpg', '.mp4']) if (allAssets.includes(`/assets/${literal}${suffix}`)) addMedia(`/assets/${literal}${suffix}`, source, null, literal);
    }
  }
}
for (const key of Object.keys(cartData.getCartMessages('en'))) {
  const id = `cart_${key}`;
  sourceFields.set(id, { value: '', purpose: key, localized: Object.fromEntries(locales.map(locale => [locale, typeof cartData.getCartMessages(locale)[key] === 'string' ? cartData.getCartMessages(locale)[key] : cartTemplates[locale][key]])), source: { file: 'lib/cart-messages.ts', locator: `cartMessages.${key}` }, pages: [...pages, 'global/navigation'] });
}
for (const locale of locales) {
  if ('CmsStatic' in messages[locale]) throw new Error('Reserved CmsStatic namespace is already in source messages');
  messages[locale].CmsStatic = Object.fromEntries([...sourceFields].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([id, field]) => [id, field.localized?.[locale] ?? field.value]));
}
snapshot.media = Object.fromEntries(Object.entries(snapshot.media).sort(([a], [b]) => a.localeCompare(b, 'en')));

const namespacePages = { Common: ['global/navigation'], Pal: ['/products/ola'], Book: ['/products/print'], HomePlans: ['/'], Nav: ['global/navigation'], Footer: ['global/footer'], Metadata: ['global/metadata'], Home: ['/'], HomeRefresh: ['/'], HomeFilms: ['/'], Story: ['/story'], About: ['/about'], Contact: ['/contact'], Plans: ['/plans'], Prelaunch: ['/prelaunch'], Members: ['/members'], FAQ: ['/faq'], Faq: ['/faq'], Legal: pages.filter(page => page.startsWith('/legal/')), Ola: ['/products/ola'], OlaGo: ['/products/ola-go'], Tablet: ['/products/tablet'], Print: ['/products/print'], Nest: ['/products/nest'], Products: ['/products'] };
const fields = [];
const settingAliases = Object.fromEntries(locales.map(locale => [`messages.${locale}.Contact.intro`, `settings.contactText.${locale}`]));
function limit(path, value) {
  const seo = /\.Metadata\.[^.]+\.(title|description)$/.test(path);
  const staticPurpose = path.includes('.CmsStatic.') ? sourceFields.get(path.split('.').at(-1))?.purpose : '';
  const max = /^seo/i.test(staticPurpose) ? (/description/i.test(staticPurpose) ? 320 : 120) : /title|name|label|default|siteName/i.test(staticPurpose) ? 80 : seo ? (path.endsWith('.title') ? 120 : 320) : /(?:title|heading|name|eyebrow|kicker|label|button|cta|tag|badge)(?:\.|$)/i.test(path) ? 80 : 2000;
  return Math.max(max, value.length);
}
function inventory(value, fieldPath = '') {
  if (!fieldPath) { for (const [key, child] of Object.entries(value)) inventory(child, key); return; }
  const segments = fieldPath.split('.');
  const type = segments[0] === 'media' && segments[2] === 'assetId' ? 'assetId' : Array.isArray(value) ? 'array' : value !== null && typeof value === 'object' ? 'object' : typeof value;
  let fieldPages = pages;
  let source;
  if (segments[0] === 'messages') {
    const staticField = segments[2] === 'CmsStatic' && sourceFields.get(segments[3]);
    if (staticField) { fieldPages = staticField.pages; source = staticField.source; }
    else fieldPages = namespacePages[segments[2]] ?? pages;
  } else if (segments[0] === 'products') fieldPages = ['/products', `/products/${segments[1]}`, '/plans', 'global/footer', '/'];
  else if (segments[0] === 'plans') fieldPages = ['/plans'];
  else if (segments[0] === 'media' && segments.length > 1) { const usages = mediaSources.get(segments[1]) ?? []; fieldPages = [...new Set(usages.flatMap(usage => usage.pages))].sort(); source = usages[0]; }
  else if (segments[0] === 'settings') fieldPages = ['/contact', '/prelaunch', 'global/metadata'];
  const fixed = fieldPath === 'schemaVersion' || /^products\.[^.]+\.(id|href|legacyHrefs)(\.|$)/.test(fieldPath) || /^products\.ola-go\.price\.(kind|includedWith)$/.test(fieldPath) || /^plans\.\d+\.(group|rows\.\d+\.(id|labelKey))$/.test(fieldPath) || /^media\.[^.]+\.(kind|profile)$/.test(fieldPath);
  let icu = null;
  if (typeof value === 'string' && segments[0] === 'messages') {
    // CmsStatic strings were literal JSX text and may contain braces/apostrophes;
    // retain exact originals and validate as plain text (B4 uses direct text adapters).
    icu = segments[2] === 'CmsStatic' && !segments[3]?.startsWith('cart_') ? null : signature(value);
  }
  // Canonical settings inherit the ICU consumer's signature before aliases are derived.
  // Otherwise successful validation could emit an alias rejected on the next parse.
  if (/^settings\.contactText\.(en|zh-hant|ja)$/.test(fieldPath)) icu = signature(messages[segments[2]].Contact.intro);
  fields.push({ path: fieldPath, pages: fieldPages, type, maxLength: typeof value === 'string' ? limit(fieldPath, value) : null, icuSignature: icu, mediaPurpose: segments[0] === 'media' ? snapshot.media[segments[1]]?.profile ?? null : null, adminOnly: segments[0] === 'settings', editable: !(fieldPath in settingAliases) && !fixed && !['object', 'array'].includes(type), owner: 'snapshot', ...(!['object', 'array'].includes(type) ? { initialValue: value } : {}), ...(fixed && !['object', 'array'].includes(type) ? { fixedValue: value } : {}), ...(source ? { source: { file: source.file, locator: source.locator, ...(source.expression ? { expression: source.expression } : {}) } } : {}) });
  if (value !== null && typeof value === 'object') for (const [key, child] of Object.entries(value)) inventory(child, `${fieldPath}.${key}`);
}
inventory(snapshot);
fields.sort((a, b) => a.path.localeCompare(b.path, 'en'));
const hardwareMappings = planData.hardware.map((hardware, index) => { const product = PRODUCT_CATALOG.find(product => product.href === hardware.href); return { index, productId: product.id, fields: { name: `products.${product.id}.name`, price: `products.${product.id}.price`, img: `products.${product.id}.image`, blurbKey: `messages.{locale}.Plans.${hardware.blurbKey}`, href: `products.${product.id}.href` }, codeOwned: { imageFit: hardware.imageFit }, reason: 'Hardware display derives from canonical products, translated blurbs and code-owned image fitting; no competing writable price' }; });
const priceVariants = Object.fromEntries(PRODUCT_CATALOG.map(product => [product.id, product.id === 'ola-go' ? { kinds: ['included'], includedWith: 'ola', editable: false } : { kinds: ['pending', 'usd'], amountPath: `products.${product.id}.price.amount`, maximumFractionDigits: 2, minorSafe: true, presentationOnly: true }]));
const manifest = { priceVariants, settingAliases, hardwareMappings, schemaVersion: 1, pages: [...pages, ...globalPages], fields, mediaSources: Object.fromEntries([...mediaSources].sort(([a], [b]) => a.localeCompare(b, 'en'))), hardware: planData.hardware, canonicalMappings: exclusions, sourceFiles: [...sources.keys()].sort(), settingsHandoff: 'validateDraft/parseSnapshot derive every messages.{locale}.Contact.intro alias from settings.contactText.{locale} without mutating the input. B2 must persist the normalized result, enforce canonical settings admin-only on server and DB edit/publish/rollback, and hide readonly aliases. B4 must consume a validated normalized snapshot and resolve supportEmail/siteUrl/contactText only from settings; never treat siteUrl as auth/media-fetch authorization.', adapterHandoff: 'Per-use mediaSources.altExpression/altMessagePath/originalAlt takes precedence over shared slot alt defaults (especially logos and translated alt text); do not overwrite all uses with one global alt. CmsStatic cart_* fields are ICU; other CmsStatic fields are plain literal text; keep field IDs and source locators when adapting B4. This seed exporter reads original code only and must never overwrite CMS versions. Tables and hardware are presentation only; no SKU eligibility or charging.', nonEditable: [{ scope: 'CSS, animation/timing, responsive layout, routes, IDs, translation lookup keys and source logic', reason: 'Code-maintained behavior; never executable CMS input' }] };
// Validation-only policy; editor/source metadata is kept out of validator bundles.
const policy = fields.filter(field => !/^products\.[^.]+\.price\./.test(field.path)).map(({ path, type, maxLength, icuSignature, fixedValue }) => ({ path, type, maxLength, icuSignature, ...(fixedValue !== undefined ? { fixedValue } : {}) }));
// Typed batches keep the generated records readable and avoid giant inferred unions.
const batches = [];
for (let index = 0; index < policy.length; index += 100) batches.push(`const batch${batches.length}: ContentRule[] = [\n${policy.slice(index, index + 100).map(field => '  ' + JSON.stringify(field)).join(',\n')}\n];`);
const policySource = `// Generated by related/website/scripts/export-initial-content.mjs.\nimport type { ContentRule } from './content';\n${batches.join('\n')}\nexport const contentPolicy: readonly ContentRule[] = [${batches.map((_, index) => `...batch${index}`).join(', ')}];\n`;
let previous;
try { previous = JSON.parse(await text('lib/content/field-manifest.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (previous && !process.argv.includes('--accept-source-change')) {
  const currentPaths = new Set(fields.map(field => field.path));
  const removed = previous.fields.filter(field => field.path.startsWith('messages.en.CmsStatic.') && !currentPaths.has(field.path));
  if (removed.length) throw new Error(`Refusing to discard ${removed.length} imported static fields after source changes. Preserve B4 field IDs/mappings or explicitly review a seed rebaseline with --accept-source-change. CMS versions must never be overwritten by this exporter.`);
}
const outputs = [
  [path.join(app, 'lib/content/initial-snapshot.json'), json(snapshot)],
  [path.join(app, 'lib/content/field-manifest.json'), json(manifest)],
  [path.join(root, 'contracts/content-policy.ts'), policySource],
  [path.join(root, 'related/admin/features/content/field-manifest.json'), json(manifest)],
  [path.join(root, 'related/admin/tests/fixtures/content-snapshot.json'), json(snapshot)],
];
let stale = false;
for (const [file, expected] of outputs) {
  let actual;
  try { actual = await readFile(file, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (actual === expected) continue;
  if (check) { stale = true; console.error(`Stale content export: ${path.relative(root, file)}`); }
  else { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, expected); }
}
if (stale) process.exitCode = 1;
else console.log(`Content ${check ? 'verified' : 'exported'}: ${fields.length} fields, ${sourceFields.size} static strings, ${Object.keys(snapshot.media).length} media slots, ${sources.size} source files.`);
