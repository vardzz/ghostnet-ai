import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';
import { MessageChannel, MessagePort } from 'worker_threads';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
global.ReadableStream = ReadableStream as typeof global.ReadableStream;
global.TransformStream = TransformStream as typeof global.TransformStream;
global.WritableStream = WritableStream as typeof global.WritableStream;
global.MessageChannel = MessageChannel as typeof global.MessageChannel;
global.MessagePort = MessagePort as typeof global.MessagePort;

const { Blob, File, FormData, Headers, Request, Response } = require('undici');

global.Blob = Blob as typeof global.Blob;
global.File = File as typeof global.File;
global.FormData = FormData as typeof global.FormData;
global.Headers = Headers as typeof global.Headers;
global.Request = Request as typeof global.Request;
global.Response = Response as typeof global.Response;

