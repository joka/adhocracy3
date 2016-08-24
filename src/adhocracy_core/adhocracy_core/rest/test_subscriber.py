from pyramid import testing
from pytest import fixture
from pytest import mark


@fixture
def mock_route(mocker):
    from pyramid.interfaces import IRoute
    return mocker.Mock(spec=IRoute)


def test_set_response_header_set_x_frame_options_if_no_api_request(request_,
                                                                   mock_route):
    from .subscriber import set_response_headers
    mock_route.name = 'route_name'
    request_.matched_route = mock_route
    response = testing.DummyResource(headers={})
    event = testing.DummyResource(response=response,
                                  request=request_)
    set_response_headers(event)
    assert response.headers == {'X-Frame-Options': 'DENY'}


def test_set_response_header_set_cors_header_if_api_request(request_,
                                                             mocker):
    from .subscriber import set_response_headers
    request_.matched_route = None
    mock = mocker.patch('adhocracy_core.rest.subscriber.add_cors_headers')
    response = testing.DummyResource(headers={})
    event = testing.DummyResource(response=response,
                                  request=request_)
    set_response_headers(event)
    mock.assert_called_with(event)


def test_add_cors_headers(request_):
    from adhocracy_core.authentication import AnonymizeHeader
    from .subscriber import add_cors_headers
    response = testing.DummyResource(headers={})
    event = testing.DummyResource(response=response,
                                  request=request_)
    add_cors_headers(event)
    assert response.headers == \
        {'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept,'
                                         ' X-User-Path, X-User-Token, '
                                         + AnonymizeHeader ,
         'Access-Control-Allow-Credentials': 'true',
         'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS'}


def test_add_cors_headers_use_request_origin_as_allow_origin(request_):
    from .subscriber import add_cors_headers
    response = testing.DummyResource(headers={})
    request_.headers = {'Origin': 'http://x.org'}
    event = testing.DummyResource(response=response,
                                  request=request_)
    add_cors_headers(event)
    assert response.headers['Access-Control-Allow-Origin'] == 'http://x.org'


@fixture
def integration(config):
    config.include('adhocracy_core.rest.subscriber')


@mark.usefixtures('integration')
class TestIntegrationIncludeme:

    def test_register_subscriber(self, registry):
        from .subscriber import set_response_headers
        handlers = [x.handler.__name__ for x in registry.registeredHandlers()]
        assert set_response_headers.__name__ in handlers

