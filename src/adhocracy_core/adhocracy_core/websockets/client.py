"""Our own Websocket client that notifies the server of changes."""
from threading import Thread
import json
import logging
import time

from websocket import ABNF
from websocket import create_connection
from websocket import WebSocketException
from websocket import WebSocketConnectionClosedException
from websocket import WebSocketTimeoutException

from adhocracy_core.interfaces import IResource
from adhocracy_core.utils import exception_to_str
from adhocracy_core.utils import extract_events_from_changelog_metadata
from adhocracy_core.websockets.schemas import ServerNotification


logger = logging.getLogger(__name__)


class Client:
    """Websocket Client."""

    def __init__(self, ws_url):
        """Create instance with running thread that talks to the server.

        :param ws_url: the URL of the websocket server to connect to;
               if None, no connection will be set up (useful for testing)
        """
        self.changelog_metadata_messages_to_send = set()
        """Set with :class:`adhocracy_core.resources.subscriber.ChangelogMetadata`
        that will be send to the websocket server with
        :func:`Client.send_messages`."""
        self._ws_url = ws_url
        self._ws_connection = None
        self._is_running = False
        self._is_stopped = False
        if ws_url is not None:  # pragma: no cover
            self._init_listener_thread()

    def _init_listener_thread(self):  # pragma: no cover
        """Init thread that keeps the connection alive."""
        runner = Thread(target=self._run)
        runner.daemon = True
        runner.start()
        self._wait_a_bit_until_connected()

    def _run(self):  # pragma: no cover
        """Start and keep alive connection to the websocket server."""
        assert self._ws_url
        while not self._is_stopped:
            try:
                self._connect_and_receive_and_log_messages()
            except (WebSocketConnectionClosedException, ConnectionError,
                    OSError) as err:
                logger.info('Problem connecting to Websocket server: %s',
                            exception_to_str(err))
                self._is_running = False
                time.sleep(1)
            except WebSocketException as err:  # pragma: no cover
                logger.warning(
                    'Problem communicating with Websocket server: %s',
                    exception_to_str(err))
                time.sleep(1)

    def _wait_a_bit_until_connected(self):  # pragma: no cover
        """Wait until the connection has been set up, but at most 2.5 secs."""
        for i in range(25):  # pragma: no branch
            if self._is_running:
                break
            time.sleep(.1)

    def _connect_and_receive_and_log_messages(self):
        self._connect_to_server()
        frame = self._ws_connection.recv_frame()
        self._process_frame(frame)

    def _connect_to_server(self):  # pragma: no cover
        if not self._is_connected():
            logger.debug('Try connecting to the Websocket server at '
                         + self._ws_url)
            self._ws_connection = create_connection(self._ws_url)
            self._is_running = True
            logger.debug('Connected to the Websocket server')

    def _is_connected(self):
        return (self._ws_connection is not None and
                self._ws_connection.connected)

    def _process_frame(self, frame: ABNF):
        if not frame:
            logger.warning('Received invalid frame from Websocket server: %s',
                           frame)
        elif frame.opcode == ABNF.OPCODE_TEXT:
            logger.debug('Received text message from Websocket server: %s',
                         frame.data)
        elif frame.opcode == ABNF.OPCODE_CLOSE:
            self._close_connection(b'server triggered close')
            logger.error('Websocket server closed the connection!')
        elif frame.opcode == ABNF.OPCODE_PING:
            self._ws_connection.pong('Hi!')
        else:
            logger.warning('Received unexpected frame from Websocket server: '
                           'opcode=%s, data="%s"', frame.opcode, frame.data)

    def _close_connection(self, reason: bytes):
        self._ws_connection.send_close(reason=reason)
        self._ws_connection.close()
        self._is_running = False

    def send_messages(self, changelog_metadata=[]):
        """Send all changelog messages to the websocket server.

        :param changelog_metadata: list of :class:'ChangelogMetadata',
                                   metadata.resource == None is ignored.

        All websocket exceptions are catched, hoping the problems
        will be solved when you run this method again.
        """
        if not self._is_running:
            return
        try:
            self._send_messages(changelog_metadata)
        except WebSocketTimeoutException:  # pragma: no cover
            logger.warning('Could not send message, connection timeout,'
                           ' try again later')
        except OSError:  # pragma: no cover
            logger.warning('Could not send message, connection is broken,'
                           ' try again later')

    def _send_messages(self, changelog_metadata: list):
        self.changelog_metadata_messages_to_send.update(changelog_metadata)
        while self.changelog_metadata_messages_to_send:
            meta = self.changelog_metadata_messages_to_send.pop()
            events = extract_events_from_changelog_metadata(meta)
            for event in events:
                self._send_resource_event(meta.resource, event)

    def _send_resource_event(self, resource: IResource, event_type: str):
        schema = ServerNotification().bind(context=resource)
        message = schema.serialize({'event': event_type, 'resource': resource})
        message_text = json.dumps(message)
        logger.debug('Sending message to Websocket server: %s', message_text)
        self._ws_connection.send(message_text)

    def stop(self):  # pragma: no cover
        """Stop the client."""
        self._is_stopped = True
        try:
            if self._is_connected():
                self._close_connection(b'done')
                logger.debug('Websocket client closed')
        except WebSocketException as err:  # pragma: no cover
            logger.warning('Error closing connection to Websocket server: %s',
                           exception_to_str(err))


def get_ws_client(registry) -> Client:
    """Return websocket client object or None."""
    if registry is not None:
        return getattr(registry, 'ws_client', None)


def send_messages_after_commit_hook(success, registry):
    """Send transaction changelog messages to the websocket client."""
    ws_client = get_ws_client(registry)
    if success and ws_client is not None:
        changelog_metadata = registry.changelog.values()
        ws_client.send_messages(changelog_metadata)


def includeme(config):
    """Add websocket client (`ws_client`) to the registry.

    You need to set the ws server url in your settings to make this work::

        adhocracy.ws_url =  ws://localhost:6561

    """
    settings = config.registry['config']
    ws_url = settings.adhocracy.ws_url
    if ws_url:  # pragma: no cover
        ws_client = Client(ws_url=ws_url)
        config.registry.ws_client = ws_client
    else:
        logger.info('No websocket server setup, add config "adhocracy.ws_url"')
