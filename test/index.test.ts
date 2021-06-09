import { expect } from 'chai';
import { describe } from 'mocha';
import fs from 'fs';

import { render } from '../src';

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
  ({{~#joinBlock parameters ', '~}}
    {{~name.value}}: {{type.name.value~}}
  {{/joinBlock}}) : {{type.name.value}}
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
});
