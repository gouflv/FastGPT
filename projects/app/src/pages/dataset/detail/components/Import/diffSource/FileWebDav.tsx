import MyBox from '@/components/common/MyBox';
import ParentPaths from '@/components/common/ParentPaths';
import { GET, POST } from '@/web/common/api/request';
import { ImportDataComponentProps, ImportSourceItemType } from '@/web/core/dataset/type';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Toast,
  ToastId,
  Tr,
  useToast
} from '@chakra-ui/react';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { getFileIcon } from '@fastgpt/global/common/file/icon';
import { formatFileSize } from '@fastgpt/global/common/file/tools';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import { type FileWebDAV } from '@fastgpt/plugins/webdav/service';
import MyIcon from '@fastgpt/web/components/common/Icon';
import Loading from '@fastgpt/web/components/common/MyLoading';
import { useConfirm } from '@fastgpt/web/hooks/useConfirm';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useImportStore } from '../Provider';

const DataProcess = dynamic(() => import('../commonProgress/DataProcess'), {
  loading: () => <Loading fixed={false} />
});
const Upload = dynamic(() => import('../commonProgress/Upload'));

const FileWebDAV = ({ activeStep, goToNext }: ImportDataComponentProps) => {
  return (
    <>
      {activeStep === 0 && <SelectFile goToNext={goToNext} />}
      {activeStep === 1 && <DataProcess showPreviewChunks goToNext={goToNext} />}
      {activeStep === 2 && <Upload />}
    </>
  );
};

export default React.memo(FileWebDAV);

type FileItemType = ImportSourceItemType;
const fileType = '.txt, .docx, .csv, .xlsx, .pdf, .md, .html, .pptx';
const maxSelectFileCount = 50;

function checkFileTypeValidate(item: FileWebDAV) {
  if (item.type === 'directory') return false;
  const ext = item.basename.split('.')?.pop()?.toLowerCase();
  return ext ? fileType.includes(ext) : false;
}

// API
export const fetchWebDAVFile = (dir?: string) => GET<FileWebDAV[]>('plugins/webdav/list', { dir });
export const uploadWebDAVFiles = (file: FileWebDAV): Promise<string> =>
  POST(
    'plugins/webdav/upload',
    { file },
    {
      timeout: 1000 * 60 * 5
    }
  );

const SelectFile = React.memo(function SelectFile({ goToNext }: { goToNext: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();

  // File upload
  const { sources, setSources } = useImportStore();
  const [uploadFiles, setUploadFiles] = useState<FileItemType[]>([]);
  const successFiles = useMemo(() => uploadFiles.filter((item) => item.dbFileId), [uploadFiles]);

  useEffect(() => {
    setSources(successFiles);
  }, [successFiles]);

  const [pathArr, setPathArr] = useState<string[]>([]);
  const queryPath = useMemo(() => `/${pathArr.join('/')}`, [pathArr]);

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
  const validateCollection = useMemo(() => collection?.filter(checkFileTypeValidate), [collection]);

  // Select
  const [selected, setSelected] = useState<FileWebDAV[]>([]);

  const isAllChecked = useMemo(
    () => !!validateCollection?.length && selected.length === validateCollection.length,
    [validateCollection, selected]
  );

  const isAllIndeterminate = useMemo(
    () =>
      !!validateCollection?.length &&
      selected.length > 0 &&
      selected.length < validateCollection.length,
    [validateCollection, selected]
  );

  function onSelectAllChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { checked } = e.target;
    if (checked) {
      setSelected(validateCollection ?? []);
    } else {
      setSelected([]);
    }
  }

  function checkIsSelected(item: FileWebDAV) {
    // use item.etag as key
    return selected.findIndex((s) => s.etag === item.etag) > -1;
  }

  function onSelectChange(item: FileWebDAV) {
    if (checkIsSelected(item)) {
      setSelected((state) => state.filter((s) => s.etag !== item.etag));
    } else {
      setSelected((state) => [...state, item]);
    }
  }

  function onTableRowClick(item: FileWebDAV) {
    if (item.type === 'directory') {
      setPathArr([...pathArr, item.basename]);
    } else {
      onSelectChange(item);
    }
  }

  const { openConfirm: openCleanSelectedConfirm, ConfirmModal: CleanSelectConfirm } = useConfirm({
    content: '清空已选中的文件'
  });

  const uploadProgress = useRef<ToastId>();

  useEffect(() => {
    if (uploadProgress.current) {
      const isFinish = successFiles.length === uploadFiles.length;
      toast.update(uploadProgress.current, {
        status: isFinish ? 'success' : 'loading',
        title: isFinish
          ? '导入成功'
          : `正在导入...(${successFiles.length || 1}/${uploadFiles.length})`
      });
    }
  }, [successFiles, toast, uploadFiles]);

  const { mutate: doUpload, isLoading: isUploading } = useRequest({
    mutationFn: async (selectedFiles: FileWebDAV[]) => {
      // init upload list
      const files = selectedFiles.map((file) => ({
        id: getNanoid(),
        createStatus: 'waiting',
        sourceName: file.basename,
        sourceSize: formatFileSize(file.size),
        icon: getFileIcon(file.basename),
        isUploading: true,
        uploadedFileRate: 0
      })) satisfies FileItemType[];

      // Limit the number of files to be uploaded
      setUploadFiles(() => files.slice(0, maxSelectFileCount));

      uploadProgress.current = toast({
        status: 'loading',
        title: `正在导入...(1/${uploadFiles.length})`
      });

      try {
        await Promise.all(
          files.map(async (file, i) => {
            const dbFileId = await uploadWebDAVFiles(selectedFiles[i]);
            setUploadFiles((state) =>
              state.map((item) =>
                item.id === file.id
                  ? {
                      ...item,
                      dbFileId,
                      isUploading: false
                    }
                  : item
              )
            );
          })
        );

        setTimeout(() => {
          if (uploadProgress.current) toast.close(uploadProgress.current);
          goToNext();
        }, 1000);
      } catch (error) {
        console.log(error);
      }
    }
  });

  async function onStartUpload() {
    doUpload(selected);
  }

  return (
    <MyBox isLoading={isFetching} height={'100%'} display={'flex'} flexDirection={'column'}>
      <Flex alignItems={'center'} h={'35px'}>
        <Flex flex={1} px={2}>
          <ParentPaths
            paths={pathArr.map((path, i) => ({
              parentId: String(i + 1),
              parentName: path
            }))}
            onClick={(id) => {
              // remove path after index
              setPathArr(pathArr.slice(0, Number(id)));
            }}
          />
        </Flex>
        <Box>{/* TODO search */}</Box>
      </Flex>

      <TableContainer mt={[0, 3]} overflowY={'auto'}>
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
                <Checkbox
                  size={'lg'}
                  isChecked={isAllChecked}
                  isIndeterminate={isAllIndeterminate}
                  onChange={onSelectAllChange}
                />
              </Th>
              <Th borderBottom={'none'} py={4}>
                文件
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
              <Tr
                key={item.filename}
                _hover={{ bg: 'myWhite.600' }}
                cursor={'pointer'}
                onClick={() => onTableRowClick(item)}
              >
                <Td onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    size={'lg'}
                    isChecked={checkIsSelected(item)}
                    onChange={(e) => {
                      onSelectChange(item);
                    }}
                    disabled={item.type === 'directory' || !checkFileTypeValidate(item)}
                  />
                </Td>
                <Td overflow={'hidden'}>
                  {item.type === 'directory' ? (
                    <MyIcon name={'file/fill/folder'} w={'16px'} mr={2} />
                  ) : (
                    <MyIcon name={getFileIcon(item.filename) as any} w={'16px'} mr={2} />
                  )}
                  {item.basename}
                </Td>
                <Td>{dayjs(item.lastmod).format('YYYY/MM/DD HH:mm')}</Td>
                <Td>{formatFileSize(item.size)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Flex alignItems={'center'} justifyContent={'flex-end'} mt={4}>
        {selected.length > 0 && (
          <a
            style={{ cursor: 'pointer', marginRight: '16px' }}
            onClick={() => {
              // FIXME
              // openCleanSelectedConfirm(() => {
              //   setSelected([]);
              // });
              setSelected([]);
            }}
          >
            清空
          </a>
        )}
        <Box textAlign={'right'}>
          <Button
            isDisabled={isFetching || selected.length === 0 || isUploading}
            onClick={onStartUpload}
          >
            已选中 {selected.length} 个文件 | 下一步
          </Button>
        </Box>
      </Flex>

      <CleanSelectConfirm />
    </MyBox>
  );
});
