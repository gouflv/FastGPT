import { GET } from '@/web/common/api/request';
import { ImportDataComponentProps } from '@/web/core/dataset/type';
import { WebDAVFile } from '@fastgpt/plugins/webdav/service';
import React, { createContext, useState } from 'react';
import { SelectFile } from './SelectFile';
import { Upload } from './Upload';

// API
export const fetchWebDAVFile = (dir?: string) => GET<WebDAVFile[]>('plugins/webdav/list', { dir });

// Store
type WebDAVImportContext = {
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

export const WebDAVImportContext = createContext<WebDAVImportContext>({
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
      {activeStep === 1 && <Upload />}
    </WebDAVImportContext.Provider>
  );
};

export default React.memo(WebDAVImport);
