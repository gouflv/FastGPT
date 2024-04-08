import { connectToDatabase } from '@/service/mongo';
import { postCreateTrainingUsage } from '@/web/support/wallet/usage/api';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { UsageSourceEnum } from '@fastgpt/global/support/wallet/usage/constants';
import { jsonRes } from '@fastgpt/service/common/response';
import { getLLMModel, getVectorModel } from '@fastgpt/service/core/ai/model';
import { authDataset } from '@fastgpt/service/support/permission/auth/dataset';
import { createTrainingUsage } from '@fastgpt/service/support/wallet/usage/controller';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
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

    const { files } = req.body as { files: string[] };
    console.log(files);

    for await (const item of files) {
      const { billId } = await createTrainingUsage({
        teamId,
        tmbId,
        appName: item,
        billSource: UsageSourceEnum.training,
        vectorModel: getVectorModel(dataset.vectorModel).name,
        agentModel: getLLMModel(dataset.agentModel).name
      });
    }

    jsonRes(res, { data: 'webdav upload' });
  } catch (err) {
    console.log(err);
    res.status(500).send(getErrText(err));
  }
}
