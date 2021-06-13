#!/usr/bin/env node

import fs from 'fs';
import yargs from 'yargs';
import { registerPartials, render } from './index';
import path from 'path';
import { debug } from './debug';

interface Arguments {
  widl: string;
  template: string;
  partials?: string;
}

export async function run(args: Arguments): Promise<void> {
  try {
    const widlPath = args.widl;
    const widlPathRoot = path.dirname(widlPath);
    const templatePath = args.template;
    const widlSrc = fs.readFileSync(widlPath, 'utf-8');
    const templateSrc = fs.readFileSync(templatePath, 'utf-8');
    if (args.partials) await registerPartials(args.partials);
    const options = { root: widlPathRoot };
    debug('Options: %o', options);
    console.log(render(widlSrc, templateSrc, options));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

yargs(process.argv.slice(2))
  .command(
    '$0 <widl> <template> [options]',
    'Use WIDL schemas as input data to handlebars templates',
    yargs => {
      yargs
        .positional('widl', {
          demandOption: true,
          type: 'string',
          description: 'Path to schema file',
        })
        .positional('template', {
          demandOption: true,
          type: 'string',
          description: 'Path to Handlebars template file',
        })
        .options({
          p: {
            alias: 'partials',
            type: 'string',
            description: 'Directory of partial templates',
          },
        })
        .example('$0 schema.widl template.hbs', 'Outputs the results of rendering the template');
    },
    run,
  )
  .help('h')
  .alias('h', 'help').argv;
