import ts from 'typescript';

/** Bounded source guard: count every reviewed adapter occurrence and bind each
 * media attribute/object to its own alt expression, including absent/empty alt.
 * This guards source structure, not runtime expansion of dynamic collections. */
export function contentMediaBindings(file, source, expressions) {
  const occurrences = Object.fromEntries([...new Set(expressions)].sort().map(expression => [expression, 0]));
  const uses = [];
  if (file.endsWith('.css')) {
    for (const expression of Object.keys(occurrences)) occurrences[expression] = source.split(expression).length - 1;
    return {occurrences, uses};
  }
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    const text = node.getText(ast);
    if (Object.hasOwn(occurrences, text)) occurrences[text]++;
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      for (const expression of Object.keys(occurrences).filter(value => value.startsWith('--cms-'))) occurrences[expression] += node.text.split(expression).length - 1;
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const media = attributes.filter(attribute => ['src', 'poster'].includes(attribute.name.getText(ast)));
      const alt = attributes.find(attribute => attribute.name.getText(ast) === 'alt');
      for (const attribute of media) uses.push({kind: node.tagName.getText(ast), property: attribute.name.getText(ast), source: attribute.initializer?.getText(ast) ?? null, alt: alt?.initializer?.getText(ast) ?? null});
    }
    if (ts.isObjectLiteralExpression(node)) {
      const properties = node.properties.filter(ts.isPropertyAssignment);
      const media = properties.filter(property => ['src', 'poster'].includes(property.name.getText(ast)));
      const alt = properties.find(property => property.name.getText(ast) === 'alt');
      for (const property of media) uses.push({kind: 'object', property: property.name.getText(ast), source: property.initializer.getText(ast), alt: alt?.initializer.getText(ast) ?? null});
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return {occurrences, uses};
}
