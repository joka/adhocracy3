"""This is structurally equivalent to ../unit/test_jasmine.py.

The difference is that it runs igtest.html instead of test.html.
also, it is located next to acceptance tests, because it has to
be allowed to import components other than adhocracy, like
adhocracy_sample.
"""

from pytest import fixture
from pytest import mark

from adhocracy.testing import Browser
from adhocracy.testing import browser_test_helper
from adhocracy.frontend.tests.unit.console import Parser
from adhocracy.frontend.tests.unit.console import Formatter

pytestmark = mark.jasmine


@fixture
def browser_igtest(browser, server_sample) -> Browser:
    """Return test browser instance with url=igtest.html."""
    url = server_sample.application_url + 'frontend_static/igtest.html'
    return browser_test_helper(browser, url)


class TestJasmine:
    def test_all(self, browser_igtest):
        data = browser_igtest.evaluate_script('jsApiReporter.specs()')

        formatter = Formatter([])
        parser = Parser()
        results = parser.parse(data)
        formatter.results = results
        print(formatter.format())

        num_failures = len(list(results.failed()))
        assert num_failures == 0