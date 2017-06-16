import * as file2html from 'file2html';
import bytesToString from 'file2html/lib/bytes-to-string';
import {parseXML} from 'file2html-xml-tools/lib/sax';

interface HTMLTags {
    [key: string]: string;
}

const supportedMimeTypes: string[] = ['application/x-fictionbook+xml'];

export default class FictionBookReader extends file2html.Reader {
    read ({fileInfo}: file2html.ReaderParams) {
        const fileContent: Uint8Array = fileInfo.content;
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
        let content: string = '';
        let isDocumentInfo: boolean;
        let isAuthorTag: boolean;
        let isContent: boolean;
        let isTextContentEnabled: boolean;
        const openedHTMLTags: HTMLTags = {
            a: '<a',
            p: '<p',
            section: '<section',
            epigraph: '<div',
            poem: '<div',
            stanza: '<div',
            v: '<div',
            cite: '<cite',
            title: '<header'
        };
        const unfinishedTagEnding: string = '>';
        const closedHTMLTags: HTMLTags = {
            a: '</a>',
            p: '</p>',
            section: '</section>',
            epigraph: '</div>',
            poem: '</div>',
            stanza: '</div>',
            v: '</div>',
            cite: '</cite>',
            title: '</header>'
        };
        const textContentTags: string[] = [
            'a',
            'p',
            'v'
        ];
        const contentTags: string[] = textContentTags.concat([
            'section',
            'epigraph',
            'poem',
            'stanza',
            'cite',
            'title'
        ]);

        parseXML(bytesToString(fileContent), {
            onopentag (tagName: string, attributes: {[key: string]: string}) {
                switch (tagName) {
                    case 'document-info':
                        isDocumentInfo = true;
                        break;
                    case 'date':
                        if (isDocumentInfo) {
                            const {value} = attributes;

                            if (value) {
                                meta.createdAt = value;
                            }
                        }
                        break;
                    case 'nickname':
                        if (isDocumentInfo) {
                            isAuthorTag = true;
                        }
                        break;
                    case 'body':
                        isContent = true;
                        break;
                    case 'empty-line':
                         if (isContent) {
                             content += '<br/>';
                         }
                        break;
                    default:
                        if (isContent && contentTags.indexOf(tagName) >= 0) {
                            content += `${ openedHTMLTags[tagName] } class="${ tagName }"`;
                            isTextContentEnabled = textContentTags.indexOf(tagName) >= 0;

                            if (tagName === 'a') {
                                const href: string = attributes['xlink:href'];

                                if (href) {
                                    content += ` href="${ href }"`;
                                }

                                content += unfinishedTagEnding;
                            } else if (tagName === 'section') {
                                const {id} = attributes;

                                content += unfinishedTagEnding;

                                if (id) {
                                    // add anchor: <a name=""></a>
                                    content += `${ openedHTMLTags.a } name="${ id }"${ unfinishedTagEnding }`;
                                    content += closedHTMLTags.a;
                                }
                            } else {
                                content += unfinishedTagEnding;
                            }
                        }
                }
            },
            onclosetag (tagName: string) {
                switch (tagName) {
                    case 'document-info':
                        isDocumentInfo = false;
                        break;
                    case 'nickname':
                        if (isDocumentInfo) {
                            isAuthorTag = false;
                        }
                        break;
                    case 'body':
                        isContent = false;
                        break;
                    default:
                        if (isContent && contentTags.indexOf(tagName) >= 0) {
                            content += closedHTMLTags[tagName];
                            isTextContentEnabled = false;
                        }
                }
            },
            ontext (textContent: string) {
                if (isAuthorTag) {
                    meta.creator += textContent;
                } else if (isTextContentEnabled) {
                    content += textContent;
                }
            }
        });

        return Promise.resolve(new file2html.File({
            meta,
            styles: '<style></style>',
            content: `<div>${ content }</div>`
        }));
    }

    static testFileMimeType (mimeType: string) {
        return supportedMimeTypes.indexOf(mimeType) >= 0;
    }
}