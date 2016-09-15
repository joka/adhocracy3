from pyramid import testing
from pytest import fixture
from pytest import mark
import colander


@mark.usefixtures('log')
class TestJSONHTTPException:

    @fixture
    def make_one(self, errors, request=None, **kwargs):
        from adhocracy_core.rest.exceptions import JSONHTTPClientError
        return JSONHTTPClientError(errors, request=request, **kwargs)

    def test_create(self):
        from pyramid.httpexceptions import HTTPException
        error_entries = []
        inst = self.make_one(error_entries)
        assert isinstance(inst, HTTPException)
        assert inst.status == '400 Bad Request'
        assert inst.content_type == 'application/json'
        assert inst.json_body == {'status': 'error',
                                  'errors': []}

    def test_add_code_and_title(self):
        error_entries = []
        inst = self.make_one(error_entries, code=402, title='Bad Bad')
        assert inst.status == '402 Bad Bad'

    def test_add_error_entries_to_json_body(self):
        from adhocracy_core.interfaces import error_entry
        error_entries = [error_entry('header', 'a', 'b')]
        inst = self.make_one(error_entries)
        assert inst.json_body['errors'] == [{'location': 'header',
                                             'name': 'a',
                                             'description': 'b'}]

    def test_log_request_body_json_dict(self, request_, log):
        request_.body = '{"data": "stuff"}'
        self.make_one([], request_)
        assert '{"data": "stuff"}' in str(log)

    def test_log_request_body_json_list(self, request_, log):
        request_.body = '[]'
        request_.text = '[]'
        self.make_one([], request_)
        assert '[]' in str(log)

    def test_log_request_body_json_other(self, request_, log):
        request_.body = b'None'
        self.make_one([], request_)
        assert 'None' in str(log)

    def test_log_abbreviated_request_body_if_gt_5000(self, request_, log):
        request_.body = '{"data": "' + 'h' * 5110 + '"}'
        self.make_one([], request_)
        assert len(str(log)) < len(request_.body)
        assert '...' in str(log)

    def test_log_request_body_is_wrong_json(self, request_, log):
        request_.body = b'wrong'
        self.make_one([], request_)
        assert 'wrong' in str(log)

    def test_log_formdata_body(self, request_, log):
        request_.content_type = 'multipart/form-data'
        request_.body = "h" * 120
        self.make_one([], request_)
        assert request_.body in str(log)

    def test_log_abbreviated_formdata_body_if_gt_240(self, request_, log):
        request_.content_type = 'multipart/form-data'
        request_.body = "h" * 240
        self.make_one([], request_)
        assert len(str(log)) < len(request_.body)
        assert 'h...' in str(log)

    def test_log_but_hide_login_password_in_body(self, request_, log):
        import json
        from .views import POSTLoginUsernameRequestSchema
        appstruct = POSTLoginUsernameRequestSchema().serialize(
            {'password': 'secret', 'name': 'name'})
        request_.body = json.dumps(appstruct)
        self.make_one([], request_)
        assert 'secret' not in str(log)
        assert '<hidden>' in str(log)

    def test_log_but_hide_user_passwod_sheet_password_in_body(self, request_, log):
        import json
        from adhocracy_core.sheets.principal import IPasswordAuthentication
        appstruct = {'data': {IPasswordAuthentication.__identifier__:
                                  {'password': 'secret'}}}
        request_.body = json.dumps(appstruct)
        self.make_one([], request_)
        assert 'secret' not in str(log)
        assert '<hidden>' in str(log)

    def test_log_headers(self, request_, log):
        request_.headers['X'] = 1
        self.make_one([], request_)
        assert "{'X': 1}" in str(log)

    def test_log_but_hide_x_user_token_in_headers(self, request_, log):
        request_.headers['X-User-Token'] = 1
        self.make_one([], request_)
        assert "{'X-User-Token': '<hidden>'}" in str(log)

    def test_log_but_hide_cookies_in_headers(self, request_, log):
        request_.headers['Cookie'] = 'auth=secret'
        self.make_one([], request_)
        assert "{'Cookie': '<hidden>'}" in str(log)


@mark.usefixtures('log')
class TestHandleErrorX0XException:

    def call_fut(self, error, request):
        from adhocracy_core.rest.exceptions import handle_error_x0x_exception
        return handle_error_x0x_exception(error, request)

    def test_forward_http_exception(self, request_):
        from pyramid.httpexceptions import HTTPException
        error = HTTPException(code=204)
        result_error = self.call_fut(error, request_)
        assert error is result_error


@mark.usefixtures('log')
class TestHandleError40X_exception:

    @fixture
    def integration(self, config):
        import adhocracy_core.rest
        config.include(adhocracy_core.rest)
        return config

    def call_fut(self, error, request):
        from adhocracy_core.rest.exceptions import handle_error_40x_exception
        return handle_error_40x_exception(error, request)

    def test_render_http_client_exception(self, request_):
        from pyramid.httpexceptions import HTTPClientError
        error = HTTPClientError(code=400)
        json_error = self.call_fut(error, request_)
        assert json_error.code == 400
        assert json_error.json_body == \
               {"status": "error",
                "errors": [{"description": "{0} {1}".format(error.status, error),
                            "name": "GET",
                            "location": "url"}]}

    def test_render_http_json_exception(self, request_):
        from .exceptions import JSONHTTPClientError
        error = JSONHTTPClientError([], code=400)
        json_error = self.call_fut(error, request_)
        assert json_error is error

    def create_dummy_app(self, config, error=None):
        from adhocracy_core.interfaces import IResource
        from adhocracy_core.interfaces import API_ROUTE_NAME
        def dummy_view(request):
            if error:
                raise error
            else:
                return "{}"
        config.add_view(dummy_view, name='dummy_view',
                        route_name=API_ROUTE_NAME,
                        context=IResource)
        from webtest import TestApp
        root = testing.DummyResource(__provides__=IResource)
        config.set_root_factory(lambda x: root)
        app = config.make_wsgi_app()
        return TestApp(app)

    @mark.usefixtures('integration')
    def test_response_get_40X(self, integration):
        from pyramid.httpexceptions import HTTPClientError
        app_dummy = self.create_dummy_app(
            integration,
            error=HTTPClientError(status_code=400, code=400))
        resp = app_dummy.get('/api/dummy_view', status=400)
        assert '400' in resp.json['errors'][0]['description']

    @mark.usefixtures('integration')
    def test_response_options_40X(self, integration):
        from pyramid.httpexceptions import HTTPClientError
        app_dummy = self.create_dummy_app(
            integration,
            error=HTTPClientError(status_code=400, code=400))
        resp = app_dummy.options('/api/dummy_view', status=400)
        assert '400' in resp.json['errors'][0]['description']


@mark.usefixtures('log')
class TestHandleError400ColanderInvalid:

    def make_one(self, error, request):
        from adhocracy_core.rest.exceptions import handle_error_400_colander_invalid
        return handle_error_400_colander_invalid(error, request)

    def test_render_exception_error(self, request_):
        import json
        invalid0 = colander.SchemaNode(typ=colander.String(), name='parent0',
                                       msg='msg_parent')
        invalid1 = colander.SchemaNode(typ=colander.String(), name='child1')
        invalid2 = colander.SchemaNode(typ=colander.String(), name='child2')
        error0 = colander.Invalid(invalid0)
        error1 = colander.Invalid(invalid1)
        error2 = colander.Invalid(invalid2)
        error0.add(error1, 1)
        error1.add(error2, 0)

        inst = self.make_one(error0, request_)

        assert inst.status == '400 Bad Request'
        wanted = {'status': 'error',
                  'errors': [{'location': 'body',
                              'name': 'parent0.child1.child2',
                              'description': ''}]}
        assert json.loads(inst.body.decode()) == wanted


@mark.usefixtures('log')
class TestHandleError400URLDecodeError:

    def make_one(self, error, request):
        from adhocracy_core.rest.exceptions import handle_error_400_url_decode_error
        return handle_error_400_url_decode_error(error, request)

    def test_render_exception_error(self, request_):
        from pyramid.exceptions import URLDecodeError
        import json
        try:
            b'\222'.decode()
            assert False
        except UnicodeDecodeError as err:
            error = URLDecodeError(err.encoding, err.object,
                                   err.start,err.end, err.reason)
            inst = self.make_one(error, request_)

            assert inst.status == '400 Bad Request'
            wanted = {'status': 'error',
                      'errors': [{'location': 'url',
                                  'name': '',
                                  'description': "400 Bad Request 'utf-8' codec can't decode byte 0x92 in position 0: invalid start byte"}]}
            assert json.loads(inst.body.decode()) == wanted


@mark.usefixtures('log')
class TestHandleError500Exception:

    def make_one(self, error, request_):
        from adhocracy_core.rest.exceptions import handle_error_500_exception
        return handle_error_500_exception(error, request_)

    def test_render_exception_error(self, request_, log):
        import json
        error = Exception('arg1')
        inst = self.make_one(error, request_)
        assert inst.status == '500 Internal Server Error'
        message = json.loads(inst.body.decode())
        assert message['status'] == 'error'
        assert len(message['errors']) == 1
        assert message['errors'][0]['description'].startswith(
            'Exception: arg1; time: ')
        assert message['errors'][0]['location'] == 'internal'
        assert message['errors'][0]['name'] == ''


@mark.usefixtures('log')
class TestHandleAutoUpdateNoForkAllowed400Exception:

    def make_one(self, error, request_):
        from adhocracy_core.rest.exceptions import \
            handle_error_400_auto_update_no_fork_allowed
        return handle_error_400_auto_update_no_fork_allowed(error, request_)

    def test_render_exception_error(self, request_):
        from adhocracy_core.interfaces import ISheet
        resource = testing.DummyResource(__name__='resource')
        event = testing.DummyResource(object=resource,
                                      isheet=ISheet,
                                      isheet_field='elements',
                                      new_version=testing.DummyResource(__name__='referenced_new_version'),
                                      old_version=testing.DummyResource(__name__='referenced_old_version'))
        error = testing.DummyResource(resource=resource,
                                      event=event)
        inst = self.make_one(error, request_)
        assert inst.status == '400 Bad Request'
        wanted = \
            {'errors': [{'description': 'No fork allowed - The auto update tried to '
                                        'create a fork for: resource caused by isheet: '
                                        'adhocracy_core.interfaces.ISheet field: '
                                        'elements with old_reference: '
                                        'referenced_old_version and new reference: '
                                        'referenced_new_version. Try another root_version.',
                         'location': 'body',
                         'name': 'root_versions'}],
             'status': 'error'}
        assert inst.json == wanted


@mark.usefixtures('log')
class TestHandleError410:

    @fixture
    def error(self):
        from pyramid.httpexceptions import HTTPGone
        return HTTPGone()

    def make_one(self, error, request):
        from adhocracy_core.rest.exceptions import handle_error_410_exception
        return handle_error_410_exception(error, request)

    def test_no_detail_no_metadata(self, error, request_):
        inst = self.make_one(error, request_)
        assert inst.content_type == 'application/json'
        assert inst.json_body['modification_date'] == ''
        assert inst.json_body['modified_by'] is None
        assert inst.json_body['reason'] == ''

    def test_with_detail_no_imetadata(self, error, request_):
        error.detail = 'hidden'
        inst = self.make_one(error, request_)
        assert inst.json_body['reason'] == 'hidden'

    def test_with_detail_and_imetadata(self, error, request_, mock_sheet,
                                       registry_with_content):
        from datetime import datetime
        from adhocracy_core.testing import register_sheet
        from adhocracy_core.sheets.metadata import IMetadata
        resource = testing.DummyResource(__provides__=[IMetadata])
        user = testing.DummyResource(__name__='/user')
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IMetadata)
        mock_sheet.get.return_value = {'modification_date': datetime.today(),
                                       'modified_by': user}
        register_sheet(resource, mock_sheet, registry_with_content)
        error.detail = 'hidden'
        request_.context = resource
        inst = self.make_one(error, request_)
        assert inst.json_body['modification_date'].endswith('00:00')
        assert inst.json_body['modified_by'].endswith('user/')


@mark.usefixtures('log')
class TestHandleError400:

    @fixture
    def error(self):
        from pyramid.httpexceptions import HTTPBadRequest
        return HTTPBadRequest()

    def call_fut(self, error, request):
        from .exceptions import handle_error_400_bad_request
        return handle_error_400_bad_request(error, request)

    def test_return_json_error_with_error_listing(self, error, request_):
        from adhocracy_core.interfaces import error_entry
        request_.errors = [error_entry('b', '', '')]
        inst = self.call_fut(error, request_)
        assert inst.content_type == 'application/json'
        assert inst.json ==\
               {"errors": [{"location":"b","name":"","description":""}],
                "status": "error"}
        assert inst.code == 400


