import { Flex, Progress, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import { getFileIcon } from '@fastgpt/global/common/file/icon';
import { formatFileSize } from '@fastgpt/global/common/file/tools';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useContext } from 'react';
import { WebDAVImportContext } from '.';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';

export const Upload = () => {
  const { sources } = useContext(WebDAVImportContext);
  const { datasetDetail } = useDatasetStore();

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
                导入进度
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {sources?.map((item, index) => (
              <Tr key={item.filename} _hover={{ bg: 'myWhite.600' }} cursor={'pointer'}>
                <Td>{index + 1}</Td>
                <Td>
                  <MyIcon name={getFileIcon(item.filename) as any} w={'16px'} mr={2} />
                  {item.basename}
                </Td>
                <Td>{formatFileSize(item.size)}</Td>
                <Td>
                  <Flex alignItems={'center'} fontSize={'xs'}>
                    <Progress
                      value={10}
                      h={'6px'}
                      w={'100%'}
                      maxW={'210px'}
                      size="sm"
                      borderRadius={'20px'}
                      colorScheme={'blue'}
                      bg="myGray.200"
                      hasStripe
                      isAnimated
                      mr={2}
                    />
                    {`${10}%`}
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </div>
  );
};
