import Handlebars from 'handlebars';
import * as changeCase from 'change-case-all';
import { ast } from '@apexlang/core';
import { parseApex, TemplateOptions } from '.';
import { readFileSync } from 'fs';
import path from 'path';
import { debug } from './debug';

export function registerHelpers(
  registerHelper: typeof Handlebars.registerHelper,
  templateOptions: TemplateOptions,
): void {
  registerHelper('isKind', function (this: ast.AbstractNode, kind: string, options) {
    if (this.kind === kind) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });

  registerHelper('basename', function (context: string) {
    if (typeof context !== 'string') throw new Error('Object passed to basename helper was not a string');
    return path.basename(context);
  });

  registerHelper('dirname', function (context: string) {
    if (typeof context !== 'string') throw new Error('Object passed to dirname helper was not a string');
    return path.dirname(context);
  });

  registerHelper('replace', function (context: string, match: string, replacement: string) {
    if (typeof context !== 'string') throw new Error('Object passed to replace helper was not a string');
    return context.replace(match, replacement);
  });

  registerHelper('join', function (context: unknown[], separator: string, options) {
    if (!Array.isArray(context)) throw new Error('Object passed to join helper was not an Array');
    return context.map((el: unknown) => options.fn(el)).join(separator);
  });

  const caseFunctions = [
    'camelCase',
    'capitalCase',
    'constantCase',
    'dotCase',
    'headerCase',
    'noCase',
    'paramCase',
    'pascalCase',
    'pathCase',
    'sentenceCase',
    'snakeCase',
  ];

  caseFunctions.forEach(fnName => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (changeCase as any)[fnName];
    if (!fn) throw new Error(`Expected function ${fnName} from change-case-all not found`);
    registerHelper(fnName, function (context: string) {
      if (typeof context !== 'string') throw new Error(`Object passed to ${fnName} helper was not a string`);
      return fn(context);
    });
  });

  registerHelper('upperCase', function (context: string) {
    if (typeof context !== 'string') throw new Error('Object passed to upperCase helper was not a string');
    return context.toUpperCase();
  });

  registerHelper('lowerCase', function (context: string) {
    if (typeof context !== 'string') throw new Error('Object passed to lowerCase helper was not a string');
    return context.toLowerCase();
  });

  registerHelper('debug', function (context: unknown) {
    console.error(context);
    return JSON.stringify(context, null, 2);
  });

  registerHelper('ifCond', function (this: unknown, v1, operator, v2, options) {
    switch (operator) {
      case '==':
        return v1 == v2 ? options.fn(this) : options.inverse(this);
      case '===':
        return v1 === v2 ? options.fn(this) : options.inverse(this);
      case '!=':
        return v1 != v2 ? options.fn(this) : options.inverse(this);
      case '!==':
        return v1 !== v2 ? options.fn(this) : options.inverse(this);
      case '<':
        return v1 < v2 ? options.fn(this) : options.inverse(this);
      case '<=':
        return v1 <= v2 ? options.fn(this) : options.inverse(this);
      case '>':
        return v1 > v2 ? options.fn(this) : options.inverse(this);
      case '>=':
        return v1 >= v2 ? options.fn(this) : options.inverse(this);
      case '&&':
        return v1 && v2 ? options.fn(this) : options.inverse(this);
      case '||':
        return v1 || v2 ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
    }
  });

  // This should be a separate module but won't until it does a complete codegen
  function codegen(node: ast.AbstractNode): string {
    switch (node.kind) {
      case ast.Kind.Named:
        return (<ast.Named>node).name.value;
      case ast.Kind.Optional:
        return `${codegen((<ast.Optional>node).type as unknown as ast.AbstractNode)}?`;
      case ast.Kind.MapType:
        return `{${codegen((<ast.MapType>node).keyType as unknown as ast.AbstractNode)}:${codegen(
          (<ast.MapType>node).valueType as unknown as ast.AbstractNode,
        )}`;
      case ast.Kind.ListType:
        return `[${codegen((<ast.ListType>node).type as unknown as ast.AbstractNode)}]`;
      default:
        throw new Error('Unhandled node');
    }
  }

  registerHelper('codegen-type', function (node: ast.AbstractNode) {
    if (!node.kind) throw new Error('Object passed to codegen-type helper was not a Apex node');
    return codegen(node);
  });

  //switch/case/default implementation modified from https://stackoverflow.com/questions/53398408/switch-case-with-default-in-handlebars-js
  class SwitchContexts {
    map: Map<unknown, SwitchContext[]> = new Map();
    get(ctx: unknown) {
      const existing = this.map.get(ctx);
      if (existing) return existing;
      const otherwise: SwitchContext[] = [];
      this.map.set(ctx, otherwise);
      return otherwise;
    }
    getLatest(ctx: unknown) {
      const list = this.get(ctx);
      return list[list.length - 1];
    }
    push(ctx: unknown, value: unknown) {
      const list = this.get(ctx);
      list.push(new SwitchContext(value));
    }
    pop(ctx: unknown) {
      const list = this.get(ctx);
      list.pop();
    }
  }
  class SwitchContext {
    value: unknown;
    hit = false;
    constructor(value: unknown) {
      this.value = value;
    }
    test(value: unknown) {
      const result = this.value === value;
      if (result) this.hit = true;
      return result;
    }
  }
  const contexts = new SwitchContexts();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHelper('switch', function (this: any, value, options) {
    contexts.push(this, value);
    const result = options.fn(this);
    contexts.pop(this);
    return result;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHelper('case', function (this: any, value, options) {
    const context = contexts.getLatest(this);
    if (context.test(value)) {
      return options.fn(this);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHelper('default', function (this: any, options) {
    const context = contexts.getLatest(this);
    if (!context.hit) {
      return options.fn(this);
    }
  });

  registerHelper('import', function (value: string, options) {
    if (typeof value !== 'string') throw new Error('Object passed to import helper was not a string');
    const resolvedPath = path.join(templateOptions.root || '', `${value}.apex`);
    debug('Importing %o from %o', value, resolvedPath);
    const apexSource = readFileSync(resolvedPath, 'utf-8');
    const tree = parseApex(apexSource);
    return options.fn(tree);
  });

  registerHelper('eachWithName', function (context: ast.Named[], value: string, options) {
    const matches = context.filter((annotation: ast.Named) => annotation.name.value === value);
    if (matches.length > 0) {
      return matches.map((match: unknown) => options.fn(match)).join('');
    }
  });

  registerHelper('withAnnotation', function (this: { annotations: [] }, value: string, options) {
    if (!this.annotations) throw new Error('No annotations on context');
    const annotations = this.annotations.filter((annotation: ast.Named) => annotation.name.value === value);
    if (annotations.length > 0) {
      return annotations.map((annotation: unknown) => options.fn(annotation)).join('');
    } else {
      return options.inverse(this);
    }
  });

  registerHelper('unlessAnnotation', function (this: { annotations: [] }, value: string, options) {
    if (!this.annotations) throw new Error('No annotations on context');
    const annotations = this.annotations.filter((annotation: ast.Named) => annotation.name.value === value);
    if (annotations.length > 0) {
      return annotations.map((annotation: unknown) => options.inverse(annotation)).join('');
    } else {
      return options.fn(this);
    }
  });

  registerHelper('panic', function (msg: string, context: unknown) {
    console.error(`Template panic: ${msg}`);
    console.error(context);
    process.exit(1);
  });
}
