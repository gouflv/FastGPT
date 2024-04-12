import { type FileStat } from 'webdav';
import { webDAVClient, webDAVFileClient } from './client';
import { orderBy } from 'lodash';
import { getGridBucket } from '@fastgpt/service/common/file/gridfs/controller';

export type WebDAVFile = FileStat;

export async function fetchWebDAVFiles(dir = '/') {
  const res = (await webDAVClient.getDirectoryContents(dir, {
    // Reference FileLocal.tsx
    // glob: '*.{txt,docx,pdf,md}'
  })) as WebDAVFile[];

  return orderBy(res, ['type'], ['asc']);
}

export async function importWebDAVFile(teamId: string, tmbId: string, file: WebDAVFile) {
  const bucket = getGridBucket('dataset');

  const readStream = webDAVFileClient.createReadStream(file.filename);

  const importStream = bucket.openUploadStream(file.filename, {
    metadata: {
      teamId,
      tmbId
    },
    contentType: file.mime
  });

  await new Promise((resolve, reject) => {
    readStream.pipe(importStream).on('finish', resolve).on('error', reject);
  });

  const fileId = String(importStream.id);
  return fileId;
}
