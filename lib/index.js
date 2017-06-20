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
var text_encoding_1 = require("file2html/lib/text-encoding");
var sax_1 = require("file2html-xml-tools/lib/sax");
var supportedMimeTypes = ['application/x-fictionbook+xml'];
var FictionBookReader = (function (_super) {
    __extends(FictionBookReader, _super);
    function FictionBookReader() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FictionBookReader.prototype.read = function (_a) {
        var fileInfo = _a.fileInfo;
        var fileContent = fileInfo.content;
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
        var content = '';
        var isDocumentInfo;
        var isAuthorTag;
        var isContent;
        var isTextContentEnabled;
        var openedHTMLTags = {
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
        var unfinishedTagEnding = '>';
        var closedHTMLTags = {
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
        var textContentTags = [
            'a',
            'p',
            'v'
        ];
        var contentTags = textContentTags.concat([
            'section',
            'epigraph',
            'poem',
            'stanza',
            'cite',
            'title'
        ]);
        var imageTagEndIndices = {};
        var imageTagSource;
        sax_1.parseXML(text_encoding_1.decode(fileContent), {
            onopentag: function (tagName, attributes) {
                switch (tagName) {
                    case 'document-info':
                        isDocumentInfo = true;
                        break;
                    case 'date':
                        if (isDocumentInfo) {
                            var value = attributes.value;
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
                        var href = attributes['xlink:href'];
                        if (isContent && href) {
                            content += openedHTMLTags.image;
                            imageTagEndIndices[href.replace('#', '')] = content.length;
                            content += "/" + unfinishedTagEnding;
                        }
                        break;
                    case 'binary':
                        var id = attributes['id'];
                        var contentType = attributes['content-type'];
                        var imageTagEndIndex = imageTagEndIndices[id];
                        if (imageTagEndIndex && contentType) {
                            imageTagSource = {
                                endIndex: imageTagEndIndex,
                                contentType: contentType
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
                            content += openedHTMLTags[tagName] + " class=\"" + tagName + "\"";
                            isTextContentEnabled = textContentTags.indexOf(tagName) >= 0;
                            if (tagName === 'a') {
                                var href_1 = attributes['xlink:href'];
                                if (href_1) {
                                    content += " href=\"" + href_1 + "\"";
                                }
                                content += unfinishedTagEnding;
                            }
                            else if (tagName === 'section') {
                                var id_1 = attributes.id;
                                content += unfinishedTagEnding;
                                if (id_1) {
                                    // add anchor: <a name=""></a>
                                    content += openedHTMLTags.a + " name=\"" + id_1 + "\"" + unfinishedTagEnding;
                                    content += closedHTMLTags.a;
                                }
                            }
                            else {
                                content += unfinishedTagEnding;
                            }
                        }
                }
            },
            onclosetag: function (tagName) {
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
            ontext: function (textContent) {
                if (isAuthorTag) {
                    meta.creator += textContent;
                }
                else if (imageTagSource) {
                    var endIndex = imageTagSource.endIndex;
                    var src = "data:" + imageTagSource.contentType + ";base64," + textContent.trim();
                    content = content.slice(0, endIndex) + " src=\"" + src + "\"" + content.slice(endIndex);
                    imageTagSource = undefined;
                }
                else if (isTextContentEnabled) {
                    content += textContent;
                }
            }
        });
        return Promise.resolve(new file2html.File({
            meta: meta,
            styles: '<style></style>',
            content: "<div>" + content + "</div>"
        }));
    };
    FictionBookReader.testFileMimeType = function (mimeType) {
        return supportedMimeTypes.indexOf(mimeType) >= 0;
    };
    return FictionBookReader;
}(file2html.Reader));
exports.default = FictionBookReader;
