import { expect } from 'chai';
import { describe } from 'mocha';
import fs from 'fs';
import path, { dirname } from 'path';

import { registerPartials, render, handlebars, registerHelpers, parseApex } from '../src/index.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const apexSrc = fs.readFileSync(`${__dirname}/sample.apex`, 'utf-8');
const doc = parseApex(apexSrc);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function raw_render(template: string, context: any, options?: any) {
  registerHelpers(options, doc);
  return handlebars.compile(template)(context);
}

describe('main', function () {
  it('should render templates', () => {
    const apexSrc = fs.readFileSync(`${__dirname}/sample.apex`, 'utf-8');
    const result = render(
      apexSrc,
      `
# Namespace: '{{ namespace.name.value }}'

## Interface

{{#each interface.operations }}
- {{ name.value ~}}
  ({{~#join parameters ', '~}}
    {{~name.value}}: {{type.name.value~}}
  {{/join}}) : {{type.name.value}}
{{/each}}

## Types

{{#each definitions }}
{{#isKind "TypeDefinition"}}
- {{ name.value }}
{{/isKind}}
{{/each}}
`,
    );
    const expected = `
# Namespace: 'TestNamespace'

## Interface

- testOperation(arg1: string, arg2: bytes) : Response

## Types

- Response
- Message
`;
    expect(result).to.equal(expected);
  });
  describe('helpers', () => {
    it('should codegen types', () => {
      const result = render(
        `type Test { foo: string }`,
        `{{#eachWithName definitions "Test"}}{{#eachWithName fields "foo"}}{{codegen-type type}}{{/eachWithName}}{{/eachWithName}}`,
      );
      expect(result).to.equal(`string`);
    });
    it('should expose dirname', () => {
      const result = raw_render(`{{dirname value}}`, { value: '/test/dir/file.js' });
      expect(result).to.equal(`/test/dir`);
    });
    it('should expose basename', () => {
      const result = raw_render(`{{basename value}}`, { value: '/test/dir/file.js' });
      expect(result).to.equal(`file.js`);
    });
    it('should expose replace', () => {
      const result = raw_render(`{{replace value ".js" ""}}`, { value: 'file.js' });
      expect(result).to.equal(`file`);
    });
    it('should expose snakeCase', () => {
      const result = render(`namespace "testNameSpace"`, `{{snakeCase namespace.name.value}}`);
      expect(result).to.equal(`test_name_space`);
    });
    it('should expose pascalCase', () => {
      const result = render(`namespace "test_name_space"`, `{{pascalCase namespace.name.value}}`);
      expect(result).to.equal(`TestNameSpace`);
    });
    it('should expose camelCase', () => {
      const result = render(`namespace "test_name_space"`, `{{camelCase namespace.name.value}}`);
      expect(result).to.equal(`testNameSpace`);
    });
    it('should expose eachWithName', () => {
      const result = render(
        `type Foo {}\n type Bar {}`,
        `{{#eachWithName definitions "Foo"}}{{name.value}}{{/eachWithName}}`,
      );
      expect(result).to.equal(`Foo`);
    });
    describe('switch/case', () => {
      it('should hit a single case', () => {
        const src = `namespace "TEST"`;
        const template = `
{{#switch namespace.name.value}}
  {{#case 'TEST'}}CASE for 'TEST'{{/case}}
  {{#case 'OTHER'}}CASE for 'OTHER{{/case}}
  {{#default}}DEFAULT BLOCK{{/default}}
{{/switch}}
`;
        const result = render(src, template);
        expect(result.trim()).to.equal(`CASE for 'TEST'`);
      });
      it('should hit default on failed cases switch/case/default', () => {
        const src = `namespace "TEST"`;
        const template = `
{{#switch namespace.name.value}}
  {{#case 'SOMETHING'}}CASE for 'SOMETHING'{{/case}}
  {{#case 'OTHER'}}CASE for 'OTHER{{/case}}
  {{#default}}DEFAULT BLOCK{{/default}}
{{/switch}}
`;
        const result = render(src, template);
        expect(result.trim()).to.equal(`DEFAULT BLOCK`);
      });
      it('should be work with multiple switches on one context', () => {
        const src = `namespace "TEST"`;
        const template = `
{{#switch namespace.name.value}}
  {{#case 'TEST'}}CASE for 'TEST'{{/case}}
  {{#case 'OTHER'}}CASE for 'OTHER'{{/case}}
  {{#default}}DEFAULT BLOCK{{/default}}
{{/switch}}
{{#switch namespace.name.value}}
  {{#case 'SOMETHING'}}CASE for 'SOMETHING' IN SECOND SWITCH{{/case}}
  {{#case 'OTHER'}}CASE for 'OTHER' IN SECOND SWITCH{{/case}}
  {{#default}}DEFAULT BLOCK IN SECOND SWITCH{{/default}}
{{/switch}}
`;
        const result = render(src, template);
        expect(result.trim()).to.match(/CASE for 'TEST'\s*DEFAULT BLOCK IN SECOND SWITCH/);
      });
      it('should nest', () => {
        const src = `namespace "TEST"`;
        const template = `
{{#with namespace}}
{{#switch kind ~}}
  {{#case "NamespaceDefinition"}}
    {{#switch name.value}}
      {{#case "string"}}String{{/case}}
      {{#default}}{{name.value}}{{/default}}
    {{/switch}}
  {{/case}}
  {{#default}}
    root
  {{/default}}
{{~/switch}}
{{/with}}
`;
        const result = render(src, template);
        expect(result.trim()).to.match(/TEST/);
      });
    });
  });
  describe('partials directory', () => {
    it('should automatically register all partials in a directory', async () => {
      await registerPartials(path.join(__dirname, 'partials'));
      const result = render(``, `{{> testPartial}}`);
      expect(result).to.equal(`test-partial`);
    });
    it('should throw on unfound partials', async () => {
      await registerPartials(path.join(__dirname, 'partials'));
      expect(() => render(``, `{{> notAPartial}}`)).to.throw();
      expect(() => render(``, `{{> notAPartial.other}}`)).to.throw();
    });
  });
});
