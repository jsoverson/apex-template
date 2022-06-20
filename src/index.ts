import { parse, ast } from '@apexlang/core';

import Handlebars from 'handlebars';
import { registerHelpers as internalRegisterHelpers } from './helpers';
import { promises as fs } from 'fs';
import path from 'path';
import { debug } from './debug';

export const handlebars = Handlebars;

// Apex docs should only have one namespace & interface so we're uplevelling the definitions
// to an easily accessible property on the root
export interface TemplateFriendlyApexDocument {
  namespace?: ast.NamespaceDefinition;
  interface?: ast.InterfaceDefinition;
}

function isNamespace(def: ast.Definition): def is ast.NamespaceDefinition {
  return def.getKind() === 'NamespaceDefinition';
}

function isInterface(def: ast.Definition): def is ast.InterfaceDefinition {
  return def.getKind() === 'InterfaceDefinition';
}

export function parseApex(src: string): Pick<ast.Document, 'definitions'> & TemplateFriendlyApexDocument {
  // Allow rendering templates even with empty Apex src (useful for sandbox exploration)
  if (src.length === 0) return { definitions: [] };
  try {
    const tree: ast.Document & TemplateFriendlyApexDocument = parse(src, undefined, {
      noLocation: true,
      noSource: true,
    });
    const additions = {
      namespace: tree.definitions.find(isNamespace),
      interface: tree.definitions.find(isInterface),
    };
    return Object.assign({}, tree, additions);
  } catch (e) {
    console.error('Error parsing Apex');
    throw e;
  }
}

export interface TemplateOptions {
  root?: string;
}

export function registerHelpers(options: TemplateOptions = {}): void {
  debug('Registering helpers');
  internalRegisterHelpers(Handlebars.registerHelper.bind(Handlebars), options);
}
import util from 'util';

export function render(apexSrc: string, templateSrc: string, options: TemplateOptions = {}): string {
  registerHelpers(options);
  debug('Compiling template');
  const template = Handlebars.compile(templateSrc, {});
  debug('Parsing Apex');
  const tree = parseApex(apexSrc);
  debug('Converting Apex AST to plain JS object');
  const json = toJson(tree);
  debug('Rendering template');
  const result = template(json);
  return result;
}

export async function registerPartials(dir: string): Promise<void> {
  try {
    const files = await fs.readdir(dir);
    await Promise.all(
      files
        .filter(file => file.endsWith('.hbs'))
        .map(async file => {
          const partialName = path.basename(file, '.hbs');
          const fullPath = path.join(dir, file);
          debug('Registering partial %o from %o', partialName, fullPath);
          try {
            const partialSource = await fs.readFile(fullPath, 'utf-8');
            Handlebars.registerPartial(partialName, partialSource);
          } catch (e) {
            console.error(`Could not read file '${file}' in partials directory`);
          }
        }),
    );
  } catch (e) {
    console.error(`Could not read partials directory '${dir}'`);
    throw e;
  }
}

// Converts fancy objects to POJSOs
function toJson(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, null, undefined));
}
