import { connectToDatabase } from '@/service/mongo';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
import {
  DatasetCollectionTypeEnum,
  TrainingModeEnum
} from '@fastgpt/global/core/dataset/constants';
import { UsageSourceEnum } from '@fastgpt/global/support/wallet/usage/constants';
import { WebDAVFile, importWebDAVFile } from '@fastgpt/plugins/webdav/service';
import {
  delFileByFileIdList,
  getDownloadStream,
  getFileById
} from '@fastgpt/service/common/file/gridfs/controller';
import { jsonRes } from '@fastgpt/service/common/response';
import { getLLMModel, getVectorModel } from '@fastgpt/service/core/ai/model';
import {
  createOneCollection,
  delCollectionAndRelatedSources
} from '@fastgpt/service/core/dataset/collection/controller';
import { authDataset } from '@fastgpt/service/support/permission/auth/dataset';
import { createTrainingUsage } from '@fastgpt/service/support/wallet/usage/controller';
import { NextApiRequest, NextApiResponse } from 'next';
import { readMdFile, readPdfFile, readRawText, readWordFile } from './read';
import { splitText2Chunks } from '@fastgpt/global/common/string/textSplitter';
import { chunksUpload } from '@/web/core/dataset/utils';
import { PushDatasetDataProps } from '@fastgpt/global/core/dataset/api';
import { pushDataListToTrainingQueue } from '@fastgpt/service/core/dataset/training/controller';
import { findCollectionAndChild } from '@fastgpt/service/core/dataset/collection/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  let fileId = '';
  let collectionId = '';

  try {
    const { datasetId } = req.query as { datasetId: string };

    const { teamId, tmbId, dataset } = await authDataset({
      req,
      authToken: true,
      authApiKey: true,
      per: 'w',
      datasetId
    });

    const { file, data } = req.body as {
      file: WebDAVFile;
      data: {
        trainingType: TrainingModeEnum.chunk;
        datasetId: string;
        chunkSize: number;
        chunkSplitter: string;
        qaPrompt: string;
      };
    };
    console.log('webdav upload params', file, data);

    await connectToDatabase();

    // import webdav files
    fileId = await importWebDAVFile(teamId, tmbId, file);

    // create collection
    const collectionData = data;
    const collectionMetadata = {};
    const collectionCreated = await createOneCollection({
      ...collectionData,
      datasetId,
      name: file.basename,
      metadata: collectionMetadata,
      teamId,
      tmbId,
      type: DatasetCollectionTypeEnum.file,
      fileId
    });

    collectionId = collectionCreated._id;
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
    const fr = await readFileRawText(fileId);
    // console.log('readFileRawText', fr);

    // split text to chunks
    // Reference dataset/detail/components/Import/Provider.tsx
    const chunkRes = splitText2Chunks({
      text: fr.rawText,
      chunkLen: data.chunkSize,
      overlapRatio: 0.2,
      customReg: []
    });
    const chunkChars = chunkRes.chars;
    const chunks = chunkRes.chunks.map((chunk, i) => ({
      chunkIndex: i,
      q: chunk,
      a: ''
    }));

    // push data
    // Reference
    // - dataset/detail/components/Import/Provider.tsx
    // - dataset/detail/components/Import/commonProgress/Upload.tsx
    // - dataset/utils.ts
    // - core/api/dataset/data/pushData.ts

    // split chunk by rate
    const rate = 50;
    for (let i = 0; i < chunks.length; i += rate) {
      const uploadChunks = chunks.slice(i, i + rate);
      debugger;
      await pushDataListToTrainingQueue({
        teamId,
        tmbId,
        collectionId,
        billId,
        trainingMode: data.trainingType,
        data: uploadChunks,
        prompt: data.qaPrompt
      });
    }

    jsonRes(res, { data: collectionId });
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
