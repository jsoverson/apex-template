# widl-template: WIDL Handlebars Templater

This library and CLI utility allows you to pass serialized [WIDL]() to a Handlebars template for code generation, automatic documentation, linking, etc.

## Installation

```shell
$ npm install widl-template
```

## Usage

On the command line:

```
$ widl-template
```

In JavaScript

```js
const { render } = require('widl-template');

const widlSrc = // string of WIDL
const templateSrc = // string of Handlebars template source

const renderedTemplate = render(widlSrc, templateSrc);

console.log(renderedTemplate);
```

## Data format

Use the [WIDL validator's](https://jsoverson.github.io/widl-validator/) AST view to visualize the structure of the WIDL data.

### Notes: Minor AST changes

This utility uplevels the first `namespace` and `interface` it finds to the tree's root so you can more easily access them in your templates.

## Helpers

This library includes two helpers to help templating from the command line:

### `isKind`

A conditional block that tests the kind of WIDL node

```hbs
{{#isKind 'TypeDefinition'}}
  # Type:
  {{name.value}}
{{/isKind}}
```

### `joinBlock`

The `joinBlock` maps over ever element with the passed block and joins them with the supplied separator.

```hbs
({{#join parameters ', '}}{{name}}:{{type}}{{/join}})
```

Given `parameters` of `[{name: 'someName', type:'someValue'},{name: 'someName2', type:'someValue2'}]`, the joinBlock above would output:

```
(someName: someValue, someName2: someValue2)
```
