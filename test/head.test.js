'use strict';

/*global describe: true, it: true, before: true, after: true*/

var client = require('../');
var common = require('./common.js');

var assert = require('chai').assert;

describe('HTTP HEAD method tests', function() {
    var server, secureServer;

    before(function(done) {
        var servers = common.createServers(done);
        server = servers.server;
        secureServer = servers.secureServer;
    });

    describe('HEAD Hello World - plain', function() {
        it('should pass the response headers', function(done) {
            client.head({
                url: 'http://127.0.0.1:' + common.options.port + '/',
                noCompress: true
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 200, 'the status is success');
                assert.isObject(res.headers, 'there is a headers object');
                assert.isUndefined(res.headers['content-encoding'], 'the content must not be encoded');

                done();
            });
        });
    });

    describe('HEAD Hello World - gzip', function() {
        it('should pass the response headers', function(done) {
            client.head({
                url: 'http://127.0.0.1:' + common.options.port + '/',
                headers: {
                    'accept-encoding': 'gzip'
                }
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.headers['content-encoding'], 'gzip', 'the content is encoded with gzip');

                done();
            });
        });
    });

    describe('HEAD Hello World - deflate', function() {
        it('should pass the response headers', function(done) {
            client.head({
                url: 'http://127.0.0.1:' + common.options.port + '/',
                headers: {
                    'accept-encoding': 'deflate'
                }
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.headers['content-encoding'], 'deflate', 'the content is encoded with deflate');

                done();
            });
        });
    });

    describe('HEAD redirect without location header', function() {
        it('should return the error argument', function(done) {
            client.head({
                url: 'http://127.0.0.1:' + common.options.port + '/redirect-without-location',
                noCompress: true
            }, function(err, res) {
                assert.instanceOf(err, Error, 'the error is an Error instance');
                assert.strictEqual(err.code, 301, 'the error code should be equal to the HTTP status code');
                assert.strictEqual(err.url, 'http://127.0.0.1:' + common.options.port + '/redirect-without-location', 'the URL must be passed back to the completion callback');

                assert.isUndefined(res);

                done();
            });
        });
    });

    describe('HEAD broken DNS name over HTTP', function() {
        it('should fail with an error passed back to the completion callback', function(done) {
            client.head('http://.foo.bar/', function(err, res) {
                assert.instanceOf(err, Error, 'the error is an Error instance');
                assert.strictEqual(err.url, 'http://.foo.bar/');

                assert.isUndefined(res, 'we have a response');

                done();
            });
        });
    });

    describe('HEAD broken DNS name over HTTPS', function() {
        it('should fail with an error passed back to the completion callback', function(done) {
            client.head('https://.foo.bar/', function(err, res) {
                assert.instanceOf(err, Error, 'the error is an Error instance');
                assert.strictEqual(err.url, 'https://.foo.bar/');

                assert.isUndefined(res, 'we have a response');

                done();
            });
        });
    });

    describe('HEAD DNS error', function() {
        it('should fail with an error passed back to the completion callback', function(done) {
            client.head('http://foo.bar/', function(err, res) {
                assert.instanceOf(err, Error, 'the error is an Error instance');
                assert.strictEqual(err.code, 'ENOTFOUND');
                assert.strictEqual(err.url, 'http://foo.bar/');

                assert.isUndefined(res, 'we have a response');

                done();
            });
        });
    });

    describe('HEAD header reflect', function() {
        it('should pass back the header foo sent from the client', function(done) {
            client.head({
                url: 'http://127.0.0.1:' + common.options.port + '/header-reflect',
                headers: {
                    foo: 'bar'
                }
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.headers.foo, 'bar', 'we got the foo header back');

                done();
            });
        });
    });

    describe('HEAD without protocol prefix', function() {
        it('should work fine by prepending http:// to the URL', function(done) {
            client.head('127.0.0.1:' + common.options.port + '/', function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 200, 'the HTTP status code is OK');
                assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');

                done();
            });
        });
    });

    describe('HEAD with redirect', function() {
        it('should redirect succesfully', function(done) {
            client.head({
                url: 'http://127.0.0.1:' + common.options.port + '/redirect',
                noCompress: true
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 200);
                assert.strictEqual(res.url, 'http://127.0.0.1:' + common.options.port + '/');

                done();
            });
        });
    });

    describe('HEAD over HTTPS with SSL validation', function() {
        it('should verify succesfully the connection', function(done) {
            client.head({
                url: 'https://127.0.0.1:' + common.options.securePort + '/',
                headers: {
                    host: 'http-get.lan'
                },
                ca: [require('./ca.js')]
            }, function(err, res) {
                assert.isNull(err);

                assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
                assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');

                done();
            });
        });
    });

    describe('HEAD without url', function() {
        it('should throw an error', function(done) {
            var throws = function() {
                client.head({}, function(err, res) {});
            };

            assert.throws(throws, Error, 'The options object requires an input URL value.');

            done();
        });
    });

    describe('HEAD with redirect loop', function() {
        it('should detect the condition and pass the error argument to the completion callback', function(done) {
            var url = 'http://127.0.0.1:' + common.options.port + '/redirect-loop';

            client.head(url, function(err, res) {
                assert.instanceOf(err, Error, 'the error is an instance of Error');
                assert.strictEqual(err.message, 'Redirect loop detected after 10 requests.', 'the proper message is passed back to the user');
                assert.strictEqual(err.code, 301, 'the error code is equal to the code of the HTTP response');
                assert.strictEqual(err.url, url, 'the error object has the proper URL');

                assert.isUndefined(res, 'we have a response');

                done();
            });
        });
    });

    describe('HEAD with URL fragment', function() {
        it('should not send the URL fragment to the server', function(done) {
            client.head('http://127.0.0.1:' + common.options.port + '/path-reflect#fragment', function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.headers.path, '/path-reflect', 'we should not get back the fragment');

                done();
            });
        });
    });

    describe('HEAD with noSslVerifier', function() {
        it('should not pass an error back due to lack of root CA', function(done) {
            client.head({
                url: 'https://127.0.0.1:' + common.options.securePort + '/',
                noSslVerifier: true
            }, function(err, res) {
                assert.isNull(err);

                assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
                assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');

                done();
            });
        });
    });

    after(function() {
        server.close();
        secureServer.close();
    });

});