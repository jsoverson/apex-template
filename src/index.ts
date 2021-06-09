import { parse } from '@wapc/widl';
import {
  AbstractNode,
  Definition,
  Document,
  InterfaceDefinition,
  NamespaceDefinition,
} from '@wapc/widl/dist/types/ast';
import Handlebars from 'handlebars';

Handlebars.registerHelper('isKind', function (this: AbstractNode, kind, options) {
  if (this.kind === kind) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('join', function (this: unknown, context: unknown[], separator: string, options) {
  return context.map((el: unknown) => options.fn(el)).join(separator);
});

// WIDL docs should only have one namespace & interface so we're uplevelling the definitions
// to an easily accessible property on the root
interface TemplateFriendlyWidlDocument {
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
