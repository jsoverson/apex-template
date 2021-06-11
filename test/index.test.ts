import { expect } from 'chai';
import { describe } from 'mocha';
import fs from 'fs';
import path from 'path';

import { registerPartials, render } from '../src';

describe('main', function () {
  it('should render templates', () => {
    const widlSrc = fs.readFileSync(`${__dirname}/sample.widl`, 'utf-8');
    const result = render(
      widlSrc,
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
    it('should expose switch/case/default', () => {
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
  });
  describe('partials directory', () => {
    it('should automatic register all partials in a directory', async () => {
      await registerPartials(path.join(__dirname, 'partials'));
      const result = render(``, `{{> testPartial}}`);
      expect(result).to.equal(`test-partial`);
    });
    it('should automatic register all partials in a directory', async () => {
      await registerPartials(path.join(__dirname, 'partials'));
      expect(() => render(``, `{{> notAPartial}}`)).to.throw();
      expect(() => render(``, `{{> notAPartial.other}}`)).to.throw();
    });
  });
});
