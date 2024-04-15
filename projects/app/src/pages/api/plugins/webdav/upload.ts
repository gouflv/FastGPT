import { connectToDatabase } from '@/service/mongo';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
import { WebDAVFile, importWebDAVFile } from '@fastgpt/plugins/webdav/service';
import { jsonRes } from '@fastgpt/service/common/response';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    const { file } = req.body as {
      file: WebDAVFile;
    };

    console.log('webdav upload start');
    console.log('file', file);

    // Reference: service/common/file/gridfs/controller.ts
    const { teamId, tmbId } = await authCert({ req, authToken: true });
    const fileId = await importWebDAVFile(teamId, tmbId, BucketNameEnum.dataset, file);

    jsonRes(res, {
      data: fileId
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error
    });
  }
}
