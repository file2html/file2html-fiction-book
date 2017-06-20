import * as fs from 'fs';
import * as path from 'path';
import {TextDecoder} from 'text-encoding';
import FictionBookReader from '../../src/index';

describe('FictionBook', () => {
    beforeAll(() => {
        (window as any).TextDecoder = TextDecoder;
    });

    describe('#read()', () => {
        it('should parse a .fb2 sample', () => {
            const filename: string = path.resolve(__dirname, '..', 'sample.fb2');
            const fileBuffer: Buffer = fs.readFileSync(filename);

            return new FictionBookReader().read({
                fileInfo: {
                    content: new Uint8Array(fileBuffer),
                    meta: {} as any
                }
            }).then((file) => {
                expect(file.getMeta()).toEqual({
                    createdAt: '2002-10-15',
                    creator: 'GribUser',
                    fileType: 1,
                    mimeType: '',
                    modifiedAt: '',
                    name: '',
                    size: 37837
                });
                const {styles, content} = file.getData();

                function getTagsQuantity (content: string, pattern: RegExp) {
                    const tagNames: {[key: string]: number} = {};
                    let parseResult: string[] = [];

                    while (parseResult) {
                        const tagName: string = parseResult[1];

                        if (tagName) {
                            tagNames[tagName] = tagNames[tagName] || 0;
                            tagNames[tagName]++;
                        }

                        parseResult = pattern.exec(content);
                    }

                    return tagNames;
                }

                const openedTags: {[key: string]: number} = getTagsQuantity(content, /<([a-zA-Z0-9]+)/g);

                expect(openedTags).toEqual({
                    a: 11,
                    br: 1,
                    div: 14,
                    header: 28,
                    img: 1,
                    p: 60,
                    section: 26
                });
                expect(styles).toBe('<style></style>');
            });
        });
    });
});