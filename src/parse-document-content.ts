import {FileMetaInformation} from 'file2html';
import {decode} from 'file2html/lib/text-encoding';
import {parseXML} from 'file2html-xml-tools/lib/sax';

interface HTMLTags {
    [key: string]: string;
}

export function parseDocumentContent (fileContent: Uint8Array, meta: FileMetaInformation): Promise<{
    content: string;
    styles: string;
}> {
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
    let imageTagSource: {
        id: string;
        contentType: string;
    };

    parseXML(decode(fileContent), {
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
                    let href: string|undefined;

                    for (const key in attributes) {
                        if (attributes.hasOwnProperty(key) && key.split(':')[1] === 'href') {
                            href = attributes[key];
                            break;
                        }
                    }

                    if (isContent && href) {
                        content += openedHTMLTags.image + ' src="' + href + '"/' + unfinishedTagEnding;
                    }
                    break;
                case 'binary':
                    const id: string|undefined = attributes['id'];
                    const contentType: string|undefined = attributes['content-type'];

                    if (id && contentType) {
                        imageTagSource = {id, contentType};
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
                            for (const key in attributes) {
                                if (attributes.hasOwnProperty(key) && key.split(':')[1] === 'href') {
                                    content += ` href="${ attributes[key] }"`;
                                    break;
                                }
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
                content = content.replace(
                    new RegExp(`src="#${ imageTagSource.id }"`, 'g'),
                    `src="data:${ imageTagSource.contentType };base64,${ textContent.trim() }"`
                );
                imageTagSource = undefined;
            } else if (isTextContentEnabled) {
                content += textContent;
            }
        }
    });

    return Promise.resolve({
        styles: '<style></style>',
        content: `<div>${ content }</div>`
    });
}