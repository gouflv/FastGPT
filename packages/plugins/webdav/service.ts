import { type FileStat } from 'webdav';
import { client } from './client';
import { orderBy } from 'lodash';

export type WebDAVFile = FileStat;

export async function fetchWebDAVFiles(dir = '/') {
  const res = (await client.getDirectoryContents(dir, {
    // TODO enable
    // Reference FileLocal.tsx
    // glob: '*.{txt,docx,csv,pdf,md,html}'
  })) as WebDAVFile[];

  return sort(res);
}

async function createWebDAVFileReadStream(file: WebDAVFile) {
  return client.createReadStream(file.filename);
}

function sort(data: WebDAVFile[]) {
  return orderBy(data, ['type'], ['asc']);
}
