import * as file2html from 'file2html';
import {lookup} from 'file2html/lib/mime';
import {errorsNamespace} from 'file2html/lib/errors';
import {Archive, readArchive} from 'file2html-archive-tools';
import {parseDocumentContent} from './parse-document-content';

const compressedFictionBook2MimeType: string = lookup('.fb2.zip');
const fictionBookMimeTypes: string[] = [
    lookup('.fb2'),
    lookup('.fb')
];
const supportedMimeTypes: string[] = [compressedFictionBook2MimeType].concat(fictionBookMimeTypes);

export default class FictionBookReader extends file2html.Reader {
    read ({fileInfo}: file2html.ReaderParams) {
        const fileContent: Uint8Array = fileInfo.content;
        let promise: Promise<Uint8Array>;

        if (fileInfo.meta.mimeType === compressedFictionBook2MimeType) {
            promise = readArchive(fileContent).then((archive: Archive) => {
                let fictionBookPath: string;
                const {files = {}} = archive;

                for (const path in files) {
                    if (files.hasOwnProperty(path) && fictionBookMimeTypes.indexOf(lookup(path)) >= 0) {
                        fictionBookPath = path;
                        break;
                    }
                }

                if (!fictionBookPath) {
                    const archiveTree: string = Object.keys(files).join(',\n');

                    return Promise.reject(new Error(
                        `${ errorsNamespace }.invalidFile. Archive: [${ archiveTree }]`
                    )) as any;
                }

                return archive.file(fictionBookPath).async('uint8array');
            });
        } else {
            promise = Promise.resolve(fileContent);
        }

        return promise.then((fileContent: Uint8Array) => {
            const {byteLength} = fileContent;
            const meta: file2html.FileMetaInformation = Object.assign({
                fileType: file2html.FileTypes.document,
                mimeType: '',
                name: '',
                size: byteLength,
                creator: '',
                createdAt: '',
                modifiedAt: ''
            }, fileInfo.meta);

            return parseDocumentContent(fileContent, meta).then(({styles, content}) => {
                return new file2html.File({
                    meta,
                    styles,
                    content
                });
            });
        });
    }

    static testFileMimeType (mimeType: string) {
        return supportedMimeTypes.indexOf(mimeType) >= 0;
    }
}