import Handlebars from 'handlebars';
import * as changeCase from 'change-case-all';
import { AbstractNode } from '@wapc/widl/dist/types/ast';

export function registerHelpers(registerHelper: typeof Handlebars.registerHelper): void {
  registerHelper('isKind', function (this: AbstractNode, kind: string, options) {
    if (this.kind === kind) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });

  registerHelper('join', function (this: unknown, context: unknown[], separator: string, options) {
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
    registerHelper(fnName, function (this: unknown, context: string) {
      return fn(context);
    });
  });

  registerHelper('upperCase', function (this: unknown, context: string) {
    return context.toUpperCase();
  });

  registerHelper('upperCase', function (this: unknown, context: string) {
    return context.toUpperCase();
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

  //switch/case/default implementation modified from https://stackoverflow.com/questions/53398408/switch-case-with-default-in-handlebars-js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHelper('switch', function (this: any, value, options) {
    this.__switch_value = value;
    this.__switch_hit = false;
    return options.fn(this);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHelper('case', function (this: any, value, options) {
    if (value == this.__switch_value) {
      this.__switch_hit = true;
      return options.fn(this);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHelper('default', function (this: any, options) {
    if (!this.__switch_hit) {
      return options.fn(this);
    }
  });
}
