import { parse } from '@wapc/widl';
import { Definition, Document, InterfaceDefinition, NamespaceDefinition } from '@wapc/widl/dist/types/ast';
import Handlebars from 'handlebars';
import { registerHelpers } from './helpers';
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

export function render(widlSrc: string, templateSrc: string): string {
  const template = Handlebars.compile(templateSrc);
  const tree: Document & TemplateFriendlyWidlDocument = parse(widlSrc, undefined, { noLocation: true, noSource: true });
  const namespace = tree.definitions.find(isNamespace);
  const iface = tree.definitions.find(isInterface);
  tree.namespace = namespace;
  tree.interface = iface;
  const json = toJson(tree);
  return template(json);
}

// Converts fancy objects to POJSOs
function toJson(obj: unknown): string {
  return JSON.parse(JSON.stringify(obj, null, undefined));
}
