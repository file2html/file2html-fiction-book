import * as file2html from 'file2html';
export default class FictionBookReader extends file2html.Reader {
    read({fileInfo}: file2html.ReaderParams): Promise<file2html.File>;
    static testFileMimeType(mimeType: string): boolean;
}
