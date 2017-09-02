"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var file2html = require("file2html");
var mime_1 = require("file2html/lib/mime");
var errors_1 = require("file2html/lib/errors");
var file2html_archive_tools_1 = require("file2html-archive-tools");
var parse_document_content_1 = require("./parse-document-content");
var compressedFictionBook2MimeType = mime_1.lookup('.fb2.zip');
var fictionBookMimeTypes = [
    mime_1.lookup('.fb2'),
    mime_1.lookup('.fb')
];
var supportedMimeTypes = [compressedFictionBook2MimeType].concat(fictionBookMimeTypes);
var FictionBookReader = (function (_super) {
    __extends(FictionBookReader, _super);
    function FictionBookReader() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FictionBookReader.prototype.read = function (_a) {
        var fileInfo = _a.fileInfo;
        var fileContent = fileInfo.content;
        var promise;
        if (fileInfo.meta.mimeType === compressedFictionBook2MimeType) {
            promise = file2html_archive_tools_1.readArchive(fileContent).then(function (archive) {
                var fictionBookPath;
                var _a = archive.files, files = _a === void 0 ? {} : _a;
                for (var path in files) {
                    if (files.hasOwnProperty(path) && fictionBookMimeTypes.indexOf(mime_1.lookup(path)) >= 0) {
                        fictionBookPath = path;
                        break;
                    }
                }
                if (!fictionBookPath) {
                    var archiveTree = Object.keys(files).join(',\n');
                    return Promise.reject(new Error(errors_1.errorsNamespace + ".invalidFile. Archive: [" + archiveTree + "]"));
                }
                return archive.file(fictionBookPath).async('uint8array');
            });
        }
        else {
            promise = Promise.resolve(fileContent);
        }
        return promise.then(function (fileContent) {
            var byteLength = fileContent.byteLength;
            var meta = Object.assign({
                fileType: file2html.FileTypes.document,
                mimeType: '',
                name: '',
                size: byteLength,
                creator: '',
                createdAt: '',
                modifiedAt: ''
            }, fileInfo.meta);
            return parse_document_content_1.parseDocumentContent(fileContent, meta).then(function (_a) {
                var styles = _a.styles, content = _a.content;
                return new file2html.File({
                    meta: meta,
                    styles: styles,
                    content: content
                });
            });
        });
    };
    FictionBookReader.testFileMimeType = function (mimeType) {
        return supportedMimeTypes.indexOf(mimeType) >= 0;
    };
    return FictionBookReader;
}(file2html.Reader));
exports.default = FictionBookReader;
