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
            title: '<header',
            image: '<img'
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
        const imageTagEndIndices: {[key: string]: number} = {};
        let imageTagSource: {
            endIndex: number;
            contentType: string;
        };

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
                    case 'image':
                        const href: string = attributes['xlink:href'];

                        if (isContent && href) {
                            content += openedHTMLTags.image;
                            imageTagEndIndices[href.replace('#', '')] = content.length;
                            content += `/${ unfinishedTagEnding }`;
                        }
                        break;
                    case 'binary':
                        const id: string = attributes['id'];
                        const contentType: string = attributes['content-type'];
                        const imageTagEndIndex: number = imageTagEndIndices[id];

                        if (imageTagEndIndex && contentType) {
                            imageTagSource = {
                                endIndex: imageTagEndIndex,
                                contentType
                            };
                        }
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
                } else if (imageTagSource) {
                    const {endIndex} = imageTagSource;
                    const src: string = `data:${ imageTagSource.contentType };base64,${ textContent.trim() }`;

                    content = `${ content.slice(0, endIndex) } src="${ src }"${ content.slice(endIndex) }`;
                    imageTagSource = undefined;
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