import { connectToDatabase } from '@/service/mongo';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
import { DatasetCollectionTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { UsageSourceEnum } from '@fastgpt/global/support/wallet/usage/constants';
import { WebDAVFile, importWebDAVFile } from '@fastgpt/plugins/webdav/service';
import {
  delFileByFileIdList,
  getDownloadStream,
  getFileById
} from '@fastgpt/service/common/file/gridfs/controller';
import { jsonRes } from '@fastgpt/service/common/response';
import { getLLMModel, getVectorModel } from '@fastgpt/service/core/ai/model';
import { createOneCollection } from '@fastgpt/service/core/dataset/collection/controller';
import { authDataset } from '@fastgpt/service/support/permission/auth/dataset';
import { createTrainingUsage } from '@fastgpt/service/support/wallet/usage/controller';
import { NextApiRequest, NextApiResponse } from 'next';
import { readMdFile, readPdfFile, readRawText, readWordFile } from './read';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  let fileId = '';
  try {
    await connectToDatabase();

    const { datasetId } = req.query as { datasetId: string };

    const { teamId, tmbId, dataset } = await authDataset({
      req,
      authToken: true,
      authApiKey: true,
      per: 'w',
      datasetId
    });

    const { file, data } = req.body as { file: WebDAVFile; data: any };
    console.log(file, data);

    // import webdav files
    fileId = await importWebDAVFile(teamId, tmbId, file);

    // create collection
    const collectionData = data;
    const collectionMetadata = {};
    const { _id: collectionId } = await createOneCollection({
      ...collectionData,
      name: file.basename,
      metadata: collectionMetadata,
      teamId,
      tmbId,
      type: DatasetCollectionTypeEnum.file,
      fileId
    });

    if (!collectionId) {
      return;
    }

    // record training usage
    const { billId } = await createTrainingUsage({
      teamId,
      tmbId,
      appName: file.basename,
      billSource: UsageSourceEnum.training,
      vectorModel: getVectorModel(dataset.vectorModel).name,
      agentModel: getLLMModel(dataset.agentModel).name
    });

    // read file raw text
    const rawText = await readFileRawText(fileId);
    console.log(rawText);

    // split text to chunks
    // push data

    jsonRes(res, { data: 'importId' });
  } catch (error) {
    console.log(error);

    if (fileId.length > 0) {
      try {
        await delFileByFileIdList({
          fileIdList: [fileId],
          bucketName: BucketNameEnum.dataset
        });
      } catch (error) {}
    }

    jsonRes(res, { code: 500, error });
  }
}

async function readFileRawText(fileId: string) {
  const file = await getFileById({ bucketName: BucketNameEnum.dataset, fileId });
  if (!file) {
    return Promise.reject('File not found');
  }
  console.log('fileId', fileId, file);

  const stream = await getDownloadStream({ bucketName: BucketNameEnum.dataset, fileId });
  const blob = new Blob(await stream.toArray(), { type: file.contentType });

  // const text = await blob.text();
  // console.log('text', text);

  return readFileRawContent(file.filename, blob);
}

// Server side file reader, remove cvs, html
// Reference: packages/web/common/file/read/index.ts
async function readFileRawContent(name: string, blob: Blob) {
  const extension = name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
      return readRawText(blob);
    case 'md':
      return readMdFile(blob);
    case 'pdf':
      // const ab = await blob.arrayBuffer();
      // return readPdfFile({ pdf: ab });
      return readPdfFile(blob);
    case 'docx':
      return readWordFile(blob);
    default:
      return {
        rawText: ''
      };
  }
}
