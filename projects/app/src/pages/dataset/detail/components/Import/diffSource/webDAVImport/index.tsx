import { GET, POST } from '@/web/common/api/request';
import { ImportDataComponentProps } from '@/web/core/dataset/type';
import { WebDAVFile } from '@fastgpt/plugins/webdav/service';
import React, { createContext, useState } from 'react';
import SelectFile from './SelectFile';
import Upload from './Upload';

// API
export const fetchWebDAVFile = (dir?: string) => GET<WebDAVFile[]>('plugins/webdav/list', { dir });
export const uploadWebDAVFiles = (file: WebDAVFile, data: any) =>
  POST('plugins/webdav/upload', { file, data });

// Store
type WebDAVImportContext = {
  sources: WebDAVFile[];
  setSources: React.Dispatch<React.SetStateAction<WebDAVFile[]>>;
};
const debugSources: WebDAVFile[] = [
  {
    filename: '/AI知识库/通用知识/福州屏东中学简介.docx',
    basename: '福州屏东中学简介.docx',
    lastmod: 'Fri, 29 Mar 2024 04:01:03 GMT',
    size: 15438,
    type: 'file',
    etag: '259f39e32ae705abfd042f3612d93a3c',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  },
  {
    filename: '/AI知识库/通用知识/福州屏东中学学校领导.docx',
    basename: '福州屏东中学学校领导.docx',
    lastmod: 'Fri, 29 Mar 2024 04:04:47 GMT',
    size: 17485,
    type: 'file',
    etag: '70409be1a56e06e1c4e3883e4a456ef9',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
];

export const WebDAVImportContext = createContext<WebDAVImportContext>({
  sources: [],
  setSources: () => {}
});

// 参考 FileLocal.tsx
const WebDAVImport = ({ activeStep, goToNext }: ImportDataComponentProps) => {
  const [sources, setSources] = useState<WebDAVFile[]>([]);

  return (
    <WebDAVImportContext.Provider value={{ sources, setSources }}>
      {activeStep === 0 && <SelectFile goToNext={goToNext} />}
      {activeStep === 1 && <Upload />}
    </WebDAVImportContext.Provider>
  );
};

export default React.memo(WebDAVImport);
