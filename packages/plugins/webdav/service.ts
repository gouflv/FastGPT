import { type FileStat } from 'webdav';
import { client } from './client';

export type WebDAVFile = FileStat;

export async function fetchWebDAVFiles(dir = '/') {
  const res = await client.getDirectoryContents(dir, {
    // TODO enable
    // glob: '*.{pdf,csc,doc,docx,txt,md}'
  });

  console.log('fetchWebDAVFiles', JSON.stringify(res, null, 2));

  return res;
}
