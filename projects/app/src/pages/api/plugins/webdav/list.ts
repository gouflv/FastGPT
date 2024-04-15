import { getErrText } from '@fastgpt/global/common/error/utils';
import { fetchWebDAVFiles } from '@fastgpt/plugins/webdav/service';
import { jsonRes } from '@fastgpt/service/common/response';
import { authUserNotVisitor } from '@fastgpt/service/support/permission/auth/user';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { dir } = req.query as { dir: string };

    const { teamId, tmbId } = await authUserNotVisitor({ req, authToken: true });

    const response = await fetchWebDAVFiles(dir);

    jsonRes(res, { data: response });
  } catch (err) {
    console.log(err);
    res.status(500).send(getErrText(err));
  }
}
