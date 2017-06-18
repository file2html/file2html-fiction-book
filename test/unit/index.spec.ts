import * as fs from 'fs';
import * as path from 'path';
import FictionBookReader from '../../src/index';

describe('FictionBook', () => {
    describe('#read()', () => {
        it('should parse a .fb2 sample', () => {
            const filename: string = path.resolve(__dirname, '..', 'sample.fb2');
            const fileBuffer: Buffer = fs.readFileSync(filename);
            const charCodes: number[] = fs.readFileSync(filename, {
                encoding: 'utf8'
            }).split('').map((char: string) => char.charCodeAt(0));

            return new FictionBookReader().read({
                fileInfo: {
                    content: Object.assign(charCodes, {
                        byteLength: fileBuffer.byteLength
                    }),
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
                let openedTagsCount: number = 0;
                let closedTagsCount: number = 0;
                const openedTagsPattern: RegExp = /<[a-zA-Z]+/g;
                const closedTagsPattern: RegExp = /<\/[a-zA-Z]+/g;

                while (openedTagsPattern.exec(content)) {
                    openedTagsCount++;
                }

                while (closedTagsPattern.exec(content)) {
                    closedTagsCount++;
                }

                expect(openedTagsCount).toBe(closedTagsCount);
                expect(styles).toBe('<style></style>');
                expect(content).toBe('<div></div>');
            });
        });
    });
});