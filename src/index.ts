import { parse } from '@wapc/widl';
import { Definition, Document, InterfaceDefinition, NamespaceDefinition } from '@wapc/widl/dist/types/ast';
import Handlebars from 'handlebars';
import { registerHelpers } from './helpers';
import { promises as fs } from 'fs';
import path from 'path';
import { debug } from './debug';

registerHelpers(Handlebars.registerHelper.bind(Handlebars));

export const handlebars = Handlebars;

// WIDL docs should only have one namespace & interface so we're uplevelling the definitions
// to an easily accessible property on the root
export interface TemplateFriendlyWidlDocument {
  namespace?: NamespaceDefinition;
  interface?: InterfaceDefinition;
}

function isNamespace(def: Definition): def is NamespaceDefinition {
  return def.getKind() === 'NamespaceDefinition';
}

function isInterface(def: Definition): def is InterfaceDefinition {
  return def.getKind() === 'InterfaceDefinition';
}

function parseWidl(src: string): Pick<Document, 'definitions'> & TemplateFriendlyWidlDocument {
  // Allow rendering templates even with empty WIDL src (useful for sandbox exploration)
  if (src.length === 0) return { definitions: [] };
  try {
    const tree: Document & TemplateFriendlyWidlDocument = parse(src, undefined, { noLocation: true, noSource: true });
    const additions = {
      namespace: tree.definitions.find(isNamespace),
      interface: tree.definitions.find(isInterface),
    };
    return Object.assign({}, tree, additions);
  } catch (e) {
    throw new Error(`Error parsing WIDL: ${e.message}`);
  }
}

export function render(widlSrc: string, templateSrc: string): string {
  debug('Compiling template');
  const template = Handlebars.compile(templateSrc);
  debug('Parsing WIDL');
  const tree = parseWidl(widlSrc);
  debug('Converting WIDL AST to plain JS object');
  const json = toJson(tree);
  debug('Rendering template');
  try {
    const result = template(json);
    return result;
  } catch (e) {
    throw new Error(`Error rendering template: ${e.message}`);
  }
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
    throw new Error(`Could not read partials directory '${dir}': ${e.message}`);
  }
}

// Converts fancy objects to POJSOs
function toJson(obj: unknown): string {
  return JSON.parse(JSON.stringify(obj, null, undefined));
}
