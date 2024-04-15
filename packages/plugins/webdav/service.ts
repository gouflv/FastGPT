import { getGridBucket } from '@fastgpt/service/common/file/gridfs/controller';
import { orderBy } from 'lodash';
import { type FileStat } from 'webdav';
import { BucketNameEnum } from '../../global/common/file/constants';
import { webDAVClient, webDAVFileClient } from './client';

export type FileWebDAV = FileStat;

export async function fetchWebDAVFiles(dir = '/') {
  const res = (await webDAVClient.getDirectoryContents(dir, {
    // Reference FileLocal.tsx
    // glob: '*.{txt,docx,pdf,md}'
  })) as FileWebDAV[];

  return orderBy(res, ['type'], ['asc']);
}

export async function importWebDAVFile(
  teamId: string,
  tmbId: string,
  bucketName: `${BucketNameEnum}`,
  file: FileWebDAV
) {
  const bucket = getGridBucket(bucketName);

  const readStream = webDAVFileClient.createReadStream(file.filename);

  const importStream = bucket.openUploadStream(file.basename, {
    metadata: {
      teamId,
      tmbId,
      webDavFile: file.filename,
      etag: file.etag
    },
    contentType: file.mime
  });

  await new Promise((resolve, reject) => {
    readStream.pipe(importStream).on('finish', resolve).on('error', reject);
  });

  const fileId = String(importStream.id);
  return fileId;
}
