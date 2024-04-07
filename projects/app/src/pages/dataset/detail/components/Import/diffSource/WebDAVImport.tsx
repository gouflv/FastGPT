import MyBox from '@/components/common/MyBox';
import { GET } from '@/web/common/api/request';
import { ImportDataComponentProps } from '@/web/core/dataset/type';
import { Table, TableContainer, Tbody, Td, Th, Thead, Toast, Tr } from '@chakra-ui/react';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { getFileIcon } from '@fastgpt/global/common/file/icon';
import { formatFileSize } from '@fastgpt/global/common/file/tools';
import { WebDAVFile } from '@fastgpt/plugins/webdav/service';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { t } from 'i18next';
import path from 'path';
import React, { useEffect, useMemo, useState } from 'react';

const fileType = '.txt, .docx, .csv, .pdf, .md, .html';
const maxSelectFileCount = 1000;

export const fetchWebDAVFile = (dir?: string) => GET<WebDAVFile[]>('plugins/webdav/list', { dir });

// 参考 FileLocal.tsx
const WebDAVImport = ({ activeStep, goToNext }: ImportDataComponentProps) => {
  const [pathArr, setPathArr] = useState<string[]>(['/']);
  const queryPath = useMemo(() => path.join(...pathArr), [pathArr]);

  const { data: collection, isFetching } = useQuery(
    ['fetchWebDAVFileList', queryPath],
    () => fetchWebDAVFile(queryPath),
    {
      onError(err) {
        Toast({
          title: t(getErrText(err, t('common.Load Failed'))),
          status: 'error'
        });
      }
    }
  );

  useEffect(() => {
    console.log('collection', collection);
  }, [collection]);

  return (
    <MyBox isLoading={isFetching} h={'100%'} py={[2, 4]}>
      <TableContainer
        px={[2, 6]}
        mt={[0, 3]}
        position={'relative'}
        flex={'1 0 0'}
        overflowY={'auto'}
      >
        <Table variant={'simple'} fontSize={'sm'} draggable={false}>
          <Thead draggable={false}>
            <Tr bg={'myGray.100'} mb={2}>
              <Th borderLeftRadius={'md'} overflow={'hidden'} borderBottom={'none'} py={4}>
                #
              </Th>
              <Th borderBottom={'none'} py={4}>
                {t('common.Name')}
              </Th>
              <Th borderBottom={'none'} py={4}>
                更新时间
              </Th>
              <Th borderBottom={'none'} py={4}>
                大小
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {collection?.map((item, index) => (
              <Tr key={item.filename}>
                <Td>{index + 1}</Td>
                <Td>
                  <MyIcon name={getFileIcon(item.filename) as any} w={'16px'} mr={2} />
                  {item.filename}
                </Td>
                <Td>{dayjs(item.lastmod).format('YYYY/MM/DD HH:mm')}</Td>
                <Td>{formatFileSize(item.size)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </MyBox>
  );
};

export default React.memo(WebDAVImport);
