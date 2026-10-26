import {readFileSync} from 'node:fs';
export function buildPhoenixSidebar(){return JSON.parse(readFileSync(new URL('../../vendor/phoenix/manifest.json',import.meta.url),'utf8')).sidebar;}
