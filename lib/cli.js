import privatebinCli from 'commander'
import chalk from 'chalk'
import yaml from 'js-yaml'
import fs from 'fs';

import { privatebin } from './privatebin'

function validateOutput(val) {
  if (val.match(/^(json|yaml)$/i)) {
    return val
  }
  throw new Error(`invalid output: ${val}`)
}

function validateExpire(val) {
  if (val.match(/^(5min|10min|1hour|1day|1week|1month|1year|never)$/i)) {
    return val
  }
  throw new Error(`invalid expire: ${val}`)
}

export async function cli(process) {
  try {
    privatebinCli
      .version('0.0.3')
      .usage('[options] <message>')
      .option('-u, --url <string>', 'PrivateBin host', 'https://privatebin.net')
      .option('-e, --expire <string>', 'Paste expire time [5min, 10min, 1hour, 1day, 1week, 1month, 1year, never]', validateExpire, '1week')
      .option('-o, --output [type]', 'Output [json, yaml]', validateOutput)
      .option('--burnafterreading', 'Burn after reading', false)
      .option('--opendiscussion', 'Open discussion', false)
      .parse(process.argv);
  
    if (process.stdin.isTTY) {
      privatebinCli.parse(process.argv);
    } else {
      const stdinBuffer = fs.readFileSync(0); // STDIN_FILENO = 0
      privatebinCli.parse(process.argv);
      privatebinCli.args[0] = stdinBuffer.toString('utf8');
    }
  
  } catch (e) {
    console.error(chalk `{red ERROR:} ${e.message}\n`);
    privatebinCli.outputHelp(() => privatebinCli.help());
    process.exit(1)
  }
  
  const pasteData = Buffer.from(JSON.stringify({
    paste: privatebinCli.args[0]
  }), 'utf8');

  const paste = await privatebin(privatebinCli.url, pasteData, '', {
    expire: privatebinCli.expire,
    burnafterreading: privatebinCli.burnafterreading,
    opendiscussion: privatebinCli.opendiscussion,
  });

  switch (privatebinCli.output) {
    case 'json':
      console.log(JSON.stringify(paste, null, 4))
      break;
    case 'yaml':
      console.log(yaml.dump(paste))
      break;
    default:
      console.log(chalk `{bold pasteId:} ${paste.id}`);
      console.log(chalk `{bold pasteURL:} {greenBright ${paste.url}}`);
      console.log(chalk `{bold deleteURL:} {gray ${paste.deleteUrl}}`);
  }
}