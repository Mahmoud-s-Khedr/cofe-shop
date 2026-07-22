import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as ts from 'typescript';

function findMissingResponses() {
  const files = glob.sync('src/**/*.controller.ts');
  const results: { file: string; method: string; path: string; reqMethod: string }[] = [];

  for (const file of files) {
    const sourceFile = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isClassDeclaration(node)) {
        node.members.forEach((member) => {
          if (ts.isMethodDeclaration(member)) {
            const hasApiResponse = member.modifiers?.some((m) =>
              ts.isDecorator(m) &&
              ts.isCallExpression(m.expression) &&
              ts.isIdentifier(m.expression.expression) &&
              (m.expression.expression.text === 'ApiResponse' ||
                m.expression.expression.text === 'ApiOkResponse' ||
                m.expression.expression.text === 'ApiCreatedResponse')
            );

            const hasHttpMapping = member.modifiers?.some((m) =>
              ts.isDecorator(m) &&
              ts.isCallExpression(m.expression) &&
              ts.isIdentifier(m.expression.expression) &&
              ['Get', 'Post', 'Patch', 'Delete', 'Put'].includes(m.expression.expression.text)
            );

            if (hasHttpMapping && !hasApiResponse) {
              // Extract method and path
              const mappingDecorator = member.modifiers!.find((m) =>
                ts.isDecorator(m) &&
                ts.isCallExpression(m.expression) &&
                ts.isIdentifier(m.expression.expression) &&
                ['Get', 'Post', 'Patch', 'Delete', 'Put'].includes(m.expression.expression.text)
              ) as ts.Decorator;

              const reqMethod = ((mappingDecorator.expression as ts.CallExpression).expression as ts.Identifier).text;
              const args = (mappingDecorator.expression as ts.CallExpression).arguments;
              const reqPath = args.length > 0 && ts.isStringLiteral(args[0]) ? args[0].text : '/';
              
              results.push({
                file: file.replace('src/', ''),
                method: member.name.getText(sourceFile),
                reqMethod,
                path: reqPath,
              });
            }
          }
        });
      }
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

findMissingResponses();
