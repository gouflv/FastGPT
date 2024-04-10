import {
  Button,
  Flex,
  Progress,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import { getFileIcon } from '@fastgpt/global/common/file/icon';
import { formatFileSize } from '@fastgpt/global/common/file/tools';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useContext, useEffect, useState } from 'react';
import { WebDAVImportContext, uploadWebDAVFiles } from '.';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';
import { FormType, useImportStore } from '../../Provider';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { TabEnum } from '@/pages/dataset/detail';

// Reference: commonProgress/Upload.tsx
export const Upload = () => {
  const { datasetDetail } = useDatasetStore();
  const { parentId, sources, processParamsForm, chunkSize, totalChunks, uploadRate } =
    useImportStore();
  const { handleSubmit } = processParamsForm;
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const { sources: fileSources } = useContext(WebDAVImportContext);

  const [uploadState, setUploadState] = useState<
    {
      state: 'pending' | 'uploading' | 'done' | 'error';
    }[]
  >([]);

  useEffect(() => {
    setUploadState(fileSources.map((_, index) => ({ index, state: 'pending' })));
  }, []);

  const { mutate: startUpload, isLoading } = useRequest({
    mutationFn: async function ({ mode, customSplitChar, qaPrompt, webSelector }: FormType) {
      if (fileSources.length === 0) return;

      const commonFileData = {
        parentId,
        trainingType: mode,
        datasetId: datasetDetail._id,
        chunkSize,
        chunkSplitter: customSplitChar,
        qaPrompt
        // TODO: computed in the backend
        // name: item.sourceName,
        // rawTextLength: item.rawText.length,
        // hashRawText: hashStr(item.rawText)
      };

      for await (const [index, item] of fileSources.entries()) {
        setUploadState((prev) => {
          prev[index].state = 'uploading';
          return [...prev];
        });

        try {
          await uploadWebDAVFiles(item, {
            ...commonFileData,
            collectionMetadata: {
              // TODO: computed in the backend
              relatedImgId: ''
            }
          });

          setUploadState((prev) => {
            prev[index].state = 'done';
            return [...prev];
          });
        } catch (error) {
          setUploadState((prev) => {
            prev[index].state = 'error';
            return [...prev];
          });
        }
      }
    },
    onSuccess: () => {
      toast({
        title: t('core.dataset.import.Upload success'),
        status: 'success'
      });
      router.replace({
        query: {
          ...router.query,
          currentTab: TabEnum.collectionCard
        }
      });
    }
  });

  return (
    <div>
      <TableContainer flex={'1 0 0'} overflowY={'auto'}>
        <Table fontSize={'sm'} draggable={false}>
          <Thead draggable={false}>
            <Tr bg={'myGray.100'} mb={2}>
              <Th
                borderLeftRadius={'md'}
                overflow={'hidden'}
                borderBottom={'none'}
                py={4}
                width={'50px'}
              >
                #
              </Th>
              <Th borderBottom={'none'} py={4}>
                文件
              </Th>
              <Th borderBottom={'none'} py={4}>
                大小
              </Th>
              <Th borderBottom={'none'} py={4}>
                导入状态
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {fileSources?.map((item, index) => (
              <Tr key={item.filename} _hover={{ bg: 'myWhite.600' }} cursor={'pointer'}>
                <Td>{index + 1}</Td>
                <Td>
                  <MyIcon name={getFileIcon(item.filename) as any} w={'16px'} mr={2} />
                  {item.basename}
                </Td>
                <Td>{formatFileSize(item.size)}</Td>
                <Td>
                  {
                    {
                      pending: '准备',
                      uploading: '导入中',
                      done: '完成',
                      error: '失败'
                    }[uploadState[index]?.state]
                  }
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Flex justifyContent={'flex-end'} mt={4}>
        <Button isLoading={isLoading} onClick={handleSubmit((data) => startUpload(data))}>
          开始上传
        </Button>
      </Flex>
    </div>
  );
};
