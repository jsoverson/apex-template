# apex-template: Apex Handlebars Templater

## Deprecated

Any functionality in this package should be rolled up into core apex code generators. This package is still functional but should not receive much maintenance.

## About

This library and CLI utility allows you to pass serialized [Apex]() to a Handlebars template for code generation, automatic documentation, linking, etc.

## Installation

```shell
$ npm install apex-template
```

## Usage

On the command line:

```
$ apex-template
```

In JavaScript

```js
const { render } = require('apex-template');

const apexSrc = // string of Apex
const templateSrc = // string of Handlebars template source

const renderedTemplate = render(apexSrc, templateSrc);

console.log(renderedTemplate);
```

## Data format

Use the [Apex validator's](https://jsoverson.github.io/apex-validator/) AST view to visualize the structure of the Apex data.

### Notes: Minor AST changes

This utility uplevels the first `namespace` and `interface` it finds to the tree's root so you can more easily access them in your templates.

## Partials

Register all `.hbs` files in a directory as partials by using the `registerPartials()` function or by passing a directory to the CLI via `-p` or `--partials`

```js
import { registerPartials } from 'apex-template';

await registerPartials('partialsdir');
```

## Helpers

This library includes two helpers to help templating from the command line:

### `isKind`

A conditional block that tests the kind of Apex node

```hbs
{{#isKind 'TypeDefinition'}}
  # Type:
  {{name.value}}
{{/isKind}}
```

### `join`

The `join` maps over ever element with the passed block and joins them with the supplied separator.

```hbs
({{#join parameters ', '}}{{name}}:{{type}}{{/join}})
```

Given `parameters` of `[{name: 'someName', type:'someValue'},{name: 'someName2', type:'someValue2'}]`, the join above would output:

```
(someName: someValue, someName2: someValue2)
```

### `camelCase`

### `capitalCase`

### `constantCase`

### `dotCase`

### `headerCase`

### `noCase`

### `paramCase`

### `pascalCase`

### `pathCase`

### `sentenceCase`

### `snakeCase`

Case-related helpers that expose functions from [change-case-all](https://www.npmjs.com/package/change-case-all) e.g.

```hbs
{{pascalCase context}}
```

### `upperCase`

### `lowerCase`

Uppercase & lowercase helpers that transform an entire string

```hbs
{{upperCase context}}
```

### `import` block

Import another `apex` file

```hbs
{{#import 'other/file.apex'}}
  # Hello from
  {{namespace.name.value}}
{{/import}}
```

### `dirname`

Exposes Node.js's [path.dirname](https://nodejs.org/api/path.html#path_path_dirname_path).

```hbs
{{dirname value}}
```

### `basename`

Exposes Node.js's [path.basename](https://nodejs.org/api/path.html#path_path_dirname_path).

```hbs
{{basename value}}
```

### `replace`

Simple string replacement helper.

```hbs
{{replace original '.js' ''}}
```

### `switch`/`case`/`default`

An implementation of switch/case statements as handlebars helpers.

```hbs
{{#switch kind}}
  {{#case 'A'}}
    First block
  {{/case}}
  {{#case 'B'}}
    Second block
  {{/case}}
  {{#default}}
    Default block
  {{/default}}
{{/switch}}
```

### `eachWithName`

A block that iterates over every object in a passed list that has a `name` property equal to the passed name.
Used to iterate over fields or definitions to find a specific name

```hbs
{{#eachWithName definitions 'MyType'}}
  Some description specific to MyType
{{/eachWithName}}
```

### `codegen-type`

This is a partial code generator that turns a Apex type node (i.e. from a field or argument, not a TypeDefinition) back into a Apex string.

```
{{#each fields}}
  {{name.value}} : {{codegen-type type}}
{{/each}}
```
