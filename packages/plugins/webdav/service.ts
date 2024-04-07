import { type FileStat } from 'webdav';
import { client } from './client';
import { orderBy } from 'lodash';

export type WebDAVFile = FileStat;

export async function fetchWebDAVFiles(dir = '/') {
  const res = (await client.getDirectoryContents(dir, {
    // TODO enable
    // glob: '*.{pdf,csc,doc,docx,txt,md}'
  })) as WebDAVFile[];

  return sort(res);
}

function sort(data: WebDAVFile[]) {
  return orderBy(data, ['type'], ['asc']);
}
