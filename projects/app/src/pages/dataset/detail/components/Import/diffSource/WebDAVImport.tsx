import MyBox from '@/components/common/MyBox';
import ParentPaths from '@/components/common/ParentPaths';
import { GET } from '@/web/common/api/request';
import { ImportDataComponentProps } from '@/web/core/dataset/type';
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
  Tr
} from '@chakra-ui/react';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { getFileIcon } from '@fastgpt/global/common/file/icon';
import { formatFileSize } from '@fastgpt/global/common/file/tools';
import { WebDAVFile } from '@fastgpt/plugins/webdav/service';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { t } from 'i18next';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useImportStore } from '../Provider';

const fileType = '.txt, .docx, .csv, .pdf, .md, .html';
const maxSelectFileCount = 50;

// API
export const fetchWebDAVFile = (dir?: string) => GET<WebDAVFile[]>('plugins/webdav/list', { dir });

// Store
type useWebDAVImportStore = {
  sources: WebDAVFile[];
  setSources: React.Dispatch<React.SetStateAction<WebDAVFile[]>>;
};
const debugSources = [
  {
    filename: '/Nextcloud Manual.pdf',
    basename: 'Nextcloud Manual.pdf',
    lastmod: 'Fri, 05 Apr 2024 13:56:39 GMT',
    size: 16149598,
    type: 'file',
    etag: 'a54b8af176f11b7a2fb83a9b9ce9a6e5',
    mime: 'application/pdf'
  },
  {
    filename: '/Reasons to use Nextcloud.pdf',
    basename: 'Reasons to use Nextcloud.pdf',
    lastmod: 'Fri, 05 Apr 2024 13:56:39 GMT',
    size: 976625,
    type: 'file',
    etag: '718cb1caa7ad45929779865750269712',
    mime: 'application/pdf'
  }
] satisfies WebDAVFile[];
const WebDAVImportContext = createContext<useWebDAVImportStore>({
  sources: [],
  setSources: () => {}
});

// 参考 FileLocal.tsx
const WebDAVImport = ({ activeStep, goToNext }: ImportDataComponentProps) => {
  // TODO remove debug
  const [sources, setSources] = useState<WebDAVFile[]>(debugSources);

  return (
    <WebDAVImportContext.Provider value={{ sources, setSources }}>
      {activeStep === 0 && <SelectFile goToNext={goToNext} />}
    </WebDAVImportContext.Provider>
  );
};
export default React.memo(WebDAVImport);

const SelectFile = React.memo(function SelectFile({ goToNext }: { goToNext: () => void }) {
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

  const { sources, setSources } = useContext(WebDAVImportContext);
  const [selected, setSelected] = useState<WebDAVFile[]>(sources ?? []);

  useEffect(() => {
    setSources(selected);
  }, [selected]);

  function checkIsSelected(item: WebDAVFile) {
    // use item.etag as key
    return selected.findIndex((s) => s.etag === item.etag) > -1;
  }

  function onSelectChange(item: WebDAVFile) {
    if (checkIsSelected(item)) {
      setSelected(selected.filter((s) => s.etag !== item.etag));
    } else {
      setSelected([...selected, item]);
    }
  }

  function onTableRowClick(item: WebDAVFile) {
    if (item.type === 'directory') {
      setPathArr([...pathArr, item.basename]);
    } else {
      onSelectChange(item);
    }
  }

  return (
    <MyBox isLoading={isFetching}>
      <Flex alignItems={'center'} h={'35px'}>
        <Flex flex={1} px={2}>
          <ParentPaths
            paths={pathArr.map((path, i) => ({
              parentId: String(i),
              parentName: path
            }))}
            onClick={(id) => {
              const index = Number(id);
              // slice pathArr from 0 to index, inclusive
              setPathArr(pathArr.slice(0, index));
            }}
          />
        </Flex>
        <Box>{/* TODO search */}</Box>
      </Flex>

      <TableContainer mt={[0, 3]} flex={'1 0 0'} overflowY={'auto'}>
        <Table fontSize={'sm'} draggable={false}>
          <Thead draggable={false}>
            <Tr bg={'myGray.100'} mb={2}>
              <Th
                borderLeftRadius={'md'}
                overflow={'hidden'}
                borderBottom={'none'}
                py={4}
                width={10}
              >
                <Checkbox
                  size={'lg'}
                  onChange={(e) => {
                    console.log('e', e);
                  }}
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
                    disabled={item.type === 'directory'}
                  />
                </Td>
                <Td>
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
          <a style={{ cursor: 'pointer', marginRight: '16px' }} onClick={() => setSelected([])}>
            清空
          </a>
        )}
        <Box textAlign={'right'}>
          <Button
            isDisabled={isFetching || selected.length === 0 || selected.length > maxSelectFileCount}
            onClick={goToNext}
          >
            已选中 {selected.length} 个文件 | 下一步
          </Button>
        </Box>
      </Flex>
    </MyBox>
  );
});
